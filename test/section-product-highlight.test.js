// Run: node --test test/section-product-highlight.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "product-highlight",
  item: /<li>Feature/g,
  extra: () => {
    test("product-highlight: no price unless the owner gives one; features are capped at six and need text", () => {
      const none = R.renderSection("product-highlight", "a", { title: "T" });
      assert.ok(!none.html.includes("g-prod__price") && !none.html.includes("g-prod__features"));
      const f = Array.from({ length: 9 }, (_, i) => ({ text: "Feature " + i }));
      const r = R.renderSection("product-highlight", "b", { title: "T", price: "[Add price]", period: "each", features: [...f, {}] });
      assert.equal((r.html.match(/<li>Feature/g) || []).length, 6);
      assert.ok(r.html.includes("g-prod__price"));
    });
    test("product-highlight: without a photo the text still renders in every variant", () => {
      for (const v of ["a", "b", "c"]) assert.ok(R.renderSection("product-highlight", v, { title: "Only title" }).html.includes("Only title"));
    });
  },
});
