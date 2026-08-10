/**
 * Reviews generated code files. Runs after app-bot.js produces backend/
 * frontend files, before anything gets treated as deployable.
 *
 * Reviews per-file, not as one combined blob — a single call reviewing
 * five concatenated files tends to skim; separate calls per file keep
 * the model's attention on one thing at a time, at the cost of more
 * API calls. For a typical prototype app-bot output (handful of files)
 * that tradeoff is worth it.
 */

const { callClaude } = require("../lib/claude-client");

const REVIEW_SYSTEM = `You are a security and code quality reviewer. Review the provided code.

Flag issues by severity: Critical, High, Medium, Low.
Check for: security vulnerabilities (injection, auth bypass, secrets in code, unsafe deserialization, etc.), code quality, performance issues, best practices.

Output ONLY valid JSON, no preamble, no markdown fences:
{"issues": [{"severity": "Critical"|"High"|"Medium"|"Low", "description": "...", "suggestion": "..."}], "pass": true|false}

Rules:
- "pass" is true only if there are no Critical or High issues.
- Be specific — reference the actual construct in the code, not generic advice.
- Don't invent issues to pad the list. An empty issues array with pass:true is a valid, good outcome.`;

async function reviewFile(path, content) {
  const { parsed, usage } = await callClaude({
    system: REVIEW_SYSTEM,
    messages: [{ role: "user", content: `File: ${path}\n\n${content}` }],
    maxTokens: 2000
  });
  return { path, issues: parsed.issues || [], pass: parsed.pass, usage };
}

async function reviewFiles(files) {
  const settled = await Promise.allSettled(files.map((f) => reviewFile(f.path, f.content)));

  const results = [];
  const failures = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") results.push(r.value);
    else failures.push({ path: files[i].path, error: r.reason.message });
  });

  const allIssues = results.flatMap((r) => r.issues.map((issue) => ({ ...issue, file: r.path })));
  const hasCritical = allIssues.some((i) => i.severity === "Critical");
  const hasHigh = allIssues.some((i) => i.severity === "High");

  return {
    results,
    failures,
    allIssues,
    hasCritical,
    hasHigh,
    overallPass: !hasCritical && !hasHigh
  };
}

module.exports = { reviewFile, reviewFiles };
