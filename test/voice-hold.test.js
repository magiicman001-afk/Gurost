// Run: node --test test/voice-hold.test.js
// Hold-to-talk mics on a phone (panel, Dashboard, Assistant): one shared helper in pulse-voice.js.
// (Behaviour was checked in a touch-emulated browser; these guard the pieces that fixed it.)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const voice = read("public/shared/pulse-voice.js");

function pick(supported) {
  const ctx = { MediaRecorder: { isTypeSupported: (t) => supported.includes(t) }, window: {}, navigator: {} };
  vm.createContext(ctx);
  vm.runInContext(voice + "\nthis.pickRecorderMime = pickRecorderMime;", ctx);
  return ctx.pickRecorderMime();
}

test("recorder format comes from what the browser supports (iPhone: mp4 only)", () => {
  assert.equal(pick(["audio/mp4"]), "audio/mp4");
  assert.equal(pick(["audio/webm", "audio/ogg"]), "audio/webm");
  assert.equal(pick(["audio/ogg"]), "audio/ogg");
  assert.equal(pick([]), "");
  assert.ok(!/isTypeSupported\("audio\/webm"\) \? "audio\/webm" : "audio\/ogg"/.test(voice), "old webm-else-ogg guess is gone");
});

test("the helper uses pointer events and ignores mouse events that follow a touch", () => {
  assert.match(voice, /button\.addEventListener\("pointerdown"/);
  assert.match(voice, /button\.addEventListener\("mousedown", \(\) => \{ if \(!fromTouch\(\)\) press\(\); \}\)/);
  assert.match(voice, /button\.addEventListener\("mouseup", \(\) => \{ if \(!fromTouch\(\)\) release\(\); \}\)/);
});

test("the emulated-mouse guard restarts when the finger lifts (a long hold used to start a second recording)", () => {
  assert.match(voice, /const lifted = \(e\) => \{ if \(e\.pointerType !== "mouse"\) lastTouchAt = Date\.now\(\); release\(\); \}/);
});

test("a release while the microphone is still starting is remembered", () => {
  assert.match(voice, /if \(starting\) \{ releaseWanted = true; return; \}/);
  assert.match(voice, /if \(releaseWanted\) \{ finish\(s\); return; \}/);
});

test("voice status is fetched ahead of the press, never awaited inside it (iOS needs the tap to reach getUserMedia)", () => {
  assert.match(voice, /prefetchVoiceStatus\(\);\n\n  button\.style\.touchAction/);
  const press = voice.slice(voice.indexOf("function press()"), voice.indexOf("function release()"));
  assert.ok(!/await /.test(press));
  assert.match(press, /voiceStatus === false/);
});

test("a missing voice key shows the plain message, not a setting name", () => {
  assert.match(voice, /not configured\/i\.test\(msg\) \? VOICE_NOT_SET_UP : msg/);
});

test("panel, Dashboard and Assistant mics all use the helper and no longer listen for bare mousedown/touchend", () => {
  for (const f of ["public/shared/pulse-widget.js", "public/dashboard.html", "public/assistant.html"]) {
    const s = read(f);
    assert.match(s, /holdToTalk\(/, f);
    assert.ok(!/startRecordingSession\(\)/.test(s.replace(/recordingStartPromise = startRecordingSession\(\)/, "")), f + " still starts recordings by hand");
  }
  assert.ok(!/micBtn\.addEventListener\('touchend'/.test(read("public/shared/pulse-widget.js")));
});
