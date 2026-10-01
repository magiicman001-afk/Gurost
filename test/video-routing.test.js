// Run: node --test test/video-routing.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const imageBot = require("../image-bot");
const { parseVariantResponse } = require("../lib/variant-response");
const { fulfillVideoRequests, fulfillMedia } = require("../bots/variant-bot")._internal;

const HERO = '<section class="bg-stone-900"><video src="VID_1" data-gurost-video="baker kneading dough" autoplay muted loop playsinline class="absolute inset-0"></video><h1>Crumb</h1></section>';
const BAND = '<section class="bg-amber-900"><video data-gurost-video="bread oven fire" autoplay muted loop playsinline><source src="VID_2" type="video/mp4"></video></section>';
const DOC = (body) => `<!DOCTYPE html><html><head><title>Crumb</title></head><body>${body}<footer><p>f</p></footer></body></html>`;

function stubVideos(found) {
  const asked = [];
  imageBot.searchVideo = async (q) => {
    asked.push(q);
    return found(q) ? { url: `https://videos.pexels.com/${q.replace(/\W+/g, "-")}.mp4`, poster: `https://images.pexels.com/${q.replace(/\W+/g, "-")}.jpg`, credit: `Video by B on Pexels` } : null;
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
  assert.match(v.html, /<video src="https:\/\/videos\.pexels\.com\/baker-kneading-dough\.mp4" poster="https:\/\/images\.pexels\.com\/baker-kneading-dough\.jpg" preload="metadata" autoplay/);
  assert.match(v.html, /<source src="https:\/\/videos\.pexels\.com\/bread-oven-fire\.mp4"/);
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

test("fulfillMedia: videos and photos share one credit line; videos counted in the plan", async () => {
  stubVideos(() => true);
  imageBot.generateImageUrl = async () => "https://cdn/gem.png";
  imageBot.searchImage = async () => ({ url: "https://cdn/stock.jpg", credit: "Photo by A on Pexels" });
  const parsed = parseVariantResponse(DOC(HERO + '<img src="IMG_1" data-gurost-image="loaf" data-gurost-image-role="secondary" alt="sourdough loaf">'));
  let plan;
  const html = await fulfillMedia(parsed, (p) => { plan = p; });
  assert.deepEqual(plan, { gemini: 0, stock: 1, videos: 1 });
  assert.match(html, /Photos &amp; video: Video by B on Pexels · Photo by A on Pexels<\/p><footer>|Photos & video: Video by B on Pexels · Photo by A on Pexels/);
});

test("pickVideoFile: smallest MP4 at least 1280 wide, else the largest smaller one", () => {
  const files = [
    { link: "a", file_type: "video/mp4", width: 3840 },
    { link: "b", file_type: "video/mp4", width: 1920 },
    { link: "c", file_type: "video/mp4", width: 1280 },
    { link: "d", file_type: "video/mp4", width: 640 },
  ];
  assert.equal(imageBot.pickVideoFile(files).link, "c");
  assert.equal(imageBot.pickVideoFile(files.filter((f) => f.width < 1280)).link, "d");
  assert.equal(imageBot.pickVideoFile([{ link: "e", file_type: "video/webm", width: 1280 }]), null);
});
