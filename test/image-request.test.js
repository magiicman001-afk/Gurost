// Run: node --test test/image-request.test.js
// Bug II: "add a photo" in Pulse showed only alt text (an invented address) with a green tick.
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/image-request");

const project = { prompt: "Haven Coffee, a cosy coffee shop in London" };
const PHOTO = { url: "https://x.supabase.co/storage/v1/object/public/project-assets/stock/a.jpg", provider: "pixabay", credit: "Photo by A on Pixabay" };

test("asks to add a photo -> yes; asks to remove or restyle one -> no", () => {
  for (const t of ["add a photo of fresh bread", "Put some pictures in the menu section", "I want images of our coffee", "add more photos", "replace the hero photo with a latte"]) assert.equal(R.wantsImage(t), true, t);
  for (const t of ["remove the photo", "delete all images", "make the hero image bigger", "the pictures are too dark", "change the colour to green", "add a video of coffee"]) assert.equal(R.wantsImage(t), false, t);
});

test("search words: what they said it shows, else the business's own words", () => {
  assert.equal(R.imageQuery(project, "add a photo of fresh sourdough bread to the menu section"), "fresh sourdough bread");
  assert.equal(R.imageQuery(project, "add some photos"), "haven coffee cosy coffee");
});

test("no stock photo: nothing to use (the route says so and leaves the page alone)", async () => {
  assert.equal(await R.findImage(project, "add a photo of bread", async () => null), null);
  assert.equal(await R.findImage(project, "add a photo of bread", async () => ({ url: "http://insecure/a.jpg" })), null, "only https addresses");
});

test("a found photo is handed to the model as an exact <img>", async () => {
  let asked = null;
  const photo = await R.findImage(project, "add a photo of fresh bread", async (q) => { asked = q; return PHOTO; });
  assert.equal(asked, "fresh bread");
  const instruction = R.buildInstruction("add a photo of fresh bread", photo);
  assert.match(instruction, new RegExp(`<img src="${PHOTO.url.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}" alt="fresh bread"`));
  assert.match(instruction, /do not invent another address/);
});

test("the edit only counts when the photo is really an <img> on the page", () => {
  assert.equal(R.hasImage(`<section><img class="w-full" src="${PHOTO.url}" alt="x"></section>`, PHOTO), true);
  assert.equal(R.hasImage(`<section><img src="https://images.example/made-up.jpg" alt="fresh bread"></section>`, PHOTO), false, "an invented address");
  assert.equal(R.hasImage(`<p>${PHOTO.url}</p>`, PHOTO), false, "the address as text is not a photo");
  assert.equal(R.hasImage(`<div style="background:url(${PHOTO.url})"></div>`, PHOTO), false);
});

// Both Pulse edit paths use it: the typed /api/pulse route and the voice/text socket.
const fs = require("fs");
const path = require("path");
test("wired into /api/pulse and the /ws/guide edit: no photo -> 422 / plain error, photo missing after -> nothing saved", () => {
  const server = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(server, /if \(!photo\) return res\.status\(422\)\.json\(\{ error: imageRequest\.NOT_AVAILABLE \}\);/);
  assert.match(server, /if \(photo && !imageRequest\.hasImage\(r\.html, photo\)\) throw new Error\(imageRequest\.NOT_APPLIED\);/);
  const ws = fs.readFileSync(path.join(__dirname, "..", "guide", "websocket-server.js"), "utf8");
  assert.match(ws, /if \(!photo\) throw new Error\(imageRequest\.NOT_AVAILABLE\);/);
  const lock = ws.slice(ws.indexOf("imageRequest.buildInstruction"));
  assert.ok(lock.indexOf("imageRequest.hasImage") < lock.indexOf("integrator.integrateCorrection"), "checked before the page is saved");
});
