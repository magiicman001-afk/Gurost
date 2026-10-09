// Run: node --test test/free-llm-fallback.test.js
// Last-resort tier: when OpenRouter has nothing left (402 / all busy / all empty), the free
// providers whose keys are set answer instead, so a build does not die.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const { callOpenRouter, _resetRateLimitRest } = require("../lib/openrouter-client");
const { freeProviders } = require("../lib/free-llm-providers");

const KEYS = ["FREE_GEMINI_API_KEY", "FREE_MISTRAL_API_KEY", "FREE_CEREBRAS_API_KEY", "FREE_GROQ_API_KEY"];
const saved = {};
test.beforeEach(() => { _resetRateLimitRest(); for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; } });
test.afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

const okBody = (model, text, finish = "stop") => ({ model, choices: [{ finish_reason: finish, message: { content: text } }], usage: { prompt_tokens: 3, completion_tokens: 4 } });
// routes: url substring -> array of responses ({status, body})
function mockFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, auth: init.headers.Authorization, body });
    const key = Object.keys(routes).find((k) => url.includes(k));
    const r = routes[key].shift();
    return r.status && r.status !== 200
      ? { ok: false, status: r.status, text: async () => JSON.stringify(r.body || { error: "x" }) }
      : { ok: true, status: 200, json: async () => r.body };
  };
  return calls;
}
const NO_CREDIT = { status: 402, body: { error: { message: "in_flight_budget_exhausted" } } };
const MSGS = [{ role: "user", content: "build it" }];

test("no free keys set: nothing changes - the OpenRouter error comes straight back", async () => {
  const calls = mockFetch({ "openrouter.ai": [NO_CREDIT] });
  await assert.rejects(callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS }), (e) => e.status === 402);
  assert.equal(calls.length, 1);
});

test("out of OpenRouter credit -> the first free provider with a key answers, with its own URL, key and model", async () => {
  process.env.FREE_GEMINI_API_KEY = "gem-key";
  const calls = mockFetch({ "openrouter.ai": [NO_CREDIT], "generativelanguage.googleapis.com": [{ body: okBody("gemini-2.5-flash", "<html>site</html>") }] });
  const r = await callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS, maxTokens: 50000, reasoningOff: true });
  assert.equal(r.text, "<html>site</html>");
  assert.equal(r.model, "gemini-2.5-flash");
  const g = calls[1];
  assert.equal(g.url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  assert.equal(g.auth, "Bearer gem-key");
  assert.equal(g.body.model, "gemini-2.5-flash");
  assert.equal(g.body.max_tokens, 32000, "capped to what the free tier allows");
  assert.equal(g.body.reasoning, undefined, "OpenRouter-only fields are not sent to other providers");
  assert.equal(g.body.models, undefined);
  assert.ok(!/openrouter/i.test(g.auth), "the OpenRouter key never goes to another provider");
});

test("a provider that fails (rate limit, retired model, bad key) -> the next one answers; a failed one rests", async () => {
  process.env.FREE_GEMINI_API_KEY = "g"; process.env.FREE_MISTRAL_API_KEY = "m"; process.env.FREE_CEREBRAS_API_KEY = "c";
  const calls = mockFetch({
    "openrouter.ai": [NO_CREDIT, NO_CREDIT],
    "generativelanguage": [{ status: 404, body: { error: "model not found" } }],
    "mistral.ai": [{ status: 429 }],
    "cerebras.ai": [{ body: okBody("gpt-oss-120b", "from cerebras") }, { body: okBody("gpt-oss-120b", "again") }]
  });
  const r1 = await callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS });
  assert.equal(r1.text, "from cerebras");
  const r2 = await callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS });
  assert.equal(r2.text, "again");
  const hosts = calls.map((c) => new URL(c.url).host);
  assert.deepEqual(hosts, ["openrouter.ai", "generativelanguage.googleapis.com", "api.mistral.ai", "api.cerebras.ai", "openrouter.ai", "api.cerebras.ai"], "the second call skips the two that just failed");
});

test("every free provider fails too -> the caller gets the original plain OpenRouter error", async () => {
  process.env.FREE_GEMINI_API_KEY = "g";
  mockFetch({ "openrouter.ai": [NO_CREDIT], "generativelanguage": [{ status: 500 }] });
  await assert.rejects(callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS }), (e) => e.status === 402);
});

test("a free provider's reply that is cut off or empty counts as a miss and the next provider is tried", async () => {
  process.env.FREE_GEMINI_API_KEY = "g"; process.env.FREE_MISTRAL_API_KEY = "m";
  mockFetch({ "openrouter.ai": [NO_CREDIT], "generativelanguage": [{ body: okBody("gemini-2.5-flash", "half", "length") }], "mistral.ai": [{ body: okBody("codestral-latest", "whole") }] });
  const r = await callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS });
  assert.equal(r.text, "whole");
  assert.equal(r.skipped[0].why, "cut-off");
});

test("a deadline, a stalled stream or a refused request is NOT sent to the free providers", async () => {
  process.env.FREE_GEMINI_API_KEY = "g";
  const calls = mockFetch({ "openrouter.ai": [{ status: 400, body: { error: "bad request" } }], "generativelanguage": [{ body: okBody("x", "no") }] });
  await assert.rejects(callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS }), (e) => e.status === 400);
  assert.equal(calls.length, 1);
});

test("OpenRouter's own free chain still comes first: a Nemotron answer never reaches the providers", async () => {
  process.env.FREE_GEMINI_API_KEY = "g";
  const calls = mockFetch({ "openrouter.ai": [{ body: okBody("nvidia/nemotron-3-super-120b-a12b:free", "nemotron answer") }] });
  const r = await callOpenRouter({ model: "nvidia/nemotron-3-super-120b-a12b:free", messages: MSGS });
  assert.equal(r.text, "nemotron answer");
  assert.equal(calls.length, 1);
});

test("freeProviders: only providers with a key, in quality order; model names can be overridden", () => {
  assert.deepEqual(freeProviders({}), []);
  const list = freeProviders({ FREE_CEREBRAS_API_KEY: "c", FREE_GEMINI_API_KEY: "g", FREE_GEMINI_MODEL: "gemini-x", FREE_MISTRAL_API_KEY: "  " });
  assert.deepEqual(list.map((p) => p.name), ["gemini", "cerebras"]);
  assert.equal(list[0].model, "gemini-x");
});

test("streaming works against a free provider (same SSE format) and sends the standard usage option", async () => {
  process.env.FREE_MISTRAL_API_KEY = "m";
  const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;
  const chunks = [sse({ model: "codestral-latest", choices: [{ delta: { content: "he" } }] }), sse({ choices: [{ delta: { content: "llo" }, finish_reason: "stop" }] }), "data: [DONE]\n\n"];
  let body;
  globalThis.fetch = async (url, init) => {
    if (url.includes("openrouter.ai")) return { ok: false, status: 402, text: async () => "{}" };
    body = JSON.parse(init.body);
    let i = 0; const enc = new TextEncoder();
    return { ok: true, status: 200, body: { getReader: () => ({ read: async () => (i < chunks.length ? { value: enc.encode(chunks[i++]), done: false } : { done: true }), cancel: async () => {} }) } };
  };
  const seen = [];
  const r = await callOpenRouter({ model: "z-ai/glm-5.2", messages: MSGS, onDelta: (d) => seen.push(d.content) });
  assert.equal(r.text, "hello");
  assert.deepEqual(seen, ["he", "llo"]);
  assert.equal(body.stream, true);
  assert.deepEqual(body.stream_options, { include_usage: true });
});
