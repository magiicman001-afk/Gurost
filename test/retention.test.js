"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { runRetention, startRetentionJob, RULES, logLine } = require("../lib/retention");
const { NIL_UUID } = require("../lib/user-data");

const DAY = 86400000;
const NOW = Date.parse("2026-10-13T03:17:00Z");
const ago = (d) => new Date(NOW - d * DAY).toISOString();

function makeDb(tables, failOn) {
  return {
    tables,
    from(name) {
      const q = { eqs: [] };
      const api = {
        delete() { return api; },
        lt(c, v) { q.lc = c; q.lv = v; return api; },
        eq(c, v) { q.eqs.push([c, v]); return api; },
        then(res, rej) {
          return Promise.resolve((() => {
            if (!(name in tables)) return { error: { code: "42P01", message: "relation does not exist" } };
            if (failOn === name) return { error: { code: "XX000", message: "boom" } };
            const old = (r) => r[q.lc] < q.lv && q.eqs.every(([c, v]) => r[c] === v);
            const n = tables[name].filter(old).length;
            tables[name] = tables[name].filter((r) => !old(r));
            return { error: null, count: n };
          })()).then(res, rej);
        },
      };
      return api;
    },
  };
}

test("old logs go, recent logs and active user data stay", async () => {
  const db = makeDb({
    request_timings: [{ created_at: ago(31) }, { created_at: ago(29) }],
    security_violations: [{ created_at: ago(91) }, { created_at: ago(89) }],
    business_assistant_audit: [{ created_at: ago(120) }, { created_at: ago(1) }],
    build_events: [{ created_at: ago(100) }, { created_at: ago(10) }],
    password_resets: [{ expires_at: ago(31) }, { expires_at: ago(5) }],
    user_profiles: [{ created_at: ago(2000) }], // not a retention table: must never be touched
  });
  const r = await runRetention(db, NOW);
  assert.deepStrictEqual(r.deleted, { request_timings: 1, security_violations: 1, business_assistant_audit: 1, build_events: 1, password_resets: 1 });
  assert.strictEqual(db.tables.request_timings.length, 1);
  assert.strictEqual(db.tables.user_profiles.length, 1, "active user data is kept");
  assert.deepStrictEqual(r.failed, []);
});

test("credit records: kept 7 years, and only the anonymised ones are ever removed", async () => {
  const db = makeDb({ credit_events: [
    { user_id: NIL_UUID, created_at: ago(7 * 365 + 5) }, // anonymised and past 7 years: removed
    { user_id: NIL_UUID, created_at: ago(6 * 365) },     // anonymised, inside 7 years: kept
    { user_id: "real-user", created_at: ago(8 * 365) },  // a live user's record is never touched
  ] });
  const r = await runRetention(db, NOW);
  assert.strictEqual(r.deleted.credit_events, 1);
  assert.strictEqual(db.tables.credit_events.length, 2);
  assert.ok(db.tables.credit_events.some((x) => x.user_id === "real-user"));
});

test("a missing table is skipped quietly; a failing table is reported; the rest still run", async () => {
  const db = makeDb({ request_timings: [{ created_at: ago(40) }], security_violations: [{ created_at: ago(100) }] }, "security_violations");
  const r = await runRetention(db, NOW);
  assert.strictEqual(r.deleted.request_timings, 1, "later and earlier rules still ran");
  assert.deepStrictEqual(r.failed, ["security_violations"]);
});

test("the log line has counts only", async () => {
  const db = makeDb({ request_timings: [{ created_at: ago(40), path: "/secret/person@x.com" }] });
  const line = logLine(await runRetention(db, NOW));
  assert.match(line, /^\[retention\] request_timings=1 failed=0$/);
  assert.ok(!line.includes("person"));
});

test("scheduled daily; can be turned off", async () => {
  const calls = [];
  const cron = { schedule: (expr, fn, opts) => { calls.push({ expr, opts }); return { fn }; } };
  const task = startRetentionJob(makeDb({}), { cron, log: () => {} });
  assert.strictEqual(calls[0].expr, "17 3 * * *");
  assert.ok(task);
  process.env.RETENTION_JOB = "off";
  assert.strictEqual(startRetentionJob(makeDb({}), { cron, log: () => {} }), null);
  delete process.env.RETENTION_JOB;
});

test("policy periods match the rules, and the job is started by the server", () => {
  const md = fs.readFileSync(path.join(__dirname, "..", "docs", "PRIVACY_POLICY.md"), "utf8");
  assert.match(md, /Server and security logs \| 30 to 90 days/);
  assert.match(md, /Build logs and events \| 90 days/);
  const days = Object.fromEntries(RULES.map((r) => [r.table, r.days]));
  assert.ok(days.request_timings >= 30 && days.request_timings <= 90);
  assert.ok(days.security_violations <= 90 && days.business_assistant_audit <= 90);
  assert.strictEqual(days.build_events, 90);
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.ok(/startRetentionJob\(/.test(src));
});
