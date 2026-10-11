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
    test("gallery C: with 3 to 9 pictures every row is full, on a phone and a desktop (no lonely tile)", async (t) => {
      let browser;
      try {
        browser = await require("playwright").chromium.launch();
      } catch {
        return t.skip("no chromium");
      }
      try {
        const css = R.paletteCss("cafe") + R.baseCss() + require("fs").readFileSync(require("path").join(__dirname, "..", "lib", "sections", "gallery", "gallery.css"), "utf8");
        for (const width of [375, 1200]) {
          const page = await browser.newPage({ viewport: { width, height: 800 } });
          for (let n = 3; n <= 9; n++) {
            const images = Array.from({ length: n }, (_, i) => ({ image: "https://cdn.pixabay.com/photo/x" + i + ".jpg", brief: "p" + i }));
            const html = R.renderSection("gallery", "c", { title: "T", images }).html;
            await page.setContent(`<style>${css}</style><body class="g-page">${html}</body>`);
            const rows = await page.evaluate(() => {
              const list = document.querySelector(".g-gallery__list").getBoundingClientRect();
              const byTop = new Map();
              for (const el of document.querySelectorAll(".g-gallery__item")) {
                const r = el.getBoundingClientRect();
                const k = Math.round(r.top);
                const e = byTop.get(k) || { c: 0, w: 0 };
                byTop.set(k, { c: e.c + 1, w: r.width });
              }
              const tiles = [...document.querySelectorAll(".g-gallery__item")].map((el) => el.getBoundingClientRect());
              const right = Math.max(...tiles.map((r) => r.right));
              return { right: Math.round(right), edge: Math.round(list.right), lone: [...byTop.values()].filter((e) => e.c === 1 && e.w < list.width - 2).length, rows: byTop.size };
            });
            assert.equal(rows.right, rows.edge, `${width}px n=${n}: tiles reach the right edge`);
            if (width === 375) assert.equal(rows.lone, 0, `${width}px n=${n}: a tile stands alone at half width`);
          }
          await page.close();
        }
      } finally {
        await browser.close();
      }
    });
  },
});
