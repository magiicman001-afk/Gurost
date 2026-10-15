// Run: node --test test/pulse-buttons.test.js
// Bug E: Pulse buttons that said "okay" and did nothing. One check per fix; the browser runs are in the commit messages.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const widget = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-widget.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-widget.css"), "utf8");

test("Image: a failure replaces 'Generating…' with a plain message, and a spent image credit is said honestly", () => {
  const at = widget.indexOf("pulseImageGenerate').addEventListener");
  const block = widget.slice(at, widget.indexOf("actHistory').addEventListener"));
  assert.match(block, /catch \(err\)/);
  assert.match(block, /showImageError\(friendly\)/);
  assert.match(block, /the image service has no credit left/);
  assert.match(block, /if \(!data\.base64\)/, "an empty answer is an error, not a blank panel");
  assert.match(css, /\.pulse-image-error/);
});
