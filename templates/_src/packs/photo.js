"use strict";
/**
 * Industry pack: photography and weddings (wedding, portrait, family and brand photography). Words, example listings, prices,
 * colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for the sample site;
 * the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "weddings", name: "Weddings", blurb: "Natural, unhurried photographs of the whole day, from the first coffee to the last dance.", art: "ring", items: [
    A("Full day coverage", "from &pound;2,200", "Preparations to first dance, with a second photographer and an online gallery.", { tags: ["Popular"], star: true, art: "ring" }),
    A("Half day coverage", "from &pound;1,400", "Ceremony, portraits and the reception highlights, five hours together.", { tags: [], star: true, art: "bouquet" }),
    A("Elopement and micro wedding", "from &pound;900", "Two hours, a handful of guests and photographs that feel like you.", { tags: [], art: "cake" }),
    A("Engagement shoot", "&pound;250", "A relaxed session to get comfortable in front of the camera first.", { tags: ["New"], art: "camera" }),
  ] },
  { id: "portraits", name: "Portraits", blurb: "Honest, flattering portraits for people who do not love being photographed.", art: "polaroid", items: [
    A("Personal portrait", "&pound;150", "A one-hour session, ten edited photographs and a printed favourite.", { tags: ["Popular"], star: true, art: "polaroid" }),
    A("Business headshots", "&pound;120", "Clean, confident photographs for LinkedIn, your website and press.", { tags: [], star: true, art: "lens" }),
    A("Couples session", "&pound;220", "Anniversaries, proposals or just because. Outdoors or in the studio.", { tags: [], art: "ring" }),
    A("Maternity and newborn", "&pound;250", "Soft, timeless photographs, at home or in the studio.", { tags: ["New"], art: "bouquet" }),
  ] },
  { id: "family", name: "Family and events", blurb: "Real moments, laughter and the in-between bits you will want to keep.", art: "cake", items: [
    A("Family session", "&pound;220", "An hour outdoors with children, grandparents and the dog. No stiff poses.", { tags: ["Popular"], star: true, art: "polaroid" }),
    A("Birthday and party", "&pound;300 a session", "Candid coverage of the cake, the games and the guests.", { tags: [], star: true, art: "cake" }),
    A("Graduation", "&pound;120", "Gown, hat and a few proud photographs with family.", { tags: [], art: "camera" }),
    A("Christening and naming day", "&pound;260", "Quiet, respectful coverage of a day that matters.", { tags: ["New"], art: "bouquet" }),
  ] },
  { id: "brand", name: "Brand and product", blurb: "Photographs that make a small business look as good as it is.", art: "lens", items: [
    A("Product photography", "&pound;350 a half day", "Clean white-background and styled shots, ready for your shop.", { tags: ["Popular"], star: true, art: "lens" }),
    A("Food and drink", "&pound;400 a half day", "Menus, social posts and packaging, shot in your kitchen or ours.", { tags: [], star: true, art: "cake" }),
    A("Property and interiors", "&pound;180", "Bright, true-to-life photographs for lets, sales and holiday homes.", { tags: [], art: "camera" }),
    A("Brand story day", "&pound;650", "A full day with you and your team, for a year of content.", { tags: ["New"], art: "polaroid" }),
  ] },
].map((c) => ({
  ...c,
  photo: { weddings: "a bride and groom laughing together in soft evening light, natural wedding photograph", portraits: "a warm natural portrait of a smiling person in window light", family: "a family laughing together on a grassy hill at golden hour", brand: "a neatly styled product photograph on a pale surface, soft window light" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { weddings: "a wedding photograph for {n}", portraits: "a portrait photograph for {n}", family: "a family photograph for {n}", brand: "a commercial photograph for {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "She made us forget the camera was there. We cried over the gallery, and so did both mums.", by: "Sample review, Hannah and Owen" },
  { q: "I hate having my photo taken. These are the first I actually like.", by: "Sample review, Dev P." },
  { q: "Our product photos doubled our shop conversions in a month. Quick, friendly and brilliant value.", by: "Sample review, Cerys, candle maker" },
];
const chef = { n: "Mara Linden", role: "Founder and lead photographer", bio: "Mara has photographed weddings, families and small businesses since {{year_founded}}. She believes the best photographs happen when you stop performing and start enjoying yourself." };
const sup = ["Full gallery in two weeks (sample text)", "Printed albums and prints available", "Fully insured and backed up twice"];
const faq = [["How far ahead should we book?", "Weddings book 9 to 12 months ahead, especially Saturdays in summer. Portrait sessions are usually available within two weeks."], ["How many photographs do we get?", "A full wedding day is typically 500 to 700 edited images in a private online gallery you can download and share."], ["Do you travel?", "Yes. Anywhere in the UK, and abroad by arrangement. Travel is quoted before you book."], ["What if it rains?", "We plan for it. Some of the best wedding photographs happen under an umbrella. Portrait sessions can be moved free of charge."]];
const steps = [["Say hello", "Tell us your date, place and what matters most. We reply within a day."], ["Plan together", "A short call, a shot list and a timeline for the day."], ["Enjoy it", "We photograph quietly. Your gallery arrives in about two weeks."]];

const T = {
  atelier: ":root{--accent:#A8506A;--soft:#FBF1F2;--line:#EBD8DC;--ink:#2A2226;--muted:#6E5F65}.hero-box{background:#2A2226}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#A8506A;--gold:#C9A24B;--soft:#FBF1F2;--line:#EBD8DC;--ink:#2A2226;--muted:#6E5F65}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#A8506A;--butter:#F5E2B0;--soft:#FBF1F2;--line:#EBD8DC;--ink:#2A2226;--muted:#6E5F65}",
  studio: ":root{--accent:#E8C46A}.btn-primary{color:#14110A}.tag.star{color:#14110A}",
  daylight: ":root{--accent:#8C3A52}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "photo",
  label: "Photography and weddings",
  ldType: "ProfessionalService",
  ldExtra: { areaServed: "Bristol" },
  hint: "camera",
  photo: "natural bright documentary photograph of a happy couple at their wedding in soft golden light, photorealistic, no text",
  videoQuery: "wedding photographer",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "packages", "shotlist", "daycast", "grade", "prints"],
  mediaDir: "photo",
  nav: { home: "Home", menu: "Sessions", cta: "Check my date", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most booked", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Wedding, portrait and family photographer", desc: "{{business_name}} photographs weddings, families, portraits and small businesses in {{city}} and beyond. Natural, relaxed and beautifully edited." },
    menu: { title: "Sessions, packages and prices", desc: "See wedding, portrait, family and brand photography packages and prices from {{business_name}} in {{city}}." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Check my date", submit: "Check my date" },
  demo: {
    business_name: "Lumen & Lace Photography", tagline: "Natural, relaxed photographs of weddings, families and small businesses in Bristol and beyond.", city: "Bristol",
    phone: "0117 496 0182", phone_href: "+441174960182", email: "hello@lumenandlace.example", address_line1: "8 Pembroke Road", address_line2: "Bristol BS8 3BA",
    hours_weekdays: "10am – 6pm", hours_saturday: "By appointment", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Pembroke+Road+Bristol", form_endpoint: "", year_founded: "2014", owner_name: "Mara Linden",
    years_open: "11", clients_served: "420", team_size: "4", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Photographers",
      heroH1: "Photographs that <em>feel</em> like you.",
      cta1: "Check my date", cta1Href: "#order", cta2: "See sessions", cta2Href: "menu.html",
      glass: ["Enquiries today", "Date held for 7 days", "Replies {{hours_weekdays}} on weekdays, usually within a day."],
      promise: [["Unposed and natural", "Moments, not poses."], ["Gallery in two weeks", "Edited and ready to share."], ["Fully insured", "Backed up twice, always."]],
      collection: ["Sessions", "Photographs <em>for every day</em>", "All sessions"],
      fav: ["Popular", "Sessions <em>couples and families love</em>"],
      story: { eyebrow: "About us", h2: "Photographers who <em>stay out of the way</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}} to photograph real moments: the nervous laugh, the quiet glance, the in-between bits.", art: "camera", alt: "A camera", hint: "a photographer smiling behind a camera" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "stories photographed"], ["{{team_size}}", "", "photographers on the team"]],
      process: ["How it works", "Three steps <em>to photographs you love</em>", steps],
      orderHome: "Check <em>your date</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us the date, the place and what matters most. We will reply within a day.",
      menuHero: ["Sessions", "Packages <em>and prices</em>", "Prices are examples. We confirm every price in writing before you book."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Photographers",
      heroH1: "Real moments, <em>beautifully</em> kept.",
      cta1: "Check my date", cta1Href: "#order", cta2: "See sessions", cta2Href: "menu.html",
      badge: "Dates held for 7 days &middot; {{phone}}",
      fav: ["Popular", "Sessions <em>people book most</em>", "Our most booked sessions", "Book &rarr;"],
      story: { eyebrow: "About us", h2: "One team, <em>one story at a time</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. Calm, kind photographers and galleries you will open for decades." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "stories photographed"], ["{{team_size}}", "", "photographers on the team"]],
      panels: [["ring", "A diamond ring", "Weddings", "The whole day, quietly told.", "diamond ring", "featured"], ["polaroid", "An instant photograph", "Portraits", "Honest and flattering.", "instant photo", "secondary"], ["cake", "A wedding cake", "Events", "Every candle and every cheer.", "wedding cake", "secondary"]],
      statement: "<span>Gentle,</span> <span>candid,</span> <span>and</span> <span><em>always on your side</em></span> <span>in {{city}}.</span>",
      orderHome: "Check <em>your date</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us the date, the place and what matters most. We will reply within a day.",
      menuHero: ["Sessions", "Packages <em>and prices</em>", "Prices are examples. We confirm every price in writing before you book."],
    },
    motion: {
      heroLines: ["Photographs", "that feel like you"],
      cta1: "Check my date", cta1Href: "#order", cta2: "See sessions", cta2Href: "menu.html",
      marquee: ["Weddings", "Portraits", "Families", "Brands"],
      tiles: ["Our <em>sessions</em>", "All sessions"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Stories"], ["{{team_size}}", "", "Photographers"]],
      about: "{{owner_name}} started {{business_name}} in {{year_founded}}. Calm, kind photographers and galleries you will open for decades.",
      orderHome: "Got a date?<br><em>Let us hold it.</em>", orderMenu: "Ready <em>to book?</em>", orderLead: "Tell us the date, the place and what matters most. We will reply within a day.",
      menuHero: ["Packages <em>and prices</em>", "Prices are examples. We confirm every price in writing before you book."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#2A2226", crust: "#EBD3D8", crustDark: "#6B2E42", light: "#FBEFF0", cream: "#FFF8F4", accent: "#C45C78", accent2: "#E8C46A", shadow: "rgba(60,30,40,.34)", plate: "#FFFFFF" },
    motifs: ["camera", "ring", "bouquet", "lens", "polaroid", "cake"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFF9F8 0%,#F6E2E5 55%,#E6C4CB 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(90,40,55,.13) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { camera: "#F6E2E5", ring: "#FBEBC8", bouquet: "#F6E2E5", lens: "#E6E3EA", polaroid: "#FBEBC8", cake: "#F6E2E5" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { camera: "#C45C78", ring: "#E8C46A", bouquet: "#E58AA0", lens: "#3D4048", polaroid: "#E8C46A", cake: "#C45C78" } },
    },
    videos: {
      atelier: { T: 8, page: "#1C1417", sky: ["#150E12", "#271A20", "#4A2E3A"], glow: "255,200,150", beam: "255,226,190", dust: "255,238,215", steam: "245,225,230", items: [["camera", 700, 650, 430, 0], ["ring", 480, 660, 230, 0.4], ["bouquet", 1010, 650, 240, 0.7]] },
      gallery: { T: 10, disc: ["#FFF9F8", "#F6E2E5", "#E6C4CB"], ring: "196,92,120", items: ["camera", "ring", "bouquet", "polaroid", "cake"] },
      motion: { T: 8, base: "#FBF1F2", blobs: ["#C45C78", "#E8C46A", "#6B2E42", "#E58AA0", "#F5E2B0", "#3D4048", "#C9A24B"] },
    },
  },
};
