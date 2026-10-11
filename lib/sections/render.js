"use strict";
/**
 * Section library renderer (foundation).
 *
 * Fills {{slots}} in a section's HTML template. Rules (see docs/SECTION_LIBRARY_SLICE_1_PLAN.md):
 *  - every text value is HTML-escaped and truncated to the slot's max length on a word boundary;
 *  - links go through an allowlist (https, http, mailto, tel, #anchor, relative) - anything else becomes "#";
 *  - images are an IMG_n token or an allowlisted https URL, nothing else;
 *  - optional slots that are empty remove their whole block ({{#if x}}...{{/if}});
 *  - facts the owner has not supplied are never invented: required text becomes a visible "[Add ...]" placeholder.
 *
 * Template syntax (a deliberately tiny subset of Mustache):
 *   {{name}}                       escaped value
 *   {{{name}}}                     RAW value - only for values this module builds itself (e.g. {{{icon}}}); never user text
 *   {{#if name}}..{{/if}}          kept when the value is non-empty (string / list / true)
 *   {{#unless name}}..{{/unless}}  kept when the value is empty
 *   {{#each list}}..{{/each}}      repeat for every item; inside: item fields, plus @n (1-based), @first, @last, @firsthalf
 * Built-ins: {{year}} (current calendar year, injectable for tests).
 */
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "manifest.json"), "utf8"));
const palettes = JSON.parse(fs.readFileSync(path.join(DIR, "palettes.json"), "utf8"));

const DEFAULT_IMAGE_HOSTS = ["jiadrorezquvthyujykb.supabase.co", "pixabay.com", "cdn.pixabay.com"];
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ESC[c]);

/** Strip control characters and collapse whitespace. */
function clean(v) {
  return String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cut to at most `max` characters (ellipsis included), on a word boundary when one is reasonably near. */
function truncate(text, max) {
  const t = clean(text);
  if (!max || [...t].length <= max) return t;
  const chars = [...t];
  const room = chars.slice(0, max - 1).join("");
  const lastSpace = room.lastIndexOf(" ");
  const cut = lastSpace >= Math.floor(room.length * 0.5) ? room.slice(0, lastSpace) : room;
  return cut.replace(/[\s,;:.\-]+$/, "") + "…";
}

/** Allowlist for href values. Returns "" for empty input and "#" for anything unsafe. */
function sanitizeHref(value) {
  const raw = clean(value);
  if (!raw) return "";
  if (raw.length > 300) return "#";
  const probe = raw.replace(/[\u0000-  ​-‍﻿]+/g, "").toLowerCase();
  if (probe.startsWith("#")) return /^#[\w\-:.]*$/.test(probe) ? raw.replace(/\s+/g, "") : "#";
  if (probe.startsWith("//") || probe.startsWith("\\")) return "#";
  const scheme = probe.match(/^([a-z][a-z0-9+.\-]*):/);
  if (scheme) {
    return ["https", "http", "mailto", "tel"].includes(scheme[1]) ? raw : "#";
  }
  return /^[\w\-./~?=&%+,@!$*()';:#\[\]]*$/.test(raw) ? raw : "#";
}

/** Image slot: an IMG_n token (filled later by the image step) or an https URL on an allowed host. */
function sanitizeImage(value, hosts = DEFAULT_IMAGE_HOSTS) {
  const raw = clean(value);
  if (!raw) return "";
  if (/^IMG_\d{1,3}$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return "";
    const ok = hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
    return ok ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Honest placeholders: shown when the owner has not supplied a fact. Nothing here is a made-up value. */
function placeholder(kind, label) {
  const map = {
    price: "[Add price]",
    year: "[Add year]",
    rating: "[Add rating]",
    stat: "[Add figure]",
    review: "[Add a real customer review]",
    hours: "[Add your opening hours]",
  };
  return map[kind] || `[Add ${label || kind || "text"}]`;
}

/** Normalise user slots against a slot-definition object. Returns { values, warnings }. */
function normalise(defs, input, opts, warnings, where = "", inList = false) {
  const out = {};
  const src = input && typeof input === "object" ? input : {};
  for (const [name, def] of Object.entries(defs || {})) {
    const at = where + name;
    const v = src[name];
    switch (def.type) {
      case "text": {
        let t = truncate(v, def.max);
        if (!t && Array.isArray(def.fallback)) for (const f of def.fallback) if (!t) t = truncate(src[f], def.max);
        if (!t && def.placeholder) t = def.placeholder;
        if (!t && def.required && !inList) {
          t = placeholder(def.kind, def.label || name);
          warnings.push(`missing required slot: ${at}`);
        }
        if (def.mail && t && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(t)) t = ""; // not an email: drop it
        out[name] = t;
        if (def.tel) out[name + "_tel"] = t ? "tel:" + t.replace(/[^\d+]/g, "") : "";
        if (def.mail) out[name + "_mailto"] = t ? "mailto:" + t : "";
        break;
      }
      case "link": {
        let h = sanitizeHref(v);
        if (h && def.https && !/^https:\/\//i.test(h)) h = ""; // e.g. social profiles: https only
        if (!h && def.required && !inList) {
          h = "#";
          warnings.push(`missing required link: ${at}`);
        }
        out[name] = h;
        break;
      }
      case "image": {
        out[name] = sanitizeImage(v, opts.imageHosts);
        if (!out[name] && def.required) warnings.push(`missing required image: ${at}`);
        break;
      }
      case "flag":
        out[name] = v === true || v === "true" || v === 1;
        break;
      case "enum": {
        const s = clean(v).toLowerCase();
        out[name] = (def.values || []).includes(s) ? s : def.default || "";
        break;
      }
      case "list": {
        const arr = Array.isArray(v) ? v : [];
        const items = [];
        for (const raw of arr) {
          if (def.max && items.length >= def.max) break;
          const sub = normalise(def.item, raw, opts, [], "", true);
          let ok = true;
          for (const [k, idef] of Object.entries(def.item || {})) {
            if (idef.required && !sub[k] && !(idef.type === "list")) ok = false;
            if (idef.type === "list" && idef.required && !(sub[k] || []).length) ok = false;
          }
          if (def.drop && ok === false) continue;
          if (!ok) continue;
          // Internal derived fields (trusted, built here, rendered with {{{ }}}).
          if (def.derive === "icon") sub.icon_svg = iconSvg(sub.icon);
          if (def.derive === "initial") sub.initial = ((sub.name || "").match(/[\p{L}\p{N}]/u) || [""])[0].toUpperCase();
          if (def.derive === "social_icon") {
            sub.icon = socialIcon(sub.platform);
            sub.platform_name = SOCIAL_NAMES[sub.platform] || "";
          }
          items.push(sub);
        }
        if (def.required && def.min && items.length < def.min) warnings.push(`list ${at} has ${items.length} items (min ${def.min})`);
        out[name] = items;
        break;
      }
      default:
        out[name] = "";
    }
  }
  return out;
}

const SOCIAL_NAMES = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube", x: "X" };

// --- small, original, stroke-based social glyphs (inline SVG, no external requests) ---
const SVG_OPEN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const ICONS = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  tiktok: '<path d="M14 3v11a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.4 2.4 2 4 4.5 4.2"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
  x: '<path d="M5 4l14 16M19 4L5 20"/>',
};
// General purpose UI glyphs for trust bars, features, services, process steps (original, stroke-based).
const UI_ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l8-8"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  truck: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L8 21l4-2 4 2-1-7.5"/>',
  phone: '<path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
  pin: '<path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  tool: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5 6"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
};
const ICON_NAMES = Object.keys(UI_ICONS);
function iconSvg(name) {
  const body = UI_ICONS[name];
  return body ? SVG_OPEN + body + "</svg>" : "";
}

function socialIcon(platform) {
  const body = ICONS[platform];
  return body ? SVG_OPEN + body + "</svg>" : "";
}

// --- template parser -------------------------------------------------------
const TOKEN = /\{\{\{\s*([@\w.]+)\s*\}\}\}|\{\{\s*([#\/]?)\s*(if|unless|each)?\s*([@\w.]*)\s*\}\}/g;

function parse(tpl) {
  const root = { t: "root", kids: [] };
  const stack = [root];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(tpl))) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.kids.push({ t: "text", v: tpl.slice(last, m.index) });
    last = TOKEN.lastIndex;
    if (m[1]) {
      top.kids.push({ t: "raw", name: m[1] });
    } else if (m[2] === "#" && m[3]) {
      const node = { t: m[3], name: m[4], kids: [] };
      top.kids.push(node);
      stack.push(node);
    } else if (m[2] === "/" && (m[3] || m[4])) {
      const closing = m[3] || m[4];
      if (stack.length > 1 && stack[stack.length - 1].t === closing) stack.pop();
      else throw new Error(`template: unexpected {{/${closing}}}`);
    } else if (m[4]) {
      top.kids.push({ t: "var", name: m[4] });
    } else {
      throw new Error("template: empty tag");
    }
  }
  if (last < tpl.length) stack[stack.length - 1].kids.push({ t: "text", v: tpl.slice(last) });
  if (stack.length !== 1) throw new Error(`template: unclosed {{#${stack[stack.length - 1].t}}}`);
  return root;
}

function lookup(name, scopes) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const s = scopes[i];
    if (s && Object.prototype.hasOwnProperty.call(s, name)) return s[name];
  }
  return undefined;
}

const truthy = (v) => (Array.isArray(v) ? v.length > 0 : v === true || (typeof v === "string" && v !== ""));

function emit(node, scopes, warnings) {
  switch (node.t) {
    case "root":
      return node.kids.map((k) => emit(k, scopes, warnings)).join("");
    case "text":
      return node.v;
    case "var": {
      const v = lookup(node.name, scopes);
      if (v === undefined) {
        warnings.push(`unknown slot in template: ${node.name}`);
        return "";
      }
      return esc(v);
    }
    case "raw": {
      const v = lookup(node.name, scopes);
      if (v === undefined) {
        warnings.push(`unknown slot in template: ${node.name}`);
        return "";
      }
      return String(v);
    }
    case "if":
      return truthy(lookup(node.name, scopes)) ? node.kids.map((k) => emit(k, scopes, warnings)).join("") : "";
    case "unless":
      return !truthy(lookup(node.name, scopes)) ? node.kids.map((k) => emit(k, scopes, warnings)).join("") : "";
    case "each": {
      const list = lookup(node.name, scopes);
      if (!Array.isArray(list)) return "";
      return list
        .map((item, i) => {
          const meta = { "@n": i + 1, "@first": i === 0, "@last": i === list.length - 1, "@firsthalf": i < Math.ceil(list.length / 2) };
          return node.kids.map((k) => emit(k, scopes.concat([item, meta]), warnings)).join("");
        })
        .join("");
    }
    default:
      return "";
  }
}

/**
 * Render a template string with slot definitions and user slots.
 * @returns {{ html: string, warnings: string[] }}
 */
function renderTemplate(template, defs, slots, opts = {}) {
  const warnings = [];
  const values = normalise(defs, slots, opts, warnings);
  const now = opts.now instanceof Date ? opts.now : new Date();
  const scopes = [{ year: String(now.getUTCFullYear()) }, opts.extra || {}, values];
  let html = emit(parse(template), scopes, warnings);
  if (/\{\{|\}\}/.test(html)) {
    warnings.push("leftover template braces removed");
    html = html.replace(/\{\{[^}]*\}\}/g, "");
  }
  return { html, warnings };
}

function getSection(id) {
  const s = manifest.sections.find((x) => x.id === id);
  if (!s) throw new Error(`unknown section: ${id}`);
  return s;
}

/** Trusted, module-built values for a section: its optional inline script (lib/sections/<id>/<id>.js). */
function sectionScope(id) {
  const f = path.join(DIR, id, `${id}.js`);
  if (!fs.existsSync(f)) return {};
  return { script: `<script>${fs.readFileSync(f, "utf8").trim()}</script>` };
}

/** Render one built section variant from lib/sections/<id>/<variant>.html. */
function renderSection(id, variant, slots, opts = {}) {
  const sec = getSection(id);
  if (!sec.slots) throw new Error(`section ${id} has no slot schema yet (status: ${sec.status})`);
  if (!sec.variants.includes(variant)) throw new Error(`section ${id} has no variant ${variant}`);
  // Variant rules: a variant that needs a slot (e.g. a hero photo) is swapped for its fallback when the slot is empty.
  let use = variant;
  let swappedFrom = null;
  const rule = sec.variantRules && sec.variantRules[variant];
  if (rule && !opts.noSwap) {
    const probe = normalise(sec.slots, slots, opts, []);
    if (rule.needs.some((n) => !probe[n])) {
      use = rule.fallback;
      swappedFrom = variant;
    }
  }
  const file = path.join(DIR, id, `${use}.html`);
  const template = fs.readFileSync(file, "utf8");
  const r = renderTemplate(template, sec.slots, slots, { ...opts, extra: sectionScope(id) });
  return { ...r, id, variant: use, swappedFrom };
}

// --- palette and font helpers ---------------------------------------------
function getPalette(id) {
  const p = palettes.palettes[id];
  if (!p) throw new Error(`unknown palette: ${id}`);
  return p;
}

/** ":root{--g-bg:#...;...}" for a palette, including the two font stacks. */
function paletteCss(id) {
  const p = getPalette(id);
  const vars = Object.entries(p.colors).map(([k, v]) => `--g-${k}:${v}`);
  if (p.shape) vars.push(`--g-radius:${p.shape.radius}`, `--g-radius-btn:${p.shape.radiusBtn}`);
  vars.push(`--g-font-head:'${p.fonts.heading}',${p.fonts.headingFallback}`);
  vars.push(`--g-font-body:'${p.fonts.body}',${p.fonts.bodyFallback}`);
  return `:root{${vars.join(";")}}`;
}

/** Google Fonts stylesheet URL for a palette, built in code (never written into a prompt). */
function googleFontsHref(id) {
  const f = getPalette(id).fonts;
  const fam = (name, weights) => `family=${name.replace(/ /g, "+")}:wght@${weights.join(";")}`;
  return `https://fonts.googleapis.com/css2?${fam(f.heading, f.headingWeights)}&${fam(f.body, f.bodyWeights)}&display=swap`;
}

function baseCss() {
  return fs.readFileSync(path.join(DIR, "base.css"), "utf8");
}

module.exports = {
  esc,
  clean,
  truncate,
  sanitizeHref,
  sanitizeImage,
  placeholder,
  socialIcon,
  iconSvg,
  ICON_NAMES,
  renderTemplate,
  renderSection,
  getSection,
  getPalette,
  paletteCss,
  googleFontsHref,
  baseCss,
  manifest,
  palettes,
  DEFAULT_IMAGE_HOSTS,
};
