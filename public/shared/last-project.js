/* Remembers which project this browser was working on, so a page refresh (or coming back later) reopens it
   instead of starting empty. Only the project id and a time are stored, never the project itself: the server
   holds the project (project_state table). Works with any storage object (localStorage in the page, a fake in tests). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LastProject = api;
})(typeof self !== "undefined" ? self : this, function () {
  var KEY = "gurost_last_project";
  var MAX_AGE_MS = 12 * 60 * 60 * 1000; // twelve hours: a day-old tab should not jump into an old project
  var ID = /^[A-Za-z0-9_-]{8,64}$/;

  function remember(storage, id, now) {
    try {
      if (!storage || !ID.test(String(id || ""))) return false;
      storage.setItem(KEY, JSON.stringify({ id: String(id), at: now == null ? Date.now() : now }));
      return true;
    } catch (e) {
      return false;
    }
  }
  /** The remembered project id, or null when none, too old, or the stored value is not ours. */
  function recall(storage, now) {
    try {
      var raw = storage && storage.getItem(KEY);
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || !ID.test(String(v.id || "")) || typeof v.at !== "number") return null;
      var t = now == null ? Date.now() : now;
      if (t - v.at > MAX_AGE_MS || v.at - t > 60 * 1000) return null;
      return v.id;
    } catch (e) {
      return null;
    }
  }
  function forget(storage) {
    try {
      if (storage) storage.removeItem(KEY);
    } catch (e) {}
  }
  return { KEY: KEY, MAX_AGE_MS: MAX_AGE_MS, remember: remember, recall: recall, forget: forget };
});
