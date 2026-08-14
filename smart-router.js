/**
 * Smart Router — multi-model orchestration, now entirely on top of
 * OpenRouter (lib/openrouter-client.js) as the single AI gateway.
 *
 * REPLACES OmniRoute here too, same real reason as claude-client.js:
 * OmniRoute needed self-hosting that was never set up, and every
 * deploy silently failed trying to reach "localhost" on Render.
 *
 * REAL SIMPLIFICATION worth knowing about, not just a refactor detail:
 * before a single gateway existed, this file made four separate
 * hardcoded fetch calls, each to a different vendor's own API
 * (Anthropic, Google, DeepSeek, OpenAI), each needing its OWN API key
 * in Gurost's .env. Now there's one call shape and one gateway.
 * Gemini/DeepSeek/GPT-5.6 provider access comes through OpenRouter's
 * own account/billing instead — GEMINI_API_KEY/DEEPSEEK_API_KEY/
 * OPENAI_API_KEY are no longer read anywhere in this file.
 *
 * CORRECTION, load-bearing, not a footnote: Fable 5 is not a separate
 * third-party model alongside Gemini/DeepSeek/GPT-5.6 — it's Anthropic's
 * own Mythos-tier Claude model (the safety-hardened sibling of Claude
 * Mythos 5). Listing "Claude" and "Fable 5" as two different systems to
 * route between misunderstands what it is. This router treats Claude
 * (Sonnet/Haiku, already the whole basis of this codebase) as the
 * orchestrator and default, and offers Gemini/DeepSeek as genuinely
 * separate cost-tier providers for simple tasks. GPT-5.6 (OpenAI,
 * launched publicly July 9 2026 — verified, not assumed) is included
 * as a real fourth option for its stated coding strength.
 *
 * Model slug confidence, stated honestly rather than uniformly
 * asserted: "google/gemini-2.5-flash" and "deepseek/deepseek-chat-v3.1"
 * were both directly confirmed against a real, current OpenRouter
 * model listing before writing this. GPT-5.6's exact OpenRouter slug
 * was NOT found with the same confidence — "gpt-5.6-terra" below is
 * carried over from the pre-gateway code, not freshly verified. Check
 * `GET {OPENROUTER_BASE_URL}/models` if that specific path stops
 * resolving; the Claude and Gemini paths are on firmer ground.
 */

const { callClaude, CLAUDE_MODEL, CLAUDE_MODEL_FAST } = require("./lib/claude-client");
const { callOpenRouter } = require("./lib/openrouter-client");

const PROVIDER_MODELS = {
  gemini: process.env.OPENROUTER_GEMINI_MODEL || "google/gemini-2.5-flash",
  deepseek: process.env.OPENROUTER_DEEPSEEK_MODEL || "deepseek/deepseek-chat-v3.1",
  "gpt-5.6": process.env.GPT56_MODEL || "gpt-5.6-terra" // Unverified OpenRouter slug — see header note above.
};

async function callViaOpenRouter(providerKey, system, taskText, maxTokens) {
  const { text } = await callOpenRouter({
    model: PROVIDER_MODELS[providerKey],
    system,
    messages: [{ role: "user", content: taskText }],
    maxTokens
  });
  return text;
}

const ROUTE_SYSTEM = `You are routing a task to the right bot AND the right model tier.

Output ONLY valid JSON:
{"bot": "website"|"app"|"image"|"meeting"|"assistant"|"plan"|"coding"|"unclear", "complexity": "simple"|"complex", "reasoning": "one sentence"}

Rules:
- "simple": short, well-defined, low-ambiguity (a one-line email, a quick fact lookup).
- "complex": multi-step reasoning, architecture decisions, anything where getting it wrong is costly.
- Bot categories match the existing routes: website/app generation, image sourcing, meeting transcription, business assistant tasks, pre-build planning, or coding suggestions.`;

async function classify(taskText) {
  const { parsed } = await callClaude({
    system: ROUTE_SYSTEM,
    messages: [{ role: "user", content: taskText }],
    maxTokens: 200,
    model: CLAUDE_MODEL_FAST
  });
  return parsed;
}

/**
 * Routes to a specific provider/tier. `preferProvider` lets a caller
 * force a choice; otherwise defaults to Claude (this codebase's actual
 * orchestrator throughout) with cheap-tier Claude for simple tasks —
 * NOT auto-switching to a different company's model without being
 * asked to, since cross-provider output quality/safety behavior isn't
 * something this router can guarantee equivalence on.
 *
 * IMPORTANT constraint on the Claude path specifically:
 * lib/claude-client.js's callClaude() always parses the response as
 * JSON — that's the contract every other bot in this codebase follows.
 * If you route to Claude, `system` MUST instruct JSON output (e.g.
 * `{"result": "..."}`) or this throws. Gemini/DeepSeek/GPT-5.6 below
 * return raw text with no such constraint — that asymmetry is real,
 * not an oversight, and worth knowing before wiring a caller that
 * assumes uniform behavior across providers. All four paths now share
 * the same underlying transport (OpenRouter); this asymmetry is about
 * Gurost's own JSON contract on the Claude path, not about OpenRouter.
 */
async function route(taskText, { system, maxTokens = 2000, preferProvider } = {}) {
  const classification = await classify(taskText);
  const provider = preferProvider || "claude";

  let text;
  const effectiveSystem = system || "You are a helpful assistant. Respond in plain text.";

  switch (provider) {
    case "gemini":
    case "deepseek":
    case "gpt-5.6":
      text = await callViaOpenRouter(provider, effectiveSystem, taskText, maxTokens);
      break;
    case "claude":
    default: {
      if (!system) {
        throw new Error("Routing to Claude requires a 'system' prompt that instructs JSON output — see this function's header comment.");
      }
      const model = classification.complexity === "simple" ? CLAUDE_MODEL_FAST : CLAUDE_MODEL;
      const { parsed } = await callClaude({ system, messages: [{ role: "user", content: taskText }], maxTokens, model });
      text = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    }
  }

  return { ...classification, provider, output: text };
}

module.exports = { route, classify };
