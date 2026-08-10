/**
 * Gurost's internal coding assistant — the honest subset of "like
 * Cursor, but built by us."
 *
 * BUILT HERE, real: inline code suggestions (autocomplete-style
 * completions and fixes via Claude, given cursor context) and git
 * integration (reusing lib/github.js, already built for backend
 * deploys and checkpointing — not a new git implementation).
 *
 * NOT BUILT HERE, and why: real-time multi-user collaborative editing
 * — multiple people editing the same file simultaneously with live
 * cursor positions and conflict-free merging, which is what "real-time
 * collaboration" in a Cursor-like tool actually means — requires a
 * CRDT (conflict-free replicated data type) library. Yjs is the
 * standard choice for this in JavaScript; it needs its own sync server
 * (y-websocket or similar) and client-side editor bindings (e.g.
 * y-codemirror or y-monaco). That's a distinct subsystem with its own
 * real-time sync protocol, not something that fits alongside a
 * request/response Express API — faking it with a naive "last write
 * wins" broadcast would produce silent data loss the moment two people
 * typed in the same file at once, which is worse than not having the
 * feature. Not implemented here; if you want it, that's its own build
 * with Yjs as the starting point, not an extension of this file.
 *
 * "Self-learning engine" and "learns from every user interaction":
 * same honest framing used everywhere else in this codebase — every
 * accepted/rejected suggestion is stored and fed back into future
 * suggestion prompts as context (see lib/vector-memory.js, already
 * built, reused here). The model itself doesn't change.
 */

const { callClaude } = require("./lib/claude-client");
const vectorMemory = require("./lib/vector-memory");
const { pushGeneratedRepo, commitFiles } = require("./lib/github");

const SUGGEST_SYSTEM = `You are a coding assistant giving an inline suggestion at a specific cursor position.

Output ONLY valid JSON: {"suggestion": "the code to insert or the fix to apply", "explanation": "one sentence"}

Rules:
- Match the surrounding code's style exactly (indentation, quote style, naming conventions).
- Keep suggestions minimal and specific to the immediate context — this is an inline completion, not a rewrite.
- If nothing sensible completes the given context, return an empty string for "suggestion" rather than guessing.`;

async function suggest(userId, filePath, fileContent, cursorContext) {
  let pastPatterns = [];
  try {
    pastPatterns = await vectorMemory.searchMemory(userId, cursorContext, 3);
  } catch {
    // Semantic recall is an enhancement — proceed without it if
    // pgvector/embeddings aren't configured, same pattern as elsewhere.
  }

  const { parsed, usage } = await callClaude({
    system: SUGGEST_SYSTEM,
    messages: [{
      role: "user",
      content: JSON.stringify({
        filePath,
        cursorContext,
        fileExcerpt: fileContent.slice(0, 4000),
        pastAcceptedPatterns: pastPatterns.map((p) => p.content)
      })
    }],
    maxTokens: 500
  });

  return { ...parsed, usage };
}

async function recordFeedback(userId, filePath, suggestion, accepted) {
  try {
    await vectorMemory.storeMemory(userId, `Suggestion in ${filePath}: ${suggestion}`, { accepted });
  } catch (err) {
    console.warn("[coding-assistant] Feedback storage failed:", err.message);
  }
}

// Git integration — thin wrapper over the already-built lib/github.js,
// not a new git implementation.
async function commitToRepo(owner, repo, files) {
  return commitFiles(owner, repo, files);
}

async function createProjectRepo(files, projectId) {
  return pushGeneratedRepo(files, projectId);
}

module.exports = { suggest, recordFeedback, commitToRepo, createProjectRepo };
