// Run: node --test test/security-headers.test.js
// Starts a real Express server with the same order as server.js (headers,
// then static files) and checks what a browser actually receives.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const express = require("express");
const { pageSecurity, sandboxSharedPage, DIRECTIVES } = require("../lib/security-headers");

let server, base;
test.before(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gurost-pages-"));
  fs.writeFileSync(path.join(dir, "login.html"), "<!DOCTYPE html><p>login</p>");
  const app = express();
  app.use(pageSecurity());
  app.use(express.static(dir));
  app.get("/shared/:token", (req, res) => { res.setHeader("Content-Type", "text/html"); sandboxSharedPage(res); res.send("<p>site</p>"); });
  app.get("/api/ping", (req, res) => res.json({ ok: true }));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test("static pages get the security headers (they used to get none)", async () => {
  const res = await fetch(`${base}/login.html`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN", "no framing by other sites");
  assert.match(res.headers.get("strict-transport-security") || "", /max-age=\d+/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  const csp = res.headers.get("content-security-policy-report-only");
  assert.match(csp, /frame-ancestors 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /report-uri \/api\/csp-report/);
});

test("CSP is report-only until switched on; CSP_ENFORCE turns it into a real policy", () => {
  const seen = {};
  const res = { setHeader: (k, v) => { seen[k.toLowerCase()] = v; }, getHeader: () => undefined, removeHeader: () => {} };
  pageSecurity({ enforce: true })({ method: "GET", headers: {} }, res, () => {});
  assert.ok(seen["content-security-policy"], "enforced header");
  assert.ok(!seen["content-security-policy-report-only"]);
});

test("the policy allows what pages and generated sites load, and nothing like plugins", () => {
  assert.ok(DIRECTIVES["script-src"].includes("https://cdn.tailwindcss.com"));
  assert.ok(DIRECTIVES["font-src"].includes("https://fonts.gstatic.com"));
  assert.ok(DIRECTIVES["frame-src"].includes("https://www.google.com"), "Google Maps embeds");
  assert.deepEqual(DIRECTIVES["object-src"], ["'none'"]);
});

test("a shared page runs sandboxed: its own opaque origin, scripts and forms still work", async () => {
  const res = await fetch(`${base}/shared/abc`);
  const csp = res.headers.get("content-security-policy");
  assert.match(csp, /^sandbox /);
  for (const allow of ["allow-scripts", "allow-forms", "allow-popups"]) assert.match(csp, new RegExp(allow));
  assert.doesNotMatch(csp, /allow-same-origin/, "never the app's own origin");
  assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
});

test("API responses keep their headers", async () => {
  const res = await fetch(`${base}/api/ping`);
  assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
});

test("a shared page carries only the sandbox policy, not the report-only page policy", async () => {
  const res = await fetch(`${base}/shared/abc`);
  assert.equal(res.headers.get("content-security-policy-report-only"), null);
});
