/**
 * Unified third-party integrations for Gurost.
 *
 * Of the 9 tools requested, 2 are real backend integrations wired in
 * here. The other 7 are addressed explicitly below rather than silently
 * dropped — each has a real project behind the name, but none of them
 * fit "import into an Express server" the way this was framed. Details:
 *
 * NOT wired in, and why — Claude Code dev-tooling (6):
 *   Graphify, Ruflo, Token Reducer, github-slim, gstack, ClaudeSlim.
 *   All six live in a developer's local ~/.claude/ config (skills,
 *   plugins, or MCP servers) and make YOUR Claude Code coding sessions
 *   cheaper or more structured. None expose a Node.js runtime API —
 *   there's nothing to require() or call from server.js. Install these
 *   in your own development environment if you want them; they don't
 *   belong in this deployed backend's dependency tree, same reasoning
 *   already applied to Ruflo/Graphify earlier in this build.
 *
 * NOT wired in, and why — frontend tool (1):
 *   OpenPencil. A real, standalone AI design application with its own
 *   npm Web SDK (@zseven-w/op-web-sdk) — that SDK belongs in whatever
 *   frontend you build for Gurost, not in this Express backend.
 *
 * NOT wired in as requested, real substitute built instead (1):
 *   Zvec. Real, but it's a Python package (`import zvec`) — no Node.js
 *   binding exists. Rather than shell out to Python for every memory
 *   operation, lib/vector-memory.js uses pgvector on the Postgres
 *   instance already configured for schema deployment — same
 *   capability (semantic vector search for self-learning features),
 *   built on infrastructure already in this stack.
 *
 * WIRED IN, corrected from the request (1):
 *   Ntfy — real, but it's push notifications, not SMS (its own docs
 *   say so explicitly). lib/notify.js.
 */

const notify = require("./lib/notify");
const vectorMemory = require("./lib/vector-memory");

module.exports = { notify, vectorMemory };
