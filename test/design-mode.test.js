// Run: node --test test/design-mode.test.js
// Pulse's Design button: the preview is a sandboxed frame the page cannot reach into, so Design mode is a message bridge
// (shared/pulse-widget.js <-> the script shared/code-boxes.js puts into the preview). The browser run is in the Bug E notes;
// these checks keep the two halves in step and the injected script valid.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", "public", "shared", f), "utf8");

test("the script injected into the preview is valid JavaScript and answers the design messages", () => {
  const src = read("code-boxes.js");
  const m = src.match(/const CODE_BOX_INJECTION_SCRIPT = `([\s\S]*?)`;\n/);
  assert.ok(m, "the injected script is a template string");
  const cooked = new Function("return `" + m[1] + "`")(); // what the preview actually receives (template escapes resolved)
  const js = cooked.replace(/^\s*<script>/, "").replace(/<\/script>\s*$/, "");
  assert.doesNotThrow(() => new Function(js), "the preview script parses");
  assert.match(js, /gurost-design-mode/);
  assert.match(js, /gurost-design-click/);
  assert.match(js, /gurost-design-ready/);
  assert.match(js, /e\.source !== window\.parent/, "only the builder page can switch it on");
  assert.ok(!/\$\{/.test(m[1]), "no template placeholder slipped into the injected script");
});

test("the widget turns the mode on by message, listens only to its own preview frame, and says so when the preview cannot do it", () => {
  const w = read("pulse-widget.js");
  assert.match(w, /postMessage\(\{ type: 'gurost-design-mode'/);
  assert.match(w, /e\.source !== frame\.contentWindow/);
  assert.match(w, /gurost-design-click/);
  assert.match(w, /Design Mode is not available on this preview yet/);
  assert.ok(!/contentDocument/.test(w.slice(w.indexOf("Real Design Mode"), w.indexOf("Real, honest visibility"))), "no same-origin reach into the frame");
});
