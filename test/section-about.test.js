// Run: node --test test/section-about.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

const NOW = new Date(Date.UTC(2031, 5, 1));
suite({
  id: "about",
  item: /<li>/g,
  extra: ({ render, fixture }) => {
    test("about: the photo is optional for B only; image tag carries the Gurost hooks and a non-empty alt (alt, brief, then title)", () => {
      const full = render("a", "full").html;
      assert.match(full, /<img [^>]*data-gurost-image="[^"]+"[^>]*data-gurost-image-role="about"/);
      assert.ok(!/alt=""/.test(full));
      const f = { ...fixture("full"), image_alt: "", image_brief: "A baker at work" };
      assert.match(R.renderSection("about", "c", f, { now: NOW }).html, /alt="A baker at work"/);
      const g = { ...fixture("full"), image_alt: "", image_brief: "" };
      assert.match(R.renderSection("about", "a", g, { now: NOW }).html, /alt="Section title sample"/);
      assert.ok(!render("b", "full").html.includes("<img"), "B has no photo");
    });
    test("about: points are capped at four; the button needs both a label and a link; body2 is optional", () => {
      const html = render("b", "full").html;
      assert.equal((html.match(/<li>/g) || []).length, 3);
      assert.ok(html.includes("g-about__cta"));
      const half = R.renderSection("about", "b", { ...fixture("full"), cta_href: "" }, { now: NOW }).html;
      assert.ok(!half.includes("g-about__cta"));
      const min = render("b", "minimal").html;
      assert.equal((min.match(/g-about__body/g) || []).length, 1);
    });
    test("about: only the real owner text is shown; the placeholder appears when the body is missing", () => {
      const r = R.renderSection("about", "b", { title: "Our story" }, { now: NOW });
      assert.ok(r.html.includes("[Add about text]"));
      assert.ok(r.warnings.some((w) => /body/.test(w)));
    });
  },
});
