const test = require("node:test");
const assert = require("node:assert");

test("cleanEnvValue removes the hidden line break, spaces and wrapping quotes", () => {
  const { cleanEnvValue } = require("../lib/db");
  assert.strictEqual(cleanEnvValue("\nsb_secret_abc-123\n"), "sb_secret_abc-123");
  assert.strictEqual(cleanEnvValue("  sb_secret_abc \r\n"), "sb_secret_abc");
  assert.strictEqual(cleanEnvValue('"sb_secret_abc"'), "sb_secret_abc");
  assert.strictEqual(cleanEnvValue("'https://x.supabase.co'"), "https://x.supabase.co");
  assert.strictEqual(cleanEnvValue("sb_secret_ab\ncd"), "sb_secret_abcd");
  assert.strictEqual(cleanEnvValue(undefined), "");
});

test("the Supabase client is built with the cleaned key", () => {
  const Module = require("module");
  const seen = [];
  const orig = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "@supabase/supabase-js") return { createClient: (u, k) => { seen.push([u, k]); return { from() {} }; } };
    return orig.call(this, req, ...rest);
  };
  const keep = { u: process.env.SUPABASE_URL, k: process.env.SUPABASE_SERVICE_KEY };
  const warn = console.warn; console.warn = () => {};
  try {
    process.env.SUPABASE_URL = "https://x.supabase.co\n";
    process.env.SUPABASE_SERVICE_KEY = "\nsb_secret_test-key\n";
    delete require.cache[require.resolve("../lib/db")];
    const { supabase } = require("../lib/db");
    supabase.from;
    assert.deepStrictEqual(seen[0], ["https://x.supabase.co", "sb_secret_test-key"]);
  } finally {
    console.warn = warn; Module._load = orig;
    process.env.SUPABASE_URL = keep.u; process.env.SUPABASE_SERVICE_KEY = keep.k;
    if (keep.u === undefined) delete process.env.SUPABASE_URL;
    if (keep.k === undefined) delete process.env.SUPABASE_SERVICE_KEY;
    delete require.cache[require.resolve("../lib/db")];
  }
});

test("healer mapLimit never runs more than the limit at once and keeps order", async () => {
  const Module = require("module");
  const orig = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "@supabase/supabase-js") return { createClient: () => ({}) };
    return orig.call(this, req, ...rest);
  };
  let mapLimit;
  try { ({ mapLimit } = require("../self-healing")); } finally { Module._load = orig; }
  let running = 0, peak = 0;
  const out = await mapLimit(Array.from({ length: 30 }, (_, i) => i), 4, async (n) => {
    running++; peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 3));
    running--; return n * 2;
  });
  assert.ok(peak <= 4, "peak was " + peak);
  assert.deepStrictEqual(out, Array.from({ length: 30 }, (_, i) => i * 2));
});
