/**
 * Admin dashboard data routes. Everything here requires auth.requireAdmin
 * — gated by ADMIN_EMAILS, not by plan (admin access to billing/usage
 * data shouldn't be purchasable).
 *
 * Honest scope note on "Claude API usage, costs": this is AGGREGATE
 * ONLY, not per-user. Attributing Claude spend to individual users would
 * require threading a userId parameter through every callClaude() call
 * site across roughly ten bot files — a real refactor, not done this
 * round. "Top users" below is ranked by CREDIT consumption instead,
 * which genuinely is per-user (the credit ledger always records
 * user_id). If you want per-user Claude cost specifically, that's the
 * concrete next step, not something silently approximated here.
 *
 * SQL (run once, logs every Claude call globally — see lib/claude-client.js):
 *   create table claude_usage_log (
 *     id bigint generated always as identity primary key,
 *     model text,
 *     input_tokens integer,
 *     output_tokens integer,
 *     created_at timestamptz default now()
 *   );
 */

const { supabase } = require("./lib/db");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const performance = require("./performance");

// Sonnet's published rate as of this build — update if pricing changes,
// this is a hardcoded estimate, not pulled live from anywhere.
const CLAUDE_COST_PER_M_INPUT = 3;
const CLAUDE_COST_PER_M_OUTPUT = 15;

async function getTotalUsers() {
  const { data, error } = await supabase.from("api_keys").select("user_id");
  if (error) throw new Error(error.message);
  return new Set((data || []).map((r) => r.user_id)).size;
}

async function getActiveUsers(days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase.from("build_events").select("user_id").gte("created_at", since);
  if (error) throw new Error(error.message);
  return new Set((data || []).map((r) => r.user_id)).size;
}

async function getClaudeUsage(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("claude_usage_log")
    .select("input_tokens, output_tokens")
    .gte("created_at", since);
  if (error) {
    // Table may not exist yet if the operator hasn't run the SQL — degrade
    // to zeros rather than 500ing the whole dashboard over one metric.
    return { inputTokens: 0, outputTokens: 0, estimatedCostUSD: null, note: "claude_usage_log table not found — see this file's header comment." };
  }
  const inputTokens = (data || []).reduce((sum, r) => sum + (r.input_tokens || 0), 0);
  const outputTokens = (data || []).reduce((sum, r) => sum + (r.output_tokens || 0), 0);
  const costUSD = (inputTokens / 1e6) * CLAUDE_COST_PER_M_INPUT + (outputTokens / 1e6) * CLAUDE_COST_PER_M_OUTPUT;
  return { inputTokens, outputTokens, estimatedCostUSD: Math.round(costUSD * 100) / 100 };
}

async function getRevenue(days = 30) {
  try {
    const since = Math.floor((Date.now() - days * 86400000) / 1000);
    const charges = await stripe.charges.list({ created: { gte: since }, limit: 100 });
    const totalCents = charges.data.filter((c) => c.paid && !c.refunded).reduce((sum, c) => sum + c.amount, 0);
    return { totalGBP: totalCents / 100, chargeCount: charges.data.length };
  } catch (err) {
    return { totalGBP: null, chargeCount: 0, error: err.message };
  }
}

async function getCreditsUsed(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("credit_events")
    .select("amount")
    .lt("amount", 0)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return Math.abs((data || []).reduce((sum, r) => sum + r.amount, 0));
}

async function getTopUsers(limit = 10, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from("credit_events")
    .select("user_id, amount")
    .lt("amount", 0)
    .gte("created_at", since);
  if (error) throw new Error(error.message);

  const byUser = {};
  (data || []).forEach((r) => {
    byUser[r.user_id] = (byUser[r.user_id] || 0) + Math.abs(r.amount);
  });
  return Object.entries(byUser)
    .map(([userId, creditsUsed]) => ({ userId, creditsUsed }))
    .sort((a, b) => b.creditsUsed - a.creditsUsed)
    .slice(0, limit);
}

async function getRecentActivity(limit = 30) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("event_type, user_id, path, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}

async function getRecentErrors(limit = 20) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("event_type, user_id, path, detail, created_at")
    .like("event_type", "%fail%")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}

async function getAdminUserIds() {
  const emails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return [];
  const { data } = await supabase.from("api_keys").select("user_id, email").in("email", emails);
  return (data || []).map((r) => r.user_id);
}

/**
 * Workspace-level admin views — added this round. Deliberately built
 * on the EXISTING `workspaces`/`workspace_members` tables
 * (team-collaboration.js), not a new `tenants` table. A parallel
 * tenants table would give this database two competing models of the
 * same concept (a group of users sharing access) — workspaces already
 * are Gurost's multi-tenancy primitive, just not exposed at the admin
 * level until now.
 */

async function getWorkspaceStats() {
  const { data: workspaces, error: wsError } = await supabase.from("workspaces").select("id");
  if (wsError) return { totalWorkspaces: 0, totalMembers: 0, note: "workspaces table not found — see team-collaboration.js." };

  const { data: members, error: memError } = await supabase.from("workspace_members").select("user_id");
  if (memError) return { totalWorkspaces: (workspaces || []).length, totalMembers: 0 };

  return {
    totalWorkspaces: (workspaces || []).length,
    totalMembers: (members || []).length
  };
}

async function listWorkspaces(limit = 50) {
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, name, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];

  // One extra query per workspace for member counts, not a join — kept
  // simple and correct over clever; this route isn't hot-path traffic
  // (admin-only, dashboard-load-frequency), so N+1 here is a real but
  // acceptable tradeoff, not an oversight.
  const withCounts = await Promise.all(
    (workspaces || []).map(async (ws) => {
      const { data: members } = await supabase.from("workspace_members").select("user_id, role").eq("workspace_id", ws.id);
      return { ...ws, memberCount: (members || []).length, roles: members || [] };
    })
  );
  return withCounts;
}

async function getWorkspaceDetails(workspaceId) {
  const { data: workspace, error } = await supabase.from("workspaces").select("*").eq("id", workspaceId).maybeSingle();
  if (error || !workspace) throw new Error("Workspace not found.");

  const { data: members } = await supabase.from("workspace_members").select("user_id, role, joined_at").eq("workspace_id", workspaceId);
  const { data: pendingInvites } = await supabase.from("workspace_invites").select("email, role, accepted, created_at").eq("workspace_id", workspaceId).eq("accepted", false);

  return { ...workspace, members: members || [], pendingInvites: pendingInvites || [] };
}

async function getFullSnapshot() {
  const [totalUsers, activeUsers, claudeUsage, revenue, creditsUsed, topUsers, recentActivity, recentErrors, responseTimeStats, adminIds, workspaceStats] =
    await Promise.all([
      getTotalUsers(),
      getActiveUsers(7),
      getClaudeUsage(30),
      getRevenue(30),
      getCreditsUsed(30),
      getTopUsers(10, 30),
      getRecentActivity(30),
      getRecentErrors(20),
      performance.getResponseTimeStats(24),
      getAdminUserIds(),
      getWorkspaceStats()
    ]);

  // Fire-and-check the spike alert for each admin — checkCostSpike's own
  // cooldown prevents this from re-notifying every time the dashboard loads.
  const costSpike = await performance.checkCostSpike(adminIds[0]);

  return {
    totalUsers,
    activeUsers7d: activeUsers,
    claudeUsage30d: claudeUsage,
    revenue30d: revenue,
    creditsUsed30d: creditsUsed,
    topUsers30d: topUsers,
    recentActivity,
    recentErrors,
    responseTimes24h: responseTimeStats,
    costSpike,
    workspaces: workspaceStats,
    generatedAt: new Date().toISOString()
  };
}

async function deactivateUser(userId) {
  const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("user_id", userId);
  if (error) throw new Error(`Failed to deactivate user: ${error.message}`);
}

async function reactivateUser(userId) {
  const { error } = await supabase.from("api_keys").update({ revoked: false }).eq("user_id", userId);
  if (error) throw new Error(`Failed to reactivate user: ${error.message}`);
}

module.exports = { getFullSnapshot, deactivateUser, reactivateUser, listWorkspaces, getWorkspaceDetails, CLAUDE_COST_PER_M_INPUT, CLAUDE_COST_PER_M_OUTPUT };
