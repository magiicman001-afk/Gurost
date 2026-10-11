"use strict";
/**
 * Section library assembler: builds one complete, self-contained HTML page from a recipe, a palette and the
 * owner's content. Pure function, no network, no model call.
 *
 * Behind the flag SECTION_LIBRARY=1 (off by default). `enabled()` tells the caller whether to use it; the old
 * generator keeps working when the flag is off. Wiring into the builders happens in Website Builder V2.
 *
 *   const { html, warnings, sections, swaps, images } = assemble({
 *     palette: "cafe",                       // one of the six locked palettes (or use paletteForIndustry())
 *     recipe: "local-business",              // optional; chosen from the palette when omitted
 *     content: { navbar: {...}, hero: {...}, footer: {...} },   // slots per section id
 *     variants: { hero: "b" },               // optional overrides; defaults come from the palette
 *     includeBranding: true,                 // Free plan: shows "Built with Gurost" in the footer
 *     meta: { title, description, lang },
 *   });
 */
const fs = require("fs");
const path = require("path");
const R = require("./render");

const DIR = __dirname;
const recipes = JSON.parse(fs.readFileSync(path.join(DIR, "recipes.json"), "utf8")).recipes;

/** The feature flag. Off unless SECTION_LIBRARY is exactly "1". */
function enabled(env = process.env) {
  return String(env.SECTION_LIBRARY || "") === "1";
}

const KEYWORDS = {
  cafe: ["bakery", "bake", "cafe", "café", "coffee", "restaurant", "bistro", "pizzeria", "food", "catering", "patisserie"],
  law: ["law", "solicitor", "attorney", "legal", "accountant", "accounting", "finance", "financial", "tax", "bookkeep", "advis"],
  salon: ["salon", "hair", "barber", "beauty", "spa", "nail", "massage", "lash", "makeup", "barbershop"],
  trades: ["plumb", "electric", "construct", "build", "roof", "joiner", "carpent", "paint", "heating", "landscap", "handyman", "locksmith"],
  health: ["clinic", "dentist", "dental", "physio", "therap", "wellness", "doctor", "health", "chiropract", "optic", "vet"],
  tech: ["saas", "software", "startup", "app", "tech", "ai ", "platform", "agency", "digital", "developer"],
};

/** Best palette for a free-text industry or business description. Falls back to "tech" (the neutral palette). */
function paletteForIndustry(text) {
  const t = String(text || "").toLowerCase();
  let best = "tech";
  let score = 0;
  for (const [id, words] of Object.entries(KEYWORDS)) {
    const s = words.filter((w) => t.includes(w)).length;
    if (s > score) {
      best = id;
      score = s;
    }
  }
  return best;
}

/** Recipe id for a palette (or an explicit page type). */
function pickRecipe(paletteId, pageType) {
  for (const [id, r] of Object.entries(recipes)) if (pageType && r.pageTypes.includes(pageType)) return id;
  for (const [id, r] of Object.entries(recipes)) if (r.palettes.includes(paletteId)) return id;
  return "landing";
}

const LIBS = {
  gsap: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js",
  scrollTrigger: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js",
  lenis: "https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js",
};
const readFile = (f) => fs.readFileSync(path.join(DIR, f), "utf8");

const readCss = (id) => {
  const f = path.join(DIR, id, `${id}.css`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "";
};

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Image slots the page still needs filled: [{ token, brief, role }] (the existing image step replaces IMG_n). */
function collectImages(html) {
  const out = [];
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    const token = (tag.match(/\ssrc="(IMG_\d+)"/) || [])[1];
    if (!token) continue;
    out.push({
      token,
      brief: decode((tag.match(/\sdata-gurost-image="([^"]*)"/) || [])[1] || ""),
      role: (tag.match(/\sdata-gurost-image-role="([^"]*)"/) || [])[1] || "image",
    });
  }
  return out;
}

function assemble(input = {}) {
  const warnings = [];
  const swaps = [];
  const palId = input.palette;
  const pal = R.getPalette(palId); // throws on an unknown palette
  const recipeId = input.recipe || pickRecipe(palId, input.pageType);
  const recipe = recipes[recipeId];
  if (!recipe) throw new Error(`unknown recipe: ${recipeId}`);
  const content = input.content && typeof input.content === "object" ? input.content : {};
  const variants = input.variants && typeof input.variants === "object" ? input.variants : {};
  const tone = pal.footerTone === "dark" ? "dark" : "light";
  const now = input.now;

  const rendered = []; // { id, variant, html }
  const skipped = [];
  for (const id of recipe.order) {
    let sec;
    try {
      sec = R.getSection(id);
    } catch {
      warnings.push(`recipe names unknown section: ${id}`);
      continue;
    }
    if (sec.status !== "built") {
      skipped.push(id);
      continue;
    }
    const required = recipe.required.includes(id);
    if (!required && !content[id]) continue; // optional sections need content; we never invent it
    if (required && !content[id]) warnings.push(`no content for required section: ${id} (placeholders shown)`);
    rendered.push({ id, variant: ["a", "b", "c"].includes(variants[id]) ? variants[id] : (pal.defaults && pal.defaults[id]) || "a" });
  }
  if (skipped.length) warnings.push(`sections not built yet, skipped: ${skipped.join(", ")}`);

  // Slot defaults the page owns: tones follow the palette, the credit follows the plan.
  const slotsFor = (id) => {
    const s = { ...(content[id] || {}) };
    if (id === "navbar" && !s.tone) s.tone = tone;
    if (id === "hero" && !s.tone) s.tone = tone;
    if (id === "footer") {
      if (!s.tone) s.tone = tone;
      s.show_gurost_credit = input.includeBranding === true;
    }
    return s;
  };

  const out = new Map();
  const renderOne = (entry, variantOverride) => {
    const r = R.renderSection(entry.id, variantOverride || entry.variant, slotsFor(entry.id), { now });
    warnings.push(...r.warnings.map((w) => `${entry.id}: ${w}`));
    if (r.swappedFrom) swaps.push({ id: entry.id, from: r.swappedFrom, to: r.variant, why: "needs an image that is missing" });
    out.set(entry.id, r);
    return r;
  };

  // Hero first: the navbar variant depends on what the hero is.
  const heroEntry = rendered.find((e) => e.id === "hero");
  let hero = null;
  if (heroEntry) hero = renderOne(heroEntry);
  const heroDark = hero && (hero.variant === "b" || (hero.variant === "c" && /data-tone="dark"/.test(hero.html)));
  for (const entry of rendered) {
    if (entry.id === "hero") continue;
    let variant = entry.variant;
    if (entry.id === "navbar" && variant === "c" && !heroDark) {
      swaps.push({ id: "navbar", from: "c", to: "a", why: "transparent navbar needs a photo or dark hero behind it" });
      variant = "a";
    }
    renderOne(entry, variant);
  }

  const ordered = rendered.map((e) => ({ id: e.id, r: out.get(e.id) }));
  const head = ordered.filter((e) => e.id === "navbar").map((e) => e.r.html);
  const foot = ordered.filter((e) => e.id === "footer").map((e) => e.r.html);
  const mid = ordered.filter((e) => e.id !== "navbar" && e.id !== "footer").map((e) => e.r.html);

  const body = `${head.join("\n")}\n<main id="main">\n${mid.join("\n")}\n</main>\n${foot.join("\n")}`;
  const h1s = (body.match(/<h1\b/g) || []).length;
  if (h1s === 0) warnings.push("page has no <h1> (no hero)");
  if (h1s > 1) warnings.push(`page has ${h1s} <h1> elements`);

  const meta = input.meta || {};
  const heroText = (content.hero && content.hero.headline) || "";
  const brand = (content.navbar && content.navbar.brand) || (content.footer && content.footer.brand) || "";
  const title = R.truncate(meta.title || [brand, heroText].filter(Boolean).join(": "), 70) || "Website";
  const description = R.truncate(meta.description || (content.hero && content.hero.subhead) || "", 160);
  const lang = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(meta.lang || "") ? meta.lang : "en";

  // Scroll motion is for published sites only (the preview leaves it off). `motion: true` adds the built-in engine;
  // `motion: { libs: true }` also loads GSAP + ScrollTrigger and Lenis, which the engine uses when they arrive.
  const motion = input.motion === true || (input.motion && typeof input.motion === "object") ? input.motion : false;
  const libs = !!(motion && motion.libs);

  const usedCss = [...new Set(ordered.map((e) => e.id))].map(readCss).filter(Boolean).join("\n");
  const css = `${R.paletteCss(palId)}\n${R.baseCss()}\n${usedCss}${motion ? "\n" + readFile("motion.css") : ""}`;
  const libTags = libs ? Object.values(LIBS).map((u) => `<script src="${u}" defer></script>`).join("\n") + "\n" : "";
  const motionTag = motion ? `${libTags}<script>\n${readFile("motion.js")}</script>\n` : "";
  const html = `<!doctype html>
<html lang="${R.esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${R.esc(title)}</title>
${description ? `<meta name="description" content="${R.esc(description)}">\n` : ""}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${R.esc(R.googleFontsHref(palId))}">
<style>
${css}
</style>
</head>
<body class="g-page" data-industry="${R.esc(palId)}">
${body}
${motionTag}</body>
</html>
`;

  return {
    html,
    warnings,
    swaps,
    recipe: recipeId,
    palette: palId,
    sections: ordered.map((e) => ({ id: e.id, variant: e.r.variant })),
    parts: ordered.map((e) => ({ id: e.id, variant: e.r.variant, html: e.r.html })),
    skipped,
    images: collectImages(html),
  };
}

module.exports = { LIBS, assemble, enabled, paletteForIndustry, pickRecipe, recipes, collectImages };
