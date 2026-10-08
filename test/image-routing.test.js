// Run: node --test test/image-routing.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const imageBot = require("../image-bot");
const { fulfillImageRequests, stockQuery, stripLeftoverPlaceholders, resetGeminiPause, fulfillVideoRequests } = require("../bots/variant-bot")._internal;

const REQS = [
  { placeholder: "IMG_1", role: "hero", description: "shopfront at dawn", alt: "Crumb and Co shopfront" },
  { placeholder: "IMG_2", role: "featured", description: "croissant close-up", alt: "Butter croissant" },
  { placeholder: "IMG_3", role: "featured", description: "celebration cake", alt: "Celebration cake" },
  { placeholder: "IMG_4", role: "secondary", description: "baker kneading dough in morning light", alt: "" },
  { placeholder: "IMG_5", role: "decorative", description: "flour texture", alt: "Flour dusted table" },
  { placeholder: "IMG_6", role: "secondary", description: "flat white coffee", alt: "Flat white coffee" },
  { placeholder: "IMG_10", role: "decorative", description: "wheat stalks", alt: "Wheat stalks" },
];
const PAGE = "<html><body>" + REQS.map((r) => `<img src="${r.placeholder}" alt="x">`).join("") + "<footer><p>f</p></footer></body></html>";
const slug = (x) => x.replace(/\W+/g, "-");

// stockHits: which alt/brief queries Pixabay finds (true = all, false = none).
async function run({ stockHits = true, flux = "ok", gemini = "ok" } = {}) {
  resetGeminiPause();
  const calls = { stock: [], flux: [], gemini: [] };
  imageBot.searchImage = async (q) => { calls.stock.push(q); const hit = stockHits === true || (Array.isArray(stockHits) && stockHits.includes(q)); return hit ? { url: `https://cdn/stock/${slug(q)}.jpg`, credit: "Photo by A on Pixabay" } : null; };
  imageBot.generateFluxImageUrl = async (d, o) => { calls.flux.push([d, o.aspectRatio]); if (flux !== "ok") throw new Error("FLUX image failed (500)"); return { url: `https://cdn/flux/${slug(d)}.jpg`, cost: 0.015 }; };
  imageBot.generateImageUrl = async (d) => { calls.gemini.push(d); if (gemini === "402") throw new Error("Gemini image generation failed (402): payment required"); return `https://cdn/gem/${slug(d)}.png`; };
  let plan; const notes = [];
  let credits;
  const html = await fulfillImageRequests(PAGE, REQS, (p) => { plan = p; }, [], (n) => notes.push(n), { onCredits: (c) => { credits = c; } });
  const srcs = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
  return { calls, plan, html, srcs, notes, credits, sources: notes.find((n) => n.kind === "image-sources") };
}

test("Pixabay first: every image found there - no FLUX, no Gemini, $0", async () => {
  const r = await run();
  assert.deepEqual(r.plan, { gemini: 0, stock: 7 });
  assert.equal(r.calls.stock.length, 7);
  assert.equal(r.calls.flux.length + r.calls.gemini.length, 0);
  assert.equal(r.srcs.length, 7);
  assert.deepEqual(r.sources, { kind: "image-sources", pixabay: 7, openverse: 0, flux: 0, gemini: 0, dropped: 0, cost: 0, allGeminiCost: 0.273 });
  assert.ok(!/Pixabay|Photo by|Photos:/i.test(r.html), "no credit line in the page");
  assert.deepEqual(r.credits, ["Photo by A on Pixabay"], "one deduplicated credit, kept off the page");
});

test("Pixabay misses -> FLUX, hero first, 16:9 for heroes and backgrounds; capped at 4", async () => {
  const r = await run({ stockHits: ["Celebration cake", "Flat white coffee"] });
  assert.deepEqual(r.calls.flux.map(([d]) => d), ["shopfront at dawn", "croissant close-up", "baker kneading dough in morning light", "flour texture"]);
  assert.deepEqual(r.calls.flux.map(([, a]) => a), ["16:9", "4:3", "4:3", "16:9"]);
  assert.equal(r.calls.gemini.length, 0);
  assert.ok(r.srcs.includes("https://cdn/flux/shopfront-at-dawn.jpg"), "hero from FLUX");
  assert.deepEqual(r.sources, { kind: "image-sources", pixabay: 2, openverse: 0, flux: 4, gemini: 0, dropped: 1, cost: 0.06, allGeminiCost: 0.273 });
  assert.ok(!/IMG_\d/.test(r.html), "the 5th miss is dropped, not left broken");
});

test("FLUX fails -> Gemini is the last resort", async () => {
  const r = await run({ stockHits: false, flux: "fail" });
  assert.equal(r.calls.flux.length, 4);
  assert.equal(r.calls.gemini.length, 4);
  assert.equal(r.sources.gemini, 4);
  assert.equal(r.sources.cost, 0.156);
});

test("FLUX fails and Gemini 402: key images reported as left out; Gemini paused for the next design", async () => {
  const r = await run({ stockHits: false, flux: "fail", gemini: "402" });
  assert.equal(r.calls.gemini.length, 4);
  assert.ok(r.notes.some((n) => n.kind === "image-dropped" && n.count === 3), "hero + 2 featured");
  assert.ok(!/IMG_\d/.test(r.html));
  // Same build, next design: Gemini is skipped while paused.
  const before = r.calls.gemini.length;
  await fulfillImageRequests(PAGE, REQS, null, [], () => {});
  assert.equal(r.calls.gemini.length, before);
  resetGeminiPause();
});

test("IMG_1 replacement does not touch IMG_10", async () => {
  const r = await run();
  assert.ok(r.srcs.some((s) => s.includes("Wheat-stalks")), "IMG_10 got its own image");
});

test("stock queries come from alt text, else the brief", () => {
  assert.equal(stockQuery({ alt: "Flat white coffee", description: "long brief" }), "Flat white coffee");
  assert.equal(stockQuery({ alt: "", description: "baker kneading dough in morning light, warm tones" }), "baker kneading dough in morning light");
});

test("leftover sweep: posters, srcset, CSS url() and stray tokens", () => {
  const html = '<video src="https://v.mp4" poster="IMG_1" autoplay></video><img src="https://a.jpg" srcset="IMG_2 2x"><div style="background:url(\'IMG_3\')"></div><p>IMG_4</p><img src="IMG_5" alt="x">';
  const out = stripLeftoverPlaceholders(html);
  assert.ok(!/(IMG|VID)_\d/.test(out), out);
  assert.match(out, /<video src="https:\/\/v.mp4" autoplay><\/video>/);
  assert.match(out, /<img src="https:\/\/a.jpg">/);
  assert.match(out, /background:none/);
});

test("a video's poster=\"IMG_n\" gives way to the clip's own poster", async () => {
  imageBot.searchVideo = async () => ({ url: "https://cdn.pixabay.com/video/pool.mp4", poster: "https://cdn.pixabay.com/video/pool.jpg", credit: "Video by B on Pixabay" });
  const v = await fulfillVideoRequests('<video class="x" autoplay muted poster="IMG_1" src="VID_1"></video>', [{ placeholder: "VID_1", query: "pool" }]);
  assert.match(v.html, /<video class="x" autoplay muted src="https:\/\/cdn.pixabay.com\/video\/pool.mp4" poster="https:\/\/cdn.pixabay.com\/video\/pool.jpg" preload="metadata"><\/video>/);
});

// 2026-10-05 tier split: on Pixabay misses, paid plans fill with FLUX Schnell
// via fal (~$0.003), falling back to Klein; the free plan uses Klein only.
test("paid plan: Pixabay misses are filled by fal FLUX Schnell; free plan stays on Klein; fal failure falls back to Klein", async () => {
  const realAvailable = imageBot.falAvailable;
  const fal = [];
  imageBot.searchImage = async () => null;
  imageBot.generateFluxImageUrl = async (d) => ({ url: `https://cdn/klein/${slug(d)}.jpg`, cost: 0.015 });
  imageBot.generateImageUrl = async () => { throw new Error("no gemini in this test"); };
  imageBot.falAvailable = () => true;
  imageBot.generateFalImageUrl = async (d, o) => { fal.push(o.model); return { url: `https://cdn/schnell/${slug(d)}.jpg`, cost: 0.003, model: "FLUX Schnell" }; };
  const two = REQS.slice(0, 2);
  const page = two.map((r) => `<img src="${r.placeholder}">`).join("");
  const paid = await fulfillImageRequests(page, two, null, [], () => {}, { plan: "pro" });
  assert.deepEqual(fal, ["schnell", "schnell"]);
  assert.match(paid, /cdn\/schnell\//);
  fal.length = 0;
  const free = await fulfillImageRequests(page, two, null, [], () => {}, { plan: "free" });
  assert.equal(fal.length, 0);
  assert.match(free, /cdn\/klein\//);
  imageBot.generateFalImageUrl = async () => { throw new Error("fal.ai FLUX Schnell failed (403)"); };
  const fellBack = await fulfillImageRequests(page, two, null, [], () => {}, { plan: "pro" });
  assert.match(fellBack, /cdn\/klein\//);
  imageBot.falAvailable = realAvailable;
});
