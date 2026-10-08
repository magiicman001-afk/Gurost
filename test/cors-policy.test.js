// Run: node --test test/cors-policy.test.js
// A real Express server with the CORS policy, asked the way browsers ask.
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { corsPolicy, allowedOrigins, DEFAULT_ORIGINS } = require("../lib/cors-policy");

let server, base;
test.before(async () => {
  const app = express();
  app.use(corsPolicy(require("cors"), allowedOrigins({})));
  app.get("/api/projects", (req, res) => res.json({ projects: [] }));
  app.post("/api/site-forms/:id", (req, res) => res.json({ ok: true }));
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const get = (path, origin) => fetch(base + path, { headers: origin ? { Origin: origin } : {} });

test("any other website gets no CORS headers (it used to get *)", async () => {
  const res = await get("/api/projects", "https://evil.example");
  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("Gurost's own domains are allowed, with credentials (ready for cookie sessions)", async () => {
  for (const origin of DEFAULT_ORIGINS) {
    const res = await get("/api/projects", origin);
    assert.equal(res.headers.get("access-control-allow-origin"), origin, origin);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  }
});

test("the page's own origin is always allowed (local dev, preview deploys)", async () => {
  const res = await get("/api/projects", base);
  assert.equal(res.headers.get("access-control-allow-origin"), base);
});

test("published sites can post their forms from anywhere - never with credentials", async () => {
  for (const origin of ["https://crumbandco.co.uk", "null"]) {
    const pre = await fetch(`${base}/api/site-forms/abc`, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    assert.equal(pre.headers.get("access-control-allow-origin"), "*", origin);
    assert.equal(pre.headers.get("access-control-allow-credentials"), null);
  }
});

test("a preflight from an unknown site is not approved", async () => {
  const pre = await fetch(`${base}/api/projects`, { method: "OPTIONS", headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "DELETE" } });
  assert.equal(pre.headers.get("access-control-allow-origin"), null);
});

test("CORS_ORIGINS replaces the defaults; junk entries are ignored", () => {
  const set = allowedOrigins({ CORS_ORIGINS: "https://a.example, https://b.example/ ,not a url,javascript:alert(1)" });
  assert.deepEqual([...set], ["https://a.example", "https://b.example"]);
  assert.ok(allowedOrigins({ PUBLIC_URL: "https://preview.onrender.com" }).has("https://preview.onrender.com"));
});
