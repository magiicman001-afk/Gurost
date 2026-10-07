// Run: node --test test/pulse-handsfree.test.js
// Pulse hands-free voice: the rules (wake word, noise, spoken replies) and the whole flow
// (listen -> edit -> speak -> listen, interrupt) with a pretend microphone, recorder and speaker.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const HF = require("../public/shared/pulse-handsfree");
const { createVoiceSession } = require("../public/shared/voice-chat");
const { createVad } = require("../public/shared/voice-vad");

test("a leading 'Core,' (or 'Hey Core,') is dropped, nothing else is", () => {
  assert.equal(HF.cleanSpoken("Core, add testimonials"), "add testimonials");
  assert.equal(HF.cleanSpoken("Hey Core, add testimonials."), "add testimonials.");
  assert.equal(HF.cleanSpoken("core: make the heading bigger"), "make the heading bigger");
  assert.equal(HF.cleanSpoken("  add a core values section"), "add a core values section", "'core' inside the sentence stays");
  assert.equal(HF.cleanSpoken("Corey, add a menu"), "Corey, add a menu", "a name that starts with Core is not the wake word");
  assert.equal(HF.cleanSpoken(null), "");
});

test("silence-hallucinations and single words are ignored, real requests and commands are not", () => {
  for (const t of ["", "  ", "you", "Thank you.", "okay", "um", "Yeah", "uh um", "so and the", "hmm hmm"]) assert.equal(HF.isNoise(t), true, JSON.stringify(t));
  for (const t of ["add testimonials", "make the heading bigger", "save this", "Save it.", "save to GitHub", "turn off auto-save", "stop auto save", "change the colours to green"]) assert.equal(HF.isNoise(t), false, t);
});

test("what Pulse says back", () => {
  const say = HF.spokenReply;
  assert.equal(say({ ok: true, kind: "edit" }), "Done. What next?");
  assert.equal(say({ ok: true, kind: "build" }), "Built. Take a look.");
  assert.equal(say({ ok: true, kind: "github", cmd: "save" }), "Saved to GitHub.");
  assert.equal(say({ ok: true, kind: "github", cmd: "save", unchanged: true }), "GitHub is already up to date.");
  assert.equal(say({ ok: true, kind: "github", cmd: "auto-on" }), "Auto-save is on.");
  assert.equal(say({ ok: true, kind: "github", cmd: "auto-off" }), "Auto-save is off.");
  assert.equal(say({ ok: false, kind: "edit" }), "That didn't work. Shall we try again?");
  assert.equal(say({ ok: false, kind: "edit" }, { retry: "Custom retry." }), "Custom retry.");
  assert.match(say({ ok: false, kind: "busy" }), /still working/);
  assert.match(say({ ok: false, kind: "noproject" }), /web address or upload/);
  assert.equal(say(null), "");
});

// ---- the whole flow, with a pretend microphone ----
const QUIET = 0.003, TALK = 0.12;

function rig({ transcripts = [], run, speak, transcribe } = {}) {
  const log = { states: [], heard: [], errors: [], ran: [], spoken: [], players: [], stopped: false };
  let clock = 0, level = QUIET, tickFn = null, turn = 0;
  const env = {
    async getUserMedia() { return {}; },
    stopStream() { log.stopped = true; },
    createAnalyser() { return { readLevel: () => level, close() {} }; },
    createRecorder() { return { start() {}, discard() {}, async stop() { return { size: 5000 }; } }; },
    playAudio(b64) { const p = { b64, stopped: false, stop() { p.stopped = true; }, onended(f) { p.end = f; }, onerror(f) { p.fail = f; } }; log.players.push(p); return p; },
    createVad: () => createVad(),
    setInterval(f) { tickFn = f; return 1; },
    clearInterval() { tickFn = null; },
    now: () => clock
  };
  const voice = { browserSupported: () => true, browserEnv: () => env, createVoiceSession };
  const hf = HF.createHandsFree({
    voice,
    transcribe: transcribe || (async () => transcripts[Math.min(turn++, transcripts.length - 1)]),
    speak: speak || (async (text) => { log.spoken.push(text); return "QVVESU8="; }),
    run: run || (async (text) => { log.ran.push(text); return { ok: true, kind: "edit" }; }),
    ui: { onStatus: (s) => log.states.push(s), onHeard: (t) => log.heard.push(t), onError: (m) => log.errors.push(m) }
  });
  async function go(lvl, ms) { level = lvl; for (let i = 0; i < ms / 50; i++) { clock += 50; if (tickFn) tickFn(); await new Promise((r) => setImmediate(r)); } }
  async function say() { await go(QUIET, 700); await go(TALK, 1500); await go(QUIET, 1500); } // one spoken request
  return { hf, log, go, say };
}

test("'Core, add testimonials' is heard, run as 'add testimonials', answered out loud, then it listens again", async () => {
  const { hf, log, say } = rig({ transcripts: ["Core, add testimonials"] });
  await hf.start();
  assert.equal(hf.active, true);
  await say();
  assert.deepEqual(log.heard, ["add testimonials"]);
  assert.deepEqual(log.ran, ["add testimonials"]);
  assert.deepEqual(log.spoken, ["Done. What next?"]);
  assert.equal(log.players.length, 1);
  log.players[0].end();
  assert.deepEqual(log.states, ["listening", "thinking", "speaking", "listening"]);
  hf.stop();
  assert.equal(hf.active, false);
  assert.equal(log.stopped, true, "the microphone is released");
  assert.equal(log.states[log.states.length - 1], "off");
});

test("noise or filler: nothing is run, nothing is said, it just keeps listening", async () => {
  const { hf, log, say } = rig({ transcripts: ["you"] });
  await hf.start();
  await say();
  assert.deepEqual(log.ran, []);
  assert.deepEqual(log.spoken, []);
  assert.equal(log.players.length, 0);
  assert.equal(log.states[log.states.length - 1], "listening");
  hf.stop();
});

test("a failed edit is answered with the retry line, and the flow carries on", async () => {
  const { hf, log, say } = rig({ transcripts: ["add a gallery"], run: async () => ({ ok: false, kind: "edit", error: "x" }) });
  await hf.start();
  await say();
  assert.deepEqual(log.spoken, ["That didn't work. Shall we try again?"]);
  log.players[0].end();
  assert.equal(log.states[log.states.length - 1], "listening");
  hf.stop();
});

test("an edit that throws is treated as failed, not as a crash", async () => {
  const { hf, log, say } = rig({ transcripts: ["add a gallery"], run: async () => { throw new Error("boom"); } });
  await hf.start();
  await say();
  assert.deepEqual(log.spoken, ["That didn't work. Shall we try again?"]);
  assert.deepEqual(log.errors, []);
  hf.stop();
});

test("if speech-to-text fails, the person is told and it keeps listening; three in a row stops it", async () => {
  const { hf, log, say } = rig({ transcribe: async () => { throw new Error("I could not hear that. Please try again."); } });
  await hf.start();
  await say();
  assert.equal(log.errors.length, 1);
  assert.equal(log.states[log.states.length - 1], "listening");
  await say(); await say();
  assert.equal(log.errors.length, 3);
  assert.equal(hf.active, false, "three failures in a row switch the microphone off");
  assert.equal(log.stopped, true);
});

test("if the spoken answer cannot be made, the edit still happened and it listens on in silence", async () => {
  const { hf, log, say } = rig({ transcripts: ["add a gallery"], speak: async () => { throw new Error("tts down"); } });
  await hf.start();
  await say();
  assert.deepEqual(log.ran, ["add a gallery"]);
  assert.equal(log.players.length, 0);
  assert.equal(log.states[log.states.length - 1], "listening");
  hf.stop();
});

test("talking over Pulse's voice stops it and listens", async () => {
  const { hf, log, say, go } = rig({ transcripts: ["add testimonials", "make it blue"] });
  await hf.start();
  await say();
  assert.equal(log.players.length, 1);
  await go(TALK, 800);
  assert.equal(log.players[0].stopped, true);
  assert.equal(log.states[log.states.length - 1], "listening");
  hf.stop();
});

test("pressing Voice again while it is already on does nothing; unsupported browsers say so", async () => {
  const { hf } = rig({ transcripts: ["x y"] });
  await hf.start(); await hf.start();
  assert.equal(hf.active, true);
  hf.stop();
  const no = HF.createHandsFree({ voice: { browserSupported: () => false }, transcribe() {}, speak() {}, run() {} });
  await assert.rejects(no.start(), /unsupported/);
  assert.equal(no.active, false);
});

test("a microphone that cannot start leaves it off and reports why", async () => {
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  const voice = { browserSupported: () => true, browserEnv: () => ({ getUserMedia: async () => { throw denied; } }), createVoiceSession };
  const hf = HF.createHandsFree({ voice, transcribe() {}, speak() {}, run() {} });
  await assert.rejects(hf.start(), (e) => e.name === "NotAllowedError");
  assert.equal(hf.active, false);
});

// ---- the Pulse widget's side of it ----
function widgetSource() { return fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.js"), "utf8"); }

test("the voice scripts are NOT loaded with the widget, only when Voice is first pressed", () => {
  const src = widgetSource();
  assert.match(src, /loadScript\('voice-vad\.js'\)/);
  assert.match(src, /loadScript\('voice-chat\.js'\)/);
  assert.match(src, /loadScript\('pulse-handsfree\.js'\)/);
  for (const page of ["builder.html", "app-builder.html", "amend_website.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "../public", page), "utf8");
    assert.ok(!/voice-vad\.js|pulse-handsfree\.js/.test(html), `${page} does not preload them`);
  }
});

test("the widget still loads on a bare page and exposes the Voice switch", () => {
  const noop = () => {};
  const ctx = vm.createContext({ window: { addEventListener: noop }, console, document: { readyState: "loading", addEventListener: noop }, setInterval: noop, setTimeout: noop, clearTimeout: noop, location: { pathname: "/builder.html" } });
  vm.runInContext(widgetSource(), ctx);
  assert.equal(typeof ctx.window.GurostPulseVoice.toggle, "function");
  assert.equal(ctx.window.GurostPulseVoice.active, false);
});
