/**
 * Plan Mode: 1 credit, produces a structured plan (steps, risks, scope
 * estimate) with zero code generation. Distinct from the Revamp Engine's
 * /api/revamp/audit (which is specifically for auditing an existing
 * live website) — this is a general-purpose pre-build planning call for
 * any task, new or existing.
 */

const { callClaude } = require("../lib/claude-client");
const { deductCredits } = require("../lib/billing");

const PLAN_SYSTEM = `You are planning a task before any code gets written. Given a task
description, produce a plan — not code.

Output ONLY valid JSON, no preamble, no markdown fences:
{"steps": ["..."], "risks": [{"description": "...", "severity": "high"|"medium"|"low"}], "scope_estimate": "small"|"medium"|"large", "clarifying_questions": ["..."]}

Rules:
- Steps should be concrete and ordered, not vague ("set up the database" not "handle the backend").
- Risks are things that could go wrong or need a decision before building — not generic disclaimers.
- If the task is underspecified, put what you need to know in clarifying_questions rather than guessing and presenting the guess as a plan step.
- Do not write any code. This is planning only.`;

async function investigate(userId, task) {
  const { newBalance, lowCredits } = await deductCredits(userId, 1, "plan_mode", { task: task.slice(0, 200) });

  const { parsed, usage } = await callClaude({
    system: PLAN_SYSTEM,
    messages: [{ role: "user", content: task }],
    maxTokens: 1500
  });

  return { plan: parsed, usage, creditsRemaining: newBalance, lowCredits };
}

module.exports = { investigate };
