// Run: node --test test/placeholder-guard-browser.test.js
// The browser side of the filler guard: the app preview, the chat panel, and the shared rule.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const { buildPreviewDocument, findEntryFile, isFillerFile } = require("../public/shared/app-preview-doc");

const FILLER = Array.from({ length: 38 }, (_, i) => `line ${i}`).join("\n");
const APP = { path: "src/App.jsx", content: "export default function App(){ return <div>Hello bakery</div>; }" };
const quiet = (fn) => { const o = console.warn; const logs = []; console.warn = (...a) => logs.push(a.join(" ")); try { return { value: fn(), logs }; } finally { console.warn = o; } };

test("isFillerFile: 'line 0 ... line 37', blank and dots are filler; code is not", () => {
  assert.equal(isFillerFile({ path: "a.jsx", content: FILLER }), true);
  assert.equal(isFillerFile({ path: "a.jsx", content: "" }), true);
  assert.equal(isFillerFile({ path: "a.jsx" }), true);
  assert.equal(isFillerFile(null), true);
  assert.equal(isFillerFile({ path: "a.jsx", content: "..." }), true);
  assert.equal(isFillerFile(APP), false);
});

test("the preview never picks a filler file as the entry, even when it is first in the list", () => {
  const files = [{ path: "src/Ghost.jsx", content: FILLER }, { path: "src/Home.jsx", content: "export default function Home(){return <p>Home</p>}" }, APP];
  const { value: doc, logs } = quiet(() => buildPreviewDocument(files));
  assert.match(doc, /var ENTRY_PATH = "src\/App\.jsx"/);
  assert.ok(!doc.includes("src/Ghost.jsx"), "the filler file is not even shipped to the frame");
  assert.ok(!doc.includes("line 37"));
  assert.equal(logs.length, 1);
  assert.match(logs[0], /src\/Ghost\.jsx/);
});

test("if the first file is filler and the only other is real, the real one is the entry", () => {
  const { value: doc } = quiet(() => buildPreviewDocument([{ path: "a.js", content: FILLER }, { path: "b.js", content: "export default function B(){return null}" }]));
  assert.match(doc, /var ENTRY_PATH = "b\.js"/);
});

test("nothing real left: a plain, honest message instead of a blank screen", () => {
  for (const files of [[{ path: "src/App.jsx", content: FILLER }], [{ path: "x.js", content: "" }], [], null, undefined]) {
    const { value: doc } = quiet(() => buildPreviewDocument(files));
    assert.match(doc, /data-gurost-empty="true"/);
    assert.match(doc, /no screens to show yet/);
    assert.ok(!/react\.development|babel/i.test(doc), "no scripts to run");
  }
});

test("a normal app still builds exactly as before (React, Babel, its files and entry)", () => {
  const doc = buildPreviewDocument([APP, { path: "src/Home.jsx", content: "export default function Home(){return null}" }]);
  assert.match(doc, /react@18/);
  assert.match(doc, /var ENTRY_PATH = "src\/App\.jsx"/);
  assert.ok(doc.includes("Hello bakery"));
  assert.equal(findEntryFile([APP]).path, "src/App.jsx");
});

test("the downloaded zip's preview.html gets the same guard (wrapper uses this module)", () => {
  const { entriesFor } = require("../wrapper");
  const es = quiet(() => entriesFor({ type: "app", prompt: "x", appFiles: { frontend: [{ path: "src/App.jsx", content: FILLER }], backend: [{ path: "server.js", content: "app.listen(3000)" }], database: null } })).value;
  const pre = es.find((e) => e.name === "frontend/preview.html");
  assert.ok(pre, "the preview file is still written");
  assert.match(pre.content, /no screens to show yet/);
});

// ---- the chat panel ------------------------------------------------------------------------------------
function chatPanel() {
  const rows = [];
  const els = { botLog: { scrollTop: 0, scrollHeight: 10 }, botLogList: { appendChild: (li) => rows.push(li) }, botLogEmpty: { remove() {} } };
  const document = { getElementById: (id) => els[id] || null, createElement: () => ({ className: "", innerHTML: "" }), addEventListener() {} };
  const ctx = { document, window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/shared/bot-conversation.js"), "utf8") + "\nthis.logBot = logBot; this.isFillerText = isFillerText;", ctx);
  return { logBot: ctx.logBot, isFillerText: ctx.isFillerText, rows };
}

test("chat: empty, whitespace and 'line N' messages are skipped, not drawn", () => {
  const p = chatPanel();
  quiet(() => { p.logBot("Builder", ""); p.logBot("Builder", "   \n "); p.logBot("Frontend", null); p.logBot("Frontend", undefined); p.logBot("Builder", FILLER); p.logBot("Builder", "..."); });
  assert.equal(p.rows.length, 0);
});

test("chat: skipped messages are noted in the console with the bot's name", () => {
  const p = chatPanel();
  const { logs } = quiet(() => p.logBot("Frontend", FILLER));
  assert.equal(logs.length, 1);
  assert.match(logs[0], /Frontend/);
});

test("chat: normal messages still appear, including text that merely starts with 'line'", () => {
  const p = chatPanel();
  quiet(() => { p.logBot("Builder", "Building your app…", "work"); p.logBot("Builder", "line items are saved per order"); });
  assert.equal(p.rows.length, 2);
  assert.equal(p.isFillerText("line items are saved per order"), false);
});

test("app-builder.html filters filler in the code tabs and the stage preview", () => {
  const src = fs.readFileSync(path.join(__dirname, "../public/app-builder.html"), "utf8");
  assert.ok(/\]\.filter\(\(f\) => !isFillerFile\(f\)\);/.test(src), "code tabs");
  assert.ok(/stageView\.backend = \(d\.files \|\| \[\]\)\.filter\(\(f\) => !isFillerFile\(f\)\)/.test(src), "backend stage list");
  assert.ok(/\(d\.files \|\| \[\]\)\.filter\(\(f\) => !isFillerFile\(f\)\)\.map/.test(src), "frontend stage list");
});
