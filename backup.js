/**
 * Backup and recovery. This does NOT duplicate checkpoint.js/
 * agent-spawn.js (already built — GitHub-backed auto-save, version
 * history via listCheckpoints). It closes two real gaps those left:
 *
 * 1. shouldAutoCheckpoint() existed as a pure function but nothing
 *    called it — auto-save wasn't actually wired to fire. autoBackupIfDue()
 *    here is what a route handler calls after a build-mutating action.
 * 2. agent-spawn.js's resume created a NEW project rather than restoring
 *    into the existing one — genuinely useful for "start a fresh build
 *    from an old save point," but not what "one-click restore" usually
 *    means (undo back to a previous state of THIS project). restoreInPlace()
 *    here does the latter.
 */

const checkpoint = require("./bots/checkpoint");
const agentSpawn = require("./bots/agent-spawn");

async function autoBackupIfDue(project, userId, projectId) {
  if (!checkpoint.shouldAutoCheckpoint(project)) return null;

  const files =
    project.type === "app" && project.appFiles
      ? [...project.appFiles.backend, ...project.appFiles.frontend]
      : project.currentHtml
        ? [{ path: "index.html", content: project.currentHtml }]
        : null;

  if (!files) return null; // nothing to back up yet

  const buildMinutes = (Date.now() - project.buildStartedAt) / 60000;
  const result = await checkpoint.saveCheckpoint(userId, projectId, files, buildMinutes);
  project.lastCheckpointAt = Date.now();
  return result;
}

/**
 * Restores a checkpoint's files directly into the given project object
 * (mutates it in place), rather than creating a new project the way
 * agent-spawn.js's spawnFromCheckpoint does. Use this for "undo to a
 * previous save point of the project I'm already working on."
 */
async function restoreInPlace(project, checkpointId) {
  const spawned = await agentSpawn.spawnFromCheckpoint(checkpointId);

  const isHtmlOnly = spawned.files.length === 1 && spawned.files[0].path === "index.html";
  if (isHtmlOnly) {
    project.type = "website";
    project.currentHtml = spawned.files[0].content;
    project.appFiles = null;
  } else {
    project.type = "app";
    project.appFiles = { backend: spawned.files, frontend: [], database: project.appFiles?.database || null };
    project.currentHtml = null;
  }

  project.history.push({ type: "restore", summary: `Restored from checkpoint ${checkpointId}`, ts: Date.now() });
  return { restoredFrom: checkpointId, fileCount: spawned.files.length };
}

module.exports = { autoBackupIfDue, restoreInPlace };
