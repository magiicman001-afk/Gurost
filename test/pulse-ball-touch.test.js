// Run: node --test test/pulse-ball-touch.test.js
// The Pulse ball on a phone: one tap used to open the panel and the emulated mouseup closed it again.
// (Behaviour checked in a real touch-emulated browser; these guard the wiring that fixed it.)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../public/shared/pulse-widget.css"), "utf8");

test("the ball no longer releases on touchend (that plus the emulated mouseup toggled the panel twice)", () => {
  assert.ok(!/ball\.addEventListener\('touchend'/.test(src));
});

test("a finger or pen starts and ends a press through pointer events", () => {
  assert.match(src, /e\.pointerType !== 'mouse'\) \{ lastTouchAt = Date\.now\(\); startPress\(\)/);
  assert.match(src, /releaseBall\(\); \/\/ a quick tap toggles the panel/);
});

test("mouse events that follow a touch are ignored; a real mouse and dispatched mouse events still work", () => {
  assert.match(src, /ball\.addEventListener\('mousedown', \(\) => \{ if \(!fromTouch\(\)\) startPress\(\); \}\)/);
  assert.match(src, /ball\.addEventListener\('mouseup', \(\) => \{ if \(!fromTouch\(\)\) releaseBall\(\); \}\)/);
});

test("a browser-cancelled touch is never a tap, and a long press cannot open the phone's menu", () => {
  assert.match(src, /e\.type === 'pointercancel' && !isHolding/);
  assert.match(src, /ball\.addEventListener\('contextmenu'/);
  assert.match(css, /#pulseBall \{[^}]*-webkit-touch-callout: none/);
});
