/**
 * Per-bug credit system. This changes the fix flow from how the
 * Testing Pipeline (review-bot.js + fix-bot.js) originally worked —
 * previously all Critical/High issues got auto-fixed in one batch call.
 * This module instead surfaces each bug individually and only fixes one
 * when the user explicitly approves it, deducting 1 credit per approval.
 * The Testing Pipeline's automatic batch fix (used in /api/generate and
 * /api/deploy/one-click) is unchanged and still exists separately — this
 * is an alternative, interactive flow, not a replacement.
 *
 * SQL (run once):
 *   create table bug_sessions (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     project_id text not null,
 *     bugs jsonb not null,       -- [{id, file, severity, description, status}]
 *     created_at timestamptz default now()
 *   );
 */

const crypto = require("crypto");
const reviewBot = require("./review-bot");
const fixBot = require("./fix-bot");
const { deductCredits } = require("../lib/billing");
const { supabase } = require("../lib/db");

async function findBugs(userId, projectId, files) {
  const review = await reviewBot.reviewFiles(files);
  const bugs = review.allIssues.map((issue) => ({
    id: crypto.randomUUID(),
    file: issue.file,
    severity: issue.severity,
    description: issue.description,
    suggestion: issue.suggestion,
    status: "pending" // pending | approved_fixed | skipped
  }));

  const { data: session, error } = await supabase
    .from("bug_sessions")
    .insert({ user_id: userId, project_id: projectId, bugs })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to store bug session: ${error.message}`);

  return { sessionId: session.id, bugs, usage: review };
}

async function getSession(sessionId) {
  const { data, error } = await supabase.from("bug_sessions").select("*").eq("id", sessionId).single();
  if (error) throw new Error(`Bug session not found: ${error.message}`);
  return data;
}

async function updateBugStatus(sessionId, bugId, status) {
  const session = await getSession(sessionId);
  const bugs = session.bugs.map((b) => (b.id === bugId ? { ...b, status } : b));
  const { error } = await supabase.from("bug_sessions").update({ bugs }).eq("id", sessionId);
  if (error) throw new Error(`Failed to update bug session: ${error.message}`);
  return bugs;
}

/**
 * Approve one bug: deducts 1 credit, fixes just that bug's file with
 * just that bug's issue (not the whole file's Critical/High batch —
 * fix-bot.fixFile is called with a single-issue array so it only
 * addresses the approved bug).
 */
async function approveBug(userId, sessionId, bugId, files) {
  const session = await getSession(sessionId);
  if (session.user_id !== userId) throw new Error("This bug session doesn't belong to you.");

  const bug = session.bugs.find((b) => b.id === bugId);
  if (!bug) throw new Error("Bug not found in this session.");
  if (bug.status !== "pending") throw new Error(`Bug already ${bug.status}.`);

  const { newBalance, lowCredits } = await deductCredits(userId, 1, "bug_fix", { sessionId, bugId, file: bug.file });

  const file = files.find((f) => f.path === bug.file);
  if (!file) throw new Error(`File ${bug.file} not found in the provided file set.`);

  const result = await fixBot.fixSingleIssue(bug.file, file.content, {
    severity: bug.severity,
    description: bug.description,
    suggestion: bug.suggestion
  });

  await updateBugStatus(sessionId, bugId, "approved_fixed");

  return { fixedFile: { path: bug.file, content: result.fixedCode }, changes: result.changes, creditsRemaining: newBalance, lowCredits };
}

async function skipBug(userId, sessionId, bugId) {
  const session = await getSession(sessionId);
  if (session.user_id !== userId) throw new Error("This bug session doesn't belong to you.");
  await updateBugStatus(sessionId, bugId, "skipped");
}

function sessionSummary(session) {
  const fixed = session.bugs.filter((b) => b.status === "approved_fixed").length;
  const skipped = session.bugs.filter((b) => b.status === "skipped").length;
  const pending = session.bugs.filter((b) => b.status === "pending").length;
  return {
    summary: `${fixed} bug${fixed === 1 ? "" : "s"} fixed, ${fixed} credit${fixed === 1 ? "" : "s"} used${skipped ? `, ${skipped} skipped` : ""}${pending ? `, ${pending} pending` : ""}.`,
    fixed,
    skipped,
    pending,
    creditsUsed: fixed
  };
}

module.exports = { findBugs, getSession, approveBug, skipBug, sessionSummary };
