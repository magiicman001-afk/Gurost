"use strict";
/**
 * Bot handoff log: every time one of the eight website-builder bots passes its work to the next, one row goes into
 * `bot_handoffs` (docs/migrations/2026-10-14_bot_handoffs.sql): { from_bot, to_bot, project_id, payload, created_at }.
 *
 * Same rules as lib/build-log.js: a database problem never slows or breaks a build (inserts are fire-and-forget and
 * only warn), and the payload is small and JSON-safe (numbers and short strings; no HTML, no secrets, no contact details).
 * Without a project id or a database (tests, dry runs) the handoffs are only kept in memory.
 */

/** The eight bots, in the order the work passes through them. "user" is where the finished design goes. */
const BOTS = ["planner", "industry", "designer", "research", "builder", "pulse", "review", "launch"];
const ENDS = [...BOTS, "user"];

const MAX_PAYLOAD = 2000; // characters of JSON
const MAX_MEMORY = 200;
const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

/** Depth-limited, string-clipped copy. Keys that could hold HTML, contact details or secrets are dropped. */
function cleanPayload(d, depth = 0) {
  if (d == null) return null;
  if (typeof d === "string") return clip(d, 200);
  if (typeof d === "number" || typeof d === "boolean") return d;
  if (depth > 3) return null;
  if (Array.isArray(d)) return d.slice(0, 20).map((x) => cleanPayload(x, depth + 1));
  if (typeof d === "object") {
    const out = {};
    for (const [k, v] of Object.entries(d).slice(0, 30)) {
      if (/html|password|secret|token|apikey|api_key|phone|email|address/i.test(k)) continue;
      out[k] = cleanPayload(v, depth + 1);
    }
    return out;
  }
  return null;
}

function normalize(from, to, payload, projectId) {
  let clean = cleanPayload(payload) || {};
  if (JSON.stringify(clean).length > MAX_PAYLOAD) clean = { note: "payload too large, dropped", keys: Object.keys(clean).slice(0, 20) };
  return { from_bot: clip(from, 40), to_bot: clip(to, 40), project_id: projectId ? String(projectId) : null, payload: clean, created_at: new Date().toISOString() };
}

/**
 * @param {{ projectId?: string, db?: object, memory?: object[], onEntry?: (row) => void }} ctx  `db` is a Supabase client
 * @returns {{ handoff(from, to, payload): object, rows: object[], flush(): Promise<void> }}
 */
function createHandoffLog(ctx = {}) {
  const rows = ctx.memory || [];
  const pending = [];
  let warned = false;
  const warn = (msg) => {
    if (warned) return; // once per build: a missing table would otherwise print a line per handoff
    warned = true;
    console.warn("[bot-handoff] could not save handoffs (run docs/migrations/2026-10-14_bot_handoffs.sql?):", msg);
  };
  function handoff(from, to, payload) {
    if (!ENDS.includes(from) || !ENDS.includes(to)) console.warn(`[bot-handoff] unknown bot in handoff: ${from} -> ${to}`);
    const row = normalize(from, to, payload, ctx.projectId);
    rows.push(row);
    if (rows.length > MAX_MEMORY) rows.splice(0, rows.length - MAX_MEMORY);
    try {
      if (ctx.onEntry) ctx.onEntry(row);
    } catch (err) {
      console.warn("[bot-handoff] listener failed:", err.message);
    }
    try {
      if (ctx.db && row.project_id) {
        pending.push(
          Promise.resolve(ctx.db.from("bot_handoffs").insert(row))
            .then((r) => { if (r && r.error) warn(r.error.message); })
            .catch((err) => warn(err.message))
        );
      }
    } catch (err) {
      warn(err.message);
    }
    return row;
  }
  /** Resolves when every insert has settled (never rejects). The orchestrator awaits this before it returns. */
  const flush = () => Promise.all(pending.splice(0)).then(() => {});
  return { handoff, rows, flush };
}

/** A log that keeps nothing and writes nothing. */
const nullHandoffs = { handoff: () => null, rows: [], flush: () => Promise.resolve() };

/** The handoff log for a build logger (lib/build-log.js): same project, same database client, so no new wiring in server.js. */
function forLogger(logger) {
  const ctx = (logger && logger.ctx) || {};
  if (!ctx.projectId) return createHandoffLog({});
  return createHandoffLog({ projectId: ctx.projectId, db: ctx.db });
}

module.exports = { BOTS, createHandoffLog, nullHandoffs, forLogger, cleanPayload };
