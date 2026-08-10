/**
 * Segment Guards. "1 guard per 1,000 lines of code" applied honestly to
 * a real codebase: segments are built from whole files (never splitting
 * a file mid-function — a syntax check on a truncated file slice would
 * fail for reasons that have nothing to do with an actual bug), grouped
 * until each segment's cumulative line count approaches 1,000.
 *
 * What a guard actually checks: whether its files still pass `node
 * --check` (real syntax validity). This is a legitimate, narrow
 * self-healing signal — it catches corruption, a bad partial deploy, or
 * a manual edit that broke a file — but it is NOT a bug detector. It
 * cannot tell you a function has wrong logic, only that a file still
 * parses as valid JavaScript.
 */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const REPO_ROOT = process.env.GUROST_REPO_ROOT || path.resolve(__dirname);
const SEGMENT_TARGET_LINES = 1000;

function listJsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listJsFiles(full, files);
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function buildSegments() {
  const files = listJsFiles(REPO_ROOT);
  const segments = [];
  let current = { files: [], lineCount: 0 };

  for (const file of files) {
    const lines = fs.readFileSync(file, "utf-8").split("\n").length;
    if (current.lineCount > 0 && current.lineCount + lines > SEGMENT_TARGET_LINES) {
      segments.push(current);
      current = { files: [], lineCount: 0 };
    }
    current.files.push({ path: file, lines });
    current.lineCount += lines;
  }
  if (current.files.length) segments.push(current);

  return segments.map((s, i) => ({ id: `segment-${i + 1}`, ...s }));
}

async function checkFileSyntax(filePath) {
  try {
    await execFileAsync("node", ["--check", filePath]);
    return { path: filePath, ok: true };
  } catch (err) {
    return { path: filePath, ok: false, error: err.stderr || err.message };
  }
}

async function checkSegment(segment) {
  const results = await Promise.all(segment.files.map((f) => checkFileSyntax(f.path)));
  const failures = results.filter((r) => !r.ok);
  return {
    segmentId: segment.id,
    fileCount: segment.files.length,
    lineCount: segment.lineCount,
    healthy: failures.length === 0,
    failures
  };
}

async function checkAllSegments() {
  const segments = buildSegments();
  return Promise.all(segments.map(checkSegment));
}

module.exports = { buildSegments, checkSegment, checkAllSegments };
