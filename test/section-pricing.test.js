// Run: node --test test/section-pricing.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const G = require("../lib/sections/quality-gate");
const { suite } = require("./helpers/section-suite");

suite({
  id: "pricing",
  item: /g-pricing__plan[ "]/g,
  extra: ({ render }) => {
    test("pricing: a missing price is a visible placeholder, never a made-up number", () => {
      const r = R.renderSection("pricing", "a", { title: "T", plans: [{ name: "Standard" }] });
      assert.ok(r.html.includes("[Add price]"));
      assert.ok(!/\d/.test(r.html.replace(/<(svg|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, "")));
    });
    test("pricing: the owner's own price is shown; the gate rejects an invented one and accepts a declared fact", () => {
      const r = R.renderSection("pricing", "c", { title: "T", plans: [{ name: "Loaf", price: "£4.50", period: "each" }] });
      assert.ok(r.html.includes("£4.50"));
      assert.ok(G.checkStatic(r.html).some((f) => f.rule === "fake-fact"));
      assert.deepEqual(G.checkStatic(r.html, { facts: ["Loaf £4.50 each"] }).filter((f) => f.severity === "fail"), []);
    });
    test("pricing: features are capped at six per plan; the button needs label and link; featured is a flag", () => {
      const f = Array.from({ length: 9 }, (_, i) => ({ text: "Feature " + String.fromCharCode(65 + i) }));
      const r = R.renderSection("pricing", "a", { title: "T", plans: [{ name: "A", price: "x", features: f, cta_label: "Go", featured: true }, { name: "B", price: "y", cta_label: "Go", cta_href: "#b" }] });
      assert.equal((r.html.match(/Feature /g) || []).length, 6);
      assert.equal((r.html.match(/g-pricing__cta/g) || []).length, 1, "first plan has no link, so no button");
      assert.equal((r.html.match(/is-featured/g) || []).length, 1);
      assert.ok(r.html.includes("g-btn--ghost") && !r.html.includes("g-btn--primary"), "only the unfeatured plan has a button, so it is the ghost style");
      const r2 = R.renderSection("pricing", "a", { title: "T", plans: [{ name: "A", price: "x", cta_label: "Go", cta_href: "#a", featured: true }, { name: "B", price: "y", cta_label: "Go", cta_href: "#b" }] });
      assert.ok(r2.html.includes("g-btn--primary") && r2.html.includes("g-btn--ghost"));
    });
    test("pricing: no invented badges such as 'Most popular' or 'Best value'", () => {
      for (const v of ["a", "b", "c"]) assert.ok(!/most popular|best value|save \d/i.test(render(v, "full").html));
    });
  },
});
