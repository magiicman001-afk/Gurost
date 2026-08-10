/**
 * OmniRoute client — Gurost's single AI gateway. Every model call in
 * this codebase (Claude, and the alternate providers smart-router.js
 * offers) goes through here now, per an explicit "all requests" scope.
 *
 * OmniRoute (https://omniroute.online, verified real before writing
 * this) is a local, OpenAI-compatible gateway — NOT Anthropic-format.
 * That's a real shape difference, not just a URL swap:
 *   - System prompt goes IN the messages array as {role: "system"},
 *     not as a separate top-level `system` field like Anthropic's API.
 *   - The response is `choices[0].message.content`, not `content[0].text`.
 *   - Usage is `usage.prompt_tokens`/`usage.completion_tokens`, not
 *     `usage.input_tokens`/`usage.output_tokens` — callers that log
 *     usage need to know this if they read raw fields directly.
 *
 * OPERATIONAL CAVEAT, read before deploying anywhere but localhost:
 * OMNIROUTE_BASE_URL defaults to http://localhost:20128/v1, matching
 * a local OmniRoute instance. That only resolves correctly if Gurost's
 * own backend process and OmniRoute are running on the SAME machine.
 * If Gurost's backend is deployed (Render, etc.) while OmniRoute stays
 * on a developer laptop, the deployed backend cannot reach it — you'd
 * need OmniRoute's hosted gateway (cloud.omniroute.online/v1, per their
 * own docs) or a self-hosted OmniRoute instance reachable from wherever
 * this backend actually runs, set via OMNIROUTE_BASE_URL.
 *
 * This supersedes headroom-integration.js's endpoint redirection for
 * Claude calls specifically — headroom-integration.js still exists and
 * its compression logic is a separate concern from which endpoint gets
 * called, but since "all requests" was explicit and unconditional,
 * OmniRoute is now the endpoint every call actually hits, not
 * Headroom's proxy. If you want both (compression AND multi-provider
 * routing), point OMNIROUTE_BASE_URL at a Headroom proxy that itself
 * forwards to your real providers, rather than running them as two
 * competing redirects of the same call.
 */

const OMNIROUTE_BASE_URL = process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1";
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY;

if (!OMNIROUTE_API_KEY) {
  console.error("Missing OMNIROUTE_API_KEY — set it before starting the server. All model calls in Gurost now route through OmniRoute.");
  process.exit(1);
}

/**
 * `system` and `messages` follow the SAME calling convention every bot
 * in this codebase already uses (a system string + an array of
 * {role, content} turns) — this function does the Anthropic-shape ->
 * OpenAI-shape translation internally, so callers don't have to change
 * how they call it, only what's underneath.
 */
async function callOmniRoute({ model, system, messages, maxTokens = 4000 }) {
  const openAiMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages
  ];

  const response = await fetch(`${OMNIROUTE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OMNIROUTE_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: openAiMessages,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OmniRoute error (${response.status}) calling model "${model}": ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (text === undefined) {
    throw new Error(`Unexpected OmniRoute response shape — no choices[0].message.content. Raw: ${JSON.stringify(data).slice(0, 300)}`);
  }

  // Normalized back to the input_tokens/output_tokens shape the rest of
  // this codebase already expects (claude_usage_log, admin dashboard
  // cost estimates, etc.), so nothing downstream needs to know OmniRoute
  // returns OpenAI-style prompt_tokens/completion_tokens internally.
  const usage = data.usage
    ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
    : null;

  return { text, usage, model };
}

module.exports = { callOmniRoute, OMNIROUTE_BASE_URL };
