"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validate, check } = require("../lib/validate");

const run = (mw, req) => new Promise((resolve) => {
  const res = { status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
  mw(req, res, () => resolve({ code: 200, req }));
});

test("uuid: accepts a real id, rejects anything else", () => {
  assert.equal(check("id", "6F1C2D3E-1111-4222-8333-444455556666", "uuid").ok, true);
  for (const bad of ["x", "1; drop table", "6f1c2d3e-1111-4222-8333-44445555666", "../../etc/passwd", 5, {}]) assert.equal(check("id", bad, "uuid").ok, false);
});

test("int: coerces numeric text, enforces range, rejects junk", () => {
  assert.equal(check("n", "42", { type: "int", min: 1, max: 100 }).value, 42);
  assert.equal(check("n", "0", { type: "int", min: 1 }).ok, false);
  assert.equal(check("n", "1e9", "int").ok, false);
  assert.equal(check("n", "12.5", "int").ok, false);
  assert.equal(check("n", ["1"], "int").ok, false);
});

test("string: trims, limits length (default 500), rejects control characters", () => {
  assert.equal(check("s", "  hi  ", "string").value, "hi");
  assert.equal(check("s", "x".repeat(501), "string").ok, false);
  assert.equal(check("s", "a\u0000b", "string").ok, false);
  assert.equal(check("s", "a\nb", "string").ok, false);
  assert.equal(check("s", "a\nb", { type: "string", multiline: true }).ok, true);
  assert.equal(check("s", { $ne: 1 }, "string").ok, false, "an object is not text");
  assert.equal(check("s", ["a"], "string").ok, false, "an array is not text");
});

test("enum, bool, email", () => {
  assert.equal(check("r", "admin", { type: "enum", values: ["admin", "viewer"] }).ok, true);
  assert.equal(check("r", "root", { type: "enum", values: ["admin", "viewer"] }).ok, false);
  assert.equal(check("b", "true", "bool").value, true);
  assert.equal(check("b", "yes", "bool").ok, false);
  assert.equal(check("e", "a@b.co", "email").ok, true);
  assert.equal(check("e", "a@b", "email").ok, false);
  assert.equal(check("e", "a b@c.com", "email").ok, false);
});

test("required and optional", () => {
  assert.equal(check("x", undefined, { type: "string", required: true }).ok, false);
  assert.equal(check("x", "", { type: "string", required: true }).ok, false);
  assert.equal(check("x", undefined, "string").ok, true);
});

test("middleware: 400 naming the field, handler never reached", async () => {
  const mw = validate({ params: { id: "uuid" }, body: { reason: { type: "string", required: true, min: 3, max: 200 } } });
  const bad = await run(mw, { params: { id: "nope" }, body: { reason: "ok fine" } });
  assert.equal(bad.code, 400);
  assert.match(bad.body.error, /params\.id/);
  const bad2 = await run(mw, { params: { id: "6f1c2d3e-1111-4222-8333-444455556666" }, body: { reason: "no" } });
  assert.match(bad2.body.error, /body\.reason/);
});

test("middleware: passes clean values through, written back trimmed and typed", async () => {
  const mw = validate({ query: { limit: { type: "int", min: 1, max: 200 } }, body: { reason: { type: "string", required: true } } });
  const ok = await run(mw, { params: {}, query: { limit: "50" }, body: { reason: "  because  ", keep: 1 } });
  assert.equal(ok.code, 200);
  assert.equal(ok.req.query.limit, 50);
  assert.equal(ok.req.body.reason, "because");
  assert.equal(ok.req.body.keep, 1, "fields outside the schema are left alone");
});

test("a missing body is handled", async () => {
  const mw = validate({ body: { reason: { type: "string", required: true } } });
  assert.equal((await run(mw, { params: {} })).code, 400);
});
