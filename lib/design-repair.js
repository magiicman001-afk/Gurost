/**
 * Repairs a generated page that names styles it never loads - the cause
 * of the "plain white site" (2026-10-07): a free model wrote daisyUI class
 * names (bg-base-100, text-base-content x67, bg-secondary...) without
 * daisyUI and without a tailwind.config, and Material Icons classes without
 * the icon font. Tailwind ignores colour names it doesn't know, so the page
 * fell back to white with default text and every icon showed as a word.
 *
 * No AI. Only names the page uses and never defines are added, built from
 * the business's industry palette (lib/industry-design) or the Gurost
 * defaults; a page with its own tailwind.config is left alone.
 * Returns { html, added: [human-readable] }.
 */

const { getIndustryDesign } = require("./industry-design");

// Tailwind's own colour names - never redefined.
const TAILWIND_COLORS = new Set(["slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose", "white", "black", "transparent", "current", "inherit"]);
// daisyUI's semantic names (used without a shade number).
const SEMANTIC = new Set(["primary", "primary-content", "secondary", "secondary-content", "accent", "accent-content", "neutral-content",
  "base-100", "base-200", "base-300", "base-content", "info", "info-content", "success", "success-content", "warning", "warning-content", "error", "error-content"]);
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const COLOR_UTIL = /^(?:[a-z0-9-]+:)*!?-?(?:bg|text|border(?:-[trblxy])?|from|via|to|ring|ring-offset|fill|stroke|divide|decoration|outline|placeholder|accent|caret|shadow)-(.+)$/;

const DEFAULT_COLORS = { primary: "#1A1A2E", onPrimary: "#FFFFFF", secondary: "#FEB246", accent: "#FF8C00", onAccent: "#FFFFFF", background: "#FFFFFF", foreground: "#1A1A2E", card: "#F8F9FA", muted: "#F3F4F6", mutedForeground: "#6B7280", border: "#E5E7EB" };

// Colour names a page uses in its classes, with or without a shade.
function colorNamesUsed(html) {
  const names = new Set();
  for (const m of String(html).matchAll(/\bclass\s*=\s*["']([^"']*)["']/gi)) {
    for (const cls of m[1].split(/\s+/)) {
      const u = COLOR_UTIL.exec(cls);
      if (!u) continue;
      const value = u[1].replace(/\/\d+$/, ""); // drop an opacity suffix
      if (SEMANTIC.has(value)) { names.add(value); continue; }
      const shaded = /^([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*)-(\d{2,3})$/.exec(value);
      if (shaded && SHADES.includes(Number(shaded[2])) && !TAILWIND_COLORS.has(shaded[1])) names.add(shaded[1] + "-*");
    }
  }
  return names;
}

const hexToRgb = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (r) => "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
// A 50-950 scale around a base colour (500 = the colour itself).
function scaleOf(hex) {
  const out = {};
  const toWhite = { 50: 0.95, 100: 0.9, 200: 0.75, 300: 0.55, 400: 0.3 };
  const toBlack = { 600: 0.15, 700: 0.3, 800: 0.45, 900: 0.6, 950: 0.75 };
  for (const s of SHADES) out[s] = s === 500 ? hex : s < 500 ? mix(hex, "#ffffff", toWhite[s]) : mix(hex, "#000000", toBlack[s]);
  out.DEFAULT = hex;
  return out;
}

function colorConfig(names, c) {
  const semantic = {
    primary: c.primary, "primary-content": c.onPrimary, secondary: c.secondary, "secondary-content": "#FFFFFF",
    accent: c.accent, "accent-content": c.onAccent, "neutral-content": c.background,
    "base-100": c.background, "base-200": c.card, "base-300": c.border, "base-content": c.foreground,
    info: "#0284C7", "info-content": "#FFFFFF", success: "#16A34A", "success-content": "#FFFFFF",
    warning: "#D97706", "warning-content": "#FFFFFF", error: "#DC2626", "error-content": "#FFFFFF"
  };
  const colors = {};
  for (const n of names) {
    if (SEMANTIC.has(n)) { colors[n] = semantic[n]; continue; }
    const base = n.slice(0, -2); // "brand-*" -> "brand"
    const hue = /accent|cta|highlight/.test(base) ? c.accent : /secondary/.test(base) ? c.secondary
      : /base|bg|background|surface|cream|paper/.test(base) ? c.background : /ink|text|dark|content/.test(base) ? c.foreground : c.primary;
    colors[base] = scaleOf(hue);
  }
  return colors;
}

// font-heading / font-body / font-display: custom families a model names
// from habit; without a config Tailwind ignores them.
const FONT_ROLES = ["heading", "display", "body", "serif-display"];
function fontRolesUsed(html) {
  const roles = new Set();
  for (const m of String(html).matchAll(/\bclass\s*=\s*["']([^"']*)["']/gi)) {
    for (const cls of m[1].split(/\s+/)) {
      const r = /^(?:[a-z0-9-]+:)*font-([a-z-]+)$/.exec(cls)?.[1];
      if (r && FONT_ROLES.includes(r)) roles.add(r);
    }
  }
  return roles;
}
const DEFAULT_FONTS = { heading: "Fraunces", body: "Inter", googleFontsUrl: "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" };

// daisyUI component classes, styled only when the page uses them and never
// defines them. Small on purpose: enough for a real button or card.
function componentCss(html, c) {
  const used = (cls) => new RegExp(`class\\s*=\\s*["'][^"']*(?<![\\w-])${cls}(?![\\w-])`).test(html);
  const defined = (cls) => new RegExp(`\\.${cls}(?![\\w-])[^{]*\\{`).test(html.replace(/<(?!style)[^>]*>/g, ""));
  const rules = [];
  const want = (cls, css) => { if (used(cls) && !defined(cls)) rules.push(`.${cls}{${css}}`); };
  const btn = "display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.75rem 1.5rem;border-radius:9999px;font-weight:600;line-height:1.2;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease,background-color .15s ease;cursor:pointer;border:2px solid transparent";
  want("btn", btn);
  want("btn-primary", `${btn};background:${c.primary};color:${c.onPrimary};box-shadow:0 6px 16px -6px ${c.primary}99`);
  want("btn-secondary", `${btn};background:${c.background};color:${c.primary};border-color:${c.primary}`);
  want("btn-accent", `${btn};background:${c.accent};color:${c.onAccent}`);
  want("btn-outline", `${btn};background:transparent;color:inherit;border-color:currentColor`);
  want("btn-ghost", `${btn};background:transparent;color:inherit`);
  want("btn-lg", "padding:1rem 2rem;font-size:1.125rem");
  want("btn-sm", "padding:.5rem 1rem;font-size:.875rem");
  want("card", `background:${c.card};border-radius:1rem;box-shadow:0 10px 30px -12px rgba(0,0,0,.18);overflow:hidden`);
  want("card-body", "padding:1.5rem;display:flex;flex-direction:column;gap:.5rem");
  want("badge", `display:inline-flex;align-items:center;padding:.25rem .75rem;border-radius:9999px;font-size:.75rem;font-weight:600;background:${c.secondary}22;color:${c.primary}`);
  if (rules.some((r) => r.startsWith(".btn"))) rules.push(".btn:hover,.btn-primary:hover,.btn-secondary:hover,.btn-accent:hover,.btn-outline:hover{transform:translateY(-1px)}");
  return rules;
}

function repairDesign(html, { prompt = "" } = {}) {
  let page = String(html);
  const added = [];
  const head = (tag) => { page = /<\/head\s*>/i.test(page) ? page.replace(/<\/head\s*>/i, `${tag}\n</head>`) : tag + page; };
  const design = getIndustryDesign(prompt);
  const c = design?.colors || DEFAULT_COLORS;
  const hasConfig = /tailwind\.config\s*=/.test(page);
  const names = colorNamesUsed(page);
  const roles = fontRolesUsed(page);
  if (!hasConfig && (names.size || roles.size) && /cdn\.tailwindcss\.com/.test(page)) {
    const extend = {};
    if (names.size) extend.colors = colorConfig(names, c);
    if (roles.size) {
      const f = design?.fonts?.heading ? design.fonts : DEFAULT_FONTS;
      extend.fontFamily = {};
      for (const r of roles) extend.fontFamily[r] = r === "body" ? [f.body, "system-ui", "sans-serif"] : [f.heading, "Georgia", "serif"];
      const family = (n) => `family=${n.replace(/ /g, "+")}`;
      if (!new RegExp(family(f.heading).replace(/\+/g, "\\+"), "i").test(page)) head(`<link href="${f.googleFontsUrl}" rel="stylesheet">`);
      added.push(`fonts for ${[...roles].map((r) => `font-${r}`).join(", ")}`);
    }
    const config = `<script>tailwind.config = { theme: { extend: ${JSON.stringify(extend)} } };</script>`;
    // Must come right after the Tailwind CDN script, which defines `tailwind`.
    page = page.replace(/(<script[^>]*cdn\.tailwindcss\.com[^>]*>\s*<\/script>)/i, `$1\n${config}`);
    if (names.size) added.unshift(`colours for ${[...names].map((n) => n.replace("-*", "")).join(", ")}`);
  }
  const components = componentCss(page, c);
  if (components.length) {
    head(`<style data-gurost="components">${components.join("")}</style>`);
    added.push(`styles for ${components.filter((r) => !r.includes(":hover")).length} button/card classes`);
  }
  // Each icon style is its own font family: a page loading Material+Icons
  // but using material-icons-outlined still shows the icon names as words.
  // The family name must end there, so +Outlined doesn't count as the plain set.
  const loads = (family) => new RegExp(`family=(?:[^"'&]*\\|)?${family.replace(/\+/g, "\\+")}(?![+\\w])`, "i").test(page);
  const variants = [...new Set([...page.matchAll(/\bmaterial-(icons|symbols)(?:-(outlined|round|rounded|sharp))?\b/g)].map((m) => `${m[1]}:${m[2] || ""}`))];
  const icons = variants.filter((v) => v.startsWith("icons:")).map((v) => "Material+Icons" + ({ outlined: "+Outlined", round: "+Round", sharp: "+Sharp" }[v.slice(6)] || ""));
  const missingIcons = icons.filter((f) => !loads(f));
  if (missingIcons.length) {
    head(`<link href="https://fonts.googleapis.com/icon?family=${missingIcons.join("|")}" rel="stylesheet">`);
    added.push(`the ${missingIcons.join(", ").replace(/\+/g, " ")} font`);
  }
  const symbols = variants.filter((v) => /^symbols:(outlined|rounded|sharp)$/.test(v)).map((v) => "Material+Symbols+" + v[8].toUpperCase() + v.slice(9));
  const missingSymbols = symbols.filter((f) => !loads(f));
  if (missingSymbols.length) {
    head(`<link href="https://fonts.googleapis.com/css2?${missingSymbols.map((f) => `family=${f}:wght,FILL@100..700,0..1`).join("&")}" rel="stylesheet">`);
    added.push(`the ${missingSymbols.join(", ").replace(/\+/g, " ")} font`);
  }
  // A model subsetting the icon font (&icon_names=menu,close,...) then using
  // icons it didn't list gets those as words ("bakery_dining"); load it whole.
  const subset = /(fonts\.googleapis\.com\/css2\?[^"']*Material\+Symbols[^"']*?)&(?:amp;)?icon_names=[^&"']*/gi;
  if (subset.test(page)) { page = page.replace(subset, "$1"); added.push("the full icon font (it was cut down to a few icons)"); }
  // The Tailwind CDN compiles @apply only inside <style type="text/tailwindcss">;
  // in a plain <style> the whole rule is dropped (unstyled buttons).
  if (/cdn\.tailwindcss\.com/.test(page)) {
    let applied = 0;
    page = page.replace(/<style(?![^>]*\btype=)([^>]*)>([\s\S]*?)<\/style\s*>/gi, (all, attrs, css) => (/@apply\b/.test(css) ? (applied++, `<style type="text/tailwindcss"${attrs}>${css}</style>`) : all));
    if (applied) added.push("Tailwind processing for the page's @apply styles");
  }
  const pictures = dropInventedSources(page);
  if (pictures.dropped) { page = pictures.html; added.push(`${pictures.dropped} image source${pictures.dropped === 1 ? "" : "s"} pointing at files that don't exist`); }
  return { html: page, added };
}

// A model writing <picture> guesses .avif/.webp siblings of the one image
// we gave it (seen 2026-10-07: x.jpg real, x.avif / x.webp -> 400). A
// browser commits to the first <source> whose type it supports and never
// falls back to the <img> when that file fails, so the hero went blank and
// its white headline sat on white. A <source> on the image's own host that
// names a different file is one we never made: drop it so the <img> loads.
function dropInventedSources(html) {
  let dropped = 0;
  const out = html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture\s*>/gi, (pic) => {
    const src = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(pic)?.[1];
    let real;
    try { real = new URL(src); } catch { return pic; }
    return pic.replace(/<source\b[^>]*>\s*/gi, (tag) => {
      const urls = (/\bsrcset\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] || "").split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
      const invented = urls.some((u) => { try { const x = new URL(u, real); return x.host === real.host && x.pathname !== real.pathname; } catch { return false; } });
      if (invented) { dropped++; return ""; }
      return tag;
    });
  });
  return { html: out, dropped };
}

module.exports = { repairDesign, colorNamesUsed, scaleOf };
