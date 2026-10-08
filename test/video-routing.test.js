// Run: node --test test/video-routing.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const imageBot = require("../image-bot");
const realSearchVideo = imageBot.searchVideo; // later tests stub it
const { parseVariantResponse } = require("../lib/variant-response");
const { fulfillVideoRequests, fulfillMedia } = require("../bots/variant-bot")._internal;

const HERO = '<section class="bg-stone-900"><video src="VID_1" data-gurost-video="baker kneading dough" autoplay muted loop playsinline class="absolute inset-0"></video><h1>Crumb</h1></section>';
const BAND = '<section class="bg-amber-900"><video data-gurost-video="bread oven fire" autoplay muted loop playsinline><source src="VID_2" type="video/mp4"></video></section>';
const DOC = (body) => `<!DOCTYPE html><html><head><title>Crumb</title></head><body>${body}<footer><p>f</p></footer></body></html>`;

function stubVideos(found) {
  const asked = [];
  imageBot.searchVideo = async (q) => {
    asked.push(q);
    return found(q) ? { url: `https://cdn.pixabay.com/video/${q.replace(/\W+/g, "-")}.mp4`, poster: `https://cdn.pixabay.com/poster/${q.replace(/\W+/g, "-")}.jpg`, credit: `Video by B on Pixabay` } : null;
  };
  return asked;
}

test("parser: video placeholders on <video> and on a <source> inside one; working attribute stripped", () => {
  const r = parseVariantResponse(DOC(HERO + BAND));
  assert.deepEqual(r.videoRequests, [{ placeholder: "VID_1", query: "baker kneading dough" }, { placeholder: "VID_2", query: "bread oven fire" }]);
  assert.ok(!r.html.includes("data-gurost-video"));
  assert.match(r.html, /<video src="VID_1" autoplay muted loop playsinline/);
});

test("found clips: src, poster and preload set; credit returned", async () => {
  const asked = stubVideos(() => true);
  const { html } = parseVariantResponse(DOC(HERO + BAND));
  const v = await fulfillVideoRequests(html, [{ placeholder: "VID_1", query: "baker kneading dough" }, { placeholder: "VID_2", query: "bread oven fire" }]);
  assert.deepEqual(asked, ["baker kneading dough", "bread oven fire"]);
  assert.match(v.html, /<video src="https:\/\/cdn\.pixabay\.com\/video\/baker-kneading-dough\.mp4" poster="https:\/\/cdn\.pixabay\.com\/poster\/baker-kneading-dough\.jpg" preload="metadata" autoplay/);
  assert.match(v.html, /<source src="https:\/\/cdn\.pixabay\.com\/video\/bread-oven-fire\.mp4"/);
  assert.ok(!/VID_\d/.test(v.html));
  assert.equal(v.found, 2);
});

test("no clip (or no key): the whole <video> is removed, the section and its colour stay", async () => {
  stubVideos((q) => q !== "bread oven fire");
  const { html } = parseVariantResponse(DOC(HERO + BAND));
  const v = await fulfillVideoRequests(html, [{ placeholder: "VID_1", query: "baker kneading dough" }, { placeholder: "VID_2", query: "bread oven fire" }]);
  assert.equal((v.html.match(/<video\b/g) || []).length, 1);
  assert.match(v.html, /<section class="bg-amber-900"><\/section>/);
  assert.ok(!/VID_\d/.test(v.html));
});

test("more than 3 videos: only 3 searched, the rest removed", async () => {
  const asked = stubVideos(() => true);
  const body = [1, 2, 3, 4, 5].map((n) => `<video src="VID_${n}" data-gurost-video="clip ${n}" muted></video>`).join("");
  const r = parseVariantResponse(DOC(body));
  const v = await fulfillVideoRequests(r.html, r.videoRequests);
  assert.equal(asked.length, 3);
  assert.equal((v.html.match(/<video\b/g) || []).length, 3);
  assert.ok(!/VID_\d/.test(v.html));
});

test("fulfillMedia: no credit line in the page; credits returned separately; videos counted in the plan", async () => {
  stubVideos(() => true);
  imageBot.generateImageUrl = async () => "https://cdn/gem.png";
  imageBot.searchImage = async () => ({ url: "https://cdn/stock.jpg", credit: "Photo by A on Pixabay" });
  const parsed = parseVariantResponse(DOC(HERO + '<img src="IMG_1" data-gurost-image="loaf" data-gurost-image-role="secondary" alt="sourdough loaf">'));
  let plan, credits;
  const html = await fulfillMedia(parsed, (p) => { plan = p; }, undefined, { onCredits: (c) => { credits = c; } });
  assert.deepEqual(plan, { gemini: 0, stock: 1, videos: 1 });
  // (a clip's own src still points at its CDN address; that is a link, not credit text)
  assert.ok(!/Photos?\s*(&amp;|&)?\s*(video)?:|Video by|Photo by|Coverr|Openverse|on Pixabay/i.test(html), "no credit text anywhere in the page source");
  assert.ok(!/Pixabay|Coverr|Openverse/i.test(html.replace(/<[^>]*>/g, " ")), "none of the names in the visible text");
  assert.deepEqual(credits, ["Video by B on Pixabay", "Photo by A on Pixabay"], "credits are kept for the project record");
});

test("pickVideoFile (Pixabay renditions): smallest MP4 at least 1280 wide, else the largest smaller one", () => {
  const r = (w) => ({ url: `https://cdn.pixabay.com/video/${w}.mp4`, width: w, height: Math.round(w * 9 / 16), thumbnail: `t${w}.jpg` });
  const videos = { large: r(3840), medium: r(1920), small: r(1280), tiny: r(640) };
  assert.equal(imageBot.pickVideoFile(videos).width, 1280);
  assert.equal(imageBot.pickVideoFile({ tiny: r(640), small: r(960) }).width, 960);
  assert.equal(imageBot.pickVideoFile({ large: { url: "", width: 1920 } }), null, "Pixabay leaves url empty for missing renditions");
});

test("searchVideo: Pixabay hit -> landscape clip, poster and credit; no key -> null", async () => {
  const realFetch = global.fetch;
  const asked = [];
  global.fetch = async (url) => { asked.push(url); return { ok: true, json: async () => ({ hits: [
    { duration: 90, user: "long", videos: { tiny: { url: "https://cdn.pixabay.com/video/long.mp4", width: 1280, height: 720, thumbnail: "long.jpg" } } },
    { duration: 12, user: "portrait", videos: { tiny: { url: "https://cdn.pixabay.com/video/tall.mp4", width: 720, height: 1280, thumbnail: "tall.jpg" } } },
    { duration: 10, user: "nuwaus", videos: { tiny: { url: "https://cdn.pixabay.com/video/pool.mp4", width: 1280, height: 720, thumbnail: "https://cdn.pixabay.com/video/pool.jpg" } } },
  ] }) }; };
  try {
    process.env.PIXABAY_API_KEY = "k";
    assert.deepEqual(await realSearchVideo("resort pool"), { url: "https://cdn.pixabay.com/video/pool.mp4", poster: "https://cdn.pixabay.com/video/pool.jpg", credit: "Video by nuwaus on Pixabay", provider: "pixabay" });
    assert.match(asked[0], /^https:\/\/pixabay\.com\/api\/videos\/\?key=k&q=resort%20pool/);
    delete process.env.PIXABAY_API_KEY;
    assert.equal(await realSearchVideo("resort pool"), null);
  } finally { global.fetch = realFetch; }
});

test("the credit line is gone for good; each design keeps its credits on its record", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "../bots/variant-bot.js"), "utf8");
  assert.ok(!/addPhotoCredits|Photos & video|Photos: /.test(src), "nothing writes a credit line into a page");
  assert.match(src, /verified: true, credits \}/, "the staged variant record carries its credits");
  assert.match(src, /usage: r\.usage, credits \}/, "so does the plain variant record");
});
