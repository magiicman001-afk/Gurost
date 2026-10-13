// Run: node --test test/pulse-fix-queue.test.js
// Bug RR (client): the fix list says "still applying" once and stops; a fix that fails twice is dropped, not offered for ever.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

function load() {
  const said = [];
  const ctx = vm.createContext({
    window: {}, console, setInterval() {}, clearInterval() {},
    document: { createElement: () => ({}) },
    logBot: (who, text, kind) => said.push([kind, text]),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "public/shared/pulse-build-brain.js"), "utf8"), ctx);
  return { applyAll: ctx.window.PulseBuildBrain._internal.applyAll, said };
}
const issue = (name) => ({ issue: name, fix_prompt: "fix " + name, row: { querySelectorAll: () => [] } });

test("a busy answer is said once, the rest of the list is paused, and nothing is marked done", async () => {
  const { applyAll, said } = load();
  const issues = [issue("a"), issue("b"), issue("c")];
  let calls = 0;
  const r = await applyAll(issues, async () => { calls++; throw new Error("Pulse is still applying the last change - try again in a moment."); });
  assert.equal(calls, 1, "it did not hammer the server with the other fixes");
  assert.equal(r.stoppedBusy, true);
  assert.equal(said.filter(([, t]) => /still finishing the last change/.test(t)).length, 1);
  assert.ok(!said.some(([, t]) => /Couldn't fix/.test(t)), "no pile of 'Couldn't fix' lines");
  assert.ok(issues.every((i) => !i.done));
});

test("a fix that fails twice is dropped with a plain message; the others still run", async () => {
  const { applyAll, said } = load();
  const bad = issue("bad"), ok = issue("ok");
  const apply = async (p) => { if (/bad/.test(p)) throw new Error("model said no"); };
  await applyAll([bad, ok], apply);
  assert.ok(!bad.done);
  assert.match(said.find(([, t]) => /Couldn't fix "bad"/.test(t))[1], /model said no/);
  const r2 = await applyAll([bad], apply);
  assert.equal(bad.done, true, "second failure: given up");
  assert.equal(r2.abandoned, 1);
  assert.match(said.at(-1)[1], /after 2 tries, so I've dropped it/);
});
