"use strict";
// The real holdToTalk, pressed like a finger, with a pretend microphone. Phone test 2026-10-14: the sentence was cut off in the
// middle. If the browser takes the touch away (pointercancel) the finger has NOT lifted, so nothing may be sent: keep listening.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const voice = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-voice.js"), "utf8");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function rig(micDelayMs = 0) {
  const log = { transcribed: 0, debug: [] };
  class FakeRecorder {
    constructor() { this.state = "inactive"; this.listeners = {}; this.mimeType = "audio/webm"; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    start() { this.state = "recording"; setTimeout(() => (this.listeners.dataavailable || []).forEach((f) => f({ data: { size: 4000 } })), 5); }
    stop() { this.state = "inactive"; (this.listeners.stop || []).forEach((f) => f()); }
  }
  FakeRecorder.isTypeSupported = (t) => t === "audio/webm";
  const window = {
    GurostAPI: { call: async () => ({ available: true }), fetch: async () => { log.transcribed++; return { ok: true, json: async () => ({ transcript: "build me a website for a gym" }) }; } },
    __micDebug: (t) => log.debug.push(t)
  };
  const ctx = {
    window, console, setTimeout, clearTimeout, Promise, Date,
    navigator: { mediaDevices: { getUserMedia: async () => { if (micDelayMs) await wait(micDelayMs); return { getTracks: () => [{ stop() {} }], getAudioTracks: () => [] }; } } },
    MediaRecorder: FakeRecorder,
    Blob: class { constructor(parts, o) { this.size = 4000; this.type = o && o.type; } },
    fetch: window.GurostAPI.fetch
  };
  vm.createContext(ctx);
  vm.runInContext(voice + "\nthis.holdToTalk = holdToTalk;", ctx);
  const listeners = {};
  const button = { style: {}, addEventListener: (t, f) => { listeners[t] = f; }, setPointerCapture() {} };
  return { ctx, log, button, down: () => listeners.pointerdown({ pointerId: 1, pointerType: "touch" }), up: () => listeners.pointerup({ pointerId: 1 }), cancel: () => listeners.pointercancel({ pointerId: 1 }) };
}
function handlers() {
  const h = { events: [] };
  for (const n of ["onPress", "onStart", "onTapMode", "onRelease", "onResult", "onError"]) h[n] = (a) => h.events.push(a === undefined ? n : `${n}:${a}`);
  return h;
}

test("the browser takes the touch away in the middle of a hold: nothing is sent, it keeps listening, the next tap sends", async () => {
  const r = rig(); const h = handlers();
  r.ctx.holdToTalk(r.button, h);
  r.down(); await wait(900);          // holding and talking
  r.cancel(); await wait(700);        // touch lost mid-sentence
  assert.equal(r.log.transcribed, 0, "NOT sent");
  assert.ok(h.events.includes("onTapMode"), "tap mode: the page tells the person to tap to send");
  assert.ok(!h.events.includes("onRelease"));
  r.down(); await wait(5); r.up(); await wait(400); // the tap that sends
  assert.equal(r.log.transcribed, 1);
  assert.ok(h.events.includes("onResult:build me a website for a gym"), h.events.join(","));
});

test("the touch is taken away while the microphone is still starting: it carries on as a tap once ready", async () => {
  const r = rig(300); const h = handlers();
  r.ctx.holdToTalk(r.button, h);
  r.down(); await wait(100); r.cancel(); await wait(500);
  assert.equal(r.log.transcribed, 0);
  assert.ok(h.events.some((e) => e.startsWith("onStart")) && h.events.includes("onTapMode"), h.events.join(","));
  r.down(); await wait(5); r.up(); await wait(900); // the tap that sends (also clears the one-minute timer)
  assert.equal(r.log.transcribed, 1);
});

test("a normal hold and let-go still sends, and the debug lines say what happened", async () => {
  const r = rig(); const h = handlers();
  r.ctx.holdToTalk(r.button, h);
  r.down(); await wait(800); r.up(); await wait(400);
  assert.equal(r.log.transcribed, 1);
  assert.ok(r.log.debug.some((l) => /^finger down \(touch\)/.test(l)) && r.log.debug.some((l) => /^finger up after \d+ ms/.test(l)), r.log.debug.join(" | "));
});

test("a recording left running in tap mode is sent after a minute (the microphone never stays on)", () => {
  assert.match(voice, /setTimeout\(\(\) => \{ if \(session && tapMode\) finish\(session\); \}, 60000\)/);
});
