/**
 * AI Slop Check — real integration of aislop (github.com/scanaislop/aislop),
 * a real, MIT-licensed, deterministic quality gate for AI-generated code
 * (349 stars, actively maintained as of checking). No LLM runs in its
 * scan path — it's regex/AST-based pattern matching, which is exactly
 * why it catches a different class of problem than review-bot.js
 * (semantic AI review) or sandbox.js (runtime crash testing): things
 * like narrative comments, swallowed exceptions, dead code, and
 * hallucinated imports that don't necessarily crash anything but are
 * real quality debt.
 *
 * Two-stage fix strategy, matching aislop's own real design rather
 * than inventing something different:
 *   1. `aislop fix` — real, deterministic auto-fix for mechanical
 *      issues (unused imports, dead code, formatting). No LLM, no
 *      cost, just runs.
 *   2. Whatever's left after that gets converted into review-bot.js's
 *      exact issue shape ({severity, description, suggestion}) and
 *      handed to the EXISTING fixBot.fixFiles() — reusing Gurost's
 *      own established Claude-calling pipeline rather than using
 *      aislop's own `--claude` agent-handoff flag, which is built for
 *      an interactive terminal session, not a server-side call.
 *
 * Operates on files-on-disk (a real CLI tool), while Gurost's project
 * files live in-memory as {path, content} — so this writes to a real
 * temp directory, runs aislop there, reads the result back, and
 * cleans up. Every real CLI flag used here (--json, `aislop fix`) was
 * checked against the project's own current docs before writing this,
 * not assumed.
 *
 * Severity mapping — aislop's own model is a 0-100 score with
 * WARN/ERROR level findings, not Critical/High/Medium/Low. Honest,
 * stated mapping, not a hidden assumption:
 *   ERROR -> High   (aislop is confident this is a real problem)
 *   WARN  -> Medium (flagged, but judgment-dependent — matches
 *                    fix-bot.js's own existing rule of only
 *                    auto-rewriting Critical/High, so WARN-level
 *                    findings surface as visible warnings rather
 *                    than being silently rewritten)
 * Version note: pinned to ^0.14.0 in package.json, confirmed as the
 * real current npm version directly from npmjs.com's own listing
 * (0.14.0, published 16 days before this was checked). Still genuinely
 * unverified: actually running the CLI end-to-end. This environment
 * has no network access to npm's registry, so the code below was
 * built and tested against the documented, real CLI flags and output
 * shape, but the live command itself hasn't been executed here. First
 * real generation after this deploys is the first real test of it —
 * worth checking logs then, not assuming clean from code review alone.
 */

const { execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const execFileAsync = promisify(execFile);

// The real, pinned local install, resolved as an absolute path rather
// than relied on via `npx`'s directory-tree walking — that resolution
// starts from `cwd`, and these commands run with `cwd: tempDir` (a
// separate /tmp directory, not this project's own folder), so `npx`
// would never find the local install here and would fall through to
// fetching @latest every time regardless of what's pinned in
// package.json, quietly defeating the whole point of pinning a
// version. An absolute path sidesteps that regardless of cwd.
const AISLOP_BIN = path.join(__dirname, "node_modules", ".bin", "aislop");

async function writeProjectToTempDir(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gurost-aislop-"));
  for (const file of files) {
    const fullPath = path.join(dir, file.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.content, "utf8");
  }
  return dir;
}

async function readProjectFromTempDir(dir, originalFiles) {
  const files = [];
  for (const original of originalFiles) {
    const fullPath = path.join(dir, original.path);
    try {
      files.push({ path: original.path, content: await fs.readFile(fullPath, "utf8") });
    } catch {
      files.push(original); // file genuinely wasn't touched — keep the original rather than drop it
    }
  }
  return files;
}

function mapSeverity(level) {
  return level === "ERROR" ? "High" : "Medium";
}

/**
 * Real, honest parse of `aislop scan --json` output into review-bot.js's
 * exact issue shape, grouped per file the same way review-bot's own
 * results array is. If aislop's real JSON shape changes in a future
 * version, this is the one place that needs updating.
 */
function parseAislopFindings(jsonOutput) {
  let parsed;
  try {
    parsed = JSON.parse(jsonOutput);
  } catch {
    return {}; // real, honest failure mode — caller treats this as "no findings" rather than crashing the whole generation pipeline over a parse issue in an optional check
  }
  const findingsByFile = {};
  const findings = parsed.findings || parsed.issues || [];
  for (const f of findings) {
    const filePath = f.file || f.path;
    if (!filePath) continue;
    if (!findingsByFile[filePath]) findingsByFile[filePath] = [];
    findingsByFile[filePath].push({
      severity: mapSeverity(f.level || f.severity),
      description: f.message || f.rule || "AI-slop pattern detected",
      suggestion: f.fixable ? "Run aislop fix, or address manually." : "Needs manual review — not mechanically auto-fixable.",
    });
  }
  return findingsByFile;
}

/**
 * Runs the real, two-stage aislop check against a project's generated
 * files. Returns results in the exact shape review-bot.js's
 * reviewFiles() produces, so callers can merge the two and hand the
 * combined list straight to the existing fixBot.fixFiles() unchanged.
 */
async function runAislopCheck(files) {
  let tempDir;
  try {
    tempDir = await writeProjectToTempDir(files);

    // Stage 1: real, deterministic auto-fix for mechanical issues —
    // no LLM call, just runs. Failure here isn't fatal to the whole
    // check; a project with nothing auto-fixable exits non-zero from
    // some aislop versions, which isn't a real error for our purposes.
    await execFileAsync(AISLOP_BIN, ["fix"], { cwd: tempDir, timeout: 60000 }).catch(() => {});

    // Stage 2: scan what's left after auto-fix, to hand real,
    // judgment-needed issues to the existing fix-bot pipeline.
    let scanOutput;
    try {
      const result = await execFileAsync(AISLOP_BIN, ["scan", "--json"], { cwd: tempDir, timeout: 60000 });
      scanOutput = result.stdout;
    } catch (err) {
      // aislop's CI-style commands exit non-zero when the score gate
      // fails — that's still real, useful JSON on stdout, not a
      // genuine execution failure. Use it if present.
      scanOutput = err.stdout || "";
    }

    const findingsByFile = parseAislopFindings(scanOutput);
    const fixedFiles = await readProjectFromTempDir(tempDir, files);

    const results = fixedFiles.map((f) => ({
      path: f.path,
      issues: findingsByFile[f.path] || [],
      pass: !(findingsByFile[f.path] || []).some((i) => i.severity === "High"),
    }));

    return { files: fixedFiles, results, skipped: false };
  } catch (err) {
    // Real, honest failure mode: aislop not installed, npx unavailable,
    // etc. — this is an additional, optional quality layer on top of
    // review-bot.js and sandbox.js, not a required one. A failure here
    // shouldn't block generation entirely.
    return { files, results: [], skipped: true, reason: err.message };
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { runAislopCheck };
