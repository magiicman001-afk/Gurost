// Run: node --test test/face-memory.test.js
// Business Assistant 2.0, phase 5: memory for the 8 faces. Per bot, shared, per project; pause; forget; audit; never starts cold.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const M = require("../lib/bot-memory");
const { createBotChat } = require("../lib/bot-chat");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const NOW = Date.parse("2026-10-15T12:00:00Z");

// An in-memory stand-in for the tables the memory code touches.
function fakeDb({ paused = false, legacy = [], failTable = false } = {}) {
  const t = { bot_memory: [], user_memory_settings: paused ? [{ user_id: "u1", paused: true }] : [], user_bot_memory: legacy.map((l) => ({ user_id: "u1", memory_type: "fact", importance: 3, ...l })) };
  let n = 0, clock = NOW;
  const chain = (name, kind, payload) => {
    const f = { eqs: [], gtes: [], count: false, order: null, lim: 1e9 };
    const api = {
      select(_c, o) { if (o && o.count) f.count = true; return api; }, eq(k, v) { f.eqs.push([k, v]); return api; }, gte(k, v) { f.gtes.push([k, v]); return api; },
      order(k, o) { f.order = [k, o && o.ascending === false ? -1 : 1]; return api; }, limit(x) { f.lim = x; return api; },
      rows() { let r = t[name].filter((x) => f.eqs.every(([k, v]) => String(x[k]) === String(v)) && f.gtes.every(([k, v]) => String(x[k]) >= String(v))); if (f.order) r = r.slice().sort((a, b) => (String(a[f.order[0]]) < String(b[f.order[0]]) ? -1 : 1) * f.order[1]); return r.slice(0, f.lim); },
      then(res, rej) {
        return Promise.resolve((() => {
          if (failTable && name === "bot_memory") return { data: null, error: { message: "relation does not exist" }, count: null };
          if (kind === "select") return { data: api.rows(), error: null, count: f.count ? api.rows().length : null };
          if (kind === "delete") { const dead = new Set(api.rows()); t[name] = t[name].filter((x) => !dead.has(x)); return { error: null }; }
          return { error: null };
        })()).then(res, rej);
      }
    };
    return api;
  };
  return {
    t, tick(ms) { clock += ms; },
    from(name) {
      return {
        select: (c, o) => chain(name, "select").select(c, o),
        delete: () => chain(name, "delete"),
        upsert: (row, o) => {
          if (failTable && name === "bot_memory") return Promise.resolve({ error: { message: "relation does not exist" } });
          const keys = (o && o.onConflict ? o.onConflict : "").split(",").filter(Boolean);
          const hit = keys.length && t[name].find((x) => keys.every((k) => x[k] === row[k]));
          if (hit) Object.assign(hit, row); else t[name].push({ id: "00000000-0000-4000-8000-" + String(++n).padStart(12, "0"), created_at: new Date(clock++).toISOString(), ...row });
          return Promise.resolve({ error: null });
        }
      };
    }
  };
}
const ex = (db, botId, i, extra = {}) => M.faceRecordExchange(db, { userId: "u1", botId, userText: "question " + i, botText: "answer " + i, now: NOW + i * 1000, ...extra });

test("a bot remembers its own earlier conversation and never starts cold; other bots do not see it", async () => {
  const db = fakeDb();
  await ex(db, "planner", 1); await ex(db, "planner", 2); await ex(db, "designer", 3);
  const p = await M.facePrepare(db, { userId: "u1", botId: "planner", now: NOW + 5000 });
  assert.deepEqual(p.history.map((h) => h.role + ":" + h.content), ["user:question 1", "assistant:answer 1", "user:question 2", "assistant:answer 2"]);
  const d = await M.facePrepare(db, { userId: "u1", botId: "designer", now: NOW + 5000 });
  assert.deepEqual(d.history.map((h) => h.content), ["question 3", "answer 3"]);
  assert.equal((await M.facePrepare(db, { userId: "u2", botId: "planner", clientHistory: [{ role: "user", content: "hi" }], now: NOW })).history[0].content, "hi", "another person's memory is never read; the page's history is used");
});

test("shared facts reach every bot; project facts reach only that project; a bot's own flag stays with that bot", async () => {
  const db = fakeDb();
  await M.faceSaveFacts(db, { userId: "u1", projectId: "proj-12345678", userText: "We sell cakes in Leeds", items: [{ memory_type: "fact", key: "business", value: "sells cakes in Leeds", importance: 4 }], now: NOW });
  await M.faceSaveFacts(db, { userId: "u1", projectId: "proj-12345678", userText: "Make this website greener", items: [{ memory_type: "preference", key: "site_colour", value: "wants green", importance: 3 }], now: NOW });
  await M.faceRememberFlag(db, { userId: "u1", projectId: "proj-12345678", botId: "pulse", kind: "build-problem", text: "I caught something.", now: NOW });
  const planner = await M.facePrepare(db, { userId: "u1", botId: "planner", projectId: "proj-12345678", now: NOW + 1000 });
  assert.match(planner.block, /\[team\] business: sells cakes in Leeds/);
  assert.match(planner.block, /\[this project\] site_colour: wants green/);
  assert.doesNotMatch(planner.block, /I caught something/, "Pulse's own flag is not the Planner's note");
  const other = await M.facePrepare(db, { userId: "u1", botId: "planner", projectId: "other-proj-9999", now: NOW + 1000 });
  assert.doesNotMatch(other.block, /site_colour/);
  assert.match(other.block, /business/);
  const pulse = await M.facePrepare(db, { userId: "u1", botId: "pulse", projectId: "proj-12345678", now: NOW + 1000 });
  assert.match(pulse.block, /\[this project\] I told them: build-problem: I caught something\./);
  assert.match(pulse.block, /not instructions/);
});

test("fact scope: a project only gets a fact when the person was clearly talking about it", () => {
  assert.equal(M.factScope("make this website greener", "proj-12345678"), "proj-12345678");
  assert.equal(M.factScope("I always sign off with Cheers", "proj-12345678"), "");
  assert.equal(M.factScope("make this website greener", ""), "");
  assert.equal(M.factScope("the page needs work", "../../etc"), "", "a bad project id is dropped");
});

test("what the department bots already learned about the account is used too, without duplicates", async () => {
  const db = fakeDb({ legacy: [{ key: "company_name", value: "Luvky Cakes" }, { key: "business", value: "old text" }] });
  await M.faceSaveFacts(db, { userId: "u1", userText: "We sell cakes", items: [{ memory_type: "fact", key: "business", value: "sells cakes", importance: 3 }], now: NOW });
  const p = await M.facePrepare(db, { userId: "u1", botId: "planner", now: NOW });
  assert.match(p.block, /\[account\] company_name: Luvky Cakes/);
  assert.match(p.block, /business: sells cakes/); assert.doesNotMatch(p.block, /old text/);
  assert.equal(p.used, 2);
});

test("paused: nothing is read and nothing is saved, and the page's own history is used", async () => {
  const db = fakeDb({ paused: true });
  const p = await M.facePrepare(db, { userId: "u1", botId: "planner", clientHistory: [{ role: "user", content: "hi" }], now: NOW });
  assert.equal(p.paused, true); assert.equal(p.block, ""); assert.equal(p.stored, false); assert.equal(p.history[0].content, "hi");
  const chat = createBotChat({ modelRouter: { modelFor: () => "m" }, claudeClient: { callClaude: async () => ({ parsed: "ok" }) }, memory: { prepare: (a) => M.facePrepare(db, a), remember: () => { throw new Error("must not be called"); } } });
  const out = await chat.run({ userId: "u1", plan: "unlimited", botId: "planner", message: "hello" });
  assert.equal(out.body.memoryPaused, true); assert.equal(db.t.bot_memory.length, 0);
});

test("old rows expire, only the newest 24 turns per bot are kept, and the total number of notes is capped", async () => {
  const db = fakeDb();
  for (let i = 1; i <= 16; i++) await ex(db, "builder", i);
  const rows = db.t.bot_memory.filter((r) => r.bot_id === "builder");
  assert.equal(rows.length, M.MAX_TURN_ROWS_PER_BOT);
  assert.ok(rows.some((r) => r.memory_value === "answer 16") && !rows.some((r) => r.memory_value === "question 1"));
  const later = await M.facePrepare(db, { userId: "u1", botId: "builder", now: NOW + 31 * 24 * 3600 * 1000 });
  assert.equal(later.history.length, 0, "chat turns are gone after 30 days");
  const db2 = fakeDb();
  for (let i = 0; i < M.MAX_FACE_ROWS; i++) db2.t.bot_memory.push({ id: "x" + i, user_id: "u1", project_id: "", bot_id: "shared", memory_key: "k" + i, memory_value: "v", created_at: "2026-10-01T00:00:00Z", expires_at: "2027-01-01T00:00:00Z" });
  assert.equal(await M.faceSaveFacts(db2, { userId: "u1", userText: "hello there", items: [{ memory_type: "fact", key: "one_more", value: "x", importance: 3 }], now: NOW }), 0, "full: nothing more is saved");
});

test("the person can list, forget one, forget a bot's notes, or forget everything; nobody else's rows are touched", async () => {
  const db = fakeDb();
  await ex(db, "planner", 1); await ex(db, "designer", 2);
  await M.faceSaveFacts(db, { userId: "u1", userText: "We sell cakes", items: [{ memory_type: "fact", key: "business", value: "cakes", importance: 3 }], now: NOW });
  await M.faceRememberFlag(db, { userId: "u1", botId: "planner", kind: "next-step", text: "Pick a design.", now: NOW });
  db.t.bot_memory.push({ id: "11111111-1111-4111-8111-111111111111", user_id: "u2", project_id: "", bot_id: "planner", memory_key: "business", memory_value: "someone else", created_at: "2026-10-15T00:00:00Z", expires_at: "2027-01-01T00:00:00Z" });
  const mine = await M.faceList(db, "u1", { botId: "planner" });
  assert.deepEqual(mine.items.map((i) => i.key).sort(), ["business", "said:next-step"]);
  assert.equal(mine.items.every((i) => i.id && i.scope), true);
  assert.deepEqual(mine.turns.map((x) => x.content), ["question 1", "answer 1"]);
  await M.faceForgetOne(db, "u2", mine.items[0].id); // wrong owner: nothing happens
  assert.equal(db.t.bot_memory.filter((r) => r.user_id === "u1").length, 6);
  await M.faceForgetOne(db, "u1", mine.items.find((i) => i.key === "business").id);
  await M.faceForgetAll(db, "u1", "planner");
  assert.equal(db.t.bot_memory.filter((r) => r.user_id === "u1" && r.bot_id === "planner").length, 0);
  assert.equal(db.t.bot_memory.filter((r) => r.user_id === "u1" && r.bot_id === "designer").length, 2, "another bot's memory stays");
  await M.faceForgetAll(db, "u1");
  assert.equal(db.t.bot_memory.filter((r) => r.user_id === "u1").length, 0);
  assert.equal(db.t.bot_memory.filter((r) => r.user_id === "u2").length, 1, "other people are never touched");
});

test("a chat uses memory, then remembers; a memory failure never fails the chat", async () => {
  const db = fakeDb(); let sent = null;
  await ex(db, "planner", 1);
  await M.faceSaveFacts(db, { userId: "u1", userText: "We sell cakes", items: [{ memory_type: "fact", key: "business", value: "sells cakes", importance: 3 }], now: NOW });
  const memory = { prepare: (a) => M.facePrepare(db, { ...a, now: NOW + 5000 }), remember: (a) => M.faceRecordExchange(db, { ...a, now: NOW + 6000 }) };
  const chat = createBotChat({ modelRouter: { modelFor: () => "m" }, claudeClient: { callClaude: async (a) => { sent = a; return { parsed: "Start with the menu." }; } }, memory });
  const out = await chat.run({ userId: "u1", plan: "unlimited", botId: "planner", message: "What next?", projectId: "proj-12345678" });
  assert.equal(out.status, 200); assert.equal(out.body.memoryUsed, 1);
  assert.match(sent.system, /sells cakes/);
  assert.deepEqual(sent.messages.map((m) => m.content), ["question 1", "answer 1", "What next?"], "yesterday's conversation comes first");
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(db.t.bot_memory.some((r) => r.memory_value === "Start with the menu."), "the new exchange was saved");
  const broken = createBotChat({ modelRouter: { modelFor: () => "m" }, claudeClient: { callClaude: async () => ({ parsed: "Still works." }) }, memory: { prepare: (a) => M.facePrepare(fakeDb({ failTable: true }), a), remember: async () => { throw new Error("db down"); } } });
  const ok = await broken.run({ userId: "u1", plan: "unlimited", botId: "planner", message: "hi" });
  assert.equal(ok.status, 200); assert.equal(ok.body.reply, "Still works.");
});

test("a missing table means remember nothing, quietly", async () => {
  const db = fakeDb({ failTable: true });
  assert.equal(await ex(db, "planner", 1), false);
  const p = await M.facePrepare(db, { userId: "u1", botId: "planner", clientHistory: [{ role: "user", content: "hi" }], now: NOW });
  assert.equal(p.stored, false); assert.equal(p.history[0].content, "hi");
  await assert.rejects(() => M.faceList(db, "u1", {}), /relation/);
});

test("wiring: routes, audit trail, forget-everything reaches the faces, lists, widget screen and migration", () => {
  const srv = read("server.js"), w = read("public/shared/bot-widgets.js");
  assert.match(srv, /app\.get\("\/api\/bots\/memory", memoryLimiter/);
  assert.match(srv, /app\.delete\("\/api\/bots\/memory\/:id", memoryLimiter/);
  assert.match(srv, /app\.delete\("\/api\/bots\/memory", memoryLimiter/);
  assert.match(srv, /faceForgetAll\(db, req\.user\.id\)\.catch/, "the existing forget-everything also clears the faces");
  assert.match(srv, /memory \$\{out\.body\.memoryPaused \? "paused" : "used "/, "chat audit says how much memory was used");
  assert.match(srv, /tool: "memory_forget_one"/);
  assert.match(srv, /event: "memory", userId: req\.user\.id, ip: req\.ip, tool, ok: true, output/);
  assert.match(read("lib/user-data.js"), /table: "bot_memory"/);
  assert.match(read("lib/retention.js"), /table: "bot_memory", column: "expires_at"/);
  assert.match(read("docs/migrations/2026-10-15_bot_memory.sql"), /enable row level security/);
  assert.match(w, /What I remember/); assert.match(w, /Pause memory/); assert.match(w, /Forget everything the team knows/);
  assert.doesNotMatch(w, /innerHTML|insertAdjacentHTML/);
  assert.doesNotMatch(read("lib/bot-memory.js").slice(read("lib/bot-memory.js").indexOf("Memory for the 8 faces")), /callClaude|openrouter/i, "the memory store never calls a model");
});
