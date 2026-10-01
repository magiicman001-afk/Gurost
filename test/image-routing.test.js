// Run: node --test test/image-routing.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const imageBot = require("../image-bot");
const { fulfillImageRequests, stockQuery } = require("../bots/variant-bot")._internal;

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

async function run({ stock }) {
  const calls = { gemini: [], stock: [] };
  imageBot.generateImageUrl = async (d) => { calls.gemini.push(d); return `https://cdn/gem/${d.replace(/\W+/g, "-")}.png`; };
  imageBot.searchImage = async (q) => { calls.stock.push(q); return stock ? { url: `https://cdn/stock/${q.replace(/\W+/g, "-")}.jpg`, credit: "Photo by A on Pexels" } : null; };
  let plan;
  const html = await fulfillImageRequests(PAGE, REQS, (p) => { plan = p; });
  const srcs = [...html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
  return { calls, plan, html, srcs };
}

test("with a stock key: Gemini only for the hero + 1 featured, the rest stock", async () => {
  const r = await run({ stock: true });
  assert.deepEqual(r.plan, { gemini: 2, stock: 5 });
  assert.deepEqual(r.calls.gemini, ["shopfront at dawn", "croissant close-up"]);
  assert.equal(r.calls.stock.length, 5);
  assert.equal(r.srcs.length, 7, "every image filled");
  assert.match(r.html, /Photos: Photo by A on Pexels<\/p><\/footer>/, "one deduplicated credit line inside the footer");
});

test("without a stock key: Gemini fallback capped at 4 per design; extras dropped, not broken", async () => {
  const r = await run({ stock: false });
  assert.equal(r.calls.gemini.length, 4);
  assert.equal(r.srcs.length, 4, "3 images over the cap removed");
  assert.ok(!/IMG_\d/.test(r.html), "no placeholder or broken image left");
  assert.ok(!r.html.includes("Photos:"), "no credit line without stock photos");
});

test("IMG_1 replacement does not touch IMG_10", async () => {
  const r = await run({ stock: true });
  assert.ok(r.srcs.some((s) => s.includes("Wheat-stalks")), "IMG_10 got its own image");
  assert.ok(!r.srcs.some((s) => /gem\/shopfront.*0$/.test(s)));
});

test("stock queries come from alt text, else the brief", () => {
  assert.equal(stockQuery({ alt: "Flat white coffee", description: "long brief" }), "Flat white coffee");
  assert.equal(stockQuery({ alt: "", description: "baker kneading dough in morning light, warm tones" }), "baker kneading dough in morning light");
});
