"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const O = require("../lib/admin-ops");
const A = require("../lib/admin-access");

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const status = (n) => ({ ok: false, status: n, json: async () => ({}) });

test("redact hides secret-looking env values, ignores short or unrelated ones", () => {
  const env = { OPENROUTER_API_KEY: "sk-or-abcdef123456", SUPABASE_URL: "https://proj.supabase.co", NODE_ENV: "production", TINY_KEY: "abc" };
  assert.equal(O.redact("failed for sk-or-abcdef123456 at https://proj.supabase.co/x", env), "failed for *** at ***/x");
  assert.equal(O.redact("NODE production abc", env), "NODE production abc");
});

test("code and deploy: commits from the public repo, deploys from Render, each 'Not connected' on its own", async () => {
  const calls = [];
  const f = async (url, o) => {
    calls.push([url, o.headers]);
    if (url.includes("api.github.com")) return ok([{ sha: "abcdef1234567", commit: { message: "Fix it\n\nbody", author: { name: "Web Claude", date: "2026-10-12T10:00:00Z" } } }]);
    return ok([{ deploy: { id: "dep-1", status: "live", commit: { id: "1234567890", message: "Msg\nmore" }, createdAt: "2026-10-12T10:01:00Z" } }]);
  };
  const full = await O.codeAndDeploy({ fetch: f, env: { RENDER_API_KEY: "rnd_secretsecret", RENDER_GIT_COMMIT: "101e731aaaa" } });
  assert.equal(full.version, "101e731");
  assert.deepEqual(full.commits.items[0], { sha: "abcdef1", message: "Fix it", author: "Web Claude", at: "2026-10-12T10:00:00Z" });
  assert.equal(full.deploys.items[0].commit, "1234567");
  assert.equal(full.deploys.items[0].message, "Msg");
  assert.match(calls[0][0], /repos\/magiicman001-afk\/Gurost\/commits\?sha=clean-main/);
  assert.equal(calls[0][1].Authorization, undefined, "the public repo needs no token");
  assert.equal(calls[1][1].Authorization, "Bearer rnd_secretsecret", "the Render key goes only to Render");

  const none = await O.codeAndDeploy({ fetch: f, env: {} });
  assert.equal(none.deploys.connected, false);
  assert.match(none.deploys.note, /RENDER_API_KEY is not set/);
  assert.equal(none.commits.connected, true);

  const down = await O.codeAndDeploy({ fetch: async () => { throw new Error("boom rnd_secretsecret"); }, env: { RENDER_API_KEY: "rnd_secretsecret" } });
  assert.match(down.commits.note, /^Not connected: boom/);
  assert.ok(!JSON.stringify(down).includes("rnd_secretsecret"), "no key in any error");
  const limited = await O.codeAndDeploy({ fetch: async () => status(403), env: {} });
  assert.match(limited.commits.note, /GitHub answered 403/);
});

test("docs links: CLAUDE.md first, then every docs/*.md, as GitHub links only", () => {
  const links = O.docsLinks({ root: "/x", env: {}, fsApi: { readdirSync: () => ["B_SPEC.md", "a.md", "notes.txt", "m with space.md"] } });
  assert.equal(links[0].url, "https://github.com/magiicman001-afk/Gurost/blob/clean-main/CLAUDE.md");
  assert.deepEqual(links.slice(1).map((l) => l.title), ["B SPEC", "a", "m with space"]);
  assert.match(links[3].url, /docs\/m%20with%20space\.md$/);
  assert.ok(links.every((l) => l.url.startsWith("https://github.com/")));
  assert.equal(O.docsLinks({ root: "/x", env: {}, fsApi: { readdirSync() { throw new Error("none"); } } }).length, 1);
  assert.ok(O.docsLinks().length > 5, "the real docs folder is listed");
});

test("test connections: not-set providers are skipped, keys go only to their own provider, states are honest", async () => {
  const seen = [];
  const env = { OPENROUTER_API_KEY: "or-key-123456", GEMINI_API_KEY: "gem-key-123456", GITHUB_TOKEN: "gh-token-123456", VERCEL_TOKEN: "vc-token-123456" };
  const f = async (url, o) => {
    seen.push([url, JSON.stringify(o.headers)]);
    if (url.includes("openrouter")) return ok({ data: { usage: 12.345, limit: 20 } });
    if (url.includes("googleapis")) return status(403);
    if (url.includes("github")) return status(500);
    throw Object.assign(new Error("connect failed vc-token-123456"), { name: "Error" });
  };
  const db = { from: () => ({ select: () => ({ limit: () => Promise.resolve({ error: null }) }) }) };
  const r = await O.testConnections({ fetch: f, env, db, includeBalance: true });
  const by = Object.fromEntries(r.map((x) => [x.name, x]));
  assert.equal(by.OpenRouter.state, "ok");
  assert.deepEqual(by.OpenRouter.balance, { usedUsd: 12.35, limitUsd: 20, remainingUsd: 7.65 });
  assert.equal(by.Gemini.state, "rejected");
  assert.equal(by.GitHub.state, "failed");
  assert.equal(by.Vercel.state, "failed");
  assert.ok(!by.Vercel.detail.includes("vc-token-123456"));
  assert.equal(by.OpenAI.state, "not set");
  assert.equal(by.Supabase.state, "ok");
  assert.equal(seen.length, 4, "only providers with a key are called");
  for (const [url, headers] of seen) {
    const own = url.includes("openrouter") ? "or-key" : url.includes("googleapis") ? "gem-key" : url.includes("github") ? "gh-token" : "vc-token";
    for (const other of ["or-key", "gem-key", "gh-token", "vc-token"]) if (other !== own) assert.ok(!headers.includes(other), `${other} leaked to ${url}`);
  }
  const noBalance = await O.testConnections({ fetch: f, env: { OPENROUTER_API_KEY: "or-key-123456" }, includeBalance: false });
  assert.equal(noBalance.find((x) => x.name === "OpenRouter").balance, undefined);
});

test("test connections: a timeout is reported as 'no answer', not a hang", async () => {
  const f = (url, o) => new Promise((_, rej) => o.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  const orig = global.setTimeout;
  global.setTimeout = (fn, ms, ...a) => orig(fn, ms >= 6000 ? 5 : ms, ...a);
  try {
    const r = await O.testConnections({ fetch: f, env: { GEMINI_API_KEY: "gem-key-123456" } });
    assert.equal(r.find((x) => x.name === "Gemini").detail, "no answer in 6 seconds");
  } finally { global.setTimeout = orig; }
});

test("server wiring: code (section code), docs (docs), test-connections (ops: Owner only)", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.ok(src.includes('app.get("/api/admin/code", requireAdminAuth, adminAccess.needs("code")'));
  assert.ok(src.includes('app.get("/api/admin/docs", requireAdminAuth, adminAccess.needs("docs")'));
  assert.ok(src.includes('app.post("/api/admin/ops/test-connections", requireAdminAuth, adminAccess.needs("ops")'));
  assert.equal(A.can("owner", "ops", true), true);
  assert.equal(A.can("admin", "ops"), false);
  assert.equal(A.can("viewer", "docs"), true);
  assert.equal(A.can("viewer", "code"), false);
});
