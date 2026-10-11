// Run: node --test test/section-footer.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");
const F = require("./fixtures/sections.json");

const CSS = fs.readFileSync(path.join(__dirname, "..", "lib", "sections", "footer", "footer.css"), "utf8");
const VARIANTS = ["a", "b", "c"];
const PALETTES = Object.keys(R.palettes.palettes);
const NOW = new Date(Date.UTC(2031, 5, 1));
const G = (title, ...labels) => ({ title, links: labels.map((l, i) => ({ label: l, href: "#" + l.toLowerCase().replace(/\W/g, "") + i })) });
const OPEN = / \(opens in a new tab\)/;

const FIX = {
  full: {
    brand: "Luvky Bakes", tagline: "Small-batch bread, baked daily.", link_groups: [G("Explore", "Menu", "About", "Visit"), G("Help", "FAQ", "Contact")],
    address: "12 High Street, Leeds LS1 1AA", phone: "0113 496 0000", email: "hello@luvky.example", hours: "Mon to Sat 7am to 4pm",
    socials: [{ platform: "instagram", url: "https://instagram.com/luvky" }, { platform: "facebook", url: "https://facebook.com/luvky" }],
    legal_extra: "All rights reserved", cta_title: "Order for tomorrow", cta_label: "Order now", cta_href: "#order", show_gurost_credit: true, tone: "dark",
  },
  minimal: { brand: "Luvky", link_groups: [G("Links", "Menu")] },
  maxlen: {
    brand: "B".repeat(80), tagline: "word ".repeat(40), address: "A".repeat(300), phone: "9".repeat(50), email: "e".repeat(80) + "@x.co", hours: "H".repeat(200), legal_extra: "L".repeat(300),
    link_groups: Array.from({ length: 6 }, (_, i) => G("T".repeat(60) + i, ...Array.from({ length: 8 }, (_, j) => "Link label that is long " + j))),
    socials: Array.from({ length: 9 }, () => ({ platform: "instagram", url: "https://instagram.com/a" })),
    cta_title: "C".repeat(120), cta_label: "Z".repeat(60), cta_href: "#c",
  },
  xss: {
    brand: F.xssPayloads[0], tagline: F.xssPayloads[1], address: F.xssPayloads[2], phone: F.xssPayloads[3], email: F.xssPayloads[4], hours: F.xssPayloads[0], legal_extra: F.xssPayloads[1],
    link_groups: [{ title: F.xssPayloads[2], links: F.xssPayloads.map((p) => ({ label: p, href: "javascript:alert(1)" })) }],
    socials: [{ platform: "instagram", url: "javascript:alert(1)" }, { platform: "facebook", url: "http://insecure.example.com" }, { platform: "myspace", url: "https://myspace.example.com" }, { platform: "x", url: "https://x.com/a" }],
    cta_title: F.xssPayloads[3], cta_label: F.xssPayloads[4], cta_href: "data:text/html,<script>alert(1)</script>",
  },
  unicode: { brand: F.unicode[0], tagline: F.unicode[1], address: F.unicode[2], hours: F.unicode[3], link_groups: [G(F.unicode[0], ...F.unicode)], cta_title: F.unicode[2], cta_label: F.unicode[1], cta_href: "#c" },
};
const render = (v, f, opts = {}) => R.renderSection("footer", v, FIX[f], { now: NOW, ...opts });

for (const v of VARIANTS)
  for (const f of Object.keys(FIX))
    test(`footer ${v} / ${f}: no leftovers, no empty hrefs, correct landmarks`, () => {
      const { html, warnings } = render(v, f);
      assert.equal(H.leftoverSlots(html), false);
      assert.equal(H.emptyHrefs(html), false);
      assert.ok(!warnings.some((w) => /unknown slot/.test(w)), warnings.join("|"));
      assert.equal((html.match(/<footer\b/g) || []).length, 1);
      assert.equal((html.match(/<nav\b[^>]*aria-label="Footer"/g) || []).length, 1);
      assert.match(html, new RegExp(`data-gurost-section="footer" data-variant="${v}"`));
      assert.ok(!/<script|style=/i.test(html));
    });

test("footer: empty optional blocks vanish; hours show the marked placeholder; contact is never invented", () => {
  for (const v of VARIANTS) {
    const { html } = render(v, "minimal");
    for (const cls of ["g-footer__tagline", "g-footer__address", "g-footer__phone", "g-footer__email", "g-footer__socials", "g-footer__credit", "g-footer__cta-band", "tel:", "mailto:"]) assert.ok(!html.includes(cls), `${v}: ${cls}`);
  }
  for (const v of ["a", "c"]) assert.ok(render(v, "minimal").html.includes("[Add your opening hours]"));
});

test("footer: legal line uses the render-time year and the brand; the credit shows only when asked", () => {
  for (const v of VARIANTS) {
    const html = render(v, "full").html;
    assert.match(html, /© 2031 Luvky Bakes · All rights reserved/);
    assert.ok(html.includes("Built with Gurost"));
    const off = R.renderSection("footer", v, { ...FIX.full, show_gurost_credit: false }, { now: NOW }).html;
    assert.ok(!off.includes("Built with Gurost"));
    assert.match(R.renderSection("footer", v, FIX.minimal, { now: new Date(Date.UTC(2040, 0, 1)) }).html, /© 2040 Luvky/);
  }
});

test("footer: phone and email are real tel: and mailto: links; a bad email is dropped", () => {
  const html = render("a", "full").html;
  assert.match(html, /href="tel:01134960000"[^>]*>0113 496 0000</);
  assert.match(html, /href="mailto:hello@luvky.example"[^>]*>hello@luvky.example</);
  const bad = R.renderSection("footer", "a", { ...FIX.minimal, email: "not an email" }, { now: NOW }).html;
  assert.ok(!bad.includes("mailto:") && !bad.includes("not an email"));
});

for (const v of VARIANTS)
  test(`footer ${v}: overlong slots are cut (tagline 90, address 120, links 5 per group, 3 groups, 5 socials)`, () => {
    const { html } = render(v, "maxlen");
    assert.ok(!html.includes("B".repeat(33)));
    assert.ok(!html.includes("A".repeat(121)));
    assert.ok(!html.includes("H".repeat(81)));
    assert.ok(!html.includes("L".repeat(101)));
    assert.ok(!html.includes("T".repeat(21)));
    assert.ok(!html.includes("e".repeat(61)));
    assert.equal((html.match(/g-footer__group-title/g) || []).length, v === "b" ? 0 : 3);
    assert.equal((html.match(/Link label/g) || []).length, 15);
    assert.equal((html.match(/class="g-footer__social"/g) || []).length, 5);
    const tag = html.match(/g-footer__tagline">([^<]*)</)[1];
    assert.ok([...tag].length <= 90);
  });

for (const v of VARIANTS)
  test(`footer ${v}: XSS never survives; bad hrefs become '#'; non-https and unknown socials are dropped`, () => {
    const { html } = render(v, "xss");
    assert.deepEqual(H.leakedPayloads(html, F.xssPayloads), []);
    assert.equal(H.hasActiveInjection(html), false);
    assert.ok(!/javascript:|data:text|insecure\.example|myspace/i.test(html));
    assert.equal((html.match(/class="g-footer__social"/g) || []).length, 1, "only the https X link remains");
  });

test("footer: social links have aria-label, rel, target and an aria-hidden icon", () => {
  for (const v of VARIANTS) {
    const html = render(v, "full").html;
    const links = html.match(/<a class="g-footer__social"[^>]*>/g);
    assert.equal(links.length, 2);
    for (const a of links) {
      assert.match(a, /aria-label="(Instagram|Facebook) \(opens in a new tab\)"/);
      assert.match(a, /rel="noopener noreferrer"/);
      assert.match(a, /target="_blank"/);
    }
    assert.equal((html.match(/<svg[^>]*aria-hidden="true"/g) || []).length, 2);
  }
  assert.ok(OPEN.test(render("a", "full").html));
});

test("footer: A and C keep the mobile order brand, contact, hours, links, socials", () => {
  for (const v of ["a", "c"]) {
    const html = render(v, "full").html;
    const at = (c) => html.indexOf("g-footer__col--" + c);
    assert.ok(at("brand") < at("contact") && at("contact") < at("hours") && at("hours") < at("links") && at("links") < at("socials"), v);
  }
});

test("footer: C shows the call-to-action band only with a title; the button needs label and link", () => {
  const full = render("c", "full").html;
  assert.ok(full.includes("g-footer__cta-band") && full.includes("g-footer__cta-btn"));
  const noTitle = R.renderSection("footer", "c", { ...FIX.full, cta_title: "" }, { now: NOW }).html;
  assert.ok(!noTitle.includes("cta-band"));
  const noLink = R.renderSection("footer", "c", { ...FIX.full, cta_href: "" }, { now: NOW }).html;
  assert.ok(noLink.includes("cta-band") && !noLink.includes("cta-btn"));
  assert.ok(!render("a", "full").html.includes("cta-band"));
});

test("footer: tone defaults to light and follows the slot", () => {
  assert.match(render("a", "minimal").html, /data-tone="light"/);
  assert.match(render("b", "full").html, /data-tone="dark"/);
});

for (const p of PALETTES) {
  test(`footer x ${p}: manifest pairs, light and dark tone, C band, links and focus rings`, () => {
    assert.deepEqual(H.sectionContrastFailures("footer").filter((f) => f.palette === p), []);
    const c = R.getPalette(p).colors;
    const min = (fg, bg, n, label) => assert.ok(H.contrast(c[fg], c[bg]) >= n, `${p} ${label}: ${H.contrast(c[fg], c[bg]).toFixed(2)}`);
    min("text", "surface", 4.5, "text/surface");
    min("muted", "surface", 4.5, "muted/surface");
    min("on-dark", "dark", 4.5, "on-dark/dark");
    min("on-dark-muted", "dark", 4.5, "on-dark-muted/dark");
    min("on-primary", "primary", 4.5, "band text");
    min("primary", "on-primary", 4.5, "inverse button");
    min("focus", "surface", 3, "focus/surface");
    min("on-dark", "dark", 3, "focus/dark");
    min("dark", "on-dark", 4.5, "social hover (dark)");
    min("text", "bg", 4.5, "social hover (light)");
  });
}

test("footer.css: no raw colours; variables exist; no !important; color-mix has a plain line before it", () => {
  assert.deepEqual(H.rawColours(CSS), []);
  assert.deepEqual(H.unknownVars(CSS), []);
  assert.equal(H.hasImportant(CSS), false);
  assert.deepEqual(H.unscopedHiding(CSS), []);
  const lines = CSS.split("\n");
  lines.forEach((l, i) => {
    if (l.includes("color-mix")) assert.ok(/^\s*border-top:/.test(lines[i - 1]) && !lines[i - 1].includes("color-mix"), "needs a plain fallback on the line before: " + l);
  });
  assert.match(CSS, /min-height:\s*var\(--g-tap\)/);
});

for (const v of VARIANTS)
  test(`footer ${v}: no horizontal overflow at 375px with maximal content (2 palettes)`, async (t) => {
    for (const p of ["cafe", "tech"]) {
      const r = await H.checkNoOverflow375({ html: render(v, "maxlen").html, css: CSS, paletteId: p });
      if (r.skipped) return t.skip(r.reason);
      assert.ok(r.ok, `${v}/${p}: scrollWidth ${r.scrollWidth} > ${r.innerWidth}`);
    }
  });
