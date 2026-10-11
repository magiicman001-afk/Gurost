// Run: node --test test/section-features.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { suite } = require("./helpers/section-suite");

suite({
  id: "features",
  item: /g-features__item"/g,
  extra: ({ render, sec }) => {
    test("features: three to six items; the title is required, eyebrow and intro are optional", () => {
      assert.equal(sec.slots.items.min, 3);
      assert.equal(sec.slots.items.max, 6);
      const { html } = render("a", "minimal");
      assert.ok(!html.includes("g-eyebrow") && !html.includes("g-lead"));
      assert.equal((html.match(/g-features__item"/g) || []).length, 3);
    });
    test("features: each item has an icon and an h3; the section owns exactly one h2 and the id 'features'", () => {
      for (const v of ["a", "b", "c"]) {
        const { html } = render(v, "full");
        assert.equal((html.match(/<h2\b/g) || []).length, 1);
        assert.equal((html.match(/<h3\b/g) || []).length, 3);
        assert.equal((html.match(/<svg\b/g) || []).length, 3);
        assert.ok(html.includes('id="features"'));
      }
    });
    test("features: variant B puts the heading beside the rows; C has a bento grid", () => {
      assert.ok(render("b", "full").html.includes("g-features__layout") && render("b", "full").html.includes("g-features__rows"));
      assert.ok(render("c", "full").html.includes("g-features__bento"));
    });
  },
});
