// Run: node --test test/api-client-cookie.test.js
// S3d: the page side of cookie login (public/shared/api-client.js), run in a
// fake browser: cookies always sent, one silent refresh on a 401, old stored
// tokens still used until they run out, logout asks the server.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = fs.readFileSync(path.join(__dirname, "../public/shared/api-client.js"), "utf8");

// routes: (url, init, n) -> { status, body } for each call; returns the client and what it saw.
function browser({ pathname = "/dashboard.html", cookie = "gurost_li=1", stored = {}, routes }) {
  const store = { ...stored };
  const loc = { origin: "https://gurost.onrender.com", pathname, href: "" };
  const calls = [];
  const doc = { cookie };
  const ctx = vm.createContext({
    window: { location: loc }, console, document: doc,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), removeItem: (k) => { delete store[k]; }, setItem: (k, v) => { store[k] = String(v); } },
    fetch: async (url, init = {}) => {
      calls.push({ url: url.replace(loc.origin, ""), init });
      const { status = 200, body = {} } = (await routes(url.replace(loc.origin, ""), init, calls.length, doc)) || {};
      const r = { ok: status >= 200 && status < 300, status, json: async () => body };
      r.clone = () => r;
      return r;
    }
  });
  vm.runInContext(SRC, ctx);
  return { api: ctx.window.GurostAPI, store, loc, calls, doc };
}
const expired = { status: 401, body: { code: "token_expired" } };

test("every request carries the cookies; a cookie login sends no Authorization header", async () => {
  const b = browser({ routes: () => ({ body: { plan: "pro" } }) });
  assert.deepEqual(await b.api.call("/api/me"), { plan: "pro" });
  assert.equal(b.calls[0].init.credentials, "include");
  assert.equal(b.calls[0].init.headers.Authorization, undefined);
});

test("a 401 for an expired cookie: one silent refresh, then the call goes through", async () => {
  let refreshed = false;
  const b = browser({ routes: (url) => {
    if (url === "/api/auth/refresh") { refreshed = true; return { body: { refreshed: true } }; }
    return refreshed ? { body: { ok: 1 } } : expired;
  } });
  assert.deepEqual(await b.api.call("/api/projects"), { ok: 1 });
  assert.deepEqual(b.calls.map((c) => c.url), ["/api/projects", "/api/auth/refresh", "/api/projects"]);
  assert.equal(b.loc.href, "", "nobody was sent to log in");
});

test("several calls failing together share one refresh", async () => {
  let refreshed = false;
  const b = browser({ routes: async (url) => {
    if (url === "/api/auth/refresh") { await new Promise((r) => setTimeout(r, 20)); refreshed = true; return {}; }
    return refreshed ? { body: { ok: 1 } } : expired;
  } });
  await Promise.all([b.api.call("/api/a"), b.api.call("/api/b"), b.api.call("/api/c")]);
  assert.equal(b.calls.filter((c) => c.url === "/api/auth/refresh").length, 1);
});

test("the session is over (refresh 401): local copy cleared, sent to log in; not on the login page itself", async () => {
  const routes = (url) => (url === "/api/auth/refresh" ? { status: 401, body: { code: "session_ended" } } : expired);
  const b = browser({ stored: { gurost_user_id: "u1" }, routes });
  await assert.rejects(b.api.call("/api/projects"));
  assert.equal(b.loc.href, "login.html?expired=1");
  assert.equal(b.store.gurost_user_id, undefined);
  const onLogin = browser({ pathname: "/login.html", routes });
  await assert.rejects(onLogin.api.call("/api/me"));
  assert.equal(onLogin.loc.href, "");
});

test("server unreachable during refresh: the call fails, but nobody is logged out", async () => {
  const b = browser({ stored: { gurost_user_id: "u1" }, routes: (url) => (url === "/api/auth/refresh" ? { status: 503 } : expired) });
  await assert.rejects(b.api.call("/api/projects"));
  assert.equal(b.loc.href, "");
  assert.equal(b.store.gurost_user_id, "u1");
});

test("old stored token still works until it expires; then it is dropped and the cookie is used", async () => {
  const b = browser({ stored: { gurost_jwt: "old", gurost_user_id: "u1" }, routes: (url, init) => (init.headers.Authorization ? expired : { body: { ok: 1 } }) });
  assert.deepEqual(await b.api.call("/api/projects"), { ok: 1 });
  assert.equal(b.calls[0].init.headers.Authorization, "Bearer old");
  assert.equal(b.store.gurost_jwt, undefined);
  assert.equal(b.calls[1].init.headers.Authorization, undefined);
});

test("old stored token expired and no cookie login: sent to log in, as before", async () => {
  const b = browser({ cookie: "", stored: { gurost_jwt: "old" }, routes: () => expired });
  await assert.rejects(b.api.call("/api/projects"));
  assert.equal(b.loc.href, "login.html?expired=1");
  assert.equal(b.calls.length, 1, "no refresh without a login cookie");
});

test("API-key users are never redirected or refreshed", async () => {
  const b = browser({ cookie: "", stored: { gurost_api_key: "k" }, routes: () => ({ status: 401, body: { code: "invalid_api_key" } }) });
  await assert.rejects(b.api.call("/api/projects"));
  assert.equal(b.loc.href, "");
  assert.equal(b.calls[0].init.headers["x-api-key"], "k");
});

test("isLoggedIn: the readable gurost_li flag, or an older stored login", () => {
  assert.equal(browser({ routes: () => ({}) }).api.isLoggedIn(), true);
  assert.equal(browser({ cookie: "other=1", routes: () => ({}) }).api.isLoggedIn(), false);
  assert.equal(browser({ cookie: "", stored: { gurost_jwt: "x" }, routes: () => ({}) }).api.isLoggedIn(), true);
  assert.equal(browser({ cookie: "gurost_li=10", routes: () => ({}) }).api.isLoggedIn(), false, "exact value only");
});

test("logout asks the server to end the session and clears everything stored", async () => {
  const b = browser({ stored: { gurost_jwt: "x", gurost_api_key: "k", gurost_user_id: "u1" }, routes: () => ({ body: { loggedOut: true } }) });
  await b.api.logout();
  assert.equal(b.calls[0].url, "/api/auth/logout");
  assert.equal(b.calls[0].init.method, "POST");
  assert.equal(b.calls[0].init.credentials, "include");
  assert.deepEqual(b.store, {});
});

test("logout still clears the browser when offline", async () => {
  const b = browser({ stored: { gurost_user_id: "u1" }, routes: () => { throw new Error("offline"); } });
  await b.api.logout();
  assert.deepEqual(b.store, {});
});

test("sign out everywhere calls logout-all", async () => {
  const b = browser({ routes: () => ({ body: { loggedOutEverywhere: true } }) });
  await b.api.logoutEverywhere();
  assert.equal(b.calls[0].url, "/api/auth/logout-all");
  assert.equal(b.calls[0].init.method, "POST");
});

test("socket login: no token with a cookie login; an old stored one is still sent", () => {
  assert.deepEqual(JSON.parse(browser({ routes: () => ({}) }).api.socketAuthMessage()), { type: "auth" });
  assert.deepEqual(JSON.parse(browser({ stored: { gurost_jwt: "t" }, routes: () => ({}) }).api.socketAuthMessage()), { type: "auth", token: "t" });
});

test("socket closed 4401: refresh once and reconnect; a second 4401 soon after goes to log in", async () => {
  const b = browser({ routes: () => ({ body: {} }) });
  assert.equal(await b.api.socketLoginExpired(), true);
  assert.equal(b.calls[0].url, "/api/auth/refresh");
  assert.equal(await b.api.socketLoginExpired(), false, "refreshing didn't help: no loop");
  assert.equal(b.loc.href, "login.html?expired=1");
});

test("socket closed 4401 with no cookie login: straight to log in", async () => {
  const b = browser({ cookie: "", stored: { gurost_jwt: "old" }, routes: () => ({}) });
  assert.equal(await b.api.socketLoginExpired(), false);
  assert.equal(b.store.gurost_jwt, undefined);
  assert.equal(b.loc.href, "login.html?expired=1");
});

test("GurostAPI.fetch (audio, CSV): same refresh-and-retry, returns the Response", async () => {
  let refreshed = false;
  const b = browser({ routes: (url) => {
    if (url === "/api/auth/refresh") { refreshed = true; return {}; }
    return refreshed ? { status: 200, body: { audio: 1 } } : expired;
  } });
  const res = await b.api.fetch("/api/voice", { method: "POST", headers: { "Content-Type": "audio/webm" }, body: "bytes" });
  assert.equal(res.status, 200);
  const last = b.calls.at(-1);
  assert.equal(last.init.headers["Content-Type"], "audio/webm");
  assert.equal(last.init.body, "bytes");
});
