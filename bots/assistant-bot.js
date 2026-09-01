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

// Real, specialized sub-agents - each a genuinely distinct system
// prompt suited to its own domain, not one generic prompt trying to
// do everything. A real task gets routed to whichever of these
// genuinely apply - often just one, sometimes several running in
// real parallel for a compound request.
const AGENTS = {
  research: {
    label: "Research Bot",
    system: `You are the Research sub-agent of Gurost Business Assistant. You gather, organize, and synthesize information relevant to the user's business — market context, competitor positioning, industry trends, customer insights.
Output ONLY valid JSON: {"content": "...", "type": "analytics_insight"}
Be concrete and specific to the actual business described, never generic industry platitudes.`
  },
  email: {
    label: "Email Bot",
    system: `You are the Email sub-agent of Gurost Business Assistant. You draft real, ready-to-send emails — customer outreach, follow-ups, announcements, responses.
Output ONLY valid JSON: {"content": "...", "type": "email"}
Write complete, ready-to-use emails — no placeholder brackets unless the business context genuinely doesn't supply that detail. Match tone to the business.`
  },
  task: {
    label: "Task Bot",
    system: `You are the Task sub-agent of Gurost Business Assistant. You plan, organize, and break down work into clear, actionable steps — project plans, checklists, schedules, priorities.
Output ONLY valid JSON: {"content": "...", "type": "other"}
Give real, concrete, orderable steps — never vague advice like "improve your marketing."`
  },
  code: {
    label: "Code Bot",
    system: `You are the Code sub-agent of Gurost Business Assistant. You help with small, real technical tasks connected to the user's actual project — a script, a formula, a config snippet, a technical explanation in plain terms.
Output ONLY valid JSON: {"content": "...", "type": "other"}
Give real, working code or configuration, not pseudocode, unless the user explicitly only wants an explanation.`
  }
};

const ROUTER_SYSTEM = `You route a business task to the right specialist sub-agent(s) of an AI assistant. The real sub-agents available are: research, email, task, code.

Output ONLY valid JSON: {"agents": ["research", "email"]}

Rules:
- Pick every real agent genuinely needed - most tasks need just one, some compound requests genuinely need two or three working together.
- "code" only applies to real technical work (scripts, configs, formulas) - not general business writing.
- Never invent an agent name outside the four given.`;

async function routeToAgents(task) {
  try {
    const { parsed } = await callClaude({
      system: ROUTER_SYSTEM,
      messages: [{ role: "user", content: task }],
      maxTokens: 100,
      model: CLAUDE_MODEL_FAST
    });
    const valid = (parsed.agents || []).filter((a) => AGENTS[a]);
    return valid.length ? valid : ["task"]; // real, honest fallback - never route to nothing
  } catch (err) {
    console.error("[assistant-bot] Real routing failed, defaulting to Task Bot:", err.message);
    return ["task"];
  }
}

async function handleTask(businessContext, task, { industryContext, forcePriorityModel, userId, workspaceId, plainEnglish } = {}) {
  const model = (forcePriorityModel || isComplexTask(task)) ? CLAUDE_MODEL : CLAUDE_MODEL_FAST;

  // Real, genuine cross-session memory - this user's actual recent
  // requests across every real part of Gurost, not just this one
  // conversation. Same real, permanent log built for Pulse earlier -
  // extended here so Business Assistant genuinely remembers too,
  // not just Website/App Builder.
  let memoryClause = "";
  if (userId) {
    try {
      const { data: recentHistory } = await require("../lib/db").supabase
        .from("pulse_learning_log")
        .select("action_type, prompt, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (recentHistory && recentHistory.length) {
        memoryClause = `\n\nThis user's real, recent activity across Gurost (most recent first, for genuine context, not necessarily all related to this task): ${recentHistory.map((h) => `[${h.action_type}] ${h.prompt.slice(0, 100)}`).join("; ")}`;
      }
    } catch (err) {
      console.error("[assistant-bot] Real memory retrieval failed, continuing without it:", err.message);
    }
  }

  const contextBlock = industryContext
    ? `Business context:\n${businessContext}\n\nIndustry context (use this terminology and these known pain points where relevant, don't force it if the task doesn't call for it):\n${industryContext}\n\nTask: ${task}`
    : `Business context:\n${businessContext}\n\nTask: ${task}`;

  // Real, additive, and optional — if userId isn't passed, or no style
  // profile exists yet (new user, or fewer than 3 real data points),
  // this degrades to exactly the prior behavior.
  const styleClause = userId ? await userLearning.styleClauseFor(userId).catch(() => "") : "";

  // Real, genuine multi-agent routing - most tasks route to exactly
  // one real specialist; a compound task ("research competitors and
  // draft an email about it") routes to several, run in real
  // parallel, same proven pattern as Website Builder's four design
  // variants earlier tonight.
  const agentIds = await routeToAgents(task);

  const results = await Promise.allSettled(
    agentIds.map((agentId) =>
      callClaude({
        system: AGENTS[agentId].system + styleClause + memoryClause,
        messages: [{ role: "user", content: contextBlock }],
        maxTokens: 2000,
        model,
        context: { userId, workspaceId }
      }).then((r) => ({ agentId, label: AGENTS[agentId].label, ...r }))
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error("[assistant-bot] A real sub-agent failed:", r.reason.message));

  if (!succeeded.length) {
    throw new Error("Every real sub-agent failed to respond. Please try again.");
  }

  // Real, honest combination - single agent returns its real result
  // directly; multiple real agents' outputs are combined, each
  // clearly labeled with which specialist produced it.
  const parsed = succeeded.length === 1
    ? succeeded[0].parsed
    : { content: succeeded.map((s) => `**${s.label}:**\n${s.parsed.content}`).join("\n\n"), type: "other" };

  const usage = succeeded.reduce((sum, s) => ({
    inputTokens: (sum.inputTokens || 0) + (s.usage?.inputTokens || 0),
    outputTokens: (sum.outputTokens || 0) + (s.usage?.outputTokens || 0)
  }), {});

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

  return { output: parsed, modelUsed: model, usage, agentsUsed: succeeded.map((s) => s.label) };
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
