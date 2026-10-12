"use strict";
// Run: node --test test/secret-scan.test.js
// Fake keys are assembled from pieces so this file itself holds no key-shaped text.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { scanText, forbiddenFile, isPublicJwt, skipped } = require("../lib/secret-scan");

const pad = (n) => "AbCd0123".repeat(Math.ceil(n / 8)).slice(0, n);
const jwt = (payload) => ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify(payload)).toString("base64url"), pad(30)].join(".");
const FAKES = {
  "Supabase secret key": "sb_" + "secret_" + pad(24),
  "OpenRouter key": "sk-or-" + "v1-" + pad(40),
  "Anthropic key": "sk-ant-" + pad(40),
  "OpenAI key": "sk-" + "proj-" + pad(40),
  "Stripe key": "sk_" + "live_" + pad(24),
  "Stripe webhook secret": "whsec_" + pad(30),
  "Google API key": "AIza" + pad(35),
  "GitHub token": "ghp_" + pad(40),
  "Render key": "rnd_" + pad(28),
  "AWS access key id": "AKIA" + "ABCDEFGHIJKLMNOP",
  "Private key block": "-----BEGIN RSA " + "PRIVATE KEY-----",
  "Database URL with password": "postgres://" + "admin:" + "s3cretpass@db.example.com/x",
  "JWT (e.g. Supabase service role)": jwt({ role: "service_role" }),
};

for (const [kind, fake] of Object.entries(FAKES)) {
  test(`finds: ${kind}`, () => {
    const f = scanText(`const x = "${fake}";`, "a.js");
    assert.equal(f.length, 1, kind);
    assert.equal(f[0].kind, kind);
    assert.equal(f[0].line, 1);
    assert.ok(!JSON.stringify(f).includes(fake), "the finding never contains the secret");
    assert.ok(f[0].preview.endsWith("***") && f[0].preview.length <= 8);
  });
}

test("a Supabase anon (public) key is allowed, a service-role key is not", () => {
  assert.equal(isPublicJwt(jwt({ role: "anon" })), true);
  assert.equal(isPublicJwt(jwt({ role: "service_role" })), false);
  assert.deepEqual(scanText(`const K = "${jwt({ role: "anon" })}";`, "login.html"), []);
});

test("secret-looking assignment is found, placeholders and env reads are not", () => {
  assert.equal(scanText('const API_KEY = "q8Zk2Lw9Xv3Nb7Rt5Yp1Hd6Fj4Gs0Mc";', "a.js").length, 1); // secret-scan-ok: random fake value
  assert.deepEqual(scanText('const API_KEY = "your-api-key-goes-here-please";', "a.js"), []);
  assert.deepEqual(scanText("const API_KEY = process.env.API_KEY;", "a.js"), []);
  assert.deepEqual(scanText('const TOKEN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";', "a.js"), [], "low entropy");
});

test("a line marked secret-scan-ok is skipped", () => {
  assert.deepEqual(scanText(`const x = "${FAKES["OpenRouter key"]}"; // secret-scan-ok: fake`, "t.js"), []);
});

test("line numbers are right", () => {
  const f = scanText(`ok\nok\nconst k = "${FAKES["Google API key"]}"\n`, "a.js");
  assert.equal(f[0].line, 3);
});

test("files that hold secrets are refused by name; examples are allowed", () => {
  for (const f of [".env", "config/.env.production", "__auth-state.json", "CLAUDE.local.md", "keys/server.pem"]) assert.ok(forbiddenFile(f), f);
  for (const f of [".env.example", "server.js", "docs/ENV.md"]) assert.equal(forbiddenFile(f), null, f);
});

test("lockfile, binaries and node_modules are skipped", () => {
  assert.ok(skipped("package-lock.json") && skipped("a/b.png") && skipped("node_modules/x/y.js"));
  assert.ok(!skipped("server.js"));
});

test("the pre-commit hook runs the scanner", () => {
  const hook = fs.readFileSync(path.join(__dirname, "..", ".githooks", "pre-commit"), "utf8");
  assert.match(hook, /secret-scan\.js --staged/);
});

test("nothing in this repository's tracked files is a secret", () => {
  let files;
  try { files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: path.join(__dirname, ".."), encoding: "utf8" }).split("\n").filter(Boolean); } catch { return; }
  const found = [];
  for (const f of files) {
    if (skipped(f) || !fs.existsSync(path.join(__dirname, "..", f))) continue;
    if (forbiddenFile(f)) { found.push({ file: f, kind: "forbidden file" }); continue; }
    found.push(...scanText(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), f));
  }
  assert.deepEqual(found.map((x) => `${x.file}:${x.line || ""} ${x.kind}`), []);
});
