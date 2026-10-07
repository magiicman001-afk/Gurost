// Run: node --test test/app-build-state.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const b = require("../lib/app-build-state");
const { toRow, fromRow } = require("../project-state");

const fresh = () => ({ state: "IDLE", type: "app", prompt: "bakery", userId: "u1", appFiles: null, history: [], stateHistory: [] });

test("a build goes IDLE -> BUILDING when it starts and DONE when it finishes", () => {
  const p = b.beginBuild(fresh());
  assert.equal(p.state, "BUILDING");
  b.finishBuild(p);
  assert.equal(p.state, "DONE");
  assert.equal(p.buildError, null);
});

test("each stage's output is kept as it lands, so it can be saved after every stage", () => {
  const p = b.beginBuild(fresh());
  assert.equal(b.recordStage(p, "schema", "running", { model: "x" }), false, "starting a stage keeps nothing");
  assert.equal(b.recordStage(p, "backend", "progress", null), false);
  assert.equal(b.recordStage(p, "schema", "complete", { schema: "CREATE TABLE a (id int);", engine: "postgres" }), true);
  assert.deepEqual(p.appFiles.database, { engine: "postgres", schema: "CREATE TABLE a (id int);" });
  assert.equal(b.recordStage(p, "backend", "complete", { files: [{ path: "server.js", content: "x" }] }), true);
  assert.equal(b.recordStage(p, "frontend", "complete", { files: [{ path: "src/App.jsx", content: "y" }] }), true);
  assert.equal(p.appFiles.backend.length, 1);
  assert.equal(p.appFiles.frontend[0].path, "src/App.jsx");
  assert.equal(b.recordStage(p, "reviewing", "complete", { hasCritical: false }), false, "other stages keep nothing");
});

test("a failed build resets to DONE with the reason, keeping whatever was built", () => {
  const p = b.beginBuild(fresh());
  b.recordStage(p, "schema", "complete", { schema: "s", engine: "postgres" });
  b.failBuild(p, new Error("Build timed out after 150s with no progress."), 1000);
  assert.equal(p.state, "DONE");
  assert.deepEqual(p.buildError, { error: "Build timed out after 150s with no progress.", at: 1000 });
  assert.equal(p.appFiles.database.schema, "s", "the partial work is kept");
});

test("failing from any state, even paused or correcting, still ends DONE", () => {
  for (const state of ["IDLE", "PLANNING", "BUILDING", "PAUSED", "CORRECTING", "RESUMING", "DONE"]) {
    const p = { ...fresh(), state };
    b.failBuild(p, "boom");
    assert.equal(p.state, "DONE", state);
    assert.equal(p.buildError.error, "boom");
  }
  const long = b.failBuild(fresh(), new Error("x".repeat(900)));
  assert.equal(long.buildError.error.length, 500);
});

test("a retry starts clean: the old error is cleared", () => {
  const p = b.failBuild(b.beginBuild(fresh()), "boom");
  const again = { ...fresh(), buildError: p.buildError };
  b.beginBuild(again);
  assert.equal(again.buildError, null);
});

test("saved with the project, and a build cut off by a restart comes back as interrupted, not 'building'", () => {
  const p = b.beginBuild(fresh());
  b.recordStage(p, "backend", "complete", { files: [{ path: "server.js", content: "x" }] });
  const row = toRow("proj1", "u1", p);
  assert.equal(row.context.state, "BUILDING");
  assert.equal(row.context.appFiles.backend[0].path, "server.js");
  const back = fromRow({ ...row, user_id: "u1", updated_at: new Date().toISOString() });
  assert.equal(back.state, "DONE");
  assert.match(back.buildError.error, /interrupted/);
  assert.equal(back.appFiles.backend.length, 1, "what was built survives");

  const done = b.finishBuild(b.beginBuild(fresh()));
  const doneBack = fromRow({ ...toRow("p2", "u1", done), user_id: "u1", updated_at: new Date().toISOString() });
  assert.equal(doneBack.buildError, null);
  const failed = b.failBuild(b.beginBuild(fresh()), "bad");
  assert.equal(fromRow({ ...toRow("p3", "u1", failed), user_id: "u1", updated_at: new Date().toISOString() }).buildError.error, "bad");
  // Website projects are left alone.
  const site = { ...fresh(), type: "website", state: "BUILDING" };
  assert.equal(b.markInterrupted(site).state, "BUILDING");
});

test("buildReport counts what the review really found, and claims nothing when the checks did not run", () => {
  assert.deepEqual(b.buildReport({ startedAt: 1000, now: 135000, found: 5, remaining: 2, verified: true }), { seconds: 134, found: 5, fixed: 3, remaining: 2, verified: true });
  assert.equal(b.buildReport({ startedAt: 0, now: 1000, found: 2, remaining: 5 }).fixed, 0, "never negative");
  assert.deepEqual(b.buildReport({ startedAt: 1000, now: 4000, verified: false }), { seconds: 3, found: null, fixed: null, remaining: null, verified: false });
  assert.equal(b.buildReport({ startedAt: undefined, now: 5 }).seconds, 0);
});
