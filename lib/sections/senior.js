"use strict";
/**
 * Senior engineer: the last level of the escalation chain (docs/ESCALATION_HIERARCHY_SPEC.md section 5).
 * Code, no model call. Pure functions: it inspects what it is given and returns a verdict; the caller does the rebuild.
 */
const manifest = require("./manifest.json");
const P = require("./premium");

const NEVER_DROP = ["navbar", "hero", "footer"];
const TRUSTED_SCRIPT_HOSTS = [/^https:\/\/cdn\.jsdelivr\.net\//, /^https:\/\/cdnjs\.cloudflare\.com\//, /^https:\/\/unpkg\.com\//, /^https:\/\/fonts\.googleapis\.com\//];

const check = (name, ok, detail) => ({ check: name, ok: !!ok, detail: ok ? "ok" : detail });

// ---- the checks (each takes the page's html) ---------------------------------------------------------------------

function checkHtml(html) {
  const issues = [];
  if (!/^\s*<!doctype html/i.test(html)) issues.push("no doctype");
  if (!/<html[^>]*\blang=/i.test(html)) issues.push("no lang on <html>");
  if (!/<title>[^<]*\S[^<]*<\/title>/i.test(html)) issues.push("no page title");
  const h1 = (html.match(/<h1\b/gi) || []).length;
  if (h1 !== 1) issues.push(`${h1} h1 headings (want 1)`);
  for (const tag of ["div", "section", "ul", "ol", "li", "a", "p", "nav", "header", "footer", "main", "button", "form"]) {
    const open = (html.match(new RegExp(`<${tag}(\\s|>)`, "gi")) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, "gi")) || []).length;
    if (open !== close) issues.push(`<${tag}> opened ${open}, closed ${close}`);
  }
  return check("html", !issues.length, issues.join("; "));
}

function checkCss(html) {
  const issues = [];
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  if (!blocks.length) issues.push("no style block");
  blocks.forEach((css, i) => {
    const o = (css.match(/\{/g) || []).length;
    const c = (css.match(/\}/g) || []).length;
    if (o !== c) issues.push(`style block ${i + 1}: ${o} "{" vs ${c} "}"`);
    if (/\{\s*\}/.test(css)) issues.push(`style block ${i + 1}: empty rule`);
  });
  return check("css", !issues.length, issues.join("; "));
}

function checkImages(html) {
  const issues = [];
  const left = html.match(/src="IMG_\d+"/g) || [];
  if (left.length) issues.push(`${left.length} photo(s) never filled`);
  if (/<img\b[^>]*\bsrc=""/i.test(html)) issues.push("an image with an empty src");
  const noAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;
  if (noAlt) issues.push(`${noAlt} image(s) without alt text`);
  return check("images", !issues.length, issues.join("; "));
}

function checkLinks(html) {
  const issues = [];
  const dead = (html.match(/href="#"/g) || []).length;
  if (dead) issues.push(`${dead} link(s) go nowhere (href="#")`);
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const missing = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))].filter((id) => !ids.has(id) && id !== "top");
  if (missing.length) issues.push(`in-page link(s) to missing section(s): ${missing.slice(0, 5).join(", ")}`);
  return check("links", !issues.length, issues.join("; "));
}

function checkSecurity(html) {
  const issues = [];
  if (/href\s*=\s*["']\s*javascript:/i.test(html)) issues.push("a javascript: link");
  if (/\son[a-z]+\s*=\s*["']/i.test(html)) issues.push("an inline event handler");
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)) {
    if (!TRUSTED_SCRIPT_HOSTS.some((re) => re.test(m[1]))) issues.push(`a script from an unknown host (${m[1].slice(0, 60)})`);
  }
  const blank = (html.match(/<a\b[^>]*target="_blank"[^>]*>/gi) || []).filter((a) => !/rel="[^"]*noopener/i.test(a)).length;
  if (blank) issues.push(`${blank} new-tab link(s) without rel="noopener"`);
  return check("security", !issues.length, issues.join("; "));
}

/** Schema: every section on the page has its required slots filled in the content it was built from. */
function checkSchema(sections, content) {
  const issues = [];
  for (const s of sections || []) {
    const def = manifest.sections.find((d) => d.id === s.id);
    if (!def || !content || !content[s.id]) continue;
    for (const [name, slot] of Object.entries(def.slots)) {
      if (!slot.required || slot.type === "link" || slot.type === "image") continue;
      const v = content[s.id][name];
      if (v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length)) issues.push(`${s.id}.${name} is empty`);
    }
  }
  return check("schema", !issues.length, issues.slice(0, 6).join("; "));
}

function gateCheck(name, gate, rules, scoreCodes, codes) {
  const failed = ((gate && gate.failures) || []).some((f) => rules.includes(f.rule)) || codes.some((c) => scoreCodes.includes(c));
  return check(name, !failed, `${name} check failed`);
}

// ---- closeness to the 24 looks ----------------------------------------------------------------------------------

function lcs(a, b) {
  const t = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
  return t[a.length][b.length];
}

/** 0-100: how alike the page's section order and variants are to each look. All 24 are ranked. */
function rankLooks(sections) {
  const order = (sections || []).map((s) => s.id);
  const var_ = Object.fromEntries((sections || []).map((s) => [s.id, s.variant]));
  return P.allLooks().map((l) => {
    const seq = lcs(order, l.order) / Math.max(order.length, l.order.length, 1);
    const shared = l.order.filter((id) => var_[id]);
    const same = shared.length ? shared.filter((id) => var_[id] === l.variants[id]).length / shared.length : 0;
    return { id: l.id, palette: l.palette, label: l.label, match: Math.round(100 * (0.7 * seq + 0.3 * same)) };
  }).sort((a, b) => b.match - a.match);
}

// ---- the deep dive ----------------------------------------------------------------------------------------------

/**
 * @param {object} o { best: {look, built, score}, attempts, content, palette, entries: earlier log entries of this slot }
 * @returns {{ checks, failed, closest: {id,label,match}, fix: null | {kind, drop?, swap?, fallbackSearch?, why}, salvageable, report }}
 */
function inspect(o) {
  const best = o.best;
  const html = (best.built && best.built.page && best.built.page.html) || "";
  const sections = (best.built && best.built.page && best.built.page.sections) || [];
  const gate = best.built && best.built.gate;
  const codes = (best.score.reasons || []).map((r) => r.code);
  const checks = [
    checkHtml(html), checkCss(html), checkImages(html), checkLinks(html),
    gateCheck("contrast", gate, ["text-contrast", "palette-contrast"], ["contrast", "off-palette"], codes),
    gateCheck("mobile", gate, ["overflow-375"], [], codes),
    checkSchema(sections, o.content),
    checkSecurity(html),
  ];
  const failed = checks.filter((c) => !c.ok);
  const ranked = rankLooks(sections);
  const closest = ranked[0];

  // The one specific change worth trying, from what the checks found.
  let fix = null;
  const schemaBad = failed.find((c) => c.check === "schema");
  const imagesBad = failed.find((c) => c.check === "images");
  if (schemaBad) {
    const bad = [...new Set([...schemaBad.detail.matchAll(/(\w+)\.\w+ is empty/g)].map((m) => m[1]))].filter((id) => !NEVER_DROP.includes(id));
    if (bad.length) fix = { kind: "drop", drop: bad, why: `drop ${bad.join(", ")} (required words missing)` };
  }
  if (!fix && imagesBad && /never filled/.test(imagesBad.detail)) {
    fix = { kind: "photos", fallbackSearch: true, drop: sections.some((s) => s.id === "gallery") ? ["gallery"] : [], why: "photos never filled: retry with plain words, drop the gallery" };
  }
  if (!fix && failed.some((c) => c.check === "contrast")) {
    fix = { kind: "swap", swap: { hero: "a", cta: "a" }, why: "contrast failed: reset hero and call-to-action to the palette's default variant" };
  }

  const salvageable = !!fix;
  const lines = failed.length ? failed.map((c) => `- ${c.check}: ${c.detail}`) : [`- the page itself is sound; it is below the quality mark because: ${(best.score.reasons || []).map((r) => r.text).join("; ") || "no single cause"}`];
  const report = [
    `Quality ${best.score.total}/100 (mark ${best.score.threshold || 70}). Best attempt: ${best.look.label}.`,
    "What the senior engineer found:", ...lines,
    `Closest of the 24 looks: ${closest ? `${closest.label} (${closest.match}% match)` : "none"}.`,
    salvageable ? `Tried: ${fix.why}.` : "No specific fix is safe to try automatically. This page needs a person to look at it (or a new brief).",
  ].join("\n");
  return { checks, failed, closest, ranked: ranked.slice(0, 3), fix, salvageable, report };
}

/** The look to rebuild once, from a fix plan. Returns { look, fallbackSearch }. Never drops navbar/hero/footer. */
function applyFix(look, fix) {
  const order = look.order.filter((id) => !(fix.drop || []).includes(id) || NEVER_DROP.includes(id));
  const variants = { ...look.variants, ...(fix.swap || {}) };
  for (const id of Object.keys(variants)) if (!order.includes(id)) delete variants[id];
  return { look: { ...look, order, variants, adjusted: true }, fallbackSearch: !!fix.fallbackSearch };
}

module.exports = { inspect, applyFix, rankLooks, checkHtml, checkCss, checkImages, checkLinks, checkSecurity, checkSchema, NEVER_DROP };
