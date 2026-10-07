/**
 * Save a project to its own PRIVATE GitHub repo, again and again.
 *
 *  - the first save creates one private repo for the project and remembers it
 *  - every later save is ONE commit holding all the files (pages, styles, script, images)
 *  - if nothing changed since the last save, no commit is made
 *  - the person's auto-save choice is kept with the project
 *
 * project.githubSave = { owner, repo, fingerprint, lastSavedAt, autoSave }
 *
 * A single server GITHUB_TOKEN is used, so every project lands in one GitHub account.
 * That is fine for testing; per-person GitHub login must replace it before launch.
 */

const crypto = require("crypto");
const github = require("./github");

const REPO_PREFIX = "gurost-site-";
const inFlight = new Map(); // projectId -> promise, so a button press and a timer never save twice at once

// One short code for "exactly these files": changes when any file's name or content changes.
function fingerprint(files) {
  const h = crypto.createHash("sha1");
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    h.update(String(f.path)).update("\0");
    h.update(Buffer.isBuffer(f.content) ? f.content : Buffer.from(String(f.content), "utf8")).update("\0");
  }
  return h.digest("hex");
}

// Whatever was saved with the project (or is damaged) is reduced to known, well-typed fields.
function cleanState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const text = (v, max) => (typeof v === "string" && v ? v.slice(0, max) : null);
  const at = Number(raw.lastSavedAt);
  return {
    owner: text(raw.owner, 100),
    repo: text(raw.repo, 100),
    fingerprint: text(raw.fingerprint, 64),
    lastSavedAt: Number.isFinite(at) && at > 0 ? at : null,
    autoSave: raw.autoSave === true
  };
}

function repoNameFor(projectId, wanted) {
  const custom = String(wanted || "").replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
  return custom || `${REPO_PREFIX}${String(projectId).slice(0, 8)}`;
}

const repoUrl = (s) => (s && s.owner && s.repo ? `https://github.com/${s.owner}/${s.repo}` : null);

/**
 * Where the project stands, for the Pulse widget. `files` (optional) lets it say whether anything
 * changed since the last save.
 */
function status(project, files, { connected = !!process.env.GITHUB_TOKEN } = {}) {
  const s = cleanState(project && project.githubSave) || { autoSave: false };
  return {
    connected: !!connected,
    autoSave: s.autoSave === true,
    repoUrl: repoUrl(s),
    lastSavedAt: s.lastSavedAt || null,
    changedSinceSave: files ? fingerprint(files) !== s.fingerprint : null
  };
}

function setAutoSave(project, on) {
  const s = cleanState(project.githubSave) || cleanState({});
  s.autoSave = on === true;
  project.githubSave = s;
  return s;
}

async function doSave(project, projectId, files, { now, repoName, message, api }) {
  const prev = cleanState(project.githubSave) || cleanState({});
  const fp = fingerprint(files);
  if (prev.repo && prev.fingerprint === fp) {
    return { saved: false, unchanged: true, repoUrl: repoUrl(prev), lastSavedAt: prev.lastSavedAt };
  }

  let { owner, repo } = prev;
  if (!repo) {
    owner = await api.getAuthenticatedUser();
    repo = repoNameFor(projectId, repoName);
    try {
      await api.createRepo(repo, { private: true });
    } catch (err) {
      // The repo is already there (an earlier save whose record was lost): keep using it.
      if (!/\(422\)/.test(err.message) || !/already exists/i.test(err.message)) throw err;
    }
  }

  const sha = await api.commitFiles(owner, repo, files, { message });
  // Only now is it a save: a failed commit leaves the old record alone, so the next try is not skipped as "unchanged".
  project.githubSave = { ...prev, owner, repo, fingerprint: fp, lastSavedAt: now };
  return { saved: true, unchanged: false, repoUrl: repoUrl(project.githubSave), lastSavedAt: now, sha };
}

/**
 * Saves `files` ([{ path, content }]) to the project's repo. Resolves
 * { saved, unchanged, repoUrl, lastSavedAt }; rejects with the GitHub error.
 * `api` is injectable for tests.
 */
function save(project, projectId, files, { now = Date.now(), repoName, message, api = github } = {}) {
  if (!Array.isArray(files) || !files.length) return Promise.reject(new Error("Nothing to save yet."));
  if (inFlight.has(projectId)) return inFlight.get(projectId);
  const msg = message || `Gurost save ${new Date(now).toISOString().slice(0, 16).replace("T", " ")} UTC`;
  const p = doSave(project, projectId, files, { now, repoName, message: msg, api }).finally(() => inFlight.delete(projectId));
  inFlight.set(projectId, p);
  return p;
}

module.exports = { save, status, setAutoSave, cleanState, fingerprint, repoNameFor, REPO_PREFIX };
