// Run: node --test test/company-profile.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const c = require("../lib/company-profile");

const good = { name: "Crumb & Co", website: "www.crumb.co.uk", industry: "bakery_cafe", type: "b2c", target: "Locals who want fresh bread", socials: { instagram: "@crumbco" } };

test("a complete form is accepted and cleaned", () => {
  const { profile, problems } = c.normalizeProfile(good);
  assert.deepEqual(problems, []);
  assert.equal(profile.name, "Crumb & Co");
  assert.equal(profile.website, "https://www.crumb.co.uk");
  assert.equal(profile.industry, "bakery_cafe");
  assert.equal(profile.type, "b2c");
  assert.deepEqual(profile.socials, { instagram: "crumbco" });
});

test("missing required fields are each named, nothing is invented", () => {
  const { problems } = c.normalizeProfile({});
  assert.equal(problems.length, 4);
  assert.match(problems.join(" "), /company name/);
  assert.match(problems.join(" "), /website/);
  assert.match(problems.join(" "), /industry/);
  assert.match(problems.join(" "), /businesses, consumers or both/);
  assert.equal(c.normalizeProfile(null).problems.length, 4);
});

test("unknown industry or type is refused, not replaced", () => {
  const { profile, problems } = c.normalizeProfile({ ...good, industry: "pirates", type: "everyone" });
  assert.equal(profile.industry, "");
  assert.equal(profile.type, "");
  assert.equal(problems.length, 2);
});

test("website: scheme added, tracking hash dropped, plain public hosts only", () => {
  assert.equal(c.normalizeWebsite("crumb.co.uk"), "https://crumb.co.uk");
  assert.equal(c.normalizeWebsite("HTTP://Crumb.co.uk/menu#top"), "http://crumb.co.uk/menu");
  assert.equal(c.normalizeWebsite("https://crumb.co.uk/"), "https://crumb.co.uk");
  for (const bad of ["", "localhost", "http://localhost:3000", "http://127.0.0.1", "http://169.254.169.254/latest", "http://10.0.0.5", "http://[::1]/", "http://2130706433", "http://127.1",
    "ftp://crumb.co.uk", "javascript:alert(1)", "file:///etc/passwd", "https://user:pw@crumb.co.uk", "http://crumb", "http://printer.local", "http://db.internal", "https://crumb.co.uk:8080", "https://crumb .co.uk", "x".repeat(400) + ".com"]) {
    assert.equal(c.normalizeWebsite(bad), null, bad);
  }
});

test("social handles: @, urls and bare names all become the bare name; junk is refused", () => {
  assert.equal(c.normalizeHandle("@crumbco"), "crumbco");
  assert.equal(c.normalizeHandle("https://www.instagram.com/crumbco/"), "crumbco");
  assert.equal(c.normalizeHandle("instagram.com/crumb.co"), "crumb.co");
  assert.equal(c.normalizeHandle("  "), "");
  assert.equal(c.normalizeHandle("bad handle"), null);
  assert.equal(c.normalizeHandle("<script>"), null);
  const { problems, profile } = c.normalizeProfile({ ...good, socials: { instagram: "ok", tiktok: "no good", x: "@xname" } });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /TikTok/);
  assert.deepEqual(profile.socials, { instagram: "ok", x: "xname" });
});

test("unknown social keys are ignored; markup and length are cleaned", () => {
  const { profile } = c.normalizeProfile({ ...good, name: "  <b>Crumb</b>  ", target: "t".repeat(900), socials: { myspace: "tom", instagram: "a" } });
  assert.equal(profile.name, "b Crumb /b");
  assert.equal(profile.target.length, 500);
  assert.deepEqual(profile.socials, { instagram: "a" });
});

test("every industry the brief names is in the list", () => {
  const ids = c.INDUSTRIES.map((i) => i.id);
  for (const id of ["restaurant", "law_firm", "ecommerce", "bakery_cafe", "other"]) assert.ok(ids.includes(id), id);
  assert.deepEqual(c.BUSINESS_TYPES.map((t) => t.id), ["b2b", "b2c", "both"]);
});
