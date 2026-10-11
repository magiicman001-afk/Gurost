// Run: node --test test/section-hero.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");
const F = require("./fixtures/sections.json");

const CSS = fs.readFileSync(path.join(__dirname, "..", "lib", "sections", "hero", "hero.css"), "utf8");
const VARIANTS = ["a", "b", "c"];
const PALETTES = Object.keys(R.palettes.palettes);
const NOW = new Date(Date.UTC(2031, 5, 1));
const SCRIMS = ["rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0.65)"];

const BASE = { headline: "Fresh bread, every morning", subhead: "Small-batch sourdough baked daily in the heart of town.", cta1_label: "Call us", cta1_href: "tel:+441234567890" };
const FIX = {
  full: { ...BASE, eyebrow: "Bakery, Leeds", cta2_label: "See the menu", cta2_href: "#menu", image: "IMG_1", image_brief: "Loaves on a wooden counter", image_alt: "Fresh loaves on a counter", trust_line: "12 High Street, Leeds", tone: "dark" },
  minimal: { ...BASE, image: "IMG_2" },
  noimage: { ...BASE, eyebrow: "Bakery, Leeds" },
  maxlen: { headline: "H".repeat(300), subhead: "word ".repeat(80), eyebrow: "E".repeat(90), cta1_label: "L".repeat(60), cta1_href: "#a", cta2_label: "M".repeat(60), cta2_href: "#b", trust_line: "T".repeat(120), image: "IMG_3", image_alt: "A".repeat(300), image_brief: "B".repeat(400) },
  xss: { headline: F.xssPayloads[0], subhead: F.xssPayloads[1], eyebrow: F.xssPayloads[2], cta1_label: F.xssPayloads[3], cta1_href: "javascript:alert(1)", cta2_label: F.xssPayloads[4], cta2_href: "data:text/html,<script>alert(1)</script>", image: "IMG_4", image_alt: F.xssPayloads[0], image_brief: F.xssPayloads[3], trust_line: F.xssPayloads[2] },
  unicode: { headline: F.unicode[1], subhead: F.unicode.join(" "), eyebrow: F.unicode[0], cta1_label: F.unicode[2], cta1_href: "#c", image: "IMG_5", image_alt: F.unicode[3] },
};
const render = (v, f, opts = {}) => R.renderSection("hero", v, FIX[f], { now: NOW, ...opts });

for (const v of VARIANTS)
  for (const f of Object.keys(FIX))
    test(`hero ${v} / ${f}: no leftovers, no empty hrefs, one h1`, () => {
      const { html, warnings } = render(v, f);
      assert.equal(H.leftoverSlots(html), false);
      assert.equal(H.emptyHrefs(html), false);
      assert.ok(!warnings.some((w) => /unknown slot/.test(w)), warnings.join("|"));
      assert.equal((html.match(/<h1\b/g) || []).length, 1);
      assert.equal((html.match(/<section\b/g) || []).length, 1);
      assert.match(html, /data-gurost-section="hero"/);
    });

test("hero: A and B are swapped for C when there is no image; C never needs one", () => {
  for (const v of ["a", "b"]) {
    const r = render(v, "noimage");
    assert.equal(r.variant, "c");
    assert.equal(r.swappedFrom, v);
    assert.ok(!r.html.includes("<img"));
  }
  assert.equal(render("c", "noimage").swappedFrom, null);
  assert.equal(render("a", "full").variant, "a");
  assert.equal(render("b", "full").variant, "b");
  // an unsafe image URL counts as "no image"
  const r = R.renderSection("hero", "b", { ...BASE, image: "https://evil.example.com/x.jpg" }, { now: NOW });
  assert.equal(r.variant, "c");
});

test("hero: optional slots are removed cleanly", () => {
  const { html } = render("a", "minimal");
  for (const cls of ["g-hero__eyebrow", "g-hero__trust", "g-hero__btn--ghost", "data-gurost-image=\""]) assert.ok(!html.includes(cls), cls);
  const half = R.renderSection("hero", "c", { ...BASE, cta2_label: "Menu" }, { now: NOW }).html;
  assert.ok(!half.includes("btn--ghost"), "second button needs both label and link");
});

for (const v of VARIANTS)
  test(`hero ${v}: overlong slots are cut to the manifest limits`, () => {
    const { html } = render(v, "maxlen");
    assert.ok(!html.includes("H".repeat(71)));
    assert.ok(!html.includes("E".repeat(41)));
    assert.ok(!html.includes("L".repeat(25)));
    assert.ok(!html.includes("M".repeat(25)));
    assert.ok(!html.includes("T".repeat(61)));
    assert.ok(!html.includes("A".repeat(101)));
    assert.ok(!html.includes("B".repeat(201)));
    const sub = html.match(/g-hero__sub[^>]*>([^<]*)</)[1];
    assert.ok([...sub].length <= 160, String([...sub].length));
    assert.ok(sub.endsWith("…"));
  });

for (const v of VARIANTS)
  test(`hero ${v}: XSS payloads never survive and bad hrefs become '#'`, () => {
    const { html } = render(v, "xss");
    assert.deepEqual(H.leakedPayloads(html, F.xssPayloads), []);
    assert.equal(H.hasActiveInjection(html), false);
    assert.ok(!/javascript:|data:text/i.test(html));
    assert.ok(html.includes('href="#"'));
  });

test("hero: image carries the Gurost hooks and a non-empty alt; alt falls back to the brief, then the headline", () => {
  for (const v of ["a", "b"]) {
    const html = render(v, "full").html;
    assert.match(html, /<img [^>]*data-gurost-image="Loaves on a wooden counter"[^>]*data-gurost-image-role="hero"/);
    assert.match(html, /alt="Fresh loaves on a counter"/);
    assert.match(render(v, "minimal").html, /alt="Fresh bread, every morning"/);
    assert.match(R.renderSection("hero", v, { ...BASE, image: "IMG_1", image_brief: "A baker at work" }, { now: NOW }).html, /alt="A baker at work"/);
    assert.ok(!/alt=""/.test(html));
  }
});

test("hero: motion hooks are attributes only (no GSAP code, no inline script or style)", () => {
  for (const v of VARIANTS) {
    const { html } = render(v, "full");
    assert.ok(/data-g-reveal=/.test(html) && /data-gsap-(fade|slide)/.test(html));
    assert.ok(!/<script/i.test(html) && !html.includes("style="));
  }
  assert.ok(/data-g-parallax/.test(render("a", "full").html) && /data-g-parallax/.test(render("b", "full").html));
});

test("hero: tone applies to C only; A is light and B is dark", () => {
  assert.match(render("c", "full").html, /data-tone="dark"/);
  assert.match(render("c", "minimal").html, /data-tone="light"/);
  assert.match(render("a", "full").html, /data-tone="light"/);
  assert.match(render("b", "minimal").html, /data-tone="dark"/);
});

test("hero: decorative shape and scrim are aria-hidden", () => {
  assert.match(render("c", "full").html, /g-hero__shape" aria-hidden="true"/);
  assert.match(render("b", "full").html, /g-hero__scrim" aria-hidden="true"/);
});

for (const p of PALETTES) {
  test(`hero x ${p}: manifest contrast pairs pass`, () => {
    assert.deepEqual(H.sectionContrastFailures("hero").filter((f) => f.palette === p), []);
  });
  test(`hero x ${p}: dark tone, buttons and the B scrim worst case`, () => {
    const c = R.getPalette(p).colors;
    const alphas = [...CSS.matchAll(/rgba\(0, 0, 0, ([\d.]+)\)/g)].map((m) => Number(m[1]));
    const lightest = Math.min(...alphas);
    assert.ok(lightest >= 0.6, "scrim must stay at 0.6 or darker (cream on-dark text needs it)");
    const worst = H.underScrim("#FFFFFF", lightest);
    assert.ok(H.contrast(c["on-dark"], worst) >= 4.5, `${p} on-dark over white photo: ${H.contrast(c["on-dark"], worst)}`);
    assert.ok(H.contrast(c["on-dark"], c.dark) >= 4.5);
    assert.ok(H.contrast(c.dark, c["on-dark"]) >= 4.5); // button on dark tone
    assert.ok(H.contrast(c.primary, c["on-primary"]) >= 4.5); // inverse / ghost text
    assert.ok(H.contrast(c.primary, c.bg) >= 4.5); // eyebrow and ghost button on light
  });
}

test("hero.css: only the two documented scrim colours are raw; variables exist; no !important", () => {
  assert.deepEqual(H.rawColours(CSS, SCRIMS), []);
  assert.deepEqual(H.unknownVars(CSS), []);
  assert.equal(H.hasImportant(CSS), false);
  assert.deepEqual(H.unscopedHiding(CSS), []);
});

test("hero.css: no fixed width wider than 375px on layout containers outside the decorative shape", () => {
  const body = CSS.replace(/\.g-hero__shape\s*\{[^}]*\}/g, "").replace(/@media[^{]*\{[\s\S]*?\n\}/g, "");
  for (const m of body.matchAll(/(?<![-\w])(?:min-)?width:\s*(\d+)px/g)) assert.ok(Number(m[1]) <= 375, m[0]);
});

for (const v of VARIANTS)
  test(`hero ${v}: no horizontal overflow at 375px with maximal content (2 palettes)`, async (t) => {
    for (const p of ["cafe", "tech"]) {
      const r = await H.checkNoOverflow375({ html: render(v, "maxlen").html, css: CSS, paletteId: p });
      if (r.skipped) return t.skip(r.reason);
      assert.ok(r.ok, `${v}/${p}: scrollWidth ${r.scrollWidth} > ${r.innerWidth}`);
    }
  });
