// Run: node --test test/memory-extract.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const x = require("../lib/memory-extract");

const reply = (items) => async () => ({ parsed: { items } });

test("saves clean facts, tags the source bot, skips one-line chatter without a call", async () => {
  let calls = 0;
  const call = async (a) => { calls++; return reply([{ memory_type: "fact", key: "Company Name", value: "Crumb & Co", importance: 4 }])(a); };
  assert.deepEqual(await x.extractFromExchange({ call, userText: "ok thanks", botType: "sales" }), []);
  assert.equal(calls, 0);
  const out = await x.extractFromExchange({ call, userText: "I'm the CEO of Crumb & Co, we sell sourdough", botType: "sales" });
  assert.deepEqual(out, [{ memory_type: "fact", key: "company_name", value: "Crumb & Co", importance: 4, source_bot: "sales" }]);
});

test("secrets and sensitive categories are dropped in code, whatever the model said", () => {
  const out = x.cleanExtraction({ items: [
    { memory_type: "fact", key: "card", value: "4111 1111 1111 1111" },
    { memory_type: "fact", key: "wifi_password", value: "hunter2" },
    { memory_type: "fact", key: "health", value: "has a medical condition" },
    { memory_type: "preference", key: "tone", value: "formal" }
  ] });
  assert.deepEqual(out.map((i) => i.key), ["tone"]);
});

test("unchanged notes are not re-saved; at most 5 per exchange; list cap respected", () => {
  const existing = [{ key: "tone", value: "formal" }];
  assert.deepEqual(x.cleanExtraction({ items: [{ memory_type: "preference", key: "tone", value: "formal" }] }, existing), []);
  const many = Array.from({ length: 9 }, (_, i) => ({ memory_type: "fact", key: "k" + i, value: "v" }));
  assert.equal(x.cleanExtraction({ items: many }).length, 5);
  const full = Array.from({ length: 100 }, (_, i) => ({ key: "e" + i, value: "v" }));
  assert.equal(x.cleanExtraction({ items: [{ memory_type: "fact", key: "brand_new", value: "v" }] }, full).length, 0);
  assert.equal(x.cleanExtraction({ items: [{ memory_type: "fact", key: "e1", value: "changed" }] }, full).length, 1, "updating an existing key still works when full");
});

test("a failing or garbage model reply never throws and saves nothing", async () => {
  const boom = async () => { throw new Error("402"); };
  assert.deepEqual(await x.extractFromExchange({ call: boom, userText: "I run a bakery in Leeds, always sign Best, Alex" }), []);
  assert.deepEqual(await x.extractFromExchange({ call: async () => ({ parsed: "nonsense" }), userText: "I run a bakery in Leeds, always sign Best, Alex" }), []);
  assert.deepEqual(x.cleanExtraction(null), []);
});

test("the prompt tells the model pasted material is not a note and to ignore override requests", () => {
  assert.match(x.SYSTEM, /pasted/);
  assert.match(x.SYSTEM, /ignore that request/);
});

test("learnFromExchange lists, extracts and saves; skips the model call for short messages; never throws", async () => {
  const saved = [];
  const list = async () => [{ key: "tone", value: "formal" }];
  const save = async (items) => { saved.push(...items); return items.length; };
  let calls = 0;
  const call = async () => { calls++; return { parsed: { items: [{ memory_type: "pattern", key: "sign_off", value: "Best, Alex" }] } }; };
  assert.equal(await x.learnFromExchange({ call, userText: "hi", botType: "hr", list, save }), 0);
  assert.equal(calls, 0);
  assert.equal(await x.learnFromExchange({ call, userText: "I always sign my emails Best, Alex", botType: "hr", list, save }), 1);
  assert.equal(saved[0].source_bot, "hr");
  const broken = async () => { throw new Error("db down"); };
  assert.equal(await x.learnFromExchange({ call, userText: "I always sign my emails Best, Alex", botType: "hr", list: broken, save }), 0);
});
