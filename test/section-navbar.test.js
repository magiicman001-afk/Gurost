// Run: node --test test/section-navbar.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");
const F = require("./fixtures/sections.json");

const CSS = fs.readFileSync(path.join(__dirname, "..", "lib", "sections", "navbar", "navbar.css"), "utf8");
const VARIANTS = ["a", "b", "c"];
const PALETTES = Object.keys(R.palettes.palettes);
const NOW = new Date(Date.UTC(2031, 5, 1));
const L = (label, href) => ({ label, href });
const OURS = /<script>[\s\S]*?<\/script>/;

const FIX = {
  full: { brand: "Luvky Bakes", logo: "IMG_1", links: [L("Menu", "#menu"), L("About", "#about"), L("Shop", "/shop"), L("Visit", "#visit"), L("Blog", "/blog"), L("Jobs", "/jobs")], cta_label: "Call us", cta_href: "tel:+441234567890", phone: "01234 567890", sticky: true, tone: "dark" },
  minimal: { brand: "Luvky", links: [L("Menu", "#menu"), L("About", "#about"), L("Visit", "#visit")], cta_label: "Book", cta_href: "#book" },
  maxlen: { brand: "B".repeat(80), links: Array.from({ length: 6 }, (_, i) => L("Extraordinarily long label " + i, "#s" + i)), cta_label: "C".repeat(60), cta_href: "#c", phone: "9".repeat(50) },
  xss: { brand: F.xssPayloads[0], links: F.xssPayloads.slice(0, 4).map((p) => L(p, "javascript:alert(1)")), cta_label: F.xssPayloads[1], cta_href: "JaVaScRiPt:alert(1)", phone: F.xssPayloads[2] },
  unicode: { brand: F.unicode[0], links: F.unicode.map((u) => L(u, "#u")), cta_label: F.unicode[2], cta_href: "#c" },
};
const render = (v, f) => R.renderSection("navbar", v, FIX[f], { now: NOW });

for (const v of VARIANTS)
  for (const f of Object.keys(FIX))
    test(`navbar ${v} / ${f}: renders clean, no leftovers, one landmark`, () => {
      const { html, warnings } = render(v, f);
      assert.equal(H.leftoverSlots(html), false);
      assert.equal(H.emptyHrefs(html), false);
      assert.ok(!warnings.some((w) => /unknown slot/.test(w)), warnings.join("|"));
      assert.equal((html.match(/<header\b/g) || []).length, 1);
      assert.match(html, new RegExp(`data-gurost-section="navbar" data-variant="${v}"`));
      assert.match(html, /<nav [^>]*aria-label="Main"/);
      assert.match(html, /<button [^>]*aria-expanded="false"[^>]*aria-controls="g-nav-panel"/);
      assert.ok(html.includes('id="g-nav-panel"'));
      assert.ok(html.includes('class="g-skip"'));
    });

for (const v of VARIANTS)
  test(`navbar ${v}: XSS payloads never survive, links with bad schemes become '#'`, () => {
    const { html } = render(v, "xss");
    assert.equal((html.match(/<script\b/gi) || []).length, 1, "only our own navbar script may exist");
    const rest = html.replace(OURS, "");
    assert.deepEqual(H.leakedPayloads(rest, F.xssPayloads), []);
    assert.equal(H.hasActiveInjection(rest), false);
    assert.ok(!/javascript:/i.test(rest));
  });

for (const v of VARIANTS)
  test(`navbar ${v}: overlong slots are truncated to the manifest limits`, () => {
    const { html } = render(v, "maxlen");
    assert.ok(!html.includes("B".repeat(33)));
    assert.ok(!html.includes("C".repeat(21)));
    assert.ok(!html.includes("9".repeat(21)));
    assert.ok(!html.includes("Extraordinarily long label 0"), "label over 16 chars is cut");
  });

test("navbar: variant B splits links into two groups; A and C keep one list", () => {
  const b = render("b", "full").html;
  const left = b.match(/links--left">([\s\S]*?)<\/ul>/)[1];
  const right = b.match(/links--right">([\s\S]*?)<\/ul>/)[1];
  assert.equal((left.match(/<li>/g) || []).length, 3);
  assert.equal((right.match(/<li>/g) || []).length, 3);
  for (const v of ["a", "c"]) assert.equal((render(v, "full").html.match(/<ul /g) || []).length, 1);
});

test("navbar: phone link uses a tel: href made from digits; absent phone removes the block", () => {
  assert.match(render("a", "full").html, /href="tel:01234567890"/);
  assert.ok(!render("a", "minimal").html.includes("g-navbar__phone"));
});

test("navbar: sticky and tone apply to A and B; C is always dark and solidifies on scroll", () => {
  assert.ok(render("a", "full").html.includes("g-navbar--sticky"));
  assert.ok(!render("a", "minimal").html.includes("g-navbar--sticky"));
  assert.match(render("b", "full").html, /data-tone="dark"/);
  assert.match(render("a", "minimal").html, /data-tone="light"/);
  const c = render("c", "minimal").html;
  assert.match(c, /data-tone="dark"/);
  assert.ok(c.includes("data-g-nav-solid"));
  assert.ok(!c.includes("g-navbar--sticky"));
});

test("navbar: missing links, CTA or brand still produce safe output with a warning", () => {
  const r = R.renderSection("navbar", "a", { brand: "X" }, { now: NOW });
  assert.equal(H.leftoverSlots(r.html), false);
  assert.ok(r.warnings.length > 0);
});

test("navbar: exactly one inline script, no inline handlers or styles", () => {
  for (const v of VARIANTS) {
    const { html } = render(v, "full");
    assert.equal((html.match(/<script>/g) || []).length, 1);
    assert.ok(!/\son[a-z]+=/i.test(html));
    assert.ok(!html.includes("style="));
  }
});

for (const p of PALETTES) {
  test(`navbar x ${p}: manifest contrast pairs pass`, () => {
    assert.deepEqual(H.sectionContrastFailures("navbar").filter((f) => f.palette === p), []);
  });
  test(`navbar C x ${p}: light text stays readable on the worst-case photo under the 0.6 scrim`, () => {
    const c = R.getPalette(p).colors;
    const worst = H.underScrim("#FFFFFF", 0.6);
    assert.ok(H.contrast(c["on-dark"], worst) >= 4.5, `${p}: ${H.contrast(c["on-dark"], worst)}`);
    assert.ok(H.contrast(c.text, c.surface) >= 4.5);
    assert.ok(H.contrast(c.primary, c["on-primary"]) >= 4.5); // inverse button
    assert.ok(H.contrast(c.dark, c["on-dark"]) >= 4.5); // dark tone button
  });
}

test("navbar.css: only the documented scrim is a raw colour; variables exist; no !important", () => {
  assert.deepEqual(H.rawColours(CSS, ["rgba(0, 0, 0, 0.6)"]), []);
  assert.deepEqual(H.unknownVars(CSS), []);
  assert.equal(H.hasImportant(CSS), false);
  assert.deepEqual(H.unscopedHiding(CSS), []);
});

test("navbar.css: drawer hiding only under .g-js; tap targets 44px; reduced motion respected", () => {
  const hidden = [...CSS.matchAll(/([^{}]+)\{[^{}]*display:\s*none/g)].map((m) => m[1].trim());
  for (const sel of hidden) assert.ok(/\.g-js|menu-btn/.test(sel), sel);
  assert.match(CSS, /min-height:\s*var\(--g-tap\)/);
  assert.match(CSS, /prefers-reduced-motion/);
});

for (const v of VARIANTS)
  test(`navbar ${v}: no horizontal overflow at 375px (long content, 2 palettes)`, async (t) => {
    for (const p of ["cafe", "law"]) {
      const r = await H.checkNoOverflow375({ html: render(v, "maxlen").html, css: CSS, paletteId: p });
      if (r.skipped) return t.skip(r.reason);
      assert.ok(r.ok, `${v}/${p}: scrollWidth ${r.scrollWidth} > ${r.innerWidth}`);
    }
  });
