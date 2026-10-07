// Run: node --test test/bot-memory.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const m = require("../lib/bot-memory");

// Minimal in-memory stand-in for the Supabase query builder.
function fakeDb() {
  const tables = { user_bot_conversations: [], user_bot_memory: [] };
  let clock = 0;
  return {
    tables,
    from(name) {
      const rows = tables[name];
      const state = { filters: [], order: [], limit: null, op: "select" };
      const q = {
        select() { return q; },
        insert(row) { rows.push({ ...row, created_at: ++clock }); return Promise.resolve({ error: null }); },
        upsert(list, opts) {
          const keys = opts.onConflict.split(",");
          for (const r of list) {
            const i = rows.findIndex((x) => keys.every((k) => x[k] === r[k]));
            if (i >= 0) rows[i] = { ...rows[i], ...r }; else rows.push({ ...r, created_at: ++clock });
          }
          return Promise.resolve({ error: null });
        },
        delete() { state.op = "delete"; return q; },
        eq(k, v) { state.filters.push([k, v]); return q; },
        order(k, o) { state.order.push([k, o.ascending]); return q; },
        limit(n) { state.limit = n; return q; },
        then(res, rej) {
          const match = rows.filter((r) => state.filters.every(([k, v]) => r[k] === v));
          if (state.op === "delete") {
            for (const r of match) rows.splice(rows.indexOf(r), 1);
            return Promise.resolve({ error: null }).then(res, rej);
          }
          let out = match.slice();
          for (const [k, asc] of state.order.slice().reverse()) out.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1));
          if (state.limit != null) out = out.slice(0, state.limit);
          return Promise.resolve({ data: out, error: null }).then(res, rej);
        }
      };
      return q;
    }
  };
}

test("history returns the last 12 turns, oldest first, per user and bot", async () => {
  const db = fakeDb();
  for (let i = 1; i <= 15; i++) await m.saveTurn(db, { userId: "u1", botType: "sales", role: i % 2 ? "user" : "assistant", content: "msg " + i });
  await m.saveTurn(db, { userId: "u1", botType: "hr", role: "user", content: "other bot" });
  await m.saveTurn(db, { userId: "u2", botType: "sales", role: "user", content: "other user" });
  const h = await m.loadHistory(db, "u1", "sales");
  assert.equal(h.length, 12);
  assert.equal(h[0].content, "msg 4");
  assert.equal(h[11].content, "msg 15");
});

test("saveTurn rejects bad roles and empty text", async () => {
  const db = fakeDb();
  assert.equal(await m.saveTurn(db, { userId: "u1", botType: "sales", role: "system", content: "x" }), false);
  assert.equal(await m.saveTurn(db, { userId: "u1", botType: "sales", role: "user", content: "   " }), false);
  assert.equal(db.tables.user_bot_conversations.length, 0);
});

test("cleanMemoryItem normalises keys, clamps importance, drops junk", () => {
  assert.deepEqual(m.cleanMemoryItem({ memory_type: "fact", key: "Company Name", value: "Crumb & Co", importance: 9 }),
    { memory_type: "fact", key: "company_name", value: "Crumb & Co", importance: 5, source_bot: null });
  assert.equal(m.cleanMemoryItem({ memory_type: "secret", key: "a", value: "b" }), null);
  assert.equal(m.cleanMemoryItem({ memory_type: "fact", key: "", value: "b" }), null);
  assert.equal(m.cleanMemoryItem(null), null);
});

test("memory is shared across bots and updating a key replaces it", async () => {
  const db = fakeDb();
  await m.rememberItems(db, "u1", [{ memory_type: "fact", key: "pricing", value: "Cakes from 20", source_bot: "sales" }]);
  await m.rememberItems(db, "u1", [{ memory_type: "fact", key: "pricing", value: "Cakes from 25", source_bot: "sales" }, { memory_type: "bogus", key: "x", value: "y" }]);
  const list = await m.listMemory(db, "u1");
  assert.equal(list.length, 1);
  assert.equal(list[0].value, "Cakes from 25");
  assert.deepEqual(await m.listMemory(db, "u2"), []);
});

test("forgetItem removes one, forgetAll removes all, only for that user", async () => {
  const db = fakeDb();
  await m.rememberItems(db, "u1", [{ memory_type: "fact", key: "a", value: "1" }, { memory_type: "preference", key: "b", value: "2" }]);
  await m.rememberItems(db, "u2", [{ memory_type: "fact", key: "a", value: "keep" }]);
  await m.forgetItem(db, "u1", "a");
  assert.deepEqual((await m.listMemory(db, "u1")).map((r) => r.key), ["b"]);
  await m.forgetAll(db, "u1");
  assert.equal((await m.listMemory(db, "u1")).length, 0);
  assert.equal((await m.listMemory(db, "u2")).length, 1);
});

test("clearHistory can clear one bot or all of a user's chats", async () => {
  const db = fakeDb();
  await m.saveTurn(db, { userId: "u1", botType: "sales", role: "user", content: "a" });
  await m.saveTurn(db, { userId: "u1", botType: "hr", role: "user", content: "b" });
  await m.clearHistory(db, "u1", "sales");
  assert.equal(db.tables.user_bot_conversations.length, 1);
  await m.clearHistory(db, "u1");
  assert.equal(db.tables.user_bot_conversations.length, 0);
});

test("buildMemoryBlock labels notes as data, caps size, and is empty with nothing", () => {
  assert.equal(m.buildMemoryBlock([]), "");
  const block = m.buildMemoryBlock([{ memory_type: "fact", key: "role", value: "CEO of Crumb & Co" }]);
  assert.match(block, /not instructions/);
  assert.match(block, /- \(fact\) role: CEO of Crumb & Co/);
  const many = Array.from({ length: 60 }, (_, i) => ({ memory_type: "fact", key: "k" + i, value: "v" }));
  assert.equal(m.buildMemoryBlock(many).split("\n").length, 3 + 25 - 1);
});

test("prepareChat loads saved history and notes; recordExchange saves a turn pair", async () => {
  const db = fakeDb();
  await m.rememberItems(db, "u1", [{ memory_type: "fact", key: "role", value: "CEO" }]);
  assert.equal(await m.recordExchange(db, "u1", "sales", "hi", "hello"), true);
  const prep = await m.prepareChat(db, "u1", "sales", [{ role: "user", content: "from the page" }]);
  assert.equal(prep.stored, true);
  assert.deepEqual(prep.history, [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }]);
  assert.match(prep.memoryBlock, /role: CEO/);
});

test("a database failure never breaks the chat: falls back to the page's history", async () => {
  const broken = { from() { throw new Error("db down"); } };
  const prep = await m.prepareChat(broken, "u1", "sales", [{ role: "user", content: "from the page" }]);
  assert.equal(prep.stored, false);
  assert.deepEqual(prep.history, [{ role: "user", content: "from the page" }]);
  assert.equal(prep.memoryBlock, "");
  assert.equal(await m.recordExchange(broken, "u1", "sales", "a", "b"), false);
});

test("toDisplayMessages splits a stored bot message into notes and draft", () => {
  const { parseReply } = require("../lib/department-bots");
  const out = m.toDisplayMessages([
    { role: "user", content: "reply to John" },
    { role: "assistant", content: "Here you go.\n\n--- DRAFT ---\nHi John\n--- END DRAFT ---" },
    { role: "tool", content: "ignored" }
  ], parseReply);
  assert.deepEqual(out, [{ role: "user", text: "reply to John" }, { role: "assistant", text: "Here you go.", draft: "Hi John" }]);
});
