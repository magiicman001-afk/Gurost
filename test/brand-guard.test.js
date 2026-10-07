// Run: node --test test/brand-guard.test.js
// The AI's name and avatar live in public/shared/brand-config.js ONLY. This test fails if the
// current name, the old "Gurost Flow" name, or the avatar emoji is typed anywhere else in the
// code, so renaming it later is a one-line edit.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../public/shared/brand-config");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "test-results", "playwright-report"]);
const ALLOWED = new Set(["public/shared/brand-config.js", "test/brand-guard.test.js"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP_DIRS.has(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

test("the name and avatar are typed only in brand-config.js", () => {
  const needles = [C.NAME, C.AVATAR, "Gurost Flow", "GurostFlow", "flow-brand", "FLOW_ROLES", "data-flow-avatar"];
  const hits = [];
  for (const file of walk(ROOT).filter((f) => /\.(js|html|css|json|sql)$/.test(f))) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    if (ALLOWED.has(rel)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const n of needles) if (src.includes(n)) hits.push(`${rel}: "${n}"`);
  }
  assert.deepEqual(hits, [], "typed outside brand-config.js:\n" + hits.join("\n"));
});

test("brand-config.js is the whole config: a name and an avatar, nothing else to edit", () => {
  assert.deepEqual(Object.keys(C).sort(), ["AVATAR", "NAME"]);
  assert.ok(C.NAME.length > 0 && C.AVATAR.length > 0);
});
