"use strict";
/**
 * Website Builder V2, Bug U: a library site as REAL pages, not one long page of anchors.
 *
 *   renderSite(site, { base, formEndpoint, includeBranding, motion }) -> { pages, nav, warnings }
 *
 * `site` is what the builder saved on the project ({ palette, recipe, content, variants, meta, photos }). Pure and fast:
 * no model, no network, so the pages are rebuilt on every request from the owner's content and never stored as HTML.
 *
 * Pages (only those that have something honest to say):
 *   /                 home: hero, a few services, gallery, call to action
 *   /menu | /services the full list (cafes say "menu"), questions, call to action
 *   /menu/<slug>      one page per item, with an "enquire" button that opens the contact form pre-filled
 *   /about            about, process
 *   /contact          contact details, map text, enquiry form
 *   /booking          booking form (local businesses and professionals only)
 *
 * Every link is a real path under `base` ("" on a live site, "/builder/sandbox/<id>/<token>" in the sandbox), so
 * copy-paste, back, refresh and new tabs all work. Forms post to the existing site-forms handler.
 */
const A = require("./assemble");
const R = require("./render");
const { dropTokens } = require("./fill-images");

const SLUG_MAX = 40;
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");

const clip = (s, n) => R.truncate(String(s == null ? "" : s), n);
const jsonForScript = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(new RegExp("[\\u2028\\u2029]", "g"), (c) => (c === String.fromCharCode(0x2028) ? "\\u2028" : "\\u2029"));
// ---------------------------------------------------------------- photos
/** Swaps IMG_n tokens for the saved photo URLs and drops the ones that never got a photo. */
function applyPhotos(content, photos) {
  const map = photos && typeof photos === "object" ? photos : {};
  const missing = new Set();
  const walk = (n) => {
    if (typeof n === "string") {
      if (/^IMG_\d+$/.test(n)) {
        if (map[n]) return map[n];
        missing.add(n);
      }
      return n;
    }
    if (Array.isArray(n)) return n.map(walk);
    if (n && typeof n === "object") return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, walk(v)]));
    return n;
  };
  const filled = walk(content || {});
  return missing.size ? dropTokens(filled, missing) : filled;
}

// ---------------------------------------------------------------- the enquiry / booking form
const FORM_CSS = `
.g-form__wrap{max-width:640px}
.g-form__form{display:grid;gap:var(--g-s2,1rem)}
.g-form__field{display:grid;gap:.35rem}
.g-form__field label{font-weight:600;font-size:var(--g-t-14,.9rem)}
.g-form__field input,.g-form__field textarea{width:100%;min-height:var(--g-tap,44px);padding:.7rem .9rem;border:1.5px solid var(--g-border,#ccc);border-radius:var(--g-radius,10px);background:var(--g-bg,#fff);color:var(--g-text,#111);font:inherit;font-size:16px}
.g-form__field textarea{min-height:7rem;resize:vertical}
.g-form__field input:focus-visible,.g-form__field textarea:focus-visible{outline:3px solid var(--g-focus,var(--g-primary));outline-offset:2px}
.g-form__row{display:grid;gap:var(--g-s2,1rem)}
@media(min-width:560px){.g-form__row{grid-template-columns:1fr 1fr}}
.g-form__hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.g-form [data-form-status]{font-size:var(--g-t-16,1rem)}
`;

const field = (id, label, type, extra = "") =>
  `<div class="g-form__field"><label for="${id}">${R.esc(label)}</label>${
    type === "textarea" ? `<textarea id="${id}" name="${id.replace("g-f-", "")}" rows="4" ${extra}></textarea>` : `<input id="${id}" name="${id.replace("g-f-", "")}" type="${type}" ${extra}>`
  }</div>`;

/**
 * The form section. kind "contact" (enquiries) or "booking" (a visit or appointment). `items` = { slug: title } lets a
 * "?item=slug" link pre-fill what the enquiry is about.
 */
function formSection(kind, { title, lead, items }) {
  const booking = kind === "booking";
  const fields = booking
    ? [
        field("g-f-name", "Your name", "text", 'required autocomplete="name"'),
        `<div class="g-form__row">${field("g-f-phone", "Phone", "tel", 'autocomplete="tel"')}${field("g-f-email", "Email", "email", 'autocomplete="email"')}</div>`,
        `<div class="g-form__row">${field("g-f-date", "Preferred date", "date", "required")}${field("g-f-time", "Preferred time", "time")}</div>`,
        field("g-f-notes", "Anything we should know?", "textarea"),
      ]
    : [
        field("g-f-name", "Your name", "text", 'required autocomplete="name"'),
        `<div class="g-form__row">${field("g-f-email", "Email", "email", 'required autocomplete="email"')}${field("g-f-phone", "Phone (optional)", "tel", 'autocomplete="tel"')}</div>`,
        field("g-f-about", "What is it about?", "text"),
        field("g-f-message", "Your message", "textarea", "required"),
      ];
  const prefill = booking || !items || !Object.keys(items).length ? "" : `<script>(function(){try{var q=new URLSearchParams(location.search).get("item"),m=${jsonForScript(items)},e=document.getElementById("g-f-about");if(q&&e&&Object.prototype.hasOwnProperty.call(m,q))e.value="Enquiry about "+m[q]}catch(x){}})()</script>`;
  return `<section class="g-sec g-sec--surface g-form" id="${booking ? "book-form" : "enquiry"}" data-gurost-section="form">
<style>${FORM_CSS}</style>
<div class="g-container g-form__wrap"><div class="g-head"><h2 class="g-title">${R.esc(title)}</h2><p class="g-lead">${R.esc(lead)}</p></div>
<form class="g-form__form" data-form-kind="${booking ? "booking" : "contact"}" method="post" action="#">
${fields.join("\n")}
<div class="g-form__hp" aria-hidden="true"><label>Leave this empty<input type="text" name="_gurost_hp" tabindex="-1" autocomplete="off"></label></div>
<button class="g-btn g-btn--primary" type="submit">${booking ? "Request this booking" : "Send message"}</button>
</form><noscript><p>This form needs JavaScript. Please use the contact details on this page instead.</p></noscript></div>
${prefill}
</section>`;
}

// ---------------------------------------------------------------- planning the pages
function labels(site) {
  const c = site.content || {};
  const kind = c.services ? "services" : c.features ? "features" : null;
  const cafe = site.palette === "cafe";
  return {
    listKind: kind,
    listLabel: kind === "features" ? "Features" : cafe ? "Menu" : "Services",
    listPath: kind === "features" ? "/features" : cafe ? "/menu" : "/services",
    booking: site.recipe === "local-business" || site.recipe === "professional",
  };
}

/** Item pages: only for services (a feature is not a thing you enquire about). */
function itemPages(site, L) {
  const c = site.content || {};
  if (L.listKind !== "services") return [];
  const seen = new Set();
  const out = [];
  for (const it of c.services.items || []) {
    if (!it || !it.title) continue;
    let slug = slugify(it.title) || "item";
    let n = 2;
    while (seen.has(slug)) slug = `${slugify(it.title).slice(0, SLUG_MAX - 3)}-${n++}`;
    seen.add(slug);
    out.push({ slug, title: it.title, text: it.text || "", path: `${L.listPath}/${slug}` });
  }
  return out;
}

/**
 * Plans the site: [{ path, title, order:[section ids], content, nav? }]. `href(path)` makes every link.
 */
function planSite(site, base) {
  const c = applyPhotos(site.content, site.photos);
  const L = labels(site);
  const href = (p) => `${base || ""}${p}`;
  const brand = (c.navbar && c.navbar.brand) || "Home";
  const items = itemPages(site, L);
  const hasBook = L.booking; // the form itself needs no owner details
  const phone = (c.footer && c.footer.phone) || (c.navbar && c.navbar.phone) || "";
  const email = (c.footer && c.footer.email) || "";

  // navigation
  const nav = [{ path: "/", label: "Home" }];
  if (L.listKind) nav.push({ path: L.listPath, label: L.listLabel });
  if (c.about) nav.push({ path: "/about", label: "About" });
  nav.push({ path: "/contact", label: "Contact" });
  if (hasBook) nav.push({ path: "/booking", label: "Book" });
  const links = nav.slice(0, 6).map((n) => ({ label: n.label, href: href(n.path) }));
  const primary = hasBook ? "/booking" : "/contact";

  const navbar = { ...(c.navbar || { brand }), brand_href: href("/"), links, cta_label: hasBook ? "Book now" : "Contact us", cta_href: href(primary) };
  const groups = [{ title: "Explore", links: links.slice(0, 5) }];
  if (items.length) groups.push({ title: L.listLabel, links: items.slice(0, 5).map((i) => ({ label: clip(i.title, 20), href: href(i.path) })) });
  const footer = { ...(c.footer || { brand }), link_groups: groups };

  const heroCta = phone ? { cta1_label: "Call us", cta1_href: "tel:" + phone.replace(/[^\d+]/g, "") } : email ? { cta1_label: "Email us", cta1_href: "mailto:" + email } : { cta1_label: "Back to home", cta1_href: href("/") };
  const inner = (headline, subhead, cta) => ({ headline: clip(headline, 70), subhead: clip(subhead || (c.hero && c.hero.subhead) || brand, 160), ...(cta || { cta1_label: "Get in touch", cta1_href: href("/contact") }) });

  const pages = [];
  const common = { navbar, footer };
  const page = (path, title, order, content, extra = {}) => pages.push({ path, title, order, content: { ...common, ...content }, ...extra });

  // home
  const homeServices = c.services && { ...c.services, items: (c.services.items || []).slice(0, 3).map((it) => {
    const m = items.find((i) => i.title === it.title);
    return m ? { ...it, href: href(m.path) } : it;
  }) };
  if (homeServices && L.listKind === "services" && (c.services.items || []).length > 3) homeServices.intro = homeServices.intro || "";
  const homeCta = c.cta && { ...c.cta, ...(c.cta.cta1_label ? { cta1_href: href(primary) } : {}) };
  page("/", brand, ["navbar", "hero", "services", "features", "gallery", "cta", "footer"], {
    hero: { ...(c.hero || {}), cta1_href: href(primary) },
    ...(homeServices ? { services: homeServices } : {}),
    ...(c.features ? { features: c.features } : {}),
    ...(c.gallery ? { gallery: c.gallery } : {}),
    ...(homeCta ? { cta: homeCta } : {}),
  });

  // list
  if (L.listKind) {
    const full = L.listKind === "services" ? { ...c.services, items: (c.services.items || []).map((it) => { const m = items.find((i) => i.title === it.title); return m ? { ...it, href: href(m.path) } : it; }) } : c.features;
    page(L.listPath, L.listLabel, ["navbar", "hero", L.listKind, "faq", "cta", "footer"], {
      hero: inner(L.listLabel, full.intro),
      [L.listKind]: full,
      ...(c.faq ? { faq: c.faq } : {}),
      ...(homeCta ? { cta: homeCta } : {}),
    });
  }

  // one page per item
  for (const it of items) {
    page(it.path, it.title, ["navbar", "hero", "cta", "footer"], {
      hero: inner(it.title, it.text, { cta1_label: "Enquire about this", cta1_href: href(`/contact?item=${it.slug}`) }),
      cta: { title: clip(`Interested in ${it.title}?`, 80), text: "Send us a message and we will get back to you.", cta1_label: "Enquire", cta1_href: href(`/contact?item=${it.slug}`), cta2_label: clip(`Back to ${L.listLabel.toLowerCase()}`, 30), cta2_href: href(L.listPath) },
    }, { item: it });
  }

  // about
  if (c.about) {
    page("/about", "About", ["navbar", "hero", "about", "process", "cta", "footer"], {
      hero: inner(`About ${brand}`, c.about.title),
      about: c.about,
      ...(c.process ? { process: c.process } : {}),
      ...(homeCta ? { cta: homeCta } : {}),
    });
  }

  // contact (always: it is where every "enquire" link goes)
  const itemMap = Object.fromEntries(items.map((i) => [i.slug, i.title]));
  page("/contact", "Contact", ["navbar", "hero", "booking", "location", "footer"], {
    hero: inner("Contact", "We would love to hear from you.", heroCta),
    ...(c.booking ? { booking: c.booking } : {}),
    ...(c.location ? { location: c.location } : {}),
  }, { form: { kind: "contact", title: "Send us a message", lead: "Fill this in and we will reply as soon as we can.", items: itemMap } });

  // booking
  if (hasBook) {
    page("/booking", "Book", ["navbar", "hero", "location", "footer"], {
      hero: inner("Book a visit", "Tell us when suits you and we will confirm.", heroCta),
      ...(c.location ? { location: c.location } : {}),
    }, { form: { kind: "booking", title: "Request a booking", lead: "This is a request, not a confirmed booking. We will get back to you to confirm." } });
  }
  return { pages, nav, brand, L };
}

// ---------------------------------------------------------------- rendering
function renderSite(site, o = {}) {
  const base = String(o.base || "").replace(/\/+$/, "");
  const plan = planSite(site, base);
  const warnings = [];
  const out = {};
  const { formScript } = require("../site-links");
  const endpoint = o.formEndpoint || null;

  for (const p of plan.pages) {
    const order = p.order.filter((id) => p.content[id]);
    const required = ["navbar", "hero", "footer"].filter((id) => order.includes(id));
    const meta = { ...(site.meta || {}), title: p.path === "/" ? (site.meta && site.meta.title) || plan.brand : `${p.title} | ${plan.brand}` };
    if (p.path !== "/") meta.description = p.item ? clip(p.item.text, 160) : (site.meta && site.meta.description) || undefined;
    const r = A.assemble({ palette: site.palette, recipe: { id: "page", order, required }, content: p.content, variants: site.variants || {}, includeBranding: o.includeBranding === true, meta, motion: o.motion });
    warnings.push(...r.warnings.map((w) => `${p.path}: ${w}`));
    let html = r.html;
    if (p.form) html = html.replace("</main>", () => `${formSection(p.form.kind, p.form)}\n</main>`);
    if (p.form && endpoint) html = html.replace(/<\/body\s*>/i, () => `${formScript(endpoint)}\n</body>`);
    out[p.path] = html;
  }
  return { pages: out, nav: plan.pages.map((p) => ({ path: p.path === "/" ? `${base}/` : `${base}${p.path}`, title: p.title })), warnings, base };
}

/** Turns a request path (under the base) into a page key: no query, no trailing slash, no .html. */
function pageKey(rel) {
  let p = String(rel || "/").split("?")[0].split("#")[0];
  try { p = decodeURIComponent(p); } catch { return null; }
  if (/[^\w\-./~%]/.test(p) || p.includes("..")) return null;
  p = "/" + p.replace(/^\/+/, "");
  p = p.replace(/\.html?$/i, "").replace(/\/index$/i, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.toLowerCase();
}

/** A page of the rendered site, or a 404 page that still has the site's navbar and footer. */
function servePage(rendered, site, rel, o = {}) {
  const key = pageKey(rel);
  if (key && rendered.pages[key]) return { status: 200, html: rendered.pages[key], key };
  const plan = planSite(site, rendered.base);
  const home = plan.pages[0];
  const r = A.assemble({
    palette: site.palette,
    recipe: { id: "page", order: ["navbar", "hero", "footer"], required: ["navbar", "hero", "footer"] },
    content: { navbar: home.content.navbar, footer: home.content.footer, hero: { headline: "Page not found", subhead: "That page does not exist. It may have moved.", cta1_label: "Back to home", cta1_href: `${rendered.base}/` } },
    variants: site.variants || {},
    includeBranding: o.includeBranding === true,
    meta: { title: `Page not found | ${plan.brand}` },
  });
  return { status: 404, html: r.html, key: null };
}

module.exports = { renderSite, servePage, planSite, pageKey, slugify, applyPhotos, formSection };
