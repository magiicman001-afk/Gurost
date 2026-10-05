// Run: node --test test/premium-images.test.js
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
const { findUpgradeTargets, upgradeImages } = require("../bots/premium-images");

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

const PAGE = `<header><img src="https://store.example/stock/a.jpg" alt="loaf" data-gurost-image="A crusty sourdough loaf, morning light" data-gurost-image-role="hero"></header>
<img src="https://store.example/stock/b.jpg" data-gurost-image="Croissants on a tray" data-gurost-image-role="featured">
<img src="https://store.example/stock/c.jpg" data-gurost-image="The bakery counter" data-gurost-image-role="secondary">
<img src="https://store.example/stock/d.jpg" data-gurost-image="Flour texture" data-gurost-image-role="decorative">
<img src="https://store.example/stock/e.jpg" alt="no brief">`;

test("targets: one hero (FLUX Pro), featured then secondary (FLUX Dev, max 3); decorative and brief-less images left alone", () => {
  const t = findUpgradeTargets(PAGE);
  assert.deepEqual(t.map((x) => [x.role, x.model]), [["hero", "pro"], ["featured", "dev"], ["secondary", "dev"]]);
  assert.equal(t[0].brief, "A crusty sourdough loaf, morning light");
});

test("upgradeImages swaps exactly the targeted srcs, totals the cost, and keeps an image whose generation failed", async () => {
  imageBot._resetFalPause();
  process.env.FAL_API_KEY = "fal-test";
  let n = 0;
  globalThis.fetch = async (url) => {
    if (String(url).startsWith("https://fal.run/")) {
      n++;
      if (n === 3) return { ok: false, status: 500, json: async () => ({ detail: "boom" }) }; // the secondary one
      return { ok: true, status: 200, json: async () => ({ images: [{ url: `https://fal.media/${n}.jpg`, width: 1024, height: 768 }] }) };
    }
    return { ok: true, headers: { get: () => "image/jpeg" }, arrayBuffer: async () => new ArrayBuffer(4) };
  };
  const said = [];
  const r = await upgradeImages(PAGE, { onProgress: (m) => said.push(m) });
  assert.match(said[0], /hero image with FLUX Pro and 2 section images with FLUX Dev/);
  assert.equal(r.upgraded.length, 2);
  assert.equal(r.failed, 1);
  assert.equal(r.cost, 0.065); // 0.04 + 0.025
  assert.ok(!r.html.includes("stock/a.jpg") && !r.html.includes("stock/b.jpg"), "hero + featured replaced");
  assert.ok(r.html.includes("stock/c.jpg") && r.html.includes("stock/d.jpg") && r.html.includes("stock/e.jpg"), "failed, decorative and brief-less kept");
});

test("nothing to upgrade -> page unchanged, no calls", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; };
  const r = await upgradeImages('<img src="x.jpg" alt="plain">');
  assert.deepEqual(r, { html: '<img src="x.jpg" alt="plain">', upgraded: [], failed: 0, cost: 0 });
  assert.equal(called, false);
});

