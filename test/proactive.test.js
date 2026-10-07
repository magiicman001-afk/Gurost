// Run: node --test test/proactive.test.js
// Proactive suggestions: the rules, the 2-a-day hard limit, "not now", learning, pause, and ownership.
const test = require("node:test");
const assert = require("node:assert/strict");
const p = require("../lib/proactive");

const DAY = 86400000;
const NOW = Date.parse("2026-10-07T12:00:00Z"); // a Wednesday
const ev = (daysAgo, over = {}) => ({ created_at: new Date(NOW - daysAgo * DAY).toISOString(), event: "chat", tool_used: "chat", bot_type: "sales", ok: true, ...over });
const drafts = (n) => Array.from({ length: n }, (_, i) => ev(i * 0.5, { event: "tool_call", tool_used: "email_draft" }));
const types = (list) => list.map((c) => c.type);

test("repetition: 5+ email drafts in a week suggests a template; 4 does not", () => {
  assert.deepEqual(types(p.analyze(drafts(5), { now: NOW })), ["repeat_drafts"]);
  assert.deepEqual(types(p.analyze(drafts(4), { now: NOW })), []);
  const c = p.analyze(drafts(6), { now: NOW })[0];
  assert.match(c.content, /6 emails/);
  assert.equal(c.action.kind, "prefill");
  assert.equal(c.action.bot, "sales");
});

test("timing: the same weekday and time of day over two weeks is noticed, in the user's time zone", () => {
  // Sundays ~19:30 London (18:30 UTC in October BST): 2026-10-04 and 2026-09-27, two each.
  const sun = (iso) => ({ created_at: iso, event: "chat", tool_used: "chat", bot_type: "finance", ok: true });
  const events = [sun("2026-10-04T18:30:00Z"), sun("2026-10-04T18:45:00Z"), sun("2026-09-27T18:30:00Z"), sun("2026-09-27T18:50:00Z"), ev(1), ev(2)];
  const out = p.analyze(events, { now: NOW, tz: "Europe/London" });
  assert.deepEqual(types(out), ["usual_time"]);
  assert.match(out[0].content, /Finance assistant on Sunday evenings/);
  assert.deepEqual(types(p.analyze(events.slice(0, 5), { now: NOW, tz: "Europe/London" })), [], "fewer than 6 chats is not a pattern");
});

test("welcome back: quiet 5+ days after being active", () => {
  const events = [ev(6), ev(7), ev(8), ev(9, { bot_type: "hr" })];
  const out = p.analyze(events, { now: NOW });
  assert.deepEqual(types(out), ["welcome_back"]);
  assert.match(out[0].content, /6 days/);
  assert.deepEqual(types(p.analyze([ev(1), ev(7), ev(8), ev(9)], { now: NOW })), [], "recent activity: no welcome back");
  assert.deepEqual(types(p.analyze([ev(6)], { now: NOW })), [], "never really active: no welcome back");
});

test("no usage means no suggestions, and no suggestion text carries message content", () => {
  assert.deepEqual(p.analyze([], { now: NOW }), []);
  p.analyze(drafts(8), { now: NOW }).forEach((c) => assert.ok(!/password|secret/i.test(c.content)));
});

const cand = (type) => ({ type, content: type, action: {} });
const row = (type, action, daysAgo, over = {}) => ({ suggestion_type: type, action, shown_at: new Date(NOW - daysAgo * DAY).toISOString(), decided_at: new Date(NOW - daysAgo * DAY).toISOString(), ...over });

test("choose: a kind is not repeated within a week", () => {
  assert.equal(p.choose([cand("a")], [row("a", "accepted", 3)], { now: NOW }).length, 0);
  assert.equal(p.choose([cand("a")], [row("a", "accepted", 8)], { now: NOW }).length, 1);
});

test("choose: 'Not now' is respected for 7 days", () => {
  const snoozed = row("a", "snoozed", 8, { snooze_until: new Date(NOW + DAY).toISOString() });
  assert.equal(p.choose([cand("a")], [snoozed], { now: NOW }).length, 0);
  assert.equal(p.choose([cand("a")], [{ ...snoozed, snooze_until: new Date(NOW - DAY).toISOString() }], { now: NOW }).length, 1);
});

test("choose: two declines in a row stop that kind for 30 days, then it may return", () => {
  const two = [row("a", "declined", 9), row("a", "declined", 20)];
  assert.equal(p.choose([cand("a")], two, { now: NOW }).length, 0);
  assert.equal(p.choose([cand("a")], [row("a", "declined", 40), row("a", "declined", 50)], { now: NOW }).length, 1);
  assert.equal(p.choose([cand("a")], [row("a", "declined", 9), row("a", "accepted", 20)], { now: NOW }).length, 1, "one decline then an accept is fine");
});

test("choose: a kind the user keeps accepting goes first, and the slot limit holds", () => {
  const hist = [row("b", "accepted", 20), row("b", "accepted", 30), row("a", "declined", 15)];
  assert.deepEqual(p.choose([cand("a"), cand("b"), cand("c")], hist, { now: NOW, slots: 2 }).map((c) => c.type), ["b", "c"]);
  assert.equal(p.choose([cand("a"), cand("b"), cand("c")], [], { now: NOW, slots: 0 }).length, 0);
});

// A tiny stand-in for the table, including the unique (user, day, slot) key.
function fakeDb(seed = []) {
  const rows = seed.map((r) => ({ ...r }));
  return {
    rows,
    from: () => ({
      insert: (r) => { const dup = rows.some((x) => x.user_id === r.user_id && x.day_key === r.day_key && x.slot === r.slot); if (!dup) rows.push({ ...r }); return Promise.resolve({ error: dup ? { message: "duplicate key" } : null }); },
      select: () => { const f = []; const b = { eq(k, v) { f.push([k, v]); return b; }, then(res) { return Promise.resolve({ data: rows.filter((r) => f.every(([k, v]) => r[k] === v)).map((r) => ({ ...r })), error: null }).then(res); } }; return b; },
      update: (patch) => { const f = []; let sel = false; const b = { eq(k, v) { f.push([k, v]); return b; }, select() { sel = true; return b; }, then(res) { const hit = rows.filter((r) => f.every(([k, v]) => r[k] === v)); hit.forEach((r) => Object.assign(r, patch)); return Promise.resolve({ data: sel ? hit.map((r) => ({ id: r.id })) : null, error: null }).then(res); } }; return b; }
    })
  };
}
const busy = () => drafts(6).concat([ev(7), ev(8), ev(9)]);
const deps = (events, paused = false) => ({ now: NOW, tz: "UTC", isPaused: async () => paused, auditList: async () => events });

test("suggestionsFor creates, returns, and never exceeds 2 a day", async () => {
  const db = fakeDb();
  // enough usage for repeat_drafts AND usual_time-like patterns is not needed: seed a second kind by history-free welcome_back
  const events = drafts(6).concat([ev(8), ev(9), ev(10)]);
  const first = await p.suggestionsFor(db, "u1", deps(events));
  assert.ok(first.length >= 1 && first.length <= 2);
  await p.suggestionsFor(db, "u1", deps(events));
  await p.suggestionsFor(db, "u1", deps(events));
  assert.ok(db.rows.filter((r) => r.user_id === "u1" && r.day_key === "2026-10-07").length <= 2, "at most 2 rows today");
});

test("the database key is the hard limit: a clashing insert is simply refused, not shown twice", async () => {
  const db = fakeDb();
  await Promise.all([p.suggestionsFor(db, "u1", deps(busy())), p.suggestionsFor(db, "u1", deps(busy()))]);
  assert.ok(db.rows.length <= 2);
  const slots = db.rows.map((r) => r.slot); assert.equal(new Set(slots).size, slots.length);
});

test("memory paused: nothing is analysed or shown; an error also shows nothing", async () => {
  const db = fakeDb();
  assert.deepEqual(await p.suggestionsFor(db, "u1", deps(busy(), true)), []);
  assert.equal(db.rows.length, 0);
  const quiet = console.error; console.error = () => {};
  const out = await p.suggestionsFor(db, "u1", { ...deps(busy()), isPaused: async () => { throw new Error("db down"); } });
  console.error = quiet;
  assert.deepEqual(out, []);
});

test("unanswered suggestions that run out become 'ignored' and stop showing", async () => {
  const old = { id: "x1", user_id: "u1", suggestion_type: "welcome_back", content: "c", payload: {}, day_key: "2026-10-01", slot: 1, action: "pending", shown_at: new Date(NOW - 5 * DAY).toISOString(), expires_at: new Date(NOW - 2 * DAY).toISOString() };
  const db = fakeDb([old]);
  const out = await p.suggestionsFor(db, "u1", deps([]));
  assert.deepEqual(out, []);
  assert.equal(db.rows.find((r) => r.id === "x1").action, "ignored");
});

test("respond: only the owner, only once, and 'Not now' sets a 7-day pause", async () => {
  const db = fakeDb();
  await p.suggestionsFor(db, "u1", deps(busy()));
  const id = db.rows[0].id;
  assert.equal((await p.respond(db, "u2", id, "accepted", { now: NOW })).status, 404, "another user cannot answer it");
  assert.equal((await p.respond(db, "u1", id, "nonsense", { now: NOW })).status, 400);
  assert.equal((await p.respond(db, "u1", id, "snoozed", { now: NOW })).status, 200);
  assert.equal(db.rows[0].action, "snoozed");
  assert.equal(Date.parse(db.rows[0].snooze_until) - NOW, p.SNOOZE_MS);
  assert.equal((await p.respond(db, "u1", id, "accepted", { now: NOW })).status, 404, "already answered");
});

test("acceptance is tracked: an accepted kind is recorded and not offered again for a week", async () => {
  const db = fakeDb();
  const shown = await p.suggestionsFor(db, "u1", deps(drafts(6)));
  assert.equal(shown[0].type, "repeat_drafts");
  await p.respond(db, "u1", shown[0].id, "accepted", { now: NOW });
  assert.equal(db.rows[0].action, "accepted");
  const next = p.choose(p.analyze(drafts(6), { now: NOW + DAY }), db.rows, { now: NOW + DAY });
  assert.equal(next.length, 0);
});

test("hard limit: with today's 2 slots already used, nothing new is created even with plenty to suggest", async () => {
  const used = (slot) => ({ id: "s" + slot, user_id: "u1", suggestion_type: "other" + slot, content: "c", payload: {}, day_key: "2026-10-07", slot, action: "declined", shown_at: new Date(NOW - 1000).toISOString(), expires_at: new Date(NOW + DAY).toISOString() });
  const db = fakeDb([used(1), used(2)]);
  const out = await p.suggestionsFor(db, "u1", deps(busy()));
  assert.deepEqual(out, []);
  assert.equal(db.rows.length, 2);
});

test("hard limit: with one slot used today, only one new suggestion is created", async () => {
  const one = { id: "s1", user_id: "u1", suggestion_type: "other", content: "c", payload: {}, day_key: "2026-10-07", slot: 1, action: "declined", shown_at: new Date(NOW - 1000).toISOString(), expires_at: new Date(NOW + DAY).toISOString() };
  const db = fakeDb([one]);
  // drafts (repeat) plus a Sunday-evening habit (timing) would be two candidates
  const sun = (iso) => ({ created_at: iso, event: "chat", tool_used: "chat", bot_type: "finance", ok: true });
  const events = drafts(6).concat([sun("2026-10-04T18:30:00Z"), sun("2026-10-04T18:45:00Z"), sun("2026-09-27T18:30:00Z"), sun("2026-09-27T18:50:00Z"), ev(1), ev(2)]);
  assert.deepEqual(types(p.analyze(events, { now: NOW, tz: "UTC" })).sort(), ["repeat_drafts", "usual_time"], "two kinds are on offer");
  await p.suggestionsFor(db, "u1", deps(events));
  assert.equal(db.rows.filter((r) => r.day_key === "2026-10-07").length, 2, "one used + one new = 2, never 3");
});
