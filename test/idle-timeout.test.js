// Run: node --test test/idle-timeout.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
process.env.AI_IDLE_TIMEOUT_MS = "150"; // read when the client loads
const test = require("node:test");
const assert = require("node:assert/strict");
const { callOpenRouter, StreamIdleTimeoutError } = require("../lib/openrouter-client");
const { generateDesign } = require("../bots/variant-bot")._internal;

const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;
const delta = (content) => sse({ model: "m", choices: [{ delta: { content } }] });

// A fake OpenRouter streaming response: sends `chunks` (strings) `every` ms
// apart, honours the abort signal like real fetch does.
function fakeStream(chunks, every, signal) {
  const enc = new TextEncoder();
  let timer;
  const body = new ReadableStream({
    start(controller) {
      let i = 0;
      const next = () => {
        if (i >= chunks.length) { controller.close(); return; }
        controller.enqueue(enc.encode(chunks[i++]));
        timer = setTimeout(next, every);
      };
      signal?.addEventListener("abort", () => { clearTimeout(timer); controller.error(Object.assign(new Error("aborted"), { name: "AbortError" })); });
      next();
    },
    cancel() { clearTimeout(timer); },
  });
  return { ok: true, status: 200, body };
}

test("a stream that only sends keep-alive comments times out", async () => {
  const real = global.fetch;
  global.fetch = async (url, opts) => fakeStream(Array(50).fill(": OPENROUTER PROCESSING\n\n"), 40, opts.signal);
  try {
    await assert.rejects(
      callOpenRouter({ model: "m", messages: [], onDelta: () => {}, idleTimeoutMs: 150 }),
      (err) => err instanceof StreamIdleTimeoutError && err.idleTimeout === true
    );
  } finally { global.fetch = real; }
});

test("a slow but steady stream is not cut off", async () => {
  const real = global.fetch;
  global.fetch = async (url, opts) => fakeStream([...Array(8).fill(0).map((_, i) => delta(`part${i} `)), sse({ model: "m", choices: [{ delta: {}, finish_reason: "stop" }] }), "data: [DONE]\n\n"], 60, opts.signal);
  try {
    const r = await callOpenRouter({ model: "m", messages: [], onDelta: () => {}, idleTimeoutMs: 150 });
    assert.match(r.text, /^part0 part1 .*part7 $/);
  } finally { global.fetch = real; }
});

const DOC = "<!DOCTYPE html><html><head><title>Crumb</title></head><body><section><h1>Bread</h1></section></body></html>";

test("generateDesign: a stalled design is retried once (retry still streams, so it can time out too)", async () => {
  const real = global.fetch;
  let calls = 0;
  global.fetch = async (url, opts) => {
    calls++;
    const body = JSON.parse(opts.body);
    assert.equal(body.stream, true, "every attempt streams");
    if (calls === 1) return fakeStream(Array(50).fill(": OPENROUTER PROCESSING\n\n"), 40, opts.signal);
    return fakeStream([delta(DOC), "data: [DONE]\n\n"], 10, opts.signal);
  };
  try {
    let retried = null;
    const r = await generateDesign({ system: "Design a site.", content: "bakery", variantId: "bold", onStream: () => {}, onRetry: (e) => { retried = e; } });
    assert.equal(calls, 2);
    assert.ok(retried?.idleTimeout, "onRetry told why");
    assert.match(r.parsed.html, /<h1>Bread<\/h1>/);
  } finally { global.fetch = real; }
});

test("generateDesign: stalling twice fails (the build continues with the other designs)", async () => {
  const real = global.fetch;
  let calls = 0;
  global.fetch = async (url, opts) => { calls++; return fakeStream(Array(50).fill(": OPENROUTER PROCESSING\n\n"), 40, opts.signal); };
  try {
    await assert.rejects(generateDesign({ system: "Design a site.", content: "bakery", variantId: "bold", onStream: () => {} }), (e) => e.idleTimeout === true);
    assert.equal(calls, 2);
  } finally { global.fetch = real; }
});
