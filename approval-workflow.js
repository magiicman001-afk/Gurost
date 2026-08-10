/**
 * Approval Workflow — the real safety mechanism Business Autopilot is
 * built on. Nothing marked as needing approval is ever executed by
 * this file except through requestApproval() -> a human calling
 * approveAction(). There is no override, no numeric threshold that
 * bypasses this, no path from "gated" to "executed" that skips a real
 * person's real decision.
 *
 * SQL (run once):
 *   CREATE TABLE autopilot_approvals (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id text NOT NULL,
 *     action_type text NOT NULL,
 *     description text NOT NULL,
 *     payload jsonb NOT NULL,
 *     status text NOT NULL DEFAULT 'pending',
 *     created_at timestamptz DEFAULT now(),
 *     decided_at timestamptz
 *   );
 *   CREATE TABLE autopilot_decisions (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id text NOT NULL,
 *     action_type text NOT NULL,
 *     approved boolean NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 */

const { supabase } = require("./lib/db");

// Real executors, registered by action type — the only way an
// approved action actually runs. business-autopilot.js registers
// these; this file never assumes what an action "does," it only
// gates whether it's allowed to happen yet.
const executors = new Map();
function registerExecutor(actionType, fn) {
  executors.set(actionType, fn);
}

async function requestApproval(userId, actionType, description, payload) {
  const { data, error } = await supabase
    .from("autopilot_approvals")
    .insert({ user_id: userId, action_type: actionType, description, payload, status: "pending" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to queue approval: ${error.message}`);
  return { id: data.id, status: "pending" };
}

async function listPendingApprovals(userId) {
  const { data, error } = await supabase
    .from("autopilot_approvals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load approvals: ${error.message}`);
  return data;
}

async function approveAction(approvalId, userId) {
  const { data: approval, error: fetchErr } = await supabase
    .from("autopilot_approvals")
    .select("*")
    .eq("id", approvalId)
    .single();
  if (fetchErr || !approval) throw new Error("Approval not found.");
  if (approval.user_id !== userId) throw new Error("This isn't your approval to give.");
  if (approval.status !== "pending") throw new Error(`This was already ${approval.status}.`);

  const executor = executors.get(approval.action_type);
  if (!executor) throw new Error(`No real executor registered for action type "${approval.action_type}" — refusing to guess what this should do.`);

  let result;
  try {
    result = await executor(approval.payload);
  } catch (err) {
    await supabase.from("autopilot_approvals").update({ status: "failed", decided_at: new Date().toISOString() }).eq("id", approvalId);
    throw new Error(`Approved, but execution failed: ${err.message}`);
  }

  await supabase.from("autopilot_approvals").update({ status: "executed", decided_at: new Date().toISOString() }).eq("id", approvalId);
  await recordDecision(userId, approval.action_type, true);
  return { executed: true, result };
}

async function rejectAction(approvalId, userId) {
  const { data: approval, error: fetchErr } = await supabase
    .from("autopilot_approvals")
    .select("user_id, action_type, status")
    .eq("id", approvalId)
    .single();
  if (fetchErr || !approval) throw new Error("Approval not found.");
  if (approval.user_id !== userId) throw new Error("This isn't your approval to give.");
  if (approval.status !== "pending") throw new Error(`This was already ${approval.status}.`);

  await supabase.from("autopilot_approvals").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", approvalId);
  await recordDecision(userId, approval.action_type, false);
  return { rejected: true };
}

/**
 * Real, minimal decision logging — "learns from every decision" means
 * this, honestly: a real record of what got approved vs. rejected per
 * action type, which is genuine, checkable signal about which kinds
 * of autopilot suggestions a user actually wants — not a claim that
 * the system's judgment itself improves on its own.
 */
async function recordDecision(userId, actionType, approved) {
  await supabase.from("autopilot_decisions").insert({ user_id: userId, action_type: actionType, approved });
}

async function getApprovalStats(userId) {
  const { data, error } = await supabase.from("autopilot_decisions").select("action_type, approved").eq("user_id", userId);
  if (error) return {};
  const stats = {};
  for (const row of data) {
    stats[row.action_type] = stats[row.action_type] || { approved: 0, rejected: 0 };
    stats[row.action_type][row.approved ? "approved" : "rejected"]++;
  }
  return stats;
}

module.exports = { registerExecutor, requestApproval, listPendingApprovals, approveAction, rejectAction, getApprovalStats };
