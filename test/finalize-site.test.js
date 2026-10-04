// Run: node --test test/finalize-site.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { finalizeSite } = require("../lib/finalize-site");

const PAGE = `<!DOCTYPE html><html><head><title>Crumb & Co. — Bristol Sourdough</title></head><body>
<header><h1>Bread baked the slow way.</h1><p>A family-run sourdough bakery on Stokes Croft, Bristol.</p>
<img src="https://cdn.example/hero.jpg" alt="loaf"></header></body></html>`;
const INFO = { name: "Crumb & Co.", phone: "0117 496 0123", email: "hello@crumbandco.co.uk", address: "42 Stokes Croft, Bristol", instagram: "https://instagram.com/crumbandco" };

test("adds description, Open Graph (with the hero image) and LocalBusiness schema", () => {
  const r = finalizeSite(PAGE, { businessInfo: INFO, summary: "Warm, editorial site for a Bristol sourdough bakery." });
  assert.deepEqual(r.added, ["meta description", "Open Graph tags with the hero image", "LocalBusiness schema"]);
  assert.match(r.html, /<meta name="description" content="Warm, editorial site for a Bristol sourdough bakery\.">/);
  assert.match(r.html, /<meta property="og:title" content="Crumb &amp; Co\. — Bristol Sourdough">/);
  assert.match(r.html, /<meta property="og:image" content="https:\/\/cdn\.example\/hero\.jpg">/);
  assert.match(r.html, /<meta name="twitter:card" content="summary_large_image">/);
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(r.html)[1]);
  assert.equal(ld["@type"], "LocalBusiness");
  assert.equal(ld.telephone, "0117 496 0123");
  assert.deepEqual(ld.sameAs, ["https://instagram.com/crumbandco"]);
  assert.ok(r.html.indexOf("og:title") < r.html.indexOf("</head>"), "all inside <head>");
});

test("never overwrites what the design already has; nothing to add -> unchanged", () => {
  const done = finalizeSite(PAGE, { businessInfo: INFO, summary: "x" }).html;
  const again = finalizeSite(done, { businessInfo: INFO, summary: "something else" });
  assert.deepEqual(again.added, []);
  assert.equal(again.html, done);
});

test("no business details -> no schema; no summary -> the hero's first paragraph", () => {
  const r = finalizeSite(PAGE, {});
  assert.ok(!r.added.includes("LocalBusiness schema"));
  assert.match(r.html, /<meta name="description" content="A family-run sourdough bakery on Stokes Croft, Bristol\.">/);
});

test("a design's own JSON-LD is kept; text can't break out of the script tag", () => {
  const withLd = PAGE.replace("</head>", '<script type="application/ld+json">{"@type":"Bakery"}</script></head>');
  assert.ok(!finalizeSite(withLd, { businessInfo: INFO }).added.includes("LocalBusiness schema"));
  const r = finalizeSite(PAGE, { businessInfo: { name: "</script><script>alert(1)</script>" } });
  assert.ok(!/<\/script><script>alert/.test(r.html));
});

test("Open Graph tags a design already set aren't duplicated; entities read as text", () => {
  const partial = PAGE.replace("</head>", '<meta property="og:description" content="Ours."></head>')
    .replace("A family-run", "&quot;Proper&quot; bread &mdash; a family-run");
  const r = finalizeSite(partial, {});
  assert.equal(r.html.match(/og:description/g).length, 1);
  assert.match(r.html, /<meta property="og:title"/);
  assert.match(r.html, /<meta name="description" content="&quot;Proper&quot; bread — a family-run/);
});
