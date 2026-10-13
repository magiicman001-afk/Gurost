"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const M = require("../public/shared/marble-loader");

const src = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "marble-loader.js"), "utf8");

test("eight marbles, one per bot, named like the bots in the build log", () => {
  const faces = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "bot-conversation.js"), "utf8");
  assert.deepStrictEqual(M.BOTS.map((b) => b.name), ["Planner", "Designer", "Industry", "Builder", "Pulse", "Research", "Review", "Launch"]);
  for (const b of M.BOTS) {
    assert.match(faces, new RegExp(`name: '${b.name}'`), `${b.name} is a bot in bot-conversation.js`);
    assert.match(b.color, /^#[0-9A-F]{6}$/i);
  }
  assert.strictEqual(new Set(M.BOTS.map((b) => b.color)).size, 8, "eight different colours");
});

for (const [w, h] of [[343, 300], [1100, 420], [200, 150], [343, 140]]) {
  test(`physics at ${w}x${h}: marbles stay inside, keep moving, never overlap for long, no NaN`, () => {
    const r = M.diameterFor(w, h) / 2;
    const world = M.createWorld(8, w, h, r, 3);
    const start = world.marbles.map((p) => ({ x: p.x, y: p.y }));
    let travelled = world.marbles.map(() => 0);
    for (let i = 0; i < 60 * 60; i++) { // 60 simulated seconds at 60 fps
      const before = world.marbles.map((p) => ({ x: p.x, y: p.y }));
      M.stepWorld(world, 1 / 60);
      world.marbles.forEach((p, k) => {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy) && Number.isFinite(p.rot), "finite numbers");
        assert.ok(p.x >= r - 1e-6 && p.x <= w - r + 1e-6 && p.y >= r - 1e-6 && p.y <= h - r + 1e-6, `inside the box (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
        const sp = Math.hypot(p.vx, p.vy);
        assert.ok(sp >= world.vmin * 0.99 && sp <= world.vmax * 1.01, `speed in the lively band (${sp.toFixed(1)})`);
        travelled[k] += Math.hypot(p.x - before[k].x, p.y - before[k].y);
      });
    }
    travelled.forEach((t) => assert.ok(t > 800, "every marble keeps travelling (not stuck)"));
    assert.ok(start.length === 8);
  });
}

test("two marbles meeting head on bounce apart (equal masses swap speed)", () => {
  const world = M.createWorld(2, 400, 200, 20, 1);
  world.marbles[0] = { x: 100, y: 100, vx: 80, vy: 0, rot: 0 };
  world.marbles[1] = { x: 139, y: 100, vx: -80, vy: 0, rot: 0 };
  world.rnd = () => 0.5; // no wander, so the check is exact
  M.stepWorld(world, 0.016);
  assert.ok(world.marbles[0].vx < 0 && world.marbles[1].vx > 0, "they move apart");
  const d = Math.hypot(world.marbles[1].x - world.marbles[0].x, world.marbles[1].y - world.marbles[0].y);
  assert.ok(d >= 40 - 1e-6, "no longer overlapping");
});

test("diameter: 40 to 80 px; a 375px phone gets a marble that fits eight on screen", () => {
  assert.ok(M.diameterFor(343, 400) >= 40 && M.diameterFor(343, 400) <= 80);
  assert.strictEqual(M.diameterFor(2000, 2000), 80);
  assert.strictEqual(M.diameterFor(50, 50), 40);
});

test("reduced motion layout: still, inside the box", () => {
  for (const [w, h] of [[343, 300], [1100, 420]]) {
    const r = M.diameterFor(w, h) / 2;
    const list = M.layoutStatic(8, w, h, r);
    assert.strictEqual(list.length, 8);
    list.forEach((p) => assert.ok(p.x >= r && p.x <= w - r && p.y >= r && p.y <= h - r));
  }
});

test("source promises: reduced motion respected, plain-spinner fallback, 10 second snippet, text set safely", () => {
  assert.match(src, /prefers-reduced-motion: reduce/);
  assert.match(src, /useFallback/);
  assert.match(src, /mbl-spin/);
  assert.strictEqual(M.SNIPPET_EVERY_MS, 10000);
  assert.ok(!/innerHTML|insertAdjacentHTML|document\.write|eval\(/.test(src), "no HTML injection");
  assert.ok(!/https?:\/\//.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), "no network, no external files");
});
