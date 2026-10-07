// Run: node --test test/github-save.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

process.env.GITHUB_TOKEN = "test-token";
const G = require("../lib/github-save");
const github = require("../lib/github");
const projectState = require("../project-state");

const T0 = Date.parse("2026-10-07T12:00:00Z");
const FILES = [
  { path: "index.html", content: "<h1>Crumb</h1>" },
  { path: "styles.css", content: "body{margin:0}" },
  { path: "images/image-1.png", content: Buffer.from([1, 2, 3, 4]) }
];

// A GitHub stand-in that records what it was asked to do.
function fakeApi({ createFails = null, commitFails = null } = {}) {
  const log = { created: [], commits: [] };
  return {
    log,
    getAuthenticatedUser: async () => "owner1",
    createRepo: async (name, opts) => { log.created.push({ name, opts }); if (createFails) throw new Error(createFails); return {}; },
    commitFiles: async (owner, repo, files, opts) => { if (commitFails) throw new Error(commitFails); log.commits.push({ owner, repo, files, opts }); return `sha${log.commits.length}`; }
  };
}

test("the first save makes ONE private repo, remembers it, and commits every file once", async () => {
  const api = fakeApi();
  const project = { type: "website" };
  const r = await G.save(project, "12345678-abcd", FILES, { now: T0, api });
  assert.equal(r.saved, true);
  assert.equal(r.repoUrl, "https://github.com/owner1/gurost-site-12345678");
  assert.deepEqual(api.log.created, [{ name: "gurost-site-12345678", opts: { private: true } }]);
  assert.equal(api.log.commits.length, 1);
  assert.equal(api.log.commits[0].files.length, 3);
  assert.equal(project.githubSave.repo, "gurost-site-12345678");
  assert.equal(project.githubSave.lastSavedAt, T0);
});

test("the second save reuses the repo (the old button failed here) and commits again", async () => {
  const api = fakeApi();
  const project = { type: "website" };
  await G.save(project, "12345678-abcd", FILES, { now: T0, api });
  const changed = [{ path: "index.html", content: "<h1>Crumb &amp; Co</h1>" }, ...FILES.slice(1)];
  const r = await G.save(project, "12345678-abcd", changed, { now: T0 + 1800000, api });
  assert.equal(r.saved, true);
  assert.equal(api.log.created.length, 1, "no second repo");
  assert.equal(api.log.commits.length, 2);
  assert.equal(api.log.commits[1].repo, "gurost-site-12345678");
});

test("nothing changed: no commit, and it says so", async () => {
  const api = fakeApi();
  const project = { type: "website" };
  await G.save(project, "p1", FILES, { now: T0, api });
  const r = await G.save(project, "p1", FILES.map((f) => ({ ...f })), { now: T0 + 1000, api });
  assert.equal(r.saved, false);
  assert.equal(r.unchanged, true);
  assert.equal(api.log.commits.length, 1);
  assert.equal(project.githubSave.lastSavedAt, T0, "an unchanged check is not a save");
});

test("a change in an image alone counts as a change", () => {
  const a = G.fingerprint(FILES);
  const b = G.fingerprint([FILES[0], FILES[1], { path: "images/image-1.png", content: Buffer.from([1, 2, 3, 5]) }]);
  assert.notEqual(a, b);
  assert.equal(G.fingerprint([...FILES].reverse()), a, "file order does not matter");
});

test("a failed commit is not recorded as a save, so the next try is not skipped", async () => {
  const project = { type: "website" };
  await assert.rejects(G.save(project, "p2", FILES, { now: T0, api: fakeApi({ commitFails: "GitHub API error (500)" }) }), /500/);
  assert.equal(project.githubSave, undefined);
  const api = fakeApi();
  const r = await G.save(project, "p2", FILES, { now: T0 + 1, api });
  assert.equal(r.saved, true);
});

test("a repo that already exists is reused instead of failing", async () => {
  const api = fakeApi({ createFails: "GitHub API error (422) on /user/repos: name already exists on this account" });
  const r = await G.save({ type: "website" }, "abcdef12-0", FILES, { now: T0, api });
  assert.equal(r.saved, true);
  assert.equal(api.log.commits.length, 1);
});

test("other repo-creation errors still fail, and nothing is committed", async () => {
  const api = fakeApi({ createFails: "GitHub API error (401) on /user/repos: Bad credentials" });
  await assert.rejects(G.save({ type: "website" }, "p3", FILES, { now: T0, api }), /401/);
  assert.equal(api.log.commits.length, 0);
});

test("two saves at once make one repo and one commit", async () => {
  const api = fakeApi();
  const project = { type: "website" };
  const [a, b] = await Promise.all([G.save(project, "p4", FILES, { now: T0, api }), G.save(project, "p4", FILES, { now: T0, api })]);
  assert.equal(api.log.created.length, 1);
  assert.equal(api.log.commits.length, 1);
  assert.equal(a, b);
});

test("nothing to save is a plain error", async () => {
  await assert.rejects(G.save({}, "p5", [], { api: fakeApi() }), /Nothing to save yet/);
  await assert.rejects(G.save({}, "p5", null, { api: fakeApi() }), /Nothing to save yet/);
});

test("a custom repo name is cleaned and used only when the repo is first made", async () => {
  const api = fakeApi();
  const project = { type: "website" };
  await G.save(project, "p6", FILES, { now: T0, api, repoName: "my bakery/site!" });
  assert.equal(api.log.created[0].name, "my-bakery-site-");
  await G.save(project, "p6", [{ path: "a.html", content: "x" }], { now: T0 + 1, api, repoName: "other" });
  assert.equal(api.log.created.length, 1);
});

test("status: connected, auto-save, repo, last save, and whether anything changed", async () => {
  const project = { type: "website" };
  assert.deepEqual(G.status(project, FILES, { connected: true }), { connected: true, autoSave: false, repoUrl: null, lastSavedAt: null, changedSinceSave: true });
  await G.save(project, "12345678", FILES, { now: T0, api: fakeApi() });
  let st = G.status(project, FILES, { connected: true });
  assert.equal(st.changedSinceSave, false);
  assert.equal(st.lastSavedAt, T0);
  assert.equal(st.repoUrl, "https://github.com/owner1/gurost-site-12345678");
  st = G.status(project, [...FILES, { path: "about.html", content: "x" }], { connected: true });
  assert.equal(st.changedSinceSave, true);
  assert.equal(G.status(project, null, { connected: false }).connected, false);
  assert.equal(G.status(project, null).changedSinceSave, null);
});

test("auto-save choice is kept, switches off again, and survives a save", async () => {
  const project = { type: "website" };
  G.setAutoSave(project, true);
  assert.equal(G.status(project).autoSave, true);
  await G.save(project, "p7", FILES, { now: T0, api: fakeApi() });
  assert.equal(G.status(project).autoSave, true, "saving does not reset the choice");
  G.setAutoSave(project, false);
  assert.equal(G.status(project).autoSave, false);
  G.setAutoSave(project, "yes");
  assert.equal(G.status(project).autoSave, false, "only a real true turns it on");
});

test("a damaged saved record is reduced to safe fields", () => {
  assert.equal(G.cleanState(null), null);
  assert.equal(G.cleanState([]), null);
  assert.deepEqual(G.cleanState({ owner: 5, repo: "r", fingerprint: {}, lastSavedAt: "x", autoSave: "true", extra: 1 }), { owner: null, repo: "r", fingerprint: null, lastSavedAt: null, autoSave: false });
});

test("the project record round-trips through project-state", () => {
  const project = { type: "website", prompt: "bakery", currentHtml: "<p>x</p>", history: [], githubSave: { owner: "o", repo: "gurost-site-1", fingerprint: "ab", lastSavedAt: T0, autoSave: true } };
  const row = projectState.toRow("pid", "uid", project);
  const back = projectState.fromRow({ ...row, id: "pid", user_id: "uid", updated_at: new Date(T0).toISOString() });
  assert.deepEqual(back.githubSave, project.githubSave);
  const none = projectState.fromRow({ ...projectState.toRow("pid", "uid", { type: "website", prompt: "x", currentHtml: "<p>x</p>", history: [] }), id: "pid", user_id: "uid", updated_at: new Date(T0).toISOString() });
  assert.equal(none.githubSave, null);
});

// ---- the real GitHub commit code, against a fetch stand-in ----
function stubFetch() {
  const calls = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || "GET";
    calls.push({ url: u, method, body: opts.body ? JSON.parse(opts.body) : null });
    let data = {};
    if (u.includes("/git/refs/heads/main") && method === "GET") data = { object: { sha: "base" } };
    else if (u.includes("/git/commits/base")) data = { tree: { sha: "basetree" } };
    else if (u.endsWith("/git/blobs")) data = { sha: "blob" + calls.length };
    else if (u.endsWith("/git/trees")) data = { sha: "tree" };
    else if (u.endsWith("/git/commits")) data = { sha: "newcommit" };
    return { ok: true, status: 200, json: async () => data };
  };
  return calls;
}

test("commitFiles sends text as utf-8, images as base64, in ONE commit with the given message", async () => {
  const calls = stubFetch();
  const sha = await github.commitFiles("o", "r", FILES, { message: "Gurost save 2026-10-07 12:00 UTC" });
  assert.equal(sha, "newcommit");
  const blobs = calls.filter((c) => c.url.endsWith("/git/blobs")).map((c) => c.body);
  assert.deepEqual(blobs.find((b) => b.content === "<h1>Crumb</h1>"), { content: "<h1>Crumb</h1>", encoding: "utf-8" });
  assert.deepEqual(blobs.find((b) => b.encoding === "base64"), { content: Buffer.from([1, 2, 3, 4]).toString("base64"), encoding: "base64" });
  assert.equal(calls.filter((c) => c.url.endsWith("/git/commits")).length, 1);
  assert.equal(calls.find((c) => c.url.endsWith("/git/commits")).body.message, "Gurost save 2026-10-07 12:00 UTC");
});

test("commitFiles keeps its old default message", async () => {
  const calls = stubFetch();
  await github.commitFiles("o", "r", [{ path: "a.txt", content: "a" }]);
  assert.equal(calls.find((c) => c.url.endsWith("/git/commits")).body.message, "Initial generated code (Gurost)");
});

// ---- the Pulse widget's spoken / typed commands ----
function widget() {
  const noop = () => {};
  const ctx = vm.createContext({
    window: { addEventListener: noop }, console,
    document: { readyState: "loading", addEventListener: noop },
    setInterval: noop, setTimeout: noop, clearTimeout: noop, location: { pathname: "/builder.html" }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.js"), "utf8"), ctx);
  return ctx.window.GurostPulseGithub;
}

test("'Core, save this' and its everyday forms are the save command", () => {
  const { parseCommand } = widget();
  for (const t of ["Core, save this", "core save this.", "Hey Core, save it!", "save this", "Save it", "please save my site", "Core, save to GitHub", "save to github", "Core: save my work", "save this to GitHub"]) {
    assert.equal(parseCommand(t), "save", t);
  }
});

test("auto-save can be switched on and off by words", () => {
  const { parseCommand } = widget();
  for (const t of ["turn off auto-save", "Core, stop auto save", "disable autosave", "please turn off the auto-save."]) assert.equal(parseCommand(t), "auto-off", t);
  for (const t of ["turn on auto-save", "Core, start autosave", "enable auto save"]) assert.equal(parseCommand(t), "auto-on", t);
});

test("an ordinary edit that happens to mention saving is NOT a command", () => {
  const { parseCommand } = widget();
  for (const t of ["Add a save button to the contact form", "make the heading bigger", "save this heading in bold", "Core, add testimonials", "save", "saved items section", "", null, undefined]) {
    assert.equal(parseCommand(t), null, String(t));
  }
});
