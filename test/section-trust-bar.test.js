// Run: node --test test/section-trust-bar.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "trust-bar",
  item: /g-trustbar__item"/g,
  extra: ({ render }) => {
    test("trust-bar: icons are inline SVG, hidden from screen readers; an unknown icon falls back to the check mark", () => {
      const r = R.renderSection("trust-bar", "a", { items: [{ icon: "shield", label: "Fully insured" }, { icon: "nonsense", label: "Free quotes" }] });
      assert.equal((r.html.match(/<svg[^>]*aria-hidden="true"/g) || []).length, 2);
      assert.ok(r.html.includes(R.iconSvg("check")));
      assert.ok(!/<img/.test(r.html));
    });
    test("trust-bar: one item is a warning (needs at least two), the detail line is optional", () => {
      const r = R.renderSection("trust-bar", "b", { items: [{ label: "Family run" }] });
      assert.ok(r.warnings.some((w) => /min 2/.test(w)));
      assert.ok(!r.html.includes("g-trustbar__detail"));
    });
    test("trust-bar: C is always the dark band; A is on the surface colour", () => {
      assert.match(render("c", "full").html, /data-tone="dark"/);
      assert.match(render("a", "full").html, /g-sec--surface/);
    });
  },
});
