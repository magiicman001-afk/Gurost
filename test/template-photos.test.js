"use strict";
// Run: node --test test/template-photos.test.js
// Turns a template's picture slots into real photographs (stock or AI), with stand-in services. Nothing here uses the network.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { fillTemplatePhotos, findSlots, findVideos, MODES } = require("../bots/template-photos");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", "templates", p), "utf8");
const pages = () => ({ "index.html": read("bakery/linen/index.html"), "menu.html": read("bakery/linen/menu.html") });

function fakes({ stockMiss = [], aiFail = false, fal = true } = {}) {
  const calls = { search: [], ai: [], video: [] };
  return {
    calls,
    deps: { imageBot: {
      falAvailable: () => fal,
      searchImage: async (q) => { calls.search.push(q); return stockMiss.some((m) => q.includes(m)) ? null : { url: `https://store.example/stock/${encodeURIComponent(q).slice(0, 30)}.jpg` }; },
      generateFalImageUrl: async (brief, o) => { calls.ai.push({ brief, ...o }); if (aiFail) throw new Error("no credit"); return { url: `https://store.example/ai/${calls.ai.length}.jpg`, cost: 0.003 }; },
      searchVideo: async (q) => { calls.video.push(q); return { url: "https://videos.example/loop.mp4", poster: "https://videos.example/loop.jpg" }; },
    } },
  };
}

test("the modes the customer can pick are listed, real photos first and the default", () => {
  assert.deepStrictEqual(MODES.map((m) => m.id), ["stock", "ai", "mine"]);
  assert.strictEqual(MODES.filter((m) => m.default).length, 1);
  assert.strictEqual(MODES[0].default, true);
});

test("every picture frame carries a short search phrase and a longer photographic brief", () => {
  const slots = findSlots(pages());
  assert.ok(slots.length >= 8);
  for (const s of slots) { assert.ok(s.search, "search phrase"); assert.ok(s.brief.length > s.search.length, "brief is longer"); assert.match(s.brief, /photorealistic/); }
  assert.ok(findVideos(pages()).length === 1);
});

test("stock mode: real photographs replace the art, once per distinct picture, and are marked", async () => {
  const f = fakes();
  const { files, report } = await fillTemplatePhotos(pages(), { mode: "stock", deps: f.deps });
  assert.strictEqual(report.art, 0); assert.strictEqual(report.ai, 0); assert.strictEqual(report.stock, report.slots);
  assert.strictEqual(new Set(f.calls.search).size, f.calls.search.length, "each brief searched once");
  assert.doesNotMatch(files["index.html"], /data-gurost-image="[^"]*"[^>]*src="assets\/img\//);
  assert.match(files["index.html"], /data-gurost-filled="stock"/);
  assert.strictEqual(findSlots(files).length, 0, "nothing is left to fill");
});

test("a picture with no photo found keeps its drawn art, and the page never has a broken picture", async () => {
  const f = fakes({ stockMiss: ["croissant"] });
  const { files, report } = await fillTemplatePhotos(pages(), { mode: "stock", deps: f.deps });
  assert.ok(report.art > 0 && report.stock > 0);
  assert.match(files["index.html"] + files["menu.html"], /src="assets\/img\/croissant\.webp"/);
  assert.ok(!/src=""/.test(files["index.html"]));
});

test("ai mode: generated photographs for the most important pictures, a stock photo for the rest, and the cost is counted", async () => {
  const f = fakes();
  const { report } = await fillTemplatePhotos(pages(), { mode: "ai", tier: "paid", deps: f.deps });
  assert.ok(f.calls.ai.length > 0 && f.calls.ai.length <= 8);
  assert.ok(report.ai > 0 && report.cost > 0);
  assert.strictEqual(report.art, 0);
  assert.ok(f.calls.ai.every((c) => c.model === "dev" || c.model === "schnell"));
});

test("ai mode on the free plan uses the cheapest model only", async () => {
  const f = fakes();
  await fillTemplatePhotos(pages(), { mode: "ai", tier: "free", deps: f.deps });
  assert.ok(f.calls.ai.every((c) => c.model === "schnell"));
});

test("ai mode falls back to stock photos when generation fails or is not set up", async () => {
  for (const o of [{ aiFail: true }, { fal: false }]) {
    const f = fakes(o);
    const { report } = await fillTemplatePhotos(pages(), { mode: "ai", deps: f.deps });
    assert.strictEqual(report.ai, 0); assert.strictEqual(report.stock, report.slots);
  }
});

test("the hero loop becomes a stock clip, with its poster", async () => {
  const f = fakes();
  const { files, report } = await fillTemplatePhotos(pages(), { mode: "stock", deps: f.deps });
  assert.strictEqual(report.videos, 1);
  assert.match(files["index.html"], /<source src="https:\/\/videos\.example\/loop\.mp4" type="video\/mp4">/);
  assert.match(files["index.html"], /poster="https:\/\/videos\.example\/loop\.jpg"/);
  assert.doesNotMatch(files["index.html"], /linen-hero\.webm/);
});

test("'mine' and 'art' leave the pictures alone; 'mine' returns the slots so the page can ask for uploads", async () => {
  const f = fakes();
  const mine = await fillTemplatePhotos(pages(), { mode: "mine", deps: f.deps });
  assert.deepStrictEqual(mine.files, pages());
  assert.ok(mine.pending.length > 0 && mine.pending[0].brief);
  const art = await fillTemplatePhotos(pages(), { mode: "art", deps: f.deps });
  assert.deepStrictEqual(art.files, pages());
  assert.strictEqual(f.calls.search.length + f.calls.ai.length, 0);
});

test("running it twice does not fetch again", async () => {
  const f = fakes();
  const once = await fillTemplatePhotos(pages(), { mode: "stock", deps: f.deps });
  const n = f.calls.search.length;
  await fillTemplatePhotos(once.files, { mode: "stock", deps: f.deps });
  assert.strictEqual(f.calls.search.length, n);
});
