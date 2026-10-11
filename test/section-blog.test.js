// Run: node --test test/section-blog.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "blog",
  item: /g-blog__post[ "]/g,
  extra: () => {
    test("blog: a post needs a title; the title is a link only when the owner gives a link; date and tag are the owner's text", () => {
      const r = R.renderSection("blog", "a", { title: "T", posts: [{ title: "With link", href: "https://example.com/p" }, { title: "No link" }, { text: "no title" }] });
      assert.equal((r.html.match(/g-blog__post"/g) || []).length, 2);
      assert.equal((r.html.match(/<a class="g-blog__link"/g) || []).length, 1);
      assert.ok(!/g-blog__date|g-blog__tag/.test(r.html), "no invented dates or tags");
    });
    test("blog: C marks only the first post as the lead", () => {
      const r = R.renderSection("blog", "c", { title: "T", posts: [{ title: "A" }, { title: "B" }, { title: "C" }] });
      assert.equal((r.html.match(/is-lead/g) || []).length, 1);
    });
  },
});
