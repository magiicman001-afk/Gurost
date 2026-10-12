"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { LIMITS, adminWriteLimiter } = require("../lib/rate-limits");

test("admin changes are limited to 30 per 15 minutes and reads are not counted", () => {
  let cfg;
  adminWriteLimiter((c) => { cfg = c; return () => {}; });
  assert.equal(cfg.max, 30);
  assert.equal(cfg.windowMs, 15 * 60 * 1000);
  for (const m of ["GET", "HEAD", "OPTIONS"]) assert.equal(cfg.skip({ method: m }), true);
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(cfg.skip({ method: m }), false);
  assert.match(cfg.message.error, /admin changes/i);
});

test("the admin limit is stricter than the general one", () => {
  assert.ok(LIMITS.admin.max < 100);
});

test("server.js applies the admin limiter before the first admin route", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "server.js"), "utf8");
  const use = src.indexOf('app.use("/api/admin", adminWriteLimiter');
  const first = src.indexOf('app.post("/api/admin/login"');
  assert.ok(use > 0, "limiter is mounted");
  assert.ok(use < first, "and it comes before the admin routes");
});
