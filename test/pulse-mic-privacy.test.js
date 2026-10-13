// Run: node --test test/pulse-mic-privacy.test.js
// Privacy (Irfan, 2026-10-13): "I clicked Stop and it carried on listening. This is DANGEROUS."
// The Pulse widget's own rules around the microphone. The session logic itself is tested in
// voice-chat.session.test.js and pulse-handsfree.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const widget = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-widget.js"), "utf8");
const voice = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-voice.js"), "utf8");
const body = (src, start, end) => src.slice(src.indexOf(start), src.indexOf(end, src.indexOf(start)));

test("a tap while voice is still loading or starting is Stop - it used to be ignored and the mic came on afterwards", () => {
  const toggle = body(widget, "async function toggleHandsFree()", "voiceLoading = true;");
  assert.match(toggle, /if \(voiceLoading \|\| \(handsFree && handsFree\.active\)\) \{ stopHandsFree\(\); return; \}/);
  assert.doesNotMatch(toggle, /if \(voiceLoading\) return;/);
  const rest = body(widget, "async function toggleHandsFree()", "// Never listen in the background");
  assert.match(rest, /if \(voiceCancelled\) return;/, "cancelled before the session is made");
  assert.match(rest, /await handsFree\.start\(\);\s*if \(voiceCancelled\) stopHandsFree\(\);/, "cancelled during the microphone start");
});

test("Stop resets the button and the red ball itself, not only when the session reports back", () => {
  const stop = body(widget, "function stopHandsFree()", "async function toggleHandsFree()");
  assert.match(stop, /if \(voiceLoading\) voiceCancelled = true;/);
  assert.match(stop, /if \(handsFree\) handsFree\.stop\(\);/);
  assert.match(stop, /setVoiceButton\(false\);/);
  assert.match(stop, /if \(currentState === 'recording' && !activeRecording\) setState\('idle'\);/);
});

test("the microphone goes off when the page is hidden (phone locked, other tab) or closed", () => {
  assert.match(widget, /document\.addEventListener\('visibilitychange', \(\) => \{ if \(document\.visibilityState === 'hidden'\) micOffInBackground\(\); \}\);/);
  assert.match(widget, /window\.addEventListener\('pagehide', micOffInBackground\);/);
  const off = body(widget, "function micOffInBackground()", "document.addEventListener('visibilitychange'");
  assert.match(off, /stopHandsFree\(\);/);
  assert.match(off, /activeRecording\.cancel\(\);/);
});

test("a hold-to-talk recording can be cancelled: microphone off and the audio thrown away, never sent", () => {
  const cancel = body(voice, "cancel: () => {", "stop: () =>");
  assert.match(cancel, /chunks\.length = 0;/);
  assert.match(cancel, /stream\.getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\);/);
  assert.doesNotMatch(cancel, /fetch|transcribe/);
});
