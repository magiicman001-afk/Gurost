// Run: node --test test/pulse-unsupported-media.test.js
// Bug PP (phone test 2026-10-13): asking an existing site for 3D images changed nothing and said nothing. Now Pulse answers honestly.
// Video is answered by the server (real stock clip, or a plain "none available"), so it is NOT intercepted here.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const noop = () => {};
const ctx = vm.createContext({ window: { addEventListener: noop }, console, document: { readyState: "loading", addEventListener: noop }, setInterval: noop, setTimeout: noop, clearTimeout: noop, location: { pathname: "/builder.html" } });
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "public/shared/pulse-widget.js"), "utf8"), ctx);
const { decide } = ctx.window.GurostPulseRoute;
const SAY = "3D images are not available yet. I can add stock photos instead. Want me to?";

test("asking an existing site for 3D images gets the honest answer, not a silent edit", () => {
  for (const text of ["add 3D images", "Can you make the hero a 3D image", "generate 3-D renders of the dogs", "I want three-dimensional pictures", "add motion video and 3D images"]) {
    const r = decide(text, "ready", true);
    assert.equal(r.action, "reply", text);
    assert.equal(r.kind, "unsupported", text);
    assert.equal(r.say, SAY, text);
  }
});

test("video requests are left to the server (it finds a real clip or says none is available); photos and ordinary edits are edits", () => {
  for (const text of ["add a video in the background", "add motion video", "put images as well", "add more photos of dogs", "make the header blue", "3 columns please", "add 3 services"]) {
    assert.equal(decide(text, "ready", true).action, "edit", text);
  }
});

test("a brand-new build is not blocked by the word (it still builds)", () => {
  assert.equal(decide("a pet salon website with a 3D hero", "none", true).action, "build");
});
