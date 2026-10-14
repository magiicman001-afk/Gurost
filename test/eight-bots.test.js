// Run: node --test test/eight-bots.test.js
// Track 1: the eight website-builder bots are real modules, library-bot.js only orchestrates them, and every handoff is logged.
// No network, no model, no database (inserts go to a stub).
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const H = require("./helpers/premium-sample");
const HO = require("../lib/bot-handoff");
const L = require("../bots/library-bot");

const root = path.join(__dirname, "..");
const FILES = { planner: "planner-bot", industry: "industry-bot", designer: "designer-bot", research: "site-research-bot", builder: "builder-bot", pulse: "pulse-bot", review: "site-review-bot", launch: "launch-bot" };
const run = (prompt, o) => L.generateLibraryVariants(prompt, { browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("cafe"), search: H.search, ...o });
const fresh = () => HO.createHandoffLog({});
const pairs = (rows) => rows.map((r) => `${r.from_bot}>${r.to_bot}`);

test("each of the eight bots is its own small module with a single job in its header", () => {
  assert.deepEqual(HO.BOTS, ["planner", "industry", "designer", "research", "builder", "pulse", "review", "launch"]);
  for (const [bot, file] of Object.entries(FILES)) {
    const src = fs.readFileSync(path.join(root, "bots", file + ".js"), "utf8");
    assert.match(src, new RegExp(`\\(\\d of 8\\)\\. One job:`, "i"), `${bot} states its one job`);
    assert.ok(src.split("\n").length < 260, `${bot} stays small`);
    assert.doesNotThrow(() => require("../bots/" + file), bot);
  }
  assert.ok(fs.readFileSync(path.join(root, "bots", "library-bot.js"), "utf8").split("\n").length < 200, "library-bot only orchestrates");
});

test("the orchestrator keeps its public exports", () => {
  for (const k of ["generateLibraryVariants", "fitLinks", "composeContent", "cleanSection", "systemPrompt", "describeSlots", "DIRECTIONS", "FIRST_IDS", "MORE_IDS", "COPY_SECTIONS", "enabled"]) assert.ok(L[k] !== undefined, k);
  assert.deepEqual(L.FIRST_IDS, ["minimal", "bold"]);
  assert.equal(L.DIRECTIONS.length, 4);
});

test("planner, industry and designer decide without a model", () => {
  const planner = require("../bots/planner-bot");
  const industry = require("../bots/industry-bot");
  const designer = require("../bots/designer-bot");
  const b = planner.plan("a bakery", { premium: false });
  assert.deepEqual(b.ids, ["minimal", "bold"]);
  assert.equal(b.premium, false);
  assert.equal(b.escalate, false);
  assert.equal(planner.plan("x", { directionIds: L.MORE_IDS, siteCopy: {} }).reusesWords, true);
  const ind = industry.match("a bakery in Leeds", { name: "Luvky" });
  assert.equal(ind.palette, "cafe");
  assert.ok(ind.recipeOrder.includes("hero"));
  assert.ok(planner.sectionsToWrite(ind, false).every((id) => planner.COPY_SECTIONS.includes(id)));
  assert.equal(designer.lookFor("cafe", designer.DIRECTIONS[0], false), null);
  assert.ok(designer.lookFor("cafe", designer.DIRECTIONS[0], true).id);
  assert.deepEqual(designer.directionsFor(["bold"]).map((d) => d.id), ["bold"]);
});

test("a plain build hands work along the chain in order, and logs every pass", async () => {
  const trail = fresh();
  const r = await run("a bakery in Leeds", { premium: false, businessInfo: H.INFO, handoffs: trail });
  assert.equal(r.variants.length, 2);
  const p = pairs(trail.rows);
  assert.deepEqual(p.slice(0, 4), ["planner>industry", "industry>designer", "designer>research", "research>builder"]);
  for (const slot of ["minimal", "bold"]) {
    const mine = trail.rows.filter((x) => x.payload.slot === slot).map((x) => `${x.from_bot}>${x.to_bot}`);
    assert.deepEqual(mine, ["builder>pulse", "pulse>review", "review>launch", "launch>user"], slot);
  }
  assert.equal(trail.rows[1].payload.palette, "cafe");
  assert.equal(trail.rows.find((x) => x.from_bot === "review").payload.scored, false);
});

test("a premium build logs the score and what Pulse saw", async () => {
  const trail = fresh();
  const r = await run("a plumber in Leeds", { premium: true, businessInfo: { name: "Pipes Ltd", phone: "0113 496 0000" }, handoffs: trail, callModel: async () => H.sampleModel("trades") });
  assert.equal(r.variants.length, 2);
  const rev = trail.rows.filter((x) => x.from_bot === "review");
  assert.equal(rev.length, 2);
  for (const x of rev) {
    assert.equal(x.payload.scored, true);
    assert.ok(Number.isFinite(x.payload.score));
  }
  const pul = trail.rows.find((x) => x.from_bot === "pulse");
  assert.ok("contrast" in pul.payload && Array.isArray(pul.payload.failures));
});

test("handoffs never carry page HTML or the owner's contact details", async () => {
  const trail = fresh();
  await run("a bakery in Leeds", { premium: false, businessInfo: H.INFO, handoffs: trail });
  const all = JSON.stringify(trail.rows);
  assert.ok(!/<h1|<html|<section/i.test(all), "no HTML");
  for (const secret of [H.INFO.phone, H.INFO.email, H.INFO.address].filter(Boolean)) assert.ok(!all.includes(secret), secret);
  assert.ok(all.length < 8000, "small");
});

test("Show 2 more reuses the saved words: no second model call", async () => {
  const trail = fresh();
  let calls = 0;
  const r = await run("a bakery in Leeds", { premium: false, businessInfo: H.INFO, handoffs: trail, directionIds: L.MORE_IDS, siteCopy: H.sampleModel("cafe"), callModel: async () => { calls++; return H.sampleModel("cafe"); } });
  assert.equal(calls, 0);
  assert.equal(r.variants.length, 2);
  assert.equal(trail.rows.find((x) => x.from_bot === "research").payload.reusedWords, true);
});

test("if the words cannot be written the build fails as before, and the chain stops at research", async () => {
  const trail = fresh();
  await assert.rejects(run("a bakery", { premium: false, handoffs: trail, callModel: async () => { throw new Error("model down"); } }), /model down/);
  assert.deepEqual(pairs(trail.rows), ["planner>industry", "industry>designer", "designer>research"]);
});

test("one model call per build: the copywriter's, nothing else", async () => {
  let calls = 0;
  await run("a hair salon in Manchester", { premium: true, businessInfo: H.INFO, handoffs: fresh(), callModel: async () => { calls++; return H.sampleModel("salon"); } });
  assert.equal(calls, 1);
});

test("the handoff log: clean payloads, saved with the project id, and a database problem never breaks anything", async () => {
  const saved = [];
  const db = { from: (t) => ({ insert: (row) => { saved.push([t, row]); return Promise.resolve({ error: null }); } }) };
  const log = HO.createHandoffLog({ projectId: 42, db });
  const row = log.handoff("planner", "industry", { ok: 1, html: "<p>x</p>", phone: "07", email: "a@b.c", nested: { address: "x", keep: "y" }, big: "z".repeat(500) });
  assert.equal(row.project_id, "42");
  assert.deepEqual(Object.keys(row.payload).sort(), ["big", "nested", "ok"]);
  assert.equal(row.payload.big.length, 200);
  assert.deepEqual(row.payload.nested, { keep: "y" });
  await log.flush();
  assert.equal(saved.length, 1);
  assert.equal(saved[0][0], "bot_handoffs");
  assert.deepEqual(Object.keys(saved[0][1]).sort(), ["created_at", "from_bot", "payload", "project_id", "to_bot"]);

  const huge = log.handoff("builder", "pulse", Object.fromEntries(Array.from({ length: 30 }, (_, i) => ["k" + i, "v".repeat(150)])));
  assert.equal(huge.payload.note, "payload too large, dropped");

  // no project id (tests, dry runs): memory only
  const none = HO.createHandoffLog({ db });
  none.handoff("planner", "industry", {});
  await none.flush();
  assert.equal(saved.length, 2); // only the huge one from the first log

  // missing table / failing database: one warning, no throw
  const warns = [];
  const w = console.warn;
  console.warn = (...a) => warns.push(a.join(" "));
  try {
    const bad = HO.createHandoffLog({ projectId: "p", db: { from: () => ({ insert: () => Promise.resolve({ error: { message: 'relation "bot_handoffs" does not exist' } }) }) } });
    bad.handoff("planner", "industry", {});
    bad.handoff("industry", "designer", {});
    await bad.flush();
    const boom = HO.createHandoffLog({ projectId: "p", db: { from: () => { throw new Error("db gone"); } } });
    assert.doesNotThrow(() => boom.handoff("planner", "industry", {}));
  } finally {
    console.warn = w;
  }
  assert.equal(warns.filter((m) => /could not save handoffs/.test(m)).length, 2, "one warning per log, not per handoff");
  assert.equal(HO.nullHandoffs.handoff(), null);
  assert.equal(HO.forLogger({ ctx: {} }).rows.length, 0);
});

test("a build logger with a project id sends the handoffs to bot_handoffs", async () => {
  const saved = [];
  const db = { from: (t) => ({ insert: (row) => { saved.push([t, row]); return Promise.resolve({ error: null }); } }) };
  const BL = require("../lib/build-log");
  const logger = BL.createLogger({ projectId: "proj-1", userId: "u", buildId: "b", db });
  await run("a bakery in Leeds", { premium: false, businessInfo: H.INFO, logger });
  await new Promise((r) => setTimeout(r, 20));
  const handoffs = saved.filter(([t]) => t === "bot_handoffs").map(([, row]) => row);
  assert.ok(handoffs.length >= 12, `got ${handoffs.length}`);
  assert.ok(handoffs.every((h) => h.project_id === "proj-1"));
  assert.equal(handoffs[0].from_bot, "planner");
});

test("the registry knows the eight bots, and the old handoff writer uses the new columns", async () => {
  const dbPath = path.join(root, "lib", "db.js");
  const rows = [];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { supabase: { from: () => ({ insert: (r) => { rows.push(r); return Promise.resolve({ error: null }); } }) } } };
  delete require.cache[path.join(root, "bot-orchestrator.js")];
  const O = require("../bot-orchestrator");
  for (const b of HO.BOTS) assert.ok(O.getRole(b) && O.getRole(b).file, b);
  await O.recordHandoff("p9", "app-bot", "review-bot", "Generated 4 files");
  assert.deepEqual(rows[0], { project_id: "p9", from_bot: "app-bot", to_bot: "review-bot", payload: { summary: "Generated 4 files" } });
  delete require.cache[path.join(root, "bot-orchestrator.js")];
  delete require.cache[dbPath];
});

test("the migration creates bot_handoffs with row level security", () => {
  const sql = fs.readFileSync(path.join(root, "docs", "migrations", "2026-10-14_bot_handoffs.sql"), "utf8");
  for (const c of ["id bigint generated always as identity primary key", "from_bot text not null", "to_bot text not null", "project_id text", "payload jsonb", "created_at timestamptz"]) assert.ok(sql.includes(c), c);
  assert.match(sql, /alter table public\.bot_handoffs enable row level security/);
  assert.ok(!/create policy/i.test(sql), "no policies: server only");
});
