// Run: node --test test/project-limit.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

// A recording stand-in for the Supabase client, loaded in place of lib/db.
const calls = [];
let rows = [];
function query(table) {
  const q = { table, filters: [], op: "select" };
  const chain = {
    select(cols) { q.cols = cols; return chain; },
    delete() { q.op = "delete"; return chain; },
    eq(col, val) { q.filters.push([col, val]); return chain; },
    maybeSingle() { calls.push(q); return Promise.resolve({ data: rows.find((r) => q.filters.every(([c, v]) => r[c] === v)) || null, error: null }); },
    then(resolve) { calls.push(q); return resolve({ data: q.op === "select" ? rows.filter((r) => q.filters.every(([c, v]) => (c === "context->>built" ? String(r.built) === v : r[c] === v))) : null, error: null }); }
  };
  return chain;
}
require.cache[path.join(__dirname, "../lib/db.js")] = { exports: { supabase: { from: query } }, loaded: true, id: "db" };
const ps = require("../project-state");

test("a project counts once something is built: a site, designs or app files", () => {
  assert.equal(ps.isBuilt({ currentHtml: "<html></html>" }), true);
  assert.equal(ps.isBuilt({ variants: [{ id: "minimal" }] }), true);
  assert.equal(ps.isBuilt({ appFiles: { "src/App.jsx": "x" } }), true);
  assert.equal(ps.isBuilt({ appFiles: [{ path: "a" }] }), true);
  for (const shell of [{}, { state: "BUILDING" }, { variants: [] }, { appFiles: {} }, { appFiles: [] }, { currentHtml: "" }, null]) {
    assert.equal(ps.isBuilt(shell), false, JSON.stringify(shell));
  }
});

test("every save records whether the project is built", () => {
  assert.equal(ps.toRow("p1", "u1", { currentHtml: "<p>x</p>" }).context.built, true);
  assert.equal(ps.toRow("p2", "u1", { state: "IDLE" }).context.built, false);
});

test("the limit counts the user's built saved projects only", async () => {
  rows = [
    { id: "a", user_id: "u1", built: true },
    { id: "b", user_id: "u1", built: false },
    { id: "c", user_id: "u2", built: true }
  ];
  const ids = await ps.builtProjectIds("u1");
  assert.deepEqual([...ids], ["a"]);
});

test("deleting removes the saved state, history and share links - only the owner's", async () => {
  calls.length = 0;
  await ps.deleteProjectRows("p9", "u1");
  const deletes = calls.filter((c) => c.op === "delete").map((c) => `${c.table} ${JSON.stringify(c.filters)}`).sort();
  assert.deepEqual(deletes, [
    'project_history [["id","p9"],["user_id","u1"]]',
    'project_shares [["project_id","p9"]]',
    'project_state [["id","p9"],["user_id","u1"]]'
  ]);
  assert.ok(!calls.some((c) => /submissions/.test(c.table)), "form submissions are kept");
});

test("ownerOf reads the saved row's owner, null when there is none", async () => {
  rows = [{ id: "p1", user_id: "u7" }];
  assert.equal(await ps.ownerOf("p1"), "u7");
  assert.equal(await ps.ownerOf("nope"), null);
});
