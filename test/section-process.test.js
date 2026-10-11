// Run: node --test test/section-process.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "process",
  item: /g-process__step"/g,
  extra: () => {
    test("process: steps are numbered by position, from 1, and a step needs a title", () => {
      const r = R.renderSection("process", "a", { title: "T", steps: [{ title: "One" }, { text: "no title" }, { title: "Three" }] });
      assert.deepEqual([...r.html.matchAll(/g-process__num" aria-hidden="true">(\d+)</g)].map((m) => m[1]), ["1", "2"]);
    });
  },
});
