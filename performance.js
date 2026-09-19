/**
 * Performance monitoring — the two pieces admin-dashboard.js didn't
 * already have: response-time tracking and cost-spike alerting. Claude
 * token usage/cost aggregation already existed (claude_usage_log,
 * logged from lib/claude-client.js) — this doesn't duplicate that.
 *
 * SQL (run once):
 *   create table request_timings (
 *     id bigint generated always as identity primary key,
 *     path text not null,
 *     method text not null,
 *     status_code integer,
 *     duration_ms integer not null,
 *     created_at timestamptz default now()
 *   );
 */

const { supabase } = require("./lib/db");
const { notify } = require("./integrations");

const SPIKE_MULTIPLIER = Number(process.env.COST_SPIKE_MULTIPLIER) || 3; // alert if current-hour spend is Nx the trailing baseline
let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // don't re-alert more than once per 30 min

// Express middleware — attach globally, logs every request's duration.
function timingMiddleware(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    supabase
      .from("request_timings")
      .insert({ path: req.path, method: req.method, status_code: res.statusCode, duration_ms: duration })
      .then(({ error }) => {
        if (error) console.warn("[performance] Timing log failed:", error.message);
      });
  });
  next();
}

async function getResponseTimeStats(hours = 24) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const { data, error } = await supabase.from("request_timings").select("path, duration_ms").gte("created_at", since);
  if (error) throw new Error(error.message);
  if (!data.length) return { count: 0, avgMs: 0, p95Ms: 0, slowestPaths: [] };

  const durations = data.map((r) => r.duration_ms).sort((a, b) => a - b);
  const avgMs = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
  const p95Ms = durations[Math.floor(durations.length * 0.95)];

  const byPath = {};
  data.forEach((r) => {
    if (!byPath[r.path]) byPath[r.path] = [];
    byPath[r.path].push(r.duration_ms);
  });
  const slowestPaths = Object.entries(byPath)
    .map(([path, times]) => ({ path, avgMs: Math.round(times.reduce((s, t) => s + t, 0) / times.length), count: times.length }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 5);

  return { count: data.length, avgMs, p95Ms, slowestPaths };
}

// Compares the current hour's Claude token cost against the trailing
// 24h hourly average — a real spike check, not just a raw threshold,
// since "normal" usage varies a lot by time of day.
async function checkCostSpike(adminUserId) {
  const now = new Date();
  const hourAgo = new Date(now - 3600000).toISOString();
  const dayAgo = new Date(now - 24 * 3600000).toISOString();

  const [{ data: recent }, { data: baseline }] = await Promise.all([
    supabase.from("claude_usage_log").select("input_tokens, output_tokens").gte("created_at", hourAgo),
    supabase.from("claude_usage_log").select("input_tokens, output_tokens").gte("created_at", dayAgo).lt("created_at", hourAgo)
  ]);

  const costOf = (rows) =>
    (rows || []).reduce((sum, r) => sum + (r.input_tokens / 1e6) * 3 + (r.output_tokens / 1e6) * 15, 0);

  const currentHourCost = costOf(recent);
  const baselineHourlyAvg = costOf(baseline) / 23; // 23 remaining hours in the trailing 24h window

  const isSpike = baselineHourlyAvg > 0 && currentHourCost > baselineHourlyAvg * SPIKE_MULTIPLIER;

  if (isSpike && Date.now() - lastAlertAt > ALERT_COOLDOWN_MS && adminUserId) {
    lastAlertAt = Date.now();
    await notify
      .notify(adminUserId, `Claude cost this hour: $${currentHourCost.toFixed(2)} vs typical $${baselineHourlyAvg.toFixed(2)}/hr`, {
        title: "Gurost cost spike",
        tags: "warning"
      })
      .catch((err) => console.warn("[performance] Spike alert notification failed:", err.message));
  }

  return { currentHourCost: Math.round(currentHourCost * 100) / 100, baselineHourlyAvg: Math.round(baselineHourlyAvg * 100) / 100, isSpike };
}

module.exports = { timingMiddleware, getResponseTimeStats, checkCostSpike };
