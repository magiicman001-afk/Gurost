/**
 * What an App Builder project looks like while it builds, when it finishes and when it fails.
 * Kept out of server.js so it can be tested on its own.
 *
 *  - beginBuild:   IDLE -> PLANNING -> BUILDING (before this the state stayed IDLE forever)
 *  - recordStage:  keeps what each stage produced on the project as it lands (so it can be
 *                  saved after every stage, not only at the start)
 *  - finishBuild:  -> DONE, clears any earlier error
 *  - failBuild:    -> DONE with the reason in buildError. Whatever was built is kept: a failed
 *                  build is "finished, with an error", never stuck on "generating".
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

function failBuild(project, err, now = Date.now()) {
  settleToDone(project);
  const message = String((err && err.message) || err || "The build failed.").slice(0, 500);
  // Stored under "error" so every reply that carries the project passes through the
  // model-name filter (lib/brand.js).
  project.buildError = { error: message, at: now };
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

module.exports = { beginBuild, recordStage, finishBuild, failBuild, markInterrupted };
