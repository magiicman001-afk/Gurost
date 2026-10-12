"use strict";
// Bug GG / HH: an edit has a time limit, failures are logged and answered plainly, and the page recovers from a dropped
// connection by asking the server instead of showing the old page.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

let hasDmp = true;
try { require.resolve("diff-match-patch"); } catch { hasDmp = false; }

test("applyCorrection hands the same deadline to both model calls", { skip: hasDmp ? false : "diff-match-patch is not installed here (it is on the laptop and on Render)" }, async () => {
  const claudePath = require.resolve("../lib/claude-client");
  const calls = [];
  const real = require.cache[claudePath];
  require.cache[claudePath] = { id: claudePath, filename: claudePath, loaded: true, exports: { callClaude: async (o) => { calls.push(o.deadline); return calls.length === 1 ? { parsed: { patch: { find: "NOPE", replace: "x" }, summary: "s" }, usage: {} } : { parsed: { html: "<p>b</p>", summary: "s" }, usage: {} }; } } };
  delete require.cache[require.resolve("../bots/correction-bot")];
  try {
    const bot = require("../bots/correction-bot");
    const deadline = Date.now() + 75000;
    const r = await bot.applyCorrection("<p>a</p>", "change it", { plan: "pro", deadline });
    assert.equal(r.html, "<p>b</p>");
    assert.deepEqual(calls, [deadline, deadline]);
  } finally {
    if (real) require.cache[claudePath] = real; else delete require.cache[claudePath];
    delete require.cache[require.resolve("../bots/correction-bot")];
  }
});

test("server: a too-slow edit is logged and answered 504 with a plain message; other failures stay 500", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(src, /PULSE_EDIT_TIMEOUT_MS = Number\(process\.env\.PULSE_EDIT_TIMEOUT_MS\) \|\| 75000/);
  assert.match(src, /deadline: Date\.now\(\) \+ PULSE_EDIT_TIMEOUT_MS/);
  assert.match(src, /console\.error\(`\[pulse\] \$\{action\} failed on/);
  assert.match(src, /res\.status\(tooSlow \? 504 : 500\)/);
  assert.match(src, /Your page is unchanged/);
});

test("builder: a dropped connection is checked against the server, and a late partial cannot repaint a picked page", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "builder.html"), "utf8");
  // Recovery runs only when there is no HTTP status (a network failure), and polls the saved project.
  assert.match(html, /if \(err && err\.status\) throw err;/);
  assert.match(html, /async function waitForSavedEdit/);
  assert.match(html, /\/api\/project\/\$\{projectId\}`\)/);
  assert.match(html, /Saved \\u2713/);
  assert.match(html, /if \(!pickerVisible\(\) && !currentHtml\)/);
});

test("waitForSavedEdit: adopts the saved page, gives up when the server is idle and unchanged", async () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "builder.html"), "utf8");
  const src = /async function waitForSavedEdit[\s\S]*?\n}\n/.exec(html)[0];
  const make = (responses) => {
    let i = 0;
    const GurostAPI = { call: async () => { const r = responses[Math.min(i++, responses.length - 1)]; if (r instanceof Error) throw r; return r; } };
    return new Function("GurostAPI", "projectId", `${src}; return waitForSavedEdit;`)(GurostAPI, "p1");
  };
  // still correcting twice, network down once, then the edit lands
  const ok = make([{ state: "CORRECTING", currentHtml: "old" }, new Error("Failed to fetch"), { state: "DONE", currentHtml: "new" }]);
  assert.deepEqual(await ok("old", { tries: 5, every: 1 }), { html: "new", summary: "Your edit went through." });
  // the server went idle with the page unchanged: the edit failed
  const failed = make([{ state: "DONE", currentHtml: "old" }]);
  assert.equal(await failed("old", { tries: 6, every: 1 }), null);
});
