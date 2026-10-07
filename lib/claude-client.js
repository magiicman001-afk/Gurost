/**
 * Shared Claude API client. Every bot calls through here so model
 * selection, JSON parsing, and error handling stay in one place.
 *
 * All calls route through OpenRouter (lib/openrouter-client.js), a
 * real, hosted gateway — see that file for why this replaced
 * OmniRoute (which turned out to require self-hosting that was never
 * actually set up, and had a real, documented npm security incident).
 * Same OpenAI-compatible request/response shape either way.
 *
 * headroom-integration.js previously redirected this same endpoint
 * decision for token-compression purposes. It's no longer imported
 * here — OpenRouter is now the single source of truth for where calls
 * go. headroom-integration.js still exists if you want to point
 * OPENROUTER_BASE_URL at a Headroom proxy that itself forwards to
 * your real providers.
 *
 * Also logs token usage to claude_usage_log — attributed per
 * user/workspace when the caller provides it via `context`, aggregate
 * (userId/workspaceId null) otherwise. This attribution is NEW as of
 * this round, added because Business Assistant billing genuinely
 * needs real per-company Claude cost, not the aggregate-only view this
 * table previously supported. Two honest limits on it:
 *   - Only wired at the call sites updated this round (see server.js's
 *     comments near each). The other bot files that call callClaude()
 *     still log unattributed, same partial-coverage tradeoff already
 *     accepted elsewhere in this codebase — extend as you thread
 *     context through more routes, don't assume full coverage exists.
 *   - Historical rows logged before this change have no workspace_id
 *     and can't be retroactively attributed — cost reporting for past
 *     months will be incomplete for exactly that reason, not a bug in
 *     the new code.
 *
 * SQL (run once, or ALTER the existing table if claude_usage_log
 * already exists from before this round):
 *   ALTER TABLE claude_usage_log ADD COLUMN IF NOT EXISTS user_id text;
 *   ALTER TABLE claude_usage_log ADD COLUMN IF NOT EXISTS workspace_id uuid;
 *   CREATE INDEX IF NOT EXISTS ON claude_usage_log (workspace_id, created_at);
 *
 * Also passes context through to training-data.js's real, opt-in
 * generation capture (see that file's header — it's data collection
 * for a possible future fine-tuning decision, not automatic training).
 * context.feature isn't populated by any existing caller yet — same
 * partial-coverage tradeoff as the usage attribution above. Exported
 * training data will have a null feature label until individual bots
 * are updated to pass one; don't assume it's already comprehensive.
 *
 * Model strings: set as requested. Anthropic's lineup moves, and so
 * does whatever naming convention OpenRouter expects for a given
 * provider's models — check openrouter.ai/models or its own
 * `GET /v1/models` listing against CLAUDE_MODEL/CLAUDE_MODEL_FAST
 * below if a model stops resolving.
 */

const { supabase } = require("./db");
const security = require("../security");
const { callOpenRouter } = require("./openrouter-client");
const trainingData = require("../training-data");

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "anthropic/claude-sonnet-4.5";
const CLAUDE_MODEL_FAST = process.env.CLAUDE_MODEL_FAST || "anthropic/claude-haiku-4.5";

// Fire-and-forget: a logging failure (even a synchronous one, e.g. no
// database configured) must never fail the model call it describes.
function logUsage(model, usage, context) {
  if (!usage) return;
  try {
    supabase
      .from("claude_usage_log")
      .insert({
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        user_id: context?.userId || null,
        workspace_id: context?.workspaceId || null
      })
      .then(({ error }) => {
        if (error) console.warn("[claude-client] Usage log insert failed:", error.message);
      }, (err) => console.warn("[claude-client] Usage log insert failed:", err.message));
  } catch (err) {
    console.warn("[claude-client] Usage log skipped:", err.message);
  }
}

// The first complete {...} in the text (braces inside strings ignored), or null.
function firstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

// Default response parser: the reply is one JSON object. Free models often
// add a sentence (or a second fence) after a correct object - seen live
// 2026-10-07: a valid Pulse patch rejected twice for text after its closing
// brace. The first complete object is used; anything after it is ignored.
function parseJsonResponse(rawText) {
  const cleaned = rawText.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const first = firstJsonObject(cleaned);
    if (first) {
      try {
        const value = JSON.parse(first);
        console.warn(`[claude-client] Used the JSON object and ignored ${cleaned.length - first.length} chars around it.`);
        return value;
      } catch { /* fall through to the original error */ }
    }
    throw new Error(`Failed to parse response as JSON: ${err.message}. Raw: ${rawText.slice(0, 200)}`);
  }
}

/**
 * `context` is optional: `{ ip, userId, workspaceId }`, any subset.
 * `ip` attributes a detected prompt leak for violation tracking;
 * `userId`/`workspaceId` attribute token usage for real billing.
 * Every field degrades gracefully when omitted — this stays a
 * drop-in call for the many bot files that don't pass context at all.
 *
 * `parse` turns the raw model text into `parsed`; it defaults to JSON.
 * Callers whose output is a large document (variant-bot's full HTML
 * sites) pass their own, since a 30KB page inside a JSON string breaks
 * on the first mis-escaped quote.
 *
 * `onStream({ content, reasoning })` streams the reply as it arrives. It
 * sees text BEFORE the leak check and parse below (which still run on
 * the complete reply), so a caller showing streamed text must do its
 * own leak check first - see variant-bot.
 */
async function callClaude({ system, messages, maxTokens = 4000, model = CLAUDE_MODEL, context, parse = parseJsonResponse, onStream, allowTruncated = false, stopWhen }) {
  const guardedSystem = security.withGuardrail(system);

  let answeredBy = null; // the model OpenRouter says actually answered (the request may list fallbacks)
  const ask = async (msgs, onDelta) => {
    const reply = await callOpenRouter({ model, system: guardedSystem, messages: msgs, maxTokens, onDelta, allowTruncated, stopWhen });
    // Precise leak check — a long verbatim overlap between the raw output
    // and the actual system prompt, not a keyword match. See security.js
    // for why keyword-based filtering isn't used here.
    const leak = security.detectPromptLeak(reply.text, guardedSystem);
    if (leak) {
      // Log the matched text so false positives (a site legitimately
      // echoing a prompt phrase) can be told apart from real leaks.
      console.warn(`[claude-client] Potential system prompt leak detected in model output. Matched: ${JSON.stringify(leak)}`);
      security.trackViolation(context?.ip || "unknown", "prompt_leak", leak.slice(0, 100)).catch(() => {});
      throw new Error("I cannot share internal system details. I'm here to help you build.");
    }
    logUsage(model, reply.usage, context);
    answeredBy = reply.model || answeredBy;
    return reply;
  };

  let { text: rawText, usage } = await ask(messages, onStream);

  let parsed;
  try {
    parsed = parse(rawText);
  } catch (err) {
    // Code inside JSON strings (schemas, backend files) is where models
    // slip - one unescaped quote and the whole reply is lost. The JSON
    // parser's own message says where; the model gets one chance to
    // resend the same answer as valid JSON. Custom parsers (full HTML
    // pages) handle their own format and aren't retried here.
    if (parse !== parseJsonResponse) throw err;
    console.warn(`[claude-client] Invalid JSON from ${model} - asking once more. ${err.message.slice(0, 160)}`);
    const retry = await ask([
      ...messages,
      { role: "assistant", content: rawText },
      { role: "user", content: `That reply was not valid JSON (${err.message.split(". Raw:")[0].replace(/^Failed to parse response as JSON: /, "")}). Send the same answer again as ONE valid JSON object only: escape every double quote (\\") and newline (\\n) inside strings, no comments, no trailing commas, no text outside the JSON.` }
    ]);
    try {
      parsed = parse(retry.text);
    } catch (err2) {
      console.error(`[claude-client] Invalid JSON again from ${model}: ${err2.message.slice(0, 300)}`);
      throw new Error("The AI sent back a broken answer twice. Please try again.");
    }
    rawText = retry.text;
    usage = retry.usage;
  }

  // Real, opt-in-gated, non-blocking capture — see training-data.js's
  // header for exactly what this does and doesn't do. Uses the raw
  // user message (messages[0]?.content covers the common single-turn
  // case every bot in this codebase actually uses) rather than the
  // full messages array, since that's what a real fine-tuning example
  // needs, not an implementation detail about how many turns this
  // particular call happened to have.
  trainingData.logGenerationForTraining({
    userId: context?.userId,
    workspaceId: context?.workspaceId,
    feature: context?.feature,
    model,
    systemPrompt: system,
    userMessage: messages[0]?.content,
    completion: rawText
  });

  return { parsed, usage, model, modelUsed: answeredBy };
}

module.exports = { callClaude, CLAUDE_MODEL, CLAUDE_MODEL_FAST };
// Exposed for tests only.
module.exports._parseJsonResponse = parseJsonResponse;
