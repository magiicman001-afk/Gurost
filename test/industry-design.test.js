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

test("accented words match: café is a cafe, not a restaurant", () => {
  const prompt = "A family-run sourdough bakery and café in Bristol. Pre-order bread for collection, see the weekly menu, and book a table for weekend brunch.";
  assert.equal(getIndustryDesign(prompt).industry, "Bakery/Cafe");
  assert.equal(getIndustryDesign("A cosy café in Lisbon").industry, "Bakery/Cafe");
});

test("common business names match their industry (resort is a hotel, not a spa)", () => {
  const cases = {
    "Build a luxury resort website with a video hero, room gallery, spa section, dining, and booking form": "Hotel/Hospitality",
    "A spa resort in Bali": "Hotel/Hospitality",
    "A beach resort in the Maldives": "Hotel/Hospitality",
    "A mountain resort in the Alps": "Hotel/Hospitality",
    "A boutique hotel in Lisbon": "Hotel/Hospitality",
    "A country inn with six rooms": "Hotel/Hospitality",
    "A bed and breakfast in Cornwall": "Hotel/Hospitality",
    "A roadside motel on Route 66": "Hotel/Hospitality",
    "A coffee shop in Leeds": "Bakery/Cafe",
    "A French bistro with a set menu": "Restaurant/Food Service",
    "A 24-hour diner serving burgers and shakes": "Restaurant/Food Service",
    "A barrister's chambers": "Legal Services",
    "A legal practice for immigration cases": "Legal Services",
    "A family dentist": "Dental Practice",
    "An orthodontist offering Invisalign": "Dental Practice",
    "A pilates studio with reformer classes": "Fitness/Gym App",
    "A fitness studio for HIIT classes": "Fitness/Gym App",
    "A barber shop for fades": "Beauty/Spa/Wellness Service",
    "A wellness centre with massage and meditation": "Beauty/Spa/Wellness Service",
  };
  for (const [prompt, industry] of Object.entries(cases)) assert.equal(getIndustryDesign(prompt)?.industry, industry, prompt);
});
