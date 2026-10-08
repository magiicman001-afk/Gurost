// Run: node --test test/websocket-auth.test.js
// A real /ws/guide server and real WebSocket clients: nobody gets a
// project's build history or runs a Pulse edit without logging in as its
// owner (audit 2026-10-08 - the URL's userId used to be trusted).
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
process.env.OPENROUTER_API_KEY ||= "test-key"; // modules load; nothing real is called
const WebSocket = require("ws");

// Edits and suggestions are recorded, never run.
const edits = [];
const correctionBot = require("../bots/correction-bot");
correctionBot.applyCorrection = async (html, instruction) => { edits.push(instruction); return { html: html + "<!-- edited -->", summary: "ok" }; };
const guideBot = require("../guide/guide-bot");
guideBot.analyzeAndSuggest = async () => ({ suggestions: [] });
guideBot.classifyVoiceResponse = (t) => ({ intent: "edit", instruction: t });
const { attachGuideBotSocket, broadcastProjectUpdate } = require("../guide/websocket-server");

const PROJECTS = new Map([["p-owner", { userId: "u-owner", currentHtml: "<p>site</p>" }]]);
const USERS = { "tok-owner": { id: "u-owner" }, "tok-stranger": { id: "u-stranger" }, "tok-admin": { id: "u-admin", isAdmin: true } };
let server, base;

test.before(async () => {
  server = http.createServer();
  attachGuideBotSocket(server, PROJECTS, {
    authenticate: async ({ token }) => USERS[token] || null,
    loadProject: async (id) => PROJECTS.get(id) || null,
    authTimeoutMs: 300
  });
  await new Promise((r) => server.listen(0, r));
  base = `ws://127.0.0.1:${server.address().port}/ws/guide`;
  broadcastProjectUpdate("p-owner", { type: "stage_progress", stage: "designing", status: "partial", data: { html: "<p>secret draft</p>" } });
});
test.after(() => server.close());

// Opens a socket, optionally sends messages on open, and collects everything until it closes or settles.
function session(query, send = []) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${base}?${query}`);
    const got = [];
    let done = false;
    const finish = (code, reason) => { if (done) return; done = true; resolve({ got, code, reason: String(reason || ""), ws }); };
    ws.on("open", () => { for (const m of send) ws.send(typeof m === "string" ? m : JSON.stringify(m)); });
    ws.on("message", (d) => got.push(JSON.parse(d.toString())));
    ws.on("close", (code, reason) => finish(code, reason));
    setTimeout(() => finish(null, "still open"), 700);
  });
}

test("no login at all: closed, and nothing about the project is sent", async () => {
  const r = await session("projectId=p-owner&userId=u-owner");
  assert.equal(r.code, 4401);
  assert.equal(r.got.length, 0);
});

test("a stranger with a valid login and the right project id is refused - no history", async () => {
  const r = await session("projectId=p-owner", [{ type: "auth", token: "tok-stranger" }]);
  assert.equal(r.code, 4403);
  assert.equal(r.got.length, 0, "no build history, no presence");
});

test("a made-up token, or another user's project, gets the same 'Not allowed'", async () => {
  const bad = await session("projectId=p-owner", [{ type: "auth", token: "nope" }]);
  const missing = await session("projectId=p-does-not-exist", [{ type: "auth", token: "tok-owner" }]);
  assert.equal(bad.code, 4403);
  assert.equal(missing.code, 4403);
  assert.equal(bad.reason, missing.reason, "no hint whether the project exists");
});

test("a Pulse edit sent before logging in never runs", async () => {
  const before = edits.length;
  const r = await session("projectId=p-owner&userId=u-owner", [{ type: "pulse_text", text: "delete everything" }]);
  assert.equal(r.code, 4401);
  await new Promise((res) => setTimeout(res, 50));
  assert.equal(edits.length, before);
});

test("the owner gets in: build history replayed, presence uses the real id (not the URL's)", async () => {
  const r = await session("projectId=p-owner&userId=someone-else", [{ type: "auth", token: "tok-owner" }]);
  assert.equal(r.code, null, "stays open");
  assert.ok(r.got.some((m) => m.type === "stage_progress"), "history replayed");
  const presence = r.got.find((m) => m.type === "presence");
  assert.deepEqual(presence.users, ["u-owner"]);
  r.ws.close();
});

test("the owner's Pulse edit runs once logged in", async () => {
  const before = edits.length;
  const r = await session("projectId=p-owner", [{ type: "auth", token: "tok-owner" }]);
  r.ws.send(JSON.stringify({ type: "pulse_text", text: "make the footer brown" }));
  await new Promise((res) => setTimeout(res, 200));
  assert.equal(edits.length, before + 1);
  assert.equal(edits.at(-1), "make the footer brown");
  r.ws.close();
});

test("an admin may open any project (same rule as the REST routes)", async () => {
  const r = await session("projectId=p-owner", [{ type: "auth", token: "tok-admin" }]);
  assert.equal(r.code, null);
  r.ws.close();
});

test("no project id: refused straight away", async () => {
  const r = await session("", [{ type: "auth", token: "tok-owner" }]);
  assert.equal(r.code, 1008);
});

test("a socket that closes while its login is being checked never joins the room", async () => {
  const slowServer = http.createServer();
  let release;
  const gate = new Promise((r) => { release = r; });
  attachGuideBotSocket(slowServer, PROJECTS, { authenticate: async () => { await gate; return { id: "u-owner" }; }, loadProject: async (id) => PROJECTS.get(id), authTimeoutMs: 5000 });
  await new Promise((r) => slowServer.listen(0, r));
  const url = `ws://127.0.0.1:${slowServer.address().port}/ws/guide?projectId=p-owner`;
  const ws = new WebSocket(url);
  await new Promise((r) => ws.on("open", r));
  ws.send(JSON.stringify({ type: "auth", token: "tok-owner" }));
  await new Promise((r) => setTimeout(r, 50));
  ws.close();
  await new Promise((r) => setTimeout(r, 50));
  release(); // the login check finishes after the socket has gone
  await new Promise((r) => setTimeout(r, 50));
  const { presenceList } = require("../guide/websocket-server");
  assert.deepEqual(presenceList("p-owner"), [], "no dead entry left in the room");
  slowServer.close();
});
