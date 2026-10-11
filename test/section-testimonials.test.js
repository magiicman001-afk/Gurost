// Run: node --test test/section-testimonials.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "testimonials",
  item: /g-quotes__item"/g,
  extra: ({ render }) => {
    test("testimonials: quotes are blockquotes with the person's name; role is optional; no star ratings anywhere", () => {
      for (const v of ["a", "b", "c"]) {
        const { html } = render(v, "full");
        assert.equal((html.match(/<blockquote/g) || []).length, 3);
        assert.equal((html.match(/<figcaption/g) || []).length, 3);
        assert.ok(!/★|☆|star|rating/i.test(html));
      }
      assert.ok(!render("a", "minimal").html.includes("g-quotes__role"));
    });
    test("testimonials: an item with no quote or no name is dropped, never invented; the placeholder text is exposed for the editor", () => {
      const r = R.renderSection("testimonials", "a", { title: "T", items: [{ quote: "Great", name: "A. Person" }, { quote: "No name" }, { name: "No quote" }] });
      assert.equal((r.html.match(/<blockquote/g) || []).length, 1);
      assert.equal(R.placeholder("review"), "[Add a real customer review]");
    });
    test("testimonials: C is the dark band; one real review is enough", () => {
      assert.match(render("c", "full").html, /data-tone="dark"/);
      const r = R.renderSection("testimonials", "b", { title: "T", items: [{ quote: "Lovely", name: "N" }] });
      assert.deepEqual(r.warnings, []);
    });
  },
});
