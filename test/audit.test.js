// Run: node --test test/audit.test.js
// The audit trail: what is kept, what is hidden, that it never breaks the work, and where events come from.
const test = require("node:test");
const assert = require("node:assert/strict");
const audit = require("../lib/audit");
const tools = require("../lib/tools");
const approvals = require("../lib/approvals");
const { createDepartmentChat } = require("../lib/department-chat");
const deptBots = require("../lib/department-bots");
const modelRouter = require("../lib/model-router");
const toolLoop = require("../lib/tools/loop");

const quiet = async (fn) => { const l = console.log, e = console.error; console.log = () => {}; console.error = () => {}; try { return await fn(); } finally { console.log = l; console.error = e; } };
const settle = () => new Promise((r) => setImmediate(r));

function fakeDb({ failInsert = false } = {}) {
  const rows = [];
  return {
    rows,
    from: () => ({
      insert: (r) => { if (failInsert) return Promise.resolve({ error: { message: "db down" } }); rows.push({ ...r, created_at: new Date(2026, 0, 1, 0, 0, rows.length).toISOString() }); return Promise.resolve({ error: null }); },
      select: () => {
        const f = []; let lim = 1000; let desc = false;
        const b = { eq(k, v) { f.push((r) => r[k] === v); return b; }, lt(k, v) { f.push((r) => r[k] < v); return b; }, order() { desc = true; return b; }, limit(n) { lim = n; return b; },
          then(res, rej) { let out = rows.filter((r) => f.every((x) => x(r))); if (desc) out = out.slice().reverse(); return Promise.resolve({ data: out.slice(0, lim), error: null }).then(res, rej); } };
        return b;
      }
    })
  };
}

test("secrets are hidden: passwords, keys, card numbers", () => {
  assert.equal(audit.redact("password: hunter2"), "password: [hidden]");
  assert.match(audit.redact("key sk-abcdefghijklmnopqrstuvwxyz123456 end"), /\[key hidden\]/);
  assert.match(audit.redact("card 4111 1111 1111 1111 ok"), /\[number hidden\]/);
  assert.ok(!audit.redact("Authorization: Bearer abc123").includes("abc123"));
  assert.equal(audit.redact("a normal sentence about shipping"), "a normal sentence about shipping");
});

test("message bodies are never copied, only their length; drafts are only named", () => {
  assert.equal(audit.summarizeArgs({ to: "a@b.com", subject: "Hi", body: "Dear John, secret plans" }), '{"to":"a@b.com","subject":"Hi","body":"[23 chars]"}');
  assert.equal(audit.summarizeResult({ type: "email", body: "long text" }), "email prepared");
});

test("a row has the agreed columns, is trimmed, and approval time is set only with a decision", () => {
  const r = audit.toRow({ userId: 7, botType: "sales", event: "chat", tool: "chat", ok: true, input: "x".repeat(1000), modelRequested: ["a", "b"], modelUsed: "a", ip: "1.2.3.4" });
  assert.equal(r.user_id, "7");
  assert.ok(r.input.length <= 300);
  assert.equal(r.model_requested, "a,b");
  assert.equal(r.approved_by_user, null);
  assert.equal(r.approved_at, null);
  const d = audit.toRow({ userId: "u", event: "approval", approved: false });
  assert.equal(d.approved_by_user, false);
  assert.ok(d.approved_at);
  assert.equal(audit.toRow({ userId: "u", event: "nonsense" }).event, "error");
});

test("record never throws, even when the database fails or input is junk", async () => {
  assert.equal(await quiet(() => audit.record(fakeDb({ failInsert: true }), { userId: "u", event: "chat" })), false);
  assert.equal(await audit.record(fakeDb(), null), false);
  assert.equal(await audit.record(fakeDb(), { event: "chat" }), false, "no user, no row");
  assert.equal(await audit.record(null, { userId: "u", event: "chat" }), false);
  assert.equal(await audit.record(fakeDb(), { userId: "u", event: "chat" }), true);
});

test("list is newest first, filtered, and limited", async () => {
  const db = fakeDb();
  for (const [u, e] of [["u1", "chat"], ["u2", "tool_call"], ["u1", "error"]]) await audit.record(db, { userId: u, event: e });
  assert.deepEqual((await audit.list(db, {})).map((r) => r.event), ["error", "tool_call", "chat"]);
  assert.deepEqual((await audit.list(db, { userId: "u1" })).map((r) => r.event), ["error", "chat"]);
  assert.equal((await audit.list(db, { event: "chat" })).length, 1);
  assert.equal((await audit.list(db, { limit: 1 })).length, 1);
  assert.equal((await audit.list(db, { limit: 99999 })).length, 3, "limit is capped, not trusted");
});

test("tool calls reach the audit sink: success, failure, and held-for-approval", async () => {
  const seen = []; tools.setAuditSink((e) => seen.push(e));
  const gated = { name: "audit_gated", description: "x", needsApproval: true, parameters: { type: "object", properties: { to: { type: "string" } }, required: ["to"] }, async execute() { return {}; } };
  tools.register(gated);
  const ctx = { userId: "u1", botType: "finance", ip: "9.9.9.9" };
  await quiet(async () => {
    await tools.runTool("calculator", { expression: "2+2" }, ctx);
    await tools.runTool("calculator", { expression: "" }, ctx);
    await tools.runTool("audit_gated", { to: "x" }, ctx);
    await tools.runTool("calculator", { expression: "1+1" }, {}); // no user: nothing to record
  });
  tools.setAuditSink(null);
  assert.deepEqual(seen.map((e) => [e.tool, e.ok, !!e.blocked]), [["calculator", true, false], ["calculator", false, false], ["audit_gated", false, true]]);
  assert.deepEqual([seen[0].botType, seen[0].ip], ["finance", "9.9.9.9"]);
});

function chatSetup({ replies, audited, failLoop }) {
  const claudeClient = { async callClaude() { const r = replies.shift(); if (r instanceof Error) throw r; return { parsed: r, modelUsed: "anthropic/claude-haiku-4.5" }; } };
  const botMemory = { async prepareChat() { return { history: [], memoryBlock: "", stored: true }; }, async recordExchange() { return true; }, async listMemory() { return []; }, async rememberItems(_d, _u, items) { return items.length; } };
  let learn;
  const memoryExtract = { learnFromExchange(a) { learn = a; } };
  const db = fakeDb();
  const chat = createDepartmentChat({ botPrefs: async () => ({ data: { tone: "casual", signature: "A", profile: {} }, error: null }), db, deptBots, botMemory, modelRouter, toolLoop, claudeClient, memoryExtract, freeModel: "f", audit });
  return { chat, db, learn: () => learn };
}
const input = { userId: "u1", plan: "unlimited", ip: "1.1.1.1", botId: "sales", message: "reply to John about the invoice" };

test("a chat turn is audited with the requested and the answering model, without the message text", async () => {
  const { chat, db } = chatSetup({ replies: ["Sure."], audited: true });
  await quiet(async () => { await chat.run(input); await settle(); });
  const row = db.rows.find((r) => r.event === "chat");
  assert.equal(row.bot_type, "sales");
  assert.match(row.model_requested, /claude-haiku/);
  assert.equal(row.model_used, "anthropic/claude-haiku-4.5");
  assert.ok(!JSON.stringify(row).includes("invoice"), "the message text is not stored");
  assert.equal(row.ip_address, "1.1.1.1");
});

test("a failed turn is audited as an error", async () => {
  const { chat, db } = chatSetup({ replies: [new Error("OPENROUTER down")] });
  await quiet(async () => { await chat.run(input); await settle(); });
  const row = db.rows.find((r) => r.event === "error");
  assert.match(row.output, /OPENROUTER/);
});

test("saving a note is audited by count, never by content", async () => {
  const { chat, db, learn } = chatSetup({ replies: ["Sure."] });
  await quiet(async () => { await chat.run(input); await learn().save([{ memory_type: "fact", key: "k", value: "Likes blue" }]); await settle(); });
  const row = db.rows.find((r) => r.tool_used === "memory_save");
  assert.equal(row.output, "1 note(s) saved");
});

test("a chat still works when auditing is broken", async () => {
  const claudeClient = { async callClaude() { return { parsed: "Fine." }; } };
  const chat = createDepartmentChat({ botPrefs: async () => ({ data: { tone: "casual", signature: "A", profile: {} }, error: null }), db: {}, deptBots,
    botMemory: { async prepareChat() { return { history: [], memoryBlock: "", stored: false }; } }, modelRouter, toolLoop, claudeClient, memoryExtract: { learnFromExchange() {} }, freeModel: "f",
    audit: { record() { throw new Error("audit exploded"); } } });
  const out = await quiet(() => chat.run(input));
  assert.equal(out.status, 200);
});

test("approve and cancel report which tool and bot they were for, for the audit line", async () => {
  const rows = []; const mk = (status) => ({ id: "i1", user_id: "u1", bot_type: "sales", tool: "t", args: { a: 1 }, summary: "s", status, expires_at: new Date(Date.now() + 60000).toISOString() });
  const db = { from: () => { const f = {}; const b = { select() { return b; }, eq(k, v) { f[k] = v; return b; }, update() { return b; }, then(res) { return Promise.resolve({ data: [mk("pending")], error: null }).then(res); } }; return b; } };
  const a = await approvals.approve(db, "u1", "i1", { run: async (_n, _a, row) => ({ ok: true, result: { row: row.bot_type } }) });
  assert.deepEqual(a.meta, { tool: "t", botType: "sales" });
  assert.deepEqual(a.body.result, { row: "sales" });
  const c = await approvals.cancel(db, "u1", "i1");
  assert.deepEqual(c.meta, { tool: "t", botType: "sales" });
});
