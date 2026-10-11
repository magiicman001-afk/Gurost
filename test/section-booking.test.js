// Run: node --test test/section-booking.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "booking",
  item: /g-booking__row"/g,
  extra: () => {
    test("booking: no form; a method with a link is an anchor, without a link plain text; tel and mailto links survive", () => {
      const r = R.renderSection("booking", "a", { title: "T", methods: [{ label: "Call", value: "01234 567890", href: "tel:01234567890" }, { label: "Hours", value: "Mon to Fri" }, { label: "Email", value: "a@b.co", href: "mailto:a@b.co" }], cta_label: "Book online", cta_href: "https://example.com/book" });
      assert.ok(!/<form|<input/.test(r.html));
      assert.equal((r.html.match(/<a class="g-booking__v"/g) || []).length, 2);
      assert.ok(r.html.includes('<span class="g-booking__v">Mon to Fri</span>'));
      assert.ok(r.html.includes('href="tel:01234567890"') && r.html.includes('href="mailto:a@b.co"'));
    });
    test("booking: the button needs a label and a link", () => {
      const m = [{ label: "Call", value: "x" }];
      assert.ok(!R.renderSection("booking", "a", { title: "T", methods: m, cta_label: "Book" }).html.includes("g-booking__btn"));
      assert.ok(R.renderSection("booking", "c", { title: "T", methods: m, cta_label: "Book", cta_href: "#b" }).html.includes("g-btn--inverse"));
    });
  },
});
