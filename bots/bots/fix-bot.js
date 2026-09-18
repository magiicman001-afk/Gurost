/**
 * Fixes Critical and High severity issues flagged by review-bot.js.
 * Does not touch Medium/Low issues — those surface to the user as
 * warnings instead of being silently auto-rewritten, since "fix
 * everything automatically" on stylistic/performance nits risks
 * changing working code for no real benefit.
 */

const { callClaude } = require("../lib/claude-client");

const FIX_SYSTEM = `You are a code fixer. Given code and a review report, fix all Critical and High issues.

Return the fixed code and a summary of changes made.
Output ONLY valid JSON, no preamble, no markdown fences:
{"fixed_code": "...", "changes": ["one line per change made"]}

Rules:
- Fix only the listed Critical/High issues. Don't refactor unrelated code.
- Return the complete file, not a fragment.
- If an issue can't be fixed without more context than you have (e.g. "add authentication" with no auth system specified), make the safest minimal fix possible and say so in "changes" rather than inventing an unverified auth scheme.`;

async function fixFile(path, content, issues) {
  const blockingIssues = issues.filter((i) => i.severity === "Critical" || i.severity === "High");
  if (blockingIssues.length === 0) {
    return { path, fixedCode: content, changes: [], wasFixed: false };
  }

  const { parsed, usage } = await callClaude({
    system: FIX_SYSTEM,
    messages: [{
      role: "user",
      content: `File: ${path}\n\nCode:\n${content}\n\nIssues to fix:\n${JSON.stringify(blockingIssues, null, 2)}`
    }],
    maxTokens: 8000
  });

  return { path, fixedCode: parsed.fixed_code, changes: parsed.changes || [], wasFixed: true, usage };
}

// Takes the original files array and the review-bot's per-file results,
// returns updated files plus a flat fix log. Files with no Critical/High
// issues pass through untouched (and uncharged — no API call made for them).
async function fixFiles(files, reviewResults) {
  const byPath = new Map(reviewResults.map((r) => [r.path, r.issues]));

  const settled = await Promise.allSettled(
    files.map((f) => fixFile(f.path, f.content, byPath.get(f.path) || []))
  );

  const fixedFiles = [];
  const fixLog = [];
  const failures = [];

  settled.forEach((r, i) => {
    if (r.status === "fulfilled") {
      const { path, fixedCode, changes, wasFixed } = r.value;
      fixedFiles.push({ path, content: fixedCode });
      if (wasFixed) fixLog.push({ path, changes, ts: Date.now() });
    } else {
      console.error(`[fix-bot] Failed to fix "${files[i].path}":`, r.reason.message);
      failures.push({ path: files[i].path, error: r.reason.message });
      fixedFiles.push(files[i]); // keep original on fix failure rather than dropping the file
    }
  });

  return { fixedFiles, fixLog, failures };
}

// For the per-bug credit flow (bug-tracker.js): fixes exactly one
// explicitly-approved issue regardless of severity — unlike fixFile
// above, this doesn't filter to Critical/High only. The user already
// saw the severity and chose to spend a credit on it; a Low-severity
// issue they approved should actually get fixed, not silently dropped
// by a filter meant for the automatic batch pipeline.
async function fixSingleIssue(path, content, issue) {
  const { parsed } = await callClaude({
    system: FIX_SYSTEM,
    messages: [{
      role: "user",
      content: `File: ${path}\n\nCode:\n${content}\n\nIssue to fix:\n${JSON.stringify(issue, null, 2)}`
    }],
    maxTokens: 8000
  });
  return { path, fixedCode: parsed.fixed_code, changes: parsed.changes || [] };
}

module.exports = { fixFile, fixFiles, fixSingleIssue };
