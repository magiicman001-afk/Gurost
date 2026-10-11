// Run: node --test test/assemble.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../lib/sections/assemble");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");
const F = require("./fixtures/sections.json");
const { SAMPLES } = require("../scripts/build-sections-preview");

const NOW = new Date(Date.UTC(2031, 5, 1));
const PALETTES = Object.keys(R.palettes.palettes);
const L = (label, href) => ({ label, href });

function contentFor(p, over = {}) {
  const s = SAMPLES[p];
  return {
    navbar: { brand: s.brand, links: s.links.map((l) => L(l, "#" + l.toLowerCase().replace(/\W+/g, "-"))), cta_label: s.cta, cta_href: "#contact", phone: s.phone },
    hero: { eyebrow: s.eyebrow, headline: s.headline, subhead: s.subhead, cta1_label: s.cta, cta1_href: "#contact", image: "IMG_1", image_brief: s.brief || "Photo", image_alt: s.brief || "Photo", trust_line: s.trust },
    footer: { brand: s.brand, tagline: s.tagline, link_groups: s.groups, address: s.address, phone: s.phone, email: s.email, hours: s.hours, socials: [{ platform: "instagram", url: "https://instagram.com/x" }] },
    ...over,
  };
}
const build = (p, extra = {}) => A.assemble({ palette: p, content: contentFor(p), now: NOW, ...extra });

test("the flag is off unless SECTION_LIBRARY is exactly 1", () => {
  assert.equal(A.enabled({}), false);
  assert.equal(A.enabled({ SECTION_LIBRARY: "0" }), false);
  assert.equal(A.enabled({ SECTION_LIBRARY: "true" }), false);
  assert.equal(A.enabled({ SECTION_LIBRARY: "1" }), true);
});

for (const p of PALETTES)
  test(`assemble ${p}: one valid page with landmarks in order, one h1, palette variables, no leftovers`, () => {
    const r = build(p);
    const { html } = r;
    assert.match(html, /^<!doctype html>\n<html lang="en">/);
    assert.equal(H.leftoverSlots(html), false);
    assert.equal(H.emptyHrefs(html), false);
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    const i = (s) => html.indexOf(s);
    assert.ok(i("<header") < i('<main id="main">') && i('<main id="main">') < i("<section") && i("</main>") < i("<footer"), "navbar, then main with hero, then footer");
    assert.ok(html.includes(R.paletteCss(p)));
    assert.ok(html.includes(R.googleFontsHref(p).replace(/&/g, "&amp;")));
    assert.ok(html.includes(`data-industry="${p}"`));
    assert.deepEqual(r.sections.map((s) => s.id), ["navbar", "hero", "footer"]);
    assert.equal(r.recipe, A.pickRecipe(p));
    // only CSS for sections that are on the page
    assert.ok(html.includes(".g-navbar") && html.includes(".g-hero") && html.includes(".g-footer"));
  });

test("assemble: palette defaults decide the variants; explicit variants win", () => {
  const cafe = build("cafe").sections.map((s) => s.variant).join("");
  assert.equal(cafe, "aaa");
  assert.equal(build("salon").sections.map((s) => s.variant).join(""), "bba");
  assert.equal(build("cafe", { variants: { hero: "c", footer: "b", navbar: "b" } }).sections.map((s) => s.variant).join(""), "bcb");
  assert.equal(build("cafe", { variants: { hero: "z" } }).sections[1].variant, "a", "unknown variant ignored");
});

test("assemble: tones follow the palette (Law and Tech dark footer, the rest light); the Gurost credit follows the plan", () => {
  for (const p of PALETTES) {
    const tone = R.getPalette(p).footerTone;
    assert.match(build(p).html, new RegExp(`<footer[^>]*data-tone="${tone}"`));
  }
  assert.ok(!build("cafe").html.includes("Built with Gurost"), "off by default");
  assert.ok(build("cafe", { includeBranding: true }).html.includes("Built with Gurost"));
  assert.ok(!build("cafe", { includeBranding: "yes" }).html.includes("Built with Gurost"), "only a real true counts");
});

test("assemble: transparent navbar C is swapped to A unless a photo or dark hero sits behind it", () => {
  const ok = build("cafe", { variants: { navbar: "c", hero: "b" } });
  assert.equal(ok.sections[0].variant, "c");
  assert.deepEqual(ok.swaps, []);
  const dark = A.assemble({ palette: "tech", content: contentFor("tech", { hero: { ...contentFor("tech").hero, image: "", tone: "dark" } }), now: NOW });
  assert.equal(dark.sections[0].variant, "c", "tech default: navbar C over a dark type-led hero");
  const light = build("cafe", { variants: { navbar: "c", hero: "c" } });
  assert.equal(light.sections[0].variant, "a");
  assert.equal(light.swaps[0].id, "navbar");
  const noImage = A.assemble({ palette: "cafe", content: contentFor("cafe", { hero: { ...contentFor("cafe").hero, image: "" } }), variants: { navbar: "c" }, now: NOW });
  assert.deepEqual(noImage.swaps.map((s) => s.id + s.from + s.to), ["heroac", "navbarca"], "hero A had no image -> C (light); navbar C -> A");
});

test("assemble: a hero with no image becomes type-led and the page still ships", () => {
  const r = A.assemble({ palette: "salon", content: contentFor("salon", { hero: { ...contentFor("salon").hero, image: "" } }), now: NOW });
  assert.equal(r.sections[1].variant, "c");
  assert.equal(r.swaps[0].from, "b");
  assert.ok(!r.html.includes("<img"));
  assert.deepEqual(r.images, []);
});

test("assemble: missing content shows honest placeholders and warns; optional sections are never invented", () => {
  const r = A.assemble({ palette: "law", content: {}, now: NOW });
  assert.ok(r.warnings.some((w) => /no content for required section: hero/.test(w)));
  assert.ok(r.html.includes("[Add "));
  assert.equal(H.leftoverSlots(r.html), false);
  assert.deepEqual(r.sections.map((s) => s.id), ["navbar", "hero", "footer"]);
  assert.ok(!/lorem|£\s?\d|\d+ stars/i.test(r.html));
});

test("assemble: sections that are not built yet are skipped with one warning (recipes name the full library)", () => {
  const planned = R.manifest.sections.filter((x) => x.status !== "built").map((x) => x.id);
  const r = build("cafe", { content: { ...contentFor("cafe"), [planned[0]]: { title: "x" } } });
  assert.ok(r.skipped.includes("gallery") || !A.recipes["local-business"].order.includes("gallery"));
  assert.ok(r.skipped.every((id) => planned.includes(id)), "only unbuilt sections are skipped");
  assert.equal(r.warnings.filter((w) => /not built yet/.test(w)).length, 1);
});

test("assemble: image slots are reported for the existing image step", () => {
  const r = build("cafe");
  assert.deepEqual(r.images, [{ token: "IMG_1", brief: SAMPLES.cafe.brief, role: "hero" }]);
});

test("assemble: pickRecipe and paletteForIndustry", () => {
  assert.equal(A.pickRecipe("law"), "professional");
  assert.equal(A.pickRecipe("tech"), "landing");
  assert.equal(A.pickRecipe("cafe"), "local-business");
  assert.equal(A.pickRecipe("cafe", "portfolio"), "portfolio");
  assert.equal(A.paletteForIndustry("Family bakery and coffee shop in Leeds"), "cafe");
  assert.equal(A.paletteForIndustry("Employment solicitors"), "law");
  assert.equal(A.paletteForIndustry("hair salon and beauty"), "salon");
  assert.equal(A.paletteForIndustry("Emergency plumber"), "trades");
  assert.equal(A.paletteForIndustry("physio clinic"), "health");
  assert.equal(A.paletteForIndustry("something unusual"), "tech");
  assert.throws(() => A.assemble({ palette: "nope", content: {} }));
  assert.throws(() => A.assemble({ palette: "cafe", recipe: "nope", content: {} }));
});

test("assemble: every recipe names only known sections, built or planned, and requires navbar, hero, footer", () => {
  const ids = new Set(R.manifest.sections.map((s) => s.id));
  for (const [id, r] of Object.entries(A.recipes)) {
    for (const s of r.order) assert.ok(ids.has(s), `${id}: ${s}`);
    assert.deepEqual(r.required, ["navbar", "hero", "footer"]);
    assert.equal(r.order[0], "navbar");
    assert.equal(r.order[r.order.length - 1], "footer");
    assert.equal(new Set(r.order).size, r.order.length);
  }
});

test("assemble: XSS in content, title, description and lang never reaches the page as markup", () => {
  const x = F.xssPayloads;
  const c = contentFor("cafe");
  const r = A.assemble({
    palette: "cafe", now: NOW,
    meta: { title: x[0], description: x[1], lang: '"><script>alert(1)</script>' },
    content: { navbar: { ...c.navbar, brand: x[0], links: x.map((p) => L(p, "javascript:alert(1)")) }, hero: { ...c.hero, headline: x[1], subhead: x[2] }, footer: { ...c.footer, tagline: x[3] } },
  });
  const rest = r.html.replace(/<script>[\s\S]*?<\/script>/, "");
  assert.deepEqual(H.leakedPayloads(rest, x), []);
  assert.equal(H.hasActiveInjection(rest), false);
  assert.match(r.html, /<html lang="en">/);
  assert.ok(!/javascript:/i.test(rest));
  assert.equal((r.html.match(/<title>/g) || []).length, 1);
});

test("assemble: title and description come from the content when meta is absent, and are trimmed", () => {
  const r = build("cafe");
  assert.match(r.html, /<title>Luvky Bakes: Fresh bread, baked every morning<\/title>/);
  assert.match(r.html, /<meta name="description" content="Small-batch sourdough/);
  const long = A.assemble({ palette: "cafe", now: NOW, meta: { title: "T".repeat(300) }, content: contentFor("cafe") });
  assert.ok(long.html.match(/<title>([^<]*)</)[1].length <= 70);
});

test("assemble: one inline script at most per navbar; no external scripts; no inline handlers", () => {
  for (const p of PALETTES) {
    const { html } = build(p);
    assert.equal((html.match(/<script\b/g) || []).length, 1);
    assert.ok(!/<script[^>]*\ssrc=/.test(html));
    assert.ok(!/\son[a-z]+\s*=\s*"/i.test(html.replace(/="[^"]*"/g, '=""')));
  }
});

test("assemble: it is deterministic", () => {
  assert.equal(build("trades").html, build("trades").html);
});

test("assemble: all 6 palettes x defaults fit a 375px phone with long content (browser)", async (t) => {
  let browser;
  try {
    browser = await require("playwright").chromium.launch();
  } catch (e) {
    return t.skip("no chromium");
  }
  try {
    for (const p of PALETTES) {
      const c = contentFor(p);
      c.navbar.brand = "B".repeat(60);
      c.hero.headline = "H".repeat(100);
      c.footer.address = "A".repeat(200);
      const r = A.assemble({ palette: p, content: c, includeBranding: true, now: NOW });
      const m = await H.checkPageNoOverflow({ html: r.html, browser });
      assert.ok(m.ok, `${p}: ${m.scrollWidth} > ${m.innerWidth}`);
      assert.equal(m.h1, 1);
    }
  } finally {
    await browser.close();
  }
});
