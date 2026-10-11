// Run: node --test test/last-project.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const LP = require("../public/shared/last-project");

const store = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
const ID = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

test("remember then recall returns the id; forget clears it", () => {
  const s = store();
  assert.equal(LP.recall(s, 1000), null);
  assert.equal(LP.remember(s, ID, 1000), true);
  assert.equal(LP.recall(s, 2000), ID);
  LP.forget(s);
  assert.equal(LP.recall(s, 2000), null);
});

test("an old remembered project (over twelve hours) is not reopened; a clock that went backwards is not trusted", () => {
  const s = store();
  LP.remember(s, ID, 1_000_000);
  assert.equal(LP.recall(s, 1_000_000 + LP.MAX_AGE_MS), ID);
  assert.equal(LP.recall(s, 1_000_000 + LP.MAX_AGE_MS + 1), null);
  assert.equal(LP.recall(s, 1_000_000 - 5 * 60 * 1000), null);
});

test("only plausible ids are stored; junk, objects and tampered values are ignored", () => {
  const s = store();
  for (const bad of ["", "x", "../../etc/passwd", "<script>", { a: 1 }, null, undefined, "a".repeat(80)]) assert.equal(LP.remember(s, bad, 1), false);
  assert.equal(s.m.size, 0);
  s.setItem(LP.KEY, "not json");
  assert.equal(LP.recall(s, 1), null);
  s.setItem(LP.KEY, JSON.stringify({ id: "<img src=x onerror=alert(1)>", at: 1 }));
  assert.equal(LP.recall(s, 1), null);
  s.setItem(LP.KEY, JSON.stringify({ id: ID, at: "now" }));
  assert.equal(LP.recall(s, 1), null);
});

test("a broken or missing storage never throws", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(LP.remember(broken, ID), false);
  assert.equal(LP.recall(broken), null);
  assert.doesNotThrow(() => LP.forget(broken));
  assert.equal(LP.remember(null, ID), false);
  assert.equal(LP.recall(undefined), null);
});

test("builder.html loads the module, remembers on start and on load, forgets a missing project, and restores on a bare visit", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "builder.html"), "utf8");
  assert.match(html, /<script src="shared\/last-project\.js"><\/script>/);
  assert.ok(html.indexOf("shared/last-project.js") < html.indexOf("shared/pulse-build-brain.js"));
  assert.equal((html.match(/LastProject\.remember\(localStorage/g) || []).length, 2);
  assert.match(html, /LastProject\.forget\(localStorage\)/);
  assert.match(html, /const last = LastProject\.recall\(localStorage\);\s*if \(last\) loadExistingProject\(last\);/);
  // a pending "start a new build" request still wins over restoring the old project
  assert.ok(html.indexOf("generateWebsite(pending.prompt)") < html.indexOf("LastProject.recall"));
});
