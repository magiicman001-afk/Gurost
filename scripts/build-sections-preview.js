#!/usr/bin/env node
"use strict";
// Builds public/sections-preview.html: one standalone page that shows Navbar, Hero and Footer (A/B/C) in the six
// locked palettes, on light and dark backgrounds, at phone (375px) and desktop (1440px) widths.
// Run: node scripts/build-sections-preview.js   (a test checks the committed file is up to date)
const fs = require("fs");
const path = require("path");
const R = require("../lib/sections/render");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "sections-preview.html");
// Page order of the preview, and the display names. Add a section here when it is built.
const SECTION_IDS = ["navbar", "hero", "trust-bar", "features", "about", "services", "gallery", "testimonials", "pricing", "team", "process", "stats", "faq", "booking", "footer"];
const NAMES = { navbar: "Navbar", hero: "Hero", "trust-bar": "Trust Bar", features: "Features", about: "About", services: "Services", gallery: "Gallery", testimonials: "Testimonials", pricing: "Pricing", team: "Team", process: "Process", stats: "Stats", faq: "FAQ", booking: "Booking", footer: "Footer" };
const ORDER = SECTION_IDS.flatMap((id) => ["a", "b", "c"].map((v) => `${id}-${v}`));
const FIXED_NOW = new Date(Date.UTC(2026, 0, 1)); // keeps the build reproducible (the copyright year in the preview)

const L = (label, href) => ({ label, href });
const G = (title, ...labels) => ({ title, links: labels.map((l) => L(l, "#" + l.toLowerCase().replace(/\W+/g, "-"))) });

// Sample copy only: it shows layout. No prices, ratings, years or numbers of customers anywhere.
const SAMPLES = {
  cafe: {
    brand: "Luvky Bakes", links: ["Menu", "Our story", "Order", "Visit"], cta: "Call us", phone: "0113 496 0000",
    eyebrow: "Bakery, Leeds", headline: "Fresh bread, baked every morning", subhead: "Small-batch sourdough and pastries, made by hand in the heart of town.",
    cta2: "See the menu", brief: "Loaves of sourdough on a wooden counter", trust: "12 High Street, Leeds",
    tagline: "Small-batch bread, baked daily.", address: "12 High Street, Leeds", email: "hello@luvky.example", hours: "Mon to Sat, early until mid-afternoon",
    groups: [G("Explore", "Menu", "Our story", "Order"), G("Help", "Find us", "Contact")], ctaTitle: "Order for tomorrow",
  },
  law: {
    brand: "Hartwell & Co", links: ["Services", "About", "Insights", "Contact"], cta: "Contact us", phone: "020 7946 0000",
    eyebrow: "Solicitors, London", headline: "Clear advice when it matters most", subhead: "Property, family and business law explained in plain English by people who listen first.",
    cta2: "Our services", brief: "A quiet, well-lit office with a desk and bookshelves", trust: "Bloomsbury, London",
    tagline: "Plain-English legal advice.", address: "5 Gray's Inn Road, London", email: "enquiries@hartwell.example", hours: "Mon to Fri, office hours",
    groups: [G("Practice", "Property", "Family", "Business"), G("Firm", "About", "Contact")], ctaTitle: "Speak to a solicitor",
  },
  salon: {
    brand: "Maison Lune", links: ["Services", "Stylists", "Gallery", "Visit"], cta: "Book now", phone: "0161 496 0000",
    eyebrow: "Hair studio, Manchester", headline: "Hair that feels like you", subhead: "Cuts, colour and care in a calm, welcoming studio.",
    cta2: "View services", brief: "A stylist finishing a client's blow-dry in a bright studio", trust: "Northern Quarter, Manchester",
    tagline: "A calm place to look and feel your best.", address: "8 Dale Street, Manchester", email: "hello@maisonlune.example", hours: "Tue to Sat, by appointment",
    groups: [G("Studio", "Services", "Stylists", "Gallery"), G("Visit", "Find us", "Contact")], ctaTitle: "Book your next visit",
  },
  trades: {
    brand: "Brightspark Electrical", links: ["Services", "Areas", "About", "Contact"], cta: "Call now", phone: "0121 496 0000",
    eyebrow: "Electricians, Birmingham", headline: "Reliable electricians, on time", subhead: "Rewires, repairs and safety checks, done properly and tidied up after.",
    cta2: "Get a quote", brief: "An electrician fitting a consumer unit in a home", trust: "Birmingham and surrounding areas",
    tagline: "Safe, tidy, dependable electrical work.", address: "Unit 4, Soho Road, Birmingham", email: "jobs@brightspark.example", hours: "Mon to Sat, call for emergencies",
    groups: [G("Services", "Rewires", "Repairs", "Safety checks"), G("Company", "About", "Contact")], ctaTitle: "Need an electrician?",
  },
  health: {
    brand: "Greenfield Clinic", links: ["Treatments", "Team", "Patients", "Contact"], cta: "Call us", phone: "0117 496 0000",
    eyebrow: "Physiotherapy, Bristol", headline: "Care that gets you moving again", subhead: "Friendly, one-to-one appointments in a calm, accessible clinic.",
    cta2: "Our treatments", brief: "A physiotherapist talking with a patient in a bright treatment room", trust: "Clifton, Bristol",
    tagline: "Calm, friendly, one-to-one care.", address: "3 Park Street, Bristol", email: "reception@greenfield.example", hours: "Mon to Fri, appointments only",
    groups: [G("Clinic", "Treatments", "Team", "Patients"), G("Visit", "Find us", "Contact")], ctaTitle: "Book an appointment",
  },
  tech: {
    brand: "Northwind", links: ["Product", "Docs", "Company", "Contact"], cta: "Book a demo", phone: "",
    eyebrow: "Software studio", headline: "Software that gets out of the way", subhead: "We design and build focused tools for teams who value their time.",
    cta2: "Read the docs", brief: "", trust: "",
    tagline: "Focused software for busy teams.", address: "", email: "hello@northwind.example", hours: "",
    groups: [G("Product", "Overview", "Docs", "Changelog"), G("Company", "About", "Contact")], ctaTitle: "See it in action",
  },
};

// Sample copy for the content sections (layout only; no prices, ratings, counts or years).
const T = (label, detail) => ({ label, detail });
const SECTION_SAMPLES = {
  cafe: {
    trust: [{ icon: "leaf", label: "Baked fresh daily", detail: "Small batches, early morning" }, { icon: "heart", label: "Made by hand", detail: "Real ingredients" }, { icon: "truck", label: "Local delivery" }, { icon: "home", label: "Family run" }],
    features: ["Slow-fermented sourdough|A long, gentle rise for flavour and a proper crust.|leaf", "Pastries from scratch|Butter, flour and patience, nothing from a packet.|heart", "Orders for any occasion|Celebration cakes and party boxes made to order.|calendar"],
    about: ["Our story", "A neighbourhood bakery with a simple idea", "We bake in small batches every morning, using real ingredients and recipes we have refined by hand.", "Come in for a coffee, stay for the smell of fresh bread.", ["Real butter, always", "Baked every morning", "Made to order"]],
    services: ["Fresh bread|Loaves baked every morning.|home|#menu", "Pastries|Croissants, buns and seasonal bakes.|heart|#menu", "Celebration cakes|Made to order for your day.|sparkle|#order", "Catering|Boxes and platters for groups.|truck|#contact"],
  },
  law: {
    trust: [{ icon: "shield", label: "Regulated and insured", detail: "Add your regulator" }, { icon: "users", label: "Plain-English advice" }, { icon: "clock", label: "Prompt replies" }, { icon: "check", label: "Clear fixed terms" }],
    features: ["Advice you can follow|We explain your options without the jargon.|users", "Straight answers|You know the next step after every call.|check", "A named contact|One person who knows your matter.|phone"],
    about: ["About the firm", "Independent advice, explained properly", "We are a small firm that puts clients first, with clear communication from the first call to the final letter.", "", ["Plain English", "Named contact", "Clear next steps"]],
    services: ["Property|Buying, selling and leases.|home|#property", "Family|Sensitive matters handled with care.|heart|#family", "Business|Contracts, disputes and advice.|award|#business", "Wills and probate|Planning ahead and settling estates.|shield|#wills"],
  },
  salon: {
    trust: [{ icon: "sparkle", label: "Gentle on your hair" }, { icon: "heart", label: "Friendly studio" }, { icon: "calendar", label: "Easy online booking" }, { icon: "leaf", label: "Kind products" }],
    features: ["A proper consultation|We listen first, then plan the look together.|users", "Colour with care|Techniques that protect condition and shine.|sparkle", "Time to unwind|A calm space and a cup of tea.|heart"],
    about: ["Our studio", "A calm place to feel like yourself", "Our stylists take time to understand your hair and your day-to-day, so every visit leaves you looking and feeling good.", "", ["Consultation first", "Kind products", "No rush"]],
    services: ["Cut and finish|Tailored to you.|sparkle|#book", "Colour|From subtle to bold.|heart|#book", "Treatments|Care for hair and scalp.|leaf|#book", "Occasion styling|For your big day.|calendar|#book"],
  },
  trades: {
    trust: [{ icon: "shield", label: "Fully insured" }, { icon: "clock", label: "On time" }, { icon: "tool", label: "Tidy work" }, { icon: "phone", label: "Free quotes" }],
    features: ["Safe and certified|Work done to the standard, signed off properly.|shield", "Clear quotes|You know what it covers before we start.|check", "We tidy up|Your home left as we found it.|home"],
    about: ["About us", "Local electricians you can rely on", "We are a small team that turns up when we say we will, explains the job and leaves things neat.", "Call us for a straight answer and an honest quote.", ["Turn up on time", "Honest quotes", "Tidy finish"]],
    services: ["Rewires|Full and partial rewires.|tool|#quote", "Repairs|Faults found and fixed.|check|#quote", "Safety checks|Reports for homes and landlords.|shield|#quote", "Lighting|Indoor and outdoor.|sparkle|#quote"],
  },
  health: {
    trust: [{ icon: "shield", label: "Qualified practitioners", detail: "Add your registration" }, { icon: "heart", label: "One-to-one care" }, { icon: "home", label: "Accessible clinic" }, { icon: "calendar", label: "Easy booking" }],
    features: ["Time to listen|Appointments that are not rushed.|heart", "A plan that fits|Simple steps you can follow at home.|check", "A calm clinic|Welcoming, clean and easy to reach.|home"],
    about: ["About the clinic", "Friendly care in a calm setting", "We take time to understand how you are, then agree a plan with you, one step at a time.", "", ["Unhurried appointments", "Clear plans", "Easy access"]],
    services: ["Assessment|A thorough first appointment.|check|#book", "Treatment|Hands-on care and guidance.|heart|#book", "Exercise plans|Simple routines for home.|users|#book", "Follow-up|Check in and adjust.|calendar|#book"],
  },
  tech: {
    trust: [{ icon: "shield", label: "Security first" }, { icon: "clock", label: "Fast setup" }, { icon: "users", label: "Built with teams" }, { icon: "check", label: "No lock-in" }],
    features: ["Focused by design|Only the tools you use every day.|sparkle", "Works with your stack|Connects to the apps you already have.|tool", "Your data, your control|Export everything, any time.|shield"],
    about: ["About us", "A small studio building focused tools", "We design and build software for teams that value their time, with a bias for simple, fast and well-made.", "", ["Simple by default", "Fast", "Well made"]],
    services: ["Product design|From idea to prototype.|sparkle|#contact", "Engineering|Reliable, maintainable code.|tool|#contact", "Integrations|Connect your tools.|check|#contact", "Support|Real people, quick replies.|users|#contact"],
  },
};

function renderFor(palId) {
  const s = SAMPLES[palId];
  const pal = R.getPalette(palId);
  const tone = pal.footerTone === "dark" ? "dark" : "light";
  const nav = { brand: s.brand, links: s.links.map((l) => L(l, "#" + l.toLowerCase().replace(/\W+/g, "-"))), cta_label: s.cta, cta_href: "#contact", phone: s.phone };
  const hero = { eyebrow: s.eyebrow, headline: s.headline, subhead: s.subhead, cta1_label: s.cta, cta1_href: "#contact", cta2_label: s.cta2, cta2_href: "#services", image: "IMG_1", image_brief: s.brief || "Photo placeholder", image_alt: s.brief || "Photo placeholder", trust_line: s.trust, tone };
  const foot = {
    brand: s.brand, tagline: s.tagline, link_groups: s.groups, address: s.address, phone: s.phone, email: s.email, hours: s.hours,
    socials: [{ platform: "instagram", url: "https://instagram.com/example" }, { platform: "facebook", url: "https://facebook.com/example" }],
    cta_title: s.ctaTitle, cta_label: s.cta, cta_href: "#contact", show_gurost_credit: true, tone,
  };
  const x = SECTION_SAMPLES[palId];
  const pair = (str) => str.split("|");
  const trust = { items: x.trust.map((t) => ({ icon: t.icon, label: t.label, detail: t.detail || "" })) };
  const features = { eyebrow: "Why choose us", title: "What makes us different", intro: "", items: x.features.map((f) => { const [title, text, icon] = pair(f); return { icon, title, text }; }) };
  const about = { eyebrow: x.about[0], title: x.about[1], body: x.about[2], body2: x.about[3], points: x.about[4].map((text) => ({ text })), image: "IMG_1", image_brief: s.brief || "Photo placeholder", image_alt: s.brief || "Photo placeholder", cta_label: "Get in touch", cta_href: "#contact" };
  const services = { eyebrow: "What we do", title: "Our services", intro: "", items: x.services.map((v) => { const [title, text, icon, href] = pair(v); return { icon, title, text, href }; }) };
  const briefs = { cafe: ["Fresh loaves cooling", "Flaky croissants", "Celebration cake", "Coffee and a bun", "Baker at work", "Shop counter"], law: ["Reception", "Meeting room", "Office exterior", "Desk and documents", "Team meeting", "Waiting area"], salon: ["Styling chair", "Colour in progress", "Finished cut", "Products shelf", "Salon interior", "Blow-dry"], trades: ["Fuse board upgrade", "New lighting", "Tidy cabling", "Van and tools", "Finished kitchen", "Safety test"], health: ["Treatment room", "Reception", "Exercise area", "Clinic exterior", "Consultation", "Waiting room"], tech: ["Product screenshot", "Team workshop", "Dashboard", "Mobile view", "Office", "Prototype"] }[palId];
  const gallery = { eyebrow: "Gallery", title: "A look around", intro: "", images: briefs.map((b, i) => ({ image: "IMG_" + (i + 1), brief: b, alt: b, caption: i % 2 ? "" : b })) };
  const testimonials = { eyebrow: "Kind words", title: "What customers say", intro: "", items: [1, 2, 3].map(() => ({ quote: "[Add a real customer review]", name: "[Add customer name]", role: "" })) };
  const pricing = { eyebrow: "Pricing", title: "Simple, clear pricing", intro: "", note: "[Add your pricing note]", plans: x.services.slice(0, 3).map((v, i) => ({ name: pair(v)[0], text: pair(v)[1], features: [{ text: "[Add what is included]" }, { text: "[Add what is included]" }], cta_label: s.cta, cta_href: "#contact", featured: i === 1 })) };
  const team = { eyebrow: "The team", title: "Meet the people", intro: "", members: [1, 2, 3].map((n) => ({ name: "[Add team member " + n + "]", role: "[Add role]", bio: "" })) };
  const steps = { cafe: ["Choose", "Order", "Collect"], law: ["Call us", "We advise", "We act"], salon: ["Book", "Consult", "Enjoy"], trades: ["Get in touch", "Free quote", "We do the work"], health: ["Book", "Assessment", "Your plan"], tech: ["Sign up", "Connect", "Go live"] }[palId];
  const process = { eyebrow: "How it works", title: "Three simple steps", intro: "", steps: steps.map((title) => ({ title, text: "[Add a short description]" })) };
  const stats = { eyebrow: "", title: "In numbers", intro: "", items: ["Customers", "Years open", "Projects"].map((label) => ({ value: "[Add number]", label })) };
  const faq = { eyebrow: "FAQ", title: "Common questions", intro: "", items: [1, 2, 3, 4].map((n) => ({ question: "[Add question " + n + "]", answer: "[Add the answer your customers need]" })) };
  const booking = { eyebrow: "Get in touch", title: "Ready when you are", intro: "", methods: [{ label: "Call", value: s.phone || "[Add phone]", href: "#contact" }, { label: "Email", value: s.email || "[Add email]", href: "#contact" }, { label: "Hours", value: s.hours || "[Add your opening hours]" }], cta_label: s.cta, cta_href: "#contact", note: "" };
  const out = {};
  for (const v of ["a", "b", "c"]) {
    for (const [id, c] of Object.entries({ process, stats, faq, booking })) out[id + "-" + v] = R.renderSection(id, v, c, { now: FIXED_NOW }).html;
    out["gallery-" + v] = R.renderSection("gallery", v, gallery, { now: FIXED_NOW }).html;
    out["testimonials-" + v] = R.renderSection("testimonials", v, testimonials, { now: FIXED_NOW }).html;
    out["pricing-" + v] = R.renderSection("pricing", v, pricing, { now: FIXED_NOW }).html;
    out["team-" + v] = R.renderSection("team", v, team, { now: FIXED_NOW }).html;
    out["trust-bar-" + v] = R.renderSection("trust-bar", v, trust, { now: FIXED_NOW }).html;
    out["features-" + v] = R.renderSection("features", v, features, { now: FIXED_NOW }).html;
    out["about-" + v] = R.renderSection("about", v, about, { now: FIXED_NOW }).html;
    out["services-" + v] = R.renderSection("services", v, services, { now: FIXED_NOW }).html;
    out["navbar-" + v] = R.renderSection("navbar", v, { ...nav, tone: v === "c" ? "dark" : tone === "dark" ? "dark" : "light" }, { now: FIXED_NOW, noSwap: true }).html;
    out["hero-" + v] = R.renderSection("hero", v, hero, { now: FIXED_NOW, noSwap: true }).html;
    out["footer-" + v] = R.renderSection("footer", v, foot, { now: FIXED_NOW }).html;
  }
  return out;
}

function build() {
  const read = (f) => fs.readFileSync(path.join(ROOT, "lib", "sections", f), "utf8");
  const data = {
    palettes: Object.fromEntries(
      Object.keys(R.palettes.palettes).map((id) => {
        const p = R.getPalette(id);
        return [id, { name: p.name, css: R.paletteCss(id), fonts: R.googleFontsHref(id), tone: p.footerTone, colors: { primary: p.colors.primary, accent: p.colors.accent, surface: p.colors.surface, dark: p.colors.dark }, sections: renderFor(id) }];
      })
    ),
    css: R.baseCss() + "\n" + SECTION_IDS.map((s) => read(`${s}/${s}.css`)).join("\n"),
    order: ORDER,
    names: NAMES,
  };
  // JSON inside a <script>: make "</" and U+2028/9 safe.
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return TEMPLATE.replace("/*DATA*/null", () => json);
}

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Gurost section preview</title>
<style>
  :root { color-scheme: light; --bg:#f4f4f5; --fg:#18181b; --line:#d4d4d8; --ink:#27272a; }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; background:var(--bg); color:var(--fg); }
  header.pv { background:#fff; border-bottom:1px solid var(--line); padding:12px 16px; }
  header.pv h1 { margin:0 0 4px; font-size:17px; }
  .row { display:flex; gap:8px; align-items:center; margin-top:8px; overflow-x:auto; -webkit-overflow-scrolling:touch; padding-bottom:2px; }
  .row > span { display:flex; gap:8px; }
  select.pick { min-height:44px; font:inherit; padding:0 12px; border:1px solid var(--line); border-radius:8px; background:#fff; color:var(--ink); max-width:100%; }
  .row b { flex:none; font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:#52525b; min-width:64px; }
  button.chip { flex:none; white-space:nowrap; min-height:44px; padding:0 14px; border:1px solid var(--line); border-radius:999px; background:#fff; font:inherit; cursor:pointer; color:var(--ink); }
  button.chip[aria-pressed="true"] { background:var(--ink); color:#fff; border-color:var(--ink); }
  .dot { display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px; vertical-align:-1px; border:1px solid rgba(0,0,0,.2); }
  main.pv { padding:16px; }
  .note { font-size:13px; color:#52525b; margin:0 0 12px; }
  .stage { display:flex; justify-content:center; }
  main.pv { padding:12px 0; }
  .note { padding:0 16px; }
  iframe { display:block; border:1px solid var(--line); background:#fff; width:100%; max-width:100%; height:400px; }
  iframe.w375 { width:375px; max-width:100%; }
  iframe.w1440 { width:1440px; }
  .scroll { overflow:auto; }
</style>
</head>
<body>
<header class="pv">
  <h1>Gurost section library (A / B / C)</h1>
  <div class="row"><b>Palette</b><span id="pal"></span></div>
  <div class="row"><b>Width</b><span id="wid"></span></div>
  <div class="row"><b>Backdrop</b><span id="bgs"></span></div>
  <div class="row"><b>Show</b><span id="sec"></span></div>
</header>
<main class="pv">
  <p class="note">Sample copy only, to show layout. Photos are placeholders. Fonts load from Google Fonts. Add <code>?palette=law&amp;width=375&amp;only=hero-b&amp;bg=dark&amp;bare=1</code> to the address to link to one view.</p>
  <div class="scroll"><div class="stage"><iframe id="frame" title="Section preview"></iframe></div></div>
</main>
<script>
(function () {
  var DATA = /*DATA*/null;
  var q = new URLSearchParams(location.search);
  var state = {
    palette: DATA.palettes[q.get("palette")] ? q.get("palette") : "cafe",
    width: q.get("width") === "1440" ? "1440" : "375",
    bg: q.get("bg") === "dark" ? "dark" : "light",
    only: DATA.order.indexOf(q.get("only")) >= 0 ? q.get("only") : "all"
  };
  var NAMES = DATA.names;

  function label(id) { var i = id.lastIndexOf("-"); return NAMES[id.slice(0, i)] + " " + id.slice(i + 1).toUpperCase(); }

  function placeholderImage(p) {
    var c = DATA.palettes[p].colors;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c.primary + '"/><stop offset="1" stop-color="' + c.accent + '"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><circle cx="600" cy="170" r="110" fill="' + c.surface + '" fill-opacity=".35"/><rect x="90" y="360" width="420" height="40" rx="20" fill="' + c.surface + '" fill-opacity=".3"/></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function buildDoc() {
    var pal = DATA.palettes[state.palette];
    var ids = state.only === "all" ? DATA.order : [state.only];
    var img = placeholderImage(state.palette);
    var body = ids.map(function (id) {
      var html = pal.sections[id].replace(/src="IMG_\\d+"/g, 'src="' + img + '"').split("g-nav-panel").join("g-nav-panel-" + id);
      var wrap = id === "navbar-c" ? '<div class="pv-stub">' + html + '<p class="pv-stubnote">Transparent navbar sits over a hero photo</p></div>' : html;
      return '<div class="pv-label">' + label(id) + "</div>" + wrap;
    }).join("");
    var bgVar = state.bg === "dark" ? "var(--g-dark)" : "var(--g-bg)";
    var fg = state.bg === "dark" ? "var(--g-on-dark)" : "var(--g-text)";
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link rel="stylesheet" href="' + pal.fonts + '">' +
      "<style>" + pal.css + DATA.css +
      ".pv-label{font:600 12px/1 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:14px 16px 8px;color:" + fg + ";background:" + bgVar + ";}" +
      ".pv-stub{position:relative;min-height:240px;background:var(--g-dark);}" +
      ".pv-stubnote{position:absolute;left:16px;bottom:12px;margin:0;font:14px/1.4 system-ui,sans-serif;color:var(--g-on-dark);}" +
      ".pv-body{background:" + bgVar + ";}" +
      "</style></head><body class='g-page pv-body' data-industry='" + state.palette + "'>" + body + "</body></html>";
  }

  function chips(host, items, key) {
    host.innerHTML = "";
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip";
      b.setAttribute("aria-pressed", String(state[key] === it.value));
      b.innerHTML = it.html;
      b.addEventListener("click", function () { state[key] = it.value; render(); });
      host.appendChild(b);
    });
  }

  function render() {
    var f = document.getElementById("frame");
    chips(document.getElementById("pal"), Object.keys(DATA.palettes).map(function (id) {
      return { value: id, html: '<span class="dot" style="background:' + DATA.palettes[id].colors.primary + '"></span>' + DATA.palettes[id].name };
    }), "palette");
    chips(document.getElementById("wid"), [{ value: "375", html: "Phone 375" }, { value: "1440", html: "Desktop 1440" }], "width");
    chips(document.getElementById("bgs"), [{ value: "light", html: "Light" }, { value: "dark", html: "Dark" }], "bg");
    var host = document.getElementById("sec");
    host.innerHTML = "";
    var sel = document.createElement("select");
    sel.className = "pick"; sel.setAttribute("aria-label", "Section");
    [["all", "All " + DATA.order.length + " sections"]].concat(DATA.order.map(function (id) { return [id, label(id)]; })).forEach(function (o) {
      var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; op.selected = state.only === o[0]; sel.appendChild(op);
    });
    sel.addEventListener("change", function () { state.only = sel.value; render(); });
    host.appendChild(sel);
    f.className = "w" + state.width;
    f.onload = function () {
      try { var d = f.contentDocument; f.style.height = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight) + "px"; } catch (e) {}
    };
    f.style.height = Math.max(window.innerHeight, 500) + "px"; // start from a screen-sized frame so vh-based sections measure sensibly
    f.srcdoc = buildDoc();
  }

  if (q.get("bare") === "1") {
    window.addEventListener("load", function () { setTimeout(function () { document.open(); document.write(buildDoc()); document.close(); }, 0); });
  } else {
    render();
  }
})();
</script>
</body>
</html>
`;

if (require.main === module) {
  fs.writeFileSync(OUT, build());
  console.log("wrote " + path.relative(ROOT, OUT));
}
module.exports = { build, SAMPLES, OUT, SECTION_IDS };
