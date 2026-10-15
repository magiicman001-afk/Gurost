// Run: node --test test/proactive-engine.test.js
// Business Assistant 2.0, phase 4: bots speak up. Rules, limits, dedupe, evidence, fail-closed, and the wiring.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const E = require("../lib/proactive-engine");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const NOW = Date.parse("2026-10-15T12:00:00Z");
const base = { projectId: "proj-12345678", now: NOW, built: true, picked: true, published: false, businessInfo: { phone: "01234", email: "a@b.co", address: "1 High St" }, reviews: [], logs: [] };
const byBot = (c, b) => c.find((x) => x.bot === b);

test("Pulse speaks up about a build problem from the last day, with the evidence, and never says all is well", () => {
  const c = E.evaluate({ ...base, logs: [{ bot: "builder", result: "fail", decision: "build the Bold design", reason: "the page had no headline", created_at: "2026-10-15T11:30:00Z" }, { bot: "builder", result: "success", created_at: "2026-10-15T11:40:00Z" }] });
  const p = byBot(c, "pulse");
  assert.equal(p.severity, "alert");
  assert.match(p.text, /^I caught something\./);
  assert.match(p.text, /Builder hit a problem while building: the page had no headline/);
  assert.match(p.why, /Build log: Builder step failed at 2026-10-15 11:30 UTC/);
  assert.doesNotMatch(p.text, /all good|all clear/i);
  assert.equal(byBot(E.evaluate({ ...base, logs: [{ bot: "builder", result: "fail", created_at: "2026-10-13T11:30:00Z" }] }), "pulse"), undefined, "an old failure is not raised");
  assert.equal(byBot(E.evaluate({ ...base, logs: [{ bot: "builder", result: "escalate", created_at: "2026-10-15T11:30:00Z" }] }), "pulse"), undefined, "a hand-over to the next bot is normal, not a problem");
});

test("Review speaks up about a low-scoring design and quotes the score and the reason", () => {
  const c = E.evaluate({ ...base, reviews: [{ id: "bold", label: "Bold", score: 71, passed: false, reasons: ["text is hard to read on the hero"] }, { id: "min", label: "Minimal", score: 90, passed: true, reasons: [] }] });
  const r = byBot(c, "review");
  assert.match(r.text, /^Not good enough\. Fix it\. The Bold design scored 71\/100: text is hard to read on the hero/);
  assert.match(r.why, /Quality score 71\/100/);
  assert.equal(byBot(E.evaluate({ ...base, reviews: [{ id: "min", label: "Minimal", score: 90, passed: true, reasons: [] }] }), "review"), undefined);
});

test("Launch says what is missing before going live, and cheers only when nothing is missing", () => {
  const m = byBot(E.evaluate({ ...base, businessInfo: { name: "x", email: "a@b.co" } }), "launch");
  assert.match(m.text, /Add your phone number and address/);
  assert.match(m.why, /no phone number and address/);
  const ready = byBot(E.evaluate(base), "launch");
  assert.match(ready.text, /Let's go live\./);
  assert.equal(byBot(E.evaluate({ ...base, published: true }), "launch"), undefined, "nothing to remind once live");
  assert.equal(byBot(E.evaluate({ ...base, published: null }), "launch"), undefined, "unknown is not guessed");
});

test("Planner gives one next step: pick a design before launch, share the link after", () => {
  assert.match(byBot(E.evaluate({ ...base, picked: false }), "planner").text, /pick the design you like best/);
  assert.match(byBot(E.evaluate({ ...base, published: true }), "planner").text, /Your site is live\. Next: share the link/);
  assert.equal(byBot(E.evaluate({ ...base, built: false, picked: false }), "planner"), undefined, "nothing built yet: nothing to suggest");
  assert.equal(byBot(E.evaluate(base), "planner"), undefined, "ready to launch is Launch's line, not Planner's");
});

// A tiny stand-in for the two tables.
function fakeDb({ failTable = false } = {}) {
  const t = { bot_nudges: [], bot_nudge_settings: [] };
  let n = 0;
  const q = (name, run) => { const f = { eqs: [], gtes: [] }; const api = {
    select() { return api; }, eq(k, v) { f.eqs.push([k, v]); return api; }, gte(k, v) { f.gtes.push([k, v]); return api; }, order() { return api; }, limit() { return api; },
    rows() { return t[name].filter((r) => f.eqs.every(([k, v]) => String(r[k]) === String(v)) && f.gtes.every(([k, v]) => r[k] >= v)); },
    then(res, rej) { return Promise.resolve(run(api, f)).then(res, rej); }, maybeSingle() { return Promise.resolve({ data: api.rows()[0] || null, error: null }); } }; return api; };
  return { t, from(name) { return {
    select: () => q(name, (api) => (failTable ? { data: null, error: { message: "relation does not exist" } } : { data: api.rows(), error: null })),
    update: (patch) => q(name, (api) => { api.rows().forEach((r) => Object.assign(r, patch)); return { error: null }; }),
    upsert: (row, opts) => { const key = (opts.onConflict || "").split(","); const dup = key.length && t[name].some((r) => key.every((k) => r[k] === row[k])); const added = []; if (!dup) { const r = { id: "n" + ++n + "-abcdefgh", ...row }; if (name === "bot_nudges") r.created_at = row.created_at || "2026-10-15T12:00:00.000Z"; t[name].push(r); added.push(r); } else if (name === "bot_nudge_settings") Object.assign(t[name].find((r) => r.user_id === row.user_id), row); return { select: () => Promise.resolve({ data: added, error: null }), then: (res) => Promise.resolve({ error: null }).then(res) }; }
  }; } };
}
const eng = (db) => E.createEngine({ db, now: () => NOW });
const busy = { ...base, picked: false, logs: [{ bot: "builder", result: "fail", reason: "x", created_at: "2026-10-15T11:30:00Z" }], reviews: [{ id: "a", label: "Bold", score: 60, passed: false, reasons: ["r"] }] };

test("normal mode: at most 3 a day and one per bot, alerts first; the same thing is never added twice", async () => {
  const db = fakeDb(), e = eng(db);
  const r1 = await e.scan({ userId: "u1", snapshot: busy });
  assert.equal(r1.added, 3);
  assert.deepEqual(db.t.bot_nudges.map((x) => x.bot_id).sort(), ["pulse", "review", "planner"].sort());
  assert.equal(db.t.bot_nudges[0].bot_id, "pulse", "the alert goes first");
  assert.equal((await e.scan({ userId: "u1", snapshot: busy })).added, 0, "scanning again adds nothing");
  assert.equal((await e.scan({ userId: "u1", snapshot: { ...busy, published: false, picked: true } })).added, 0, "the daily cap of 3 is used up");
});

test("quiet mode allows 1 a day, off allows none, and a bad mode is refused", async () => {
  const db = fakeDb(), e = eng(db);
  assert.equal((await e.setMode("u1", "quiet")).status, 200);
  assert.equal((await e.scan({ userId: "u1", snapshot: busy })).added, 1);
  assert.equal(db.t.bot_nudges[0].bot_id, "pulse");
  const db2 = fakeDb(), e2 = eng(db2);
  await e2.setMode("u1", "off");
  assert.equal((await e2.scan({ userId: "u1", snapshot: busy })).added, 0);
  assert.equal((await e2.setMode("u1", "loud")).status, 400);
});

test("a dismissed kind stays quiet for 7 days for that project, but not for another project", async () => {
  const db = fakeDb(), e = eng(db);
  await e.scan({ userId: "u1", snapshot: { ...base, picked: false } });
  const id = db.t.bot_nudges[0].id;
  assert.equal((await e.mark("u1", id, "dismissed")).status, 200);
  db.t.bot_nudges[0].created_at = "2026-10-12T12:00:00.000Z"; // three days ago, so the daily cap is free again
  const later = E.createEngine({ db, now: () => NOW + 3 * E.DAY });
  assert.equal((await later.scan({ userId: "u1", snapshot: { ...base, picked: false } })).added, 0, "still quiet");
  assert.equal((await later.scan({ userId: "u1", snapshot: { ...base, picked: false, projectId: "other-proj-99" } })).added, 1, "a different project is fine");
  assert.equal((await e.mark("u1", id, "boom")).status, 400);
});

test("pending shows only this person's new, unexpired nudges; marking seen removes it; others cannot touch mine", async () => {
  const db = fakeDb(), e = eng(db);
  await e.scan({ userId: "u1", snapshot: { ...base, picked: false } });
  let p = await e.pending("u1");
  assert.equal(p.length, 1); assert.equal(p[0].bot, "planner"); assert.ok(p[0].why);
  assert.deepEqual(await e.pending("u2"), []);
  await e.mark("u2", p[0].id, "seen");
  assert.equal((await e.pending("u1")).length, 1, "another user cannot mark mine");
  await e.mark("u1", p[0].id, "seen");
  assert.equal((await e.pending("u1")).length, 0);
  const old = E.createEngine({ db, now: () => NOW + 4 * E.DAY });
  db.t.bot_nudges[0].status = "new";
  assert.equal((await old.pending("u1")).length, 0, "expired after 3 days");
});

test("fails closed: a missing table means nobody is nudged and nothing throws", async () => {
  const e = eng(fakeDb({ failTable: true }));
  const r = await e.scan({ userId: "u1", snapshot: busy });
  assert.equal(r.added, 0); assert.equal(r.notReady, true);
  assert.deepEqual(await e.pending("u1"), []);
  await assert.rejects(() => e.adminLog(), /not ready/);
});

test("no model is called: the engine never imports an AI client", () => {
  assert.doesNotMatch(read("lib/proactive-engine.js"), /claude-client|openrouter|callClaude/);
});

test("wiring: routes, per-user limiter, admin log tab, export/retention lists, widget polling and controls", () => {
  const srv = read("server.js"), w = read("public/shared/bot-widgets.js"), admin = read("public/admin-dashboard.html");
  assert.match(srv, /app\.get\("\/api\/bots\/nudges", nudgeLimiter/);
  assert.match(srv, /app\.put\("\/api\/bots\/nudges\/settings", nudgeLimiter, security\.rejectUnknownFields\(\["mode"\]\)/);
  assert.match(srv, /\/api\/bots\/nudges\/:id\/:action\(seen\|dismissed\)/);
  assert.match(srv, /app\.get\("\/api\/admin\/proactive-log", requireAdminAuth, adminAccess\.needs\("bots"\)/);
  assert.match(srv, /proj\.userId === req\.user\.id/, "only the owner's project is scanned");
  assert.match(admin, /id: 'proactive'/);
  assert.doesNotMatch(admin.slice(admin.indexOf("async function renderProactive"), admin.indexOf("async function renderAudit")), /innerHTML/);
  assert.match(read("lib/user-data.js"), /table: "bot_nudges"/);
  assert.match(read("lib/retention.js"), /table: "bot_nudges"/);
  assert.match(w, /setInterval\(pollNudges, 60000\)/);
  assert.match(w, /Speak up unasked/);
  assert.match(w, /Because: /);
  assert.match(read("docs/migrations/2026-10-15_bot_nudges.sql"), /enable row level security/);
});
