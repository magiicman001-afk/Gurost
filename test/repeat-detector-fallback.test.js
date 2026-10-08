// Run: node --test test/repeat-detector-fallback.test.js
// Live 2026-10-08 (Bug O): Kimi was cut off after writing its files; the next model in the chain answered
// correctly, but the repeat-file detector (one instance for the whole request) still remembered Kimi's
// files, took the new model's first file for a repeat and ended its stream after the summary block.
// Every fallback therefore "returned no files" - the cause of every "Real build failed" that night.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createRepeatDetector, parseFileBlocks } = require("../lib/file-blocks");
const { callOpenRouter, _resetRateLimitRest } = require("../lib/openrouter-client");

const file = (p, body = `console.log("${p}");`) => `<<<FILE ${p}>>>\n${body}\n<<<END FILE>>>\n`;
const META_A = '<<<META>>>\n{"summary":"pet app"}\n<<<END META>>>\n';
const META_B = '<<<META>>>\n{"summary":"A pet adoption app with pets, applications and likes"}\n<<<END META>>>\n';

// Feeds a reply to a detector the way the stream does: growing, in small pieces.
function feed(detector, text, piece = 37) {
  for (let i = piece; i < text.length + piece; i += piece) if (detector(text.slice(0, Math.min(i, text.length)))) return Math.min(i, text.length);
  return -1; // never stopped
}

test("a model that really repeats a file in ONE reply is still stopped", () => {
  const d = createRepeatDetector();
  const reply = META_A + file("package.json") + file("src/App.jsx") + file("package.json") + file("src/App.jsx");
  const at = feed(d, reply);
  assert.ok(at > 0 && at < reply.length, "stopped at the repeat");
  assert.equal(parseFileBlocks(reply.slice(0, at)).files.length, 2, "what came before the repeat is the whole answer");
});

test("a NEW reply that starts with the same files as the cut-off one is not a repeat", () => {
  const d = createRepeatDetector();
  const kimi = META_A + file("package.json") + file("src/App.jsx") + file("src/Pets.jsx") + "<<<FILE src/Big.jsx>>>\nhalf a fi";
  assert.equal(feed(d, kimi), -1, "the first reply streams through");
  const next = META_B + file("package.json") + file("src/App.jsx") + file("src/Pets.jsx");
  assert.equal(feed(d, next), -1, "the fallback's reply is not stopped");
});

test("end to end: Kimi cut off -> Sonnet's complete reply arrives whole", async () => {
  _resetRateLimitRest();
  const enc = new TextEncoder();
  const stream = (model, text, finish) => {
    const parts = [];
    for (let i = 0; i < text.length; i += 40) parts.push(`data: ${JSON.stringify({ model, choices: [{ delta: { content: text.slice(i, i + 40) } }] })}\n\n`);
    parts.push(`data: ${JSON.stringify({ model, choices: [{ delta: {}, finish_reason: finish }] })}\n\n`, "data: [DONE]\n\n");
    let n = 0;
    return { ok: true, body: { getReader: () => ({ cancel: async () => {}, read: async () => (n < parts.length ? { done: false, value: enc.encode(parts[n++]) } : { done: true }) }) } };
  };
  const kimi = META_A + file("package.json") + file("src/App.jsx") + file("src/Pets.jsx") + "<<<FILE src/Big.jsx>>>\nhalf a fi";
  const sonnet = META_B + file("package.json") + file("src/App.jsx") + file("src/Pets.jsx");
  const replies = [stream("moonshotai/kimi-k2.6", kimi, "length"), stream("anthropic/claude-sonnet-5", sonnet, "stop")];
  const realFetch = globalThis.fetch; const warn = console.warn;
  globalThis.fetch = async () => replies.shift();
  console.warn = () => {};
  try {
    const r = await callOpenRouter({ model: "moonshotai/kimi-k2.6,anthropic/claude-sonnet-5", messages: [{ role: "user", content: "x" }], onDelta: () => {}, stopWhen: createRepeatDetector() });
    assert.equal(r.model, "anthropic/claude-sonnet-5");
    assert.equal(r.text, sonnet, "the whole reply, not a stub");
    assert.equal(parseFileBlocks(r.text).files.length, 3);
  } finally { globalThis.fetch = realFetch; console.warn = warn; }
});
