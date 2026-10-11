"use strict";
/**
 * Website Builder V2: designs made from the section library instead of free-written HTML.
 *
 * The split that makes the sites trustworthy:
 *   - the MODEL writes words only: headlines, service descriptions, FAQ answers. One call per build, JSON out.
 *     It is told never to write prices, ratings, years, counts, people or reviews, and its output is cleaned in code.
 *   - the OWNER's facts (name, phone, email, address, socials) go in by code, from `businessInfo`. They are never model-written.
 *   - sections that would need invented facts (testimonials, stats, pricing, team) are simply not on the page.
 *   - the LAYOUT comes from the library: one palette for the industry, four directions that are different variant sets
 *     of the same words (so "Show 2 more" costs no extra model call).
 *
 * Behind SECTION_LIBRARY=1 (see `enabled()`). The caller falls back to the old generator on any error or zero designs.
 * The model call and the photo search are injected, so tests need no network.
 */
const A = require("../lib/sections/assemble");
const R = require("../lib/sections/render");
const G = require("../lib/sections/quality-gate");
const { assembleWithImages } = require("../lib/sections/fill-images");
const manifest = require("../lib/sections/manifest.json");

// Sections the model may write the words for. Everything else is facts (code) or left off the page.
const COPY_SECTIONS = ["hero", "services", "features", "about", "process", "faq", "cta", "gallery"];

// Same ids and labels as the old four directions, so the picker and the stored designs need no change.
const DIRECTIONS = [
  { id: "minimal", label: "Minimal / Editorial", set: { navbar: "a", hero: "c", services: "a", features: "a", about: "c", gallery: "a", process: "a", faq: "a", cta: "a", booking: "a", location: "a", footer: "a" } },
  { id: "bold", label: "Bold / Maximalist", set: { navbar: "b", hero: "b", services: "b", features: "b", about: "b", gallery: "b", process: "b", faq: "b", cta: "b", booking: "b", location: "b", footer: "b" } },
  { id: "corporate", label: "Corporate / Professional", set: {} }, // the palette's own defaults
  { id: "playful", label: "Playful / Friendly", set: { navbar: "c", hero: "a", services: "c", features: "c", about: "b", gallery: "c", process: "c", faq: "c", cta: "c", booking: "c", location: "c", footer: "c" } },
];
const FIRST_IDS = ["minimal", "bold"];
const MORE_IDS = ["corporate", "playful"];

const NAV_LABELS = { services: "Services", features: "Features", about: "About", gallery: "Gallery", process: "How it works", faq: "FAQ", booking: "Book", location: "Visit us" };

// ---------------------------------------------------------------- what the model is asked for
const sectionDef = (id) => manifest.sections.find((s) => s.id === id);

/** One line per slot the model may fill: name, kind, limit. Links, flags and photos are never the model's. */
function describeSlots(id) {
  const def = sectionDef(id);
  const lines = [];
  const one = (name, s, pad) => {
    if (s.type === "text") lines.push(`${pad}${name}: text, max ${s.max}${s.required ? "" : ", optional"}`);
    else if (s.type === "enum" && Array.isArray(s.values)) lines.push(`${pad}${name}: one of ${s.values.join("|")}`);
    else if (s.type === "image") return;
  };
  for (const [name, s] of Object.entries(def.slots)) {
    if (["tone", "cta1_href", "cta2_href", "trust_line", "cta_href"].includes(name)) continue;
    if (s.type === "list") {
      lines.push(`${name}: list of ${s.min || 1} to ${s.max || 6} items, each {`);
      for (const [n2, s2] of Object.entries(s.item)) one(n2, s2, "    ");
      lines.push("  }");
    } else one(name, s, "");
  }
  return lines.join("\n");
}

function systemPrompt(sectionIds) {
  return `You write the words for a small-business website. A designer lays them out; you never write HTML.

Reply with ONE JSON object only: {"brand": "<business name as given or clearly stated>", "description": "<meta description, max 150 chars>", "sections": { "<section id>": { ...slots } }}.

Write ONLY these sections, with exactly these slots:
${sectionIds.map((id) => `## ${id}\n${describeSlots(id)}`).join("\n\n")}

For photos give a short plain-English brief in "image_brief" (hero, about) or "brief" (each gallery image): what a stock photo should show, 3 to 8 words, no people's names.

HARD RULES (a lawyer reads this site):
- Never write prices, ratings, review quotes, awards, years in business, "since 19xx", customer or project counts, percentages, guarantees, named people, qualifications or certifications, unless the owner's text gives that exact fact.
- Never invent an address, phone number, email, opening hours or links. Those are added by the system.
- Write about what the business does, in a warm, specific, plain voice. No filler like "world-class" or "cutting-edge".
- Use the owner's language and spelling. Keep every text inside its max length. Do not use emoji.`;
}

// ---------------------------------------------------------------- cleaning the model's answer
const clip = (s, max) => R.truncate(String(s == null ? "" : s).replace(/\s+/g, " ").trim(), max || 200);

function cleanValue(spec, v) {
  if (spec.type === "text") return clip(v, spec.max);
  if (spec.type === "enum") return Array.isArray(spec.values) && spec.values.includes(v) ? v : spec.default;
  return undefined;
}

function cleanList(spec, arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, spec.max || 8).map((it) => {
    const o = {};
    for (const [n, s] of Object.entries(spec.item)) {
      const val = cleanValue(s, it && it[n]);
      if (val !== undefined && val !== "") o[n] = val;
    }
    return o;
  });
}

/** Keeps only known text/enum/list slots, trims to the limits, drops empty ones. */
function cleanSection(id, raw) {
  const def = sectionDef(id);
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [name, spec] of Object.entries(def.slots)) {
    if (spec.type === "list") {
      const items = cleanList(spec, src[name]).filter((it) => Object.values(it).some(Boolean));
      if (items.length) out[name] = items;
    } else {
      const val = cleanValue(spec, src[name]);
      if (val !== undefined && val !== "" && !["tone"].includes(name)) out[name] = val;
    }
  }
  return out;
}

// ---------------------------------------------------------------- putting the page together
/** Real facts only: from the owner's saved details. */
function factsFrom(businessInfo) {
  const b = businessInfo || {};
  return { name: b.name || "", tagline: b.tagline || "", phone: b.phone || "", email: b.email || "", address: b.address || "", socials: ["instagram", "facebook", "tiktok", "youtube", "x"].filter((k) => b[k]).map((k) => ({ platform: k, url: b[k] })) };
}

/**
 * Turns the model's words and the owner's facts into `content` for assemble(): { content, palette, recipe, brand, meta }.
 * Pure. `modelOut` may be anything the model returned; it is cleaned here.
 */
function composeContent({ prompt, businessInfo, modelOut }) {
  const palette = A.paletteForIndustry(`${prompt || ""} ${(businessInfo && businessInfo.name) || ""}`);
  const recipeId = A.pickRecipe(palette);
  const recipe = A.recipes[recipeId];
  const f = factsFrom(businessInfo);
  const mo = modelOut && typeof modelOut === "object" ? modelOut : {};
  const rawSecs = mo.sections && typeof mo.sections === "object" ? mo.sections : {};
  const brand = clip(f.name || mo.brand || "", 32) || "[Add your business name]";

  const content = {};
  let img = 0;
  const token = () => `IMG_${++img}`;

  for (const id of recipe.order) {
    if (!COPY_SECTIONS.includes(id) || !rawSecs[id]) continue;
    const sec = cleanSection(id, rawSecs[id]);
    const raw = rawSecs[id] || {};
    if (id === "hero" || id === "about") {
      const brief = clip(raw.image_brief || sec.image_brief, 200);
      if (brief) {
        sec.image = token();
        sec.image_brief = brief;
      }
    }
    if (id === "gallery") {
      const imgs = (Array.isArray(raw.images) ? raw.images : []).slice(0, 9).map((g) => ({ brief: clip(g && g.brief, 200), caption: clip(g && g.caption, 60) })).filter((g) => g.brief);
      if (imgs.length < 3) continue; // a gallery needs at least three pictures
      sec.images = imgs.map((g) => ({ ...g, image: token() }));
      for (const g of sec.images) if (!g.caption) delete g.caption;
    }
    if (Object.keys(sec).length) content[id] = sec;
  }

  // Required copy: a page without a hero headline is not a page. Fall back to the owner's own words, then a marked placeholder.
  const hero = content.hero || (content.hero = {});
  if (!hero.headline) hero.headline = brand.startsWith("[") ? "[Add your headline]" : brand;
  if (!hero.subhead) hero.subhead = clip(f.tagline, 160) || "[Add a one-line description of what you do]";
  if (!hero.cta1_label) hero.cta1_label = "Get in touch";

  // Owner facts: booking and location exist only if the owner gave the details.
  const methods = [];
  if (f.phone) methods.push({ label: "Call", value: f.phone, href: "tel:" + f.phone.replace(/[^\d+]/g, "") });
  if (f.email) methods.push({ label: "Email", value: f.email, href: "mailto:" + f.email });
  if (methods.length && recipe.order.includes("booking")) content.booking = { title: "Get in touch", methods };
  if (f.address && recipe.order.includes("location")) {
    content.location = { title: "Find us", address: f.address };
    if (f.phone) content.location.phone = f.phone;
    if (f.email) content.location.email = f.email;
  }

  const present = (id) => !!content[id];
  const target = present("booking") ? "#booking" : present("location") ? "#location" : methods[0] ? methods[0].href : "";
  const firstSection = ["services", "features", "about"].find(present);
  const heroHref = target || (firstSection ? "#" + firstSection : "#top");
  hero.cta1_href = heroHref;
  if (content.cta && target) {
    content.cta.cta1_href = target;
    if (!content.cta.cta1_label) content.cta.cta1_label = "Get in touch";
  } else if (content.cta) {
    delete content.cta.cta1_label;
  }

  // Navbar + footer: links point only at sections that exist on this page.
  const navIds = ["services", "features", "about", "gallery", "process", "faq", "booking", "location"].filter(present);
  const links = navIds.slice(0, 6).map((id) => ({ label: NAV_LABELS[id], href: "#" + id }));
  while (links.length < 3) links.push(links.length === 0 ? { label: "Home", href: "#top" } : { label: "Top", href: "#top" });
  content.navbar = { brand, links: links.slice(0, 6), cta_label: methods.length || present("location") ? "Contact" : "Get started", cta_href: heroHref };
  if (f.phone) content.navbar.phone = f.phone;
  content.footer = { brand, link_groups: [{ title: "Explore", links: links.filter((l) => l.href !== "#top").slice(0, 5).concat(links.every((l) => l.href === "#top") ? [{ label: "Back to top", href: "#top" }] : []) }] };
  if (!content.footer.link_groups[0].links.length) content.footer.link_groups[0].links = [{ label: "Back to top", href: "#top" }];
  if (f.tagline) content.footer.tagline = clip(f.tagline, 90);
  if (f.address) content.footer.address = f.address;
  if (f.phone) content.footer.phone = f.phone;
  if (f.email) content.footer.email = f.email;
  if (f.socials.length) content.footer.socials = f.socials;

  const description = clip(mo.description || hero.subhead, 160);
  return { palette, recipe: recipeId, content, brand, meta: { title: brand.startsWith("[") ? undefined : `${brand}: ${hero.headline}`, description } };
}

// ---------------------------------------------------------------- one direction -> one finished design
async function buildDirection(dir, composed, { search, includeBranding, factsAllow, browserChecks }) {
  const input = { palette: composed.palette, recipe: composed.recipe, content: composed.content, variants: dir.set, includeBranding, meta: composed.meta };
  let page = await assembleWithImages(input, { search });
  let g = await G.gate(page, { facts: factsAllow, browserChecks });
  let degraded = false;
  let steps = [];
  if (!g.ok) {
    // swap variants, then default content (the gate's own repair ladder) - never ship a failing page silently
    const fixed = await G.buildWithGate({ ...input, content: composed.content }, { facts: factsAllow, browserChecks, allowImageTokens: true });
    page = { ...fixed, credits: page.credits, filled: page.filled };
    g = fixed.gate;
    steps = fixed.steps || [];
    degraded = !!fixed.degraded;
  }
  return { page, gate: g, steps, degraded };
}

/**
 * Makes the designs for a project. Same shape as variantBot.generateVariantsStaged: resolves { variants, failures }
 * and reports progress through onStage(stage, status, data).
 *
 * @param {string} prompt
 * @param {object} o { businessInfo, plan, includeBranding, onStage, directionIds, callModel, search, siteCopy, browserChecks }
 *   callModel({ system, content }) -> parsed JSON       (default: Claude via the tier router)
 *   search(query) -> { url, credit } | null              (default: the stock-photo step)
 *   siteCopy: words saved on an earlier call (used by "Show 2 more" so no second model call is made)
 */
async function generateLibraryVariants(prompt, o = {}) {
  const notify = (stage, status, data) => o.onStage && o.onStage(stage, status, data);
  const ids = o.directionIds || FIRST_IDS;
  const dirs = DIRECTIONS.filter((d) => ids.includes(d.id));
  const failures = [];
  const variants = [];

  notify("understanding", "running");
  notify("understanding", "complete", { prompt });
  const palette = A.paletteForIndustry(`${prompt || ""} ${(o.businessInfo && o.businessInfo.name) || ""}`);
  notify("designing", "running", { industry: palette });

  let modelOut = o.siteCopy || null;
  if (!modelOut) {
    const recipe = A.recipes[A.pickRecipe(palette)];
    const wanted = recipe.order.filter((id) => COPY_SECTIONS.includes(id));
    const callModel = o.callModel || defaultCallModel(o.plan);
    const extra = require("../lib/business-info").businessInfoPrompt(o.businessInfo);
    modelOut = await callModel({ system: systemPrompt(wanted), content: `${prompt}\n\n${extra || ""}`.trim() });
  }
  const composed = composeContent({ prompt, businessInfo: o.businessInfo, modelOut });

  // One photo lookup per distinct brief across all directions.
  const memo = new Map();
  const rawSearch = o.search || ((q) => require("../image-bot").searchImage(q));
  const search = async (q) => {
    if (!memo.has(q)) memo.set(q, Promise.resolve().then(() => rawSearch(q)).catch(() => null));
    return memo.get(q);
  };
  const factsAllow = [prompt, JSON.stringify(o.businessInfo || {})];

  await Promise.all(
    dirs.map(async (dir) => {
      try {
        const built = await buildDirection(dir, composed, { search, includeBranding: o.includeBranding !== false, factsAllow, browserChecks: o.browserChecks });
        const html = built.page.html;
        if (!/<h1\b/i.test(html) || html.length < 2000) throw new Error("the page came out empty");
        const variant = {
          id: dir.id,
          label: dir.label,
          html,
          summary: `${dir.label}: ${built.page.sections.length} sections, ${composed.palette} palette`,
          usage: null,
          verified: true,
          credits: built.page.credits || [],
          site: { engine: "section-library", palette: composed.palette, recipe: composed.recipe, content: composed.content, variants: dir.set, meta: composed.meta, direction: dir.id, copy: modelOut },
          gate: { ok: built.gate.ok, warnings: built.gate.warnings.length, degraded: built.degraded },
        };
        variants.push(variant);
        notify("designing", "variant-complete", { variantId: dir.id, label: dir.label, summary: variant.summary, variant });
      } catch (err) {
        console.error(`[library-bot] "${dir.id}" failed:`, err.message);
        failures.push({ variant: dir.id, error: err.message });
        notify("designing", "variant-failed", { variantId: dir.id, label: dir.label, error: err.message });
      }
    })
  );
  notify("designing", "complete", { count: variants.length });
  notify("done", "complete", { variants, failures });
  return { variants, failures, copy: modelOut };
}

function defaultCallModel(plan) {
  const { callClaude } = require("../lib/claude-client");
  const { modelForTier } = require("../lib/tier-router");
  return async ({ system, content }) => {
    const { parsed } = await callClaude({ system, messages: [{ role: "user", content }], maxTokens: 6000, model: modelForTier(plan, { complex: false }), deadline: Date.now() + 150000 });
    return parsed;
  };
}

module.exports = { generateLibraryVariants, composeContent, cleanSection, systemPrompt, describeSlots, DIRECTIONS, FIRST_IDS, MORE_IDS, COPY_SECTIONS, enabled: A.enabled };
