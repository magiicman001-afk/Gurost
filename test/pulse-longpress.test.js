// Run: node --test test/pulse-longpress.test.js
// One mic, two ways (Irfan, 2026-10-13): TAP = talk, tap again to send. PRESS AND HOLD then let go = hands-free.
// The real holdToTalk from public/shared/pulse-voice.js, pressed like a finger would, with a pretend microphone.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const voice = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-voice.js"), "utf8");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function rig() {
  const log = { mics: 0, tracksStopped: 0, transcribed: 0 };
  class FakeRecorder {
    constructor() { this.state = "inactive"; this.listeners = {}; this.mimeType = "audio/webm"; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    start() { this.state = "recording"; setTimeout(() => (this.listeners.dataavailable || []).forEach((f) => f({ data: { size: 4000 } })), 5); }
    stop() { this.state = "inactive"; (this.listeners.stop || []).forEach((f) => f()); }
  }
  FakeRecorder.isTypeSupported = (t) => t === "audio/webm";
  const window = {
    GurostAPI: {
      call: async () => ({ available: true }),
      fetch: async () => { log.transcribed++; return { ok: true, json: async () => ({ transcript: "make the header blue" }) }; }
    }
  };
  const ctx = {
    window, console, setTimeout, clearTimeout, Promise, Date,
    navigator: { mediaDevices: { getUserMedia: async () => { log.mics++; return { getTracks: () => [{ stop: () => { log.tracksStopped++; } }] }; } } },
    MediaRecorder: FakeRecorder,
    Blob: class { constructor(parts, o) { this.size = 4000; this.type = o && o.type; } },
    fetch: window.GurostAPI.fetch
  };
  vm.createContext(ctx);
  vm.runInContext(voice + "\nthis.holdToTalk = holdToTalk;", ctx);
  const listeners = {};
  const button = { style: {}, addEventListener: (t, f) => { listeners[t] = f; }, setPointerCapture() {} };
  const down = () => listeners.pointerdown({ pointerId: 1 });
  const up = () => listeners.pointerup({ pointerId: 1 });
  return { ctx, log, button, down, up };
}

function handlers(extra = {}) {
  const h = { events: [] };
  for (const name of ["onPress", "onStart", "onTapMode", "onRelease", "onResult", "onError", "onLongPressReady", "onLongPress"]) {
    h[name] = (arg) => h.events.push(arg === undefined ? name : `${name}:${typeof arg === "string" ? arg : "session"}`);
  }
  return Object.assign(h, extra);
}

test("a tap starts listening; the next tap stops and sends", async () => {
  const r = rig(); const h = handlers();
  r.ctx.holdToTalk(r.button, h);
  r.down(); await wait(30); r.up();
  assert.ok(h.events.includes("onTapMode"));
  await wait(650);                     // talking
  r.down(); await wait(5); r.up();     // the stop tap
  await wait(400);                    // the recording runs a 300 ms tail after the stop tap
  assert.ok(h.events.includes("onResult:make the header blue"), h.events.join(","));
  assert.equal(r.log.transcribed, 1);
  assert.ok(!h.events.includes("onLongPress"));
});

test("press and hold, then let go: hands-free starts, and the short recording is thrown away (never sent)", { timeout: 5000 }, async () => {
  const r = rig(); const h = handlers();
  r.ctx.holdToTalk(r.button, h);
  r.down();
  await wait(760);
  assert.ok(h.events.includes("onLongPressReady"), "the mic shows it is about to switch");
  r.up();
  await wait(30);
  assert.ok(h.events.includes("onLongPress"));
  assert.equal(r.log.transcribed, 0, "nothing sent to speech-to-text");
  assert.ok(r.log.tracksStopped >= 1, "the press's own microphone is closed (hands-free opens its own)");
  assert.ok(!h.events.some((e) => e.startsWith("onResult")));
});

test("while hands-free is on, a tap only stops it - no new recording starts", async () => {
  const r = rig(); let stops = 0;
  const h = handlers({ interceptPress: () => { stops++; return true; } });
  r.ctx.holdToTalk(r.button, h);
  r.down(); await wait(20); r.up();
  await wait(20);
  assert.equal(stops, 1);
  assert.equal(r.log.mics, 0, "the microphone was not opened");
  assert.ok(!h.events.includes("onTapMode"));
});

test("pages without hands-free (Dashboard, Assistant) keep hold-to-talk: hold, speak, let go to send", { timeout: 5000 }, async () => {
  const r = rig(); const h = handlers();
  delete h.onLongPress; delete h.onLongPressReady;
  r.ctx.holdToTalk(r.button, h);
  r.down(); await wait(800); r.up();
  await wait(400);                    // 300 ms tail after letting go
  assert.ok(h.events.includes("onResult:make the header blue"), h.events.join(","));
});
