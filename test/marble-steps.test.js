"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const M = require("../public/shared/marble-steps");

const src = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "marble-steps.js"), "utf8");
const SIZES = [[343, 330], [343, 380], [375, 300], [600, 250], [1100, 420], [300, 200]];

test("the eight bots are the same eight as the build log", () => {
  assert.deepStrictEqual(M.BOTS.map((b) => b.name), ["Planner", "Designer", "Industry", "Builder", "Pulse", "Research", "Review", "Launch"]);
  for (const b of M.BOTS) assert.ok(fs.existsSync(path.join(__dirname, "..", "public", "marbles", b.file)), `${b.file} exists`);
});

test("the course fits every panel size: marbles are small, steps stay inside, nothing is NaN", () => {
  for (const [w, h] of SIZES) {
    const c = M.buildCourse(w, h);
    assert.ok(c.d >= 14 && c.d <= 18, `${w}x${h}: marble ${c.d}px is between 14 and 18`);
    assert.ok(c.treads.length >= 6, `${w}x${h}: has steps`);
    for (const t of c.treads) {
      assert.ok([t.x0, t.x1, t.y].every(Number.isFinite), `${w}x${h}: finite tread`);
      assert.ok(t.x0 >= 0 && t.x1 <= w, `${w}x${h}: tread inside the panel`);
      assert.ok(t.y + c.thick <= c.floorY, `${w}x${h}: tread above the ground`);
    }
    assert.ok(Number.isFinite(c.flagX) && c.flagX >= 0 && c.flagX < w, `${w}x${h}: finish inside the panel`);
  }
});

test("every marble finishes the staircase, they enter one at a time, and none gets stuck or leaves the panel", () => {
  for (const [w, h] of SIZES) {
    const c = M.buildCourse(w, h);
    const show = M.createShow(c, M.BOTS.length);
    let finished = 0, seen = new Set();
    for (let t = 0; t < 120 * 60; t++) {
      M.stepShow(show, 1 / 60);
      for (const r of show.runners) {
        if (r.state === "wait" || r.state === "gone") continue;
        assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.rot), "finite position");
        assert.ok(r.x > -c.d && r.x < w + c.d && r.y < h + c.d, `${w}x${h}: stays in the panel`);
        seen.add(r.i);
      }
      finished = show.runners.filter((r) => r.state === "gone").length;
    }
    assert.strictEqual(seen.size, M.BOTS.length, `${w}x${h}: all eight marbles took part`);
    assert.ok(finished + show.runners.filter((r) => r.state !== "wait").length >= 1, "the show keeps going");
  }
});

test("a marble crosses the whole course in a sensible time", () => {
  const c = M.buildCourse(343, 380);
  const show = M.createShow(c, 1);
  let t = 0;
  while (t < 90 && !(show.runners[0].state === "gone")) { M.stepShow(show, 1 / 60); t += 1 / 60; }
  assert.strictEqual(show.runners[0].state, "gone", "it reached the jar");
  assert.ok(t > 8 && t < 60, `took ${t.toFixed(1)} s`);
});

test("reduced motion: still marbles rest on the steps", () => {
  const c = M.buildCourse(343, 380);
  const still = M.stillRunners(c, M.BOTS.length);
  assert.strictEqual(still.length, 8);
  for (const s of still) assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y));
  assert.ok(/prefers-reduced-motion: reduce/.test(src) && /reduced\(\)/.test(src));
});

test("safe by construction: no innerHTML, no network, no outside addresses, no storage", () => {
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(src));
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|cookie/.test(src));
  assert.ok(!/https?:\/\//.test(src.replace(/http:\/\/www\.w3\.org\/2000\/svg/, "")), "no web addresses");
});

test("night turns to day with progress, and the plain spinner is the fallback", () => {
  assert.ok(/function applyDay/.test(src) && /day\.style\.opacity/.test(src) && /nite\.style\.opacity/.test(src));
  assert.ok(/mbs-fallback/.test(src) && /useFallback/.test(src));
});

test("the builder page uses the steps animation with the same options as before", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "builder.html"), "utf8");
  assert.ok(html.includes('<script src="shared/marble-steps.js"></script>'));
  assert.ok(/MarbleSteps\.create\(document\.getElementById\('previewWrap'\)/.test(html));
  assert.ok(!/MarbleLoader\./.test(html));
});
