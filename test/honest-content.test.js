// Run: node --test test/honest-content.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { enforceHonestContent, describeReplaced } = require("../lib/honest-content");

const BUSINESS = JSON.stringify({ name: "Crumb & Co", phone: "0117 496 0123", address: "42 Stokes Croft, Bristol BS1 3QY" });
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("the live bakery case (2026-10-07): invented prices and founding year become placeholders", () => {
  const html = `<section><h2>Our Story</h2><p>Founded in 2019 by a local baker. Handcrafted since 2019.</p></section>
<ul><li>Country Sourdough <span>£5.50</span></li><li>Rye &amp; Walnut £6.00</li><li>Croissant £2.95</li></ul>
<select><option value="Country Sourdough">Country Sourdough - £5.50</option></select>`;
  const r = enforceHonestContent(html, { allowed: ["Build a bakery website", BUSINESS] });
  const text = textOf(r.html);
  assert.doesNotMatch(text, /[£$€]\s?\d/);
  assert.doesNotMatch(text, /2019/);
  assert.match(text, /Founded in \[Year founded\]/);
  assert.match(text, /since \[Year founded\]/);
  assert.equal((text.match(/\[Add your price\]/g) || []).length, 4);
  assert.deepEqual(r.replaced, { prices: 4, years: 2, ratings: 0, numbers: 0 });
  assert.equal(describeReplaced(r.replaced), "4 invented prices, 2 invented years");
});

test("the owner's own figures are kept: prices they wrote as prices, years they gave", () => {
  const r = enforceHonestContent("<p>Sourdough £4.50, rye £5. Baking since 1998.</p>", { allowed: ["Our sourdough is £4.50, we started in 1998"] });
  assert.equal(r.html, "<p>Sourdough £4.50, rye [Add your price]. Baking since 1998.</p>");
});

test("a lone digit from an address or phone number is not a source (BS1 3QY doesn't make £3 real)", () => {
  const r = enforceHonestContent("<p>Tea £3, coffee £42</p>", { allowed: [BUSINESS] });
  assert.equal(r.html, "<p>Tea [Add your price], coffee [Add your price]</p>");
});

test("ratings and statistics are replaced too, keeping the words around them", () => {
  const r = enforceHonestContent("<p>Rated 4.9★ by 500+ happy customers. 98% satisfaction. 20 years of experience. 5 stars!</p>", { allowed: [] });
  assert.equal(r.html, "<p>Rated [Add your rating] by [Add your number] happy customers. [Add your number] satisfaction. [Add your number] years of experience. [Add your rating]!</p>");
  assert.deepEqual(r.replaced, { prices: 0, years: 0, ratings: 2, numbers: 3 });
});

test("scripts, styles, comments and attributes are never touched", () => {
  const html = `<a href="/menu?price=£5" data-price="£5" title="since 2019"><img src="x-2019.jpg" alt="£5 loaf"></a>
<script>const price = "£5.50"; // since 2019</script><style>.p::after{content:"£5"}</style><!-- £9 since 2001 -->`;
  const r = enforceHonestContent(html, { allowed: [] });
  assert.equal(r.html, html);
  assert.equal(r.total, 0);
});

test("ordinary numbers and dates are left alone", () => {
  const html = "<p>© 2026 Crumb &amp; Co. Open 7am–3pm, Tue–Sat. Call 0117 496 0123. 2 Stokes Croft. 3 loaves for the price of 2. 100% organic flour.</p>";
  assert.equal(enforceHonestContent(html, { allowed: [] }).html, html);
});

test("a Pulse instruction's figures, and what was already on the page, are the owner's", () => {
  const before = "<p>Rye £5.00</p>";
  const after = "<p>Rye £5.00</p><p>Sourdough £4.20</p><p>Bagel £1.80</p>";
  const r = enforceHonestContent(after, { allowed: ["Add sourdough at £4.20", before] });
  assert.equal(r.html, "<p>Rye £5.00</p><p>Sourdough £4.20</p><p>Bagel [Add your price]</p>");
});

test("euro and other currency layouts", () => {
  assert.equal(enforceHonestContent("<p>Suite from €450 per night or 450 € or 300 EUR, $1,200 a week</p>").html,
    "<p>Suite from [Add your price] per night or [Add your price] or [Add your price], [Add your price] a week</p>");
});

test("deliberate: a bare number elsewhere doesn't make a price real - only a price the owner wrote as a price", () => {
  // "4.50" in an opening-hours line is not the owner pricing anything at £4.50.
  const r = enforceHonestContent("<p>Sourdough £4.50</p>", { allowed: ["Open 4.50am for early deliveries"] });
  assert.equal(r.html, "<p>Sourdough [Add your price]</p>");
});
