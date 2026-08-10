/**
 * Pause gate for staged app generation. Real, in-process async
 * coordination — NOT a mid-completion interrupt (see app-bot.js's
 * header for why that's not something an LLM completion API supports).
 * This gates the moment BETWEEN two stages: after a stage finishes,
 * the orchestrator awaits this gate before starting the next one. If
 * paused, the await blocks until resume() is called; if not paused,
 * it resolves immediately.
 */

const gates = new Map(); // projectId -> { paused: boolean, releaseFns: Array<fn> }

function getOrCreateGate(projectId) {
  if (!gates.has(projectId)) gates.set(projectId, { paused: false, releaseFns: [] });
  return gates.get(projectId);
}

function pause(projectId) {
  getOrCreateGate(projectId).paused = true;
}

function resume(projectId) {
  const gate = getOrCreateGate(projectId);
  gate.paused = false;
  const toRelease = gate.releaseFns;
  gate.releaseFns = [];
  toRelease.forEach((fn) => fn());
}

function isPaused(projectId) {
  return getOrCreateGate(projectId).paused;
}

/**
 * Call this BETWEEN stages, not during one. Resolves immediately if
 * not paused; otherwise resolves the moment resume() is next called
 * for this project.
 */
function awaitGate(projectId) {
  const gate = getOrCreateGate(projectId);
  if (!gate.paused) return Promise.resolve();
  return new Promise((resolve) => { gate.releaseFns.push(resolve); });
}

function clearGate(projectId) {
  gates.delete(projectId);
}

module.exports = { pause, resume, isPaused, awaitGate, clearGate };
