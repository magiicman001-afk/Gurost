// Run: node --test test/project-state-v2.test.js
// What a Website Builder V2 project keeps across a restart: the library content and the published record.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

let saved = null;
require.cache[path.join(__dirname, "../lib/db.js")] = {
  exports: {
    supabase: {
      from: () => ({
        upsert: (row) => { saved = row; return Promise.resolve({ error: null }); },
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: saved ? { ...saved } : null, error: null }) }) }),
      }),
    },
  },
  loaded: true,
  id: "db",
};
const ps = require("../project-state");

const site = { palette: "cafe", recipe: "local-business", content: { hero: { headline: "Fresh bread" } }, variants: { hero: "a" }, pages: ["index"] };
const published = { slug: "luvky-bakes", version: 3, publishedAt: "2031-06-01T10:00:00.000Z", status: "live" };
const project = { state: "DONE", prompt: "bakery in Leeds", userId: "u1", type: "website", currentHtml: "<html></html>", history: [], stateHistory: [], site, published };

test("the saved row carries the site recipe, the published record and a schema version", () => {
  const row = ps.toRow("p1", "u1", project);
  assert.deepEqual(row.context.site, site);
  assert.deepEqual(row.context.published, published);
  assert.equal(row.context.schemaVersion, ps.SCHEMA_VERSION);
  assert.equal(ps.SCHEMA_VERSION, 2);
});

test("a project survives a restart: save, then hydrate, gives the same site and published record", async () => {
  await ps.persistProjectState("p1", "u1", project);
  const back = await ps.hydrateProjectIfMissing("p1");
  assert.deepEqual(back.site, site);
  assert.deepEqual(back.published, published);
  assert.equal(back.userId, "u1");
  assert.equal(back.hydratedFromPersistence, true);
});

test("rows saved before V2 (no site, no published, no version) still load, with honest nulls", () => {
  const old = ps.fromRow({ id: "p0", user_id: "u1", updated_at: "2031-01-01T00:00:00Z", context: { prompt: "old", type: "website", state: "DONE", currentHtml: "<html></html>" } });
  assert.equal(old.site, null);
  assert.equal(old.published, null);
  assert.equal(old.currentHtml, "<html></html>");
});

test("a project without V2 data saves nulls, not undefined", () => {
  const row = ps.toRow("p2", "u1", { prompt: "x", history: [] });
  assert.equal(row.context.site, null);
  assert.equal(row.context.published, null);
});
