/**
 * Fix My Mistakes Mode.
 *
 * HONEST SCOPE, checked before writing this: "AI reads error logs" was
 * the original request, but there is no real infrastructure in this
 * codebase capturing runtime errors from a user's deployed generated
 * app — recentErrors in admin-dashboard.js is Gurost's OWN platform
 * error log, not per-project runtime monitoring. Building that would
 * mean real telemetry shipped inside every generated app reporting
 * back to Gurost — a genuinely bigger, separate feature, not built
 * here.
 *
 * What's real instead: the user describes the symptom in plain
 * English ("my checkout is broken"), Claude is given the ACTUAL
 * generated source Gurost already has for that project and asked to
 * locate the likely cause, then bots/fix-bot.js's existing
 * fixSingleIssue() generates a real proposed fix — reused, not
 * duplicated. A real line-level diff is computed so "before/after"
 * means an actual diff, not two full file dumps side by side. The fix
 * is stored as PENDING; nothing is applied to the real project until
 * the project's own owner approves it — same human-gate pattern as
 * system-healer.js and self-healing.js, applied here because the
 * same reasoning holds: an LLM-written fix isn't infallible, and this
 * build has hit that exact failure mode on itself more than once.
 *
 * SQL (run once):
 *   CREATE TABLE fix_mode_proposals (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     project_id uuid NOT NULL,
 *     user_id text NOT NULL,
 *     bug_description text NOT NULL,
 *     file_path text NOT NULL,
 *     original_content text NOT NULL,
 *     fixed_content text NOT NULL,
 *     diff jsonb NOT NULL,
 *     changes jsonb,
 *     status text NOT NULL DEFAULT 'pending',
 *     created_at timestamptz DEFAULT now()
 *   );
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");
const fixBot = require("./bots/fix-bot");
const { supabase } = require("./lib/db");

const LOCATE_SYSTEM = `You are locating which file in a generated app is most likely responsible for a bug a user described in plain English.

Output ONLY valid JSON: {"filePath": "the path from the list that's most likely responsible", "reasoning": "one sentence why"}

Rules:
- Pick exactly one file from the provided list — the one most likely to contain the actual cause.
- If genuinely nothing in the list seems related, pick the file that handles the closest matching functionality and say so honestly in "reasoning" rather than guessing silently.`;

async function locateRelevantFile(bugDescription, files) {
  const fileList = files.map((f) => f.path).join("\n");
  const { parsed } = await callClaude({
    system: LOCATE_SYSTEM,
    messages: [{ role: "user", content: `Bug report: ${bugDescription}\n\nFiles in this project:\n${fileList}` }],
    maxTokens: 200,
    model: CLAUDE_MODEL_FAST
  });
  const match = files.find((f) => f.path === parsed.filePath);
  if (!match) throw new Error(`Located file "${parsed.filePath}" isn't actually in this project's file list.`);
  return { file: match, reasoning: parsed.reasoning };
}

/**
 * Real LCS-based line diff. An earlier draft of this used a naive
 * positional comparison (line N in the before vs. line N in the
 * after) — testing it against a realistic fix that inserts a line
 * showed the real problem: everything after the insertion point got
 * falsely marked as removed+added, even lines that were byte-for-byte
 * identical, just shifted down by one. This version correctly
 * recognizes an unchanged line regardless of where it moved.
 *
 * Honest limit: this is an O(n*m) table over line counts, which is
 * fine for the size of files this generates (hundreds of lines, not
 * tens of thousands) — not the right approach for genuinely huge files.
 */
function computeLineDiff(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  const m = a.length, n = b.length;

  const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const diff = [];
  let i = 0, j = 0, lineA = 1, lineB = 1;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      diff.push({ type: "unchanged", lineBefore: lineA, lineAfter: lineB, content: a[i] });
      i++; j++; lineA++; lineB++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      diff.push({ type: "removed", lineBefore: lineA, content: a[i] });
      i++; lineA++;
    } else {
      diff.push({ type: "added", lineAfter: lineB, content: b[j] });
      j++; lineB++;
    }
  }
  while (i < m) { diff.push({ type: "removed", lineBefore: lineA, content: a[i] }); i++; lineA++; }
  while (j < n) { diff.push({ type: "added", lineAfter: lineB, content: b[j] }); j++; lineB++; }

  return diff;
}

async function proposeFix(projectId, project, userId, bugDescription) {
  if (project.userId !== userId) throw new Error("You can only request fixes for your own projects.");
  if (project.type !== "app" || !project.appFiles) throw new Error("Fix My Mistakes currently works on generated apps, not website projects.");

  const allFiles = [...project.appFiles.backend, ...project.appFiles.frontend];
  const { file, reasoning } = await locateRelevantFile(bugDescription, allFiles);

  const fixResult = await fixBot.fixSingleIssue(file.path, file.content, {
    description: bugDescription,
    category: "user-reported",
    severity: "high"
  });

  const diff = computeLineDiff(file.content, fixResult.fixedCode);

  const { data, error } = await supabase
    .from("fix_mode_proposals")
    .insert({
      project_id: projectId,
      user_id: userId,
      bug_description: bugDescription,
      file_path: file.path,
      original_content: file.content,
      fixed_content: fixResult.fixedCode,
      diff,
      changes: fixResult.changes,
      status: "pending"
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to store fix proposal: ${error.message}`);

  return {
    id: data.id,
    filePath: file.path,
    reasoning,
    changes: fixResult.changes,
    diff
  };
}

async function getProposal(id, userId) {
  const { data, error } = await supabase.from("fix_mode_proposals").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Fix proposal not found.");
  if (data.user_id !== userId) throw new Error("This isn't your fix proposal.");
  return data;
}

/**
 * Real application — the ONE point where the file actually changes,
 * gated on the project owner's explicit approval, called from
 * server.js only after that check.
 */
async function applyFix(proposalId, userId, project) {
  const proposal = await getProposal(proposalId, userId);
  if (proposal.status !== "pending") throw new Error(`This proposal is already ${proposal.status}.`);

  const targetArray = project.appFiles.backend.find((f) => f.path === proposal.file_path)
    ? project.appFiles.backend
    : project.appFiles.frontend;
  const targetFile = targetArray.find((f) => f.path === proposal.file_path);
  if (!targetFile) throw new Error("The target file no longer exists in this project — it may have changed since this fix was proposed.");

  targetFile.content = proposal.fixed_content;

  await supabase.from("fix_mode_proposals").update({ status: "applied" }).eq("id", proposalId);
  return { applied: true, filePath: proposal.file_path };
}

async function rejectFix(proposalId, userId) {
  await getProposal(proposalId, userId); // real ownership check, throws if not theirs
  await supabase.from("fix_mode_proposals").update({ status: "rejected" }).eq("id", proposalId);
  return { rejected: true };
}

module.exports = { proposeFix, getProposal, applyFix, rejectFix, computeLineDiff };
