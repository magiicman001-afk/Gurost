// Run: node --test test/site-links.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { hardenSite, findDeadLinks } = require("../lib/site-links");

const INFO = { name: "Crumb & Co.", address: "42 Stokes Croft, Bristol", instagram: "https://www.instagram.com/crumbandco" };
const EP = "https://gurost.test/api/site-forms/11111111-1111-4111-8111-111111111111";
const PAGE = `<!DOCTYPE html><html><head><title>Crumb</title></head><body>
<header><nav><a href="#">Home</a><a href="#menu">Menu</a><a href="#">Place Order</a><a href="javascript:void(0)">Contact Us</a><a href="#nowhere">Our Story</a></nav>
<button>Book Now</button></header>
<section id="menu"><h2>Menu</h2></section>
<footer><a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="TikTok">TT</a><a href="https://www.facebook.com/crumb" aria-label="Facebook">FB</a></footer></body></html>`;

test("dead links are retargeted: order, contact, social, unknown anchors", () => {
  assert.ok(findDeadLinks(PAGE).length >= 5);
  const { html, report } = hardenSite(PAGE, { businessInfo: INFO, formEndpoint: EP });
  assert.deepEqual(findDeadLinks(html), []);
  assert.match(html, /<a [^>]*href="#order"[^>]*>Place Order<\/a>/);
  assert.match(html, /href="#contact"[^>]*>Contact Us/);
  assert.match(html, /href="#contact"[^>]*>Our Story/);
  assert.match(html, /href="#top"[^>]*>Home/);
  const ig = /<a [^>]*>IG<\/a>/.exec(html)[0];
  assert.match(ig, /href="https:\/\/www\.instagram\.com\/crumbandco"/);
  assert.match(ig, /target="_blank"/);
  assert.match(ig, /rel="noopener noreferrer"/);
  assert.match(html, /href="https:\/\/www\.facebook\.com\/crumb"/); // already real: untouched
  assert.ok(report.removed.includes("TT") || report.removed.some((r) => /TT|tiktok/i.test(r)), "TikTok has no profile, so its icon is dropped, not invented");
  assert.doesNotMatch(html, /tiktok\.com/);
});

test("adds order form, contact form and map when the design left them out", () => {
  const { html, report } = hardenSite(PAGE, { businessInfo: INFO, formEndpoint: EP });
  assert.deepEqual(report.added, ["order form", "contact form", "Google Maps embed", "form handler"]);
  for (const f of ["name", "email", "phone", "item", "quantity", "pickup_time"]) assert.match(html, new RegExp(`id="order-form"[\\s\\S]*name="${f}"`));
  assert.match(html, /google\.com\/maps\?q=42%20Stokes%20Croft%2C%20Bristol&output=embed/);
  assert.match(html, /<section id="order"[\s\S]*<footer/); // before the footer
});

test("keeps an existing contact section and adds no map without an address", () => {
  const page = PAGE.replace("<footer>", '<section id="contact"><form><input name="email"></form></section><footer>');
  const { html, report } = hardenSite(page, { businessInfo: { name: "X" }, formEndpoint: EP });
  assert.deepEqual(report.added, ["order form", "form handler"]);
  assert.equal((html.match(/id="contact"/g) || []).length, 1);
  assert.doesNotMatch(html, /maps/);
});

test("form handler points at the endpoint and is added once (idempotent)", () => {
  const once = hardenSite(PAGE, { businessInfo: INFO, formEndpoint: EP });
  assert.ok(once.html.includes(JSON.stringify(EP)));
  const twice = hardenSite(once.html, { businessInfo: INFO, formEndpoint: EP });
  assert.equal(twice.html, once.html);
});

test("no endpoint (no project id): no handler injected, forms still added", () => {
  const { html, report } = hardenSite(PAGE, { businessInfo: INFO });
  assert.doesNotMatch(html, /data-gurost-forms/);
  assert.ok(!report.added.includes("form handler"));
});

test("business text with $ patterns cannot corrupt the page", () => {
  const { html } = hardenSite(PAGE, { businessInfo: { address: "$& $1 Lane, Bristol" }, formEndpoint: EP });
  assert.match(html, /Open \$&amp; \$1 Lane, Bristol in Google Maps/);
});
