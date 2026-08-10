/**
 * Gurost Business Assistant.
 *
 * Handles emails, blog posts, marketing copy, customer response templates,
 * social media content, and analytics suggestions for the user's business.
 *
 * Per this round's scope: no persistent memory. Proactive suggestions and
 * voice handling both work, but nothing here is written to a database —
 * "recent task types" for the suggestion prompt is passed in by the caller
 * from in-memory project state (session-only, gone on restart). Swap in
 * calls to guide/memory-client.js (or a dedicated business-memory table)
 * when persistence comes online.
 */

const crypto = require("crypto");
const { callClaude, CLAUDE_MODEL, CLAUDE_MODEL_FAST } = require("../lib/claude-client");
const userLearning = require("../user-learning");
const plainEnglishBot = require("../plain-english");

const TASK_SYSTEM = `You are Gurost Business Assistant. You help users run their business.
You write emails, blogs, marketing copy, customer response templates, and social media posts.
You know the user's business type, products, and audience from the context you're given. You may also receive industry-specific terminology and common pain points for their sector — use it naturally where it fits, don't force jargon into content that doesn't need it.

Output ONLY valid JSON, no preamble, no markdown fences:
{"content": "...", "type": "email"|"blog_post"|"marketing_copy"|"customer_response"|"social_post"|"analytics_insight"|"other"}

Rules:
- Match tone to the business context (a bakery's social post reads differently than a B2B SaaS one).
- Keep content ready to use as-is — no placeholder brackets like [Your Name] unless the business context genuinely doesn't supply that detail.`;

const SUGGESTION_SYSTEM = `You are Gurost Business Assistant, proactively offering to help run a business.

You will receive the business context, a list of task types the user has requested recently in this session, and optionally industry-specific context (common pain points, terminology) for their sector.

Output ONLY valid JSON:
{"suggestions": [{"message": "...", "reasoning": "one sentence explaining WHY this fits THIS business specifically — not generic marketing advice", "type": "email"|"blog_post"|"marketing_copy"|"customer_response"|"social_post"|"analytics_insight", "action_hint": "one short instruction that could be sent directly as a task if the user accepts"}]}

Rules:
- Offer at most 2 suggestions. Don't overwhelm the user.
- Prefer suggestions that fit the business type and complement, rather than repeat, recent task types.
- If industry context is provided, let it inform WHICH suggestions you make (e.g. a manufacturing business gets an OEE-tracking suggestion, not a generic "post more on social media" one) — don't just sprinkle industry vocabulary into an otherwise generic suggestion.
- Be specific ("draft a launch announcement email for your new spring menu" not "write some marketing content").
- "reasoning" must reference something concrete (the business type, a recent task, industry context) — never a justification generic enough to apply to any business.
- If nothing timely comes to mind, return an empty suggestions array rather than inventing filler.`;

// Same heuristic router as before — cheap/fast tasks to Haiku, anything that
// smells like multi-step reasoning to Sonnet. Not a tuned classifier; watch
// your real task mix and adjust the signal list.
const COMPLEX_SIGNALS = ["strategy", "analysis", "campaign", "competitor", "multi-step", "quarterly", "plan"];

function isComplexTask(task) {
  const lower = task.toLowerCase();
  return COMPLEX_SIGNALS.some((s) => lower.includes(s)) || task.length > 400;
}

async function handleTask(businessContext, task, { industryContext, forcePriorityModel, userId, workspaceId, plainEnglish } = {}) {
  const model = (forcePriorityModel || isComplexTask(task)) ? CLAUDE_MODEL : CLAUDE_MODEL_FAST;
  const contextBlock = industryContext
    ? `Business context:\n${businessContext}\n\nIndustry context (use this terminology and these known pain points where relevant, don't force it if the task doesn't call for it):\n${industryContext}\n\nTask: ${task}`
    : `Business context:\n${businessContext}\n\nTask: ${task}`;

  // Real, additive, and optional — if userId isn't passed, or no style
  // profile exists yet (new user, or fewer than 3 real data points),
  // this degrades to exactly the prior behavior. See user-learning.js
  // for what this actually learns from (real in-product interaction
  // history) and what it explicitly doesn't (no external email/calendar
  // access).
  const styleClause = userId ? await userLearning.styleClauseFor(userId).catch(() => "") : "";

  const { parsed, usage } = await callClaude({
    system: TASK_SYSTEM + styleClause,
    messages: [{ role: "user", content: contextBlock }],
    maxTokens: 2000,
    model,
    context: { userId, workspaceId }
  });

  // Plain English Mode — real, but only for the dynamic content field,
  // not the whole response object, and only when explicitly asked for.
  // A second real Claude call, so this genuinely costs a little extra
  // latency/tokens when enabled — not free, and not hidden.
  if (plainEnglish) {
    try {
      parsed.content = await plainEnglishBot.simplifyText(parsed.content);
    } catch {
      // Simplification failing shouldn't lose the real, already-good
      // output — fall back to the normal version rather than error out.
    }
  }

  return { output: parsed, modelUsed: model, usage };
}

async function suggestActions(businessContext, recentTaskTypes = [], { industryContext, forcePriorityModel } = {}) {
  const { parsed, usage } = await callClaude({
    system: SUGGESTION_SYSTEM,
    messages: [{
      role: "user",
      content: JSON.stringify({ businessContext, recentTaskTypes, industryContext: industryContext || undefined })
    }],
    maxTokens: 600,
    model: forcePriorityModel ? CLAUDE_MODEL : CLAUDE_MODEL_FAST
  });

  const suggestions = (parsed.suggestions || []).map((s) => ({
    id: crypto.randomUUID(),
    ...s,
    ts: Date.now()
  }));

  return { suggestions, usage };
}

// Interprets a transcribed voice response against a pending suggestion —
// same accept/reject/custom pattern as the Guide Bot, for consistency
// across both voice-driven flows.
function classifyVoiceResponse(transcript) {
  const t = (transcript || "").trim().toLowerCase();
  if (/^(yes|yeah|yep|sure|do it|go ahead|write it|okay|ok)\b/.test(t)) return { intent: "accept" };
  if (/^(no|nope|skip|don't|not now|leave it)\b/.test(t)) return { intent: "reject" };
  return { intent: "custom", instruction: (transcript || "").trim() };
}

module.exports = { handleTask, suggestActions, classifyVoiceResponse, isComplexTask };
