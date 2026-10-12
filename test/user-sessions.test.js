// Run: node --test test/user-sessions.test.js
// S3c cookie login: the real session logic over an in-memory user_sessions table.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { createSessions, sessionRoutes, sha256, COOKIE, CACHE_MS, GRACE_MS, SESSION_MS } = require("../lib/user-sessions");

const SECRET = "test-secret";
const ORIGIN = "https://gurost.onrender.com";

function memoryStore() {
  const rows = new Map();
  const users = { u1: { plan: "free", email: "a@example.com" }, u2: { plan: "pro", email: "b@example.com" } };
  return {
    rows, users, fail: false,
    async insert(row) { if (this.fail) throw new Error('relation "user_sessions" does not exist'); const id = crypto.randomUUID(); rows.set(id, { id, token_version: 1, revoked: false, ...row }); return { id }; },
    async get(id) { return rows.get(id) || null; },
    async rotate(id, oldHash, version, newHash) { const r = rows.get(id); if (!r || r.revoked || r.refresh_token !== oldHash) return false; r.refresh_token = newHash; r.token_version = version + 1; return true; },
    async revoke(id) { const r = rows.get(id); if (r) r.revoked = true; },
    async revokeAll(userId, except) { for (const r of rows.values()) if (r.user_id === userId && r.id !== except) r.revoked = true; },
    async profileFor(userId) { return { ...(users[userId] || { plan: "free", email: null }) }; }
  };
}

function setup() {
  const store = memoryStore();
  let clock = Date.now();
  const sessions = createSessions({ store, secret: () => SECRET, now: () => clock, allowed: () => new Set([ORIGIN]), log: { warn() {} } });
  return { store, sessions, tick: (ms) => { clock += ms; } };
}

// A browser: keeps the cookies the server sets and sends them back.
function browser() {
  const jar = {};
  return {
    jar,
    req(extra = {}) {
      return { method: "POST", secure: true, headers: { host: "gurost.onrender.com", origin: ORIGIN, cookie: Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("; "), ...extra } };
    },
    res() {
      const out = { statusCode: 200, body: null, set: {} };
      out.cookie = (name, value, opts) => { jar[name] = value; out.set[name] = opts; };
      out.clearCookie = (name) => { delete jar[name]; out.set[name] = "cleared"; };
      out.status = (c) => { out.statusCode = c; return out; };
      out.json = (b) => { out.body = b; return out; };
      return out;
    }
  };
}

test("sign-in sets the three cookies: two httpOnly, the flag readable, all Lax + Secure", async () => {
  const { sessions } = setup();
  const b = browser();
  const res = b.res();
  assert.equal(await sessions.start(b.req(), res, { userId: "u1" }), true);
  assert.deepEqual(Object.keys(res.set).sort(), [COOKIE.AT, COOKIE.LI, COOKIE.RT].sort());
  assert.equal(res.set[COOKIE.AT].httpOnly, true);
  assert.equal(res.set[COOKIE.AT].maxAge, 15 * 60 * 1000);
  assert.equal(res.set[COOKIE.RT].httpOnly, true);
  assert.equal(res.set[COOKIE.RT].path, "/api/auth", "the refresh cookie only travels to /api/auth");
  assert.ok(Math.abs(res.set[COOKIE.RT].maxAge - SESSION_MS) < 1000);
  assert.equal(res.set[COOKIE.LI].httpOnly, false);
  assert.equal(b.jar[COOKIE.LI], "1");
  for (const o of Object.values(res.set)) { assert.equal(o.sameSite, "lax"); assert.equal(o.secure, true); }
});

test("only a hash of the refresh cookie is stored; the access token carries no plan", async () => {
  const { sessions, store } = setup();
  const b = browser();
  await sessions.start(b.req(), b.res(), { userId: "u1" });
  const [sid, random] = b.jar[COOKIE.RT].split(".");
  const row = store.rows.get(sid);
  assert.equal(row.refresh_token, sha256(random));
  assert.ok(!JSON.stringify(row).includes(random));
  const payload = jwt.decode(b.jar[COOKIE.AT]);
  assert.equal(payload.sub, "u1");
  assert.equal(payload.sid, sid);
  assert.equal(payload.plan, undefined);
});

test("the cookie logs in; plan and email come from the database, cached for 60s", async () => {
  const { sessions, store, tick } = setup();
  const b = browser();
  await sessions.start(b.req(), b.res(), { userId: "u1" });
  let r = await sessions.userFromCookie(b.req());
  assert.equal(r.user.id, "u1");
  assert.equal(r.user.plan, "free");
  assert.equal(r.user.email, "a@example.com");
  store.users.u1.plan = "pro"; // upgraded
  assert.equal((await sessions.userFromCookie(b.req())).user.plan, "free", "cached");
  tick(CACHE_MS + 1);
  assert.equal((await sessions.userFromCookie(b.req())).user.plan, "pro", "seen within a minute, no new login needed");
});

test("an expired or forged access cookie says so (the page refreshes on token_expired)", async () => {
  const { sessions } = setup();
  const sid = crypto.randomUUID();
  const expired = jwt.sign({ sub: "u1", sid, typ: "session", exp: Math.floor(Date.now() / 1000) - 10 }, SECRET);
  assert.deepEqual(await sessions.userFromCookie({ headers: { cookie: `${COOKIE.AT}=${expired}` } }), { error: "token_expired" });
  const forged = jwt.sign({ sub: "u1", sid, typ: "session" }, "other-secret");
  assert.deepEqual(await sessions.userFromCookie({ headers: { cookie: `${COOKIE.AT}=${forged}` } }), { error: "token_invalid" });
  const legacy = jwt.sign({ sub: "u1", plan: "ultimate" }, SECRET); // an old Bearer token pasted into the cookie
  assert.deepEqual(await sessions.userFromCookie({ headers: { cookie: `${COOKIE.AT}=${legacy}` } }), { error: "token_invalid" });
  assert.equal(await sessions.userFromCookie({ headers: {} }), null);
});

test("refresh swaps the refresh cookie and issues a new access cookie", async () => {
  const { sessions, store } = setup();
  const b = browser();
  await sessions.start(b.req(), b.res(), { userId: "u1" });
  const before = b.jar[COOKIE.RT];
  const r = await sessions.refresh(b.req(), b.res());
  assert.deepEqual(r, { userId: "u1" });
  assert.notEqual(b.jar[COOKIE.RT], before);
  assert.equal(store.rows.get(before.split(".")[0]).token_version, 2);
  assert.equal((await sessions.userFromCookie(b.req())).user.id, "u1");
});

test("theft: an old refresh cookie used again (after the grace window) ends the whole session", async () => {
  const { sessions, store, tick } = setup();
  const victim = browser();
  await sessions.start(victim.req(), victim.res(), { userId: "u1" });
  const stolen = victim.jar[COOKIE.RT];
  await sessions.refresh(victim.req(), victim.res()); // the real owner refreshes
  tick(GRACE_MS + 1);
  const thief = browser();
  thief.jar[COOKIE.RT] = stolen;
  assert.deepEqual(await sessions.refresh(thief.req(), thief.res()), { error: "reused" });
  assert.equal(store.rows.get(stolen.split(".")[0]).revoked, true);
  assert.deepEqual(await sessions.refresh(victim.req(), victim.res()), { error: "session_ended" }, "the owner must log in again too");
  assert.deepEqual(await sessions.userFromCookie(victim.req()), { error: "session_ended" });
});

test("two tabs refreshing with the same cookie at once both get the same new one (not flagged as theft)", async () => {
  const { sessions, store } = setup();
  const b = browser();
  await sessions.start(b.req(), b.res(), { userId: "u1" });
  const reqA = b.req(), reqB = b.req();
  const resA = b.res(), resB = b.res();
  const [a, c] = await Promise.all([sessions.refresh(reqA, resA), sessions.refresh(reqB, resB)]);
  assert.deepEqual(a, { userId: "u1" });
  assert.deepEqual(c, { userId: "u1" });
  const sid = b.jar[COOKIE.RT].split(".")[0];
  assert.equal(store.rows.get(sid).revoked, false);
  assert.equal(store.rows.get(sid).token_version, 2, "rotated once");
});

test("logout revokes this session only; sign out everywhere ends them all", async () => {
  const { sessions, store } = setup();
  const phone = browser(), laptop = browser(), other = browser();
  await sessions.start(phone.req(), phone.res(), { userId: "u1" });
  await sessions.start(laptop.req(), laptop.res(), { userId: "u1" });
  await sessions.start(other.req(), other.res(), { userId: "u2" });
  const phoneReq = phone.req();
  await sessions.logout(phoneReq, phone.res());
  assert.equal(phone.jar[COOKIE.AT], undefined, "cookies cleared");
  assert.deepEqual(await sessions.userFromCookie(phoneReq), { error: "session_ended" });
  assert.equal((await sessions.userFromCookie(laptop.req())).user.id, "u1", "the laptop is still signed in");
  await sessions.userFromCookie(other.req());
  await sessions.revokeAll("u1");
  assert.deepEqual(await sessions.userFromCookie(laptop.req()), { error: "session_ended" });
  assert.equal((await sessions.userFromCookie(other.req())).user.id, "u2", "another user is untouched");
  assert.equal([...store.rows.values()].filter((r) => r.user_id === "u1" && !r.revoked).length, 0);
});

test("password change: every other session ends, this browser stays signed in", async () => {
  const { sessions } = setup();
  const here = browser(), elsewhere = browser();
  await sessions.start(here.req(), here.res(), { userId: "u1" });
  await sessions.start(elsewhere.req(), elsewhere.res(), { userId: "u1" });
  await sessions.revokeAll("u1", { keep: sessions.currentSessionId(here.req()) });
  assert.equal((await sessions.userFromCookie(here.req())).user.id, "u1");
  assert.deepEqual(await sessions.refresh(elsewhere.req(), elsewhere.res()), { error: "session_ended" });
});

test("no user_sessions table yet: sign-in skips the cookies instead of failing", async () => {
  const { sessions, store } = setup();
  store.fail = true;
  const b = browser();
  const res = b.res();
  assert.equal(await sessions.start(b.req(), res, { userId: "u1" }), false);
  assert.deepEqual(res.set, {});
});

test("an expired session (30 days) cannot be refreshed", async () => {
  const { sessions, tick } = setup();
  const b = browser();
  await sessions.start(b.req(), b.res(), { userId: "u1" });
  tick(SESSION_MS + 1);
  assert.deepEqual(await sessions.refresh(b.req(), b.res()), { error: "session_ended" });
});

test("CSRF: cookie requests that change things must come from Gurost's own origin", () => {
  const { sessions } = setup();
  const req = (headers) => ({ method: "POST", secure: true, headers: { host: "gurost.onrender.com", ...headers } });
  assert.equal(sessions.originAllowed(req({ origin: ORIGIN })), true);
  assert.equal(sessions.originAllowed(req({ origin: "https://evil.example" })), false);
  assert.equal(sessions.originAllowed(req({ origin: "null" })), false);
  assert.equal(sessions.originAllowed(req({})), false, "no Origin and no Referer: refused");
  assert.equal(sessions.originAllowed(req({ referer: `${ORIGIN}/dashboard.html` })), true);
  assert.equal(sessions.originAllowed({ method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000" } }), true, "the page's own origin");
  assert.equal(sessions.needsOriginCheck({ method: "GET" }), false);
  assert.equal(sessions.needsOriginCheck({ method: "DELETE" }), true);
});

test("plain-http localhost gets non-Secure cookies (local runs); everything else is Secure", async () => {
  const { sessions } = setup();
  const b = browser();
  const res = b.res();
  await sessions.start({ headers: { host: "localhost:3000" } }, res, { userId: "u1" });
  assert.equal(res.set[COOKIE.AT].secure, false);
  const res2 = b.res();
  await sessions.start({ headers: { host: "gurost.onrender.com", "x-forwarded-proto": "https" } }, res2, { userId: "u1" });
  assert.equal(res2.set[COOKIE.AT].secure, true);
});

test("routes: refresh/logout refuse another site's request; a failed refresh clears the cookies", async () => {
  const { sessions } = setup();
  const routes = sessionRoutes(sessions);
  const b = browser();
  await sessions.start(b.req(), b.res(), { userId: "u1" });
  const evil = b.res();
  await routes.refresh(b.req({ origin: "https://evil.example" }), evil);
  assert.equal(evil.statusCode, 403);
  const evilOut = b.res();
  await routes.logout(b.req({ origin: "https://evil.example" }), evilOut);
  assert.equal(evilOut.statusCode, 403);
  assert.ok(b.jar[COOKIE.RT], "still signed in");
  b.jar[COOKIE.RT] = `${crypto.randomUUID()}.nope`;
  const bad = b.res();
  await routes.refresh(b.req(), bad);
  assert.equal(bad.statusCode, 401);
  assert.equal(bad.set[COOKIE.LI], "cleared");
});

// The real Set-Cookie header Express sends.
let express;
try { express = require("express"); } catch { /* sandbox without node_modules */ }
test("real Set-Cookie headers: HttpOnly, Secure, SameSite=Lax, refresh cookie scoped to /api/auth", { skip: !express && "express not installed here" }, async () => {
  const { sessions } = setup();
  const app = express();
  app.post("/login", async (req, res) => { await sessions.start(req, res, { userId: "u1" }); res.json({ ok: true }); });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/login`, { method: "POST", headers: { "x-forwarded-proto": "https" } });
    const cookies = res.headers.getSetCookie();
    const at = cookies.find((c) => c.startsWith(`${COOKIE.AT}=`));
    const rt = cookies.find((c) => c.startsWith(`${COOKIE.RT}=`));
    const li = cookies.find((c) => c.startsWith(`${COOKIE.LI}=`));
    assert.match(at, /HttpOnly/); assert.match(at, /Secure/); assert.match(at, /SameSite=Lax/); assert.match(at, /Max-Age=900/);
    assert.match(rt, /HttpOnly/); assert.match(rt, /Path=\/api\/auth/);
    assert.doesNotMatch(li, /HttpOnly/);
  } finally { server.close(); }
});
