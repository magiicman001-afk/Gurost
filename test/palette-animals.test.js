// Run: node --test test/palette-animals.test.js
// Bug UU (phone test 2026-10-13): "animal sanctuary" matched no palette, got the neutral "tech" one and came out navy and blue.
const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../lib/sections/assemble");

test("animal, rescue and charity briefs get the warm teal 'health' palette, not the neutral tech one", () => {
  for (const t of ["animal sanctuary", "rescued animals charity", "dog shelter", "wildlife rescue centre", "donkey sanctuary", "a charity for homeless people", "cat adoption and rescue", "non-profit foundation for children"]) {
    assert.equal(A.paletteForIndustry(t), "health", t);
  }
});

test("existing industries keep their palette", () => {
  const want = { "pet grooming salon": "salon", "bakery and cafe in Leeds": "cafe", "family law firm": "law", "plumber and electrician": "trades", "dental clinic": "health", "saas startup platform": "tech", "a website": "tech" };
  for (const [t, id] of Object.entries(want)) assert.equal(A.paletteForIndustry(t), id, t);
});
