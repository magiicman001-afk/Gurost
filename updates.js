/**
 * Updates — real feature announcements with per-workspace opt-in
 * tracking, not literal "push code to each client's own deployment."
 *
 * WHY THE SCOPE CHANGED FROM THE SPEC, stated plainly: Gurost runs as
 * one shared server (server.js) serving every customer — there's no
 * concept of "each client's own system" that could independently
 * accept or postpone a code update. A deploy updates the running
 * server for everyone at once; that's what "SaaS" means architecturally,
 * as distinct from on-prem/self-hosted software where each customer
 * runs their own instance. "Client can accept or postpone, and if
 * accepted it's applied to their system" describes THAT kind of
 * software, not this one.
 *
 * What's real and buildable instead, and what's built here: a FEATURE
 * FLAG per workspace. New capability ships to the server for everyone,
 * but stays behind a flag that's off by default; a workspace "accepts"
 * an update by flipping their own flag on, "postpones" by leaving it
 * off. The code for the feature is already live either way — what
 * changes is whether a given workspace's requests take that code path.
 * This is a real, common, correct pattern (this is what "feature flag"
 * means in every real engineering org) — genuinely different from what
 * was asked for, but it's the honest translation of the same underlying
 * goal (let customers control when they're exposed to a new feature)
 * onto the architecture that actually exists.
 *
 * SQL (run once):
 *   CREATE TABLE feature_updates (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name text NOT NULL,
 *     description text,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE workspace_feature_flags (
 *     workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 *     update_id uuid NOT NULL REFERENCES feature_updates(id) ON DELETE CASCADE,
 *     status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','postponed')),
 *     responded_at timestamptz,
 *     PRIMARY KEY (workspace_id, update_id)
 *   );
 */

const { supabase } = require("./lib/db");
const email = require("./email");

async function createUpdate(name, description) {
  const { data, error } = await supabase.from("feature_updates").insert({ name, description }).select("id").single();
  if (error) throw new Error(`Failed to create update: ${error.message}`);
  return { id: data.id, name, description };
}

async function listUpdates() {
  const { data, error } = await supabase.from("feature_updates").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

/**
 * "Deliver to all clients" — creates a pending flag row for every
 * workspace and emails each owner. This is a real, working notification
 * fan-out; it is NOT deploying any code (the feature's code is either
 * already live behind the flag, or this route was called before the
 * feature was actually shipped, which is a real operator mistake this
 * function can't detect or prevent).
 */
async function deliverUpdate(updateId) {
  const { data: update, error: updateError } = await supabase.from("feature_updates").select("*").eq("id", updateId).maybeSingle();
  if (updateError || !update) throw new Error("Update not found.");

  const { data: workspaces, error: wsError } = await supabase.from("workspaces").select("id, owner_id, name");
  if (wsError) throw new Error(`Failed to list workspaces: ${wsError.message}`);

  const flagRows = (workspaces || []).map((ws) => ({ workspace_id: ws.id, update_id: updateId, status: "pending" }));
  if (flagRows.length) {
    const { error: insertError } = await supabase.from("workspace_feature_flags").upsert(flagRows, { onConflict: "workspace_id,update_id" });
    if (insertError) throw new Error(`Failed to create flag rows: ${insertError.message}`);
  }

  // Real emails, one per workspace owner — best-effort, doesn't fail
  // the whole delivery if one address bounces.
  let emailsSent = 0;
  const emailErrors = [];
  for (const ws of workspaces || []) {
    try {
      const { data: owner } = await supabase.from("api_keys").select("email").eq("user_id", ws.owner_id).maybeSingle();
      if (!owner?.email) continue;
      await email.send({
        to: owner.email,
        subject: `New update available: ${update.name}`,
        htmlBody: `<p>A new feature is available for your Gurost account: <strong>${update.name}</strong></p><p>${update.description || ""}</p><p>Enable it from your dashboard whenever you're ready — you're not required to turn it on immediately.</p>`
      });
      emailsSent++;
    } catch (err) {
      emailErrors.push({ workspaceId: ws.id, error: err.message });
    }
  }

  return { updateId, workspacesFlagged: flagRows.length, emailsSent, emailErrors };
}

async function getUpdateStatus(updateId) {
  const { data, error } = await supabase.from("workspace_feature_flags").select("status").eq("update_id", updateId);
  if (error) return { pending: 0, accepted: 0, postponed: 0 };

  const counts = { pending: 0, accepted: 0, postponed: 0 };
  (data || []).forEach((row) => { counts[row.status] = (counts[row.status] || 0) + 1; });
  return counts;
}

/**
 * The actual "accept/postpone" action a customer takes — real, and
 * this is the function every other part of the product should call
 * (via isFeatureEnabled below) to decide whether to run the new code
 * path for a given workspace.
 */
async function respondToUpdate(workspaceId, updateId, decision) {
  if (!["accepted", "postponed"].includes(decision)) {
    throw new Error('decision must be "accepted" or "postponed".');
  }
  const { error } = await supabase
    .from("workspace_feature_flags")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("update_id", updateId);
  if (error) throw new Error(`Failed to record response: ${error.message}`);
  return { workspaceId, updateId, status: decision };
}

/**
 * What any route implementing an actual gated feature should call —
 * "pending" (never responded) and "postponed" both mean the old code
 * path runs; only "accepted" flips it.
 */
async function isFeatureEnabled(workspaceId, updateId) {
  const { data } = await supabase
    .from("workspace_feature_flags")
    .select("status")
    .eq("workspace_id", workspaceId)
    .eq("update_id", updateId)
    .maybeSingle();
  return data?.status === "accepted";
}

module.exports = { createUpdate, listUpdates, deliverUpdate, getUpdateStatus, respondToUpdate, isFeatureEnabled };
