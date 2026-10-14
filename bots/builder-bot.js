"use strict";
/**
 * BUILDER bot (5 of 8). One job: put the page together. The words (research bot) and the owner's facts become `content`;
 * the content and a look become a finished page, checked by the quality gate and repaired if it fails.
 *
 *   - the OWNER's facts (name, phone, email, address, socials) go in by code, from `businessInfo`. They are never model-written.
 *   - sections that would need invented facts (testimonials, stats, pricing, team) are simply not on the page.
 *   - the LAYOUT comes from the library: one palette for the industry, four directions that are different variant sets
 *     of the same words (so "Show 2 more" costs no extra model call).
 */
const R = require("../lib/sections/render");
const A = require("../lib/sections/assemble");
const G = require("../lib/sections/quality-gate");
const { assembleWithImages } = require("../lib/sections/fill-images");
const P = require("../lib/sections/premium");
const { COPY_SECTIONS } = require("./planner-bot");
const { cleanSection, clip } = require("./site-research-bot");

const NAV_LABELS = { services: "Services", features: "Features", about: "About", gallery: "Gallery", process: "How it works", faq: "FAQ", booking: "Book", location: "Visit us" };

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
    page = { ...fixed, html, credits: page.credits, filled: page.filled, photos, unfilledRoles: page.unfilledRoles };
    g = fixed.gate;
    steps = fixed.steps || [];
    degraded = !!fixed.degraded;
  }
  return { page, gate: g, steps, degraded };
}

/** One browser shared by every gate check and score in a build (started on first use, closed at the end). */
function sharedBrowser(o) {
  let browserP = null;
  const get = () => {
    if (o.browserChecks === false) return Promise.resolve(null);
    if (!browserP) browserP = Promise.resolve().then(() => require("playwright").chromium.launch()).catch(() => null);
    return browserP;
  };
  const close = async () => { if (browserP) await browserP.then((b) => b && b.close()).catch(() => {}); };
  return { get, close };
}

/** What a premium slot calls to build one look (the premium loop passes the look and, sometimes, a different palette). */
function makeBuildOne({ dir, composed, search, withFallback, includeBranding, factsAllow, browserChecks, available, getBrowser }) {
  return async (look, opt) => buildDirection({ id: dir.id, label: look.label, set: look.variants }, opt.palette && opt.palette !== composed.palette ? { ...composed, palette: opt.palette } : composed, { search: opt.fallbackSearch ? withFallback : search, includeBranding, factsAllow, browserChecks, recipe: P.recipeFor(look, available), browser: await getBrowser() });
}

module.exports = { composeContent, fitLinks, buildDirection, factsFrom, sharedBrowser, makeBuildOne, NAV_LABELS };
