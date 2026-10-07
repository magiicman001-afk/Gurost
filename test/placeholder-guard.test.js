// Run: node --test test/placeholder-guard.test.js
// Empty / "line N" filler files must not reach the saved app, the preview, the code tabs or the chat.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { dropPlaceholderFiles, cleanAppFiles, isPlaceholderContent } = require("../lib/file-blocks");

const FILLER = Array.from({ length: 38 }, (_, i) => `line ${i}`).join("\n"); // "line 0" ... "line 37"
const real = (p, c = "export default function App(){ return <div>Hi</div>; }") => ({ path: p, content: c });

function quiet(fn) { // the guard logs each drop on purpose; keep test output clean and capture it
  const logs = []; const orig = console.warn;
  console.warn = (...a) => logs.push(a.join(" "));
  try { return { value: fn(), logs }; } finally { console.warn = orig; }
}

test("filler of 'line 0 ... line 37', blanks and bare dots are placeholders; real code is not", () => {
  assert.equal(isPlaceholderContent(FILLER), true);
  assert.equal(isPlaceholderContent(""), true);
  assert.equal(isPlaceholderContent("   \n\n "), true);
  assert.equal(isPlaceholderContent("..."), true);
  assert.equal(isPlaceholderContent("line 3: \nline 4: "), true);
  assert.equal(isPlaceholderContent("const line = 1;"), false);
  assert.equal(isPlaceholderContent("line 0\nconst x = 1;"), false);
});

test("dropPlaceholderFiles keeps real files in order, drops filler, and logs where and which project", () => {
  const { value, logs } = quiet(() => dropPlaceholderFiles(
    [real("src/App.jsx"), { path: "src/Ghost.jsx", content: FILLER }, real("src/Home.jsx"), { path: "src/Empty.jsx", content: "" }],
    { where: "review fix", projectId: "p-123" }
  ));
  assert.deepEqual(value.map((f) => f.path), ["src/App.jsx", "src/Home.jsx"]);
  assert.equal(logs.length, 2);
  assert.match(logs[0], /src\/Ghost\.jsx/);
  assert.match(logs[0], /review fix/);
  assert.match(logs[0], /p-123/);
});

test("dropPlaceholderFiles lets path strings, odd values and non-lists through untouched", () => {
  const { value } = quiet(() => dropPlaceholderFiles(["src/App.jsx", null, 5, { path: "x" }, { path: "y", content: 7 }]));
  assert.deepEqual(value, ["src/App.jsx", null, 5, { path: "x" }, { path: "y", content: 7 }]);
  assert.equal(dropPlaceholderFiles(undefined), undefined);
  assert.equal(dropPlaceholderFiles(null), null);
  assert.equal(dropPlaceholderFiles("nope"), "nope");
});

test("cleanAppFiles cleans both lists, keeps the database, and never changes its input (it can sit in an undo snapshot)", () => {
  const input = {
    frontend: [real("src/App.jsx"), { path: "src/Ghost.jsx", content: FILLER }],
    backend: [{ path: "server.js", content: "" }, real("routes.js", "module.exports = {};")],
    database: { engine: "postgres", schema: "CREATE TABLE t();" }
  };
  const copy = JSON.parse(JSON.stringify(input));
  const { value } = quiet(() => cleanAppFiles(input, { where: "history restore" }));
  assert.deepEqual(value.frontend.map((f) => f.path), ["src/App.jsx"]);
  assert.deepEqual(value.backend.map((f) => f.path), ["routes.js"]);
  assert.deepEqual(value.database, input.database);
  assert.deepEqual(input, copy, "input untouched");
  assert.notEqual(value, input);
});

test("cleanAppFiles copes with older or odd saved shapes without throwing", () => {
  for (const odd of [null, undefined, "x", 5, [], {}, { frontend: null }, { frontend: {}, backend: undefined }]) {
    assert.doesNotThrow(() => quiet(() => cleanAppFiles(odd)));
  }
  assert.equal(cleanAppFiles(null), null);
  assert.deepEqual(cleanAppFiles({}), { frontend: undefined, backend: undefined });
});

test("a build whose every file is filler leaves nothing (the server then fails the build instead of showing a blank app)", () => {
  const { value } = quiet(() => cleanAppFiles({ frontend: [{ path: "src/App.jsx", content: FILLER }], backend: [{ path: "server.js", content: "" }] }));
  assert.equal(value.frontend.length + value.backend.length, 0);
});

test("server.js applies the gate at every place app files are set or restored", () => {
  const src = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  const count = (re) => (src.match(re) || []).length;
  assert.ok(count(/cleanAppFiles\(project\.appFiles, \{ where: "finished build"/g) >= 2, "both build routes clean the finished app");
  assert.ok(count(/where: "review fix"/g) >= 4, "review/fix repairs are filtered");
  assert.ok(count(/where: "sandbox fix"/g) >= 2, "sandbox repairs are filtered");
  assert.ok(count(/where: "undo\/redo"/g) >= 2, "undo and redo are filtered");
  assert.ok(/where: "history restore"/.test(src), "history restore is filtered");
  assert.ok(/where: "project load"/.test(src), "a project loaded from storage is filtered");
  assert.ok(/where: `\$\{stage\} stage`/.test(src), "stage output is filtered before saving and broadcasting");
  assert.ok(count(/produced no usable files/g) >= 2, "an all-filler build fails with a clear message");
});
