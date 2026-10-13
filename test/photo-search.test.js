// Run: node --test test/photo-search.test.js
// Bugs SS/TT (phone test 2026-10-13): a hero came out with no photo and nothing said why. The stock-photo search must go on to the next
// source when one fails, try a shorter version of the brief, and say in the log which source failed and why.
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

require.cache[path.resolve(__dirname, "../lib/db.js")] = {
  id: "db", filename: "db", loaded: true,
  exports: { supabase: { storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: (p) => ({ data: { publicUrl: `https://store.example/${p}` } }) }) } } },
};
const imageBot = require("../image-bot");

function fakeNet(handler) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.startsWith("https://store.example")) return { ok: true };
    const r = await handler(u);
    if (r === "download") return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(8) };
    return r;
  };
  return calls;
}
const json = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });
function quiet(fn) { const w = console.warn; const lines = []; console.warn = (m) => lines.push(String(m)); return Promise.resolve(fn(lines)).finally(() => { console.warn = w; }); }

test("broaden: a long brief becomes its three most meaningful words", () => {
  assert.equal(imageBot.broaden("A volunteer cuddling the rescued dog at the shelter"), "volunteer cuddling rescued");
  assert.equal(imageBot.broaden("photo of an animal sanctuary"), "animal sanctuary");
  assert.equal(imageBot.broaden(""), "");
});

test("photoSources reports which keys exist (Openverse needs none)", () => {
  delete process.env.PIXABAY_API_KEY; process.env.UNSPLASH_ACCESS_KEY = "u";
  assert.deepEqual(imageBot.photoSources(), { pixabay: false, openverse: true, unsplash: true });
});

test("no Pixabay key: Openverse is tried next and its photo is used", async () => {
  delete process.env.PIXABAY_API_KEY; delete process.env.IMAGE_PROVIDER_ORDER;
  const calls = fakeNet(async (u) => u.includes("openverse") ? json({ results: [{ url: "https://img.example/dog.jpg", width: 1600, license: "cc0", license_version: "1.0", creator: "A" }] }) : "download");
  await quiet(async (lines) => {
    const r = await imageBot.searchImage("rescued dogs at a shelter");
    assert.equal(r.provider, "openverse");
    assert.ok(calls.some((c) => c.includes("openverse")));
    assert.ok(lines.some((l) => /PIXABAY_API_KEY is not set/.test(l)), "the log says why Pixabay was skipped");
  });
});

test("a provider that throws does not end the search", async () => {
  process.env.PIXABAY_API_KEY = "k"; delete process.env.IMAGE_PROVIDER_ORDER;
  fakeNet(async (u) => {
    if (u.includes("pixabay.com/api")) throw new Error("socket hang up");
    if (u.includes("openverse")) return json({ results: [{ url: "https://img.example/cat.jpg", width: 1600, license: "pdm" }] });
    return "download";
  });
  await quiet(async () => { const r = await imageBot.searchImage("shelter cats"); assert.equal(r.provider, "openverse"); });
});

test("a long brief with no hits is retried with fewer words before giving up", async () => {
  process.env.PIXABAY_API_KEY = "k"; delete process.env.IMAGE_PROVIDER_ORDER;
  const seen = [];
  fakeNet(async (u) => {
    if (u.includes("pixabay.com/api")) { const q = decodeURIComponent(u.match(/[?&]q=([^&]*)/)[1]); seen.push(q); return json({ hits: q === "volunteer cuddling rescued" ? [{ largeImageURL: "https://pixabay.com/get/x.jpg", user: "p" }] : [] }); }
    if (u.includes("openverse")) return json({ results: [] });
    return "download";
  });
  await quiet(async () => {
    const r = await imageBot.searchImage("a volunteer cuddling the rescued dog at the shelter");
    assert.equal(r.provider, "pixabay");
    assert.deepEqual(seen, ["a volunteer cuddling the rescued dog at the shelter", "volunteer cuddling rescued"]);
  });
});

test("nothing anywhere: null, and one log line lists what every source said", async () => {
  process.env.PIXABAY_API_KEY = "k"; delete process.env.UNSPLASH_ACCESS_KEY; delete process.env.IMAGE_PROVIDER_ORDER;
  fakeNet(async (u) => u.includes("pixabay.com/api") ? json({ hits: [] }) : json({ results: [] }));
  await quiet(async (lines) => {
    assert.equal(await imageBot.searchImage("animal sanctuary"), null);
    const line = lines.find((l) => /no photo for "animal sanctuary"/.test(l));
    assert.ok(line && /pixabay/.test(line) && /openverse/.test(line));
  });
});
