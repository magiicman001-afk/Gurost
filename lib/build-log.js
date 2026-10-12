"use strict";
/**
 * Build log: one entry per bot action (docs/ESCALATION_HIERARCHY_SPEC.md section 2).
 *
 *   { bot, task, decision, reason, time_ms, result: success|fail|escalate, next_bot, details }
 *
 * Entries are kept in memory (for the live view) and written to `build_logs` fire-and-forget: a database problem never
 * slows or breaks a build. `details` holds numbers and short strings only (never page HTML, never secrets).
 */

const RESULTS = ["success", "fail", "escalate"];
const CHAIN = ["builder", "fixer", "manager", "senior"];
const SUPPORT = ["copywriter", "photographer", "reviewer"];
const MAX_MEMORY = 400;

/** Flags (spec section 6). Default ON unless set to "0". BUILD_LOGS_ADMIN is always on and has no switch. */
const flag = (name, env = process.env) => String(env[name] === undefined ? "1" : env[name]) !== "0";
const escalationOn = (env) => flag("ESCALATION_HIERARCHY", env);
const seniorOn = (env) => flag("SENIOR_BOT_ENABLED", env);
const logsVisible = (env) => flag("BUILD_LOGS_VISIBLE", env);

const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

/** Keep `details` small and JSON-safe: depth-limited, strings clipped, no huge arrays. */
function cleanDetails(d, depth = 0) {
  if (d == null) return {};
  if (typeof d === "string") return clip(d, 400);
  if (typeof d === "number" || typeof d === "boolean") return d;
  if (depth > 3) return null;
  if (Array.isArray(d)) return d.slice(0, 30).map((x) => cleanDetails(x, depth + 1));
  if (typeof d === "object") {
    const out = {};
    for (const [k, v] of Object.entries(d).slice(0, 40)) {
      if (/html|password|secret|token|apikey|api_key/i.test(k)) continue;
      out[k] = cleanDetails(v, depth + 1);
    }
    return out;
  }
  return null;
}

function normalize(e, ctx) {
  const result = RESULTS.includes(e.result) ? e.result : "fail";
  return {
    project_id: ctx.projectId || null,
    build_id: ctx.buildId || null,
    user_id: ctx.userId != null ? String(ctx.userId) : null,
    bot: clip(e.bot, 40) || "builder",
    task: clip(e.task, 300),
    decision: clip(e.decision, 300),
    reason: clip(e.reason, 500),
    time_ms: Number.isFinite(e.time_ms) ? Math.round(e.time_ms) : null,
    result,
    next_bot: e.next_bot ? clip(e.next_bot, 40) : null,
    details: cleanDetails(e.details) || {},
    created_at: new Date().toISOString(),
  };
}

/**
 * @param {{ projectId, buildId, userId, db?, onEntry?: (entry) => void, memory?: object[] }} ctx
 * @returns {{ log(entry): object, entries: object[], step(bot, task, fn): Promise<any> }}
 */
function createLogger(ctx = {}) {
  const entries = ctx.memory || [];
  function log(e) {
    const entry = normalize(e, ctx);
    entries.push(entry);
    if (entries.length > MAX_MEMORY) entries.splice(0, entries.length - MAX_MEMORY);
    try {
      if (ctx.onEntry) ctx.onEntry(entry);
    } catch (err) {
      console.warn("[build-log] listener failed:", err.message);
    }
    try {
      if (ctx.db) {
        Promise.resolve(ctx.db.from("build_logs").insert(entry)).then((r) => {
          if (r && r.error) console.warn("[build-log] insert failed:", r.error.message);
        }).catch((err) => console.warn("[build-log] insert failed:", err.message));
      }
    } catch (err) {
      console.warn("[build-log] insert failed:", err.message);
    }
    return entry;
  }
  /** Run fn, time it, log success (decision from fn's return {decision, reason, details} if given) or fail (and rethrow). */
  async function step(bot, task, fn) {
    const t0 = Date.now();
    try {
      const out = await fn();
      const o = out && typeof out === "object" && out.__log ? out.__log : {};
      log({ bot, task, decision: o.decision || "done", reason: o.reason || null, time_ms: Date.now() - t0, result: "success", details: o.details });
      return out && out.__log ? out.value : out;
    } catch (err) {
      log({ bot, task, decision: "failed", reason: err.message, time_ms: Date.now() - t0, result: "fail", details: {} });
      throw err;
    }
  }
  return { log, step, entries, ctx };
}

/** A logger that records nothing (callers that were not given one). */
const nullLogger = { log: (e) => e, step: async (bot, task, fn) => fn(), entries: [], ctx: {} };

// ---- Reading ----------------------------------------------------------------------------------------------------

/** Rows for one project (a user's own log) or any filter (admin). Oldest first within a build. */
async function queryLogs(db, { projectId, buildId, userId, bot, result, limit = 500, newestFirst = false } = {}) {
  let q = db.from("build_logs").select("*").order("created_at", { ascending: !newestFirst }).limit(Math.min(Number(limit) || 500, 1000));
  if (projectId) q = q.eq("project_id", String(projectId));
  if (buildId) q = q.eq("build_id", String(buildId));
  if (userId) q = q.eq("user_id", String(userId));
  if (bot) q = q.eq("bot", String(bot));
  if (result) q = q.eq("result", String(result));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

/** Group rows into builds (chains): { buildId, projectId, startedAt, entries, escalated, flagged, finalResult }. */
function groupBuilds(rows) {
  const by = new Map();
  for (const r of rows) {
    const key = r.build_id || `${r.project_id || "none"}`;
    if (!by.has(key)) by.set(key, { buildId: r.build_id, projectId: r.project_id, userId: r.user_id, startedAt: r.created_at, entries: [] });
    by.get(key).entries.push(r);
  }
  return [...by.values()].map((b) => {
    b.entries.sort((x, y) => String(x.created_at).localeCompare(String(y.created_at)));
    b.startedAt = b.entries[0].created_at;
    b.bots = [...new Set(b.entries.map((e) => e.bot))];
    b.escalated = b.entries.some((e) => e.result === "escalate");
    b.flagged = b.entries.some((e) => e.details && e.details.flagged === true);
    b.failures = b.entries.filter((e) => e.result === "fail").length;
    return b;
  }).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

module.exports = { createLogger, nullLogger, queryLogs, groupBuilds, escalationOn, seniorOn, logsVisible, flag, cleanDetails, CHAIN, SUPPORT, RESULTS };
