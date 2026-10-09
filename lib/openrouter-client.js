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

const { freeProviders } = require("./free-llm-providers");
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
 *
 * `onDelta({ content, reasoning })`, when given, switches to streaming:
 * it's called for every chunk as it arrives (reasoning = the model's
 * thinking, before any content). The return value is identical either
 * way - the full text, usage and model - and the same checks apply.
 */
// A streamed reply that produces nothing for this long is treated as
// stalled. OpenRouter keeps sending ": OPENROUTER PROCESSING" comments
// while a provider hangs, so only real content or reasoning counts as
// progress: any data chunk from the model resets the timer, comments
// don't. (One design once sat for 9.5 minutes this way.)
const STREAM_IDLE_TIMEOUT_MS = Number(process.env.AI_IDLE_TIMEOUT_MS) || 90000;

// The idle timer above can't stop a model that keeps trickling output (or
// reasoning) for ever - each chunk resets it. A caller can also set an
// absolute deadline (ms since epoch) for the whole request, shared by every
// model in the fallback chain: past it the request is aborted. (2026-10-07:
// two of four designs streamed for 12+ minutes and never finished.)
class DeadlineExceededError extends Error {
  constructor(model) {
    super(`Model "${model}" ran past its time limit - request stopped.`);
    this.name = "DeadlineExceededError";
    this.deadlineExceeded = true;
  }
}

class StreamIdleTimeoutError extends Error {
  constructor(model, ms) {
    super(`Model "${model}" sent nothing for ${ms / 1000}s - request aborted.`);
    this.name = "StreamIdleTimeoutError";
    this.idleTimeout = true;
  }
}

// A reply with no text at all - typically a reasoning model (qwen3.8
// :free) that spent its whole token budget thinking. OpenRouter counts
// that as a success (HTTP 200, finish_reason "length"), so its own
// fallback list never moves on; callOpenRouter does.
// A reply cut off by max_tokens (finish_reason "length") counts the same
// way: half a set of code files is not an answer. Callers whose output is
// usable when cut short (variant-bot's streamed pages) pass allowTruncated.
class EmptyResponseError extends Error {
  constructor(model, finishReason, raw, why = "returned no text content", chars = 0) {
    super(`OpenRouter model "${model}" ${why} (finish_reason: ${finishReason || "none"}). Raw: ${raw}`);
    this.name = "EmptyResponseError";
    this.emptyResponse = true;
    this.model = model;
    this.why = why;
    this.finishReason = finishReason || null;
    this.chars = chars;
  }
}

// A chain that starts with a :free model is the Free tier. Every free
// text model on OpenRouter is a reasoning model; with reasoning left on
// it can spend the whole budget thinking (measured: qwen3.8:free 5379 of
// 6000 tokens -> cut-off reply). Off: 0 reasoning tokens, complete files.
const isFreeChain = (models) => /:free$/.test(models[0] || "");

// A comma-separated model string is sent as OpenRouter's `models`
// fallback list: if the first is down or rate-limited (routine for
// :free models), OpenRouter serves the request from the next one. If the
// model that answered returns nothing, the request is sent again to the
// models after it in the list, until one answers or the list runs out.
// OpenRouter takes at most 3 models per request; longer chains are walked
// here, 3 at a time. A model that answers 429 (rate-limited - routine for
// :free models) or 5xx is rested for a minute, so the next calls start
// past it instead of each hitting the same limit.
const MAX_MODELS_PER_REQUEST = 3;
const RATE_LIMIT_REST_MS = 60 * 1000;
const restingUntil = new Map(); // model -> time it may be tried again

async function callOpenRouterChain(opts) {
  const all = String(opts.model).split(",").map((m) => m.trim()).filter(Boolean);
  const awake = all.filter((m) => !(restingUntil.get(m) > Date.now()));
  let models = awake.length ? awake : all; // everything resting: try anyway
  // Models that answered empty or cut off on the way to the one that finally
  // answered; returned with the reply so the caller's log can show them.
  const skipped = [];
  let reasoningOff = !!opts.reasoningOff;
  for (;;) {
    const sent = models.slice(0, MAX_MODELS_PER_REQUEST);
    // One deadline for the whole chain - moving to the next model doesn't reset it.
    if (opts.deadline && Date.now() >= opts.deadline) throw new DeadlineExceededError(sent[0]);
    try {
      const reply = await callOnce({ ...opts, reasoningOff, model: sent.join(",") });
      if (skipped.length) reply.skipped = skipped;
      return reply;
    } catch (err) {
      // reasoningOff (code calls) is a request, not a requirement: if the model
      // refuses the setting, say so in the log and ask again with it left alone.
      if (err.status === 400 && reasoningOff && !isFreeChain(models) && /reason/i.test(err.message)) {
        console.warn(`[openrouter] Reasoning-off was rejected for ${sent.join(", ")} - continuing with the model's default. ${err.message.slice(0, 200)}`);
        reasoningOff = false;
        continue;
      }
      // Rate-limited or the provider is down: OpenRouter has already tried
      // every model sent, so the whole group rests and the chain moves on.
      if (err.status === 429 || err.status >= 500) {
        for (const m of sent) restingUntil.set(m, Date.now() + RATE_LIMIT_REST_MS);
        const rest = models.slice(sent.length);
        if (!rest.length) {
          console.error(`[openrouter] Every model failed. Last: ${err.message}`);
          const busy = new Error(`All ${isFreeChain(all) ? "free " : ""}models are busy. Please retry in 30 seconds.`);
          busy.allModelsBusy = true;
          throw busy;
        }
        console.warn(`[openrouter] Model ${sent.join(", ")} ${err.status === 429 ? "rate-limited" : `unavailable (${err.status})`} — trying next: ${rest.join(", ")}`);
        models = rest;
        continue;
      }
      // 402 = not enough OpenRouter credit. A list holding a paid model is
      // refused WHOLE - its :free models never get a turn (seen live: Free
      // app builds died once the balance fell to $0.04). Free models need
      // no credit, so the request goes again with just those.
      if (err.status === 402) {
        const freeOnly = models.filter((m) => /:free$/.test(m));
        if (freeOnly.length && freeOnly.length < models.length) {
          console.warn(`[openrouter] Out of credit for ${models.join(", ")} - trying the free models only: ${freeOnly.join(", ")}`);
          models = freeOnly;
          continue;
        }
      }
      if (!err.emptyResponse) throw err;
      const at = models.findIndex((m) => m === err.model || err.model?.startsWith(m.replace(/:free$/, "")));
      const rest = models.slice((at === -1 ? 0 : at) + 1);
      if (!rest.length) {
        // Every model came back empty: the user gets a plain, actionable
        // message (it reaches the bot conversation / Pulse as-is); the
        // technical detail stays in the server log.
        console.error(`[openrouter] All models returned empty. Last: ${err.message}`);
        const busy = new Error("All models are busy. Please try again in 30 seconds.");
        busy.allModelsEmpty = true;
        throw busy;
      }
      skipped.push({ model: err.model, why: err.why === "returned no text content" ? "empty" : "cut-off", finishReason: err.finishReason, chars: err.chars });
      console.warn(`[openrouter] Model ${err.model} ${err.why === "returned no text content" ? "returned empty (token budget exhausted)" : "was cut off at the token limit"} (stop=${err.finishReason || "none"}, ${err.chars} chars, max_tokens=${opts.maxTokens || "default"}) — trying next model: ${rest.join(", ")}`);
      models = rest;
    }
  }
}

// The last resort. OpenRouter has nothing left to try (out of credit, every model busy or empty): ask the
// free providers whose keys are set, in order, instead of failing the build. Only those failures - never a
// deadline, a stalled stream or a request OpenRouter refused as malformed, which another provider would not fix.
const providerRest = new Map(); // provider name -> time it may be tried again
const outOfOptions = (err) => !!(err && (err.allModelsBusy || err.allModelsEmpty || err.status === 402 || err.status === 429 || err.status >= 500));

async function callOpenRouter(opts) {
  try {
    return await callOpenRouterChain(opts);
  } catch (err) {
    if (!outOfOptions(err)) throw err;
    const providers = freeProviders().filter((p) => !(providerRest.get(p.name) > Date.now()));
    if (!providers.length) throw err;
    console.warn(`[free-llm] OpenRouter has nothing left (${String(err.message).slice(0, 120)}) - trying free providers: ${providers.map((p) => p.name).join(", ")}`);
    const skipped = [];
    for (const provider of providers) {
      if (opts.deadline && Date.now() >= opts.deadline) break;
      try {
        const reply = await callOnce({ ...opts, provider });
        console.log(`[free-llm] answered by ${provider.name} (${provider.model}), ${reply.text.length} chars`);
        if (skipped.length) reply.skipped = skipped;
        return reply;
      } catch (e) {
        if (e.deadlineExceeded) throw e;
        if (e.emptyResponse) { skipped.push({ model: provider.model, why: e.why === "returned no text content" ? "empty" : "cut-off", finishReason: e.finishReason, chars: e.chars }); console.warn(`[free-llm] ${provider.name} ${e.why} - next`); continue; }
        // Rate limit / outage: a minute. A refused key or a retired model name will not fix itself soon: ten minutes.
        const rest = e.status === 429 || e.status >= 500 || !e.status ? 60 * 1000 : 10 * 60 * 1000;
        providerRest.set(provider.name, Date.now() + rest);
        console.warn(`[free-llm] ${provider.name} failed (${e.status || e.name}): ${String(e.message).slice(0, 160)} - next`);
      }
    }
    throw err; // the free providers had nothing either: the caller hears the original, plain error
  }
}

// stopWhen(contentSoFar) -> true ends a streamed reply early and keeps it
// as complete (e.g. app-bot: a model that starts writing the same files
// again has already finished).
async function callOnce({ model, system, messages, maxTokens = 4000, onDelta, idleTimeoutMs = STREAM_IDLE_TIMEOUT_MS, allowTruncated = false, stopWhen, deadline, reasoningOff = false, provider = null }) {
  // `provider` = a free provider from lib/free-llm-providers.js: same OpenAI format, its own URL, key and model,
  // and none of OpenRouter's extras (fallback list, reasoning switch, usage flag).
  const label = provider ? provider.name : "OpenRouter";
  if (provider) { model = provider.model; maxTokens = Math.min(maxTokens, provider.maxOutput); }
  const modelList = String(model).split(",").map((m) => m.trim()).filter(Boolean);
  const openAiMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages
  ];

  // Streaming calls get an inactivity timer: armed before the request,
  // re-armed on every chunk of real output, fired = abort.
  const controller = onDelta || deadline ? new AbortController() : null;
  let idleTimer = null;
  let timedOut = false;
  const touch = () => {
    if (!onDelta) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { timedOut = true; controller.abort(); }, idleTimeoutMs);
  };
  touch();
  // The absolute deadline: never re-armed, however much output arrives.
  let pastDeadline = false;
  const deadlineTimer = deadline ? setTimeout(() => { pastDeadline = true; controller.abort(); }, Math.max(0, deadline - Date.now())) : null;

  try {
  const response = await fetch(`${provider ? provider.baseUrl : OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    ...(controller ? { signal: controller.signal } : {}),
    headers: provider ? {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.key}`
    } : {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      // Optional per OpenRouter's own docs — identifies this app on
      // their leaderboards, doesn't affect whether calls work.
      "HTTP-Referer": "https://gurost.onrender.com",
      "X-Title": "Gurost"
    },
    body: JSON.stringify(provider ? {
      model: modelList[0],
      messages: openAiMessages,
      max_tokens: maxTokens,
      ...(onDelta ? { stream: true, stream_options: { include_usage: true } } : {})
    } : {
      ...(modelList.length > 1 ? { models: modelList } : { model: modelList[0] }),
      messages: openAiMessages,
      max_tokens: maxTokens,
      ...(isFreeChain(modelList) || reasoningOff ? { reasoning: { enabled: false } } : {}),
      ...(onDelta ? { stream: true, usage: { include: true } } : {})
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`${label} error (${response.status}) calling model "${model}": ${errText.slice(0, 300)}`);
    err.status = response.status;
    throw err;
  }

  const data = onDelta ? await readStream(response, onDelta, touch, stopWhen) : await response.json();
  // OpenRouter can return HTTP 200 with an error body when every model in
  // a fallback list failed upstream (rate-limited, overloaded).
  if (data.error) {
    const err = new Error(`${label} error (${data.error.code || "upstream"}) calling model "${model}": ${data.error.message || JSON.stringify(data.error).slice(0, 300)}`);
    if (Number(data.error.code)) err.status = Number(data.error.code); // e.g. 429 inside a 200 reply
    throw err;
  }
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  // content can be null, not just missing: reasoning models (gpt-oss)
  // return null when the whole token budget went to reasoning, which
  // used to surface downstream as "Cannot read properties of null".
  if (typeof text !== "string" || !text.trim()) {
    throw new EmptyResponseError(data.model || modelList[0], choice?.finish_reason, JSON.stringify(data).slice(0, 300), "returned no text content", 0);
  }
  if (choice?.finish_reason === "length" && !allowTruncated) {
    throw new EmptyResponseError(data.model || modelList[0], "length", `${text.length} chars, ends: ${JSON.stringify(text.slice(-80))}`, "was cut off at the token limit", text.length);
  }

  // Normalized back to the input_tokens/output_tokens shape the rest of
  // this codebase already expects (claude_usage_log, admin dashboard
  // cost estimates, etc.), so nothing downstream needs to know
  // OpenRouter returns OpenAI-style prompt_tokens/completion_tokens
  // internally.
  const usage = data.usage
    ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
    : null;

  return { text, usage, model: data.model || modelList[0], finishReason: choice?.finish_reason || null };
  } catch (err) {
    if (pastDeadline) throw new DeadlineExceededError(modelList[0]);
    if (timedOut) throw new StreamIdleTimeoutError(modelList[0], idleTimeoutMs);
    throw err;
  } finally {
    clearTimeout(idleTimer);
    clearTimeout(deadlineTimer);
  }
}

// Reads an OpenRouter SSE stream ("data: {json}" lines, ": comment"
// keep-alives, "data: [DONE]") and folds it into the same shape a
// non-streamed response has, so callOpenRouter's checks run unchanged.
// A mid-stream {"error": ...} chunk is surfaced as data.error.
// onActivity: called for every real data chunk (not ": keep-alive" comments).
async function readStream(response, onDelta, onActivity = () => {}, stopWhen = null) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let finishReason = null;
  let modelUsed = null;
  let usage = null;
  let error = null;
  let stopped = false;
  const handleLine = (line) => {
    if (!line.startsWith("data:")) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") return;
    let chunk;
    try { chunk = JSON.parse(payload); } catch { return; }
    onActivity();
    if (chunk.error) { error = chunk.error; return; }
    modelUsed = chunk.model || modelUsed;
    if (chunk.usage) usage = chunk.usage;
    const choice = chunk.choices?.[0];
    if (!choice) return;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    const delta = choice.delta || {};
    if (delta.content) content += delta.content;
    if (delta.content && stopWhen && !stopped && stopWhen(content)) stopped = true;
    if (delta.content || delta.reasoning) onDelta({ content: delta.content || "", reasoning: delta.reasoning || "" });
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while (!stopped && (newline = buffer.indexOf("\n")) !== -1) {
      handleLine(buffer.slice(0, newline).trim());
      buffer = buffer.slice(newline + 1);
    }
    if (stopped) {
      // stopWhen said the reply is complete: stop paying for the rest.
      reader.cancel().catch(() => {});
      finishReason = "stop";
      buffer = "";
      break;
    }
  }
  handleLine(buffer.trim());
  return {
    ...(error ? { error } : {}),
    model: modelUsed,
    usage,
    choices: [{ finish_reason: finishReason, message: { content } }]
  };
}

module.exports = { callOpenRouter, OPENROUTER_BASE_URL, StreamIdleTimeoutError, DeadlineExceededError, EmptyResponseError, _resetRateLimitRest: () => { restingUntil.clear(); providerRest.clear(); } };
