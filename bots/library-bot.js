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
const crypto = require("crypto");
const A = require("../lib/sections/assemble");
const R = require("../lib/sections/render");
const G = require("../lib/sections/quality-gate");
const { assembleWithImages, PALETTE_WORDS } = require("../lib/sections/fill-images");
const P = require("../lib/sections/premium");
const S = require("../lib/sections/premium-score");
const { runSlot } = require("../lib/sections/premium-loop");
const { runEscalation } = require("../lib/sections/escalation");
const BL = require("../lib/build-log");
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
// `copy` (premium looks): extra sections the model wrote words for, beyond the recipe's own order.
function composeContent({ prompt, businessInfo, modelOut, copy }) {
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

  const copyOrder = copy ? [...new Set([...recipe.order, ...copy])] : recipe.order;
  for (const id of copyOrder) {
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
  if (methods.length && (copy || recipe.order.includes("booking"))) content.booking = { title: "Get in touch", methods };
  if (f.address && (copy || recipe.order.includes("location"))) {
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


// ---------------------------------------------------------------- live preview (progress the person can watch)
// The builder paints "designing/partial" messages in its Live Preview and advances the progress bar. Two real things happen
// before the finished designs exist, and each is shown as it happens: (1) a styled shell (the palette, fonts, the
// owner's business name) the moment the industry is matched, while the model writes the words; (2) the page growing section
// by section as those words are assembled. Photos are not looked up yet at that point, so images show as blank until the finished design.
const BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const stripImgTokens = (html) => String(html).replace(/src="IMG_\d+"/g, `src="${BLANK_IMG}"`);

function previewPage(palette, recipeOrder, content, variants) {
  const order = recipeOrder.filter((id) => content[id]);
  const r = A.assemble({ palette, recipe: { id: "preview", order, required: ["navbar", "hero", "footer"].filter((id) => order.includes(id)) }, content, variants, includeBranding: false, meta: { title: (content.navbar && content.navbar.brand) || "Preview" } });
  return stripImgTokens(r.html);
}

/** Shown while the words are being written: the real palette and fonts, the owner's name, and a clear "writing" line. */
function skeletonContent(o) {
  const brand = String((o.businessInfo && o.businessInfo.name) || "").trim() || "Your business";
  const links = [{ label: "Home", href: "#top" }, { label: "About", href: "#top" }, { label: "Contact", href: "#top" }];
  return {
    navbar: { brand, links, cta_label: "Get started", cta_href: "#top" },
    hero: { headline: brand, subhead: "Writing the words for your site...", cta1_label: "Get in touch", cta1_href: "#top" },
    footer: { brand, link_groups: [{ title: "Explore", links: [{ label: "Back to top", href: "#top" }] }] },
  };
}

const SECTION_LABEL = { navbar: "navigation", hero: "hero", services: "services", features: "features", about: "about", gallery: "gallery", process: "process", faq: "faq", cta: "call to action", booking: "contact", location: "location", footer: "footer" };

/** The page growing one section at a time, once the words exist. Stops as soon as `state.stop` is set. */
async function growPreview({ dir, composed, notify, state, stepMs, order }) {
  try {
    const have = (order || A.recipes[composed.recipe].order).filter((id) => composed.content[id] && id !== "footer");
    // The first frame is navigation + hero together (a page with a bar and nothing under it is not worth showing).
    const first = Math.min(2, have.length);
    for (let i = first; i <= have.length; i++) {
      if (state.stop) return;
      const shown = have.slice(0, i);
      const html = previewPage(composed.palette, [...shown, "footer"], composed.content, dir.set);
      const added = i === first ? shown : [shown[shown.length - 1]];
      notify("designing", "partial", { variantId: dir.id, label: dir.label, html, sections: added.map((id) => SECTION_LABEL[id] || id), progress: 40 + Math.round((50 * i) / have.length) });
      if (stepMs > 0) await new Promise((r) => setTimeout(r, stepMs));
    }
  } catch (err) {
    console.warn("[library-bot] live preview skipped:", err.message); // the preview is a courtesy; the build goes on
  }
}

/**
 * Navigation and footer links may only point at sections this particular look actually has (a look can leave out the FAQ
 * the words were written for). Found by the senior engineer's link check: before this, such a link went nowhere.
 */
function fitLinks(content, order) {
  const on = new Set(order);
  const keep = (l) => !/^#/.test(l.href) || l.href === "#top" || on.has(l.href.slice(1));
  const c = { ...content };
  if (c.navbar && Array.isArray(c.navbar.links)) {
    const links = c.navbar.links.filter(keep);
    while (links.length < 3) links.push(links.length === 0 ? { label: "Home", href: "#top" } : { label: "Top", href: "#top" });
    c.navbar = { ...c.navbar, links };
  }
  if (c.footer && Array.isArray(c.footer.link_groups)) {
    c.footer = { ...c.footer, link_groups: c.footer.link_groups.map((g) => {
      const links = (g.links || []).filter(keep);
      return { ...g, links: links.length ? links : [{ label: "Back to top", href: "#top" }] };
    }) };
  }
  return c;
}

// ---------------------------------------------------------------- one direction -> one finished design
async function buildDirection(dir, composed, { search, includeBranding, factsAllow, browserChecks, recipe, browser }) {
  const content = fitLinks(composed.content, (recipe && recipe.order) || A.recipes[composed.recipe].order);
  const input = { palette: composed.palette, recipe: recipe || composed.recipe, content, variants: dir.set, includeBranding, meta: composed.meta };
  let page = await assembleWithImages(input, { search });
  let g = await G.gate(page, { facts: factsAllow, browserChecks, browser });
  let degraded = false;
  let steps = [];
  if (!g.ok) {
    // swap variants, then default content (the gate's own repair ladder) - never ship a failing page silently
    const fixed = await G.buildWithGate({ ...input, content }, { facts: factsAllow, browserChecks, browser, allowImageTokens: true });
    const photos = page.photos || {};
    let html = fixed.html;
    for (const [tok, url] of Object.entries(photos)) html = html.replace(new RegExp(`src="${tok}"`, "g"), () => `src="${R.esc(url)}"`);
    if (/\ssrc="IMG_\d+"/.test(html)) throw new Error("the repaired page still has missing photos");
    page = { ...fixed, html, credits: page.credits, filled: page.filled, photos };
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
 * @param {object} o { businessInfo, plan, includeBranding, onStage, directionIds, callModel, search, siteCopy, browserChecks, premium }
 *   premium: true/false overrides the PREMIUM_PIPELINE flag (tests); bestLook(industry) -> { look } | null is the Design Memory lookup (tests)
 *   callModel({ system, content }) -> parsed JSON       (default: Claude via the tier router)
 *   search(query) -> { url, credit } | null              (default: the stock-photo step)
 *   siteCopy: words saved on an earlier call (used by "Show 2 more" so no second model call is made)
 */
async function generateLibraryVariants(prompt, o = {}) {
  const notify = (stage, status, data) => o.onStage && o.onStage(stage, status, data);
  const ids = o.directionIds || FIRST_IDS;
  const dirs = DIRECTIONS.filter((d) => ids.includes(d.id));
  // Premium Pipeline (PREMIUM_PIPELINE=1): each slot builds a curated look, is scored, and loops until it passes.
  const premium = o.premium === undefined ? P.enabled() : !!o.premium;
  const failures = [];
  const variants = [];
  const logger = o.logger || BL.nullLogger; // build log (lib/build-log.js): every bot action is recorded
  const escalate = premium && BL.escalationOn();

  notify("understanding", "running");
  notify("understanding", "complete", { prompt });
  const palette = A.paletteForIndustry(`${prompt || ""} ${(o.businessInfo && o.businessInfo.name) || ""}`);
  notify("designing", "running", { industry: palette });
  const lead = dirs[0];
  const stepMs = o.previewStepMs == null ? 250 : o.previewStepMs;
  const state = { stop: false };

  let modelOut = o.siteCopy || null;
  if (!modelOut) {
    // Paint something real now, instead of a blank panel for the 20-30 seconds the words take.
    try {
      if (lead) {
        notify("designing", "thinking", { label: "the words for your site" });
        const shellLook = premium ? P.looksFor(palette)[DIRECTIONS.findIndex((d) => d.id === lead.id) % P.looksFor(palette).length] : null;
        notify("designing", "partial", { variantId: lead.id, label: shellLook ? shellLook.label : lead.label, html: previewPage(palette, ["navbar", "hero", "footer"], skeletonContent(o), shellLook ? shellLook.variants : lead.set), sections: ["navigation", "hero"], progress: 8 });
      }
    } catch (err) {
      console.warn("[library-bot] preview shell skipped:", err.message);
    }
    const recipe = A.recipes[A.pickRecipe(palette)];
    // Premium looks use more sections than the plain recipe (e.g. an "about" on a landing page), so the model writes words for all of them.
    const wanted = premium ? ["hero", ...P.copyFor(palette)].filter((id, i, a) => COPY_SECTIONS.includes(id) && a.indexOf(id) === i) : recipe.order.filter((id) => COPY_SECTIONS.includes(id));
    const callModel = o.callModel || defaultCallModel(o.plan);
    const extra = require("../lib/business-info").businessInfoPrompt(o.businessInfo);
    const tCopy = Date.now();
    try {
      modelOut = await callModel({ system: systemPrompt(wanted), content: `${prompt}\n\n${extra || ""}`.trim() });
      logger.log({ bot: "copywriter", task: "write the words for the site", decision: `wrote ${Object.keys((modelOut && modelOut.sections) || {}).length} sections`, reason: null, time_ms: Date.now() - tCopy, result: "success", next_bot: null, details: { industry: palette, sections: wanted } });
    } catch (err) {
      logger.log({ bot: "copywriter", task: "write the words for the site", decision: "failed", reason: err.message, time_ms: Date.now() - tCopy, result: "fail", next_bot: null, details: { industry: palette } });
      throw err;
    }
  }
  const composed = composeContent({ prompt, businessInfo: o.businessInfo, modelOut, copy: premium ? P.copyFor(palette) : undefined });
  // Runs alongside the real build (photos, quality checks), which takes longer, so it adds no waiting.
  // In premium mode the preview grows the lead slot's own look, so what is painted matches what arrives.
  const leadLook = premium && lead ? P.looksFor(composed.palette)[DIRECTIONS.findIndex((d) => d.id === lead.id) % P.looksFor(composed.palette).length] : null;
  const growing = lead ? growPreview({ dir: leadLook ? { ...lead, label: leadLook.label, set: leadLook.variants } : lead, composed, notify, state, stepMs, order: leadLook ? leadLook.order : undefined }) : Promise.resolve();

  // One photo lookup per distinct brief across all directions.
  const memo = new Map();
  const rawSearch = o.search || ((q) => require("../image-bot").searchImage(q));
  const search = async (q) => {
    if (!memo.has(q)) {
      const t0 = Date.now();
      memo.set(q, Promise.resolve().then(() => rawSearch(q)).catch(() => null).then((r) => {
        logger.log({ bot: "photographer", task: `find a photo: ${String(q).slice(0, 80)}`, decision: r ? "found one" : "nothing found", reason: r && r.credit ? `credit: ${r.credit}` : null, time_ms: Date.now() - t0, result: r ? "success" : "fail", next_bot: null, details: {} });
        return r;
      }));
    }
    return memo.get(q);
  };
  const factsAllow = [prompt, JSON.stringify(o.businessInfo || {})];

  // One browser shared by every gate check and score in this build (started on first use, closed at the end).
  let browserP = null;
  const getBrowser = () => {
    if (o.browserChecks === false) return Promise.resolve(null);
    if (!browserP) browserP = Promise.resolve().then(() => require("playwright").chromium.launch()).catch(() => null);
    return browserP;
  };
  const used = new Set(); // premium looks already claimed by a slot, so two slots never show the same look
  let learned = null;
  if (premium && (o.bestLook || require("../lib/design-memory").enabled())) {
    learned = await Promise.resolve((o.bestLook || ((ind) => require("../lib/design-memory").bestLook(ind)))(composed.palette)).catch(() => null);
  }
  const available = new Set(Object.keys(composed.content));
  const cfg = P.config();
  const withFallback = (q) => search(q).then((r) => r || search(`${PALETTE_WORDS[composed.palette] || "business"} photo`));

  await Promise.all(
    dirs.map(async (dir) => {
      try {
        let built;
        let label = dir.label;
        let setUsed = dir.set;
        let premiumInfo = null;
        let sitePalette = composed.palette;
        if (premium) {
          const looks = P.looksFor(composed.palette);
          const slotIndex = DIRECTIONS.findIndex((d) => d.id === dir.id);
          // Design Memory (DESIGN_MEMORY=1): the first slot leads with what has scored and survived best for this industry.
          const startLook = slotIndex === 0 && learned ? learned.look : looks[slotIndex % looks.length];
          const run = escalate ? runEscalation : runSlot; // ESCALATION_HIERARCHY=0 returns to the plain premium loop
          const r = await run({
            palette: composed.palette, startLook, available, used, cfg, logger, slot: dir.id, content: composed.content, seniorEnabled: BL.seniorOn(),
            buildOne: async (look, opt) => buildDirection({ id: dir.id, label: look.label, set: look.variants }, opt.palette && opt.palette !== composed.palette ? { ...composed, palette: opt.palette } : composed, { search: opt.fallbackSearch ? withFallback : search, includeBranding: o.includeBranding !== false, factsAllow, browserChecks: o.browserChecks, recipe: P.recipeFor(look, available), browser: await getBrowser() }),
            review: async (b, look) => {
              const metrics = await S.measure(b.page.html, { browser: await getBrowser() });
              return S.score(b.page, { look, metrics, contrastFailed: b.gate.failures.some((f) => f.rule === "text-contrast") });
            },
            onReview: ({ attempt, look, score }) => {
              console.log(`[premium] ${look.id} score=${score.total} ${score.pass ? "pass" : "FAIL"} parts=${JSON.stringify(score.parts)} reasons=${score.reasons.map((x) => x.text).join("; ") || "none"} attempt=${attempt + 1}${score.partial ? " (no browser: partial)" : ""}`);
              notify("designing", "reviewing", { variantId: dir.id, label: look.label, score: score.total, pass: score.pass });
            },
            onSwap: ({ from, to, why }) => notify("designing", "swapping", { variantId: dir.id, label: to.label, why, from: from.label }),
            onLevel: ({ bot, look, why }) => notify("designing", "escalating", { variantId: dir.id, bot, label: look.label, why }),
          });
          sitePalette = r.palette || composed.palette;
          built = r.best.built;
          label = r.best.look.label;
          setUsed = r.best.look.variants;
          premiumInfo = { look: r.best.look.id, sections: built.page.sections.map((x) => ({ id: x.id, variant: x.variant })), score: r.best.score.total, parts: r.best.score.parts, reasons: r.best.score.reasons.map((x) => x.text), attempts: r.attempts.length, passed: r.passed, note: r.note, levels: r.chain || undefined, report: r.report || undefined, flagged: r.flagged || undefined };
        } else {
          const tB = Date.now();
          built = await buildDirection(dir, composed, { search, includeBranding: o.includeBranding !== false, factsAllow, browserChecks: o.browserChecks });
          logger.log({ bot: "builder", task: `build the ${dir.label} design`, decision: `${built.page.sections.length} sections, ${composed.palette} palette`, reason: built.degraded ? "the quality gate repaired the page" : null, time_ms: Date.now() - tB, result: "success", next_bot: null, details: { slot: dir.id, gateOk: built.gate.ok, steps: built.steps } });
        }
        const html = built.page.html;
        if (!/<h1\b/i.test(html) || html.length < 2000) throw new Error("the page came out empty");
        const variant = {
          id: dir.id,
          label,
          html,
          summary: `${label}: ${built.page.sections.length} sections, ${sitePalette} palette${premiumInfo && premiumInfo.note ? `. ${premiumInfo.note}` : ""}`,
          usage: null,
          verified: true,
          credits: built.page.credits || [],
          site: { engine: "section-library", palette: sitePalette, recipe: composed.recipe, content: composed.content, variants: setUsed, meta: composed.meta, direction: dir.id, look: premiumInfo ? premiumInfo.look : undefined, copy: modelOut, photos: built.page.photos || {}, baseHash: crypto.createHash("sha1").update(html).digest("hex") },
          gate: { ok: built.gate.ok, warnings: built.gate.warnings.length, degraded: built.degraded },
          premium: premiumInfo || undefined,
        };
        variants.push(variant);
        state.stop = true; // a finished design is pickable: stop the growing preview
        notify("designing", "variant-complete", { variantId: dir.id, label, summary: variant.summary, variant });
      } catch (err) {
        console.error(`[library-bot] "${dir.id}" failed:`, err.message);
        logger.log({ bot: "builder", task: `build the ${dir.label} design`, decision: "failed", reason: err.message, time_ms: null, result: "fail", next_bot: null, details: { slot: dir.id } });
        failures.push({ variant: dir.id, error: err.message });
        notify("designing", "variant-failed", { variantId: dir.id, label: dir.label, error: err.message });
      }
    })
  );
  state.stop = true;
  await growing;
  if (browserP) await browserP.then((b) => b && b.close()).catch(() => {});
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

module.exports = { generateLibraryVariants, fitLinks, composeContent, cleanSection, systemPrompt, describeSlots, DIRECTIONS, FIRST_IDS, MORE_IDS, COPY_SECTIONS, enabled: A.enabled };
