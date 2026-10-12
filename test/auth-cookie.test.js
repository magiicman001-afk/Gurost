// Run: node --test test/auth-cookie.test.js
// S3c: requireAuth accepts the gurost_at cookie, checks the Origin of cookie
// changes (CSRF), and never counts an expired login as an attack.
process.env.JWT_SECRET = "cookie-test-secret";
process.env.OPENROUTER_API_KEY ||= "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const security = require("../security");
const auth = require("../auth");
const { createSessions, COOKIE } = require("../lib/user-sessions");

const ORIGIN = "https://gurost.onrender.com";
const SID = crypto.randomUUID();
const rows = new Map([[SID, { id: SID, user_id: "u1", revoked: false, expires_at: new Date(Date.now() + 86400000).toISOString() }]]);
auth.useSessions(createSessions({
  store: { get: async (id) => rows.get(id) || null, profileFor: async () => ({ plan: "pro", email: "owner@example.com" }) },
  allowed: () => new Set([ORIGIN]),
  log: { warn() {} }
}));
const violations = [];
security.trackViolation = async (ip, type) => { violations.push(type); };
security.auditLog = async () => {};

const at = (extra = {}) => jwt.sign({ sub: "u1", sid: SID, typ: "session", ...extra }, process.env.JWT_SECRET);
async function run(method, headers) {
  const out = {};
  const req = { method, headers: { host: "gurost.onrender.com", ...headers }, ip: "1.1.1.1", path: "/projects", secure: true };
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await auth.requireAuth(req, res, () => { out.next = true; out.user = req.user; });
  return out;
}

test("the access cookie logs in, with plan and email from the database", async () => {
  const r = await run("GET", { cookie: `${COOKIE.AT}=${at()}` });
  assert.equal(r.next, true);
  assert.equal(r.user.id, "u1");
  assert.equal(r.user.plan, "pro");
  assert.equal(r.user.email, "owner@example.com");
});

test("a change by cookie from another site is refused (CSRF); from Gurost's page it goes through", async () => {
  const evil = await run("POST", { cookie: `${COOKIE.AT}=${at()}`, origin: "https://evil.example" });
  assert.equal(evil.status, 403);
  assert.equal(evil.body.code, "bad_origin");
  const none = await run("DELETE", { cookie: `${COOKIE.AT}=${at()}` });
  assert.equal(none.status, 403, "no Origin or Referer at all");
  const ok = await run("POST", { cookie: `${COOKIE.AT}=${at()}`, origin: ORIGIN });
  assert.equal(ok.next, true);
});

test("Bearer and API-key requests are not origin-checked (browsers never send them on their own)", async () => {
  const legacy = jwt.sign({ sub: "u1", plan: "free" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  const r = await run("POST", { authorization: `Bearer ${legacy}`, origin: "https://evil.example" });
  assert.equal(r.next, true, "an old Bearer token still works until it expires");
});

test("an expired cookie: 401 token_expired (the page refreshes) and no violation counted", async () => {
  violations.length = 0;
  const expired = at({ exp: Math.floor(Date.now() / 1000) - 5 });
  const r = await run("GET", { cookie: `${COOKIE.AT}=${expired}` });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, "token_expired");
  assert.deepEqual(violations, []);
});

test("signed-in browser whose access cookie has gone: 401, not counted; a stranger with nothing is counted", async () => {
  violations.length = 0;
  const lapsed = await run("GET", { cookie: `${COOKIE.LI}=1` });
  assert.equal(lapsed.status, 401);
  assert.deepEqual(violations, []);
  await run("GET", {});
  assert.deepEqual(violations, ["auth_failed"]);
});

test("a revoked session's cookie is refused", async () => {
  const sid = crypto.randomUUID();
  rows.set(sid, { id: sid, user_id: "u1", revoked: true, expires_at: new Date(Date.now() + 86400000).toISOString() });
  const r = await run("GET", { cookie: `${COOKIE.AT}=${jwt.sign({ sub: "u1", sid, typ: "session" }, process.env.JWT_SECRET)}` });
  assert.equal(r.status, 401);
});

test("the WebSocket login accepts the cookie when the message has no token", async () => {
  const user = await auth.authenticateToken({ cookie: `${COOKIE.AT}=${at()}` });
  assert.equal(user.id, "u1");
  assert.equal(await auth.authenticateToken({ cookie: `${COOKIE.LI}=1` }), null);
});
