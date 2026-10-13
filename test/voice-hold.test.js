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
  assert.match(voice, /button\.addEventListener\("mousedown", \(\) => \{ if \(!fromPointer\(\)\) press\(\); \}\)/);
  assert.match(voice, /button\.addEventListener\("mouseup", \(\) => \{ if \(!fromPointer\(\)\) release\(\); \}\)/);
});

test("the emulated-mouse guard restarts when the finger lifts (a long hold used to start a second recording)", () => {
  assert.match(voice, /const lifted = \(\) => \{ lastPointerAt = Date\.now\(\); release\(\); \}/);
});

test("a release while the microphone is still starting is remembered and applied when it is ready", () => {
  assert.match(voice, /if \(starting\) \{ releaseWanted = true; return; \}/);
  assert.match(voice, /if \(releaseWanted\) settle\(\);/);
});

test("hold OR tap: a quick press keeps recording until the next press; a long press stops on release", () => {
  assert.match(voice, /const TAP_MS = 450/);
  assert.match(voice, /if \(heldMs < TAP_MS\) \{ tapMode = true; handlers\.onTapMode\?\.\(\); return; \}/);
  assert.match(voice, /if \(tapMode\) \{ ignoreRelease = true; finish\(session\); \}/);
  assert.match(voice, /if \(session && !tapMode\) settle\(\);/);
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

test("a short recording is never rejected with a 'too short' error: stop() keeps listening until 0.6s", () => {
  assert.match(voice, /const MIN_RECORDING_MS = 600/);
  assert.ok(!/TOO_SHORT_TEXT|That was too short/.test(voice), "the old error message is gone");
  assert.match(voice, /const wait = Math\.max\(0, MIN_RECORDING_MS - \(Date\.now\(\) - startedAt\)\);/);
});

test("an iPhone mp4 recording is re-sent as 16 kHz mono WAV, with the original as fallback", () => {
  assert.match(voice, /if \(mimeType === "audio\/mp4"\)/);
  assert.match(voice, /const wav = await blobToWav\(blob\);\n\s+if \(wav\) \{ blob = wav; sendType = "audio\/wav"; \}/);
  assert.match(voice, /const RATE = 16000/);
  assert.match(voice, /catch \{ return null; \}/);
});

test("the transcribe route refuses non-audio and empty bodies, and never shows the speech service's own words", () => {
  const server = read("server.js");
  const route = server.slice(server.indexOf('app.post("/api/voice/transcribe"'), server.indexOf('app.post("/api/voice/speak"'));
  assert.match(route, /!Buffer\.isBuffer\(req\.body\) \|\| bytes < 1500/);
  assert.match(route, /console\.error\(`\[voice\] transcription failed: type=\$\{mimeType\} bytes=\$\{bytes\}/);
  assert.ok(!/res\.status\(502\)\.json\(\{ error: err\.message \}\)/.test(route));
  assert.match(route, /I couldn't make out that recording/);
});
