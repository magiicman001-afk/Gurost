// Run: node --test test/bot-widgets.test.js
// Business Assistant 2.0, phase 1: the 8 floating bot widgets. The browser run (375px) is in the commit message.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const W = require("../public/shared/bot-widgets.js");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("there are exactly 8 bots, each with a real avatar file and a first line", () => {
  assert.equal(W.BOTS.length, 8);
  assert.deepEqual(W.BOTS.map((b) => b.id).sort(), ["builder", "designer", "industry", "launch", "planner", "pulse", "research", "review"]);
  for (const b of W.BOTS) {
    assert.ok(fs.existsSync(path.join(__dirname, "..", "public", "avatars", b.img + ".png")), b.id + " avatar");
    assert.ok(b.opens && b.role && /^#[0-9a-f]{6}$/i.test(b.color));
  }
});

test("position is kept on screen and clear of the Pulse ball", () => {
  assert.equal(W.clampTop(-50, 700, 400), 8);
  assert.equal(W.clampTop(9999, 700, 400), 700 - 400 - 88);
  assert.equal(W.clampTop(null, 700, 400), 126);
  assert.equal(W.clampTop(NaN, 300, 400), 8, "a tiny screen never gives a negative top");
});

test("state survives a save and load, ignores junk, and works with no storage at all", () => {
  const mem = {}; const storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } };
  assert.equal(W.saveState(storage, { top: 210, hidden: ["review"], collapsed: true }), true);
  assert.deepEqual(W.loadState(storage), { top: 210, hidden: ["review"], collapsed: true });
  mem[W.STORE_KEY] = JSON.stringify({ top: "x", hidden: ["review", "<script>"], collapsed: "yes" });
  assert.deepEqual(W.loadState(storage), { top: null, hidden: ["review"], collapsed: false });
  mem[W.STORE_KEY] = "{not json";
  assert.deepEqual(W.loadState(storage), { top: null, hidden: [], collapsed: false });
  assert.deepEqual(W.loadState(null), { top: null, hidden: [], collapsed: false });
  assert.equal(W.saveState({ setItem() { throw new Error("blocked"); } }, { top: 1, hidden: [] }), false);
});

test("gestures: a small move is a tap, a clear swipe right puts the bot away, vertical scrolling is neither", () => {
  assert.equal(W.gesture(2, 3), "tap");
  assert.equal(W.gesture(80, 10), "dismiss");
  assert.equal(W.gesture(-80, 0), "none");
  assert.equal(W.gesture(60, 70), "none");
  assert.equal(W.gesture(20, 0), "none");
});

test("put-away bots leave the strip", () => {
  assert.deepEqual(W.visibleBots({ hidden: ["review", "pulse"] }).map((b) => b.id).includes("review"), false);
  assert.equal(W.visibleBots({ hidden: [] }).length, 8);
});

test("the widget never writes server text as HTML, and respects reduced motion", () => {
  const js = read("public/shared/bot-widgets.js"), css = read("public/shared/bot-widgets.css");
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
  assert.match(css, /max-width: 520px/);
});

test("it is wired into the builder, the dashboard and (after sign-in) the admin page", () => {
  for (const p of ["public/builder.html", "public/dashboard.html"]) {
    const h = read(p);
    assert.match(h, /shared\/bot-widgets\.css/, p);
    assert.match(h, /shared\/bot-widgets\.js/, p);
  }
  const admin = read("public/admin-dashboard.html");
  assert.match(admin, /bot-widgets\.css/);
  assert.match(admin, /async function showDashboard[\s\S]{0,400}bot-widgets\.js/, "loaded only once the admin is signed in");
});
