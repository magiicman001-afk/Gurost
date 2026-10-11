// Run: node --test test/sections-preview.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const B = require("../scripts/build-sections-preview");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");

test("preview page is up to date (run: node scripts/build-sections-preview.js)", () => {
  assert.equal(fs.readFileSync(B.OUT, "utf8"), B.build());
});

test("preview page carries all 9 sections in all 6 palettes, with controls", () => {
  const html = fs.readFileSync(B.OUT, "utf8");
  const data = JSON.parse(html.match(/var DATA = (\{[\s\S]*?\});\n  var q/)[1]);
  assert.equal(Object.keys(data.palettes).length, 6);
  for (const p of Object.values(data.palettes)) {
    assert.equal(Object.keys(p.sections).length, 9);
    for (const [id, s] of Object.entries(p.sections)) {
      assert.equal(H.leftoverSlots(s), false, id);
      assert.match(s, new RegExp(`data-variant="${id.split("-")[1]}"`));
    }
  }
  assert.ok(/Phone 375/.test(html) && /Desktop 1440/.test(html) && /"Dark"|>Dark</.test(html) || /html: "Dark"/.test(html));
  assert.ok(R.palettes.palettes.cafe);
});

test("preview sample copy invents no prices, ratings, years or counts", () => {
  const txt = JSON.stringify(B.SAMPLES);
  assert.ok(!/[£$€]\s?\d|\d\s?(stars?|reviews?|customers|years)|\b(19|20)\d\d\b/i.test(txt));
});
