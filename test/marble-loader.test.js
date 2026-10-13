"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const M = require("../public/shared/marble-loader");

const src = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "marble-loader.js"), "utf8");

test("the eight marble pictures exist, are real PNGs with a transparent corner, and are a sensible size", () => {
  const dir = path.join(__dirname, "..", "public", "marbles");
  for (const b of M.BOTS) {
    const file = path.join(dir, b.file);
    assert.ok(fs.existsSync(file), `${b.file} exists`);
    const buf = fs.readFileSync(file);
    assert.strictEqual(buf.slice(1, 4).toString(), "PNG", `${b.file} is a PNG`);
    assert.strictEqual(buf[25], 6, `${b.file} is RGBA (colour type 6), so it can have a transparent background`);
    assert.ok(buf.length >= 20 * 1024 && buf.length <= 500 * 1024, `${b.file} is ${Math.round(buf.length / 1024)} KB (20 to 500 KB)`);
    assert.strictEqual(buf.readUInt32BE(16), buf.readUInt32BE(20), `${b.file} is square`);
  }
});

test("eight marbles, one per bot, named like the bots in the build log", () => {
  const faces = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "bot-conversation.js"), "utf8");
  assert.deepStrictEqual(M.BOTS.map((b) => b.name), ["Planner", "Designer", "Industry", "Builder", "Pulse", "Research", "Review", "Launch"]);
  for (const b of M.BOTS) {
    assert.match(faces, new RegExp(`name: '${b.name}'`), `${b.name} is a bot in bot-conversation.js`);
    assert.strictEqual(b.file, `${b.name.toLowerCase()}.png`, "picture is named after the bot");
  }
  assert.strictEqual(new Set(M.BOTS.map((b) => b.file)).size, 8, "eight different pictures");
});

for (const [w, h] of [[343, 300], [1100, 420], [200, 150], [343, 140]]) {
  test(`physics at ${w}x${h}: marbles stay inside, keep moving, no NaN, steady slow speed`, () => {
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
        assert.ok(sp >= 54 && sp <= 96, `speed stays moderate (${sp.toFixed(1)} px/s)`);
        travelled[k] += Math.hypot(p.x - before[k].x, p.y - before[k].y);
      });
    }
    travelled.forEach((t) => assert.ok(t > 800, "every marble keeps travelling (not stuck)"));
    assert.ok(start.length === 8);
  });
}

test("a marble that reaches a wall turns around and stays inside (left, right, up, down)", () => {
  const world = M.createWorld(1, 200, 100, 20, 1);
  world.marbles[0] = { x: 181, y: 50, vx: 100, vy: 0, rot: 0, spin: 0.2 };
  M.stepWorld(world, 0.05);
  assert.ok(world.marbles[0].vx < 0, "bounced off the right wall");
  world.marbles[0] = { x: 100, y: 21, vx: 0, vy: -100, rot: 0, spin: 0.2 };
  M.stepWorld(world, 0.05);
  assert.ok(world.marbles[0].vy > 0 && world.marbles[0].y >= 20, "bounced off the top wall");
});

test("no marble-to-marble physics: two marbles on the same spot just pass through", () => {
  const world = M.createWorld(2, 400, 200, 20, 1);
  world.marbles[0] = { x: 100, y: 100, vx: 60, vy: 0, rot: 0, spin: 0 };
  world.marbles[1] = { x: 105, y: 100, vx: -60, vy: 0, rot: 0, spin: 0 };
  M.stepWorld(world, 0.016);
  assert.ok(world.marbles[0].vx === 60 && world.marbles[1].vx === -60, "speeds untouched");
  assert.ok(!/stepWorld[\s\S]*?collid/i.test(src), "no collision code left");
});

test("diameter: 48 to 88 px; a 375px phone gets a marble that fits eight on screen", () => {
  assert.ok(M.diameterFor(343, 400) >= 48 && M.diameterFor(343, 400) <= 88);
  assert.strictEqual(M.diameterFor(2000, 2000), 88);
  assert.strictEqual(M.diameterFor(50, 50), 48);
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
  assert.ok(!/https?:\/\//.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), "no external addresses: pictures come from our own /marbles/ folder");
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket/.test(src), "no network calls");
  assert.match(src, /onerror/, "a missing picture triggers the plain spinner");
  assert.ok(!/createRadialGradient|paintBody|paintGloss/.test(src), "the drawn marbles are gone");
});
