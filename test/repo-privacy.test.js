// Run: node --test test/repo-privacy.test.js
// A customer's saved work must never land in a public GitHub repo.
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

process.env.GITHUB_TOKEN = "test-token";

// checkpoint.js needs the database; give it a stand-in with no saved checkpoints.
const realLoad = Module._load;
const chain = { select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, maybeSingle: async () => ({ data: null }), insert: () => chain, single: async () => ({ data: { id: "cp1" }, error: null }) };
Module._load = function (request, ...rest) {
  if (/lib\/db$/.test(request)) return { supabase: { from: () => chain } };
  return realLoad.call(this, request, ...rest);
};
const github = require("../lib/github");
const checkpoint = require("../bots/checkpoint");
Module._load = realLoad;

function stubFetch() {
  const calls = [];
  global.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || "GET", body: opts.body ? JSON.parse(opts.body) : null });
    const u = String(url);
    let data = {};
    if (u.endsWith("/user")) data = { login: "owner1" };
    else if (u.includes("/git/refs/heads/main") && (opts.method || "GET") === "GET") data = { object: { sha: "base" } };
    else if (u.includes("/git/commits/base")) data = { tree: { sha: "basetree" } };
    else if (u.endsWith("/git/blobs")) data = { sha: "blob" };
    else if (u.endsWith("/git/trees")) data = { sha: "tree" };
    else if (u.endsWith("/git/commits")) data = { sha: "newcommit" };
    return { ok: true, status: 200, json: async () => data };
  };
  return calls;
}

test("createRepo is ALWAYS private, with no argument, with private:true, and even when someone asks for public", async () => {
  for (const args of [[], [{ private: true }], [{ private: false }], [{ private: "no" }], [{ public: true }], [{ visibility: "public" }]]) {
    const calls = stubFetch();
    await github.createRepo("gurost-abc", ...args);
    const body = calls.find((c) => c.url.endsWith("/user/repos")).body;
    assert.strictEqual(body.private, true, JSON.stringify(args));
    assert.ok(!("visibility" in body) && !("public" in body));
  }
});

test("the backend-deploy path (pushGeneratedRepo) creates a private repo", async () => {
  const calls = stubFetch();
  const out = await github.pushGeneratedRepo([{ path: "index.js", content: "x" }], "abcdef12-0000");
  const create = calls.find((c) => c.url.endsWith("/user/repos"));
  assert.ok(create, "a repo was created");
  assert.strictEqual(create.body.private, true);
  assert.match(out.repoUrl, /gurost-abcdef12$/);
});

test("source guard: repos can only be created in lib/github.js, and that file never says private:false", () => {
  const fs = require("fs");
  const path = require("path");
  const root = path.join(__dirname, "..");
  const skip = new Set(["node_modules", ".git", "test", "docs", "public"]);
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(js|mjs|cjs)$/.test(e.name)) files.push(full);
    }
  })(root);
  const creators = /\/user\/repos|\/orgs\/[^/'"`]+\/repos|repos\.createForAuthenticatedUser|repos\.createInOrg|repos\.createUsingTemplate|repos\.create\(|gh\s+repo\s+create/;
  const offenders = [];
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join("/");
    const text = fs.readFileSync(f, "utf8");
    if (rel === "PULSE-PANEL-ROUTE-INSTRUCTIONS.js") { assert.ok(!/private:\s*false/.test(text), rel); continue; } // a notes file; its one call is private:true
    if (creators.test(text) && rel !== "lib/github.js") offenders.push(rel);
    assert.ok(!/(private|isPrivate)\s*[:=]\s*false/.test(text) || rel.startsWith("lib/sections") || rel === "lib/xss-scan.js", `${rel}: a repo flag set to false`);
  }
  assert.deepEqual(offenders, [], "create repos only through lib/github.js createRepo (always private)");
  const gh = fs.readFileSync(path.join(root, "lib", "github.js"), "utf8");
  assert.match(gh, /private: true,/);
  assert.ok(!/private:\s*(false|isPrivate)/.test(gh));
});

test("a new checkpoint repo is created private", async () => {
  const calls = stubFetch();
  const out = await checkpoint.saveCheckpoint("u1", "12345678-aaaa", [{ path: "index.html", content: "<p>x</p>" }], 3);
  const create = calls.find((c) => c.url.endsWith("/user/repos"));
  assert.ok(create, "a repo was created");
  assert.equal(create.body.private, true);
  assert.match(create.body.name, /^gurost-checkpoint-12345678$/);
  assert.equal(out.commitSha, "newcommit");
});
