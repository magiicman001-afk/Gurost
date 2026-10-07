// Run: node --test test/design-time-limit.test.js
// A model that keeps trickling output never trips the 90s idle timer; the
// absolute deadline must stop it anyway (2026-10-07: 2 of 4 designs hung).
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.OPENROUTER_API_KEY ||= "test-key"; // nothing real is called: fetch is replaced below

const realFetch = global.fetch;
let fetchCalls = 0;
// An SSE stream that sends a small chunk every 20ms for ever (until aborted).
function tricklingFetch(url, opts) {
  fetchCalls++;
  const enc = new TextEncoder();
  let timer;
  const body = new ReadableStream({
    start(controller) {
      timer = setInterval(() => controller.enqueue(enc.encode(`data: ${JSON.stringify({ model: "slow/model", choices: [{ delta: { content: "<p>more</p>" } }] })}\n\n`)), 20);
      opts.signal?.addEventListener("abort", () => { clearInterval(timer); controller.error(Object.assign(new Error("aborted"), { name: "AbortError" })); });
    },
    cancel() { clearInterval(timer); }
  });
  return Promise.resolve(new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }));
}

test.afterEach(() => { global.fetch = realFetch; fetchCalls = 0; });

test("a stream that keeps trickling is stopped at the deadline", async () => {
  global.fetch = tricklingFetch;
  const { callOpenRouter } = require("../lib/openrouter-client");
  const t0 = Date.now();
  await assert.rejects(
    callOpenRouter({ model: "slow/model", messages: [{ role: "user", content: "x" }], onDelta: () => {}, deadline: Date.now() + 300 }),
    (err) => err.deadlineExceeded === true && /time limit/.test(err.message)
  );
  const took = Date.now() - t0;
  assert.ok(took >= 250 && took < 2000, `stopped after ${took}ms`);
});

test("the deadline covers the whole fallback chain: a passed deadline sends nothing", async () => {
  global.fetch = tricklingFetch;
  const { callOpenRouter } = require("../lib/openrouter-client");
  await assert.rejects(callOpenRouter({ model: "a/one:free,b/two:free", messages: [], onDelta: () => {}, deadline: Date.now() - 1 }), (err) => err.deadlineExceeded === true);
  assert.equal(fetchCalls, 0);
});

test("the 90s idle timer still works on its own (silent stream)", async () => {
  global.fetch = (url, opts) => Promise.resolve(new Response(new ReadableStream({ start(c) { opts.signal.addEventListener("abort", () => c.error(new Error("aborted"))); } }), { status: 200 }));
  const { callOpenRouter } = require("../lib/openrouter-client");
  await assert.rejects(callOpenRouter({ model: "quiet/model", messages: [], onDelta: () => {}, idleTimeoutMs: 100 }), (err) => err.idleTimeout === true);
});

test("a design past its limit is retried once, then fails as 'took too long' - never hangs", async () => {
  global.fetch = tricklingFetch;
  const { generateDesign } = require("../bots/variant-bot")._internal;
  const retries = [];
  const t0 = Date.now();
  await assert.rejects(
    generateDesign({ system: "s", content: "c", plan: "free", variantId: "bold", onStream: () => {}, onRetry: (err, reason) => retries.push(reason), limits: { firstMs: 300, retryMs: 200 } }),
    (err) => err.tookTooLong === true && err.message === "took too long — moving on"
  );
  assert.equal(fetchCalls, 2, "first attempt + one retry");
  assert.equal(retries.length, 1, "one retry, announced once");
  assert.match(retries[0], /took longer than/);
  assert.ok(Date.now() - t0 < 3000, "both limits respected");
});

test("real time limits: 10 minutes, then a 5-minute retry", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../bots/variant-bot.js"), "utf8");
  assert.match(src, /DESIGN_TIME_LIMIT_MS = 10 \* 60 \* 1000/);
  assert.match(src, /DESIGN_RETRY_LIMIT_MS = 5 \* 60 \* 1000/);
});

test("an unusable reply followed by a slow fix-up is two attempts, not three", async () => {
  // First reply: complete but not HTML (parse error) -> the fix-up request trickles past its limit.
  let n = 0;
  global.fetch = (url, opts) => {
    n++;
    if (n === 1) return Promise.resolve(new Response(`data: ${JSON.stringify({ model: "m", choices: [{ delta: { content: "Sorry, here is a summary instead." }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`, { status: 200 }));
    return tricklingFetch(url, opts);
  };
  const { generateDesign } = require("../bots/variant-bot")._internal;
  await assert.rejects(
    generateDesign({ system: "s", content: "c", plan: "free", variantId: "minimal", onStream: () => {}, limits: { firstMs: 2000, retryMs: 200 } }),
    (err) => err.tookTooLong === true && err.deadlineExceeded === true
  );
  assert.equal(n, 2, "the unusable reply and one fix-up - no third request");
});
