// Run: node --test test/section-services.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "services",
  item: /g-services__item"/g,
  extra: ({ render }) => {
    test("services: no prices anywhere in the template (pricing is its own section)", () => {
      for (const v of ["a", "b", "c"]) assert.ok(!/[£$€]|price/i.test(render(v, "full").html));
    });
    test("services: a link appears only when the item has a link; its label defaults to 'Learn more'", () => {
      const r = R.renderSection("services", "a", { title: "T", items: [{ title: "One", href: "#one" }, { title: "Two", href: "#two", link_label: "Book it" }, { title: "Three" }] });
      assert.equal((r.html.match(/g-services__link/g) || []).length, 2);
      assert.ok(r.html.includes("Learn more") && r.html.includes("Book it"));
      assert.match(r.html, /href="#one"/);
    });
    test("services: two to eight items; each item is an h3 inside one h2 section with the id 'services'", () => {
      const r = R.renderSection("services", "c", { title: "T", items: [{ title: "a" }] });
      assert.ok(r.warnings.some((w) => /min 2/.test(w)));
      const { html } = render("b", "full");
      assert.equal((html.match(/<h2\b/g) || []).length, 1);
      assert.ok(html.includes('id="services"'));
    });
  },
});
