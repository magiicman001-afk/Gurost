// Run: node --test test/section-stats.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "stats",
  item: /g-stats__item"/g,
  extra: () => {
    test("stats: numbers are the owner's; with none given nothing is invented", () => {
      const r = R.renderSection("stats", "a", { title: "T" });
      assert.ok(r.warnings.length > 0);
      assert.ok(!/\d/.test(r.html.replace(/<[^>]*>/g, " ")), "no digits appear by themselves");
    });
    test("stats: value and label are both required per item", () => {
      const r = R.renderSection("stats", "b", { title: "T", items: [{ value: "[Add number]", label: "A" }, { value: "x" }, { label: "y" }, { value: "z", label: "B" }] });
      assert.equal((r.html.match(/g-stats__item"/g) || []).length, 2);
    });
  },
});
