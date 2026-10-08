// Run: node --test test/app-edit.test.js
// Editing a finished app: only the changed files are rewritten; images survive; the app suggestion box.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const appBot = require("../bots/app-bot");
const S = require("../lib/site-suggestions");

const IMG = "data:image/png;base64," + "A".repeat(5000);
const APP = () => ({
  frontend: [
    { path: "index.html", content: "<div id=root></div>" },
    { path: "src/App.jsx", content: `export default function App(){ return <img src="${IMG}" alt="hero"/>; }\n` + "// pad\n".repeat(200) },
    { path: "src/pages/Tasks.jsx", content: "export default function Tasks(){ return <ul/>; }\n" + "// pad\n".repeat(200) }
  ],
  backend: [{ path: "server.js", content: "app.listen(3000);\n" + "// pad\n".repeat(200) }],
  database: { engine: "postgres", schema: "create table tasks(id int);" }
});
const block = (p, c) => `<<<FILE ${p}>>>\n${c}\n<<<END FILE>>>\n`;
const reply = (files, summary = "Did it.") => `<<<META>>>\n{"summary":"${summary}"}\n<<<END META>>>\n${files}`;
const fake = (text, seen) => async (opts) => { if (seen) seen.push(opts); return { parsed: require("../lib/file-blocks").parseFileBlocks(text), usage: {} }; };

test("only the files the model returns change; the rest stay exactly as they were", async () => {
  const before = APP();
  const newTasks = "export default function Tasks(){ return <ul><li>Buy flour</li></ul>; }\n" + "// pad\n".repeat(200);
  const r = await appBot.editApp(before, "add a first task", { plan: "pro", call: fake(reply(block("src/pages/Tasks.jsx", newTasks))) });
  assert.deepEqual(r.changed, ["src/pages/Tasks.jsx"]);
  assert.equal(r.appFiles.frontend.find((f) => f.path === "src/pages/Tasks.jsx").content, newTasks);
  assert.equal(r.appFiles.frontend.find((f) => f.path === "src/App.jsx").content, before.frontend[1].content);
  assert.equal(r.appFiles.backend[0].content, before.backend[0].content);
  assert.equal(before.frontend[2].content.includes("Buy flour"), false, "the input is never changed");
});

test("generated images are never sent to the model, and are put back in what comes back", async () => {
  const seen = [];
  const editedApp = `export default function App(){ return <div><h1>Hi</h1><img src="[[DATA_1]]" alt="hero"/></div>; }\n` + "// pad\n".repeat(200);
  const r = await appBot.editApp(APP(), "add a heading", { plan: "pro", call: fake(reply(block("src/App.jsx", editedApp)), seen) });
  const sent = seen[0].messages[0].content;
  assert.equal(sent.includes("AAAAAAAAAAAAAAAAAAAA"), false, "no base64 in the prompt");
  assert.ok(sent.includes("[[DATA_1]]"));
  assert.ok(sent.length < 20000);
  assert.ok(r.appFiles.frontend.find((f) => f.path === "src/App.jsx").content.includes(IMG), "the real image is back");
});

test("an unknown image token becomes a blank pixel, never a broken placeholder", () => {
  const { restoreDataUris } = appBot._internal;
  assert.match(restoreDataUris('src="[[DATA_9]]"', []), /data:image\/gif/);
});

test("a new page lands in the frontend, a new route in the backend, the schema in the database", async () => {
  const text = reply(block("src/pages/Settings.jsx", "export default function Settings(){ return <div>Settings</div>; }") + block("routes/settings.js", "module.exports = {};") + block("database/schema.sql", "create table tasks(id int);\ncreate table settings(id int);"));
  const r = await appBot.editApp(APP(), "add settings", { plan: "pro", call: fake(text) });
  assert.ok(r.appFiles.frontend.some((f) => f.path === "src/pages/Settings.jsx"));
  assert.ok(r.appFiles.backend.some((f) => f.path === "routes/settings.js"));
  assert.match(r.appFiles.database.schema, /settings/);
  assert.deepEqual(r.changed.sort(), ["database/schema.sql", "routes/settings.js", "src/pages/Settings.jsx"]);
});

test("a file that comes back far shorter than it was is treated as cut off and not applied", async () => {
  const r = appBot.editApp(APP(), "tweak", { plan: "pro", call: fake(reply(block("src/pages/Tasks.jsx", "export default function Tasks(){}"))) });
  await assert.rejects(r, /incomplete/);
});

test("a change that alters nothing is reported honestly", async () => {
  const before = APP();
  await assert.rejects(appBot.editApp(before, "x", { plan: "pro", call: fake(reply(block("src/pages/Tasks.jsx", before.frontend[2].content))) }), /didn't alter anything/);
});

test("files too big to show are not rewritten", async () => {
  const big = APP();
  big.backend.push({ path: "huge.js", content: "x".repeat(95000) });
  const seen = [];
  await assert.rejects(appBot.editApp(big, "x", { plan: "pro", call: fake(reply(block("huge.js", "y")), seen) }));
  assert.match(seen[0].messages[0].content, /cannot see \(do not change them\): huge\.js/);
});

test("an app with no files cannot be edited", async () => {
  await assert.rejects(appBot.editApp({ frontend: [], backend: [] }, "x", { call: fake("") }), /no app to edit/i);
});

// ---- the suggestion box for apps ----
const BARE = { type: "app", appFiles: { frontend: [{ path: "src/App.jsx", content: "export default function App(){ fetch('/api/tasks'); return <form><input/></form>; }" }], backend: [{ path: "server.js", content: "app.get('/api/tasks',()=>{})" }], database: { schema: "create table users(id int);" } } };

test("an app gets at most 3 plain, app-specific ideas, most useful first", () => {
  const ids = S.pick(BARE).map((s) => s.id);
  assert.deepEqual(ids, ["app-login", "app-validation", "app-errors"]);
});

test("ideas an app already covers are not offered; skipped ones rest for 7 days", () => {
  const good = { ...BARE, appFiles: { ...BARE.appFiles, frontend: [{ path: "a.jsx", content: "const a = <form><input required aria-label='x'/></form>; fetch('/x').catch(()=>{}); // loading spinner, no tasks yet, md:flex dark:bg-black" }], backend: [{ path: "s.js", content: "const jwt = require('jsonwebtoken')" }] } };
  assert.deepEqual(S.pick(good), []);
  const p = { ...BARE }; S.respond(p, "app-login", "skipped", 1000);
  assert.ok(!S.pick(p, { now: 2000 }).some((s) => s.id === "app-login"));
  assert.ok(S.pick(p, { now: 1000 + S.QUIET_MS + 1 }).some((s) => s.id === "app-login"));
});

test("an app with nothing built gets no ideas, and websites are unchanged", () => {
  assert.deepEqual(S.pick({ type: "app", appFiles: { frontend: [], backend: [] } }), []);
  assert.deepEqual(S.pick({ type: "app" }), []);
  assert.ok(S.pick({ type: "website", currentHtml: "<h1>Hi</h1><p>x</p>" }).length > 0);
});

// ---- the pages ----
const html = fs.readFileSync(path.join(__dirname, "../public/app-builder.html"), "utf8");
test("a Pulse edit of a finished app calls the edit route and never rebuilds or asks for company details", () => {
  const fn = html.slice(html.indexOf("async function applyCorrection"), html.indexOf("// Real Deploy flow"));
  assert.match(fn, /\/api\/app-builder\/edit/);
  assert.ok(!/generateApp\(/.test(fn), "no full rebuild");
  assert.ok(!/askBusinessInfo/.test(fn));
});
test("Pulse waits for a build to really finish before it says it is built", () => {
  assert.match(html, /generate: generateAndWait/);
  assert.match(html, /async function generateAndWait/);
});
test("the suggestion box is switched on for the App Builder too", () => {
  const w = fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.js"), "utf8");
  assert.match(w, /onSuggestionPage = \/\\\/\(builder\|app-builder\)/);
  assert.match(w, /onWebsiteBuilder = \/\\\/builder\(/, "the website-only flag keeps meaning websites");
});
