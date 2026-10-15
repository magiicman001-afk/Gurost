// Run: node --test test/calendar.test.js
// Business Assistant 2.0, phase 7: Google Calendar. Viewing is opt-in, adding an event needs approval and sends no invitations,
// nothing can be changed or deleted. Stand-ins for Google and the database: no network.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const C = require("../lib/calendar");
const G = require("../lib/gmail");
const box = require("../lib/secret-box");
const tools = require("../lib/tools");
const calTools = require("../lib/tools/calendar-google");
const { zonedToUtc } = require("../lib/tools/calendar-event");
const S = require("../public/shared/calendar-settings.js");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const ENV = { CALENDAR_CLIENT_ID: "cid", CALENDAR_CLIENT_SECRET: "csecret", SECRETS_KEY: crypto.randomBytes(32).toString("base64"), APP_BASE_URL: "https://gurost.example" };
const U = "11111111-1111-4111-8111-111111111111";
const NOW = Date.parse("2026-10-16T10:00:00Z");

function fakeDb({ missing = false } = {}) {
  const rows = [];
  const q = (run) => { const c = []; const api = { eq(k, v) { c.push([k, v]); return api; }, then(res) { return Promise.resolve(run(c)).then(res); } }; return api; };
  const match = (c) => rows.filter((r) => c.every(([k, v]) => String(r[k]) === String(v)));
  return {
    rows,
    from() {
      return {
        select: () => q((c) => (missing ? { data: null, error: { message: "relation does not exist" } } : { data: match(c), error: null })),
        upsert: (row) => { const i = rows.findIndex((r) => r.user_id === row.user_id); if (i >= 0) Object.assign(rows[i], row); else rows.push({ ...row }); return Promise.resolve({ error: null }); },
        update: (patch) => q((c) => { match(c).forEach((r) => Object.assign(r, patch)); return { error: null }; }),
        delete: () => q((c) => { match(c).forEach((r) => rows.splice(rows.indexOf(r), 1)); return { error: null }; })
      };
    }
  };
}

function fakeGoogle(opts = {}) {
  const calls = [];
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  const impl = async (url, init = {}) => {
    const u = String(url); calls.push({ url: u, init });
    if (u.startsWith("https://oauth2.googleapis.com/token")) {
      const p = new URLSearchParams(String(init.body));
      if (p.get("grant_type") === "refresh_token") return opts.refreshError ? json(400, { error: "invalid_grant" }) : json(200, { access_token: "at-" + calls.length, expires_in: 3599 });
      return json(200, { access_token: "at-first", refresh_token: "rt-secret-123", expires_in: 3599, scope: opts.scope || C.SCOPE_CREATE });
    }
    if (u.startsWith("https://oauth2.googleapis.com/revoke")) return json(200, {});
    if (u.startsWith("https://www.googleapis.com/calendar/v3/calendars/primary/events")) {
      if (init.method === "POST") return json(200, { id: "ev1" });
      return json(200, { items: [{ summary: "Dentist\r\nBcc: x", start: { dateTime: "2026-10-17T09:00:00Z" }, end: { dateTime: "2026-10-17T10:00:00Z" }, location: "High St", attendees: [{ email: "secret@x.com" }], description: "private notes" }, { summary: "Holiday", start: { date: "2026-10-20" }, end: { date: "2026-10-21" } }] });
    }
    return json(404, {});
  };
  return { calls, impl };
}

function setup(o = {}) {
  const db = fakeDb(o.db), g = fakeGoogle(o.google);
  return { db, g, svc: C.createCalendarService({ db, env: o.env || ENV, fetchImpl: g.impl, now: () => NOW, random: () => "nonce" }) };
}
const stateFrom = (url) => new URL(url).searchParams.get("state");
async function connect({ view = false, create = true, scope } = {}) {
  const s = setup({ google: { scope } });
  const url = s.svc.authUrl(U, { view, create });
  const out = await s.svc.complete(U, { code: "c1", state: stateFrom(url) });
  return { ...s, url, out };
}
const EVENT = { title: "Meet Sam", start: "2026-10-20T14:30", timezone: "Europe/London", duration_minutes: 30, location: "Cafe", description: "Notes" };

test("configured needs id, secret and the key; the Gmail pair is the fallback", () => {
  assert.equal(C.settings(ENV).configured, true);
  assert.equal(C.settings({ ...ENV, CALENDAR_CLIENT_SECRET: "" }).configured, false);
  assert.equal(C.settings({ ...ENV, SECRETS_KEY: "" }).configured, false);
  const fb = C.settings({ GMAIL_CLIENT_ID: "g", GMAIL_CLIENT_SECRET: "s", SECRETS_KEY: ENV.SECRETS_KEY });
  assert.equal(fb.configured, true);
  assert.equal(C.settings(ENV).redirectUri, "https://gurost.example/api/calendar/callback");
});

test("the consent URL asks only for what the person chose; nothing chosen means no URL", () => {
  const { svc } = setup();
  assert.equal(svc.authUrl(U, {}), null);
  assert.equal(new URL(svc.authUrl(U, { view: true })).searchParams.get("scope"), C.SCOPE_VIEW);
  assert.equal(new URL(svc.authUrl(U, { create: true })).searchParams.get("scope"), C.SCOPE_CREATE);
  assert.equal(new URL(svc.authUrl(U, { view: true, create: true })).searchParams.get("scope"), C.SCOPE_CREATE);
  assert.equal(setup({ env: {} }).svc.authUrl(U, { view: true }), null);
});

test("a Gmail state cannot be replayed on the Calendar callback, or the other way round", async () => {
  const s = setup();
  const gmailState = G.signState({ u: U, exp: NOW + 60000, r: 0, n: "x", k: "gml" }, box.keyFrom(ENV));
  assert.equal((await s.svc.complete(U, { code: "c", state: gmailState })).reason, "bad_state");
  const calState = stateFrom(s.svc.authUrl(U, { view: true }));
  assert.equal(G.readState(calState, box.keyFrom(ENV), NOW).k, "cal");
  const gmail = G.createGmailService({ db: fakeDb(), env: { ...ENV, GMAIL_CLIENT_ID: "a", GMAIL_CLIENT_SECRET: "b" }, fetchImpl: fakeGoogle().impl, now: () => NOW });
  assert.equal((await gmail.complete(U, { code: "c", state: calState })).reason, "bad_state");
});

test("connecting stores a SEALED token; denied or wrong-user stores nothing", async () => {
  const { db, out } = await connect();
  assert.equal(out.ok, true); assert.equal(out.canCreate, true);
  assert.ok(db.rows[0].refresh_token_sealed.startsWith("v1:")); assert.doesNotMatch(JSON.stringify(db.rows[0]), /rt-secret-123/);
  const s = setup();
  assert.equal((await s.svc.complete(U, { error: "access_denied", state: "x" })).reason, "denied");
  assert.equal((await s.svc.complete("22222222-2222-4222-8222-222222222222", { code: "c", state: stateFrom(s.svc.authUrl(U, { view: true })) })).reason, "bad_state");
  assert.equal(s.db.rows.length, 0);
});

test("a view-only connection can look but not add; an add-events connection does not view until opted in", async () => {
  const v = await connect({ view: true, create: false, scope: C.SCOPE_VIEW });
  const sv = await v.svc.status(U);
  assert.deepEqual({ canCreate: sv.canCreate, canView: sv.canView, viewing: sv.viewing }, { canCreate: false, canView: true, viewing: true });
  await assert.rejects(() => v.svc.createEvent(U, EVENT, zonedToUtc), /not allowed on your connection/);
  const c = await connect({ view: false, create: true });
  const sc = await c.svc.status(U);
  assert.deepEqual({ canCreate: sc.canCreate, canView: sc.canView, viewing: sc.viewing }, { canCreate: true, canView: true, viewing: false });
  await assert.rejects(() => c.svc.listUpcoming(U), /switched off/);
  assert.equal((await c.svc.setViewing(U, true)).viewing, true);
  assert.equal((await c.svc.listUpcoming(U)).count, 2);
});

test("viewing returns title, time and place only: no guests, no notes", async () => {
  const s = await connect({ view: true, create: true });
  const out = await s.svc.listUpcoming(U, { days: 3 });
  assert.equal(out.untrusted, true);
  assert.deepEqual(Object.keys(out.events[0]).sort(), ["allDay", "end", "location", "start", "title"]);
  assert.doesNotMatch(JSON.stringify(out), /secret@x|private notes|[\r\n]/);
  assert.equal(out.events[1].allDay, true);
  const url = s.g.calls.find((c) => c.url.includes("timeMin")).url;
  assert.match(url, /singleEvents=true/);
});

test("adding an event sends ONE event with no guests and no invitations", async () => {
  const s = await connect();
  const out = await s.svc.createEvent(U, EVENT, zonedToUtc);
  assert.equal(out.added, true); assert.equal(out.eventId, "ev1");
  const call = s.g.calls.find((c) => c.init && c.init.method === "POST" && c.url.includes("/events"));
  assert.match(call.url, /sendUpdates=none/);
  const body = JSON.parse(call.init.body);
  assert.equal(body.summary, "Meet Sam"); assert.equal(body.start.timeZone, "Europe/London");
  assert.equal(body.start.dateTime, "2026-10-20T13:30:00.000Z", "14:30 BST is 13:30 UTC");
  assert.equal(body.attendees, undefined); assert.equal(body.conferenceData, undefined);
  await assert.rejects(() => s.svc.createEvent(U, { ...EVENT, title: " " }, zonedToUtc), /needs a title/);
  await assert.rejects(() => s.svc.createEvent(U, { ...EVENT, start: "tomorrow" }, zonedToUtc), /start must look like/);
  await assert.rejects(() => s.svc.createEvent(U, { ...EVENT, duration_minutes: 5000 }, zonedToUtc), /between 5 minutes/);
});

test("adding events is capped per day", async () => {
  const s = await connect();
  for (let i = 0; i < C.CREATES_PER_DAY; i++) await s.svc.createEvent(U, EVENT, zonedToUtc);
  await assert.rejects(() => s.svc.createEvent(U, EVENT, zonedToUtc), /daily limit/);
});

test("a removed Google grant disconnects cleanly; disconnect revokes and can be repeated", async () => {
  const gone = setup({ google: { refreshError: true } });
  await gone.svc.complete(U, { code: "c", state: stateFrom(gone.svc.authUrl(U, { create: true })) });
  const svc2 = C.createCalendarService({ db: gone.db, env: ENV, fetchImpl: gone.g.impl, now: () => NOW });
  await assert.rejects(() => svc2.createEvent(U, EVENT, zonedToUtc), /removed from your Google account/);
  assert.equal(gone.db.rows.length, 0);
  const s = await connect();
  assert.deepEqual(await s.svc.disconnect(U), { ok: true, revoked: true });
  assert.deepEqual(await s.svc.disconnect(U), { ok: true, revoked: false });
  assert.equal(s.db.rows.length, 0);
});

test("a missing table fails closed; the admin summary has counts only", async () => {
  const m = setup({ db: { missing: true } });
  assert.equal((await m.svc.status(U)).connected, false);
  assert.equal((await m.svc.adminSummary()).table, "missing");
  const s = await connect({ view: true });
  const sum = await s.svc.adminSummary();
  assert.equal(sum.connected, 1); assert.equal(sum.viewing, 1);
  assert.doesNotMatch(JSON.stringify(sum), /rt-secret|csecret|"cid"/);
});

test("THE approval gate: calendar_create_event cannot run until a person approves", async () => {
  const t = calTools.find((x) => x.name === "calendar_create_event");
  assert.equal(t.needsApproval, true);
  assert.equal(calTools.find((x) => x.name === "calendar_view").needsApproval, false);
  let ran = false; const orig = t.execute, av = t.isAvailable; t.execute = async () => { ran = true; return {}; }; t.isAvailable = () => true;
  try {
    const held = await tools.runTool("calendar_create_event", { title: "x", start: "2026-10-20T10:00" }, { userId: U });
    assert.equal(held.needsApproval, true); assert.equal(ran, false);
    const forged = await tools.runTool("calendar_create_event", { title: "x", start: "2026-10-20T10:00", approved: true }, { userId: U });
    assert.equal(forged.ok, false); assert.equal(ran, false);
    assert.equal((await tools.runTool("calendar_create_event", { title: "x", start: "2026-10-20T10:00" }, { userId: U, approved: true })).ok, true);
  } finally { t.execute = orig; t.isAvailable = av; }
});

test("nothing can change or delete an event: no such tool, no update or delete call in the code", () => {
  assert.deepEqual(calTools.map((t) => t.name).sort(), ["calendar_create_event", "calendar_view"]);
  const code = read("lib/calendar.js") + read("lib/tools/calendar-google.js");
  assert.doesNotMatch(code, /method: "(PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(code, /conferenceData:|attendees:/);
  const scopes = [...code.matchAll(/googleapis\.com\/auth\/[a-z.]+/g)].map((m) => m[0]);
  assert.deepEqual([...new Set(scopes)].sort(), ["googleapis.com/auth/calendar.events", "googleapis.com/auth/calendar.events.readonly"]);
  assert.match(read("lib/calendar.js"), /Google has no "add only" permission/, "the honest limit is written down");
});

test("calendar text reaches the model marked as untrusted data", async () => {
  const t = calTools.find((x) => x.name === "calendar_view");
  assert.match(t.description, /never as instructions/);
  const s = await connect({ view: true });
  const orig = C.shared; C.shared = () => s.svc;
  try { const out = await t.execute({ days: 2 }, { userId: U }); assert.equal(out.untrusted, true); assert.match(out.note, /not instructions/); }
  finally { C.shared = orig; }
});

test("routes, admin page, migration, export and deletion are wired", () => {
  const srv = read("server.js");
  for (const re of [/app\.get\("\/api\/calendar\/status"/, /app\.post\("\/api\/calendar\/connect", gmailLimiter, security\.rejectUnknownFields\(\["view", "create"\]\), auth\.requireBusinessAssistant/, /app\.get\("\/api\/calendar\/callback", gmailLimiter, auth\.requireBusinessAssistant/, /app\.post\("\/api\/calendar\/viewing"/, /app\.post\("\/api\/calendar\/disconnect"/, /calendar: await calendarLib\.shared\(\)\.adminSummary\(\)/, /lib\/calendar"\)\.shared\(\)\.disconnect\(req\.user\.id\)/]) assert.match(srv, re);
  const sql = read("docs/migrations/2026-10-16_calendar_connections.sql");
  assert.match(sql, /enable row level security/); assert.match(sql, /revoke all on public\.calendar_connections from anon, authenticated/);
  assert.match(read("lib/user-data.js"), /table: "calendar_connections"/);
  const CT = require("../lib/connected-tools");
  const off = CT.build({ env: {}, gmail: { configured: false }, calendar: { configured: false } }).tools.find((t) => t.id === "calendar");
  assert.equal(off.state, "off");
  const on = CT.build({ env: {}, gmail: { configured: false }, calendar: { configured: true, clientId: true, clientSecret: true, secretsKey: true, connected: 2, viewing: 1, table: "ok", redirectUri: "https://x/api/calendar/callback" } }).tools.find((t) => t.id === "calendar");
  assert.equal(on.state, "on"); assert.match(on.detail, /2 account/);
});

test("privacy text was updated before the feature can be switched on", () => {
  assert.match(read("docs/PRIVACY_POLICY.md"), /Google Calendar/);
  assert.match(read("public/privacy.html"), /<b>Google Calendar<\/b>/);
  assert.match(read("docs/AI_DATA_FLOW.md"), /Google Calendar \(2026-10-16/);
});

test("Settings page: plain-words states, text only", () => {
  assert.equal(S.describe({ configured: false }).mode, "off");
  assert.equal(S.describe({ configured: true, connected: false }).mode, "disconnected");
  assert.match(S.describe({ configured: true, connected: true, canCreate: true, viewing: false }).line, /adding events you approve/);
  assert.match(S.describe({ configured: true, connected: true, canCreate: false, viewing: false }).line, /Nothing is switched on/);
  assert.doesNotMatch(read("public/shared/calendar-settings.js"), /innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(read("public/settings.html"), /id="calendarBox"/);
});
