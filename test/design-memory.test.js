"use strict";
// Design Memory (docs/DESIGN_MEMORY_SPEC.md): saving scored designs, the pick / edit / delete / kept signals, the learning rule,
// the learned look, the admin summary. A tiny in-memory stand-in for the database client: no network.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const DM = require("../lib/design-memory");
const L = require("../bots/library-bot");
const P = require("../lib/sections/premium");
const H = require("./helpers/premium-sample");

function fakeDb(initial = []) {
  const rows = initial.map((r, i) => ({ id: "r" + i, created_at: new Date(1e12 + i).toISOString(), user_action: null, picked_at: null, project_id: null, variant_id: null, ...r }));
  const from = () => {
    const q = { filters: [], op: null, patch: null, order: null, lim: null };
    const matches = (r) => q.filters.every((f) => f(r));
    const api = {
      upsert(list) { q.op = "upsert"; q.list = list; return api; },
      update(patch) { q.op = "update"; q.patch = patch; return api; },
      select() { q.op = "select"; return api; },
      eq(c, v) { q.filters.push((r) => r[c] === v); return api; },
      is(c, v) { q.filters.push((r) => (r[c] === undefined ? null : r[c]) === v); return api; },
      not(c, op, v) { q.filters.push((r) => !((r[c] === undefined ? null : r[c]) === v)); return api; },
      lt(c, v) { q.filters.push((r) => r[c] !== null && r[c] < v); return api; },
      order() { return api; },
      limit(n) { q.lim = n; return api; },
      then(res, rej) {
        let out;
        if (q.op === "upsert") {
          for (const n of q.list) {
            const at = rows.findIndex((r) => r.project_id === n.project_id && r.variant_id === n.variant_id);
            if (at >= 0) rows[at] = { ...rows[at], ...n }; else rows.push({ id: "n" + rows.length, created_at: new Date().toISOString(), user_action: null, picked_at: null, ...n });
          }
          out = { error: null };
        } else if (q.op === "update") {
          for (const r of rows.filter(matches)) Object.assign(r, q.patch);
          out = { error: null };
        } else out = { data: rows.filter(matches).slice(0, q.lim || 1e9), error: null };
        return Promise.resolve(out).then(res, rej);
      },
    };
    return api;
  };
  return { client: { from }, rows };
}

const SECTIONS_A = [{ id: "navbar", variant: "a" }, { id: "hero", variant: "c" }, { id: "services", variant: "a" }, { id: "about", variant: "c" }, { id: "footer", variant: "a" }, { id: "booking", variant: "a" }, { id: "location", variant: "a" }];
const SECTIONS_B = [{ id: "navbar", variant: "c" }, { id: "hero", variant: "b" }, { id: "gallery", variant: "b" }, { id: "services", variant: "b" }, { id: "footer", variant: "b" }];
const variant = (id, sections, score, palette = "cafe") => ({ id, premium: { sections, score }, site: { palette } });

test("recordBuild saves structure only: industry, sections, palette, score, project and design ids", async () => {
  const { client, rows } = fakeDb();
  const r = await DM.recordBuild("p1", [variant("minimal", SECTIONS_A, 92.4), variant("bold", SECTIONS_B, 81), { id: "x", site: { palette: "cafe" } }], { client });
  assert.equal(r.saved, 2, "a design without a premium score teaches nothing and is not saved");
  assert.deepEqual(Object.keys(rows[0]).filter((k) => !["id", "created_at", "user_action", "picked_at"].includes(k)).sort(), ["industry", "palette", "premium_score", "project_id", "sections", "variant_id"]);
  assert.equal(rows[0].premium_score, 92);
  assert.equal(JSON.stringify(rows).includes("Luvky"), false);
});

test("recording the same design twice updates it instead of adding a second row", async () => {
  const { client, rows } = fakeDb();
  await DM.recordBuild("p1", [variant("minimal", SECTIONS_A, 80)], { client });
  await DM.recordBuild("p1", [variant("minimal", SECTIONS_A, 90)], { client });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].premium_score, 90);
});

test("a database error never throws: the build must not break", async () => {
  const bad = { from: () => { throw new Error("db down"); } };
  assert.deepEqual(await DM.recordBuild("p1", [variant("minimal", SECTIONS_A, 80)], { client: bad }), { saved: 0, error: "db down" });
  await DM.markPicked("p", "v", { client: bad });
  await DM.markEdited("p", { client: bad });
  await DM.markDeleted("p", { client: bad });
  await DM.settleKept({ client: bad });
  assert.equal(await DM.bestLook("cafe", { client: bad }), null);
});

test("pick, first edit, delete and the 24-hour 'kept' rule", async () => {
  const t0 = new Date("2026-10-12T10:00:00Z");
  const { client, rows } = fakeDb();
  await DM.recordBuild("p1", [variant("minimal", SECTIONS_A, 90), variant("bold", SECTIONS_B, 85)], { client });
  await DM.markEdited("p1", { client, now: t0 });
  assert.equal(rows.every((r) => r.user_action === null), true, "nothing picked yet, so an edit says nothing");
  await DM.markPicked("p1", "minimal", { client, now: t0 });
  await DM.settleKept({ client, now: new Date(t0.getTime() + 23 * 3600e3) });
  assert.equal(rows[0].user_action, null, "23 hours is not yet kept");
  await DM.settleKept({ client, now: new Date(t0.getTime() + 25 * 3600e3) });
  assert.equal(rows[0].user_action, "kept");
  assert.equal(rows[1].user_action, null, "the design that was not picked stays null: it is not counted as a loss");
  await DM.markDeleted("p1", { client, now: t0 });
  assert.equal(rows[0].user_action, "deleted");
  assert.equal(rows[1].user_action, null);
});

test("the first edit marks 'edited'; a later kept sweep does not overwrite it", async () => {
  const t0 = new Date("2026-10-12T10:00:00Z");
  const { client, rows } = fakeDb();
  await DM.recordBuild("p1", [variant("minimal", SECTIONS_A, 90)], { client });
  await DM.markPicked("p1", "minimal", { client, now: t0 });
  await DM.markEdited("p1", { client, now: t0 });
  await DM.settleKept({ client, now: new Date(t0.getTime() + 48 * 3600e3) });
  assert.equal(rows[0].user_action, "edited");
});

// ------------------------------------------------------------------ learning
const rowsOf = (n, sections, score, extra = {}) => Array.from({ length: n }, () => ({ sections, palette: "cafe", premium_score: score, user_action: null, picked_at: null, ...extra }));

test("booking and location do not make two designs different combinations", () => {
  assert.equal(DM.comboKey(SECTIONS_A, "cafe"), DM.comboKey(SECTIONS_A.filter((s) => !["booking", "location"].includes(s.id)), "cafe"));
});

test("ranking: mean score, plus 8 x kept rate, minus 12 x deleted rate (per picked design)", () => {
  const rows = [...rowsOf(5, SECTIONS_A, 80, { picked_at: "x", user_action: "kept" }), ...rowsOf(5, SECTIONS_B, 90, { picked_at: "x", user_action: "deleted" })];
  const r = DM.rank(rows);
  assert.equal(r[0].key, DM.comboKey(SECTIONS_A, "cafe"), "kept beats a higher score that gets deleted");
  assert.equal(r[0].value, 88); // 80 + 8*1
  assert.equal(r[1].value, 78); // 90 - 12*1
});

test("nothing is learned before 50 builds in the industry, or from a combination with fewer than 5 builds", () => {
  const never = () => 0.99;
  assert.equal(DM.chooseBest(rowsOf(49, SECTIONS_A, 90), { rng: never }), null);
  assert.ok(DM.chooseBest(rowsOf(50, SECTIONS_A, 90), { rng: never }));
  const mixed = [...rowsOf(48, SECTIONS_A, 70), ...rowsOf(2, SECTIONS_B, 99)];
  assert.equal(DM.chooseBest(mixed, { rng: never }).key, DM.comboKey(SECTIONS_A, "cafe"), "2 lucky builds are not trusted");
});

test("1 build in 5 explores: no learned look, so a new combination can be found", () => {
  const rows = rowsOf(60, SECTIONS_A, 90);
  assert.equal(DM.chooseBest(rows, { rng: () => 0.1 }), null);
  assert.ok(DM.chooseBest(rows, { rng: () => 0.3 }));
});

test("a learned combination becomes a look the library bot can build, with its needs worked out", () => {
  const look = DM.lookFromCombo(DM.rank(rowsOf(5, SECTIONS_B, 90))[0]);
  assert.equal(look.id, "learned-cafe");
  assert.deepEqual(look.order, ["navbar", "hero", "gallery", "services", "booking", "location", "footer"]);
  assert.equal(look.variants.hero, "b");
  assert.deepEqual(look.needs, ["hero-image", "gallery-3"]);
  assert.deepEqual(DM.lookFromCombo(DM.rank(rowsOf(5, SECTIONS_A, 90))[0]).needs, [], "a type-led hero with no gallery needs nothing");
});

test("bestLook reads one industry's rows, settles 'kept' first, and returns null with too little data", async () => {
  const { client } = fakeDb(rowsOf(60, SECTIONS_B, 90).map((r) => ({ ...r, industry: "cafe" })));
  const got = await DM.bestLook("cafe", { client, rng: () => 0.9 });
  assert.equal(got.look.id, "learned-cafe");
  assert.equal(await DM.bestLook("law", { client, rng: () => 0.9 }), null);
});

test("admin summary: builds, mean score, how many builds until it learns, top combinations, winning sections", async () => {
  const { client } = fakeDb([...rowsOf(30, SECTIONS_A, 90).map((r) => ({ ...r, industry: "cafe" })), ...rowsOf(5, SECTIONS_B, 70).map((r) => ({ ...r, industry: "cafe" })), ...rowsOf(3, SECTIONS_A, 60).map((r) => ({ ...r, industry: "law", palette: "law" }))]);
  const s = await DM.adminSummary({ client });
  assert.equal(s.totalBuilds, 38);
  assert.equal(s.industries.cafe.builds, 35);
  assert.equal(s.industries.cafe.learning, false);
  assert.equal(s.industries.cafe.buildsToLearn, 15);
  assert.equal(s.industries.cafe.topCombos[0].builds, 30);
  assert.ok(s.industries.cafe.sectionWins.some((w) => w.section === "hero.c"));
  assert.equal(s.industries.law.meanScore, 60);
});

// ------------------------------------------------------------------ the builder uses it
test("library bot: with a learned look the first slot leads with it, the second keeps a fixed premium look", async () => {
  const learned = DM.lookFromCombo(DM.rank(rowsOf(5, [{ id: "navbar", variant: "a" }, { id: "hero", variant: "c" }, { id: "gallery", variant: "a" }, { id: "services", variant: "a" }, { id: "about", variant: "c" }, { id: "cta", variant: "a" }, { id: "footer", variant: "a" }].map((s) => s), 90).map((r) => ({ ...r, palette: "salon" })))[0], "Proven for your industry");
  const orig = console.log; console.log = () => {};
  let r;
  try {
    r = await L.generateLibraryVariants("a hair salon in Manchester", { businessInfo: { name: "Studio Nine", phone: "0161 496 0000" }, premium: true, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("salon"), search: H.search, bestLook: async () => ({ look: learned }) });
  } finally { console.log = orig; }
  const first = r.variants.find((v) => v.id === "minimal");
  const second = r.variants.find((v) => v.id === "bold");
  assert.equal(first.premium.look, "learned-salon");
  assert.equal(first.label, "Proven for your industry");
  assert.ok(Array.isArray(first.premium.sections) && first.premium.sections.some((s) => s.id === "gallery"));
  assert.ok(P.looksFor("salon").some((l) => l.id === second.premium.look));
});

test("library bot: a failing or empty lookup changes nothing", async () => {
  for (const bestLook of [async () => null, async () => { throw new Error("db"); }]) {
    const orig = console.log; console.log = () => {};
    let r;
    try {
      r = await L.generateLibraryVariants("a plumber in Leeds", { businessInfo: { name: "Pipes Ltd" }, premium: true, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("trades"), search: H.search, bestLook });
    } finally { console.log = orig; }
    assert.ok(r.variants.every((v) => P.looksFor("trades").some((l) => l.id === v.premium.look)));
  }
});

test("server: records a finished build, marks pick / first edit / delete, and has an admin-only view", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.equal((src.match(/designMemory\.recordBuild\(projectId, result\.variants\)/g) || []).length, 2, "first build and 'show 2 more'");
  assert.match(src, /designMemory\.markPicked\(projectId, variantId\)/);
  assert.match(src, /if \(project\.type !== "app"\) designMemory\.markEdited\(projectId\)/);
  assert.match(src, /designMemory\.markDeleted\(id\)/);
  assert.match(src, /app\.get\("\/api\/admin\/design-memory", requireAdminAuth/);
});

test("the flag is off unless DESIGN_MEMORY is exactly 1", () => {
  assert.equal(DM.enabled({}), false);
  assert.equal(DM.enabled({ DESIGN_MEMORY: "yes" }), false);
  assert.equal(DM.enabled({ DESIGN_MEMORY: "1" }), true);
});
