// Run: node --test test/voice-chat.session.test.js
// The listen / think / speak / interrupt flow, with a pretend microphone, recorder and speaker.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createVoiceSession } = require("../public/shared/voice-chat");
const { createVad } = require("../public/shared/voice-vad");

const QUIET = 0.003, TALK = 0.12;

function rig({ send } = {}) {
  const log = { states: [], recorders: [], players: [], sent: [], users: [], results: [], errors: [], stopped: false, analyserClosed: false };
  let clock = 0, level = QUIET, tickFn = null, intervalId = null;
  const env = {
    async getUserMedia() { return { fake: "stream" }; },
    stopStream() { log.stopped = true; },
    createAnalyser() { return { readLevel: () => level, close() { log.analyserClosed = true; } }; },
    createRecorder() {
      const r = { started: clock, discarded: false, stoppedAt: null, start() {}, discard() { r.discarded = true; }, async stop() { r.stoppedAt = clock; return { size: r.size === undefined ? 5000 : r.size }; } };
      log.recorders.push(r); return r;
    },
    playAudio(b64) { const p = { b64, stopped: false, stop() { p.stopped = true; }, onended(f) { p.end = f; }, onerror(f) { p.fail = f; } }; log.players.push(p); return p; },
    createVad: () => createVad(),
    setInterval(f) { tickFn = f; intervalId = 1; return 1; },
    clearInterval() { tickFn = null; },
    now: () => clock
  };
  const hooks = {
    send: send || (async (blob) => { log.sent.push(blob); return { transcript: "hello", reply: "Hi there.", audioBase64: "QVVESU8=" }; }),
    onStatus: (s) => log.states.push(s), onUser: (t) => log.users.push(t), onResult: (r) => log.results.push(r), onError: (m) => log.errors.push(m)
  };
  const session = createVoiceSession(env, hooks);
  // Advance time in 50 ms ticks at a given volume, letting promises settle each tick.
  async function run(lvl, ms) { level = lvl; for (let i = 0; i < ms / 50; i++) { clock += 50; if (tickFn) tickFn(); await new Promise((r) => setImmediate(r)); } }
  return { session, log, run, setLevel: (l) => { level = l; } };
}

test("a full turn: listen, hear speech, send the recording, show both sides, speak, listen again", async () => {
  const { session, log, run } = rig();
  await session.start();
  assert.equal(session.state, "listening");
  await run(QUIET, 700);
  await run(TALK, 1500);
  await run(QUIET, 1500);
  assert.equal(log.sent.length, 1, "one recording sent");
  assert.deepEqual(log.users, ["hello"]);
  assert.equal(log.results[0].reply, "Hi there.");
  assert.equal(session.state, "speaking");
  assert.equal(log.players.length, 1);
  log.players[0].end();   // the bot finishes talking
  assert.equal(session.state, "listening");
  session.stop();
});

test("states move listening -> thinking -> speaking -> listening", async () => {
  const { session, log, run } = rig();
  await session.start();
  await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500);
  log.players[0].end();
  assert.deepEqual(log.states, ["listening", "thinking", "speaking", "listening"]);
  session.stop();
});

test("talking over the bot stops it at once and captures the new turn", async () => {
  const { session, log, run } = rig();
  await session.start();
  await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500);
  assert.equal(session.state, "speaking");
  await run(TALK, 800);                       // user talks over the bot
  assert.equal(log.players[0].stopped, true, "the bot's audio was stopped");
  assert.equal(session.state, "listening");
  await run(QUIET, 1500);                     // and finishes
  assert.equal(log.sent.length, 2, "the interruption was sent as a new turn");
  session.stop();
});

test("silence or a tiny recording is not sent; the session keeps listening", async () => {
  const { session, log, run } = rig();
  await session.start();
  await run(QUIET, 20000);
  assert.equal(log.sent.length, 0);
  assert.equal(session.state, "listening");
  const tiny = rig();
  await tiny.session.start();
  tiny.log.recorders[0].size = 10;
  await tiny.run(QUIET, 700); await tiny.run(TALK, 1500); await tiny.run(QUIET, 1500);
  assert.equal(tiny.log.sent.length, 0, "under the minimum size");
  assert.equal(tiny.session.state, "listening");
  session.stop(); tiny.session.stop();
});

test("a recorder that has heard nothing is restarted, but not while speech may be starting", async () => {
  const { session, log, run } = rig();
  await session.start();
  await run(QUIET, 9000);
  const idleRestarts = log.recorders.length;
  assert.ok(idleRestarts >= 2, "restarted after a long quiet");
  assert.ok(log.recorders.slice(0, -1).every((r) => r.discarded), "old ones are thrown away, not sent");
  session.stop();
});

test("the server hearing nothing (noSpeech) just goes back to listening", async () => {
  const { session, log, run } = rig({ send: async () => ({ transcript: "", noSpeech: true }) });
  await session.start();
  await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500);
  assert.equal(session.state, "listening");
  assert.deepEqual(log.users, []);
  assert.equal(log.players.length, 0);
  session.stop();
});

test("no audio back (speech failed): the text still shows and it goes straight back to listening", async () => {
  const { session, log, run } = rig({ send: async () => ({ transcript: "q", reply: "Text only.", audioBase64: null }) });
  await session.start();
  await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500);
  assert.equal(log.results[0].reply, "Text only.");
  assert.equal(session.state, "listening");
  assert.equal(log.players.length, 0);
  session.stop();
});

test("errors are reported; after 3 in a row the session ends instead of looping", async () => {
  let n = 0;
  const { session, log, run } = rig({ send: async () => { n++; throw new Error("boom " + n); } });
  await session.start();
  for (let i = 0; i < 3; i++) { await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500); }
  assert.deepEqual(log.errors, ["boom 1", "boom 2", "boom 3"]);
  assert.equal(session.state, "off");
  assert.equal(log.stopped, true, "the microphone is released");
});

test("stopping mid-thought releases the microphone and ignores the late answer", async () => {
  let release;
  const { session, log, run } = rig({ send: () => new Promise((res) => { release = res; }) });
  await session.start();
  await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500);
  assert.equal(session.state, "thinking");
  session.stop();
  assert.equal(session.state, "off");
  assert.equal(log.stopped, true);
  assert.equal(log.analyserClosed, true);
  release({ transcript: "late", reply: "late", audioBase64: "QQ==" });
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(log.users, []);
  assert.equal(log.players.length, 0, "nothing is spoken after stopping");
});

test("stop while the bot is talking silences it", async () => {
  const { session, log, run } = rig();
  await session.start();
  await run(QUIET, 700); await run(TALK, 1500); await run(QUIET, 1500);
  session.stop();
  assert.equal(log.players[0].stopped, true);
  assert.equal(session.state, "off");
});
