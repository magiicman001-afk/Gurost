// Run: node --test test/pulse-stuck-edit.test.js
// Bug RR (phone test 2026-10-13): after one edit hung, every later Pulse edit answered "still applying the last change".
// server.js cannot be loaded in a test, so the pieces are checked in its source, and the watchdog rule is run on a copy of its code.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");

test("the edit lock has a watchdog: a CORRECTING project with no running edit (or one far over the limit) is reset, not refused for ever", () => {
  assert.match(src, /const ACTIVE_EDITS = new Map\(\)/);
  assert.match(src, /clearStuckEdit\(project, projectId\);\n\s+if \(project\.state === "CORRECTING"\) \{\n\s+return res\.status\(409\)/);
  assert.match(src, /ACTIVE_EDITS\.set\(projectId, Date\.now\(\)\)/);
  assert.match(src, /ACTIVE_EDITS\.delete\(projectId\);\n\s+if \(recoverTo && project\.state === "CORRECTING"\)/, "the catch always clears the running mark");
});

test("a hung edit is stopped by a hard stop that also frees the project lock, and a late result is never applied", () => {
  assert.match(src, /PULSE_EDIT_HARD_STOP_MS = PULSE_EDIT_TIMEOUT_MS \+ 20000/);
  assert.match(src, /Promise\.race\(\[work, hardStop\]\)/);
  assert.match(src, /hardStop\.catch\(\(\) => \{\}\)/);
  assert.match(src, /if \(abandoned\) throw new Error\("The edit finished after it was stopped/);
  assert.match(src, /\.finally\(\(\) => clearTimeout\(hardStopTimer\)\)/);
});

test("every edit's start, end and failure is written to build_logs (bot pulse, task edit)", () => {
  assert.match(src, /bot: "pulse", task: "edit", decision: "started"/);
  assert.match(src, /bot: "pulse", task: "edit", decision: "applied"/);
  assert.match(src, /bot: "pulse", task: "edit", decision: tooSlow \? "timed out" : "failed"/);
});

test("the watchdog rule itself (run on the real function text)", () => {
  const start = src.indexOf("const ACTIVE_EDITS");
  const end = src.indexOf('app.post("/api/pulse"');
  const code = src.slice(start, end).replace(/const PULSE_EDIT_HARD_STOP_MS = [^\n]+\n/, "");
  const log = [];
  const ctx = vm.createContext({ console: { warn: (m) => log.push(m) }, Date, Math, PULSE_EDIT_HARD_STOP_MS: 95000, transition: (p, to) => { p.state = to; } });
  vm.runInContext(code + "\nthis.clear = clearStuckEdit; this.A = ACTIVE_EDITS;", ctx);
  const mk = (state) => ({ state });
  let p = mk("DONE");
  assert.equal(ctx.clear(p, "a"), false, "not correcting: nothing to do");
  p = mk("CORRECTING");
  assert.equal(ctx.clear(p, "a"), true, "correcting but nothing running here (e.g. after a restart): reset");
  assert.equal(p.state, "DONE");
  p = mk("CORRECTING"); ctx.A.set("b", Date.now() - 20000);
  assert.equal(ctx.clear(p, "b"), false, "really running (20 s): leave it, the caller answers 'busy'");
  assert.equal(p.state, "CORRECTING");
  p = mk("CORRECTING"); ctx.A.set("c", Date.now() - 200000);
  assert.equal(ctx.clear(p, "c"), true, "running far past the hard stop: reset");
  assert.equal(p.state, "DONE");
  assert.ok(log.length === 2 && /stuck edit lock/.test(log[0]));
});
