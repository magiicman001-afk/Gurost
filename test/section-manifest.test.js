// Run: node --test test/section-manifest.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");

const TWENTY = ["navbar", "hero", "trust-bar", "features", "about", "services", "gallery", "testimonials", "pricing", "team", "process", "stats", "faq", "booking", "location", "blog", "cta", "newsletter", "footer", "product-highlight"];

test("manifest lists the 20 sections, each with id, three variants, aliases, page types, pairs, tones and a status", () => {
  assert.deepEqual(R.manifest.sections.map((s) => s.id).sort(), [...TWENTY].sort());
  assert.equal(R.manifest.flag, "SECTION_LIBRARY");
  for (const s of R.manifest.sections) {
    assert.deepEqual(s.variants, ["a", "b", "c"], s.id);
    assert.ok(s.aliases.length >= 2 && s.pageTypes.length >= 1 && s.palettePairs.length >= 3 && s.tones.length >= 1, s.id);
    assert.ok(["planned", "built"].includes(s.status), s.id);
    assert.ok(["header", "section", "footer"].includes(s.element), s.id);
  }
});

test("slot limits for Navbar, Hero and Footer match the slice-1 plan", () => {
  const nav = R.getSection("navbar").slots, hero = R.getSection("hero").slots, foot = R.getSection("footer").slots;
  assert.equal(nav.brand.max, 32);
  assert.equal(nav.links.max, 6);
  assert.equal(nav.links.item.label.max, 16);
  assert.equal(nav.cta_label.max, 20);
  assert.deepEqual([hero.headline.max, hero.subhead.max, hero.eyebrow.max, hero.cta1_label.max, hero.image_alt.max, hero.trust_line.max], [70, 160, 40, 24, 100, 60]);
  assert.deepEqual([foot.tagline.max, foot.address.max, foot.email.max, foot.hours.max, foot.socials.max, foot.link_groups.max, foot.link_groups.item.links.max], [90, 120, 60, 80, 5, 3, 5]);
  assert.equal(foot.hours.placeholder, "[Add your opening hours]");
});

test("sections without a built schema are honest: slots are null, not invented", () => {
  for (const s of R.manifest.sections) if (s.status === "planned" && !["navbar", "hero", "footer"].includes(s.id)) assert.equal(s.slots, null, s.id);
});

test("every palette pair named in the manifest passes in all six palettes", () => {
  for (const s of R.manifest.sections) assert.deepEqual(H.sectionContrastFailures(s.id), [], s.id);
});

test("renderSection refuses a section with no schema or no template instead of guessing", () => {
  assert.throws(() => R.renderSection("product-highlight", "a", {}), /no slot schema/);
  assert.throws(() => R.renderSection("nope", "a", {}), /unknown section/);
  assert.throws(() => R.renderSection("navbar", "z", {}), /no variant/);
});
