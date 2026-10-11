"use strict";
// Shared helpers for the section library tests (Navbar, Hero, Footer and later sections).
const fs = require("fs");
const path = require("path");
const R = require("../../lib/sections/render");

const SECTIONS_DIR = path.join(__dirname, "..", "..", "lib", "sections");

// ---- WCAG contrast (relative luminance), no browser needed ----
function lum(hex) {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(fg, bg) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
/** Composite a black scrim of opacity `a` over a backdrop colour; returns a hex string. */
function underScrim(backdropHex, a) {
  const h = backdropHex.replace("#", "");
  const c = [0, 2, 4].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - a)));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function paletteColors(id) {
  return R.getPalette(id).colors;
}
/** Check a list of {fg,bg,min} pairs for a palette; returns [{fg,bg,ratio,min,ok}]. */
function checkPairs(paletteId, pairs) {
  const c = paletteColors(paletteId);
  return pairs.map((p) => {
    const ratio = contrast(c[p.fg], c[p.bg]);
    return { fg: p.fg, bg: p.bg, ratio: Math.round(ratio * 100) / 100, min: p.min, ok: ratio >= p.min };
  });
}
/** Contrast check for a section's manifest palettePairs across every palette. Returns failures. */
function sectionContrastFailures(sectionId) {
  const sec = R.getSection(sectionId);
  const fails = [];
  for (const id of Object.keys(R.palettes.palettes)) {
    const pairs = sec.palettePairs.map(([fg, bg, min]) => ({ fg, bg, min }));
    for (const r of checkPairs(id, pairs)) if (!r.ok) fails.push({ palette: id, ...r });
  }
  return fails;
}

// ---- slot-fill / safety checks ----
const leftoverSlots = (html) => /\{\{|\}\}/.test(html);
/** Payloads must never appear raw in the output. Returns the payloads that leaked. */
function leakedPayloads(html, payloads) {
  return payloads.filter((p) => html.includes(p));
}
/** Any element that carries an inline event handler or a script tag from user text. */
function hasActiveInjection(html) {
  // quoted attribute values are inert text, so blank them before looking for handler attributes
  const noValues = html.replace(/="[^"]*"/g, '=""').replace(/='[^']*'/g, "=''");
  return /<script\b/i.test(noValues) || /<[a-z][^<>]*\son[a-z]+\s*=/i.test(noValues);
}
function emptyHrefs(html) {
  return /href=""/.test(html);
}

// ---- CSS checks ----
const COLOUR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;
/** Raw colour literals in CSS. `allowed` is a list of exact substrings (the documented scrims). */
function rawColours(css, allowed = []) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return (stripped.match(COLOUR_RE) || []).filter((m) => !allowed.includes(m));
}
function unknownVars(css, extraKnown = []) {
  const base = fs.readFileSync(path.join(SECTIONS_DIR, "base.css"), "utf8");
  const known = new Set(Object.keys(R.getPalette("cafe").colors).map((k) => `--g-${k}`));
  ["--g-font-head", "--g-font-body", "--g-radius", "--g-radius-btn", "--g-shadow", "--g-max", "--g-tap"].forEach((v) => known.add(v));
  for (const m of base.matchAll(/(--g-[\w-]+)\s*:/g)) known.add(m[1]);
  for (const m of css.matchAll(/(--g-[\w-]+)\s*:/g)) known.add(m[1]); // locally defined custom properties
  extraKnown.forEach((v) => known.add(v));
  const used = new Set([...css.matchAll(/var\(\s*(--g-[\w-]+)/g)].map((m) => m[1]));
  return [...used].filter((v) => !known.has(v));
}
const hasImportant = (css) => /!important/.test(css);

/** Declarations that would hide content before a script runs (must be scoped under .g-js). */
function unscopedHiding(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bad = [];
  for (const m of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    const body = m[2];
    if ((/opacity\s*:\s*0\s*(;|$)/.test(body) || /visibility\s*:\s*hidden/.test(body)) && !/\.g-js\b/.test(sel) && !/:hover|:focus|\[hidden\]|\.is-|\.g-sr-only|\.g-skip/.test(sel)) bad.push(sel);
  }
  return bad;
}

// ---- real-browser check (laptop / sandbox with Playwright); returns {skipped:true} when no browser ----
async function checkNoOverflow375({ html, css, paletteId = "cafe", width = 375 }) {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch {
    return { skipped: true, reason: "playwright not installed" };
  }
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    return { skipped: true, reason: "chromium not launchable: " + err.message.split("\n")[0] };
  }
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${R.paletteCss(paletteId)}${R.baseCss()}${css || ""}</style></head><body class="g-page">${html}</body></html>`;
    await page.setContent(doc, { waitUntil: "load" });
    const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    return { skipped: false, ok: m.scrollWidth <= m.innerWidth, ...m };
  } finally {
    await browser.close();
  }
}

/** Same check for a complete page (assembler output). Optionally reuse one browser via opts.browser. */
async function checkPageNoOverflow({ html, width = 375, browser }) {
  let own = null;
  try {
    if (!browser) {
      const { chromium } = require("playwright");
      own = browser = await chromium.launch();
    }
  } catch (err) {
    return { skipped: true, reason: "chromium not available: " + String(err.message).split("\n")[0] };
  }
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.setContent(html, { waitUntil: "load" });
    const m = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, h1: document.querySelectorAll("h1").length }));
    await page.close();
    return { skipped: false, ok: m.scrollWidth <= m.innerWidth, ...m };
  } finally {
    if (own) await own.close();
  }
}

module.exports = {
  checkPageNoOverflow,
  contrast,
  underScrim,
  lum,
  paletteColors,
  checkPairs,
  sectionContrastFailures,
  leftoverSlots,
  leakedPayloads,
  hasActiveInjection,
  emptyHrefs,
  rawColours,
  unknownVars,
  hasImportant,
  unscopedHiding,
  checkNoOverflow375,
  SECTIONS_DIR,
};
