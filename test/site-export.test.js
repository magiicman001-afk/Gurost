// Run: node --test test/site-export.test.js
// 2c: the zip, the Vercel deploy and the GitHub push all use siteFiles().
const test = require("node:test");
const assert = require("node:assert/strict");
const { siteFiles, entriesFor, packageProject } = require("../wrapper");
// lib/deploy.js pulls in the database driver (pg), which this test never uses; a stand-in lets it load anywhere.
const Module = require("module");
const realLoad = Module._load;
Module._load = function (request, ...rest) { return request === "pg" ? { Pool: class {}, Client: class {} } : realLoad.call(this, request, ...rest); };
let toVercelFiles;
try { ({ toVercelFiles } = require("../lib/deploy")); } finally { Module._load = realLoad; }
const { hardenSite } = require("../lib/site-links");
const { PassThrough } = require("stream");

const PIXELS = Buffer.from(Array.from({ length: 900 }, (_, i) => (i * 7 + 200) % 256)); // bytes that are NOT valid utf-8
const B64 = PIXELS.toString("base64");

function bakery() {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Crumb &amp; Co | Bakery</title><style>body{margin:0}</style></head><body>
<header><nav><a href="#top">Crumb &amp; Co</a><a href="#about">Our story</a><a href="#menu">Menu</a><a href="#contact">Contact</a><a href="#order">Place Order</a></nav></header>
<main><section id="hero" data-page="home"><h1>Bread worth waking up for</h1><img src="data:image/png;base64,${B64}" alt="loaf"><p>Baked every morning in Stokes Croft.</p></section>
<section id="about" data-page="about"><h2>Our story</h2><img src="data:image/png;base64,${B64}" alt="loaf again"><p>Three generations of bakers.</p></section>
<section id="menu" data-page="offering"><h2>The menu</h2><p>Sourdough and tarts.</p></section>
<section id="contact" data-page="contact"><h2>Visit us</h2><p>42 Stokes Croft.</p></section></main>
<footer><a href="#about">About</a> 2026</footer><script>document.title = document.title;</script></body></html>`;
  return hardenSite(html, { formEndpoint: "https://example.test/api/site-forms/11111111-1111-4111-8111-111111111111" }).html;
}
const project = () => ({ type: "website", prompt: "Crumb & Co bakery", currentHtml: bakery() });
const paths = (files) => files.map((f) => f.path);
const get = (files, p) => files.find((f) => f.path === p).content;

test("siteFiles: pages, shared CSS and JS, and the image as a real file", () => {
  const s = siteFiles(project());
  assert.equal(s.multi, true);
  for (const p of ["index.html", "about.html", "menu.html", "contact.html", "order.html", "styles.css", "script.js", "images/image-1.png"]) {
    assert.ok(paths(s.files).includes(p), `${p} is missing: ${paths(s.files)}`);
  }
  assert.equal(s.imageCount, 1, "the same picture used twice is one file");
  assert.deepEqual(s.pages.map((p) => p.file), ["index.html", "about.html", "menu.html", "contact.html", "order.html"]);
});

test("siteFiles: no base64 is left in any page, and every page that used the picture points at the file", () => {
  const s = siteFiles(project());
  for (const f of s.files.filter((x) => /\.(html|css|js)$/.test(x.path))) {
    assert.ok(!/base64,[A-Za-z0-9+/=]{200,}/.test(f.content), `${f.path} still holds the image inline`);
  }
  assert.ok(get(s.files, "index.html").includes('src="images/image-1.png"'));
  assert.ok(get(s.files, "about.html").includes('src="images/image-1.png"'));
});

test("siteFiles: the image is a Buffer with the exact original bytes; pages and code are text", () => {
  const s = siteFiles(project());
  const img = get(s.files, "images/image-1.png");
  assert.ok(Buffer.isBuffer(img));
  assert.deepEqual(img, PIXELS);
  for (const f of s.files.filter((x) => !x.path.startsWith("images/"))) assert.equal(typeof f.content, "string", f.path);
});

test("siteFiles: every link between pages lands on a file that is in the list", () => {
  const s = siteFiles(project());
  const have = new Set(paths(s.files));
  for (const f of s.files.filter((x) => x.path.endsWith(".html"))) {
    for (const m of f.content.matchAll(/\b(?:href|src)=["']([^"'#?]+)(?:[#?][^"']*)?["']/g)) {
      const t = m[1];
      if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(t)) continue;
      assert.ok(have.has(t), `${f.path} points at ${t}, which is not in the site`);
    }
  }
});

test("siteFiles: a design that cannot be split is still one index.html (plus its images)", () => {
  const html = `<html><body><p>tiny</p><img src="data:image/png;base64,${B64}"></body></html>`;
  const s = siteFiles({ type: "website", currentHtml: html });
  assert.equal(s.multi, false);
  assert.deepEqual(paths(s.files), ["index.html", "images/image-1.png"]);
  assert.deepEqual(s.pages, [{ file: "index.html", label: "Home" }]);
});

test("siteFiles: nothing built throws, as the zip always did", () => {
  assert.throws(() => siteFiles({ type: "website" }), /nothing built yet/);
  assert.throws(() => siteFiles(null), /nothing built yet/);
});

test("zip entries: all pages, CSS, JS, images, env and a README that lists the pages", () => {
  const es = entriesFor(project());
  const names = es.map((e) => e.name);
  for (const n of ["index.html", "about.html", "menu.html", "contact.html", "order.html", "styles.css", "script.js", "images/image-1.png", ".env.example", "README.md"]) {
    assert.ok(names.includes(n), `${n} missing from ${names}`);
  }
  const readme = es.find((e) => e.name === "README.md").content;
  assert.match(readme, /^# crumb-co-bakery/);
  assert.match(readme, /`about\.html` - About/);
  assert.match(readme, /`menu\.html` - Menu/);
  assert.match(readme, /`styles\.css` and `script\.js`/);
  assert.match(readme, /keep all the files together/);
  assert.match(readme, /Submissions page/);
  assert.match(readme, /1 image used/);
});

test("zip: the file really is a zip with every page in it (streamed through packageProject)", async () => {
  const out = new PassThrough(); const chunks = [];
  out.on("data", (c) => chunks.push(c));
  await packageProject(project(), out);
  const zip = Buffer.concat(chunks);
  assert.equal(zip.slice(0, 2).toString(), "PK");
  const listing = zip.toString("latin1");
  for (const n of ["index.html", "about.html", "order.html", "styles.css", "script.js", "images/image-1.png", "README.md"]) assert.ok(listing.includes(n), `${n} not in the zip`);
});

test("Vercel payload: every file base64, the image's bytes survive exactly, one string still means one index.html", () => {
  const files = toVercelFiles(siteFiles(project()).files);
  assert.ok(files.every((f) => f.encoding === "base64" && typeof f.file === "string"));
  const img = files.find((f) => f.file === "images/image-1.png");
  assert.deepEqual(Buffer.from(img.data, "base64"), PIXELS, "image not corrupted");
  const page = files.find((f) => f.file === "about.html");
  assert.match(Buffer.from(page.data, "base64").toString("utf-8"), /<h2[^>]*>Our story<\/h2>/);
  // old call style: toVercelFiles is only for lists; deployToVercel wraps a string itself
  const wrapped = toVercelFiles([{ path: "index.html", content: "<p>é</p>" }]);
  assert.equal(Buffer.from(wrapped[0].data, "base64").toString("utf-8"), "<p>é</p>");
});

test("Vercel payload for a text file with non-ASCII characters is exact (utf-8)", () => {
  const f = toVercelFiles([{ path: "a.html", content: "Café – 日本" }])[0];
  assert.equal(Buffer.from(f.data, "base64").toString("utf-8"), "Café – 日本");
});
