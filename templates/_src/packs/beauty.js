"use strict";
/**
 * Industry pack: beauty and tanning salon (hair, nails, face and lashes, spray tanning). Words, treatments, colours and art for
 * every layout that serves this industry. The treatments and prices are EXAMPLE content for the sample site; the platform
 * replaces them with the customer's own. "meta" is the price line ("from £42 · 60 min").
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "hair", name: "Hair", blurb: "Cuts, colour and finishes by a team that listens first.", art: "scissors", items: [
    A("Cut and finish", "from &pound;42 &middot; 60 min", "A consultation, a wash, a precision cut and a blow-dry you can recreate at home.", { tags: ["Popular"], star: true }),
    A("Colour and gloss", "from &pound;75 &middot; 2 hr", "Rich, even all-over colour with a glossing treatment for shine.", { tags: ["Patch"] }),
    A("Balayage", "from &pound;140 &middot; 3 hr", "Hand-painted, sun-kissed highlights that grow out softly.", { tags: ["Popular", "Patch"], star: true }),
    A("Blow-dry", "from &pound;28 &middot; 40 min", "Smooth, bouncy or sleek. Ideal before a party or a big day.", { tags: [] }),
  ] },
  { id: "nails", name: "Nails", blurb: "Long-lasting colour, clean finishes and a little bit of art.", art: "polish", items: [
    A("Gel manicure", "from &pound;32 &middot; 45 min", "Shape, cuticle care and two weeks of chip-free colour.", { tags: ["Popular"], star: true }),
    A("Gel pedicure", "from &pound;38 &middot; 55 min", "A soothing soak, a gentle buff and a polish that lasts.", { tags: [] }),
    A("Nail art set", "from &pound;45 &middot; 75 min", "Hand-painted designs, chrome, French or glitter. Bring a picture.", { tags: ["New"], star: true }),
    A("Infills", "from &pound;40 &middot; 60 min", "Keep your extensions looking fresh between full sets.", { tags: [] }),
  ] },
  { id: "face", name: "Face and brows", blurb: "Skin, lashes, brows and make-up for everyday and special days.", art: "lipstick", items: [
    A("Express facial", "from &pound;35 &middot; 30 min", "A deep cleanse, exfoliation and a hydrating mask. Skin looks fresh straight away.", { tags: ["Popular"], star: true }),
    A("Lash lift and tint", "from &pound;48 &middot; 50 min", "Curled, darker lashes for weeks. No mascara needed.", { tags: ["Patch"] }),
    A("Brow shape and tint", "from &pound;22 &middot; 25 min", "Shaped to your face and tinted for a soft, defined finish.", { tags: ["Patch"], star: true }),
    A("Evening make-up", "from &pound;55 &middot; 45 min", "Polished, long-wearing make-up for dinners, parties and photos.", { tags: [] }),
  ] },
  { id: "tan", name: "Tanning", blurb: "Streak-free sunless tanning that looks like you, on a good day.", art: "sun", items: [
    A("Spray tan", "from &pound;25 &middot; 20 min", "A natural colour in minutes, in a shade chosen for your skin tone.", { tags: ["Popular"], star: true }),
    A("Luxury glow tan", "from &pound;35 &middot; 30 min", "Hydrating, longer-lasting colour with a subtle luminous finish.", { tags: ["New"] }),
    A("Tan and tidy", "from &pound;45 &middot; 45 min", "A spray tan with a brow tidy and a quick manicure.", { tags: [], star: true }),
    A("Tan top-up", "from &pound;18 &middot; 15 min", "Refresh your colour between full tans, within seven days.", { tags: [] }),
  ] },
].map((c) => ({
  ...c,
  photo: { hair: "a stylist finishing a hairstyle in a bright modern salon", nails: "close-up of beautifully manicured nails", face: "a beauty therapist giving a relaxing facial", tan: "glowing sunless-tanned skin in soft daylight" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { hair: "a hairdresser doing a {n} in a bright salon", nails: "close-up of hands after a {n}", face: "a beauty therapist performing a {n}", tan: "glowing skin after a {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const T = {
  atelier: ":root{--accent:#B8476B;--soft:#FBF1F1;--line:#F0DDE0;--ink:#2A1522;--muted:#775F6B}.hero-box{background:#12080F}.hero-box::after{background:linear-gradient(180deg,rgba(18,8,15,.55) 0%,rgba(18,8,15,0) 36%,rgba(18,8,15,.74) 100%)}.tile::after{background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(30,8,22,.72))}",
  gallery: ":root{--accent:#B8476B;--gold:#D9B25A;--soft:#FBF3F2;--line:#F0E0E2;--ink:#2A1522;--muted:#7A6471}",
  motion: ":root{--accent:#B8476B;--butter:#F7D6A8;--soft:#FBF1F1;--line:#F0DDE0;--ink:#2A1522;--muted:#775F6B}.order .lead,.order .hours th,.order .f label{color:#5B2A44}",
  studio: ":root{--accent:#E8A0B5}.btn-primary{color:#1B0B14}.tag.star{color:#1B0B14}",
  daylight: ":root{--accent:#B8476B}",
};

module.exports = {
  id: "beauty",
  label: "Beauty and tanning salon",
  ldType: "BeautySalon",
  ldExtra: {},
  hint: "beauty salon",
  photo: "natural-light beauty editorial photograph, soft diffused daylight, clean modern salon, flattering true-to-life skin tones, shallow depth of field, photorealistic, no text",
  videoQuery: "hair salon beauty",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "aura", "boudoir", "swatch", "booker", "reel"],
  mediaDir: "beauty",
  nav: { home: "Home", menu: "Treatments", cta: "Book now", ctaHref: "index.html#order" },
  cats,
  tags: { Popular: "Our most booked", New: "New this season", Patch: "A patch test is needed 48 hours before" },
  seo: {
    home: { title: "Hair, nails, beauty and tanning", desc: "{{business_name}} is a beauty and tanning studio in {{city}}. Hair, nails, lashes, brows and spray tanning. Book your appointment online." },
    menu: { title: "Treatments and prices", desc: "See every treatment and price at {{business_name}}, {{city}}: hair, nails, face, brows and tanning." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Book your visit", submit: "Request my appointment" },
  demo: {
    business_name: "Glow & Co", tagline: "Hair, nails, beauty and sunless tanning, all under one roof in the heart of Manchester.", city: "Manchester",
    phone: "0161 555 0132", phone_href: "+441615550132", email: "hello@glowandco.example", address_line1: "14 Northern Quarter", address_line2: "Manchester M4 1AB",
    hours_weekdays: "9am – 7pm", hours_saturday: "9am – 6pm", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=14+Northern+Quarter+Manchester", form_endpoint: "", year_founded: "2016", owner_name: "Priya Shah",
    years_open: "9", clients_served: "14000", team_size: "12", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Hair, nails &amp; glow",
      heroH1: "Feel like <em>the best you</em>.",
      cta1: "Book now", cta1Href: "{{booking_url}}", cta2: "See treatments", cta2Href: "menu.html",
      glass: ["Open today", "Walk-ins welcome", "Open {{hours_weekdays}}. Book ahead for colour and tanning."],
      promise: [["Qualified team", "Trained, insured and proud of their craft."], ["Premium products", "Salon-grade colour, gentle skincare and long-wear polish."], ["Made for you", "A free consultation before every new treatment."]],
      collection: ["What we do", "Four ways <em>to glow</em>", "All treatments"],
      fav: ["Most booked", "Client <em>favourites</em>"],
      story: { eyebrow: "Our story", h2: "A little studio, <em>a lot of care</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} with one chair and a big idea: a salon that feels like a treat, not a chore. Today our team looks after thousands of clients every year.", art: "flower", alt: "A flower", hint: "a stylist and a client smiling in a bright salon" },
      stats: [["{{years_open}}", "", "years open"], ["{{clients_served}}", "+", "happy clients"], ["{{team_size}}", "", "team members"]],
      process: ["How booking works", "Three steps <em>to feeling great</em>", [["Choose", "Pick your treatment and a day that suits you."], ["Confirm", "We confirm your slot and send a friendly reminder."], ["Relax", "Arrive, sit back and leave glowing."]]],
      orderHome: "Book <em>your visit</em>", orderMenu: "Ready to <em>book</em>?", orderLead: "Tell us what you would like and we will confirm your appointment within a day.",
      menuHero: ["Treatments and prices", "Our <em>full menu</em>", "Prices start from the amount shown. Tell us about your hair or skin and we will quote exactly. Patch tests are needed for colour and some tints."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Hair, nails &amp; glow",
      heroH1: "Beauty, <em>made personal</em>.",
      cta1: "Book now", cta1Href: "{{booking_url}}", cta2: "See treatments", cta2Href: "menu.html",
      badge: "Open today &middot; {{hours_weekdays}}",
      fav: ["Most booked", "Client <em>favourites</em>", "Treatments clients love", "Book this &rarr;"],
      story: { eyebrow: "Our story", h2: "One chair, <em>one big idea</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. We believe looking after yourself should feel like a treat, and we have not stopped since." },
      facts: [["{{years_open}}", "", "years open"], ["{{clients_served}}", "+", "happy clients"], ["{{team_size}}", "", "team members"]],
      panels: [["scissors", "Hairdressing scissors", "Hair", "Cuts and colour tailored to you.", "hair salon styling", "featured"], ["polish", "Nail polish", "Nails", "Long-lasting colour and clean finishes.", "gel manicure", "secondary"], ["sun", "A glowing sun", "Glow", "Streak-free tanning in minutes.", "spray tan", "secondary"]],
      statement: "<span>Hair,</span> <span>nails,</span> <span>skin</span> <span>and</span> <span><em>glow</em></span> <span>in {{city}}.</span>",
      orderHome: "Book <em>your visit</em>", orderMenu: "Ready to <em>book</em>?", orderLead: "Tell us what you would like and we will confirm your appointment within a day.",
      menuHero: ["Treatments", "The <em>full</em> menu", "Prices start from the amount shown. Tell us about your hair or skin and we will quote exactly."],
    },
    motion: {
      heroLines: ["Look", "radiant"],
      cta1: "Book now", cta1Href: "{{booking_url}}", cta2: "See treatments", cta2Href: "menu.html",
      marquee: ["Hair", "Nails", "Brows", "Tanning"],
      tiles: ["What we <em>do</em>", "All treatments"],
      nums: [["{{years_open}}", "", "Years open"], ["{{clients_served}}", "+", "Happy clients"], ["{{team_size}}", "", "Team members"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Every visit starts with a chat and ends with you feeling brilliant.",
      orderHome: "Come in<br><em>and glow.</em>", orderMenu: "Ready to <em>book?</em>", orderLead: "Tell us what you would like and we will confirm your appointment within a day.",
      menuHero: ["Our <em>treatments</em>", "Prices start from the amount shown. Tell us about your hair or skin and we will quote exactly."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#2A1522", crust: "#D9B25A", crustDark: "#A67C2E", light: "#F6E3B4", cream: "#FFF4EC", accent: "#B8476B", accent2: "#F2B8C6", shadow: "rgba(80,20,50,.35)", plate: "#FFFFFF" },
    motifs: ["scissors", "polish", "lipstick", "sun", "mirror", "flower"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFF8F5 0%,#FBE6E8 55%,#F1CBD3 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(120,40,70,.10) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { scissors: "#F5C9D3", polish: "#F7D8B5", lipstick: "#E9B8C6", sun: "#FBDD9B", mirror: "#CFE3EE", flower: "#F3C2CF" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { scissors: "#F28CAA", polish: "#FFC08A", lipstick: "#E06A8B", sun: "#FFD166", mirror: "#9CCBE8", flower: "#F7A8C0" } },
    },
    videos: {
      atelier: { T: 8, page: "#12080F", sky: ["#0E060B", "#26101C", "#42182F"], glow: "255,170,150", beam: "255,215,200", dust: "255,225,215", steam: "", items: [["scissors", 700, 650, 380, 0], ["lipstick", 500, 660, 250, 0.4], ["polish", 1010, 620, 240, 0.7]] },
      gallery: { T: 10, disc: ["#FBE3E6", "#F5C7D0", "#EBAAB8"], ring: "190,110,130", items: ["scissors", "polish", "lipstick", "sun", "mirror"] },
      motion: { T: 8, base: "#FBEFF1", blobs: ["#D4607E", "#F2B8C6", "#D9B25A", "#7E3A63", "#F7D6A8", "#E78AA3", "#8E5BA3"] },
    },
  },
};
