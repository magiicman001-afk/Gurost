/**
 * Model router for the Business Assistant: picks the model by TASK, on top of
 * the plan-based choice in lib/tier-router.js (which it reuses, not replaces).
 *
 * Every task declares one of TASKS. modelFor(task, plan) returns an OpenRouter
 * model string: up to three comma-separated slugs, tried in order (see
 * lib/openrouter-client.js), always ending in a free model so a chat is never
 * left with nothing to answer it.
 *
 * Plans:
 *   free      always the free chain, whatever the task
 *   pro       GLM for most tasks; DeepSeek for long documents and sums;
 *             Gemini for research. No Sonnet or Haiku, to keep Pro's cost flat
 *   unlimited / ultimate   the full table below (ultimate keeps tier-router's
 *             rare Opus escalation for complex reasoning)
 *
 * Slugs checked on OpenRouter's model pages on 2026-10-07. Gemini 3.1 Pro is
 * a PREVIEW model and has no built-in web search on OpenRouter, so research
 * that needs the live web must use a search tool, not this model alone.
 * Every slug can be overridden with an env var if one stops resolving.
 */
const { modelForTier } = require("./tier-router");

const GLM = process.env.ROUTER_SIMPLE_MODEL || "z-ai/glm-5.2";
const SONNET = process.env.TIER_COMPLEX_MODEL || "anthropic/claude-sonnet-5";
const HAIKU = process.env.ROUTER_DRAFT_MODEL || "anthropic/claude-haiku-4.5";
const DEEPSEEK = process.env.ROUTER_DEEPSEEK_MODEL || "deepseek/deepseek-v4-pro-0813";
const GEMINI = process.env.RESEARCH_AGENT_MODEL || process.env.ROUTER_RESEARCH_MODEL || "google/gemini-3.1-pro-preview";
const FREE_LAST = process.env.ROUTER_FREE_FALLBACK || "nvidia/nemotron-3-super-120b-a12b:free";

const TASKS = ["simple_reply", "complex_reasoning", "long_document", "research", "calculation", "draft_writing"];

// Preferred models per task for the full tiers, best first.
const FULL = {
  simple_reply: [GLM],
  complex_reasoning: [SONNET, GLM],
  long_document: [DEEPSEEK, GEMINI],
  research: [GEMINI, DEEPSEEK],
  calculation: [DEEPSEEK, GLM],
  draft_writing: [HAIKU, GLM]
};

// Pro: the same shape, but only the cheaper models.
const PRO = {
  simple_reply: [GLM],
  complex_reasoning: [GLM],
  long_document: [DEEPSEEK, GLM],
  research: [GEMINI, GLM],
  calculation: [DEEPSEEK, GLM],
  draft_writing: [GLM]
};

const unique = (list) => list.filter((m, i) => m && list.indexOf(m) === i);
const withFreeLast = (models) => unique([...models.slice(0, 2), FREE_LAST]).join(",");

function modelFor(task, plan) {
  let t = task;
  if (!TASKS.includes(t)) {
    console.warn(`[model-router] unknown task "${task}", treating it as simple_reply`);
    t = "simple_reply";
  }
  if (plan === "unlimited" || plan === "ultimate") {
    const list = FULL[t].slice();
    if (t === "complex_reasoning") list[0] = modelForTier(plan, { complex: true }); // keeps Ultimate's rare Opus roll
    return withFreeLast(list);
  }
  if (plan === "pro") return withFreeLast(PRO[t]);
  return modelForTier("free"); // free, or any plan we do not recognise
}

const MATH_BOTS = new Set(["finance", "payroll"]);
const LONG_MESSAGE = 1200;

/** What kind of task is this department-bot message? */
function classifyDepartmentMessage(botId, message) {
  const text = String(message || "");
  if (text.length > LONG_MESSAGE) return "long_document";
  if (MATH_BOTS.has(botId)) return "calculation";
  return "draft_writing";
}

// What was actually asked for, kept in memory for the audit trail and the
// admin view (later parts). Resets on every deploy, like PROJECTS.
const RECENT = [];
const COUNTS = new Map();
const MAX_RECENT = 200;

function recordUse({ task, plan, chain }) {
  const first = String(chain || "").split(",")[0] || "unknown";
  const entry = { at: new Date().toISOString(), task, plan: plan || "free", firstChoice: first, chain };
  RECENT.push(entry);
  if (RECENT.length > MAX_RECENT) RECENT.shift();
  const key = `${task}|${first}`;
  COUNTS.set(key, (COUNTS.get(key) || 0) + 1);
  console.log(`[model-router] task=${task} plan=${entry.plan} first=${first}`);
  return entry;
}

function usageStats() {
  return { recent: RECENT.slice(-50), counts: Object.fromEntries(COUNTS) };
}

module.exports = { TASKS, modelFor, classifyDepartmentMessage, recordUse, usageStats, _slugs: { GLM, SONNET, HAIKU, DEEPSEEK, GEMINI, FREE_LAST } };
