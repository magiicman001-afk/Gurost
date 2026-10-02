// Run: node --test test/preview-guard.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const path = require("path");

// code-boxes.js is a browser script; load its top-level functions into a sandbox.
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/shared/code-boxes.js"), "utf8") + "\nthis.injectCodeBoxScript = injectCodeBoxScript;", ctx);
const inject = ctx.injectCodeBoxScript;

const PAGE = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><a href="#rooms">Rooms</a><script>var s = "</body>";</script></body></html>';

test("previews resolve #links within the page: base about:srcdoc first in <head>", () => {
  const out = inject(PAGE);
  assert.match(out, /<head><base href="about:srcdoc"><title>/);
});

test("a page's own <base> is removed so it can't undo the fix", () => {
  const out = inject(PAGE.replace("<title>", '<base href="https://example.com/"><title>'));
  assert.equal((out.match(/<base\b/g) || []).length, 1);
  assert.ok(!out.includes("example.com"));
});

test("guard script goes before the LAST </body>, not one inside a script string", () => {
  const out = inject(PAGE);
  assert.match(out, /var s = "<\/body>";<\/script>\s*<script>[\s\S]*gurost-preview-scroll[\s\S]*<\/script>\s*<\/body><\/html>$/);
});

test("scroll position is handed to the next render; none by default", () => {
  assert.match(inject(PAGE, { scrollY: 1234.6 }), /<base href="about:srcdoc"><script>window.__gurostRestoreY = 1235;<\/script>/);
  assert.ok(!inject(PAGE).includes("__gurostRestoreY ="));
});
