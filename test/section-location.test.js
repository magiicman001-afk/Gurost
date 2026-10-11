// Run: node --test test/section-location.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "location",
  item: /g-loc__hour"/g,
  extra: () => {
    test("location: no embedded map or frame; address is required (placeholder), hours need day and time", () => {
      const r = R.renderSection("location", "a", { title: "T", hours: [{ day: "Mon", time: "9 to 5" }, { day: "Tue" }] });
      assert.ok(!/<iframe|<script/.test(r.html));
      assert.ok(r.html.includes("[Add your address]"));
      assert.equal((r.html.match(/g-loc__hour"/g) || []).length, 1);
    });
    test("location: contact block shows only when a phone or email is given; tel and mailto links are built", () => {
      assert.ok(!R.renderSection("location", "b", { title: "T", address: "1 High St" }).html.includes("Contact"));
      const r = R.renderSection("location", "b", { title: "T", address: "1 High St", phone: "0113 496 0000", email: "a@b.co" });
      assert.ok(r.html.includes('href="tel:01134960000"') && r.html.includes('href="mailto:a@b.co"'));
    });
    test("location: without a photo A and C still render the details", () => {
      for (const v of ["a", "c"]) assert.ok(R.renderSection("location", v, { title: "T", address: "1 High St" }).html.includes("1 High St"));
    });
  },
});
