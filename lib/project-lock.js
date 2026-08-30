/**
 * Per-project mutex. Real bug this fixes, not a new-feature nicety:
 * both /api/pulse (REST) and guide/websocket-server.js's correction
 * handler read project.currentHtml, call Claude, then write the result
 * back — with an `await` in between. If two requests for the SAME
 * project land close together (exactly what "multiple users building
 * the same project" means), both can read the same starting HTML,
 * both call Claude, and whichever write lands second silently
 * overwrites the first — the first user's change is lost with no
 * error, nothing telling anyone it happened. This existed before any
 * collaboration feature was requested; multiple users hitting the same
 * project was already possible, just quietly broken.
 *
 * withProjectLock(projectId, fn) serializes everything for a given
 * project — two different projects still run fully concurrently, only
 * operations on the SAME project queue up. Implemented as a promise
 * chain, not a real distributed lock — correct for a single Node
 * process (which is what this codebase runs as; PROJECTS itself is
 * already an in-memory Map with the same single-process assumption,
 * documented as a limitation elsewhere in this README). If Gurost ever
 * runs multiple server instances behind a load balancer, this stops
 * being sufficient and needs a real distributed lock (Redis, etc.) —
 * flagged here rather than silently outgrown later.
 */

const chains = new Map(); // projectId -> Promise (tail of the queue)

async function withProjectLock(projectId, fn) {
  const previous = chains.get(projectId) || Promise.resolve();

  let release;
  const current = new Promise((resolve) => { release = resolve; });
  const chained = previous.then(() => current);
  chains.set(projectId, chained);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    // Only delete if nothing has queued behind us since — comparing
    // against the SAME promise object we stored, not a freshly-created
    // one (a second .then() call here would never === the first).
    if (chains.get(projectId) === chained) {
      chains.delete(projectId);
    }
  }
}

module.exports = { withProjectLock };
