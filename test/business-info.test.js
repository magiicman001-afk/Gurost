// Run: node --test test/business-info.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBusinessInfo, businessInfoPrompt, describeBusinessInfo, applyBusinessInfoUpdate } = require("../lib/business-info");

test("keeps known fields, cleaned; links become https URLs", () => {
  const info = normalizeBusinessInfo({
    name: "  Crumb   & Co. ", phone: "0117 496 0000", email: "hello@crumbandco.co.uk",
    address: "42 Stokes Croft,\nBristol", instagram: "instagram.com/crumbandco", website: "https://crumbandco.co.uk", extra: "ignored",
  });
  assert.deepEqual(info, {
    name: "Crumb & Co.", phone: "0117 496 0000", email: "hello@crumbandco.co.uk",
    address: "42 Stokes Croft, Bristol", website: "https://crumbandco.co.uk/", instagram: "https://instagram.com/crumbandco",
  });
});

test("invalid values are dropped, not 'fixed'; markup characters removed", () => {
  const info = normalizeBusinessInfo({ name: "<script>alert(1)</script>Bakery", email: "not-an-email", phone: "call us", website: "javascript:alert(1)", facebook: "not a handle!" });
  assert.deepEqual(info, { name: "script alert(1) /script Bakery" });
  assert.ok(!/[<>]/.test(info.name));
});

test("nothing usable -> null (treated as skipped)", () => {
  assert.equal(normalizeBusinessInfo(null), null);
  assert.equal(normalizeBusinessInfo("text"), null);
  assert.equal(normalizeBusinessInfo({ email: "bad" }), null);
});

test("length caps hold", () => {
  const info = normalizeBusinessInfo({ name: "x".repeat(500), address: "y".repeat(500) });
  assert.equal(info.name.length, 80);
  assert.equal(info.address.length, 200);
});

test("prompt: real details are used exactly + LocalBusiness JSON-LD; skipped -> obvious placeholders", () => {
  const p = businessInfoPrompt({ name: "Crumb & Co.", phone: "0117 496 0000", email: "hello@crumbandco.co.uk" });
  assert.match(p, /- Business name: Crumb & Co\.\n- Phone: 0117 496 0000\n- Email: hello@crumbandco\.co\.uk/);
  assert.match(p, /never invent other contact details/);
  assert.match(p, /application\/ld\+json/);
  const skip = businessInfoPrompt(null);
  assert.match(skip, /none given/);
  assert.match(skip, /never realistic-looking invented/);
});

test("all 10 company fields; @handles become profile URLs, pasted URLs are kept", () => {
  const info = normalizeBusinessInfo({
    name: "Crumb & Co", tagline: "Slow bread, baked daily.", phone: "0117 496 0123", email: "hello@crumbandco.co.uk",
    address: "42 Stokes Croft, Bristol", instagram: "@crumbandco", tiktok: "@crumb.and.co", youtube: "@CrumbBakes",
    x: "crumb_co", facebook: "facebook.com/crumbandco",
  });
  assert.equal(info.tagline, "Slow bread, baked daily.");
  assert.equal(info.instagram, "https://www.instagram.com/crumbandco");
  assert.equal(info.tiktok, "https://www.tiktok.com/@crumb.and.co");
  assert.equal(info.youtube, "https://www.youtube.com/@CrumbBakes");
  assert.equal(info.x, "https://x.com/crumb_co");
  assert.equal(info.facebook, "https://facebook.com/crumbandco");
  assert.equal(describeBusinessInfo(info), "Crumb & Co, tagline, phone, email, address, Instagram, TikTok, YouTube, X (Twitter), Facebook");
  const p = businessInfoPrompt(info);
  assert.match(p, /- TikTok: https:\/\/www\.tiktok\.com\/@crumb\.and\.co/);
  assert.match(p, /social icon \(inline SVG\) for exactly these profiles - Instagram, TikTok, YouTube, X \(Twitter\), Facebook/);
  assert.match(p, /"sameAs"/);
  assert.match(businessInfoPrompt({ name: "A" }), /Show no social icons/);
  assert.equal(normalizeBusinessInfo({ instagram: "crumb.and.co" }).instagram, "https://www.instagram.com/crumb.and.co");
  assert.equal(normalizeBusinessInfo({ instagram: "instagram.com" }), null, "a bare platform domain is not a profile");
});

test("update: old details become new everywhere - text, escaped text, tel: by digits, links", () => {
  const oldInfo = { name: "Crumb & Co", phone: "0117 496 0123", instagram: "https://www.instagram.com/crumbandco" };
  const newInfo = { name: "Crumb & Co", phone: "0117 496 9999", instagram: "https://www.instagram.com/crumbbristol" };
  const html = `<a href="tel:+441174960123">0117 496 0123</a> <a href="tel:01174960123">Call</a> <a href="tel:+15550000">other</a>
<a href="https://www.instagram.com/crumbandco">IG</a> <script type="application/ld+json">{"telephone":"0117 496 0123"}</script>`;
  const r = applyBusinessInfoUpdate(html, oldInfo, newInfo);
  assert.equal((r.html.match(/0117 496 9999/g) || []).length, 2);
  assert.equal((r.html.match(/tel:01174969999/g) || []).length, 2);
  assert.match(r.html, /tel:\+15550000/, "an unrelated number is left alone");
  assert.match(r.html, /instagram\.com\/crumbbristol/);
  assert.ok(!/0117 496 0123|crumbandco/.test(r.html));
  assert.equal(r.replaced, 5);
  assert.equal(applyBusinessInfoUpdate(html, oldInfo, oldInfo).replaced, 0);
});
