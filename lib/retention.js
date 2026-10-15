"use strict";
/**
 * Retention cleanup: deletes data that has outlived the periods promised in the privacy policy (docs/PRIVACY_POLICY.md, section 6).
 * Runs once a day. Logs COUNTS only, never rows or personal data.
 *
 * Policy -> rule:
 *   server and security logs 30 to 90 days   -> request_timings 30, security_violations 90, business_assistant_audit 90
 *   build logs and events 90 days            -> build_events, build_log, build_logs
 *   sign-in sessions: expired + 30 days      -> user_sessions (table may not exist yet; skipped quietly)
 *   reset tokens: expired + 30 days          -> password_resets
 *   payment records 7 years                  -> anonymised credit_events are removed after 7 years
 * Kept on purpose: active user data, and all credit records inside the 7 years.
 * Deleted accounts: data is erased at once by DELETE /api/account (no 30-day wait), so there is nothing left to age out.
 */
const { isMissingTable, NIL_UUID } = require("./user-data");

const DAY = 24 * 60 * 60 * 1000;
const RULES = [
  { table: "request_timings", column: "created_at", days: 30 },
  { table: "security_violations", column: "created_at", days: 90 },
  { table: "business_assistant_audit", column: "created_at", days: 90 },
  { table: "build_events", column: "created_at", days: 90 },
  { table: "build_log", column: "created_at", days: 90 },
  { table: "build_logs", column: "created_at", days: 90 },
  { table: "bot_calls", column: "started_at", days: 90 },
  { table: "bot_nudges", column: "created_at", days: 90 },
  { table: "user_sessions", column: "expires_at", days: 30 },
  { table: "password_resets", column: "expires_at", days: 30 },
  // only rows already stripped of the person's id (see deleteUserData); live users' records are never touched
  { table: "credit_events", column: "created_at", days: 7 * 365, eq: { user_id: NIL_UUID } },
];

/** Run every rule. Returns { deleted:{table:n}, failed:[table], ranAt }. Never throws. */
async function runRetention(supabase, now = Date.now(), rules = RULES) {
  const out = { deleted: {}, failed: [], ranAt: new Date(now).toISOString() };
  for (const r of rules) {
    try {
      const cutoff = new Date(now - r.days * DAY).toISOString();
      let q = supabase.from(r.table).delete({ count: "exact" }).lt(r.column, cutoff);
      for (const [k, v] of Object.entries(r.eq || {})) q = q.eq(k, v);
      const { error, count } = await q;
      if (error) { if (!isMissingTable(error)) out.failed.push(r.table); continue; }
      if (count) out.deleted[r.table] = count;
    } catch { out.failed.push(r.table); }
  }
  return out;
}

function logLine(res) {
  const parts = Object.entries(res.deleted).map(([t, n]) => `${t}=${n}`).join(" ") || "nothing to delete";
  return `[retention] ${parts} failed=${res.failed.length ? res.failed.join(",") : 0}`;
}

/** Schedule daily at 03:17 UTC. RETENTION_JOB=off turns it off. Returns the task, or null. */
function startRetentionJob(supabase, { cron = require("node-cron"), log = console.log, audit } = {}) {
  if (String(process.env.RETENTION_JOB || "").toLowerCase() === "off") { log("[retention] disabled (RETENTION_JOB=off)"); return null; }
  const run = async () => {
    const res = await runRetention(supabase);
    log(logLine(res));
    if (audit) { try { await audit(res); } catch { /* best effort */ } }
    return res;
  };
  const task = cron.schedule("17 3 * * *", run, { timezone: "UTC" });
  task.runNow = run;
  return task;
}

module.exports = { RULES, runRetention, startRetentionJob, logLine };
