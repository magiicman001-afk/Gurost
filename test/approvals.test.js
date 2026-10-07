// Run: node --test test/approvals.test.js
// Approval gates: parking, approve / edit / cancel, expiry, double approval, other users, and the loop.
const test = require("node:test");
const assert = require("node:assert/strict");
const approvals = require("../lib/approvals");
const toolLoop = require("../lib/tools/loop");
const tools = require("../lib/tools");

// A tiny stand-in for the Supabase client: one table, eq filters, insert/select/update.
function fakeDb() {
  const rows = [];
  const builder = (op, arg) => {
    const filters = []; let afterSelect = false;
    const b = {
      eq(k, v) { filters.push([k, v]); return b; },
      select() { if (op === "update") afterSelect = true; return b; },
      then(res, rej) {
        const hit = rows.filter((r) => filters.every(([k, v]) => r[k] === v));
        let out = { data: null, error: null };
        if (op === "insert") rows.push({ ...arg });
        else if (op === "select") out = { data: hit.map((r) => ({ ...r })), error: null };
        else if (op === "update") { hit.forEach((r) => Object.assign(r, arg)); out = { data: afterSelect ? hit.map((r) => ({ id: r.id })) : null, error: null }; }
        return Promise.resolve(out).then(res, rej);
      }
    };
    return b;
  };
  return { rows, from: () => ({ insert: (r) => builder("insert", r), select: () => builder("select"), update: (p) => builder("update", p) }) };
}

const writeTool = {
  name: "send_thing", description: "Sends a thing", needsApproval: true,
  parameters: { type: "object", properties: { to: { type: "string", description: "Who" }, body: { type: "string", description: "Text" } }, required: ["to", "body"] },
  describe: (a) => `Send to ${a.to}`,
  async execute(a) { return { sent: a.to + ":" + a.body }; }
};
const userA = "ua", userB = "ub";
const mk = (db, user = userA, args = { to: "bob", body: "hi" }) => approvals.create(db, { userId: user, botType: "sales", tool: writeTool, args });
const run = (calls) => async (name, args) => { calls.push([name, args]); return { ok: true, result: await writeTool.execute(args) }; };

test("create parks the action and returns an editable card", async () => {
  const db = fakeDb(); const card = await mk(db);
  assert.equal(card.summary, "Send to bob");
  assert.deepEqual(card.fields.map((f) => [f.name, f.value]), [["to", "bob"], ["body", "hi"]]);
  assert.equal(db.rows[0].status, "pending");
  assert.equal(db.rows[0].user_id, userA);
});

test("approve runs the tool once and marks it done", async () => {
  const db = fakeDb(); const card = await mk(db); const calls = [];
  const out = await approvals.approve(db, userA, card.id, { run: run(calls) });
  assert.equal(out.status, 200);
  assert.deepEqual(calls, [["send_thing", { to: "bob", body: "hi" }]]);
  assert.equal(db.rows[0].status, "done");
});

test("approving with edits runs the edited arguments", async () => {
  const db = fakeDb(); const card = await mk(db); const calls = [];
  await approvals.approve(db, userA, card.id, { editedArgs: { to: "carol", body: "changed" }, run: run(calls) });
  assert.deepEqual(calls[0][1], { to: "carol", body: "changed" });
});

test("a second approval (double click, second device) never runs it again", async () => {
  const db = fakeDb(); const card = await mk(db); const calls = [];
  await approvals.approve(db, userA, card.id, { run: run(calls) });
  const again = await approvals.approve(db, userA, card.id, { run: run(calls) });
  assert.equal(again.status, 409);
  assert.equal(calls.length, 1);
});

test("another user cannot approve or cancel it", async () => {
  const db = fakeDb(); const card = await mk(db); const calls = [];
  assert.equal((await approvals.approve(db, userB, card.id, { run: run(calls) })).status, 404);
  assert.equal((await approvals.cancel(db, userB, card.id)).status, 404);
  assert.equal(calls.length, 0);
  assert.equal(db.rows[0].status, "pending");
});

test("cancel stops it, and a cancelled action cannot be approved", async () => {
  const db = fakeDb(); const card = await mk(db); const calls = [];
  assert.equal((await approvals.cancel(db, userA, card.id)).status, 200);
  assert.equal((await approvals.approve(db, userA, card.id, { run: run(calls) })).status, 409);
  assert.equal(calls.length, 0);
});

test("an expired action is refused and marked expired", async () => {
  const db = fakeDb(); const card = await mk(db); const calls = [];
  db.rows[0].expires_at = new Date(Date.now() - 1000).toISOString();
  const out = await approvals.approve(db, userA, card.id, { run: run(calls) });
  assert.equal(out.status, 410);
  assert.equal(db.rows[0].status, "expired");
  assert.equal(calls.length, 0);
});

test("a failing tool is recorded as failed and reported", async () => {
  const db = fakeDb(); const card = await mk(db);
  const out = await approvals.approve(db, userA, card.id, { run: async () => ({ ok: false, error: "boom" }) });
  assert.equal(out.status, 422);
  assert.equal(db.rows[0].status, "failed");
});

test("list shows only this user's live pending actions; the per-user limit holds", async () => {
  const db = fakeDb();
  for (let i = 0; i < approvals.MAX_PENDING_PER_USER; i++) await mk(db);
  await assert.rejects(() => mk(db), /too many/);
  await mk(db, userB);
  const mine = await approvals.list(db, userA, "sales", (n) => (n === "send_thing" ? writeTool : null));
  assert.equal(mine.length, approvals.MAX_PENDING_PER_USER);
  db.rows[0].expires_at = new Date(Date.now() - 1).toISOString();
  assert.equal((await approvals.list(db, userA, undefined, () => writeTool)).length, approvals.MAX_PENDING_PER_USER - 1);
});

test("runTool refuses a needsApproval tool unless the approved flag is set by the server", async () => {
  tools.register(writeTool);
  const blocked = await tools.runTool("send_thing", { to: "x", body: "y" }, { userId: userA });
  assert.equal(blocked.needsApproval, true);
  assert.equal((await tools.runTool("send_thing", { to: "x", body: "y", approved: true }, { userId: userA })).ok, false, "the model cannot pass the flag in its arguments");
  assert.equal((await tools.runTool("send_thing", { to: "x", body: "y" }, { userId: userA, approved: true })).ok, true);
});

test("the loop parks a write action, tells the model it was NOT done, and returns the card", async () => {
  tools.register(writeTool);
  const db = fakeDb(); const seenByModel = [];
  const replies = ['TOOL_CALL: {"tool":"send_thing","args":{"to":"bob","body":"hi"}}', "It is waiting for your OK."];
  const out = await toolLoop.runWithTools({
    system: "s", messages: [{ role: "user", content: "send it" }], tools: [writeTool],
    ctx: { userId: userA, requestApproval: (tool, args) => approvals.create(db, { userId: userA, botType: "sales", tool, args }) },
    call: async (a) => { seenByModel.push(a.messages.map((m) => m.content).join("\n")); return { parsed: replies.shift() }; }
  });
  assert.equal(out.approvals.length, 1);
  assert.equal(db.rows.length, 1);
  assert.match(seenByModel[1], /NOT been done/);
  assert.equal(out.toolsUsed[0].ok, false);
});

test("if parking fails the model is told it was not done and nothing is sent", async () => {
  tools.register(writeTool);
  const replies = ['TOOL_CALL: {"tool":"send_thing","args":{"to":"bob","body":"hi"}}', "Sorry, it was not sent."]; const seen = [];
  const out = await toolLoop.runWithTools({
    system: "s", messages: [{ role: "user", content: "x" }], tools: [writeTool],
    ctx: { userId: userA, requestApproval: async () => { throw new Error("db down"); } },
    call: async (a) => { seen.push(a.messages.map((m) => m.content).join("\n")); return { parsed: replies.shift() }; }
  });
  assert.equal(out.approvals.length, 0);
  assert.match(seen[1], /was not done/);
});
