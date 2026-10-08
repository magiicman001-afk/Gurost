/**
 * What an App Builder project looks like while it builds, when it finishes and when it fails.
 * Kept out of server.js so it can be tested on its own.
 *
 *  - beginBuild:   IDLE -> PLANNING -> BUILDING (before this the state stayed IDLE forever)
 *  - recordStage:  keeps what each stage produced on the project as it lands (so it can be
 *                  saved after every stage, not only at the start)
 *  - finishBuild:  -> DONE, clears any earlier error
 *  - failBuild:    -> DONE with the reason in buildError. Whatever was built is kept: a failed
 *                  build is "finished, with an error", never stuck on "generating". The reason is
 *                  plain words (plainBuildError): no parser text, no model names.
 *  - resumeFor / restartBuild: Retry picks a failed build up at the stage that failed, reusing the
 *                  schema (and backend) already made, instead of starting from the schema again.
 */
const { canTransition, transition } = require("./state-machine");

function beginBuild(project) {
  if (project.state === "IDLE") { transition(project, "PLANNING"); transition(project, "BUILDING"); }
  project.buildError = null;
  return project;
}

const emptyApp = () => ({ frontend: [], backend: [], database: null });

// Returns true when something was kept, so the caller knows to save.
function recordStage(project, stage, status, data) {
  if (status !== "complete" || !data) return false;
  if (stage === "schema" && typeof data.schema === "string") {
    project.appFiles = project.appFiles || emptyApp();
    project.appFiles.database = { engine: data.engine, schema: data.schema };
    return true;
  }
  if (stage === "backend" && Array.isArray(data.files)) {
    project.appFiles = project.appFiles || emptyApp();
    project.appFiles.backend = data.files;
    return true;
  }
  if (stage === "frontend" && Array.isArray(data.files)) {
    project.appFiles = project.appFiles || emptyApp();
    project.appFiles.frontend = data.files;
    return true;
  }
  return false;
}

// Walks the allowed route to DONE (PAUSED -> BUILDING -> DONE and so on); sets it directly only
// if the machine has no route, so a failure can never leave the project half-way.
function settleToDone(project) {
  for (let i = 0; i < 4 && project.state !== "DONE"; i++) {
    if (canTransition(project.state, "DONE")) { transition(project, "DONE"); return; }
    const step = ["BUILDING", "RESUMING"].find((s) => canTransition(project.state, s));
    if (!step) break;
    transition(project, step);
  }
  if (project.state !== "DONE") project.state = "DONE";
}

function finishBuild(project) {
  settleToDone(project);
  project.buildError = null;
  return project;
}

// What the user reads when a build stops. The technical text (parser output, model names,
// status codes) stays in the server log; the person hears which step it was and what to do.
const STAGE_WORDS = { schema: "planning the database", backend: "writing the server code", frontend: "designing the screens" };
const TECHNICAL = /files in the reply|<<<|OpenRouter|finish_reason|Raw:|model "|Failed to parse|broken answer|Invalid state|Cannot read|undefined|\b[45]\d\d\b|timed out/i;

function plainBuildError(err) {
  const raw = String((err && err.message) || err || "The build failed.");
  const where = STAGE_WORDS[err && err.stage];
  if (/timed out/i.test(raw)) return `Gurost took too long${where ? ` while ${where}` : " on one step"}. Tap Retry to carry on from this step.`;
  if (TECHNICAL.test(raw)) return where ? `Gurost got stuck while ${where}. Tap Retry to carry on from this step.` : "Gurost got stuck on this build. Tap Retry to try again.";
  return raw.slice(0, 500); // already plain ("All models are busy. Please try again in 30 seconds.")
}

function failBuild(project, err, now = Date.now()) {
  settleToDone(project);
  // Stored under "error" so every reply that carries the project passes through the
  // model-name filter (lib/brand.js).
  project.buildError = { error: plainBuildError(err), at: now, stage: (err && err.stage) || null };
  return project;
}

// What a Retry can reuse from a failed build: the schema, and the backend when it was finished.
// null (-> a fresh build) unless this is the signed-in user's own app that really failed and still
// has its schema. Projects live in memory, so after a restart there is nothing to resume.
function resumeFor(project, userId) {
  if (!project || project.type !== "app" || project.state !== "DONE" || !project.buildError) return null;
  if (!userId || project.userId !== userId) return null;
  const db = project.appFiles && project.appFiles.database;
  if (!db || typeof db.schema !== "string" || !db.schema.trim()) return null;
  const backend = project.appFiles.backend;
  return { schema: { engine: db.engine, schema: db.schema }, backendFiles: Array.isArray(backend) && backend.length ? backend : null };
}

// DONE -> BUILDING is not a normal route (a finished project is not built again), but a failed
// build being retried is exactly that. Set directly, and recorded in the history.
function restartBuild(project) {
  project.state = "BUILDING";
  project.stateHistory = project.stateHistory || [];
  project.stateHistory.push({ state: "BUILDING", ts: Date.now() });
  project.buildError = null;
  return project;
}

// A project saved mid-build and loaded after a restart was cut off by the restart. Said
// plainly, and offered a retry, instead of sitting on "building" for ever.
function markInterrupted(project, now = Date.now()) {
  if (project.type === "app" && (project.state === "PLANNING" || project.state === "BUILDING")) {
    failBuild(project, new Error("This build was interrupted when Gurost updated. Press Retry to build it again."), now);
  }
  return project;
}

// The end-of-build numbers, from what the review really found. found/remaining are null when
// the checks could not run, so nothing is claimed about issues that were never counted.
function buildReport({ startedAt, now = Date.now(), found = null, remaining = null, verified = null }) {
  const seconds = Math.max(0, Math.round((now - (startedAt || now)) / 1000));
  const known = Number.isInteger(found) && Number.isInteger(remaining);
  return {
    seconds,
    found: known ? found : null,
    fixed: known ? Math.max(0, found - remaining) : null,
    remaining: known ? remaining : null,
    verified: typeof verified === "boolean" ? verified : null
  };
}

module.exports = { buildReport, beginBuild, recordStage, finishBuild, failBuild, markInterrupted, plainBuildError, resumeFor, restartBuild };
