"use strict";
/**
 * Shared pieces for the bakery templates: the default copy and menu, the {{tokens}} the content fill replaces, the page head,
 * the contact/pre-order form (posts to the existing /api/site-forms handler), the hours table and the small scripts.
 *
 * Tokens (all optional; fill() uses the owner's details, else a plain default):
 *   {{business_name}} {{tagline}} {{city}} {{phone}} {{phone_href}} {{email}} {{address_line1}} {{address_line2}}
 *   {{hours_weekdays}} {{hours_saturday}} {{hours_sunday}} {{instagram_url}} {{facebook_url}} {{maps_url}} {{form_endpoint}}
 *   {{year_founded}} {{years_baking}} {{owner_name}}
 */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const t = (name) => `{{${name}}}`;

const MENU = [
  { id: "bread", name: "Bread", blurb: "Long-fermented and baked on the stone.", art: "loaf", items: [
    { n: "Country sourdough", p: "5.20", d: "Our 36-hour loaf with a blistered crust and a soft, open crumb.", tags: ["V", "VG"], art: "loaf", star: true },
    { n: "Seeded rye", p: "5.60", d: "Dense, malty and covered in toasted seeds. Brilliant with cheese.", tags: ["V", "VG"] },
    { n: "Baguette", p: "2.80", d: "Crackling outside, airy inside. Baked every hour until noon.", tags: ["V", "VG"], art: "baguettes", star: true },
    { n: "Rosemary focaccia", p: "4.50", d: "Olive oil, sea salt and plenty of rosemary.", tags: ["V", "VG"] },
  ] },
  { id: "viennoiserie", name: "Viennoiserie", blurb: "Laminated by hand, with real butter.", art: "croissant", items: [
    { n: "Butter croissant", p: "3.10", d: "Twenty-seven layers, shatteringly crisp.", tags: ["V"], art: "croissant", star: true },
    { n: "Pain au chocolat", p: "3.40", d: "Two bars of dark chocolate inside.", tags: ["V"] },
    { n: "Almond croissant", p: "3.80", d: "Twice-baked with frangipane and toasted flakes.", tags: ["V"] },
    { n: "Cinnamon roll", p: "3.60", d: "Soft, sticky and finished with cream cheese icing.", tags: ["V"], art: "roll", star: true },
  ] },
  { id: "sweet", name: "Sweet", blurb: "Cakes and tarts, made in small batches.", art: "slice", items: [
    { n: "Lemon tart", p: "4.20", d: "Sweet pastry, sharp lemon curd, a little burnt sugar.", tags: ["V"] },
    { n: "Carrot cake", p: "4.00", d: "Spiced sponge, walnut and a thick cream cheese frosting.", tags: ["V"], art: "slice", star: true },
    { n: "Chocolate brownie", p: "3.20", d: "Fudgy in the middle, crisp at the edge.", tags: ["V", "GF"] },
    { n: "Seasonal fruit pie", p: "4.50", d: "Whatever is best this week, under a golden lattice.", tags: ["V"] },
  ] },
  { id: "drinks", name: "Drinks", blurb: "Good coffee to go with it.", art: "coffee", items: [
    { n: "Flat white", p: "3.20", d: "Double shot, silky milk.", tags: ["V"], art: "coffee", star: true },
    { n: "Filter coffee", p: "2.60", d: "A rotating single origin, with free refills.", tags: ["VG"] },
    { n: "Hot chocolate", p: "3.40", d: "Real dark chocolate, not powder.", tags: ["V"] },
    { n: "Fresh mint tea", p: "2.80", d: "A big pot with leaves from the windowsill.", tags: ["VG"] },
  ] },
];
const TAGS = { V: "Vegetarian", VG: "Vegan", GF: "Gluten free" };

const nav = (active) => [["index.html", "Home", "home"], ["menu.html", "Menu", "menu"], ["about.html", "About", "about"], ["contact.html", "Contact", "contact"]].map(([href, label, key]) => ({ href, label, current: key === active }));

/** The page head: title, description, social card, structured data for search engines, fonts and styles. */
function head({ title, desc, page, fontsPreload = [] }) {
  const ld = {
    "@context": "https://schema.org", "@type": "Bakery", name: "{{json:business_name}}", description: "{{json:tagline}}",
    telephone: "{{json:phone}}", email: "{{json:email}}", servesCuisine: "Bakery",
    address: { "@type": "PostalAddress", streetAddress: "{{json:address_line1}}", addressLocality: "{{json:city}}" },
    openingHours: ["{{json:hours_weekdays}}"], sameAs: ["{{json:instagram_url}}"],
  };
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · ${t("business_name")}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)} · ${t("business_name")}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="{{theme_color}}">
${fontsPreload.map((f) => `<link rel="preload" href="${f}" as="font" type="font/ttf" crossorigin>`).join("\n")}
<link rel="stylesheet" href="assets/style.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body data-page="${page}">
<a class="skip" href="#main">Skip to content</a>`;
}

const hoursRows = (cls = "") => `<table class="hours ${cls}"><tbody>
<tr data-days="1,2,3,4,5"><th scope="row">Monday to Friday</th><td>${t("hours_weekdays")}</td></tr>
<tr data-days="6"><th scope="row">Saturday</th><td>${t("hours_saturday")}</td></tr>
<tr data-days="0"><th scope="row">Sunday</th><td>${t("hours_sunday")}</td></tr>
</tbody></table>`;

/**
 * One form markup for every template. data-form-kind is "order" (pre-order) or "contact", the two kinds the site-forms handler
 * accepts. The honeypot field is called "website" in the request, as the handler expects.
 */
function form(kind, { submit = "Send", cls = "" } = {}) {
  const row = (a, b) => `<div class="f-row">${a}${b}</div>`;
  const fld = (id, label, type = "text", extra = "") => `<div class="f-field"><label for="${kind}-${id}">${label}</label><input id="${kind}-${id}" name="${id}" type="${type}" ${extra}></div>`;
  const area = (id, label, extra = "") => `<div class="f-field"><label for="${kind}-${id}">${label}</label><textarea id="${kind}-${id}" name="${id}" rows="4" ${extra}></textarea></div>`;
  const body = kind === "order"
    ? row(fld("name", "Your name", "text", 'required autocomplete="name"'), fld("phone", "Phone", "tel", 'autocomplete="tel"')) + fld("email", "Email", "email", 'required autocomplete="email"') + row(fld("pickup date", "Pick-up date", "date", "required"), fld("pickup time", "Pick-up time", "time")) + area("order", "What would you like?", 'required placeholder="2 country sourdough, 6 butter croissants…"')
    : row(fld("name", "Your name", "text", 'required autocomplete="name"'), fld("email", "Email", "email", 'required autocomplete="email"')) + fld("about", "What is it about?") + area("message", "Your message", "required");
  return `<form class="f ${cls}" data-form data-form-kind="${kind}" data-endpoint="${t("form_endpoint")}" novalidate>
${body}
<div class="f-hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn btn-primary" type="submit"><span>${submit}</span></button>
<p class="f-status" role="status" aria-live="polite"></p>
</form>`;
}

/** Small scripts every template shares (no libraries): menu, reveal, counters, parallax, hours highlight, forms. */
const SITE_JS = `(function () {
  "use strict";
  var d = document, w = window, reduce = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  // header: stuck state and the phone menu
  var header = $(".site-header"), toggle = $("[data-menu-toggle]"), menu = $("[data-menu]");
  function onScroll() { if (header) header.classList.toggle("is-stuck", w.scrollY > 12); }
  onScroll(); w.addEventListener("scroll", onScroll, { passive: true });
  if (toggle && menu) {
    var setMenu = function (open) { toggle.setAttribute("aria-expanded", open ? "true" : "false"); d.documentElement.classList.toggle("menu-open", open); };
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  // things fade up as they arrive
  var reveal = $$("[data-reveal]");
  if (reduce || !("IntersectionObserver" in w)) reveal.forEach(function (e) { e.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveal.forEach(function (e, i) { e.style.transitionDelay = (e.getAttribute("data-delay") || 0) + "ms"; io.observe(e); });
  }

  // numbers count up once
  var counters = $$("[data-count]");
  function run(el) {
    var end = parseFloat(el.getAttribute("data-count")), dur = 1300, t0 = null, suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = end + suffix; return; }
    (function step(ts) { t0 = t0 || ts; var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e) + suffix; if (p < 1) w.requestAnimationFrame(step); })(w.performance.now());
  }
  if ("IntersectionObserver" in w && counters.length) {
    var co = new IntersectionObserver(function (l) { l.forEach(function (en) { if (en.isIntersecting) { run(en.target); co.unobserve(en.target); } }); }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else counters.forEach(run);

  // gentle parallax on marked pieces
  var par = $$("[data-parallax]");
  if (par.length && !reduce) {
    var tick = false;
    var upd = function () { tick = false; var h = w.innerHeight; par.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.bottom < -50 || r.top > h + 50) return; var k = parseFloat(e.getAttribute("data-parallax")) || 0.08; e.style.transform = "translate3d(0," + ((r.top + r.height / 2 - h / 2) * -k).toFixed(1) + "px,0)"; }); };
    w.addEventListener("scroll", function () { if (!tick) { tick = true; w.requestAnimationFrame(upd); } }, { passive: true }); upd();
  }

  // today's opening hours
  var day = new Date().getDay();
  $$("table.hours tr").forEach(function (tr) { if ((tr.getAttribute("data-days") || "").split(",").indexOf(String(day)) > -1) tr.classList.add("is-today"); });

  // menu filter
  var chips = $$("[data-filter]");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.getAttribute("data-filter");
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
      $$("[data-cat]").forEach(function (s) { s.hidden = !(f === "all" || s.getAttribute("data-cat") === f); });
    });
  });

  // forms: send to the Gurost form handler (JSON), or show a friendly demo message when no endpoint is set
  $$("form[data-form]").forEach(function (f) {
    var status = $(".f-status", f), btn = $("button[type=submit]", f);
    var say = function (msg, ok) { status.textContent = msg; status.className = "f-status " + (ok ? "ok" : "bad"); };
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = {}, hp = "";
      $$("input,textarea,select", f).forEach(function (i) { if (!i.name) return; if (i.name === "website") { hp = i.value; return; } if (i.value && String(i.value).trim()) fields[i.name] = String(i.value).trim(); });
      var need = $$("[required]", f).filter(function (i) { return !String(i.value || "").trim(); });
      if (need.length) { say("Please fill in the highlighted fields.", false); need[0].focus(); return; }
      if (fields.email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(fields.email)) { say("Please check your email address.", false); return; }
      var url = f.getAttribute("data-endpoint") || "";
      btn.disabled = true; say("Sending…", true);
      var done = function () { f.reset(); btn.disabled = false; say(f.getAttribute("data-form-kind") === "order" ? "Thank you. Your pre-order is in and we will confirm by email." : "Thank you. We have your message and will reply soon.", true); };
      if (!/^https:\\/\\//.test(url)) { w.setTimeout(done, 500); return; }
      w.fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: f.getAttribute("data-form-kind"), fields: fields, website: hp }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Something went wrong."); done(); }); })
        .catch(function (err) { btn.disabled = false; say((err && err.message) || "Could not send. Please call us instead.", false); });
    });
  });
  // a big wordmark that always fits its line, whatever the business is called
  var fits = $$("[data-fit]");
  function fit() { fits.forEach(function (box) { var span = box.firstElementChild; if (!span) return; box.style.fontSize = "100px"; var k = box.clientWidth / Math.max(1, span.offsetWidth); box.style.fontSize = Math.max(26, Math.min(220, 100 * k * 0.985)).toFixed(1) + "px"; }); }
  if (fits.length) { fit(); w.addEventListener("resize", fit); if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit); }
  var td = $("[data-today]"); if (td) { try { td.textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch (e) {} }
  var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();
`;

/** Legal pages are stubs here: the platform fills in the owner's own policy. Written so they are honest, not decorative. */
function legal(kind) {
  const priv = kind === "privacy";
  return {
    title: priv ? "Privacy policy" : "Terms of service",
    body: priv
      ? `<p>This page explains what ${t("business_name")} does with your details. It is a starting point generated with your website: please read it and replace anything that is not true for your business.</p><h2>What we collect</h2><p>Only what you type into our forms (for example your name, email, phone number and what you would like to order). We do not use advertising trackers on this website.</p><h2>Why</h2><p>To reply to you and to prepare your order. We keep it only as long as we need it.</p><h2>Your rights</h2><p>You can ask us what we hold about you, ask us to correct it or ask us to delete it. Email <a href="mailto:${t("email")}">${t("email")}</a>.</p>`
      : `<p>These are the basic terms for using the ${t("business_name")} website and pre-ordering. They are a starting point: please read them and change anything that is not true for your business.</p><h2>Orders</h2><p>A pre-order is a request until we confirm it by email or phone. Please tell us about allergies when you order. Prices include VAT.</p><h2>Collection</h2><p>Please collect at the time you chose. Baked goods are made fresh, so we may not be able to keep late orders.</p><h2>Contact</h2><p>Questions? Email <a href="mailto:${t("email")}">${t("email")}</a> or call <a href="tel:${t("phone_href")}">${t("phone")}</a>.</p>`,
  };
}

module.exports = { esc, t, MENU, TAGS, nav, head, hoursRows, form, SITE_JS, legal };
