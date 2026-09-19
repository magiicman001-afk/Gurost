/**
 * Gurost Guide Bot.
 *
 * Two honest notes before the code:
 *
 * 1. "Always active, conscious of context" is implemented as: an initial
 *    check on connect, a bounded interval, and hooks meant to fire after
 *    generate/select/correct actions (wire these in server.js). It is
 *    not a continuously-reasoning process — running a Claude call on
 *    every keystroke or DOM mutation would be both absurdly expensive
 *    and mostly noise. Event-triggered + interval-bounded gets you the
 *    "feels always-on" experience without that cost.
 *
 * 2. "Self-learning" means: every accepted/rejected suggestion and every
 *    explicit preference is stored (see memory-client.js) and fed back
 *    into the prompt as context on the next check. The model itself
 *    does not change or get fine-tuned — only what it's told changes.
 *    That's genuinely how you get "gets smarter over time" behavior
 *    from a stateless API, it's just worth being precise that it's
 *    prompt-context learning, not weight updates.
 */

const crypto = require("crypto");
const { callClaude, CLAUDE_MODEL_FAST } = require("../lib/claude-client");
const memory = require("./memory-client");

const SUGGESTION_SYSTEM = `You are Gurost Guide Bot, a proactive assistant helping a user build a website.

You will receive: the project type, a list of standard sections detected as missing, the user's stored style preferences, and their recent accept/reject history on past suggestions.

Output ONLY valid JSON:
{"suggestions": [{"message": "...", "reasoning": "one sentence explaining WHY this suggestion applies to this specific project — not generic advice, tied to what you were actually given", "type": "missing_section"|"enhancement"|"style", "action_hint": "one short instruction that could be sent directly to a code-patching bot if the user accepts"}]}

Rules:
- Offer at most 2 suggestions. Don't overwhelm the user.
- Do not repeat a suggestion the user has rejected a similar version of before.
- Weight suggestions toward patterns the user has accepted before (colors, styles, sections they tend to want).
- Be specific and actionable ("add a contact form with name, email, and message fields" not "improve your site").
- "reasoning" must reference something concrete about THIS project or THIS user's history (e.g. "you're building a bakery site and most bakery sites include a menu" or "you accepted a similar layout change last time") — never a generic justification that could apply to any project.
- If nothing meaningful is missing or improvable right now, return an empty suggestions array rather than inventing something.`;

const STANDARD_SECTIONS = [
  { key: "nav", label: "navigation menu", patterns: [/<nav/i] },
  { key: "contact", label: "contact section", patterns: [/contact/i] },
  { key: "about", label: "about section", patterns: [/about/i] },
  { key: "footer", label: "footer", patterns: [/<footer/i] },
  { key: "cta", label: "call-to-action button", patterns: [/get started|sign up|book now|order now|contact us/i] }
];

function detectMissingSections(html) {
  if (!html) return STANDARD_SECTIONS.map((s) => s.key);
  return STANDARD_SECTIONS.filter((s) => !s.patterns.some((p) => p.test(html))).map((s) => s.key);
}

async function analyzeAndSuggest(project, userId) {
  const missing = detectMissingSections(project.currentHtml);
  const [preferences, pastDecisions] = await Promise.all([
    memory.getPreferences(userId),
    memory.getPastDecisions(userId, 20)
  ]);

  // Nothing missing and no HTML to improve yet — skip the API call entirely.
  if (!project.currentHtml) return { suggestions: [], usage: null };

  const context = {
    projectType: project.type,
    missingSections: missing,
    preferences,
    recentDecisions: pastDecisions.map((d) => ({ message: d.suggestion_message, decision: d.decision }))
  };

  const { parsed, usage } = await callClaude({
    system: SUGGESTION_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(context) }],
    maxTokens: 800,
    model: CLAUDE_MODEL_FAST // frequent, low-stakes calls — don't spend Sonnet-level tokens on these
  });

  const suggestions = (parsed.suggestions || []).map((s) => ({
    id: crypto.randomUUID(),
    ...s,
    ts: Date.now()
  }));

  return { suggestions, usage };
}

async function recordResponse(userId, suggestion, decision, note) {
  await memory.recordDecision(userId, suggestion, decision, note);
}

// Interprets a transcribed voice response against a pending suggestion.
function classifyVoiceResponse(transcript) {
  const t = (transcript || "").trim().toLowerCase();
  if (/^(yes|yeah|yep|sure|do it|go ahead|add it|okay|ok)\b/.test(t)) return { intent: "accept" };
  if (/^(no|nope|skip|don't|not now|leave it)\b/.test(t)) return { intent: "reject" };
  return { intent: "custom", instruction: transcript.trim() };
}

module.exports = { analyzeAndSuggest, recordResponse, detectMissingSections, classifyVoiceResponse };
