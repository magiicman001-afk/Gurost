"use strict";
/**
 * Quality gate for library pages. Runs on the assembled page and on each section, then decides what to ship.
 *
 *   Static checks (fast, no browser, every build):
 *     leftover-slot, lorem, fake-fact (prices, years, ratings, counts), unfilled-image, img-alt,
 *     bare-icon-name (Bug X), palette-contrast (every palette pair + the photo-scrim worst case), dead-link (warning)
 *   Browser checks (when Chromium is available; skipped otherwise, and reported as skipped):
 *     overflow-375, text-contrast (computed colours of every visible text)
 *   Advisory: the Impeccable detector (warnings only, skipped when it is not installed)
 *
 *   buildWithGate(): assemble -> gate -> on failure swap the failing section's variant (free) -> still failing:
 *   use that section's default content -> still failing: all default content -> ship. It never throws.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const R = require("./render");
const A = require("./assemble");

const HIGH = "fail";
const WARN = "warn";

// ---------------------------------------------------------------- text helpers
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** Visible text: scripts, styles and tags removed, entities decoded, whitespace collapsed. */
function visibleText(html) {
  return decode(
    String(html)
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}
/** Text of every text node (between tags), for the icon-name check. */
function textNodes(html) {
  const stripped = String(html).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "<i></i>").replace(/<!--[\s\S]*?-->/g, "");
  return [...stripped.matchAll(/>([^<>]+)</g)].map((m) => decode(m[1]).trim()).filter(Boolean);
}

// ---------------------------------------------------------------- static rules
const FAKE = [
  ["price", /[£$€¥]\s?\d|\b\d+(?:[.,]\d+)?\s?(?:GBP|USD|EUR|pounds?|dollars?|euros?)\b/i],
  ["rating", /★|\b\d(?:\.\d)?\s?(?:\/\s?5|out of 5)\b|\b\d(?:\.\d)?\s?-?stars?\b/i],
  ["count", /(?<!\d[ -]?)\b\d[\d,]*\+?\s+(?:happy\s+)?(?:customers|clients|reviews|projects|members|users|patients|orders|jobs|homes)\b(?!@)/i],
  ["year", /\b(?:since|est\.?|established|founded|serving(?:\s+since)?)\s+(?:in\s+)?(?:19|20)\d{2}\b|\b\d{1,3}\+?\s+years?\b/i],
];
const BARE_ICON = /^(?:[a-z]+(?:_[a-z]+)+|[A-Z]+(?:_[A-Z]+)+)$/;

/**
 * @param {string} html     a section fragment or a whole page
 * @param {object} o        { now, facts: string[] (owner-supplied text that may contain prices etc.), allowImageTokens, ids: string[] }
 * @returns {{rule:string, severity:string, detail:string}[]}
 */
function checkStatic(html, o = {}) {
  const out = [];
  const add = (rule, severity, detail) => out.push({ rule, severity, detail });
  const facts = (o.facts || []).map((f) => String(f).toLowerCase());
  const now = o.now instanceof Date ? o.now : new Date();
  const text = visibleText(html);

  if (/\{\{|\}\}/.test(html)) add("leftover-slot", HIGH, "unfilled {{ }} left in the output");
  if (/lorem ipsum|dolor sit amet|consectetur adipiscing/i.test(text)) add("lorem", HIGH, "lorem ipsum text");

  for (const [kind, re] of FAKE) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const m of text.matchAll(g)) {
      const hit = m[0].toLowerCase();
      if (facts.some((f) => f.includes(hit))) continue; // the owner supplied it
      add("fake-fact", HIGH, `${kind}: "${m[0]}"`);
    }
  }
  for (const m of text.matchAll(/©\s*(\d{4})/g)) {
    if (Number(m[1]) !== now.getUTCFullYear()) add("fake-fact", HIGH, `year: "© ${m[1]}" is not the current year`);
  }

  if (!o.allowImageTokens) for (const m of String(html).matchAll(/\bIMG_\d+\b/g)) add("unfilled-image", HIGH, `image placeholder ${m[0]} was never filled`);
  for (const m of String(html).matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt=/.test(m[0])) add("img-alt", HIGH, "image without an alt attribute");
    if (/\ssrc=(""|'')/.test(m[0]) || !/\ssrc=/.test(m[0])) add("unfilled-image", HIGH, "image with an empty src");
  }

  for (const t of textNodes(html)) {
    if (BARE_ICON.test(t)) add("bare-icon-name", HIGH, `icon name shown as text: "${t}"`);
  }
  // an element whose only text is an icon ligature name (Material Symbols class)
  for (const m of String(html).matchAll(/<(?:span|i)\b[^>]*class="[^"]*material[^"]*"[^>]*>([^<]+)</gi)) {
    add("bare-icon-name", HIGH, `icon-font ligature text: "${m[1].trim()}"`);
  }

  const hrefs = [...String(html).matchAll(/\shref="([^"]*)"/g)].map((m) => m[1]);
  const bare = hrefs.filter((h) => h === "#" || h === "").length;
  if (bare) add("dead-link", WARN, `${bare} link(s) go nowhere (href="#"). Real pages come with Website Builder V2 (Bug U)`);
  if (o.ids) {
    const have = new Set(o.ids);
    const missing = [...new Set(hrefs.filter((h) => /^#[\w-]+$/.test(h)).map((h) => h.slice(1)))].filter((id) => !have.has(id) && id !== "top" && id !== "main");
    if (missing.length) add("dead-link", WARN, `anchors with no matching section: ${missing.map((x) => "#" + x).join(", ")}`);
  }
  return out;
}

/** Placeholders the owner still has to fill (visible "[Add ...]" text). Informational. */
function placeholdersLeft(html) {
  return [...visibleText(html).matchAll(/\[Add [^\]]{1,60}\]/g)].map((m) => m[0]);
}

/** Palette-level contrast: every declared pair, plus the worst-case photo behind the 0.6 scrim. */
function checkPalette(paletteId) {
  const out = [];
  const p = R.getPalette(paletteId);
  const lum = (hex) => {
    const h = hex.replace("#", "");
    const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  for (const pr of p.pairs) {
    const r = ratio(p.colors[pr.fg], p.colors[pr.bg]);
    if (r < pr.min) out.push({ rule: "palette-contrast", severity: HIGH, detail: `${paletteId}: ${pr.fg} on ${pr.bg} is ${r.toFixed(2)}:1, needs ${pr.min}:1` });
  }
  // pale text over the darkest allowed photo scrim (0.6) on the brightest possible photo
  const worst = "#" + [102, 102, 102].map((v) => v.toString(16).padStart(2, "0")).join("");
  const rs = ratio(p.colors["on-dark"], worst);
  if (rs < 4.5) out.push({ rule: "palette-contrast", severity: HIGH, detail: `${paletteId}: on-dark over a photo under the 0.6 scrim is ${rs.toFixed(2)}:1, needs 4.5:1` });
  return out;
}

// ---------------------------------------------------------------- browser rules
async function launch() {
  try {
    return await require("playwright").chromium.launch();
  } catch {
    return null;
  }
}

/** Runs inside the page. Returns { overflow: [...], contrast: [...] } with section ids. */
function pageProbe(width) {
  const sectionOf = (el) => {
    const s = el.closest && el.closest("[data-gurost-section]");
    return s ? s.getAttribute("data-gurost-section") : "page";
  };
  const out = { overflow: [], contrast: [] };
  const docW = document.documentElement.scrollWidth;
  if (docW > width) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > width + 1 && r.width > 0) {
        const id = sectionOf(el);
        if (!out.overflow.some((o) => o.section === id)) out.overflow.push({ section: id, detail: `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} reaches ${Math.round(r.right)}px on a ${width}px screen` });
      }
    }
    if (!out.overflow.length) out.overflow.push({ section: "page", detail: `page is ${docW}px wide on a ${width}px screen` });
  }
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a] = m[1].split(",").map((x) => parseFloat(x));
    return { r, g, b, a: a === undefined ? 1 : a };
  };
  const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const bgOf = (el) => {
    // returns a solid colour, or null when an image/gradient sits behind the text (covered by the palette scrim maths)
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  };
  const lum = (c) => {
    const f = [c.r, c.g, c.b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length;
    if (!own) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.display === "none" || cs.visibility === "hidden" || r.width <= 2 || r.height <= 2) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    let fg = parse(cs.color);
    if (!fg) continue;
    fg = blend(fg, bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const key = sectionOf(el) + el.className + ratio.toFixed(2);
      if (seen.has(key)) continue;
      seen.add(key);
      out.contrast.push({ section: sectionOf(el), detail: `"${el.textContent.trim().slice(0, 30)}" is ${ratio.toFixed(2)}:1, needs ${need}:1` });
    }
  }
  return out;
}

/** Browser checks on a full page. Returns { skipped, reason, failures: [{rule, severity, section, detail}] }. */
async function checkBrowser(html, o = {}) {
  let own = null;
  let browser = o.browser;
  if (!browser) {
    own = browser = await launch();
    if (!browser) return { skipped: true, reason: "no browser available", failures: [] };
  }
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.setContent(html, { waitUntil: "load" });
    const res = await page.evaluate(pageProbe, 375);
    await page.close();
    const failures = [
      ...res.overflow.map((x) => ({ rule: "overflow-375", severity: HIGH, ...x })),
      ...res.contrast.map((x) => ({ rule: "text-contrast", severity: HIGH, ...x })),
    ];
    return { skipped: false, failures };
  } catch (err) {
    return { skipped: true, reason: "browser check failed: " + String(err.message).split("\n")[0], failures: [] };
  } finally {
    if (own) await own.close();
  }
}

// ---------------------------------------------------------------- Impeccable (advisory)
function impeccableCli(env = process.env) {
  const cands = [env.IMPECCABLE_CLI].filter(Boolean);
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}
/** Runs `impeccable detect --json`. Returns { skipped, findings:[{rule, severity:"warn", detail}] }. */
function runImpeccable(html, o = {}) {
  const cli = o.cli || impeccableCli();
  if (!cli) return Promise.resolve({ skipped: true, reason: "IMPECCABLE_CLI not set", findings: [] });
  const file = path.join(os.tmpdir(), `gurost-gate-${process.pid}-${Date.now()}.html`);
  fs.writeFileSync(file, html);
  return new Promise((resolve) => {
    execFile("node", [cli, "detect", "--json", "--no-config", file], { timeout: 20000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      fs.rmSync(file, { force: true });
      try {
        const list = JSON.parse(stdout || "[]");
        const seen = new Set();
        const findings = list
          .filter((f) => !seen.has(f.antipattern + f.snippet) && seen.add(f.antipattern + f.snippet))
          .map((f) => ({ rule: "impeccable:" + f.antipattern, severity: WARN, detail: `${f.name}: ${f.snippet}` }));
        resolve({ skipped: false, findings });
      } catch {
        resolve({ skipped: true, reason: "detector gave no usable output", findings: [] });
      }
    });
  });
}

// ---------------------------------------------------------------- the gate
/**
 * @param {object} page   assemble() result
 * @param {object} o      { facts, now, browser, browserChecks=true, impeccable=true, allowImageTokens, extraChecks(part) }
 */
async function gate(page, o = {}) {
  const failures = [];
  const warnings = [];
  const skipped = [];
  const now = o.now;
  const ids = [...page.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const push = (f, section) => (f.severity === WARN ? warnings : failures).push({ ...f, section: f.section || section });

  for (const part of page.parts || []) {
    for (const f of checkStatic(part.html, { now, facts: o.facts, allowImageTokens: o.allowImageTokens, ids })) push(f, part.id);
    if (typeof o.extraChecks === "function") for (const f of o.extraChecks(part) || []) push({ severity: HIGH, ...f }, part.id);
  }
  for (const f of checkPalette(page.palette)) push(f, "page");

  if (o.browserChecks !== false) {
    const b = await checkBrowser(page.html, { browser: o.browser });
    if (b.skipped) skipped.push("browser: " + b.reason);
    for (const f of b.failures) push(f, f.section);
  } else skipped.push("browser: switched off");

  if (o.impeccable !== false) {
    const im = await runImpeccable(page.html, { cli: o.impeccableCli });
    if (im.skipped) skipped.push("impeccable: " + im.reason);
    for (const f of im.findings) warnings.push({ ...f, section: "page" });
  }
  return { ok: failures.length === 0, failures, warnings, skipped, placeholders: placeholdersLeft(page.html) };
}

// ---------------------------------------------------------------- default content (last resort, cannot fail the gate)
function defaultContent(id) {
  const L = (label, href) => ({ label, href });
  switch (id) {
    case "navbar":
      return { brand: "[Add business name]", links: [L("Home", "#top"), L("About", "#about"), L("Contact", "#contact")], cta_label: "Contact", cta_href: "#contact" };
    case "hero":
      return { headline: "[Add your headline]", subhead: "[Add a short description of what you do]", cta1_label: "Contact", cta1_href: "#contact" };
    case "footer":
      return { brand: "[Add business name]", link_groups: [{ title: "Links", links: [L("Home", "#top"), L("Contact", "#contact")] }] };
    default:
      return null;
  }
}

/**
 * Build a page and make sure something good ships.
 * @returns {Promise<object>} assemble() result plus { gate, steps, degraded }
 */
async function buildWithGate(input, o = {}) {
  const steps = [];
  const base = () => ({ ...input, content: { ...(input.content || {}) }, variants: { ...(input.variants || {}) } });
  let cur = base();
  let page;
  try {
    page = A.assemble(cur);
    let g = await gate(page, o);
    const failingIds = () => [...new Set(g.failures.map((f) => f.section).filter((s) => s && s !== "page"))];

    // 1. swap the variant of each failing section (free: no model call, no content change)
    for (const id of failingIds()) {
      const now = page.sections.find((s) => s.id === id);
      if (!now) continue;
      for (const v of ["a", "b", "c"].filter((x) => x !== now.variant)) {
        const trial = { ...cur, variants: { ...cur.variants, [id]: v } };
        const p2 = A.assemble(trial);
        const g2 = await gate(p2, o);
        if (!g2.failures.some((f) => f.section === id)) {
          steps.push({ step: "swap-variant", id, from: now.variant, to: v });
          cur = trial;
          page = p2;
          g = g2;
          break;
        }
      }
    }
    // 2. default content for sections that still fail
    for (const id of failingIds()) {
      const d = defaultContent(id);
      if (!d) continue;
      cur = { ...cur, content: { ...cur.content, [id]: d } };
      steps.push({ step: "default-content", id });
    }
    if (steps.some((s) => s.step === "default-content")) {
      page = A.assemble(cur);
      g = await gate(page, o);
    }
    // 3. page-level failure: everything default
    if (!g.ok) {
      const content = { ...cur.content };
      for (const id of ["navbar", "hero", "footer"]) content[id] = defaultContent(id);
      cur = { ...cur, content, variants: {} };
      steps.push({ step: "all-default-content" });
      page = A.assemble(cur);
      g = await gate(page, o);
    }
    return { ...page, gate: g, steps, degraded: steps.some((s) => s.step !== "swap-variant"), shipped: true };
  } catch (err) {
    // never die: fall back to the plainest page we can make
    try {
      const content = {};
      for (const id of ["navbar", "hero", "footer"]) content[id] = defaultContent(id);
      page = A.assemble({ palette: R.palettes.palettes[input.palette] ? input.palette : "tech", content, now: input.now });
      return { ...page, gate: { ok: false, failures: [], warnings: [], skipped: [], placeholders: [] }, steps: [{ step: "emergency-default", error: String(err.message).slice(0, 200) }], degraded: true, shipped: true };
    } catch (err2) {
      throw err2; // only reachable if the library itself is broken
    }
  }
}

module.exports = { checkStatic, checkPalette, checkBrowser, runImpeccable, gate, buildWithGate, defaultContent, visibleText, placeholdersLeft, pageProbe, HIGH, WARN };
