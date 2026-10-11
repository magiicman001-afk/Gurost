// Run: node --test test/section-newsletter.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const { suite } = require("./helpers/section-suite");

suite({
  id: "newsletter",
  item: /g-news__form/g,
  extra: () => {
    test("newsletter: the form posts to the owner's https link; a plain http or javascript link gives no form", () => {
      const ok = R.renderSection("newsletter", "a", { title: "T", action: "https://example.com/subscribe" });
      assert.match(ok.html, /<form class="g-news__form" method="post" action="https:\/\/example.com\/subscribe">/);
      assert.match(ok.html, /<input [^>]*type="email"[^>]*required/);
      assert.ok(ok.html.includes("Subscribe"));
      for (const bad of ["http://example.com/x", "javascript:alert(1)"]) {
        const r = R.renderSection("newsletter", "a", { title: "T", action: bad });
        assert.ok(!r.html.includes("<form") && r.html.includes("[Add your sign-up form link]"));
      }
    });
    test("newsletter: the email input has a real (screen-reader) label", () => {
      const r = R.renderSection("newsletter", "b", { title: "T", action: "https://example.com/s" });
      assert.match(r.html, /<label class="g-news__label"><span class="g-sr-only">Email address<\/span><input/);
    });
  },
});
