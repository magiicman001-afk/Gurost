// Run: node --test test/section-cta.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "cta",
  item: /g-cta__title/g,
  extra: () => {
    test("cta: a button needs both label and link; two buttons render when both are complete", () => {
      assert.ok(!R.renderSection("cta", "a", { title: "T", cta1_label: "Go" }).html.includes("g-btn"));
      const r = R.renderSection("cta", "b", { title: "T", cta1_label: "Go", cta1_href: "#a", cta2_label: "More", cta2_href: "tel:0123" });
      assert.equal((r.html.match(/class="g-btn /g) || []).length, 2);
    });
    test("cta: A sits on the primary colour with inverse and outline buttons only", () => {
      const r = R.renderSection("cta", "a", { title: "T", cta1_label: "Go", cta1_href: "#a", cta2_label: "More", cta2_href: "#b" });
      assert.ok(r.html.includes("g-btn--inverse") && r.html.includes("g-btn--outline") && !r.html.includes("g-btn--primary"));
    });
  },
});
