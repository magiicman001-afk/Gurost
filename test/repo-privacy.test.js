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

test("createRepo is public by default (the backend-deploy path needs that)", async () => {
  const calls = stubFetch();
  await github.createRepo("gurost-abc");
  assert.equal(calls.find((c) => c.url.endsWith("/user/repos")).body.private, false);
});

test("createRepo can make a private repo", async () => {
  const calls = stubFetch();
  await github.createRepo("gurost-abc", { private: true });
  assert.equal(calls.find((c) => c.url.endsWith("/user/repos")).body.private, true);
});

test("anything other than an explicit true stays public-by-default, not accidentally private or truthy", async () => {
  const calls = stubFetch();
  await github.createRepo("x", { private: "yes" });
  assert.equal(calls.find((c) => c.url.endsWith("/user/repos")).body.private, false);
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
