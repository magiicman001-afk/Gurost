// Run: node --test test/revamp-lighthouse.test.js
// Amend Website's Lighthouse call. On Node 22+ require("lighthouse") returns the
// ESM namespace, not the function, so `lighthouse(url, options)` threw
// "lighthouse is not a function" on Render (Node 26) and every audit failed.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "bots", "revamp-bot.js"), "utf8");

test("revamp-bot takes .default when require() gives the ESM namespace", () => {
  assert.match(src, /typeof lighthouseModule === "function" \? lighthouseModule : lighthouseModule\.default/);
  assert.doesNotMatch(src, /const lighthouse = require\("lighthouse"\);/);
});

let installed = true;
try { require.resolve("lighthouse"); } catch { installed = false; }
test("that resolves to a callable function on this Node", { skip: !installed && "lighthouse not installed here" }, () => {
  const mod = require("lighthouse");
  const fn = typeof mod === "function" ? mod : mod.default;
  assert.equal(typeof fn, "function");
});
