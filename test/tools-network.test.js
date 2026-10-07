// Run: node --test test/tools-network.test.js
// Currency, company profile and web search, with the network and database stubbed.
const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../lib/tools");
const currency = require("../lib/tools/currency");

const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };
const okJson = (body) => async () => ({ ok: true, status: 200, json: async () => body });
const status = (code) => async () => ({ ok: false, status: code, json: async () => ({}) });

test("currency: converts at the returned rate, labels the source, caches for 10 minutes", async () => {
  currency._clearCache();
  let calls = 0, url = "";
  const fetch = async (u) => { calls++; url = u; return okJson({ base: "GBP", date: "2026-10-07", rates: { USD: 1.3456 } })(); };
  const r = await quiet(() => tools.runTool("currency_converter", { amount: 250, from: "gbp", to: "usd" }, { fetch }));
  assert.equal(r.ok, true);
  assert.deepEqual([r.result.converted, r.result.rate, r.result.rateDate], [336.4, 1.3456, "2026-10-07"]);
  assert.match(r.result.source, /not a bank or card rate/);
  assert.equal(url, "https://api.frankfurter.dev/v1/latest?base=GBP&symbols=USD");
  await quiet(() => tools.runTool("currency_converter", { amount: 10, from: "GBP", to: "USD" }, { fetch }));
  assert.equal(calls, 1, "second call used the cache");
});

test("currency: bad codes, same currency, unknown currency and a dead service all give plain errors", async () => {
  currency._clearCache();
  assert.match((await quiet(() => tools.runTool("currency_converter", { amount: 1, from: "GB", to: "USD" }))).error, /3-letter/);
  assert.match((await quiet(() => tools.runTool("currency_converter", { amount: -5, from: "GBP", to: "USD" }))).error, /amount/);
  const same = await quiet(() => tools.runTool("currency_converter", { amount: 5, from: "GBP", to: "gbp" }));
  assert.equal(same.result.converted, 5);
  assert.match((await quiet(() => tools.runTool("currency_converter", { amount: 1, from: "GBP", to: "ZZZ" }, { fetch: status(404) }))).error, /could not find a rate/);
  assert.match((await quiet(() => tools.runTool("currency_converter", { amount: 1, from: "GBP", to: "JPY" }, { fetch: status(500) }))).error, /not answering/);
  assert.match((await quiet(() => tools.runTool("currency_converter", { amount: 1, from: "GBP", to: "CAD" }, { fetch: okJson({ rates: {} }) }))).error, /no rate/);
});

test("company_profile: returns only this user's profile, trims research, handles none and errors", async () => {
  const seen = [];
  const dbWith = (rows, error = null) => ({ from(t) { seen.push(t); return { select() { return { eq(col, val) { seen.push([col, val]); return Promise.resolve({ data: rows, error }); } }; } }; } });
  const row = { name: "Crumb & Co", website: "https://crumb.example", industry: "Bakery", type: "b2c", target: "Families", socials: { instagram: "crumb" }, research_data: { big: "x".repeat(5000) } };
  const r = await quiet(() => tools.runTool("company_profile", {}, { userId: "u1", db: dbWith([row]) }));
  assert.equal(r.result.name, "Crumb & Co");
  assert.equal(r.result.sells_to, "b2c");
  assert.ok(r.result.research_notes.length <= 1500);
  assert.deepEqual(seen, ["company_profiles", ["user_id", "u1"]], "scoped to the logged-in user");
  assert.equal((await quiet(() => tools.runTool("company_profile", {}, { userId: "u1", db: dbWith([]) }))).result.found, false);
  assert.match((await quiet(() => tools.runTool("company_profile", {}, { userId: "u1", db: dbWith(null, { message: "boom" }) }))).error, /could not be read/);
  assert.match((await quiet(() => tools.runTool("company_profile", {}, {}))).error, /not available/);
});

test("web_search: only offered with a key; sends the key and query; cleans results", async () => {
  const saved = process.env.BRAVE_SEARCH_API_KEY;
  try {
    delete process.env.BRAVE_SEARCH_API_KEY;
    assert.ok(!tools.list().some((t) => t.name === "web_search"), "hidden without a key");
    assert.match((await quiet(() => tools.runTool("web_search", { query: "x" }))).error, /no tool called/);

    process.env.BRAVE_SEARCH_API_KEY = "test-key";
    assert.ok(tools.list().some((t) => t.name === "web_search"));
    let url = "", headers = {};
    const fetch = async (u, o) => { url = u; headers = o.headers; return okJson({ web: { results: [
      { title: "<strong>Flour</strong> prices &amp; news", url: "https://example.com/a", description: "Up <b>5%</b> this year" },
      { title: "Bad link", url: "javascript:alert(1)", description: "x" }
    ] } })(); };
    const r = await quiet(() => tools.runTool("web_search", { query: "flour price UK", count: 3 }, { fetch }));
    assert.equal(r.ok, true);
    assert.equal(headers["X-Subscription-Token"], "test-key");
    assert.match(url, /^https:\/\/api\.search\.brave\.com\/res\/v1\/web\/search\?q=flour%20price%20UK&count=3$/);
    assert.deepEqual(r.result.results, [{ title: "Flour prices & news", url: "https://example.com/a", snippet: "Up 5% this year" }]);
    assert.match((await quiet(() => tools.runTool("web_search", { query: "x" }, { fetch: status(429) }))).error, /busy/);
    assert.match((await quiet(() => tools.runTool("web_search", { query: "x" }, { fetch: okJson({}) }))).result.note, /No results/);
  } finally { if (saved === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = saved; }
});

test("the model is told about each available tool", () => {
  const text = tools.describeTools();
  assert.match(text, /currency_converter\(amount: number, from: string, to: string\)/);
  assert.match(text, /- company_profile\(\)/);
});
