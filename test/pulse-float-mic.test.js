// Run: node --test test/pulse-float-mic.test.js
// The tap-to-talk mic in the Pulse panel's top-right corner (checked in a real 375px touch browser: tap starts and pulses,
// second tap stops and sends the transcript, a denied microphone says so and does not stay red).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.css"), "utf8");

test("the mic sits in the panel header next to Close, as a button with an accessible name", () => {
  assert.match(src, /<div id="pulseHeaderButtons">\s*<button id="pulseFloatMic" type="button" aria-label="Tap to talk, tap again to stop"/);
});

const voice = fs.readFileSync(path.join(__dirname, "../public/shared/pulse-voice.js"), "utf8");

test("the panel mic uses the shared tapToTalk helper (no hand-started recordings), one microphone user at a time", () => {
  assert.match(src, /tapToTalk\(floatMic, \{\s*onPress: stopHandsFree,/);
  assert.match(src, /onResult: \(transcript\) => \{ setState\('idle'\); if \(transcript\) sendCorrection\(transcript\); \}/);
});

test("tapToTalk: first tap starts, second tap stops and sends; errors reset the mic; it listens to click only", () => {
  const h = voice.slice(voice.indexOf("function tapToTalk"), voice.indexOf("async function speakTextViaRest"));
  assert.match(h, /if \(session\) \{ finish\(session\); return; \}/);
  assert.match(h, /handlers\.onRelease\?\.\(\); handlers\.onError\?\.\(micErrorText\(err\)\)/);
  assert.match(h, /button\.addEventListener\("click", tap\)/);
  assert.ok(!/await /.test(h), "nothing is awaited before the recording starts (iOS)");
});

test("it is a 44px touch target, pulses while listening, and respects reduced motion", () => {
  assert.match(css, /#pulseFloatMic \{ width: 44px; height: 44px;/);
  assert.match(css, /#pulseFloatMic\.listening \{[^}]*animation: pulseFloatMic/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ #pulseFloatMic\.listening \{ animation: none/);
});
