// Run: node --test test/file-blocks.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFileBlocks, fileBlocksFormat } = require("../lib/file-blocks");

// The live Free-plan failure: code with quotes that a JSON string would need escaped.
const SERVER = `const express = require("express");
app.get("/api/orders", (req, res) => res.json({ msg: "it's \"fresh\"" }));
app.listen(process.env.PORT || 3000);`;

test("files come through byte-for-byte - quotes, backslashes, newlines need no escaping", () => {
  const reply = `<<<META>>>
{"summary": "Express API for pre-orders", "imageRequests": [{"placeholder": "IMG_1", "description": "sourdough loaf"}]}
<<<END META>>>
<<<FILE server.js>>>
${SERVER}
<<<END FILE>>>
<<<FILE src/App.jsx>>>
export default function App() { return <h1 className="x">Crumb & Co</h1>; }
<<<END FILE>>>`;
  const r = parseFileBlocks(reply);
  assert.deepEqual(r.files.map((f) => f.path), ["server.js", "src/App.jsx"]);
  assert.equal(r.files[0].content, SERVER);
  assert.equal(r.summary, "Express API for pre-orders");
  assert.deepEqual(r.imageRequests, [{ placeholder: "IMG_1", description: "sourdough loaf" }]);
});

test("an outer markdown fence inside a block is removed; bad or missing META is tolerated", () => {
  const r = parseFileBlocks("<<<META>>>\nnot json\n<<<END META>>>\n<<<FILE a.js>>>\n```js\nconsole.log(1);\n```\n<<<END FILE>>>");
  assert.equal(r.files[0].content, "console.log(1);");
  assert.equal(r.summary, "");
  assert.deepEqual(r.imageRequests, []);
});

test("no file blocks -> a clear error, never an empty app", () => {
  assert.throws(() => parseFileBlocks('{"files": []}'), /No files in the reply/);
});

test("the format text names the extra META fields", () => {
  assert.match(fileBlocksFormat("imageRequests (a list)"), /the key summary .* and the key imageRequests \(a list\)/);
  assert.ok(!/\{"summary"/.test(fileBlocksFormat("x")), "no literal JSON example a model could copy word for word");
  assert.match(fileBlocksFormat(), /NOT JSON/);
});

const { createRepeatDetector, completedFilePaths } = require("../lib/file-blocks");

test("repeat detector: true once a file path starts a second time (nemotron's loop), fed in chunks", () => {
  const reply = "<<<FILE package.json>>>\n{}\n<<<END FILE>>>\n<<<FILE src/App.jsx>>>\nx\n<<<END FILE>>>\n<<<FILE package.json>>>\n{";
  const detect = createRepeatDetector();
  let fired = -1;
  for (let i = 5; i <= reply.length; i += 7) if (detect(reply.slice(0, i)) && fired < 0) fired = i;
  if (fired < 0 && detect(reply)) fired = reply.length;
  assert.ok(fired > reply.indexOf("<<<FILE package.json>>>", 10), "fires only after the second header");
  assert.equal(createRepeatDetector()("<<<FILE a.js>>>\n1\n<<<END FILE>>>\n<<<FILE b.js>>>\n"), false);
});

test("a stopped reply parses to the first, complete copy of each file", () => {
  const r = parseFileBlocks("<<<FILE a.js>>>\nfirst\n<<<END FILE>>>\n<<<FILE a.js>>>\nsecond\n<<<END FILE>>>\n<<<FILE b.js>>>\npartial");
  assert.deepEqual(r.files, [{ path: "a.js", content: "first" }]);
  assert.deepEqual(completedFilePaths("<<<FILE a.js>>>\n1\n<<<END FILE>>>\n<<<FILE b.js>>>\n2"), ["a.js"]);
});

test("live model quirks: '<<<END FILE>>' (nemotron) parses; a '<<<<<<< HEAD' loop (qwen3-coder) stops the stream", () => {
  const r = parseFileBlocks("<<<FILE package.json>>>\n{}\n<<<END FILE>>\n<<<FILE src/App.jsx>>>\nx\n<<<END FILE>>");
  assert.deepEqual(r.files.map((f) => f.path), ["package.json", "src/App.jsx"]);
  assert.equal(createRepeatDetector()("<<<FILE a.js>>>\n1\n<<<END FILE>>>\n<<<<<<< HEAD\n<<<<<<< HEAD"), true);
  assert.equal(createRepeatDetector()("<<<FILE a.js>>>\nconst lt = a <<< 2;\n"), false);
});

test("header/footer variants: '<<<FILE: path>>>' and '<<<END_FILE>>>'", () => {
  const r = parseFileBlocks("<<<FILE: src/App.jsx>>>\nx\n<<<END_FILE>>>\n<<<FILE package.json>>>\n{}\n<<<END FILE>>>");
  assert.deepEqual(r.files.map((f) => f.path), ["src/App.jsx", "package.json"]);
});
