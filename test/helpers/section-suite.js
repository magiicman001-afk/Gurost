"use strict";
// Standard test suite for any content section, driven by the section's own manifest schema.
// Usage in test/section-<id>.test.js:   require("./helpers/section-suite").suite({ id: "features", item: /g-features__item/g });
// It generates the fixtures (full, minimal, maxlen, xss, unicode) from the slot schema, so a new section gets the same
// checks as Navbar, Hero and Footer without hand-written tests, and a schema change cannot silently skip a check.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const R = require("../../lib/sections/render");
const A = require("../../lib/sections/assemble");
const G = require("../../lib/sections/quality-gate");
const H = require("./section-test");
const F = require("../fixtures/sections.json");
const { SAMPLES } = require("../../scripts/build-sections-preview");

const NOW = new Date(Date.UTC(2031, 5, 1));
const PALETTES = Object.keys(R.palettes.palettes);

// ---- fixtures from the schema ----
const CHARS = "BCDEFGHJKLMNPQRSTVXYZ";
const charMap = new Map();
/** One distinct letter per slot path, so the "too long" check can look for a run of that slot's own letter. */
function charFor(path) {
  if (!charMap.has(path)) charMap.set(path, CHARS[charMap.size % CHARS.length]);
  return charMap.get(path);
}
function value(name, def, kind, i = 0) {
  switch (def.type) {
    case "text": {
      if (def.mail) return kind === "maxlen" ? "x".repeat(80) + "@example.com" : "hello@example.com";
      if (def.tel) return "01234 567890";
      if (kind === "xss") return F.xssPayloads[i % F.xssPayloads.length];
      if (kind === "unicode") return F.unicode[i % F.unicode.length];
      if (kind === "maxlen") return charFor(name).repeat((def.max || 40) + 40);
      const base = `${(def.label || name.split(".").pop()).replace(/[^a-z ]/gi, "")} sample`;
      return R.truncate(base.charAt(0).toUpperCase() + base.slice(1), def.max || 40);
    }
    case "link":
      return kind === "xss" ? "javascript:alert(1)" : "#sample";
    case "image":
      return "IMG_1";
    case "flag":
      return true;
    case "enum":
      return (def.values || [])[i % (def.values || [""]).length];
    case "list":
      return listValue(name, def, kind);
    default:
      return undefined;
  }
}
function listValue(name, def, kind) {
  const n = kind === "maxlen" ? (def.max || 4) + 3 : kind === "minimal" ? Math.max(def.min || 0, def.required ? 3 : 0) : Math.min(def.max || 3, Math.max(def.min || 0, 3));
  const items = [];
  for (let i = 0; i < n; i++) {
    const it = {};
    let j = 0;
    for (const [k, d] of Object.entries(def.item || {})) {
      if (kind === "minimal" && !d.required) continue;
      it[k] = value(`${name}.${k}`, d, kind, i + j++);
    }
    items.push(it);
  }
  return items;
}
function fixture(id, kind) {
  const defs = R.getSection(id).slots;
  const out = {};
  let i = 0;
  for (const [name, d] of Object.entries(defs)) {
    if (kind === "minimal" && !d.required) continue;
    out[name] = value(name, d, kind, i++);
  }
  return out;
}

function textSlots(defs, prefix = "") {
  const out = [];
  for (const [k, d] of Object.entries(defs)) {
    if (d.type === "text" && d.max && !d.mail && !d.tel) out.push({ name: prefix + k, max: d.max });
    if (d.type === "list") out.push(...textSlots(d.item || {}, prefix + k + "."));
  }
  return out;
}

const OURS = /<script>[\s\S]*?<\/script>/g;

/**
 * @param {{id:string, item?:RegExp, minimalSwaps?:string, extra?:Function}} o
 *   item: regex (global) counting one rendered list item, to check list caps.
 */
function suite(o) {
  const { id } = o;
  const sec = R.getSection(id);
  const css = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "sections", id, `${id}.css`), "utf8");
  const render = (v, kind, opts = {}) => R.renderSection(id, v, fixture(id, kind), { now: NOW, ...opts });
  const kinds = ["full", "minimal", "maxlen", "xss", "unicode"];

  let browser = null;
  test.before(async () => {
    try {
      browser = await require("playwright").chromium.launch();
    } catch {
      browser = null;
    }
  });
  test.after(async () => {
    if (browser) await browser.close();
  });

  test(`${id}: manifest entry is complete and built`, () => {
    assert.equal(sec.status, "built");
    assert.deepEqual(sec.variants, ["a", "b", "c"]);
    assert.ok(sec.slots && Object.values(sec.slots).some((d) => d.required));
    assert.ok(sec.palettePairs.length >= 5);
    for (const v of sec.variants) assert.ok(fs.existsSync(path.join(__dirname, "..", "..", "lib", "sections", id, `${v}.html`)), `${v}.html`);
  });

  for (const v of sec.variants)
    for (const kind of kinds)
      test(`${id} ${v} / ${kind}: renders clean`, () => {
        const r = render(v, kind);
        const { html, warnings } = r;
        assert.equal(H.leftoverSlots(html), false);
        assert.equal(H.emptyHrefs(html), false);
        assert.ok(!warnings.some((w) => /unknown slot/.test(w)), warnings.join("|"));
        assert.ok(!/undefined|\[object|\bnull\b/.test(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, "")), "stray value in output");
        assert.match(html, new RegExp(`data-gurost-section="${id}" data-variant="${r.variant}"`));
        assert.equal((html.match(new RegExp(`<${sec.element}\\b`, "g")) || []).length, 1);
        assert.equal((html.match(/<h1\b/g) || []).length, 0, "only the hero owns the h1");
        assert.ok(/data-g-reveal=/.test(html));
        const blanked = html.replace(/="[^"]*"/g, '=""');
        assert.ok(!/<script/i.test(html) && !/<[a-z][^<>]*\s(style|on[a-z]+)=/i.test(blanked), "no scripts, inline styles or handlers");
      });

  for (const v of sec.variants)
    test(`${id} ${v}: XSS payloads never survive; bad hrefs become '#'`, () => {
      const { html } = render(v, "xss");
      const rest = html.replace(OURS, "");
      assert.deepEqual(H.leakedPayloads(rest, F.xssPayloads), []);
      assert.equal(H.hasActiveInjection(rest), false);
      assert.ok(!/javascript:/i.test(rest));
    });

  for (const v of sec.variants)
    test(`${id} ${v}: overlong text is cut to the manifest limits and list caps hold`, () => {
      const { html } = render(v, "maxlen");
      for (const s of textSlots(sec.slots)) assert.ok(!html.includes(charFor(s.name).repeat(s.max + 1)), `${s.name} exceeds ${s.max}`);
      if (o.item) {
        const list = Object.values(sec.slots).find((d) => d.type === "list" && d.max);
        if (list) assert.ok((html.match(o.item) || []).length <= list.max, "list cap");
      }
    });

  test(`${id}: missing required content warns and shows an honest placeholder, never invented text`, () => {
    const r = R.renderSection(id, "a", {}, { now: NOW });
    assert.ok(r.warnings.length > 0);
    assert.equal(H.leftoverSlots(r.html), false);
    assert.ok(!/lorem|£\s?\d|stars?\b/i.test(r.html));
  });

  test(`${id}: optional blocks vanish when empty (no empty elements, no stray text)`, () => {
    for (const v of sec.variants) {
      const { html } = render(v, "minimal");
      assert.ok(!/<(p|h2|h3|a|figure|ul)\b[^>]*>\s*<\/\1>/.test(html), `${v}: empty element`);
      assert.equal(H.emptyHrefs(html), false);
    }
  });

  for (const p of PALETTES)
    test(`${id} x ${p}: manifest contrast pairs pass`, () => {
      assert.deepEqual(H.sectionContrastFailures(id).filter((f) => f.palette === p), []);
    });

  test(`${id}.css: palette variables only, known variables, no !important, nothing hidden without .g-js`, () => {
    assert.deepEqual(H.rawColours(css), []);
    assert.deepEqual(H.unknownVars(css), []);
    assert.equal(H.hasImportant(css), false);
    assert.deepEqual(H.unscopedHiding(css), []);
    assert.match(css, /@media \(min-width/, "has a desktop layout");
  });

  for (const v of sec.variants)
    test(`${id} ${v}: no horizontal overflow at 375px with maximal content (browser)`, async (t) => {
      if (!browser) return t.skip("no chromium");
      const base = fs.readFileSync(path.join(__dirname, "..", "..", "lib", "sections", "base.css"), "utf8");
      for (const p of ["cafe", "law", "tech"]) {
        const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
        const html = render(v, "maxlen").html;
        await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${R.paletteCss(p)}${base}${css}</style></head><body class="g-page" data-industry="${p}">${html}</body></html>`);
        const m = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, w: window.innerWidth }));
        await page.close();
        assert.ok(m.s <= m.w, `${v}/${p}: scrollWidth ${m.s} > ${m.w}`);
      }
    });

  // the section on a real assembled page: the gate (static + browser) must pass for every variant
  const recipe = Object.keys(A.recipes).find((r) => A.recipes[r].order.includes(id)) || "landing";
  for (const v of sec.variants)
    test(`${id} ${v}: sits in an assembled page and passes the quality gate`, async () => {
      const pal = { a: "cafe", b: "salon", c: "tech" }[v];
      const s = SAMPLES[pal];
      const L = (label, href) => ({ label, href });
      const content = {
        navbar: { brand: s.brand, links: s.links.map((l) => L(l, "#" + l.toLowerCase().replace(/\W+/g, "-"))), cta_label: s.cta, cta_href: "#contact" },
        hero: { headline: s.headline, subhead: s.subhead, cta1_label: s.cta, cta1_href: "#contact", image: "https://cdn.pixabay.com/photo/a.jpg", image_brief: "x", image_alt: "x" },
        footer: { brand: s.brand, link_groups: s.groups },
        [id]: fixture(id, "full"),
      };
      const page = A.assemble({ palette: pal, recipe, content, variants: { [id]: v }, now: NOW });
      assert.ok(page.sections.some((x) => x.id === id), "section is on the page");
      assert.equal((page.html.match(/<h1\b/g) || []).length, 1);
      const g = await G.gate(page, { now: NOW, browser: browser || undefined, impeccable: false, allowImageTokens: true });
      assert.deepEqual(g.failures, []);
    });

  if (sec.variantRules)
    test(`${id}: variants that need an image fall back when there is none`, () => {
      for (const [v, rule] of Object.entries(sec.variantRules)) {
        const slots = fixture(id, "full");
        for (const n of rule.needs) delete slots[n];
        const r = R.renderSection(id, v, slots, { now: NOW });
        assert.equal(r.variant, rule.fallback);
        assert.equal(r.swappedFrom, v);
        assert.ok(!r.html.includes("<img"));
      }
    });

  if (typeof o.extra === "function") o.extra({ render, fixture: (k) => fixture(id, k), sec, css });
}

module.exports = { suite, fixture, textSlots };
