"use strict";
/**
 * Premium score (0-100) for an assembled library page. See docs/PREMIUM_PIPELINE_SPEC.md section 4.
 *
 *   const m = await measure(html, { browser })       // desktop measurements from a real browser (or null if none)
 *   const s = score(page, { look, metrics: m, contrastFailed })
 *   // s = { total, parts: {mix, whitespace, typography, imagery, harmony}, max, reasons: [{code, text}], partial, pass }
 *
 * It is a heuristic for what makes a page look cheap (thin, cramped, flat, image-less, off-palette). It cannot judge taste.
 * Parts that need a browser are skipped when none exists and the total is scaled over what could be measured (`partial`).
 * Weights and the pass mark come from premium.json.
 */
const P = require("./premium");
const R = require("./render");

const KIND = { services: "list", features: "list", process: "list", faq: "list", about: "feature", gallery: "feature", cta: "action", booking: "action", location: "action" };
const PROOF_OR_ACTION = ["services", "gallery", "process", "cta"];

// ---------------------------------------------------------------- static parts (no browser needed)
function scoreMix(ids, w) {
  const content = P.contentIds(ids);
  const reasons = [];
  const n = content.length;
  let pts;
  if (n <= 1) { pts = 0; reasons.push({ code: "few-sections", text: `only ${n} content section${n === 1 ? "" : "s"}` }); }
  else if (n === 2) { pts = 0.5; reasons.push({ code: "few-sections", text: "only 2 content sections" }); }
  else if (n <= 6) pts = 1;
  else if (n === 7) { pts = 0.6; reasons.push({ code: "many-sections", text: `${n} content sections` }); }
  else { pts = 0; reasons.push({ code: "many-sections", text: `${n} content sections` }); }
  if (n >= 2 && !content.some((id) => PROOF_OR_ACTION.includes(id))) { pts -= 0.3; reasons.push({ code: "no-proof", text: "no services, gallery, process or call to action" }); }
  // rhythm: two list sections or two feature sections side by side read as a wall
  let clashes = 0;
  for (let i = 1; i < content.length; i++) if (KIND[content[i]] && KIND[content[i]] === KIND[content[i - 1]] && KIND[content[i]] !== "action") clashes++;
  if (clashes) { pts -= Math.min(0.3, clashes * 0.15); reasons.push({ code: "same-kind", text: `${clashes} pair${clashes === 1 ? "" : "s"} of similar sections side by side` }); }
  return { pts: Math.max(0, pts) * w, reasons };
}

function scoreImagery(page, look, w) {
  const reasons = [];
  const html = page.html || "";
  if (/\ssrc="IMG_\d+"/.test(html)) { reasons.push({ code: "broken-image", text: "an image is missing" }); return { pts: 0, reasons }; }
  const needsHero = !look || (look.needs || []).includes("hero-image");
  const hero = (page.parts || []).find((p) => p.id === "hero");
  const heroHasImg = !!(hero && /<img\b[^>]*\ssrc="https:/i.test(hero.html));
  const filled = (page.filled || []).length;
  const unfilled = (page.unfilled || []).length;
  const ratio = filled + unfilled ? filled / (filled + unfilled) : 1;
  let pts = 0;
  if (!needsHero) pts += 0.5; // a type-led look needs no hero photo
  else if (heroHasImg) pts += 0.5;
  else reasons.push({ code: "no-hero-image", text: "hero image missing" });
  if (ratio >= 0.6) pts += 0.5;
  else { pts += 0.5 * (ratio / 0.6); reasons.push({ code: "few-images", text: `only ${filled} of ${filled + unfilled} photos found` }); }
  return { pts: pts * w, reasons };
}

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNC = /\b(?:rgba?|hsla?)\([^)]*\)/g;
function scoreHarmony(page, contrastFailed, w) {
  const reasons = [];
  const tokens = new Set(Object.values(R.getPalette(page.palette).colors).map((c) => c.toLowerCase()));
  const neutral = new Set(["#fff", "#ffffff", "#000", "#000000"]);
  const isBlackWhite = (f) => /^(?:rgba?)\(\s*(?:0\s*,\s*0\s*,\s*0|255\s*,\s*255\s*,\s*255)\s*(?:,|\))/.test(f.replace(/\s+/g, " ").trim());
  const css = (page.html.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1];
  const inline = (page.html.match(/\sstyle="[^"]*"/g) || []).join(" ");
  const bad = new Set();
  for (const src of [css, inline]) {
    for (const h of src.match(HEX) || []) if (!tokens.has(h.toLowerCase()) && !neutral.has(h.toLowerCase())) bad.add(h);
    for (const f of src.match(FUNC) || []) if (!isBlackWhite(f)) bad.add(f);
  }
  let pts = 1;
  if (bad.size) { pts -= Math.min(0.6, 0.2 * bad.size); reasons.push({ code: "off-palette", text: `${bad.size} colour${bad.size === 1 ? "" : "s"} outside the palette (${[...bad].slice(0, 3).join(", ")})` }); }
  if (contrastFailed) { pts -= 0.4; reasons.push({ code: "contrast", text: "text contrast below AA" }); }
  return { pts: Math.max(0, pts) * w, reasons };
}

// ---------------------------------------------------------------- measured parts (a real browser at 1280px)
/** Runs inside the page. Plain numbers only. */
function pageMetrics() {
  const num = (v) => parseFloat(v) || 0;
  const secs = [...document.querySelectorAll("[data-gurost-section]")].map((s) => {
    const cs = getComputedStyle(s);
    return { id: s.getAttribute("data-gurost-section"), pt: num(cs.paddingTop), pb: num(cs.paddingBottom), h: s.getBoundingClientRect().height };
  });
  const h1s = [...document.querySelectorAll("h1")];
  const h1 = h1s[0];
  const families = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    families.add(getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase());
  }
  const lines = [];
  for (const p of document.querySelectorAll("main p")) {
    const t = p.textContent.trim();
    if (t.length < 60) continue;
    const cs = getComputedStyle(p);
    const w = p.getBoundingClientRect().width;
    lines.push(Math.min(t.length, Math.round(w / (num(cs.fontSize) * 0.5))));
  }
  return { secs, h1Count: h1s.length, h1Size: h1 ? num(getComputedStyle(h1).fontSize) : 0, h1Chars: h1 ? h1.textContent.trim().length : 0, bodySize: num(getComputedStyle(document.body).fontSize), families: [...families], lines };
}

/** Desktop measurements of a page, or null when no browser can be started (the browser-only parts are then skipped). */
async function measure(html, o = {}) {
  let own = null;
  let browser = o.browser;
  try {
    if (!browser) {
      try { own = browser = await require("playwright").chromium.launch(); } catch { return null; }
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      await page.setContent(html, { waitUntil: "load" });
      return await page.evaluate(pageMetrics);
    } finally {
      await page.close();
    }
  } catch {
    return null;
  } finally {
    if (own) await own.close();
  }
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

function scoreWhitespace(m, w) {
  const reasons = [];
  const content = m.secs.filter((s) => !["navbar", "hero", "footer"].includes(s.id));
  if (!content.length) return { pts: 0, reasons: [{ code: "cramped", text: "no content sections to measure" }] };
  const pad = content.reduce((a, s) => { const p = Math.min(s.pt, s.pb); return a + (p >= 64 ? 1 : p >= 32 ? 0.5 : 0); }, 0) / content.length;
  const tall = content.filter((s) => s.h >= 160).length / content.length;
  const cpl = median(m.lines);
  const line = !m.lines.length ? 1 : cpl >= 45 && cpl <= 75 ? 1 : (cpl > 75 && cpl <= 100) || (cpl >= 35 && cpl < 45) ? 0.5 : 0;
  if (pad < 0.75) reasons.push({ code: "cramped", text: "sections are tight (under 64px padding)" });
  if (tall < 1) reasons.push({ code: "short-section", text: "a section is under 160px tall" });
  if (line < 1) reasons.push({ code: "line-length", text: `lines run about ${cpl} characters (45-75 reads best)` });
  return { pts: (0.5 * pad + 0.2 * tall + 0.3 * line) * w, reasons };
}

function scoreTypography(m, w) {
  const reasons = [];
  const ratio = m.bodySize ? m.h1Size / m.bodySize : 0;
  const hier = Math.max(0, Math.min(1, (ratio - 1.5) / (2.4 - 1.5)));
  if (hier < 1) reasons.push({ code: "weak-hierarchy", text: `headline is only ${ratio.toFixed(1)}x the body size` });
  const body = m.bodySize >= 16 ? 1 : 0;
  if (!body) reasons.push({ code: "small-body", text: `body text is ${m.bodySize}px` });
  const fam = m.families.length <= 2 ? 1 : m.families.length === 3 ? 0.4 : 0;
  if (fam < 1) reasons.push({ code: "fonts", text: `${m.families.length} font families` });
  const one = m.h1Count === 1 ? 1 : 0;
  if (!one) reasons.push({ code: "h1", text: `${m.h1Count} main headlines` });
  const short = m.h1Chars > 0 && m.h1Chars <= 70 ? 1 : 0;
  if (!short) reasons.push({ code: "long-headline", text: "headline over 70 characters" });
  return { pts: (0.4 * hier + 0.2 * body + 0.2 * fam + 0.1 * one + 0.1 * short) * w, reasons };
}

// ---------------------------------------------------------------- the score
/**
 * @param {object} page  assemble()/assembleWithImages() result
 * @param {{look?: object, metrics?: object|null, contrastFailed?: boolean, config?: object}} o
 */
function score(page, o = {}) {
  const cfg = o.config || P.config();
  const W = cfg.weights;
  const ids = (page.sections || []).map((s) => s.id);
  const parts = {};
  const reasons = [];
  const take = (name, r) => { parts[name] = Math.round(r.pts * 10) / 10; reasons.push(...r.reasons); };
  take("mix", scoreMix(ids, W.mix));
  take("imagery", scoreImagery(page, o.look, W.imagery));
  take("harmony", scoreHarmony(page, !!o.contrastFailed, W.harmony));
  let max = W.mix + W.imagery + W.harmony;
  let partial = true;
  if (o.metrics) {
    take("whitespace", scoreWhitespace(o.metrics, W.whitespace));
    take("typography", scoreTypography(o.metrics, W.typography));
    max += W.whitespace + W.typography;
    partial = false;
  }
  const earned = Object.values(parts).reduce((a, b) => a + b, 0);
  const total = Math.round((earned / max) * 100);
  // What the look cannot do without (premium.json "needs"). A look that cannot get it is skipped, not shipped broken.
  const needsUnmet = [];
  const needs = (o.look && o.look.needs) || [];
  if (needs.includes("hero-image") && reasons.some((r) => r.code === "no-hero-image")) needsUnmet.push("hero-image");
  if (needs.includes("gallery-3") && !ids.includes("gallery")) { needsUnmet.push("gallery-3"); reasons.push({ code: "no-gallery", text: "the gallery needs three photos" }); }
  return { total, parts, max, reasons, partial, needsUnmet, pass: total >= cfg.threshold && !needsUnmet.length, threshold: cfg.threshold };
}

module.exports = { score, measure, pageMetrics, scoreMix, scoreImagery, scoreHarmony, scoreWhitespace, scoreTypography };
