/**
 * Usage & invoicing — real per-workspace cost calculation, built on
 * the workspace attribution added this round to lib/claude-client.js.
 *
 * Named usage-billing.js, not billing.js, on purpose: lib/billing.js
 * already exists and handles Stripe checkout/subscriptions. Having two
 * files both called "billing" — one for payment processing, one for
 * cost/invoice math — is exactly the kind of naming collision that
 * causes a future engineer to edit the wrong one. This file handles a
 * genuinely different concern (what did this workspace cost us, what
 * do we show them) and imports lib/billing.js for the one thing it
 * actually needs from it (the bot-seat pricing constants).
 *
 * HONEST LIMITS, not glossed over:
 *  - Claude cost is only as complete as claude-client.js's workspace
 *    attribution, which is only wired at the call sites updated this
 *    round (assistant-bot.js's handleTask — see server.js's comments).
 *    Other bot files still log unattributed; their cost isn't
 *    reflected here yet. This is a real gap, not a rounding error —
 *    say so to anyone reading an invoice from this, don't imply full
 *    coverage exists.
 *  - Nylas cost is an ESTIMATE based on bot count as a stand-in for
 *    connected-account count (using Nylas's real, current pricing:
 *    $15/month includes 5 connected accounts, then $2/account beyond
 *    that — verified against current Nylas pricing before writing
 *    this, not assumed from memory). It is not pulled from a real
 *    Nylas billing API, because the actual Gmail/Outlook/Zoom
 *    connections this assumes don't exist in this codebase yet (see
 *    prior rounds — that requires real OAuth app verification,
 *    external to any code here). Once real Nylas connections exist,
 *    replace estimateNylasCost() with a real call to Nylas's own
 *    usage/billing endpoint instead of this proxy.
 *
 * SQL (run once) — represents provisioned bot SEATS per workspace
 * (what the workspace admin has activated and is being billed for),
 * not literal running autonomous processes — consistent with the
 * scope already established in prior rounds: Gurost's real bots are
 * task-specific and stateless, not persistent 24/7 agents:
 *   CREATE TABLE workspace_bots (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 *     bot_type text NOT NULL,
 *     active boolean NOT NULL DEFAULT true,
 *     created_at timestamptz DEFAULT now()
 *   );
 */

const { supabase } = require("./db");
const { CLAUDE_COST_PER_M_INPUT, CLAUDE_COST_PER_M_OUTPUT } = require("../admin-dashboard");
const { BUSINESS_ASSISTANT } = require("./billing");

function monthRange(monthString) {
  // monthString: "YYYY-MM". Defaults to the current month if omitted.
  const [year, month] = (monthString || new Date().toISOString().slice(0, 7)).split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), end: end.toISOString(), label: `${year}-${String(month).padStart(2, "0")}` };
}

function estimateNylasCost(botCount) {
  const extra = Math.max(0, botCount - 5);
  return 15 + extra * 2; // USD — see file header for why this is an estimate, not a metered pull
}

async function getWorkspaceClaudeCost(workspaceId, monthString) {
  const { start, end } = monthRange(monthString);
  const { data, error } = await supabase
    .from("claude_usage_log")
    .select("input_tokens, output_tokens")
    .eq("workspace_id", workspaceId)
    .gte("created_at", start)
    .lt("created_at", end);

  if (error) return { inputTokens: 0, outputTokens: 0, costUSD: 0, note: "claude_usage_log query failed — see error." };

  const inputTokens = (data || []).reduce((sum, r) => sum + (r.input_tokens || 0), 0);
  const outputTokens = (data || []).reduce((sum, r) => sum + (r.output_tokens || 0), 0);
  const costUSD = (inputTokens / 1e6) * CLAUDE_COST_PER_M_INPUT + (outputTokens / 1e6) * CLAUDE_COST_PER_M_OUTPUT;

  return { inputTokens, outputTokens, costUSD: Math.round(costUSD * 100) / 100 };
}

async function getWorkspaceBotCount(workspaceId) {
  const { count, error } = await supabase.from("workspace_bots").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("active", true);
  if (error) return BUSINESS_ASSISTANT.includedBots; // degrade to the included baseline rather than throw
  return count || 0;
}

/**
 * Real revenue for this workspace's Business Assistant subscription
 * this month: the flat base plus £4 × bots beyond the included 5,
 * mirroring exactly what lib/billing.js actually charges via Stripe.
 */
function calculateRevenueGBP(botCount) {
  const extraBots = Math.max(0, Math.min(botCount, BUSINESS_ASSISTANT.maxBots) - BUSINESS_ASSISTANT.includedBots);
  return 99 + extraBots * BUSINESS_ASSISTANT.extraBotPriceGBP;
}

async function getWorkspaceUsage(workspaceId, monthString) {
  const { label } = monthRange(monthString);
  const [claudeCost, botCount] = await Promise.all([
    getWorkspaceClaudeCost(workspaceId, monthString),
    getWorkspaceBotCount(workspaceId)
  ]);

  const nylasCostUSD = estimateNylasCost(botCount);
  const revenueGBP = calculateRevenueGBP(botCount);

  // Rough USD->GBP for combining the two currencies into one profit
  // figure — genuinely approximate, not a live FX rate. Swap in a real
  // FX API call if this needs to be exact rather than directionally
  // useful.
  const APPROX_USD_TO_GBP = 0.79;
  const totalCostGBP = Math.round((claudeCost.costUSD + nylasCostUSD) * APPROX_USD_TO_GBP * 100) / 100;
  const profitGBP = Math.round((revenueGBP - totalCostGBP) * 100) / 100;

  return {
    month: label,
    botCount,
    claude: claudeCost,
    nylasCostUSD,
    revenueGBP,
    totalCostGBP,
    profitGBP,
    profitMarginPercent: revenueGBP > 0 ? Math.round((profitGBP / revenueGBP) * 1000) / 10 : null
  };
}

async function generateInvoice(workspaceId, monthString) {
  const usage = await getWorkspaceUsage(workspaceId, monthString);
  const { data: workspace } = await supabase.from("workspaces").select("name, owner_id").eq("id", workspaceId).maybeSingle();

  return {
    workspaceId,
    workspaceName: workspace?.name || "Unknown workspace",
    month: usage.month,
    lineItems: [
      { description: "Business Assistant — base plan (5 bots included)", amountGBP: 99 },
      ...(usage.botCount > 5
        ? [{ description: `Extra bots (${usage.botCount - 5} × £${BUSINESS_ASSISTANT.extraBotPriceGBP})`, amountGBP: (usage.botCount - 5) * BUSINESS_ASSISTANT.extraBotPriceGBP }]
        : [])
    ],
    totalGBP: usage.revenueGBP,
    generatedAt: new Date().toISOString()
  };
}

async function getWorkspaceBillingHistory(workspaceId, monthsBack = 6) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return Promise.all(months.map((m) => getWorkspaceUsage(workspaceId, m)));
}

module.exports = { getWorkspaceUsage, generateInvoice, getWorkspaceBillingHistory, getWorkspaceBotCount, calculateRevenueGBP };
