"use strict";
/**
 * Admin Area Phase 2B: code and deploy, docs links, and read-only connection tests. `fetch`, the environment and the
 * file system are injected so tests need no network. Keys are only ever sent to their own provider and never returned;
 * every error text is passed through redact() before it leaves this file.
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_REPO = "magiicman001-afk/Gurost";
const DEFAULT_BRANCH = "clean-main";
const DEFAULT_RENDER_SERVICE = "srv-d9t3vbqfngtc73d49100";

/** Replace any secret value found in env (8+ characters, in a key-like variable) with ***. */
function redact(text, env = process.env) {
  let out = String(text == null ? "" : text);
  for (const [k, v] of Object.entries(env)) {
    if (!v || String(v).length < 8) continue;
    if (!/KEY|TOKEN|SECRET|PASSWORD|DSN|URL/i.test(k)) continue;
    out = out.split(String(v)).join("***");
  }
  return out;
}

async function timed(fetchFn, url, opts = {}, ms = 6000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetchFn(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---- Code and deploy --------------------------------------------------------------------------------------------

async function codeAndDeploy({ fetch: f = global.fetch, env = process.env, startedAt = Date.now() - process.uptime() * 1000 } = {}) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const out = {
    repo, branch,
    version: (env.RENDER_GIT_COMMIT || "").slice(0, 7) || "unknown",
    runningSince: new Date(startedAt).toISOString(),
    commits: { connected: false, items: [], note: "" },
    deploys: { connected: false, items: [], note: "" },
  };
  try {
    // The repo is public: no token needed (a token, if set, only raises the rate limit).
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "gurost-admin" };
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    const r = await timed(f, `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=15`, { headers });
    if (!r.ok) throw new Error(`GitHub answered ${r.status}`);
    const list = await r.json();
    out.commits = { connected: true, note: "", items: list.map((c) => ({ sha: String(c.sha).slice(0, 7), message: String((c.commit && c.commit.message) || "").split("\n")[0].slice(0, 140), author: (c.commit && c.commit.author && c.commit.author.name) || "", at: c.commit && c.commit.author && c.commit.author.date })) };
  } catch (err) {
    out.commits.note = `Not connected: ${redact(err.message, env)}`;
  }
  if (!env.RENDER_API_KEY) {
    out.deploys.note = "Not connected: RENDER_API_KEY is not set on the server.";
  } else {
    try {
      const svc = env.RENDER_SERVICE_ID || DEFAULT_RENDER_SERVICE;
      const r = await timed(f, `https://api.render.com/v1/services/${svc}/deploys?limit=10`, { headers: { Authorization: `Bearer ${env.RENDER_API_KEY}`, Accept: "application/json" } });
      if (!r.ok) throw new Error(`Render answered ${r.status}`);
      const list = await r.json();
      out.deploys = { connected: true, note: "", items: list.map((x) => x.deploy || x).map((d) => ({ id: d.id, status: d.status, commit: d.commit && String(d.commit.id || "").slice(0, 7), message: d.commit && String(d.commit.message || "").split("\n")[0].slice(0, 100), at: d.createdAt, finishedAt: d.finishedAt || null })) };
    } catch (err) {
      out.deploys.note = `Not connected: ${redact(err.message, env)}`;
    }
  }
  return out;
}

// ---- Docs links -------------------------------------------------------------------------------------------------

/** Static links only (the repo is public: link, never inline its content). */
function docsLinks({ root = path.join(__dirname, ".."), env = process.env, fsApi = fs } = {}) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const base = `https://github.com/${repo}/blob/${branch}`;
  const links = [{ title: "CLAUDE.md (project memory)", url: `${base}/CLAUDE.md` }];
  let files = [];
  try { files = fsApi.readdirSync(path.join(root, "docs")).filter((f) => /\.md$/i.test(f)).sort(); } catch { files = []; }
  for (const f of files) links.push({ title: f.replace(/\.md$/i, "").replace(/_/g, " "), url: `${base}/docs/${encodeURIComponent(f)}` });
  return links;
}

// ---- Connection tests (read-only) -------------------------------------------------------------------------------

const round = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : null);
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const TESTS = [
  { name: "OpenRouter", env: ["OPENROUTER_API_KEY"], req: (e) => ({ url: "https://openrouter.ai/api/v1/auth/key", headers: bearer(e.OPENROUTER_API_KEY) }),
    balance: async (r) => { const d = (await r.json()).data || {}; return d.limit == null ? { usedUsd: round(d.usage), limitUsd: null } : { usedUsd: round(d.usage), limitUsd: round(d.limit), remainingUsd: round(d.limit - d.usage) }; } },
  { name: "Gemini", env: ["GEMINI_API_KEY"], req: (e) => ({ url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", headers: { "x-goog-api-key": e.GEMINI_API_KEY } }) },
  { name: "OpenAI", env: ["OPENAI_API_KEY"], req: (e) => ({ url: "https://api.openai.com/v1/models", headers: bearer(e.OPENAI_API_KEY) }) },
  { name: "GitHub", env: ["GITHUB_TOKEN"], req: (e) => ({ url: "https://api.github.com/rate_limit", headers: { ...bearer(e.GITHUB_TOKEN), "User-Agent": "gurost-admin" } }) },
  { name: "Vercel", env: ["VERCEL_TOKEN"], req: (e) => ({ url: "https://api.vercel.com/v2/user", headers: bearer(e.VERCEL_TOKEN) }) },
  { name: "Render", env: ["RENDER_API_KEY"], req: (e) => ({ url: "https://api.render.com/v1/services?limit=1", headers: bearer(e.RENDER_API_KEY) }) },
  { name: "Deepgram", env: ["DEEPGRAM_API_KEY"], req: (e) => ({ url: "https://api.deepgram.com/v1/projects", headers: { Authorization: `Token ${e.DEEPGRAM_API_KEY}` } }) },
];

/**
 * One read-only call per provider, in parallel, 6 seconds each, plus a tiny database read. `includeBalance` (Owner only)
 * adds the spend figures OpenRouter itself reports. A provider with no key says "not set" and is not called.
 * A 401/403 is reported as "rejected" (the key is wrong or revoked), anything else non-2xx as "failed".
 */
async function testConnections({ fetch: f = global.fetch, env = process.env, db, includeBalance = false } = {}) {
  const results = await Promise.all(TESTS.map(async (t) => {
    if (!t.env.every((k) => env[k])) return { name: t.name, state: "not set" };
    const t0 = Date.now();
    try {
      const { url, headers } = t.req(env);
      const r = await timed(f, url, { headers });
      const ms = Date.now() - t0;
      if (r.ok) {
        const res = { name: t.name, state: "ok", ms };
        if (includeBalance && t.balance) { try { res.balance = await t.balance(r); } catch { /* the call worked; the figures just were not readable */ } }
        return res;
      }
      return { name: t.name, state: r.status === 401 || r.status === 403 ? "rejected" : "failed", detail: `answered ${r.status}`, ms };
    } catch (err) {
      return { name: t.name, state: "failed", detail: redact(err.name === "AbortError" ? "no answer in 6 seconds" : err.message, env), ms: Date.now() - t0 };
    }
  }));
  if (db) {
    const t0 = Date.now();
    try {
      const { error } = await db.from("admin_accounts").select("id").limit(1);
      results.push(error ? { name: "Supabase", state: "failed", detail: redact(error.message, env), ms: Date.now() - t0 } : { name: "Supabase", state: "ok", ms: Date.now() - t0 });
    } catch (err) {
      results.push({ name: "Supabase", state: "failed", detail: redact(err.message, env), ms: Date.now() - t0 });
    }
  }
  return results;
}

module.exports = { DEFAULT_RENDER_SERVICE, redact, timed, codeAndDeploy, docsLinks, testConnections, TESTS, DEFAULT_REPO, DEFAULT_BRANCH };
