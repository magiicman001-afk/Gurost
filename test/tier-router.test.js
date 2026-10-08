// Run: node --test test/tier-router.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { modelForTier, fallbackModelForTier } = require("../lib/tier-router");

const PREMIUM = /anthropic\//;
const models = (s) => s.split(",");

test("Free: only free models plus the cheap non-reasoning fallback, and never a premium model, complex or not", () => {
  for (const complex of [false, true]) {
    const m = modelForTier("free", { complex });
    assert.ok(!PREMIUM.test(m), m);
    assert.ok(models(m)[0].endsWith(":free"), "starts with a free model");
  }
  assert.equal(modelForTier("free", { complex: true }), modelForTier("free"));
  assert.equal(modelForTier(undefined, { complex: true }), modelForTier("free"), "unknown plan is treated as free");
  assert.equal(modelForTier("anything-else", { complex: true }), modelForTier("free"));
});

test("Pro: GLM first, the same for every task, never premium", () => {
  assert.match(modelForTier("pro"), /^z-ai\/glm-5\.2/);
  assert.equal(modelForTier("pro", { complex: true }), modelForTier("pro"));
  assert.ok(!PREMIUM.test(modelForTier("pro", { complex: true })));
  assert.ok(fallbackModelForTier("pro").endsWith(":free"));
  assert.equal(fallbackModelForTier("free"), null);
});

test("Top tiers: GLM for ordinary work, Sonnet for complex work", () => {
  for (const plan of ["unlimited", "ultimate"]) {
    assert.match(modelForTier(plan), /^z-ai\/glm-5\.2/);
  }
  assert.match(modelForTier("unlimited", { complex: true }), /^anthropic\/claude-sonnet/);
});

test("Ultimate's rare Opus escalation only happens on complex work", () => {
  const orig = Math.random;
  try {
    Math.random = () => 0.01;
    assert.match(modelForTier("ultimate", { complex: true }), /opus/);
    assert.match(modelForTier("ultimate"), /^z-ai\/glm-5\.2/, "not complex: no Opus");
    assert.ok(!/opus/.test(modelForTier("unlimited", { complex: true })), "Opus is Ultimate only");
    Math.random = () => 0.99;
    assert.match(modelForTier("ultimate", { complex: true }), /sonnet/);
  } finally { Math.random = orig; }
});

test("App Builder code: Kimi K2.6 first; paid plans fall back Sonnet, GLM, Nemotron; Free falls back to Nemotron only", () => {
  const { modelForAppCode } = require("../lib/tier-router");
  for (const plan of ["pro", "unlimited", "ultimate"]) {
    assert.deepEqual(models(modelForAppCode(plan)).map((m) => m.split("/")[0]), ["moonshotai", "anthropic", "z-ai", "nvidia"], plan);
    assert.equal(models(modelForAppCode(plan))[0], "moonshotai/kimi-k2.6");
    assert.ok(models(modelForAppCode(plan)).at(-1).endsWith(":free"), "a free model is the last resort");
  }
  for (const plan of ["free", undefined, "other"]) {
    const m = models(modelForAppCode(plan));
    assert.equal(m[0], "moonshotai/kimi-k2.6");
    assert.ok(m.length > 1 && m.slice(1).every((x) => /^nvidia\/nemotron.*:free$/.test(x)), `${plan}: only Nemotron free after Kimi`);
  }
});

test("APP_CODE_MODEL can swap the first model or switch Kimi off, without a code change", () => {
  const run = (value) => require("child_process").execFileSync(process.execPath, ["-e", "console.log(require('./lib/tier-router').modelForAppCode('pro'))"], { env: { ...process.env, APP_CODE_MODEL: value }, cwd: require("path").join(__dirname, "..") }).toString().trim();
  assert.match(run("other/model"), /^other\/model,/);
  assert.equal(run("off"), modelForTier("pro", { complex: true }));
});
