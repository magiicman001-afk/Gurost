// Run: node --test test/bot-calls.test.js
// Business Assistant 2.0, phase 3: bot video calls. The server rules (plan, cap, metering, rooms) with stand-ins for
// LiveKit and the database; the browser run (375px, a fake LiveKit) is in the commit message.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const L = require("../lib/livekit");
const C = require("../public/shared/bot-video-call.js");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

// A tiny in-memory stand-in for the one table the service uses.
function fakeDb(initial = [], { failSelect = false } = {}) {
  const rows = initial.slice(); let n = 0;
  const q = (f) => {
    const c = { eqs: [], gte: null, isNull: null };
    const api = {
      select() { return api; },
      eq(k, v) { c.eqs.push([k, v]); return api; },
      gte(k, v) { c.gte = [k, v]; return api; },
      is(k) { c.isNull = k; return api; },
      match() { return rows.filter((r) => c.eqs.every(([k, v]) => String(r[k]) === String(v)) && (!c.gte || r[c.gte[0]] >= c.gte[1]) && (!c.isNull || r[c.isNull] == null)); },
      then(res) { return Promise.resolve(f(api, c)).then(res); },
      maybeSingle() { const m = api.match(); return Promise.resolve({ data: m[0] || null, error: null }); },
      single() { return Promise.resolve({ data: rows[rows.length - 1], error: null }); }
    };
    return api;
  };
  return {
    rows,
    from() {
      return {
        select: () => q((api) => (failSelect ? { data: null, error: { message: "relation does not exist" } } : { data: api.match(), error: null })),
        insert: (row) => { const r = { id: "00000000-0000-4000-8000-00000000000" + ++n, ended_at: null, seconds: null, started_at: "2026-10-15T10:00:00.000Z", ...row }; rows.push(r); return { select: () => ({ single: () => Promise.resolve({ data: r, error: null }) }) }; },
        update: (patch) => q((api) => { api.match().forEach((r) => Object.assign(r, patch)); return { error: null }; })
      };
    }
  };
}
const fakeLk = () => { const log = []; return { log, createRoom: async (r) => log.push(["create", r]), deleteRoom: async (r) => log.push(["delete", r]), createJoinToken: async (r, id) => { log.push(["token", r, id]); return { token: "jwt", url: "wss://x.livekit.cloud" }; } }; };
const ENV = { LIVEKIT_URL: "wss://x.livekit.cloud", LIVEKIT_API_KEY: "k", LIVEKIT_SECRET: "s" };
const svc = (db, o = {}) => L.createCallService({ db, client: fakeLk(), env: ENV, now: () => Date.parse("2026-10-15T10:00:00Z"), random: () => "abcd1234abcd1234", ...o });

test("settings accept LIVEKIT_SECRET as well as LIVEKIT_API_SECRET, and the cap defaults to 120 minutes", () => {
  assert.equal(L.settings(ENV).configured, true);
  assert.equal(L.settings({ ...ENV, LIVEKIT_SECRET: undefined }).configured, false);
  assert.equal(L.settings({ ...ENV, LIVEKIT_SECRET: undefined, LIVEKIT_API_SECRET: "s2" }).configured, true);
  assert.equal(L.settings(ENV).monthlyMinutes, 120);
  assert.equal(L.settings({ ...ENV, VIDEO_MINUTES_PER_MONTH: "45" }).monthlyMinutes, 45);
  assert.equal(L.settings({ ...ENV, VIDEO_MINUTES_PER_MONTH: "abc" }).monthlyMinutes, 120);
});

test("free and starter plans get text only; paid plans can call", async () => {
  for (const plan of ["free", "starter", "pro", undefined]) {
    const s = await svc(fakeDb()).status({ userId: "u1", plan });
    assert.equal(s.available, false, String(plan)); assert.equal(s.reason, "plan");
    assert.match(s.message, /Text chat with the team stays free/);
  }
  for (const plan of ["unlimited", "ultimate"]) assert.equal((await svc(fakeDb()).status({ userId: "u1", plan })).available, true);
  const start = await svc(fakeDb()).start({ userId: "u1", plan: "free", botId: "planner" });
  assert.equal(start.status, 402);
});

test("not configured, or the calls table missing, means calls stay off (an unmetered call is never allowed)", async () => {
  const off = L.createCallService({ db: fakeDb(), client: fakeLk(), env: {} });
  assert.equal((await off.status({ userId: "u1", plan: "unlimited" })).reason, "not-configured");
  const noTable = svc(fakeDb([], { failSelect: true }));
  assert.equal((await noTable.status({ userId: "u1", plan: "unlimited" })).reason, "metering");
  assert.equal((await noTable.start({ userId: "u1", plan: "unlimited", botId: "planner" })).status, 503);
});

test("a call creates an unguessable room and a token for this person only, and stores no words", async () => {
  const db = fakeDb(), s = svc(db);
  const out = await s.start({ userId: "u1", plan: "unlimited", botId: "designer", recordingConsent: true });
  assert.equal(out.status, 200);
  assert.equal(out.body.room, "call-designer-abcd1234abcd1234");
  assert.equal(out.body.token, "jwt"); assert.equal(out.body.url, "wss://x.livekit.cloud");
  assert.equal(out.body.minutesLeft, 120); assert.equal(out.body.maxCallMinutes, 30);
  assert.equal(db.rows.length, 1);
  assert.deepEqual(Object.keys(db.rows[0]).sort(), ["bot_id", "ended_at", "id", "recording_consent", "room", "seconds", "started_at", "user_id"]);
  assert.equal(db.rows[0].recording_consent, true);
  assert.equal((await svc(fakeDb()).start({ userId: "u1", plan: "unlimited", botId: "elon" })).status, 404);
});

test("only one call at a time; a call left open past 30 minutes is closed first", async () => {
  const db = fakeDb(), s = svc(db);
  assert.equal((await s.start({ userId: "u1", plan: "unlimited", botId: "planner" })).status, 200);
  const again = await s.start({ userId: "u1", plan: "unlimited", botId: "planner" });
  assert.equal(again.status, 409); assert.equal(again.body.reason, "open-call");
  db.rows[0].started_at = "2026-10-15T09:00:00.000Z"; // an hour ago: stale
  assert.equal((await s.start({ userId: "u1", plan: "unlimited", botId: "planner" })).status, 200);
  assert.equal(db.rows[0].seconds, 1800);
});

test("the length is worked out by the server from the start time, capped at 30 minutes, and the room is closed", async () => {
  const db = fakeDb(), lk = fakeLk(), s = L.createCallService({ db, client: lk, env: ENV, now: () => Date.parse("2026-10-15T10:00:00Z") + 0, random: () => "r" });
  const started = await s.start({ userId: "u1", plan: "unlimited", botId: "planner" });
  db.rows[0].started_at = "2026-10-15T09:52:30.000Z"; // 7.5 minutes before "now"
  const done = await s.end({ userId: "u1", callId: started.body.callId });
  assert.equal(done.status, 200); assert.equal(done.body.seconds, 450);
  assert.ok(lk.log.some((e) => e[0] === "delete"));
  assert.equal((await s.end({ userId: "u1", callId: started.body.callId })).body.alreadyEnded, true);
  assert.equal((await s.end({ userId: "someone-else", callId: started.body.callId })).status, 404, "another person cannot end my call");
});

test("the monthly cap counts finished and still-open calls, then refuses with a plain message", async () => {
  const now = () => Date.parse("2026-10-15T10:00:00Z");
  const rows = [{ id: "a", user_id: "u1", bot_id: "x", room: "r", started_at: "2026-10-03T10:00:00Z", ended_at: "2026-10-03T11:00:00Z", seconds: 100 * 60 }, { id: "b", user_id: "u1", bot_id: "x", room: "r", started_at: "2026-09-30T10:00:00Z", ended_at: "2026-09-30T11:00:00Z", seconds: 500 * 60 }];
  let s = await svc(fakeDb(rows.slice())).status({ userId: "u1", plan: "unlimited" });
  assert.equal(s.minutesLeft, 20, "last month's minutes do not count");
  rows.push({ id: "c", user_id: "u1", bot_id: "x", room: "r", started_at: "2026-10-15T09:55:00Z", ended_at: null, seconds: null }); // open: 5 minutes so far
  s = await svc(fakeDb(rows.slice())).status({ userId: "u1", plan: "unlimited" });
  assert.equal(s.minutesLeft, 15);
  rows[0].seconds = 120 * 60;
  const out = await svc(fakeDb(rows.slice())).start({ userId: "u1", plan: "unlimited", botId: "planner" });
  assert.equal(out.status, 429); assert.equal(out.body.reason, "limit"); assert.match(out.body.error, /reset on the 1st/);
  void now;
});

test("LiveKit errors never reach the person", async () => {
  const lk = fakeLk(); lk.createRoom = async () => { throw new Error("401 invalid api key AKIA-secret"); };
  const out = await L.createCallService({ db: fakeDb(), client: lk, env: ENV }).start({ userId: "u1", plan: "unlimited", botId: "planner" });
  assert.equal(out.status, 502); assert.doesNotMatch(JSON.stringify(out.body), /401|AKIA|invalid api key/);
});

test("browser helpers: speech, finishing a turn, clock, allowed seconds, file name, recorder type", () => {
  assert.equal(C.isSpeech(0.05), true); assert.equal(C.isSpeech(0.005), false); assert.equal(C.isSpeech(undefined), false);
  assert.equal(C.turnFinished(200, 2000), false, "a cough is not a turn");
  assert.equal(C.turnFinished(800, 500), false); assert.equal(C.turnFinished(800, 1000), true);
  assert.equal(C.clock(75), "1:15"); assert.equal(C.clock(-3), "0:00");
  assert.equal(C.allowedSeconds(120, 30), 1800); assert.equal(C.allowedSeconds(4, 30), 240); assert.equal(C.allowedSeconds(0, 30), 0);
  assert.equal(C.fileNameFor("Pulse Bot", new Date("2026-10-15T09:05:00Z")), "gurost-call-pulse-bot-2026-10-15-09-05.webm");
  assert.equal(C.recorderMime({ isTypeSupported: (t) => t === "audio/webm" }), "audio/webm");
  assert.equal(C.recorderMime(null), "");
});

test("the call script and routes keep the promises: consent first, recording on this device only, no raw HTML, LiveKit version pinned", () => {
  const js = read("public/shared/bot-video-call.js"), srv = read("server.js"), css = read("public/shared/bot-widgets.css");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML/);
  assert.match(js, /livekit-client@2\.5\.7/, "an exact version, never latest");
  assert.match(js, /cb\.checked/, "the recording box is a checkbox the person ticks");
  assert.doesNotMatch(js, /cb\.checked = true|cb\.checked=true|checked = true/, "recording is never pre-ticked");
  assert.match(js, /saved on this device only/i);
  assert.doesNotMatch(js, /\/api\/[^"']*record/, "no recording is ever uploaded");
  assert.match(js, /a\.download = fileNameFor/);
  assert.match(srv, /app\.post\("\/api\/bots\/:bot\/call\/start", botCallLimiter/);
  assert.match(srv, /app\.post\("\/api\/bots\/call\/:id\/end"/);
  assert.match(srv, /app\.get\("\/api\/bots\/call\/status"/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.gbc-ring/);
});

test("calls are part of the export, deletion and retention lists", () => {
  assert.match(read("lib/user-data.js"), /table: "bot_calls"/);
  assert.match(read("lib/retention.js"), /table: "bot_calls"/);
  assert.match(read("docs/migrations/2026-10-15_bot_calls.sql"), /enable row level security/);
  const h = L; assert.match(read("lib/security-headers.js"), /\.\.\.livekitConnectSources\(\)/);
  assert.deepEqual(h.livekitConnectSources({ LIVEKIT_URL: "wss://gurost.livekit.cloud" }), ["https://gurost.livekit.cloud", "wss://gurost.livekit.cloud"]);
  assert.deepEqual(h.livekitConnectSources({ LIVEKIT_URL: "javascript:alert(1)" }), []);
  assert.deepEqual(h.livekitConnectSources({}), []);
});
