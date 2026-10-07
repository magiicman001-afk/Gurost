// Run: node --test test/voice-chat.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const v = require("../lib/voice-chat");

test("voice is available only when the Deepgram key is set", () => {
  assert.equal(v.voiceAvailable({}), false);
  assert.equal(v.voiceAvailable({ DEEPGRAM_API_KEY: "" }), false);
  assert.equal(v.voiceAvailable({ DEEPGRAM_API_KEY: "k" }), true);
});

test("only real audio types are accepted, with or without codec details", () => {
  for (const ok of ["audio/webm", "audio/webm;codecs=opus", "AUDIO/WAV", "audio/mp4", "audio/ogg; codecs=opus"]) assert.equal(v.acceptedAudioType(ok), true, ok);
  for (const bad of ["", undefined, "text/html", "application/octet-stream", "video/webm", "image/png"]) assert.equal(v.acceptedAudioType(bad), false, String(bad));
});

test("spoken text drops markdown and links, and says the draft is on screen instead of reading it", () => {
  assert.equal(v.spokenText({ reply: "**Sure.** See [our page](https://x.com/a) or https://y.com/b now.", draft: null }), "Sure. See our page or the link now.");
  assert.equal(v.spokenText({ reply: "I assumed 3 tiers.", draft: "Hi John ..." }), "I assumed 3 tiers. The draft is on your screen.");
  assert.equal(v.spokenText({ reply: "", draft: "Hi John" }), "I have written that for you. The draft is on your screen.");
  assert.equal(v.spokenText({ reply: "- one\n- two\n# Heading", draft: null }), "one two Heading");
});

test("a long answer is cut at a sentence end, within the limit", () => {
  const long = Array.from({ length: 60 }, (_, i) => `This is sentence number ${i}.`).join(" ");
  const out = v.spokenText({ reply: long, draft: null });
  assert.ok(out.length <= v.MAX_SPOKEN_CHARS);
  assert.ok(out.endsWith("."));
  assert.ok(!out.endsWith("..."));
  const noStops = v.spokenText({ reply: "word ".repeat(300), draft: null });
  assert.ok(noStops.length <= v.MAX_SPOKEN_CHARS + 3 && noStops.endsWith("..."));
});
