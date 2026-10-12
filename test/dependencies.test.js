"use strict";
// Dependencies are pinned (security spec 1.5): exact versions in package.json, the same ones in the lockfile.
const test = require("node:test");
const assert = require("node:assert/strict");
const pj = require("../package.json");
const lock = require("../package-lock.json");

const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

test("every dependency is an exact version (no ^ or ~ ranges)", () => {
  const loose = Object.entries({ ...pj.dependencies, ...pj.devDependencies }).filter(([, v]) => !EXACT.test(v));
  assert.deepEqual(loose, [], "unpinned: " + loose.map(([n, v]) => `${n}@${v}`).join(", "));
});

test("package.json and the lockfile agree on every dependency", () => {
  const root = lock.packages[""];
  assert.deepEqual(root.dependencies, pj.dependencies, "lockfile root differs from package.json");
  for (const [name, version] of Object.entries(pj.dependencies)) {
    const entry = lock.packages[`node_modules/${name}`];
    assert.ok(entry, `${name} is missing from the lockfile`);
    assert.equal(entry.version, version, `${name}: package.json says ${version}, lockfile has ${entry.version}`);
  }
});

test(".npmrc keeps new installs exact", () => {
  const rc = require("fs").readFileSync(require("path").join(__dirname, "..", ".npmrc"), "utf8");
  assert.match(rc, /save-exact=true/);
});
