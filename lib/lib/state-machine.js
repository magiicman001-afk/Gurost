/**
 * Gurost project state machine.
 * IDLE -> PLANNING -> BUILDING -> PAUSED -> CORRECTING -> RESUMING -> BUILDING
 *                          |-> DEPLOYING -> DONE -> CORRECTING (post-deploy edits)
 */

const TRANSITIONS = {
  IDLE: ["PLANNING"],
  PLANNING: ["BUILDING"],
  BUILDING: ["PAUSED", "DEPLOYING", "DONE"],
  PAUSED: ["CORRECTING", "BUILDING"],
  CORRECTING: ["RESUMING"],
  RESUMING: ["BUILDING", "DONE"],
  DEPLOYING: ["DONE"],
  DONE: ["CORRECTING", "DEPLOYING"]
};

function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

function transition(project, to) {
  if (!canTransition(project.state, to)) {
    throw new Error(`Invalid state transition: ${project.state} -> ${to}`);
  }
  project.state = to;
  project.stateHistory = project.stateHistory || [];
  project.stateHistory.push({ state: to, ts: Date.now() });
  return project;
}

module.exports = { transition, canTransition, TRANSITIONS };
