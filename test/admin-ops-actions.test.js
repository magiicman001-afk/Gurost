"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const X = require("../lib/admin-ops-actions");

const ACTOR = { adminId: "o1", name: "Irfan", role: "owner" };
function setup(over = {}) {
  const audits = [];
  const calls = [];
  let t = 1_000_000;
  const clock = { now: () => t, advance: (ms) => { t += ms; } };
  const db = { from: () => ({ insert: (r) => { audits.push(r); return Promise.resolve({ error: null }); } }) };
  const f = over.fetch || (async (url, o) => { calls.push([url, o]); return { ok: true, status: 201, json: async () => ({ id: "dep-new" }) }; });
  const ops = X.createOps({ fetch: f, env: over.env || { RENDER_API_KEY: "rnd_secretsecret" }, db, verifyPassword: async (id, pw) => pw === "right", busyCount: over.busy || (() => 0), clearCaches: () => ["cache a"], now: clock.now });
  return { ops, audits, calls, clock };
}
const good = { password: "right", reason: "shipping a fix" };

test("a reason is required, and unknown actions are refused", async () => {
  const { ops, audits } = setup();
  await assert.rejects(ops.run(ACTOR, "redeploy", { password: "right", reason: "no" }), /reason/);
  await assert.rejects(ops.run(ACTOR, "restart", good), /Unknown/);
  assert.equal(audits.length, 0);
});

test("the password is checked again: wrong or missing is refused, audited, and does nothing", async () => {
  const { ops, audits, calls } = setup();
  await assert.rejects(ops.run(ACTOR, "redeploy", { password: "hunter2", reason: "shipping a fix" }), /Wrong password/);
  await assert.rejects(ops.run(ACTOR, "redeploy", { reason: "shipping a fix" }), /Wrong password/);
  assert.equal(calls.length, 0, "Render was never called");
  assert.deepEqual(audits.map((a) => a.action), ["ops.denied", "ops.denied"]);
  assert.ok(!JSON.stringify(audits).includes("hunter2"), "the typed password is never recorded");
});

test("five wrong passwords lock ops for 15 minutes, then it opens again", async () => {
  const { ops, clock } = setup();
  for (let i = 0; i < X.LOCK_AFTER; i++) await assert.rejects(ops.run(ACTOR, "clear-cache", { password: "bad", reason: "trying it" }), /Wrong password/);
  await assert.rejects(ops.run(ACTOR, "clear-cache", good), (e) => e.status === 429 && /locked/.test(e.message), "even the right password is refused while locked");
  clock.advance(16 * 60 * 1000);
  assert.deepEqual(await ops.run(ACTOR, "clear-cache", good), { cleared: ["cache a"] });
});

test("redeploy calls Render once with the server's key, audits it, and then cools down", async () => {
  const { ops, audits, calls, clock } = setup();
  const r = await ops.run(ACTOR, "redeploy", good);
  assert.deepEqual(r, { started: true, deployId: "dep-new", wipedBuilds: 0 });
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /api\.render\.com\/v1\/services\/srv-d9t3vbqfngtc73d49100\/deploys$/);
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers.Authorization, "Bearer rnd_secretsecret");
  assert.equal(audits[0].action, "ops.redeploy");
  assert.equal(audits[0].reason, "shipping a fix");
  await assert.rejects(ops.run(ACTOR, "redeploy", good), (e) => e.status === 429 && /Cooling down/.test(e.message));
  assert.equal(calls.length, 1, "no second deploy during the cooldown");
  clock.advance(10 * 60 * 1000 + 1);
  await ops.run(ACTOR, "redeploy", good);
  assert.equal(calls.length, 2);
});

test("redeploy refuses while builds are running unless forced; force is recorded", async () => {
  const { ops, audits, calls } = setup({ busy: () => 2 });
  await assert.rejects(ops.run(ACTOR, "redeploy", good), (e) => e.status === 409 && e.busy === 2);
  assert.equal(calls.length, 0);
  const r = await ops.run(ACTOR, "redeploy", { ...good, force: true });
  assert.equal(r.wipedBuilds, 2);
  assert.equal(audits.at(-1).details.forced, true);
});

test("a failed or refused Render call does not start the cooldown and leaks no key", async () => {
  const { ops, clock } = setup({ fetch: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  await assert.rejects(ops.run(ACTOR, "redeploy", good), /refused the redeploy \(401\)/);
  const down = setup({ fetch: async () => { throw new Error("connect failed rnd_secretsecret"); } });
  await assert.rejects(down.ops.run(ACTOR, "redeploy", good), (e) => e.status === 502 && !e.message.includes("rnd_secretsecret"));
  assert.equal(down.ops.state().redeploy.readyInMs, 0, "no cooldown after a failure");
  const nokey = setup({ env: {} });
  await assert.rejects(nokey.ops.run(ACTOR, "redeploy", good), /RENDER_API_KEY/);
});

test("clear-cache reports what it cleared and has a short cooldown", async () => {
  const { ops, audits } = setup();
  const r = await ops.run(ACTOR, "clear-cache", good);
  assert.deepEqual(r.cleared, ["cache a"]);
  assert.equal(audits[0].action, "ops.clear-cache");
  await assert.rejects(ops.run(ACTOR, "clear-cache", good), /Cooling down/);
});

test("rotating keys is a checklist, not an action", () => {
  assert.ok(X.ROTATION_CHECKLIST.length >= 6);
  assert.match(X.ROTATION_CHECKLIST.at(-2), /revoke the OLD key/i);
  assert.ok(!("rotate-keys" in X.COOLDOWN_MS));
});

test("server wiring: ops actions are Owner-only, take only password/reason/force, check the password against the account", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.ok(src.includes('app.post("/api/admin/ops/:action", requireAdminAuth, adminAccess.needs("ops"), security.rejectUnknownFields(["password", "reason", "force"])'));
  assert.ok(src.indexOf('"/api/admin/ops/test-connections"') < src.indexOf('"/api/admin/ops/:action"'), "the specific route comes first");
  assert.match(src, /verifySecret\(password, data\.password_salt, data\.password_hash\)/);
  const A = require("../lib/admin-access");
  for (const role of ["admin", "team_lead", "engineer", "viewer"]) assert.equal(A.can(role, "ops"), false, role);
});
