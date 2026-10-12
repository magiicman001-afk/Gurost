// Run: node --test test/aislop-check.test.js
// aislop 0.18 writes its findings to `diagnostics` (filePath, rule, severity
// "error" | "warning"). Until 2026-10-12 the wrapper read `findings` / `file`
// and an upper-case "ERROR", so every scan reported no issues.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { parseAislopFindings, runAislopCheck } = require("../aislop-check");

// Trimmed from real `aislop scan --json` output (0.18.1).
const REAL = JSON.stringify({
  schemaVersion: "1", cliVersion: "0.18.1", score: 63,
  diagnostics: [
    { filePath: "a.js", engine: "lint", rule: "eslint/no-unused-vars", severity: "warning", message: "Identifier 'fs' is imported but never used.", fixable: false },
    { filePath: "a.js", engine: "lint", rule: "eslint/no-empty", severity: "warning", message: "Unexpected empty block statements", fixable: false },
    { filePath: "src/b.js", engine: "ai-slop", rule: "ai-slop/narrative-comment", severity: "error", message: "Narrative comment", fixable: true }
  ]
});

test("reads aislop 0.18's diagnostics, grouped by file", () => {
  const byFile = parseAislopFindings(REAL);
  assert.deepEqual(Object.keys(byFile).sort(), ["a.js", "src/b.js"]);
  assert.equal(byFile["a.js"].length, 2);
  assert.equal(byFile["a.js"][0].description, "Identifier 'fs' is imported but never used.");
});

test("severity: 'error' (any case) is High, everything else Medium", () => {
  const byFile = parseAislopFindings(REAL);
  assert.equal(byFile["src/b.js"][0].severity, "High");
  assert.equal(byFile["a.js"][0].severity, "Medium");
  assert.equal(parseAislopFindings(JSON.stringify({ diagnostics: [{ filePath: "x.js", severity: "ERROR", message: "m" }] }))["x.js"][0].severity, "High");
});

test("older field names still read; unreadable output gives no findings, not a crash", () => {
  assert.equal(parseAislopFindings(JSON.stringify({ findings: [{ file: "c.js", level: "warning", message: "m" }] }))["c.js"].length, 1);
  assert.deepEqual(parseAislopFindings("not json"), {});
});

// The real CLI, end to end (the CLAUDE.md check): it must run and find something.
const installed = fs.existsSync(path.join(__dirname, "..", "node_modules", "aislop", "package.json"));
test("runs the real aislop and finds an issue in obviously sloppy code", { skip: !installed && "aislop not installed here", timeout: 120000 }, async () => {
  const r = await runAislopCheck([{ path: "a.js", content: 'import fs from "fs";\n// This function adds two numbers\nfunction add(a,b){try{return a+b}catch(e){}}\nexport default add;\n' }]);
  assert.equal(r.skipped, false, r.reason);
  assert.ok(r.results[0].issues.length >= 1, "at least one issue after aislop's own auto-fix");
});
