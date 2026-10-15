// Run: node --test test/save-honesty.test.js
// Bug E, Save: the Save button must not say "saved" when the database write failed.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

let failWith = null;
const warnings = [];
require.cache[path.join(__dirname, "../lib/db.js")] = {
  exports: { supabase: { from: () => ({ upsert: () => Promise.resolve({ error: failWith }) }) } },
  loaded: true,
  id: "db",
};
const ps = require("../project-state");
const project = { state: "DONE", prompt: "x", userId: "u1", type: "website", currentHtml: "<html></html>", history: [], stateHistory: [] };

test("a failed write throws a coded error, and a good one does not", async () => {
  const warn = console.warn;
  console.warn = (...a) => warnings.push(a.join(" "));
  try {
    failWith = null;
    await ps.persistProjectState("p1", "u1", project);
    failWith = { message: 'relation "public.project_state" does not exist' };
    await assert.rejects(ps.persistProjectState("p1", "u1", project), (e) => e.code === "persist-failed" && /could not be written/.test(e.message));
  } finally { console.warn = warn; }
  assert.ok(warnings.some((w) => /Failed to persist/.test(w)), "the warning is still logged");
});

test("background saves still swallow the failure, and the Save route tells the person", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(src, /function persistInBackground[\s\S]{0,300}\.catch\(/);
  const at = src.indexOf('app.post("/api/project/:id/save"');
  const route = src.slice(at, src.indexOf("\n});", at));
  assert.match(route, /err\.code === "persist-failed"/);
  assert.match(route, /status\(503\)\.json\(\{ saved: false/);
  assert.ok(!/persistInBackground/.test(route), "Save waits for the real write");
});
