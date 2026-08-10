/**
 * Team collaboration for the Ultimate tier — shared workspaces, invites,
 * and role-based access. Seat limit (20) enforced against the owner's
 * plan, checked via lib/billing.js's PLANS.teamSeats.
 *
 * Roles: owner (full control, billing), admin (manage members + all
 * projects), member (create/edit own projects, view team projects),
 * viewer (read-only on team projects). This module enforces role
 * checks; it does not decide what each role can do in every route —
 * that's wired per-route in server.js via requireRole().
 *
 * SQL (run once):
 *   create table workspaces (
 *     id uuid primary key default gen_random_uuid(),
 *     owner_id text not null,
 *     name text not null,
 *     created_at timestamptz default now()
 *   );
 *   create table workspace_members (
 *     workspace_id uuid not null references workspaces(id) on delete cascade,
 *     user_id text not null,
 *     role text not null check (role in ('owner','admin','member','viewer')),
 *     invited_email text,
 *     joined_at timestamptz default now(),
 *     primary key (workspace_id, user_id)
 *   );
 *   create table workspace_invites (
 *     id uuid primary key default gen_random_uuid(),
 *     workspace_id uuid not null references workspaces(id) on delete cascade,
 *     email text not null,
 *     role text not null check (role in ('admin','member','viewer')),
 *     token text not null unique,
 *     accepted boolean default false,
 *     created_at timestamptz default now()
 *   );
 *
 * Recommended Postgres row-level security (defense in depth beyond the
 * app-level checks below — enable RLS and add policies like):
 *   alter table workspaces enable row level security;
 *   alter table workspace_members enable row level security;
 *   create policy "members read their own workspaces"
 *     on workspace_members for select
 *     using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
 * (Adapt the claim path to how your JWTs actually carry the user id —
 * this is illustrative, not copy-paste-exact for every JWT shape.)
 */

const crypto = require("crypto");
const { supabase } = require("./lib/db");
const { PLANS } = require("./lib/billing");

async function createWorkspace(ownerId, name, ownerPlan) {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: ownerId, name })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create workspace: ${error.message}`);

  await supabase.from("workspace_members").insert({ workspace_id: data.id, user_id: ownerId, role: "owner" });
  return data.id;
}

/**
 * The workspace this user OWNS (pays for), not workspaces they're
 * merely a member of — a user can belong to several, but billing
 * attribution needs the one that's actually theirs. Added this round;
 * didn't exist before because nothing needed it until per-workspace
 * usage attribution did.
 */
async function getOwnedWorkspace(userId) {
  const { data, error } = await supabase.from("workspaces").select("id, name").eq("owner_id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

async function getSeatCount(workspaceId) {
  const { count, error } = await supabase
    .from("workspace_members")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (error) throw new Error(`Failed to count seats: ${error.message}`);
  return count;
}

async function inviteMember(workspaceId, inviterUserId, inviterPlan, email, role) {
  if (!["admin", "member", "viewer"].includes(role)) {
    throw new Error("role must be admin, member, or viewer (owner is assigned only at workspace creation).");
  }
  const seatLimit = PLANS[inviterPlan]?.teamSeats ?? 1;
  const currentSeats = await getSeatCount(workspaceId);
  if (currentSeats >= seatLimit) {
    throw new Error(`Seat limit reached (${seatLimit} for the ${inviterPlan} plan). Remove a member or upgrade to invite more.`);
  }

  const token = crypto.randomBytes(24).toString("hex");
  const { error } = await supabase.from("workspace_invites").insert({ workspace_id: workspaceId, email, role, token });
  if (error) throw new Error(`Failed to create invite: ${error.message}`);
  return token; // caller (server.js) is responsible for actually emailing this — no email sending is wired up here
}

async function acceptInvite(token, userId) {
  const { data: invite, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .eq("token", token)
    .eq("accepted", false)
    .maybeSingle();
  if (error) throw new Error(`Failed to load invite: ${error.message}`);
  if (!invite) throw new Error("Invalid or already-used invite token.");

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: invite.workspace_id, user_id: userId, role: invite.role, invited_email: invite.email });
  if (memberError) throw new Error(`Failed to add member: ${memberError.message}`);

  await supabase.from("workspace_invites").update({ accepted: true }).eq("id", invite.id);
  return { workspaceId: invite.workspace_id, role: invite.role };
}

async function getMemberRole(workspaceId, userId) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to check membership: ${error.message}`);
  return data?.role || null;
}

const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };

// Express middleware factory. Expects req.body.workspaceId or
// req.params.workspaceId. Requires auth.requireAuth to have run first.
function requireRole(minRole) {
  return async (req, res, next) => {
    const workspaceId = req.body.workspaceId || req.params.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: "Missing workspaceId." });
    try {
      const role = await getMemberRole(workspaceId, req.user.id);
      if (!role) return res.status(403).json({ error: "Not a member of this workspace." });
      if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
        return res.status(403).json({ error: `Requires ${minRole} role or higher — you have ${role}.` });
      }
      req.workspaceRole = role;
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

async function removeMember(workspaceId, userId) {
  const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
  if (error) throw new Error(`Failed to remove member: ${error.message}`);
}

module.exports = {
  createWorkspace,
  getOwnedWorkspace,
  inviteMember,
  acceptInvite,
  getMemberRole,
  getSeatCount,
  removeMember,
  requireRole
};
