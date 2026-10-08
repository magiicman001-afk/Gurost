// Run: node --test test/auth-expiry.test.js
// An expired login says so (and the pages send the person to log in) instead of "credentials required".
delete process.env.JWT_SECRET; // no signing secret here: every bearer token is refused, so the reason is what is tested
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const auth = require("../auth");

const token = (payload) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;
const run = async (headers) => {
  const out = {};
  const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
  await auth.requireAuth({ headers, ip: "1.1.1.1", path: "/me" }, res, () => { out.next = true; });
  return out;
};

test("tokenState: a past exp is expired, anything else unreadable or unexpired is invalid", () => {
  assert.equal(auth.tokenState(token({ exp: Math.floor(Date.now() / 1000) - 60 })), "expired");
  assert.equal(auth.tokenState(token({ exp: Math.floor(Date.now() / 1000) + 3600 })), "invalid");
  assert.equal(auth.tokenState("garbage"), "invalid");
  assert.equal(auth.tokenState(""), "invalid");
});

test("an expired bearer token gets a plain message and the token_expired code", async () => {
  const r = await run({ authorization: "Bearer " + token({ exp: 1 }) });
  assert.equal(r.status, 401);
  assert.equal(r.body.code, "token_expired");
  assert.match(r.body.error, /session has expired/i);
  assert.ok(!r.next);
});

test("an unreadable bearer token gets token_invalid; no header keeps the original message", async () => {
  const bad = await run({ authorization: "Bearer nonsense" });
  assert.equal(bad.body.code, "token_invalid");
  const none = await run({});
  assert.equal(none.status, 401);
  assert.equal(none.body.code, "no_credentials");
  assert.match(none.body.error, /Valid API key \(x-api-key header\) or JWT/);
});

// ---- the page helper ----
function client(pathname, jwt) {
  const store = { gurost_jwt: jwt, gurost_user_id: "u1" };
  const loc = { origin: "http://x", pathname, href: "" };
  const ctx = vm.createContext({
    window: { location: loc }, console,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), removeItem: (k) => { delete store[k]; }, setItem: (k, v) => { store[k] = v; } },
    fetch: async () => ({ ok: false, status: 401, json: async () => ({ error: "x", code: "token_expired" }) })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/shared/api-client.js"), "utf8"), ctx);
  return { api: ctx.window.GurostAPI, store, loc };
}

test("on an app page an expired login is cleared and the person goes to the login page", async () => {
  const { api, store, loc } = client("/dashboard.html", "old");
  await assert.rejects(api.call("/api/me"));
  assert.equal(store.gurost_jwt, undefined);
  assert.equal(loc.href, "login.html?expired=1");
});

test("on the login page itself nothing redirects (no loop)", async () => {
  const { api, loc } = client("/login.html", "old");
  await assert.rejects(api.call("/api/me"));
  assert.equal(loc.href, "");
});
