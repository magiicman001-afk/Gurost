// Run: node --test test/industry-design.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { getIndustryDesign } = require("../lib/industry-design");

const industryOf = (prompt) => getIndustryDesign(prompt)?.industry ?? null;

const CASES = [
  // The five industries the builder is tuned for
  ["A website for Crumb & Co, a neighbourhood bakery selling sourdough, pastries and celebration cakes", "Bakery/Cafe"],
  ["A website for Hale & Whitmore, a law firm specialising in family law and wills", "Legal Services"],
  ["A tech startup landing page for our AI scheduling app", "SaaS (General)"],
  ["An Italian restaurant with dinner reservations and a tasting menu", "Restaurant/Food Service"],
  ["An architecture firm portfolio site showing our residential projects", "Construction/Architecture"],
  // Prompts that matched correctly before this change must still match
  ["A landing page for a small coffee shop called Ember Roasters", "Bakery/Cafe"],
  ["Dental practice site with online booking", "Dental Practice"],
  ["A booking site for my dog grooming business, with online scheduling and a gallery", "Pet Tech App"],
  ["Emergency plumber in Leeds", "Home Services (Plumber/Electrician)"],
  ["Yoga studio class schedule", "Yoga & Stretching Guide"],
  // Previously wrong
  ["Portfolio for a wedding photographer", "Photography Studio"],
  ["Award-winning architects designing sustainable homes", "Construction/Architecture"],
];

for (const [prompt, expected] of CASES) {
  test(`${expected} <- "${prompt.slice(0, 60)}"`, () => {
    assert.equal(industryOf(prompt), expected);
  });
}

test("generic words alone do not pick an industry", () => {
  assert.equal(industryOf("Something cool"), null);
  assert.equal(industryOf("A website for my tech company"), null); // "tech" is in 6 industries
  assert.equal(industryOf("A simple app"), null);
});

test("lookup returns the palette, fonts and layout guidance", () => {
  const d = getIndustryDesign("A law firm specialising in family law");
  assert.ok(d.colors.primary.startsWith("#"));
  assert.ok(d.fonts.heading);
  assert.ok(d.landingPattern && d.style);
});
