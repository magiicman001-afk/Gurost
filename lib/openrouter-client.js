/**
 * OpenRouter client — Gurost's single AI gateway. Every model call in
 * this codebase (Claude, and the alternate providers smart-router.js
 * offers) goes through here.
 *
 * REPLACES omniroute-client.js, and the reason is worth recording
 * plainly: OmniRoute (https://omniroute.online) turned out to be a
 * real, but self-hosted, project — meant to run as its own separate
 * program, on its own machine, that this backend would then be
 * pointed at. It was never actually set up anywhere. Every single
 * deploy, from the very first one through the most recent, tried to
 * reach it at the literal address "localhost" on Render's own
 * container — nothing was ever listening there. That's the real,
 * confirmed reason every AI-calling feature (generation, audit,
 * review) has been silently stuck since this codebase started routing
 * everything through a single gateway.
 *
 * Also worth recording: Socket.dev blocked the OmniRoute npm package
 * in May 2026 over potential malware and obfuscated code. The
 * maintainer patched two real, acknowledged vulnerabilities afterward
 * and no malware was ultimately confirmed — but installing a
 * third-party, self-hosted tool with that history directly onto a
 * server holding Gurost's own real credentials (Supabase keys, JWT
 * secret, email credentials) wasn't a risk worth taking when a real,
 * already-hosted alternative does the same job.
 *
 * OpenRouter (https://openrouter.ai, real, established, hosted — not
 * self-hosted, nothing to install or keep running) uses the exact
 * same OpenAI-compatible request/response shape OmniRoute did, so the
 * shape-translation logic below is unchanged from before — only the
 * base URL, the API key env var, and the model name format actually
 * changed. Real base URL and model slugs confirmed directly against
 * openrouter.ai's own docs before writing this, not assumed:
 *   - Base URL: https://openrouter.ai/api/v1
 *   - Claude Sonnet 4.5: "anthropic/claude-sonnet-4.5"
 *   - Claude Haiku 4.5: "anthropic/claude-haiku-4.5"
 *   (note the provider prefix and the period before the minor version
 *   — neither existed in the old, Anthropic-native model strings this
 *   codebase used before routing through a gateway.)
 */

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("Missing OPENROUTER_API_KEY — set it before starting the server. All model calls in Gurost route through OpenRouter.");
  process.exit(1);
}

/**
 * `system` and `messages` follow the SAME calling convention every bot
 * in this codebase already uses (a system string + an array of
 * {role, content} turns) — this function does the Anthropic-shape ->
 * OpenAI-shape translation internally, so callers don't have to change
 * how they call it, only what's underneath.
 */
async function callOpenRouter({ model, system, messages, maxTokens = 4000 }) {
  const openAiMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages
  ];

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      // Optional per OpenRouter's own docs — identifies this app on
      // their leaderboards, doesn't affect whether calls work.
      "HTTP-Referer": "https://gurost.onrender.com",
      "X-Title": "Gurost"
    },
    body: JSON.stringify({
      model,
      messages: openAiMessages,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter error (${response.status}) calling model "${model}": ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (text === undefined) {
    throw new Error(`Unexpected OpenRouter response shape — no choices[0].message.content. Raw: ${JSON.stringify(data).slice(0, 300)}`);
  }

  // Normalized back to the input_tokens/output_tokens shape the rest of
  // this codebase already expects (claude_usage_log, admin dashboard
  // cost estimates, etc.), so nothing downstream needs to know
  // OpenRouter returns OpenAI-style prompt_tokens/completion_tokens
  // internally.
  const usage = data.usage
    ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
    : null;

  return { text, usage, model };
}

module.exports = { callOpenRouter, OPENROUTER_BASE_URL };
