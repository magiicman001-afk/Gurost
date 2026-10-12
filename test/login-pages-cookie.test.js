// Run: node --test test/login-pages-cookie.test.js
// S3d: login and signup stop storing tokens once the server signs the browser
// in by cookie; dashboard logout asks the server to end the session.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const page = (f) => fs.readFileSync(path.join(__dirname, "..", "public", f), "utf8");
const submitHandler = (src, apiPath) => {
  const start = src.indexOf(`GurostAPI.call('${apiPath}'`);
  assert.ok(start >= 0, apiPath);
  return src.slice(start, src.indexOf("redirectAfterAuth()", start));
};

test("login: stored tokens cleared; the token is kept only when no cookie session started", () => {
  const h = submitHandler(page("login.html"), "/api/auth/login");
  assert.match(h, /localStorage\.removeItem\('gurost_jwt'\);\s*localStorage\.removeItem\('gurost_api_key'\);/);
  assert.match(h, /if \(!result\.cookieSession\) localStorage\.setItem\('gurost_jwt', result\.token\);/);
  assert.doesNotMatch(h.replace(/if \(!result\.cookieSession\)[^\n]*/, ""), /setItem\('gurost_jwt'/, "never stored unconditionally");
});

test("signup: the API key is no longer kept in the browser (only before cookie sessions exist)", () => {
  const h = submitHandler(page("signup.html"), "/api/auth/signup");
  assert.match(h, /if \(!result\.cookieSession\) localStorage\.setItem\('gurost_api_key', result\.apiKey\);/);
  assert.doesNotMatch(h.replace(/if \(!result\.cookieSession\)[^\n]*/, ""), /setItem\('gurost_api_key'/);
});

test("dashboard logout ends the session on the server", () => {
  const src = page("dashboard.html");
  const fn = src.slice(src.indexOf("const logout = async () => {"), src.indexOf("sidebarLogoutBtn').addEventListener"));
  assert.match(fn, /await GurostAPI\.logout\(\);/);
  assert.match(fn, /window\.location\.href = 'index\.html';/);
});
