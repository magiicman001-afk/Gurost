// Run: node --test test/session-routes-wiring.test.js
// S3c: where server.js mounts cookie login. The session logic itself is in
// test/user-sessions.test.js and test/auth-cookie.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const at = (needle) => { const i = src.indexOf(needle); assert.ok(i >= 0, `${needle} is in server.js`); return i; };
const requireAuthLine = at('app.use("/api", auth.requireAuth);');

test("login and signup start a cookie session, only for Gurost's own pages (or no Origin)", () => {
  assert.match(src, /const startCookieSession = \(req, userId\) => \(!req\.headers\.origin \|\| auth\.sessions\(\)\.originAllowed\(req\) \?/);
  const login = src.slice(at('app.post("/api/auth/login"'), at('app.post("/api/auth/refresh"'));
  assert.match(login, /await startCookieSession\(req, result\.userId\);\s*res\.json\(result\)/);
  const signup = src.slice(at('app.post("/api/auth/signup"'), at('app.post("/api/auth/login"'));
  assert.match(signup, /await startCookieSession\(req, result\.userId\);/);
});

test("refresh and logout are reachable with an expired access cookie (before requireAuth)", () => {
  assert.ok(at('app.post("/api/auth/refresh", security.rejectUnknownFields([]), sessionRoutes.refresh);') < requireAuthLine);
  assert.ok(at('app.post("/api/auth/logout", security.rejectUnknownFields([]), sessionRoutes.logout);') < requireAuthLine);
});

test("sign out everywhere needs a login (after requireAuth)", () => {
  assert.ok(at('app.post("/api/auth/logout-all", security.rejectUnknownFields([]), sessionRoutes.logoutAll);') > requireAuthLine);
});

test("a password change ends every other session and keeps this one", () => {
  const route = src.slice(at('app.post("/api/auth/change-password"'));
  const body = route.slice(0, route.indexOf("\n});"));
  assert.match(body, /await userAuth\.changePassword\(req\.user\.id, currentPassword, newPassword\);\s*\/\/[^\n]*\n\s*await auth\.sessions\(\)\.revokeAll\(req\.user\.id, \{ keep: auth\.sessions\(\)\.currentSessionId\(req\) \}\)/);
});
