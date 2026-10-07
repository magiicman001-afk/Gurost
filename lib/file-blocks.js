/**
 * Multi-file model output as plain text blocks instead of JSON.
 *
 * App Builder used to ask for {"files": [{"path", "content"}]} - whole
 * source files inside JSON strings. One unescaped quote in one file and
 * the entire reply is lost (seen live on the Free plan: glm-5.2, backend
 * stage, every attempt). File blocks need no escaping at all; only a
 * small metadata header (summary, image requests) stays JSON.
 */

// The META line is described in words, not shown as literal JSON: models
// copy a literal example verbatim, and security.detectPromptLeak rejects
// any reply repeating 50+ characters of the system prompt (seen live:
// the old imageRequests example came back word for word).
const FILE_BLOCKS_FORMAT = `OUTPUT FORMAT - plain text, NOT JSON (source code must never be put inside JSON strings):
<<<META>>>
one JSON object with the key summary (your one-sentence summary)__EXTRA__
<<<END META>>>
<<<FILE path/to/first-file.ext>>>
the complete file content, exactly as it should be saved - no escaping, no markdown fences
<<<END FILE>>>
<<<FILE path/to/second-file.ext>>>
...
<<<END FILE>>>
Repeat the FILE block for every file. Nothing outside the blocks.`;

// extraMetaKeys: words describing more META keys, e.g. "imageRequests (...)".
function fileBlocksFormat(extraMetaKeys = "") {
  return FILE_BLOCKS_FORMAT.replace("__EXTRA__", extraMetaKeys ? ` and the key ${extraMetaKeys}` : "");
}

// A file with nothing in it, or only "line 0 / line 1 / ..." filler or a bare "...", is not a
// file: a model that loses its place can write one (seen as a blank screen listing "line 0" to
// "line 37"). Such files are dropped, never shown or saved.
function isPlaceholderContent(content) {
  const lines = String(content == null ? "" : content).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return true;
  return lines.every((l) => /^(line\s*\d+\s*:?|\.{3}|…)$/i.test(l));
}

// The same rule for files that already exist as objects ({ path, content }): fixer output, saved
// projects, history restores. Anything that is not a file with text content (a bare path string, say)
// passes through untouched. Each drop is logged with where it happened, so a live occurrence can be traced.
function dropPlaceholderFiles(files, { where = "", projectId = "" } = {}) {
  if (!Array.isArray(files)) return files;
  return files.filter((f) => {
    if (!f || typeof f !== "object" || typeof f.content !== "string") return true;
    if (!isPlaceholderContent(f.content)) return true;
    console.warn(`[file-blocks] Dropped "${f.path}"${where ? ` at ${where}` : ""}${projectId ? ` (project ${projectId})` : ""}: empty or placeholder content.`);
    return false;
  });
}

// An app's { frontend, backend, database } with the filler files removed from both lists. A new object:
// the input (which may sit in an undo snapshot) is never changed.
function cleanAppFiles(appFiles, opts) {
  if (!appFiles || typeof appFiles !== "object" || Array.isArray(appFiles)) return appFiles;
  return {
    ...appFiles,
    frontend: dropPlaceholderFiles(appFiles.frontend, opts),
    backend: dropPlaceholderFiles(appFiles.backend, opts)
  };
}

function parseFileBlocks(rawText) {
  const text = String(rawText || "");
  const files = [];
  let dropped = 0;
  // ">>" or ">>>": nemotron closes its blocks with "<<<END FILE>>" (seen live).
  // Also "<<<FILE: path>>>" and "<<<END_FILE>>>" - variants models write.
  const re = /<<<\s*FILE[:\s]\s*([^\n>]+?)\s*>{2,3}\r?\n([\s\S]*?)\r?\n?<<<\s*END[ _]FILE\s*>{2,3}/g;
  let m;
  while ((m = re.exec(text))) {
    let content = m[2];
    // A model sometimes fences the content anyway - strip one outer fence.
    const fenced = /^```[\w-]*\r?\n([\s\S]*?)\r?\n```\s*$/.exec(content);
    if (fenced) content = fenced[1];
    const path = m[1].trim();
    if (files.some((f) => f.path === path)) continue; // a repeat (see createRepeatDetector) - the first copy wins
    if (isPlaceholderContent(content)) { console.warn(`[file-blocks] Dropped "${path}": empty or placeholder content.`); dropped++; continue; }
    files.push({ path, content });
  }

  let meta = {};
  const metaMatch = /<<<META>>>\s*([\s\S]*?)\s*<<<END META>>>/.exec(text);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1].replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      meta = {}; // metadata is optional - the files are what matter
    }
  }

  if (!files.length) {
    throw new Error(`No ${dropped ? "usable " : ""}files in the reply (expected <<<FILE path>>> ... <<<END FILE>>> blocks${dropped ? " with real content" : ""}). Start: ${text.slice(0, 160)}`);
  }
  return {
    files,
    summary: typeof meta.summary === "string" ? meta.summary : "",
    imageRequests: Array.isArray(meta.imageRequests) ? meta.imageRequests.filter((r) => r && typeof r.placeholder === "string") : []
  };
}

/**
 * For a streamed reply: true once the model starts a file it already
 * wrote. Measured live (nemotron-3-super:free, reasoning off): after the
 * 15 frontend files it began again at package.json and repeated them
 * until max_tokens - 114s and a "cut off" failure. Everything before the
 * repeat is the complete answer, so the stream is ended there.
 * Stateful: each call only scans what's new since the last one.
 */
function createRepeatDetector() {
  // (also ends on a run of "<<<<<<<" markers - see below)
  const seen = new Set();
  let scanned = 0;
  return (content) => {
    const re = /<<<\s*FILE[:\s]\s*([^\n>]+?)\s*>{2,3}/g;
    re.lastIndex = Math.max(0, scanned - 300); // headers can straddle chunks
    let m;
    let repeated = false;
    while ((m = re.exec(content))) {
      const key = `${m.index}:${m[1]}`;
      if (seen.has(key)) continue; // already counted in an earlier overlapping scan
      seen.add(key);
      const path = m[1].trim();
      if (seen.has(`path:${path}`)) repeated = true;
      seen.add(`path:${path}`);
    }
    scanned = content.length;
    // The other loop seen live (qwen3-coder): after a full set of files,
    // "<<<<<<< HEAD" over and over until max_tokens.
    if (/\n<{7,}/.test(content.slice(Math.max(0, scanned - 400)))) repeated = true;
    return repeated;
  };
}

// Paths of the files completed so far in a streamed reply (for progress).
function completedFilePaths(content) {
  return [...String(content).matchAll(/<<<\s*FILE[:\s]\s*([^\n>]+?)\s*>{2,3}\r?\n([\s\S]*?)<<<\s*END[ _]FILE\s*>{2,3}/g)].filter((m) => !isPlaceholderContent(m[2])).map((m) => m[1].trim());
}

module.exports = { isPlaceholderContent, dropPlaceholderFiles, cleanAppFiles, parseFileBlocks, fileBlocksFormat, createRepeatDetector, completedFilePaths };
