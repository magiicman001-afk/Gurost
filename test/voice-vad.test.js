// Run: node --test test/voice-vad.test.js
// Feeds the detector made-up volume readings every 50 ms.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createVad, rmsOf } = require("../public/shared/voice-vad");

const TICK = 50;
// Run a script of [level, durationMs] steps; returns every event with its time.
function run(vad, steps, startAt = 0) {
  const out = []; let t = startAt;
  for (const [level, ms] of steps) for (let i = 0; i < ms / TICK; i++) { for (const e of vad.push(level, t)) out.push({ ...e, t }); t += TICK; }
  return { events: out, end: t };
}
const QUIET = 0.003, TALK = 0.12;

test("rmsOf measures volume", () => {
  assert.equal(rmsOf([]), 0);
  assert.equal(rmsOf([0, 0, 0]), 0);
  assert.ok(Math.abs(rmsOf([0.5, -0.5, 0.5, -0.5]) - 0.5) < 1e-9);
});

test("silence makes no events", () => {
  assert.deepEqual(run(createVad(), [[QUIET, 5000]]).events, []);
});

test("speech then a pause ends the turn, and reports how long they spoke", () => {
  const { events } = run(createVad(), [[QUIET, 600], [TALK, 2000], [QUIET, 2000]]);
  assert.deepEqual(events.map((e) => e.type), ["speech_start", "speech_end"]);
  assert.equal(events[0].at, 600);
  assert.equal(events[1].reason, "silence");
  assert.ok(Math.abs(events[1].durationMs - 1950) <= TICK, `spoke ~2s, got ${events[1].durationMs}`);
  assert.ok(events[1].t - 2600 >= 1100 && events[1].t - 2600 <= 1300, "ends about 1.2s after they stop");
});

test("a short blip (a cough or click) does not start a turn", () => {
  assert.deepEqual(run(createVad(), [[QUIET, 600], [TALK, 150], [QUIET, 3000]]).events, []);
});

test("a pause inside a sentence does not end the turn; a long one does", () => {
  const short = run(createVad(), [[QUIET, 600], [TALK, 1000], [QUIET, 800], [TALK, 1000], [QUIET, 2000]]).events;
  assert.deepEqual(short.map((e) => e.type), ["speech_start", "speech_end"], "one turn, not two");
  const long = run(createVad(), [[QUIET, 600], [TALK, 1000], [QUIET, 1500], [TALK, 1000], [QUIET, 1500]]).events;
  assert.deepEqual(long.map((e) => e.type), ["speech_start", "speech_end", "speech_start", "speech_end"]);
});

test("a turn is cut off at the maximum length", () => {
  const { events } = run(createVad({ maxUtteranceMs: 5000 }), [[QUIET, 600], [TALK, 8000]]);
  const end = events.find((e) => e.type === "speech_end");
  assert.equal(end.reason, "max");
  assert.ok(end.durationMs >= 5000 && end.durationMs < 5100);
});

test("steady background noise is learned and ignored, but speech over it is still heard", () => {
  const vad = createVad();
  const { events } = run(vad, [[0.03, 4000], [0.15, 1500], [0.03, 2500]]);
  assert.deepEqual(events.map((e) => e.type), ["speech_start", "speech_end"]);
  assert.ok(events[0].at >= 4000, "the hum alone never counted as speech");
  assert.ok(vad.noiseFloor > 0.025 && vad.noiseFloor <= 0.05);
});

test("while the bot talks: quiet sounds do nothing, sustained loud speech cuts it off", () => {
  const vad = createVad();
  let r = run(vad, [[QUIET, 600]]);
  vad.setBotSpeaking(true);
  r = run(vad, [[0.04, 2000]], r.end);
  assert.deepEqual(r.events, [], "the bot's own sound / a murmur does not interrupt it");
  r = run(vad, [[0.2, 150], [QUIET, 500]], r.end);
  assert.deepEqual(r.events, [], "a loud blip is not enough");
  r = run(vad, [[0.2, 800]], r.end);
  assert.deepEqual(r.events.map((e) => e.type), ["barge_in", "speech_start"]);
});

test("after the bot stops, the normal bar applies again; listenAgain starts a fresh turn", () => {
  const vad = createVad();
  let r = run(vad, [[QUIET, 600]]);
  vad.setBotSpeaking(true); vad.setBotSpeaking(false);
  r = run(vad, [[0.04, 1000], [QUIET, 2000]], r.end);
  assert.deepEqual(r.events.map((e) => e.type), ["speech_start", "speech_end"]);
  vad.listenAgain();
  r = run(vad, [[TALK, 1000], [QUIET, 2000]], r.end);
  assert.deepEqual(r.events.map((e) => e.type), ["speech_start", "speech_end"], "the next turn is heard");
});

test("reset forgets everything, including the room calibration", () => {
  const vad = createVad();
  run(vad, [[0.04, 1000]]);
  vad.reset();
  assert.equal(vad.noiseFloor, 0);
  assert.equal(vad.state, "idle");
});
