// Run: node --test test/department-chat.test.js
// The whole chat turn, with the database, model and memory replaced by stand-ins.
const test = require("node:test");
const assert = require("node:assert/strict");
const { createDepartmentChat } = require("../lib/department-chat");
const deptBots = require("../lib/department-bots");
const modelRouter = require("../lib/model-router");
const toolLoop = require("../lib/tools/loop");

const quiet = async (fn) => { const l = console.log, e = console.error; console.log = () => {}; console.error = () => {}; try { return await fn(); } finally { console.log = l; console.error = e; } };

function setup({ replies = ["Happy to help."], prefs = { data: { tone: "casual", signature: "Alex", profile: {} }, error: null }, stored = true, history = [], memoryBlock = "" } = {}) {
  const seen = { calls: [], recorded: [], learned: [] };
  const claudeClient = { async callClaude(a) { seen.calls.push(a); const r = replies.shift(); if (r instanceof Error) throw r; return { parsed: r }; } };
  const botMemory = {
    async prepareChat(_db, userId, botId, clientHistory) { seen.prepared = { userId, botId, clientHistory }; return { history, memoryBlock, stored }; },
    async recordExchange(_db, userId, botId, msg, answer) { seen.recorded.push({ userId, botId, msg, answer }); return true; },
    async listMemory() { return []; }, async rememberItems(_db, _u, items) { return items.length; }
  };
  const memoryExtract = { learnFromExchange(a) { seen.learned.push(a); } };
  const chat = createDepartmentChat({ botPrefs: async () => prefs, db: {}, deptBots, botMemory, modelRouter, toolLoop, claudeClient, memoryExtract, freeModel: "free/model:free" });
  return { chat, seen };
}
const input = { userId: "u1", plan: "unlimited", ip: "1.2.3.4", botId: "sales", message: "reply to John" };

test("a normal turn: reply returned, exchange saved, learning started, model chosen by task", async () => {
  const { chat, seen } = setup({ replies: ["Here you go.\n\n--- DRAFT ---\nHi John\n--- END DRAFT ---"], history: [{ role: "user", content: "earlier" }], memoryBlock: "NOTES" });
  const out = await quiet(() => chat.run(input));
  assert.equal(out.status, 200);
  assert.deepEqual([out.body.reply, out.body.draft, out.body.toolsUsed, out.body.proposals], ["Here you go.", "Hi John", [], []]);
  assert.match(seen.calls[0].system, /\nNOTES\n/, "saved notes are added to the prompt");
  assert.deepEqual(seen.calls[0].messages.map((m) => m.content).slice(0, 1), ["earlier"], "server-side history comes first");
  assert.match(seen.calls[0].model, /claude-haiku/, "a drafting task on Unlimited goes to the draft model");
  assert.equal(seen.recorded.length, 1);
  assert.match(seen.recorded[0].answer, /--- DRAFT ---\nHi John/);
  assert.equal(seen.learned.length, 1);
  assert.equal(seen.learned[0].userText, "reply to John");
});

test("a tool call runs and its draft card comes back", async () => {
  const { chat } = setup({ replies: ['TOOL_CALL: {"tool":"email_draft","args":{"subject":"Hi","body":"Hello John"}}', "Done, check the card."] });
  const out = await quiet(() => chat.run(input));
  assert.equal(out.body.toolsUsed[0], "email_draft");
  assert.equal(out.body.proposals[0].type, "email");
});

test("memory off or unavailable: the chat still answers, saves nothing, learns nothing", async () => {
  const { chat, seen } = setup({ stored: false });
  const out = await quiet(() => chat.run(input));
  assert.equal(out.status, 200);
  assert.deepEqual([seen.recorded.length, seen.learned.length], [0, 0]);
});

test("a custom bot with no setup is refused politely", async () => {
  const { chat } = setup({ prefs: { data: null, error: null } });
  const out = await quiet(() => chat.run({ ...input, botId: "custom" }));
  assert.equal(out.status, 400);
  assert.match(out.body.error, /custom bot/);
});

test("model and database failures become plain messages, never a crash", async () => {
  const credit = setup({ replies: [new Error("OpenRouter error (402)")] });
  const a = await quiet(() => credit.chat.run(input));
  assert.deepEqual([a.status, /credits or a key/.test(a.body.error)], [500, true]);
  const other = setup({ replies: [new Error("socket hang up")] });
  const b = await quiet(() => other.chat.run(input));
  assert.match(b.body.error, /could not answer just now/);
  const db = setup({ prefs: { data: null, error: { message: "db down" } } });
  assert.equal((await quiet(() => db.chat.run(input))).status, 500);
  const empty = setup({ replies: [""] });
  assert.equal((await quiet(() => empty.chat.run(input))).status, 500);
  assert.equal(empty.seen.recorded.length, 0, "a fallback line is never saved as the bot's answer");
});
