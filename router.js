/**
 * Routes free-text input to the right bot. Two routing decisions
 * happen here, not one:
 *  1. WHICH BOT — website / app / image / meeting task classification.
 *  2. WHICH MODEL — the classification call itself always uses the
 *     cheap model (CLAUDE_MODEL_FAST); the routing decision for the
 *     downstream bot's own model choice is left to that bot (e.g.
 *     assistant-bot.js's isComplexTask already does simple/complex
 *     routing internally) — this module doesn't override that, it just
 *     decides WHICH bot's routing logic gets to run.
 *
 * This is a dispatcher, not a new bot — it doesn't replace calling
 * bots directly when you already know which one you want (most of
 * server.js's routes do, and should keep doing that). This exists for
 * the "one text box" simplicity goal — a single input that figures out
 * where to send itself.
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");

const ROUTE_SYSTEM = `You are routing a free-text request to the right bot.

Output ONLY valid JSON: {"target": "website"|"app"|"image"|"meeting"|"assistant"|"plan"|"unclear", "confidence": "high"|"medium"|"low", "reasoning": "one sentence"}

Rules:
- "website": building/editing a simple site.
- "app": building a full-stack app (frontend + backend + database).
- "image": explicitly about adding/changing images on a page.
- "meeting": anything about a call, meeting notes, or transcripts.
- "assistant": business content (emails, marketing, social posts) or general business questions.
- "plan": explicitly asking to plan/investigate before building anything.
- "unclear": genuinely ambiguous — don't force a guess into one of the above if it doesn't fit.`;

async function routeTask(text) {
  const { parsed } = await callClaude({
    system: ROUTE_SYSTEM,
    messages: [{ role: "user", content: text }],
    maxTokens: 200,
    model: CLAUDE_MODEL_FAST
  });
  return parsed;
}

module.exports = { routeTask };
