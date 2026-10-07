// Run: node --test test/model-router.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const r = require("../lib/model-router");
const { modelForTier } = require("../lib/tier-router");
const S = r._slugs;

const first = (s) => s.split(",")[0];
const all = (s) => s.split(",");

test("free plan always gets the free chain, whatever the task", () => {
  for (const t of r.TASKS) assert.equal(r.modelFor(t, "free"), modelForTier("free"));
  assert.equal(r.modelFor("research", undefined), modelForTier("free"));
  assert.equal(r.modelFor("research", "mystery-plan"), modelForTier("free"));
});

test("unlimited follows the task table", () => {
  assert.equal(first(r.modelFor("simple_reply", "unlimited")), S.GLM);
  assert.equal(first(r.modelFor("complex_reasoning", "unlimited")), S.SONNET);
  assert.equal(first(r.modelFor("long_document", "unlimited")), S.DEEPSEEK);
  assert.equal(first(r.modelFor("research", "unlimited")), S.GEMINI);
  assert.equal(first(r.modelFor("calculation", "unlimited")), S.DEEPSEEK);
  assert.equal(first(r.modelFor("draft_writing", "unlimited")), S.HAIKU);
});

test("every chain has at most 3 models, no repeats, and ends with a free model", () => {
  for (const plan of ["pro", "unlimited", "ultimate"]) {
    for (const t of r.TASKS) {
      const chain = all(r.modelFor(t, plan));
      assert.ok(chain.length <= 3, `${plan}/${t}: ${chain.length}`);
      assert.equal(new Set(chain).size, chain.length, `${plan}/${t} repeats a model`);
      assert.match(chain[chain.length - 1], /:free$/, `${plan}/${t} must end free`);
    }
  }
});

test("pro never gets Sonnet or Haiku; it gets DeepSeek for long documents and sums, Gemini for research", () => {
  for (const t of r.TASKS) {
    const chain = all(r.modelFor(t, "pro"));
    assert.ok(!chain.includes(S.SONNET) && !chain.includes(S.HAIKU), `pro/${t}`);
  }
  assert.equal(first(r.modelFor("long_document", "pro")), S.DEEPSEEK);
  assert.equal(first(r.modelFor("calculation", "pro")), S.DEEPSEEK);
  assert.equal(first(r.modelFor("research", "pro")), S.GEMINI);
  assert.equal(first(r.modelFor("draft_writing", "pro")), S.GLM);
});

test("ultimate complex reasoning still goes through tier-router (Sonnet, or its rare Opus roll)", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(first(r.modelFor("complex_reasoning", "ultimate")));
  for (const m of seen) assert.ok([S.SONNET, process.env.TIER_OPUS_MODEL || "anthropic/claude-opus-5"].includes(m), m);
});

test("an unknown task falls back to a simple reply instead of failing", () => {
  const warn = console.warn; console.warn = () => {};
  try { assert.equal(r.modelFor("nonsense", "unlimited"), r.modelFor("simple_reply", "unlimited")); } finally { console.warn = warn; }
});

test("department messages: long text is a long document, finance and payroll are calculations, the rest are drafts", () => {
  assert.equal(r.classifyDepartmentMessage("sales", "x".repeat(1300)), "long_document");
  assert.equal(r.classifyDepartmentMessage("finance", "total these"), "calculation");
  assert.equal(r.classifyDepartmentMessage("payroll", "p60 date?"), "calculation");
  assert.equal(r.classifyDepartmentMessage("hr", "write a job post"), "draft_writing");
  assert.equal(r.classifyDepartmentMessage("finance", "y".repeat(2000)), "long_document");
});

test("recordUse logs each choice and counts it", () => {
  const log = console.log; console.log = () => {};
  try {
    r.recordUse({ task: "research", plan: "pro", chain: `${S.GEMINI},${S.GLM}` });
    r.recordUse({ task: "research", plan: "pro", chain: `${S.GEMINI},${S.GLM}` });
  } finally { console.log = log; }
  const s = r.usageStats();
  assert.ok(s.counts[`research|${S.GEMINI}`] >= 2);
  assert.equal(s.recent[s.recent.length - 1].task, "research");
});
