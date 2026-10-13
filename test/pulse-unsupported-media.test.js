// Run: node --test test/pulse-unsupported-media.test.js
// Phone test 2026-10-13 (Bug PP): "add motion video and 3D images" changed nothing and said nothing. Now Pulse answers honestly.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const noop = () => {};
const ctx = vm.createContext({ window: { addEventListener: noop }, console, document: { readyState: "loading", addEventListener: noop }, setInterval: noop, setTimeout: noop, clearTimeout: noop, location: { pathname: "/builder.html" } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "public/shared/pulse-widget.js"), "utf8"), ctx);
const { decide } = ctx.window.GurostPulseRoute;
const SAY = "Motion video and 3D images are not available yet. I can add stock photos instead. Want me to?";

test("asking an existing site for motion video or 3D images gets the honest answer, not a silent edit", () => {
  for (const text of ["add motion video and 3D images", "Can you make the hero a 3D image", "put a video in the background", "I want an animated video on the homepage", "generate 3-D renders of the dogs", "add moving footage"]) {
    const r = decide(text, "ready", true);
    assert.equal(r.action, "reply", text);
    assert.equal(r.kind, "unsupported", text);
    assert.equal(r.say, SAY, text);
  }
});

test("ordinary edits, photo requests and video LINKS are still edits", () => {
  for (const text of ["put images as well", "add more photos of dogs", "make the header blue", "add a YouTube video link", "embed our vimeo video", "3 columns please", "add 3 services"]) {
    assert.equal(decide(text, "ready", true).action, "edit", text);
  }
});

test("a brand-new build is not blocked by the word (it still builds)", () => {
  assert.equal(decide("a pet salon website with a 3D hero", "none", true).action, "build");
});
