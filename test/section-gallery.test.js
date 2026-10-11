// Run: node --test test/section-gallery.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "gallery",
  item: /g-gallery__item"/g,
  extra: ({ render }) => {
    test("gallery: every picture has the Gurost hooks and an alt (alt, then brief, then caption); the caption is optional", () => {
      const r = R.renderSection("gallery", "a", { title: "T", images: [{ image: "IMG_1", brief: "Loaves", caption: "Fresh" }, { image: "IMG_2", caption: "Only a caption" }, { image: "IMG_3", alt: "Own alt", brief: "b" }] });
      assert.match(r.html, /alt="Loaves"[^>]*data-gurost-image="Loaves"/);
      assert.match(r.html, /alt="Only a caption"/);
      assert.match(r.html, /alt="Own alt"/);
      assert.equal((r.html.match(/data-gurost-image-role="gallery"/g) || []).length, 3);
      assert.equal((r.html.match(/<figcaption/g) || []).length, 2);
    });
    test("gallery: needs at least three pictures (warning), a picture without a valid image token is dropped", () => {
      const r = R.renderSection("gallery", "b", { title: "T", images: [{ image: "IMG_1" }, { image: "https://evil.example.com/x.jpg" }, { caption: "no image" }] });
      assert.ok(r.warnings.some((w) => /min 3/.test(w)));
      assert.equal((r.html.match(/<img\b/g) || []).length, 1);
    });
    test("gallery: up to nine pictures; images load lazily", () => {
      const { html } = render("c", "maxlen");
      assert.equal((html.match(/<img\b/g) || []).length, 9);
      assert.ok(!/loading="eager"/.test(html));
    });
  },
});
