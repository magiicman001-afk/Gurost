/**
 * Version History panel — real UI for the checkpoint/restore system
 * that already existed on the backend (bots/checkpoint.js, backup.js)
 * before this file was written. This closes the one real gap that
 * system had: nothing showed it to the user, and there was no button
 * to press. Shared between builder.html and app-builder.html since
 * both track a `projectId` variable the same way.
 *
 * Real API shapes this was built against (checked directly in
 * server.js / checkpoint.js / backup.js before writing this, not
 * assumed):
 *   GET  /api/checkpoint/list/:projectId
 *        -> { checkpoints: [{ id, commit_sha, build_minutes, created_at }] }
 *   POST /api/checkpoint/restore-in-place  body: { projectId, checkpointId }
 *        -> { projectId, restoredFrom, fileCount }
 *
 * Usage: include this script, then call
 *   GurostCheckpoints.init({ getProjectId: () => projectId, onRestore: fn })
 * `onRestore` is called after a successful restore so the calling page
 * can refresh its own preview — this file doesn't know how a specific
 * page renders its preview, so it doesn't try to.
 */

const GurostCheckpoints = (function () {
  let getProjectId = () => null;
  let onRestore = () => {};
  let panelEl = null;

  function timeAgo(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  async function loadCheckpoints() {
    const projectId = getProjectId();
    const listEl = panelEl.querySelector("[data-checkpoint-list]");
    if (!projectId) {
      listEl.innerHTML = '<p class="text-sm text-on-surface-variant p-4">No project yet — generate something first, then version history will show up here.</p>';
      return;
    }
    listEl.innerHTML = '<p class="text-sm text-on-surface-variant p-4">Loading real version history...</p>';
    try {
      const result = await GurostAPI.call(`/api/checkpoint/list/${projectId}`);
      const checkpoints = result.checkpoints || [];
      if (checkpoints.length === 0) {
        listEl.innerHTML = '<p class="text-sm text-on-surface-variant p-4">No checkpoints saved yet — one gets created automatically as you build.</p>';
        return;
      }
      listEl.innerHTML = checkpoints
        .map(
          (cp, i) => `
        <div class="flex items-center justify-between p-3 border-b border-outline-variant/30">
          <div>
            <p class="text-sm font-medium text-on-surface">${i === 0 ? "Most recent" : timeAgo(cp.created_at)}</p>
            <p class="text-xs text-on-surface-variant">${new Date(cp.created_at).toLocaleString()}${cp.build_minutes ? ` &middot; ${Math.round(cp.build_minutes)} min into build` : ""}</p>
          </div>
          <button class="px-4 py-2 text-sm rounded-full border border-outline-variant/50 hover:bg-surface-container-low transition-colors" data-restore-id="${cp.id}">
            Restore this version
          </button>
        </div>`
        )
        .join("");

      listEl.querySelectorAll("[data-restore-id]").forEach((btn) => {
        btn.addEventListener("click", () => restoreCheckpoint(btn.getAttribute("data-restore-id"), btn));
      });
    } catch (err) {
      listEl.innerHTML = `<p class="text-sm text-red-600 p-4">Couldn't load version history: ${err.message}</p>`;
    }
  }

  async function restoreCheckpoint(checkpointId, btnEl) {
    const projectId = getProjectId();
    if (!confirm("This replaces your current build with this earlier version. Your current version isn't lost — it's still a real checkpoint you can come back to. Continue?")) return;
    const originalText = btnEl.textContent;
    btnEl.textContent = "Restoring...";
    btnEl.disabled = true;
    try {
      const result = await GurostAPI.call("/api/checkpoint/restore-in-place", {
        method: "POST",
        body: { projectId, checkpointId },
      });
      onRestore(result);
      closePanel();
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
      btnEl.textContent = originalText;
      btnEl.disabled = false;
    }
  }

  function openPanel() {
    panelEl.classList.remove("hidden");
    loadCheckpoints();
  }

  function closePanel() {
    panelEl.classList.add("hidden");
  }

  function buildPanel() {
    const el = document.createElement("div");
    el.id = "gurostCheckpointPanel";
    el.className = "hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40";
    el.innerHTML = `
      <div class="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b border-outline-variant/30">
          <h3 class="font-headline-md text-headline-md text-lg">Version History</h3>
          <button data-close-checkpoints class="text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="overflow-y-auto flex-1" data-checkpoint-list></div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector("[data-close-checkpoints]").addEventListener("click", closePanel);
    el.addEventListener("click", (e) => {
      if (e.target === el) closePanel(); // click outside the card closes it
    });
    return el;
  }

  function init(opts) {
    getProjectId = opts.getProjectId || getProjectId;
    onRestore = opts.onRestore || onRestore;
    panelEl = buildPanel();
  }

  return { init, open: () => openPanel() };
})();
