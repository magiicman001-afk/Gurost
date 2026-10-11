// Run: node --test test/section-faq.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "faq",
  item: /g-faq__item"/g,
  extra: () => {
    test("faq: A and B use native <details> (no script needed); C shows every answer", () => {
      const items = [{ question: "Q1?", answer: "A1" }, { question: "Q2?", answer: "A2" }];
      for (const v of ["a", "b"]) {
        const r = R.renderSection("faq", v, { title: "T", items });
        assert.equal((r.html.match(/<details\b/g) || []).length, 2);
        assert.ok(!/<details[^>]*\sopen/.test(r.html));
      }
      const c = R.renderSection("faq", "c", { title: "T", items });
      assert.ok(!c.html.includes("<details") && c.html.includes("A1") && c.html.includes("A2"));
    });
    test("faq: an item needs both a question and an answer", () => {
      const r = R.renderSection("faq", "a", { title: "T", items: [{ question: "Only a question" }, { answer: "Only an answer" }, { question: "Q", answer: "A" }] });
      assert.equal((r.html.match(/g-faq__item"/g) || []).length, 1);
    });
  },
});
