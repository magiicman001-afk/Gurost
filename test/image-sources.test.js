// Run: node --test test/image-sources.test.js
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "test-key";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// A stand-in storage bucket, so stored images get a predictable URL.
const stored = [];
require.cache[path.resolve(__dirname, "../lib/db.js")] = {
  id: "db", filename: "db", loaded: true,
  exports: { supabase: { storage: { from: () => ({
    upload: async (p) => { stored.push(p); return { error: null }; },
    getPublicUrl: (p) => ({ data: { publicUrl: `https://store.example/${p}` } })
  }) } } }
};

const imageBot = require("../image-bot");

function mockFal({ status = 200, body } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    if (String(url).startsWith("https://fal.run/")) {
      return { ok: status === 200, status, json: async () => body || { images: [{ url: "https://fal.media/x.jpg", width: 1280, height: 720 }] } };
    }
    return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(4) }; // the image download
  };
  return calls;
}

test("fal client: FLUX Pro at 1280x720 (0.92MP) bills 1 megapixel = $0.04; image copied into project-assets", async () => {
  imageBot._resetFalPause();
  process.env.FAL_API_KEY = "fal-test";
  const calls = mockFal();
  const r = await imageBot.generateFalImageUrl("hero brief", { model: "pro", aspectRatio: "16:9" });
  assert.equal(calls[0].url, "https://fal.run/fal-ai/flux-pro/v1.1");
  assert.deepEqual(calls[0].body.image_size, { width: 1280, height: 720 });
  assert.equal(r.cost, 0.04);
  assert.equal(r.model, "FLUX Pro");
  assert.match(r.url, /^https:\/\/store\.example\/generated\//);
});

test("a locked fal account (403 TOP_UP) pauses fal - no second call - and falAvailable says so", async () => {
  imageBot._resetFalPause();
  process.env.FAL_API_KEY = "fal-test";
  const calls = mockFal({ status: 403, body: { detail: "User is locked. Reason: TOP_UP." } });
  await assert.rejects(imageBot.generateFalImageUrl("x", { model: "dev" }), /403.*TOP_UP/);
  assert.equal(imageBot.falAvailable(), false);
  await assert.rejects(imageBot.generateFalImageUrl("x", { model: "dev" }), /paused/);
  assert.equal(calls.length, 1);
  imageBot._resetFalPause();
});

// Openverse: after Pixabay, before any paid generation (2026-10-05).
test("Openverse: commercial licences only, large photos only, credited with title, creator and licence", async () => {
  let asked = "";
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://api.openverse.org/")) {
      asked = String(url);
      return { ok: true, json: async () => ({ results: [
        { url: "https://flickr/small.jpg", width: 500, title: "Too small", creator: "a", license: "by", license_version: "2.0" },
        { url: "https://flickr/big.jpg", width: 2048, title: "Rustic Sourdough Bread", creator: "osiristhe", license: "by-nd", license_version: "2.0" }
      ] }) };
    }
    return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(4) };
  };
  const r = await imageBot.searchOpenverse("sourdough bread");
  assert.match(asked, /license_type=commercial/);
  assert.match(asked, /size=large/);
  assert.equal(r.provider, "openverse");
  assert.equal(r.credit, '"Rustic Sourdough Bread" by osiristhe (CC BY-ND 2.0, via Openverse)');
  assert.match(r.url, /^https:\/\/store\.example\/stock\//);
});

test("searchImage: Pixabay first, Openverse when Pixabay has nothing; nothing usable -> null", async () => {
  const realKey = process.env.PIXABAY_API_KEY;
  process.env.PIXABAY_API_KEY = "px";
  const order = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith("https://pixabay.com/")) { order.push("pixabay"); return { ok: true, json: async () => ({ hits: [] }) }; }
    if (u.startsWith("https://api.openverse.org/")) { order.push("openverse"); return { ok: true, json: async () => ({ results: [{ url: "https://x/y.jpg", width: 1600, creator: "c", license: "cc0", license_version: "1.0" }] }) }; }
    return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(4) };
  };
  const r = await imageBot.searchImage("bakery counter");
  assert.deepEqual(order, ["pixabay", "openverse"]);
  assert.equal(r.provider, "openverse");
  assert.match(r.credit, /\(CC0 1\.0, via Openverse\)/);
  globalThis.fetch = async (url) => (String(url).includes("openverse") ? { ok: true, json: async () => ({ results: [{ url: "https://x/t.jpg", width: 400 }] }) } : { ok: true, json: async () => ({ hits: [] }) });
  assert.equal(await imageBot.searchImage("nothing big"), null);
  process.env.PIXABAY_API_KEY = realKey;
});
