// Run: node --test test/video-request.test.js
// Bug FF: a motion-video request must never swap the layout and pretend a video plays.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const V = require("../lib/video-request");
const PS = require("../lib/published-sites");

test("wantsVideo: adding video yes, removing it or other talk no", () => {
  for (const t of ["add a motion video to the hero", "Make the background a video of bread baking", "use footage as a moving background", "can I have a looping background video"]) assert.equal(V.wantsVideo(t), true, t);
  for (const t of ["remove the video", "make the hero bigger", "change the button colour", "no video please", "add a video call button"].slice(0, 4)) assert.equal(V.wantsVideo(t), false, t);
});

test("videoQuery: what was asked for, else the business's own words", () => {
  assert.equal(V.videoQuery({ prompt: "a bakery in Leeds" }, "background video of bread baking in the hero"), "bread baking");
  assert.equal(V.videoQuery({ prompt: "a bakery and cafe in Leeds" }, "add a motion video"), "bakery cafe leeds");
  assert.equal(V.videoQuery({ prompt: "" }, "add a video"), "");
});

test("no clip available: findClip is null (the route then answers honestly and changes nothing)", async () => {
  assert.equal(await V.findClip({ prompt: "a bakery" }, "add a video", async () => null), null);
  assert.equal(await V.findClip({ prompt: "a bakery" }, "add a video", async () => ({ url: "http://insecure.example/x.mp4" })), null, "only https clips");
  const clip = await V.findClip({ prompt: "a bakery" }, "add a video", async (q) => ({ url: "https://cdn.pixabay.com/video/1.mp4", poster: "https://cdn.pixabay.com/video/1.jpg", credit: "x", q }));
  assert.equal(clip.url, "https://cdn.pixabay.com/video/1.mp4");
});

test("hasClip: the clip must really be inside a <video> on the page", () => {
  const clip = { url: "https://cdn.pixabay.com/video/1.mp4" };
  assert.equal(V.hasClip(`<section><video autoplay muted loop><source src="${clip.url}"></video></section>`, clip), true);
  assert.equal(V.hasClip("<section class='hero split'><img src='a.jpg'></section>", clip), false, "a layout swap alone is not a video");
  assert.equal(V.hasClip(`<img src="${clip.url}">`, clip), false, "the address in an <img> is not a video");
  assert.equal(V.hasClip(`<video></video><p>${clip.url}</p>`, clip), false);
});

test("buildInstruction hands the model the exact clip", () => {
  const i = V.buildInstruction("add a video", { url: "https://cdn.pixabay.com/video/1.mp4", poster: "https://cdn.pixabay.com/video/1.jpg" });
  assert.match(i, /<source src="https:\/\/cdn\.pixabay\.com\/video\/1\.mp4"/);
  assert.match(i, /autoplay muted loop playsinline/);
});

test("the Pulse route: no clip = 422 with the honest message before anything changes; the result is verified", () => {
  const src = fs.readFileSync(require.resolve("../server.js"), "utf8");
  assert.match(src, /videoRequest\.wantsVideo\(instruction\)/);
  assert.match(src, /status\(422\)\.json\(\{ error: videoRequest\.NOT_AVAILABLE \}\)/);
  assert.match(src, /videoRequest\.hasClip\(r\.html, videoClip\)\) throw new Error\(videoRequest\.NOT_APPLIED\)/);
  const at = src.indexOf("videoRequest.hasClip(r.html");
  assert.ok(at < src.indexOf("pushUndoSnapshot(project, \"correct\")", at - 200) || src.indexOf("pushUndoSnapshot", at) > at, "the check comes before anything is saved");
});

test("published sites may load https video (the clip would otherwise be blocked after Launch)", () => {
  const h = PS.siteHeaders({ status: "live", published_html: { engine: "library" } }, { connectOrigin: "https://app.example" });
  const csp = h["Content-Security-Policy"] || "";
  assert.match(csp, /media-src 'self' https:/);
});
