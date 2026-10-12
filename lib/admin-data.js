"use strict";
/**
 * Admin Area Phase 1 data: dashboard numbers, software inventory, models and APIs status, persisted projects,
 * and the builds log. The Supabase client and the environment are injected so tests need neither.
 *
 * Honesty rule (spec section 4): a source that is not connected is reported as "Not connected", never as zero.
 */

const DAY = 24 * 60 * 60 * 1000;

// ---- Builds log -------------------------------------------------------------------------------------------------

/** Fire-and-forget: one row per Website Builder build attempt. Never throws, never blocks a build. */
function recordBuildLog(db, { projectId, userId, kind = "website", status, error, variants, seconds }) {
  try {
    if (!db) return;
    const scores = (variants || []).map((v) => v && v.premium && v.premium.score).filter((n) => Number.isFinite(n));
    const row = {
      project_id: projectId || null,
      user_id: userId ? String(userId) : null,
      kind,
      status: status === "failed" ? "failed" : "ok",
      error: error ? String(error).slice(0, 500) : null,
      designs: Array.isArray(variants) ? variants.length : null,
      best_score: scores.length ? Math.max(...scores) : null,
      seconds: Number.isFinite(seconds) ? Math.round(seconds * 10) / 10 : null,
    };
    Promise.resolve(db.from("build_log").insert(row)).then((r) => {
      if (r && r.error) console.warn("[build-log] insert failed:", r.error.message);
    }).catch((e) => console.warn("[build-log] insert failed:", e.message));
  } catch (e) {
    console.warn("[build-log] insert failed:", e.message);
  }
}

async function buildsLog(db, { limit = 100 } = {}) {
  const { data, error } = await db.from("build_log").select("*").order("created_at", { ascending: false }).limit(Math.min(limit, 200));
  if (error) throw new Error(error.message);
  const rows = data || [];
  const since = Date.now() - 7 * DAY;
  const week = rows.filter((r) => Date.parse(r.created_at) >= since);
  return {
    builds: rows,
    week: { total: week.length, failed: week.filter((r) => r.status === "failed").length },
    note: "Recorded from the day this log went live; earlier builds are not in it.",
  };
}

// ---- Dashboard --------------------------------------------------------------------------------------------------

async function dashboardData(db) {
  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const data = { revenue: { value: null, note: "Not connected (Stripe is not live)" } };

  const [builds, timings, usage] = await Promise.all([
    db.from("build_log").select("status,user_id").gte("created_at", weekAgo),
    db.from("request_timings").select("status_code").gte("created_at", hourAgo),
    db.from("claude_usage_log").select("cost").gte("created_at", weekAgo),
  ]);
  const unavailable = (e) => ({ value: null, note: `Not available: ${e && e.message ? e.message : "no data"}` });

  if (builds.error) {
    data.buildsWeek = unavailable(builds.error);
    data.failedWeek = unavailable(builds.error);
    data.activeUsers = unavailable(builds.error);
  } else {
    const rows = builds.data || [];
    data.buildsWeek = { value: rows.length };
    data.failedWeek = { value: rows.filter((r) => r.status === "failed").length };
    data.activeUsers = { value: new Set(rows.map((r) => r.user_id).filter(Boolean)).size, note: "Users who built in the last 7 days" };
  }
  data.errorsHour = timings.error ? unavailable(timings.error) : { value: (timings.data || []).filter((r) => r.status_code >= 500).length };
  data.spend = usage.error
    ? unavailable(usage.error)
    : { value: Math.round((usage.data || []).reduce((s, r) => s + parseFloat(r.cost || 0), 0) * 100) / 100, note: "AI spend, last 7 days (USD)" };
  return data;
}

// ---- Software inventory -----------------------------------------------------------------------------------------

const PRODUCTS = [
  { name: "Website Builder", status: "live", owner: "Web Claude", flags: ["SECTION_LIBRARY", "PREMIUM_PIPELINE", "DESIGN_MEMORY"] },
  { name: "App Builder", status: "waiting", owner: "Web Claude", note: "Waits until the Website Builder is launch-ready" },
  { name: "Amend Website", status: "live", owner: "Web Claude" },
  { name: "Pulse", status: "live", owner: "Web Claude" },
  { name: "Business Assistant", status: "live", owner: "Web Claude" },
  { name: "Admin Area", status: "in progress", owner: "Web Claude", note: "Phase 1 of 2" },
  { name: "Launch flow", status: "not built", owner: "-" },
];

function inventory(env, startedAt = Date.now() - process.uptime() * 1000) {
  const commit = (env.RENDER_GIT_COMMIT || "").slice(0, 7);
  return {
    version: commit || "unknown",
    lastDeploy: new Date(startedAt).toISOString(),
    products: PRODUCTS.map((p) => ({
      name: p.name,
      status: p.status,
      owner: p.owner,
      note: p.note || null,
      flags: (p.flags || []).map((f) => ({ name: f, on: env[f] === "1" })),
    })),
    note: "Version and last deploy are for this running server (Render sets the commit); every product ships in the same deploy.",
  };
}

// ---- Models and APIs --------------------------------------------------------------------------------------------

const PROVIDERS = [
  { name: "OpenRouter (AI models)", keys: ["OPENROUTER_API_KEY"] },
  { name: "Gemini (images, free tier)", keys: ["GEMINI_API_KEY"] },
  { name: "OpenAI (image fallback)", keys: ["OPENAI_API_KEY"] },
  { name: "fal.ai (premium images)", keys: ["FAL_KEY", "FAL_API_KEY"], any: true },
  { name: "Pixabay (stock photos)", keys: ["PIXABAY_API_KEY"] },
  { name: "Deepgram (voice)", keys: ["DEEPGRAM_API_KEY"] },
  { name: "LiveKit (voice rooms)", keys: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"] },
  { name: "Supabase (database)", keys: ["SUPABASE_URL", "SUPABASE_SERVICE_KEY"] },
  { name: "Vercel (deploys)", keys: ["VERCEL_TOKEN"] },
  { name: "GitHub (saves)", keys: ["GITHUB_TOKEN"] },
  { name: "Stripe (payments)", keys: ["STRIPE_SECRET_KEY"] },
  { name: "Postmark (email)", keys: ["POSTMARK_API_KEY"] },
  { name: "Render (hosting API)", keys: ["RENDER_API_KEY"] },
];

/** Only "set / not set". A key value is never read into the response. */
function modelsStatus(env, role) {
  return {
    providers: PROVIDERS.map((p) => {
      const present = p.keys.filter((k) => !!env[k]);
      return { name: p.name, configured: p.any ? present.length > 0 : present.length === p.keys.length, balance: "Not connected" };
    }),
    // Admin never sees dollar figures here (spec section 1); only the Owner does.
    note: role === "owner"
      ? "Balances need each provider's balance API, which is not connected yet; check them in the provider's own dashboard."
      : "Balances are visible to the Owner only.",
  };
}

// ---- Projects (persisted) ---------------------------------------------------------------------------------------

async function projectsList(db, memory, { state, userId, limit = 200 } = {}) {
  let q = db.from("project_state").select("id,user_id,name,updated_at,created_at,state:context->>state,type:context->>type")
    .order("updated_at", { ascending: false }).limit(Math.min(limit, 500));
  if (state) q = q.eq("context->>state", String(state));
  if (userId) q = q.eq("user_id", String(userId));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const live = new Set([...memory.keys()]);
  return (data || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    type: r.type || null,
    state: r.state || null,
    updatedAt: r.updated_at,
    createdAt: r.created_at,
    inMemory: live.has(r.id),
  }));
}

// ---- Security status ----------------------------------------------------------------------------------------------

/** What is on and what is not, said plainly. "Not built" is never shown as "on". */
async function securityStatus(db, env, members) {
  const list = members || [];
  const byRole = {};
  for (const m of list) if (m.active) byRole[m.role] = (byRole[m.role] || 0) + 1;
  return {
    layers: [
      { name: "Security headers on every page", state: "on" },
      { name: "Content Security Policy", state: env.CSP_ENFORCE === "1" ? "enforced" : "report-only (not blocking yet)" },
      { name: "CORS allowlist", state: "on" },
      { name: "Admin login rate limit", state: "on" },
      { name: "Admin sessions", state: "8-hour token in the browser; cookie sessions and logout-everywhere are pending (S3)" },
      { name: "Two-factor login (Owner, Admin)", state: "not built" },
      { name: "Login history and suspicious-login flags", state: "not built (only last login time is kept)" },
    ],
    accounts: { active: list.filter((m) => m.active).length, revoked: list.filter((m) => !m.active).length, byRole },
    neverLoggedIn: list.filter((m) => m.active && !m.last_login_at).map((m) => m.name),
  };
}

module.exports = { securityStatus, recordBuildLog, buildsLog, dashboardData, inventory, modelsStatus, projectsList, PRODUCTS, PROVIDERS };
