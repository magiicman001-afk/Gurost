// Run: node --test test/business-info.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeBusinessInfo, businessInfoPrompt } = require("../lib/business-info");

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
  const info = normalizeBusinessInfo({ name: "<script>alert(1)</script>Bakery", email: "not-an-email", phone: "call us", website: "javascript:alert(1)", facebook: "nothing" });
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
