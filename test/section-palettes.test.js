// Run: node --test test/section-palettes.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");

const IDS = ["cafe", "law", "salon", "trades", "health", "tech"];
const TOKENS = ["primary", "on-primary", "bg", "text", "muted", "accent", "on-accent", "surface", "border", "dark", "on-dark", "on-dark-muted", "focus"];
const FONTS = ["Playfair Display SC", "Karla", "Libre Baskerville", "Source Sans 3", "Cormorant Garamond", "Jost", "Barlow Condensed", "Barlow", "Nunito", "Open Sans", "Space Grotesk", "Inter"];

test("six locked palettes, every token present as a 6-digit uppercase hex", () => {
  assert.deepEqual(Object.keys(R.palettes.palettes), IDS);
  for (const id of IDS) for (const t of TOKENS) assert.match(R.getPalette(id).colors[t], /^#[0-9A-F]{6}$/, `${id}.${t}`);
});

test("every text/background pair of every palette meets 4.5:1 (UI 3:1)", () => {
  for (const id of IDS) {
    const fails = H.checkPairs(id, R.getPalette(id).pairs).filter((r) => !r.ok);
    assert.deepEqual(fails, [], `${id} failing pairs`);
  }
});

test("deterministic test pairs: ratio meets its minimum and equals the spec value", () => {
  for (const id of IDS) {
    const p = R.getPalette(id);
    assert.equal(p.testPairs.length, 9, id);
    for (const t of p.testPairs) {
      const ratio = H.contrast(p.colors[t.fg], p.colors[t.bg]);
      assert.ok(ratio >= t.min, `${id} ${t.fg}/${t.bg} ${ratio.toFixed(2)} < ${t.min}`);
      assert.ok(Math.abs(ratio - t.expected) < 0.011, `${id} ${t.fg}/${t.bg} expected ${t.expected} got ${ratio.toFixed(2)}`);
    }
  }
});

test("the Cafe palette is the one verified live (#92400E on #FEF3C7)", () => {
  const c = R.getPalette("cafe").colors;
  assert.equal(c.primary, "#92400E");
  assert.equal(c.surface, "#FEF3C7");
});

test("fonts are the locked pairs and the Google Fonts URL is well formed", () => {
  const pairs = { cafe: ["Playfair Display SC", "Karla"], law: ["Libre Baskerville", "Source Sans 3"], salon: ["Cormorant Garamond", "Jost"], trades: ["Barlow Condensed", "Barlow"], health: ["Nunito", "Open Sans"], tech: ["Space Grotesk", "Inter"] };
  for (const id of IDS) {
    const f = R.getPalette(id).fonts;
    assert.deepEqual([f.heading, f.body], pairs[id]);
    assert.ok(FONTS.includes(f.heading) && FONTS.includes(f.body));
    const href = R.googleFontsHref(id);
    assert.match(href, /^https:\/\/fonts\.googleapis\.com\/css2\?family=[\w+]+:wght@[\d;]+&family=[\w+]+:wght@[\d;]+&display=swap$/);
    assert.ok(href.length < 50 + 0 || href.length < 200, "URL is built in code and stays short");
  }
});

test("footer tone follows the palette: Law and Tech dark, the rest light", () => {
  const tone = Object.fromEntries(IDS.map((id) => [id, R.getPalette(id).footerTone]));
  assert.deepEqual(tone, { cafe: "light", law: "dark", salon: "light", trades: "light", health: "light", tech: "dark" });
});

test("default variants match the slice-1 plan table", () => {
  const d = Object.fromEntries(IDS.map((id) => [id, Object.values(R.getPalette(id).defaults).join("")]));
  assert.deepEqual(d, { cafe: "aaa", law: "aca", salon: "bba", trades: "aba", health: "aac", tech: "ccb" });
});

test("paletteCss defines every token and both font stacks", () => {
  for (const id of IDS) {
    const css = R.paletteCss(id);
    for (const t of TOKENS) assert.ok(css.includes(`--g-${t}:`), `${id} missing --g-${t}`);
    assert.ok(css.includes("--g-font-head:") && css.includes("--g-font-body:"));
  }
});

test("base.css: no raw colours, no !important, only known variables, type scale and 8px grid present", () => {
  const css = R.baseCss();
  assert.deepEqual(H.rawColours(css), []);
  assert.equal(H.hasImportant(css), false);
  assert.deepEqual(H.unknownVars(css), []);
  for (const n of [12, 14, 16, 20, 24, 32, 48, 64]) assert.ok(css.includes(`--g-t-${n}:`), `type ${n}`);
  for (const [k, v] of [["s1", 8], ["s2", 16], ["s3", 24], ["s4", 32], ["s6", 48], ["s8", 64], ["s12", 96]]) assert.ok(new RegExp(`--g-${k}:\\s*${v}px`).test(css), k);
  assert.ok(/--g-max:\s*1200px/.test(css));
  assert.deepEqual(H.unscopedHiding(css), []);
});
