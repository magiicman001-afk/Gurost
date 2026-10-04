// Run: node --test test/openrouter-empty-fallback.test.js
// Free plan bug (2026-10-04): qwen3.8:free spent its whole token budget
// thinking and returned no text; OpenRouter reported success, so the
// fallback list never moved on and Pulse edits / app builds failed.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const { callOpenRouter } = require("../lib/openrouter-client");

const FREE = "google/gemma-4-31b-it:free,qwen/qwen3.8-27b:free,z-ai/glm-5.2";
const empty = (model) => ({ model, choices: [{ finish_reason: "length", message: { content: null } }], usage: { prompt_tokens: 10, completion_tokens: 2000 } });
const ok = (model, text) => ({ model, choices: [{ finish_reason: "stop", message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });

function mockFetch(replies) {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push(body.models || [body.model]);
    const reply = replies.shift();
    return { ok: true, json: async () => reply };
  };
  return sent;
}

test("an empty reply moves on to the models after the one that answered", async () => {
  const sent = mockFetch([empty("qwen/qwen3.8-27b:free"), ok("z-ai/glm-5.2", "done")]);
  const r = await callOpenRouter({ model: FREE, messages: [{ role: "user", content: "hi" }] });
  assert.equal(r.text, "done");
  assert.equal(r.model, "z-ai/glm-5.2");
  assert.deepEqual(sent, [FREE.split(","), ["z-ai/glm-5.2"]]);
});

test("the first model empty -> both others are tried, in order", async () => {
  const sent = mockFetch([empty("google/gemma-4-31b-it:free"), ok("qwen/qwen3.8-27b:free", "ok")]);
  const r = await callOpenRouter({ model: FREE, messages: [] });
  assert.equal(r.text, "ok");
  assert.deepEqual(sent[1], ["qwen/qwen3.8-27b:free", "z-ai/glm-5.2"]);
});

test("every model empty -> a plain 'try again' error, not a raw dump", async () => {
  mockFetch([empty("qwen/qwen3.8-27b:free"), empty("z-ai/glm-5.2")]);
  await assert.rejects(callOpenRouter({ model: FREE, messages: [] }), (err) => err.allModelsEmpty && err.message === "All models are busy. Please try again in 30 seconds.");
});

test("a single model that returns empty also gets the plain error; other errors pass through unchanged", async () => {
  mockFetch([empty("z-ai/glm-5.2")]);
  await assert.rejects(callOpenRouter({ model: "z-ai/glm-5.2", messages: [] }), /All models are busy/);
  globalThis.fetch = async () => ({ ok: false, status: 429, text: async () => "rate limited" });
  await assert.rejects(callOpenRouter({ model: FREE, messages: [] }), /OpenRouter error \(429\)/);
});

// Same Free-plan build, next failure: glm-5.2 answered but its JSON had an
// unescaped quote inside a code string -> "Failed to parse response as JSON".
const { callClaude } = require("../lib/claude-client");

test("invalid JSON -> asked once more with the parser's error; the fixed reply is used", async () => {
  const bodies = [];
  const replies = [ok("z-ai/glm-5.2", '{"schema": "CREATE TABLE "orders" (id int)"}'), ok("z-ai/glm-5.2", '{"schema": "CREATE TABLE \\"orders\\" (id int)"}')];
  globalThis.fetch = async (url, init) => { bodies.push(JSON.parse(init.body)); const r = replies.shift(); return { ok: true, json: async () => r }; };
  const r = await callClaude({ system: "Return JSON.", messages: [{ role: "user", content: "schema please" }], model: "z-ai/glm-5.2" });
  assert.equal(r.parsed.schema, 'CREATE TABLE "orders" (id int)');
  assert.equal(bodies.length, 2);
  const last = bodies[1].messages.at(-1).content;
  assert.match(last, /not valid JSON \(.+\)/);
  assert.equal(bodies[1].messages.at(-2).role, "assistant");
});

test("invalid JSON twice -> a plain error, not the raw reply", async () => {
  const bad = ok("z-ai/glm-5.2", '{"a": "x"y"}');
  globalThis.fetch = async () => ({ ok: true, json: async () => bad });
  await assert.rejects(callClaude({ system: "s", messages: [{ role: "user", content: "u" }], model: "z-ai/glm-5.2" }), (e) => e.message === "The AI sent back a broken answer twice. Please try again.");
});

test("a custom parser's failure is not retried", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return { ok: true, json: async () => ok("m", "<html>") }; };
  await assert.rejects(callClaude({ system: "s", messages: [], model: "m", parse: () => { throw new Error("no page"); } }), /no page/);
  assert.equal(calls, 1);
});
