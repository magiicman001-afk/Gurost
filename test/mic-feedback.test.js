"use strict";
// Dashboard mic (Irfan, 2026-10-14): red while recording, buzz and beep on press / ready / release, rings only while
// the microphone is on, a short tail so the last word is not cut off, and British English for the speech service.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const fb = read("public/shared/mic-feedback.js");
const dash = read("public/dashboard.html");
const voice = read("public/shared/pulse-voice.js");

function run(win) { new Function("window", "navigator", fb)(win, win.navigator); return win.GurostMicFeedback; }

test("press buzzes 80 ms, release buzzes twice, ready and micOff each play one tone", () => {
  const buzzes = []; let tones = 0, resumed = 0;
  class AC {
    constructor() { this.state = "suspended"; this.currentTime = 0; this.destination = {}; }
    resume() { resumed++; }
    createOscillator() { tones++; return { type: "", frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
  }
  const api = run({ AudioContext: AC, navigator: { vibrate: (ms) => { buzzes.push(ms); return true; } } });
  api.press(); api.ready(); api.release(); api.micOff();
  assert.deepStrictEqual(buzzes, [80, [60, 50, 60]]);
  assert.strictEqual(tones, 2, "one tone on ready, one on micOff");
  assert.ok(resumed >= 1, "the sound is unlocked inside the press");
});

test("without vibration or Web Audio (iPhone, old browsers) nothing throws", () => {
  const api = run({ navigator: {} });
  assert.doesNotThrow(() => { api.press(); api.ready(); api.release(); api.micOff(); });
  const api2 = run({ navigator: { vibrate() { throw new Error("blocked"); } }, AudioContext: class { constructor() { throw new Error("no audio"); } } });
  assert.doesNotThrow(() => { api2.press(); api2.ready(); api2.release(); api2.micOff(); });
});

test("the feedback uses no audio files, no network and no HTML", () => {
  assert.ok(!/fetch\(|XMLHttpRequest|\.mp3|\.wav|new Audio|innerHTML/.test(fb));
});

test("Dashboard: the mic goes red, the rings only show while recording, and the status line tells the stage", () => {
  assert.match(dash, /#dashMicBtn\.starting, #dashMicBtn\.recording \{ background: #DC2626/);
  assert.match(dash, /^\s*\.mic-ring \{[^}]*opacity: 0/m, "rings are invisible by default");
  assert.match(dash, /#dashMicBtn\.recording \.mic-ring \{ animation: mic-ring/, "and only animate while recording");
  assert.ok(!/^\s*\.mic-ring \{[^}]*animation: mic-ring/m.test(dash), "no always-on animation on the base ring");
  assert.match(dash, /prefers-reduced-motion: reduce\)[^\n]*#dashMicBtn\.recording \.mic-ring \{ animation: none/, "reduced motion: a still ring, no pulsing");
  for (const t of ["Getting the mic ready", "Listening", "Working out what you said"]) assert.ok(dash.includes(t), t);
  assert.match(dash, /id="dashMicStatus"[^>]*aria-live="polite"/);
});

test("Dashboard wires the feedback in the right places, with mic-feedback.js loaded before the mic code", () => {
  assert.ok(dash.indexOf("shared/mic-feedback.js") > 0 && dash.indexOf("shared/mic-feedback.js") < dash.indexOf("holdToTalk(micBtn"));
  assert.match(dash, /onPress: \(\) => \{[^}]*fb\.press\(\)/);
  assert.match(dash, /onStart: \(\) => \{ fb\.ready\(\)/);
  assert.match(dash, /onRelease: \(\) => \{ fb\.release\(\)/);
  assert.match(dash, /onMicOff: \(\) => fb\.micOff\(\)/);
});

test("pulse-voice: keeps recording a short tail after release and reports when the microphone really stopped", () => {
  assert.match(voice, /const TAIL_MS = 300/);
  assert.match(voice, /recorder\.stop\(\); \}, wait \+ TAIL_MS\)/);
  assert.match(voice, /stop: \(onMicOff\) =>/);
  assert.strictEqual((voice.match(/s\.stop\(handlers\.onMicOff\)/g) || []).length, 2, "hold-to-talk and tap-to-talk both pass it");
});

test("speech service asks for British English with punctuation, and logs numbers only, never the words", () => {
  const vc = read("guide/voice-client.js");
  assert.match(vc, /language=en-GB/);
  assert.match(vc, /smart_format=true/);
  assert.match(vc, /model=nova-3/);
  const logLine = vc.split("\n").find((l) => l.includes("[voice] transcribed"));
  assert.ok(logLine && !/\$\{transcript\}|transcript\b(?!\.length)/.test(logLine.replace("chars=${transcript.length}", "")), "the log line has no transcript text");
});

test("mic debug panel: only with ?micdebug=1, lists events with textContent, never the spoken words", () => {
  assert.match(dash, /\/\[\?&\]micdebug=1\/\.test\(location\.search\)/);
  const block = dash.slice(dash.indexOf("Mic debug panel"), dash.indexOf("const micBtn = document.getElementById"));
  assert.match(block, /line\.textContent = /);
  assert.ok(!/innerHTML/.test(block));
  assert.ok(!/transcript/.test(block), "the panel code never touches the transcript");
  assert.ok(!/transcript\b[^\n]*micDebug|micDebug\([^\n]*\btranscript\b(?!\s*\|\|)/.test(voice.replace(/String\(transcript \|\| ""\)\.length/, "")), "pulse-voice only reports the length of the transcript");
});

test("speech log also records seconds of audio, word count and when the last word ended", () => {
  const vc = read("guide/voice-client.js");
  assert.match(vc, /audio_secs=\$\{audioSecs\}/);
  assert.match(vc, /words=\$\{words\.length\}/);
  assert.match(vc, /last_word_ends_at=/);
});
