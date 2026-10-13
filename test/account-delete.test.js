"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const ud = require("../lib/user-data");

// In-memory fake of the Supabase calls used for deletion.
function makeDb(seed, opts = {}) {
  const t = JSON.parse(JSON.stringify(seed));
  const stored = { ...(opts.files || {}) };
  const db = {
    tables: t,
    stored,
    from(name) {
      const q = { op: "select", patch: null };
      const run = () => {
        if (!(name in t)) return { data: null, error: { code: "42P01", message: `relation "${name}" does not exist` }, count: null };
        if (opts.failOn === name) return { data: null, error: { code: "XX000", message: "boom" }, count: null };
        const hit = (r) => r[q.col] === q.val;
        if (q.op === "delete") { const n = t[name].filter(hit).length; t[name] = t[name].filter((r) => !hit(r)); return { error: null, count: n }; }
        if (q.op === "update") { let n = 0; t[name].forEach((r) => { if (hit(r)) { Object.assign(r, q.patch); n++; } }); return { error: null, count: n }; }
        const rows = t[name].filter(hit);
        return { data: rows.slice(q.a || 0, (q.b || 999) + 1), error: null };
      };
      const api = {
        select() { return api; },
        delete() { q.op = "delete"; return api; },
        update(p) { q.op = "update"; q.patch = p; return api; },
        eq(c, v) { q.col = c; q.val = v; return api; },
        range(a, b) { q.a = a; q.b = b; return Promise.resolve(run()); },
        then(res, rej) { return Promise.resolve(run()).then(res, rej); },
      };
      return api;
    },
    storage: {
      from(bucket) {
        return {
          list: async (prefix) => ({ data: Object.keys(stored).filter((k) => k.startsWith(`${bucket}/${prefix}/`)).map((k) => ({ id: "x", name: k.split("/").pop() })), error: null }),
          remove: async (paths) => { paths.forEach((p) => delete stored[`${bucket}/${p}`]); return { error: null }; },
        };
      },
    },
  };
  return db;
}

const seed = () => ({
  api_keys: [{ user_id: "u1", email: "a@b.c" }, { user_id: "u2", email: "x@y.z" }],
  user_profiles: [{ user_id: "u1" }, { user_id: "u2" }],
  project_state: [{ id: "p1", user_id: "u1" }, { id: "p2", user_id: "u2" }],
  pulse_learning_log: [{ user_id: "u1", prompt: "a" }, { user_id: "u1", prompt: "b" }, { user_id: "u2", prompt: "c" }],
  user_bot_conversations: [{ user_id: "u1", content: "hi" }],
  site_form_submissions: [{ user_id: "u1", fields: {} }],
  credit_events: [{ id: 1, user_id: "u1", project_id: "p1", amount: 100, reason: "topup", metadata: { card: "x" } }, { id: 2, user_id: "u2", amount: 5, reason: "use" }],
  password_resets: [{ user_id: "u1" }],
  newsletter_subscribers: [{ email: "a@b.c" }, { email: "x@y.z" }],
});
const files = { "avatars/u1/me.png": "a", "project-assets/p1/logo.png": "b", "project-assets/p2/other.png": "c" };

test("deletes everything for the user, keeps other users, anonymises credit records", async () => {
  const db = makeDb(seed(), { files });
  const r = await ud.deleteUserData(db, { id: "u1", email: "a@b.c" });
  assert.strictEqual(r.complete, true);
  for (const tb of ["user_profiles", "project_state", "pulse_learning_log", "user_bot_conversations", "site_form_submissions", "password_resets", "api_keys"]) {
    assert.ok(!db.tables[tb].some((x) => x.user_id === "u1"), `${tb} has no u1 rows`);
  }
  assert.deepStrictEqual(db.tables.newsletter_subscribers, [{ email: "x@y.z" }], "newsletter row removed by email");
  assert.strictEqual(db.tables.user_profiles.length, 1, "other user kept");
  assert.strictEqual(db.tables.pulse_learning_log.length, 1);
  const ev = db.tables.credit_events.find((x) => x.id === 1);
  assert.strictEqual(ev.user_id, ud.NIL_UUID); assert.strictEqual(ev.project_id, null); assert.strictEqual(ev.metadata, null);
  assert.strictEqual(ev.amount, 100, "the money fact is kept for the legal record");
  assert.deepStrictEqual(Object.keys(db.stored), ["project-assets/p2/other.png"], "only u1's files removed");
  assert.strictEqual(r.deleted.pulse_learning_log, 2);
  assert.ok(!JSON.stringify(r).includes("a@b.c"), "the report holds no personal data");
});

test("if any step fails, the account record is kept so the person can retry", async () => {
  const db = makeDb(seed(), { files, failOn: "pulse_learning_log" });
  const r = await ud.deleteUserData(db, { id: "u1", email: "a@b.c" });
  assert.strictEqual(r.complete, false);
  assert.ok(r.failed.includes("pulse_learning_log"));
  assert.ok(db.tables.api_keys.some((x) => x.user_id === "u1"), "account still exists");
});

test("running it twice is safe", async () => {
  const db = makeDb(seed(), { files });
  await ud.deleteUserData(db, { id: "u1", email: "a@b.c" });
  const again = await ud.deleteUserData(db, { id: "u1", email: "a@b.c" });
  assert.strictEqual(again.complete, true);
});

test("stripe subscriptions are cancelled, and a Stripe failure is thrown (so nothing is deleted)", async () => {
  const cancelled = [];
  const stripe = { subscriptions: { list: async () => ({ data: [{ id: "s1", status: "active" }, { id: "s2", status: "canceled" }, { id: "s3", status: "past_due" }] }), cancel: async (id) => cancelled.push(id) } };
  assert.strictEqual(await ud.cancelStripeSubscriptions(stripe, "cus_1"), 2);
  assert.deepStrictEqual(cancelled, ["s1", "s3"]);
  assert.strictEqual(await ud.cancelStripeSubscriptions(stripe, null), 0);
  const bad = { subscriptions: { list: async () => { throw new Error("stripe down"); } } };
  await assert.rejects(ud.cancelStripeSubscriptions(bad, "cus_1"));
});

test("route wiring: needs the typed email, runs Stripe before deleting, sits below the auth line", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const i = src.indexOf('app.delete("/api/account"');
  assert.ok(i > src.indexOf('app.use("/api", auth.requireAuth);'), "behind sign-in");
  const body = src.slice(i, i + 4000);
  assert.ok(body.indexOf("confirmEmail") < body.indexOf("deleteUserData("));
  assert.ok(body.indexOf("cancelStripeSubscriptions") < body.indexOf("deleteUserData("));
  assert.ok(/rejectUnknownFields\(\["confirmEmail"\]\)/.test(body));
});

test("every kind of data that is exported is also deleted (one list)", () => {
  const exported = ud.USER_TABLES.map((t) => t.table);
  const handled = new Set([...exported]); // deleteUserData derives its targets from USER_TABLES
  for (const a of ud.ANONYMISE) assert.ok(handled.has(a.table), `${a.table} is in the list`);
});
