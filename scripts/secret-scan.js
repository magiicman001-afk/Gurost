#!/usr/bin/env node
"use strict";
/**
 * Secret scanner command (security spec 2.1).
 *   node scripts/secret-scan.js --staged     what is about to be committed (the pre-commit hook)
 *   node scripts/secret-scan.js --all        every tracked file (CI)
 *   node scripts/secret-scan.js --history    every line ever added in git history (one-off audit)
 * Add --json for machine output. Exit code 1 when anything is found. Secrets are never printed, only a masked preview.
 */
const { execFileSync } = require("child_process");
const { scanText, forbiddenFile, skipped } = require("../lib/secret-scan");

const git = (args, opts = {}) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, ...opts });
const mode = process.argv.includes("--staged") ? "staged" : process.argv.includes("--history") ? "history" : "all";
const json = process.argv.includes("--json");
const findings = [];

if (mode === "staged") {
  const names = git(["diff", "--cached", "--name-only", "--diff-filter=ACM"]).split("\n").filter(Boolean);
  for (const f of names) {
    const bad = forbiddenFile(f);
    if (bad) { findings.push({ file: f, line: 0, kind: bad, preview: "" }); continue; }
    if (skipped(f)) continue;
    let text = "";
    try { text = git(["show", `:${f}`]); } catch { continue; }
    findings.push(...scanText(text, f));
  }
} else if (mode === "all") {
  for (const f of git(["ls-files"]).split("\n").filter(Boolean)) {
    const bad = forbiddenFile(f);
    if (bad) { findings.push({ file: f, line: 0, kind: bad, preview: "" }); continue; }
    if (skipped(f)) continue;
    let text = "";
    try { text = git(["show", `HEAD:${f}`]); } catch { continue; }
    findings.push(...scanText(text, f));
  }
} else {
  // history: only the lines that were ADDED, with the commit that added them
  const log = git(["log", "--all", "-p", "--no-color", "--unified=0", "--format=@@COMMIT %h"]);
  let commit = "", file = "";
  const seen = new Set();
  for (const raw of log.split("\n")) {
    if (raw.startsWith("@@COMMIT ")) { commit = raw.slice(9); continue; }
    if (raw.startsWith("+++ b/")) { file = raw.slice(6); continue; }
    if (!raw.startsWith("+") || raw.startsWith("+++")) continue;
    if (skipped(file)) continue;
    for (const f of scanText(raw.slice(1), `${file}@${commit}`)) {
      const key = `${f.kind}|${f.preview}|${file}`;
      if (!seen.has(key)) { seen.add(key); findings.push({ ...f, line: 0 }); }
    }
  }
}

if (json) console.log(JSON.stringify({ mode, count: findings.length, findings }, null, 2));
else {
  for (const f of findings) console.log(`${f.file}${f.line ? ":" + f.line : ""}  ${f.kind}${f.preview ? "  (" + f.preview + ")" : ""}`);
  console.log(findings.length ? `\n${findings.length} possible secret(s) found (${mode}). Nothing was printed in full.` : `No secrets found (${mode}).`);
  if (findings.length && mode === "staged") console.log("Commit blocked. Remove the secret (use an environment variable), or add 'secret-scan-ok: <why>' on a line that is a fake test value.");
}
process.exit(findings.length ? 1 : 0);
