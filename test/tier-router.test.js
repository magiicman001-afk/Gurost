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
