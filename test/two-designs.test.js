// Run: node --test test/two-designs.test.js
// A build starts with two designs (Minimal, Bold); "Show me 2 more" adds Corporate and Playful. The page no
// longer depends on the WebSocket alone to learn that a design finished (a phone drops it).
process.env.WS_KEEPALIVE_MS = "20";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "t";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("a build starts with Minimal and Bold; Corporate and Playful are the extra two", () => {
  const vb = require("../bots/variant-bot");
  assert.deepEqual(vb.FIRST_BRIEF_IDS, ["minimal", "bold"]);
  assert.deepEqual(vb.MORE_BRIEF_IDS, ["corporate", "playful"]);
  assert.deepEqual([...vb.FIRST_BRIEF_IDS, ...vb.MORE_BRIEF_IDS].sort(), vb.BRIEFS.map((b) => b.id).sort(), "every direction is in one set or the other");
  const src = read("bots/variant-bot.js");
  assert.match(src, /briefIds = FIRST_BRIEF_IDS/);
  assert.match(src, /BRIEFS\.filter\(\(b\) => briefIds\.includes\(b\.id\)\)\.map/);
});

test("the start route records what the page needs without the socket; the more route is once-only and guarded", () => {
  const s = read("server.js");
  assert.match(s, /project\.expectedVariants = 2;\n\s+project\.buildFinished = false;\n\s+project\.failedVariants = \[\];/);
  assert.match(s, /app\.post\("\/api\/website-builder\/more"/);
  const more = s.slice(s.indexOf('app.post("/api/website-builder/more"'), s.indexOf("// ==== REAL, VISIBLE CREDIT STATUS ROUTE"));
  assert.match(more, /if \(project\.currentHtml\)/, "not after a design is picked");
  assert.match(more, /if \(project\.moreRequested\) return res\.status\(409\)/, "once per project");
  assert.match(more, /if \(project\.buildFinished === false\) return res\.status\(409\)/, "not while the first designs are still being made");
  assert.match(more, /briefIds: variantBot\.MORE_BRIEF_IDS/);
  assert.match(more, /if \(!result\.variants\.length\) project\.moreRequested = false/, "a batch that produced nothing can be retried");
  assert.ok(!/chargeCredits/.test(more), "no extra credit");
});

test("the page keeps asking the project record until the build is over, wakes on foreground, and reconnects", () => {
  const b = read("public/builder.html");
  assert.match(b, /function startCompletionPollFallback\(id\) \{ watchBuild\(id\); \}/);
  assert.match(b, /if \(finished\) \{\n\s+setPreviewStatus\(false\);\n\s+updateMoreButton\(project\);\n\s+stopWatchingBuild\(\);/, "stops when the build is over, not when the first design shows");
  assert.ok(!/real variants already showing - the WebSocket did its job/.test(b), "the old stop-after-first-design rule is gone");
  assert.match(b, /visibilitychange'.*wakeBuildWatch/);
  assert.match(b, /addEventListener\('online', wakeBuildWatch\)/);
  assert.match(b, /scheduleReconnect\(id\); \/\/ only does anything while a build is being waited on/);
  assert.match(b, /id="moreDesignsBtn"/);
  assert.ok(!/\/4\)|of 4 designs/.test(b), "no hard-coded four");
});

test("the keepalive pings every client and closes one that stops answering", async () => {
  // `ws` and `diff-match-patch` are not installed in every environment: stand-ins are enough for this logic.
  const orig = Module._load;
  Module._load = function (request, ...rest) {
    if (request === "ws") {
      class WebSocketServer { constructor() { this.clients = new Set(); this.handlers = {}; } on(e, f) { this.handlers[e] = f; } emit() {} handleUpgrade() {} }
      return { WebSocketServer, WebSocket: class {} };
    }
    if (request === "diff-match-patch") return class DiffMatchPatch {}; // not needed by this logic
    return orig.call(this, request, ...rest);
  };
  let wss;
  try {
    const { attachGuideBotSocket } = require("../guide/websocket-server");
    wss = attachGuideBotSocket({ on() {} }, new Map());
  } finally { Module._load = orig; }
  const mk = () => ({ pings: 0, terminated: false, missedPongs: 0, ping() { this.pings++; }, terminate() { this.terminated = true; this.clientsGone = true; } });
  const alive = mk(), dead = mk();
  wss.clients.add(alive); wss.clients.add(dead);
  const answer = setInterval(() => { alive.missedPongs = 0; }, 5); // answers every ping
  await new Promise((r) => setTimeout(r, 200));
  clearInterval(answer);
  wss.handlers.close && wss.handlers.close();
  assert.ok(alive.pings >= 3, "pinged repeatedly");
  assert.ok(!alive.terminated, "a client that answers stays open");
  assert.ok(dead.terminated, "a client that never answers is closed");
  assert.ok(dead.pings <= 3, "and is not pinged forever");
});
