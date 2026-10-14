"use strict";
/**
 * Industry pack: trades and home services (plumbing, electrical, heating, emergency call-outs). Words, services, prices, plans,
 * colours and art for every layout that serves this industry. Services, prices and names are EXAMPLE content for the sample site;
 * the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "plumbing", name: "Plumbing", blurb: "Leaks, taps, toilets and bathrooms, fixed properly and tidied up after.", art: "tap", items: [
    A("Leak and drip repair", "from &pound;85", "We find the source, fix it and dry the area. Most leaks are done in one visit.", { tags: ["Popular", "Fixed price"], star: true }),
    A("Tap and toilet fitting", "from &pound;95", "New taps, cisterns and seats fitted, with the old ones taken away.", { tags: ["Fixed price"] }),
    A("Blocked drain clearing", "from &pound;110", "Sinks, baths and drains cleared and flushed. We camera-check if it keeps coming back.", { tags: ["Popular"], star: true }),
    A("Bathroom refit", "quote after survey", "Design, supply and fitting from one team, with a fixed price in writing.", { tags: ["New"] }),
  ] },
  { id: "electrical", name: "Electrical", blurb: "Safe, certified electrical work for homes and small businesses.", art: "bulb", items: [
    A("Socket and light fitting", "from &pound;75", "New sockets, switches and lights, fitted neatly and tested.", { tags: ["Popular", "Fixed price"], star: true }),
    A("Fuse box upgrade", "from &pound;480", "Modern consumer unit with RCD protection and a certificate.", { tags: ["Certified"], star: true }),
    A("EV charger install", "from &pound;795", "Home charge point supplied, fitted and registered.", { tags: ["New", "Certified"], art: "bulb" }),
    A("Electrical safety report", "&pound;150", "A full EICR for landlords and buyers, with a clear pass or fail.", { tags: ["Certified"] }),
  ] },
  { id: "heating", name: "Heating and boilers", blurb: "Warm homes without the worry: boilers, radiators and yearly servicing.", art: "house", items: [
    A("Annual boiler service", "&pound;89", "Safety check, clean and efficiency report. Keeps your warranty valid.", { tags: ["Popular", "Fixed price"], star: true }),
    A("New boiler installation", "from &pound;2,150", "Supplied and fitted by Gas Safe engineers, with a 10 year warranty.", { tags: ["Certified"], star: true }),
    A("Radiator replacement", "from &pound;140", "New radiators and valves, balanced to heat evenly.", { tags: [] }),
    A("Smart thermostat fitting", "from &pound;130", "Control your heating from your phone and cut your bills.", { tags: ["New"] }),
  ] },
  { id: "emergency", name: "Emergency call-outs", blurb: "Something has gone wrong at the worst time. We answer, and we come.", art: "hardhat", items: [
    A("24-hour emergency plumber", "&pound;95 call-out", "Burst pipes, floods and no hot water. On the road within the hour.", { tags: ["24/7", "Popular"], star: true }),
    A("Emergency electrician", "&pound;95 call-out", "Power cuts, tripping circuits and burning smells, made safe fast.", { tags: ["24/7"], star: true }),
    A("No heating, no hot water", "&pound;95 call-out", "A heating engineer at your door, often the same day.", { tags: ["24/7"] }),
    A("Gas smell check", "free in an emergency", "If you smell gas, call the gas emergency line first. We follow up with a safety check.", { tags: [] }),
  ] },
].map((c) => ({
  ...c,
  photo: { plumbing: "a friendly plumber fixing a kitchen tap under a sink", electrical: "an electrician fitting a light in a bright modern home", heating: "an engineer servicing a wall-mounted boiler in a tidy utility room", emergency: "a tradesperson in a branded van arriving at a house at dusk" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { plumbing: "a plumber doing {n} in a clean home", electrical: "an electrician doing {n} in a bright home", heating: "an engineer doing {n} in a tidy home", emergency: "a tradesperson doing {n} at a house" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "Burst pipe at 9pm. Sam was here in 40 minutes and had it sorted by ten. Fantastic.", by: "Sample review, Rachel M." },
  { q: "On time, tidy and honest about the price. The fuse box upgrade was done in a morning.", by: "Sample review, Dev P." },
  { q: "Our go-to for the rental flats. Quick quotes, proper certificates, no fuss.", by: "Sample review, the Okoro family" },
];
const chef = { n: "Sam Kowalski", role: "Owner and lead engineer", bio: "Twenty years in the trade, fully qualified, and still answers the phone himself." };
const plans = [
  { n: "Care", price: "9", per: "month", blurb: "Peace of mind for one boiler.", feats: ["Annual boiler service", "10% off call-outs", "Priority booking"] },
  { n: "Care Plus", price: "16", per: "month", blurb: "Heating and plumbing cover.", feats: ["Everything in Care", "Unlimited call-out visits", "Plumbing emergencies covered"], star: true },
  { n: "Landlord", price: "29", per: "month", blurb: "For up to three properties.", feats: ["Annual safety checks", "EICR reports", "One call, one invoice"] },
];
const sup = ["Gas Safe and NICEIC registered", "Fixed prices agreed before we start", "Every job guaranteed for 12 months"];
const faq = [["Do you charge for quotes?", "No. Quotes are free and the price we give is the price you pay."], ["Are you insured?", "Yes. We carry full public liability insurance and show you the certificate on request."], ["How fast can you come?", "Emergencies, usually within the hour. Planned jobs, often within two working days."], ["Do you guarantee your work?", "Everything we fit carries a 12 month guarantee, and boilers have up to 10 years."]];
const areas = ["Manchester city centre", "Salford", "Stockport", "Sale and Altrincham", "Didsbury", "Chorlton", "Trafford", "Bury"];
const steps = [["Call or book", "Tell us what is wrong. For emergencies we pick up day and night."], ["Get a fixed price", "We confirm the cost before any work starts. No surprises."], ["We fix it, tidy up", "Fitted properly, tested, and the mess cleared away."]];

const T = {
  atelier: ":root{--accent:#D9481E;--soft:#F5F1EA;--line:#E4DACB;--ink:#1D2630;--muted:#5C6672}.hero-box{background:#101820}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#D9481E;--gold:#F2B33D;--soft:#F5F1EA;--line:#E4DACB;--ink:#1D2630;--muted:#5C6672}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#D9481E;--butter:#F9DFA0;--soft:#F5F1EA;--line:#E4DACB;--ink:#1D2630;--muted:#5C6672}",
  studio: ":root{--accent:#F2B33D}.btn-primary{color:#141B22}.tag.star{color:#141B22}",
  daylight: ":root{--accent:#C23E16}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "trades",
  label: "Trades and home services",
  ldType: "HomeAndConstructionBusiness",
  ldExtra: { areaServed: "Greater Manchester" },
  hint: "tradesperson",
  photo: "natural bright photograph of a skilled tradesperson at work in a clean home, friendly, honest, photorealistic, no text",
  videoQuery: "plumber electrician at work",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "sparks", "pipeworks", "warmth", "quoter", "vanline"],
  mediaDir: "trades",
  nav: { home: "Home", menu: "Services", cta: "Get a quote", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, plans, faq, areas, steps,
  tags: { Popular: "Our most booked", New: "New service", "Fixed price": "Price agreed before we start", Certified: "Certificate provided", "24/7": "Available day and night" },
  seo: {
    home: { title: "Plumber, electrician and heating engineer", desc: "{{business_name}} is a trusted plumber, electrician and heating engineer in {{city}}. Fixed prices, 24 hour emergencies and a 12 month guarantee. Get a free quote." },
    menu: { title: "Services and prices", desc: "See the services and prices at {{business_name}}, {{city}}: plumbing, electrical, heating and 24 hour emergency call-outs." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Free quote", submit: "Get my free quote" },
  demo: {
    business_name: "Brightwater Home Services", tagline: "Plumbers, electricians and heating engineers in Manchester. Fixed prices, tidy work and a 12 month guarantee on every job.", city: "Manchester",
    phone: "0161 555 0148", phone_href: "+441615550148", email: "hello@brightwater.example", address_line1: "Unit 4, Mill Lane", address_line2: "Manchester M4 5AB",
    hours_weekdays: "7am – 7pm", hours_saturday: "8am – 4pm", hours_sunday: "Emergencies only", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Mill+Lane+Manchester", form_endpoint: "", year_founded: "2008", owner_name: "Sam Kowalski",
    years_open: "17", clients_served: "12000", team_size: "11", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Gas Safe &amp; NICEIC registered",
      heroH1: "Fixed right, <em>first time</em>.",
      cta1: "Get a free quote", cta1Href: "#order", cta2: "See our services", cta2Href: "menu.html",
      glass: ["On call now", "24 hour emergencies", "Open {{hours_weekdays}} on weekdays. Emergencies any time, day or night."],
      promise: [["Fixed prices", "You know the cost before we start."], ["Fully certified", "Gas Safe and NICEIC registered engineers."], ["12 month guarantee", "If it is not right, we come back free."]],
      collection: ["What we do", "Four ways <em>we help</em>", "All services"],
      fav: ["Most booked", "Popular <em>jobs</em>"],
      story: { eyebrow: "About us", h2: "One van, <em>now eleven</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}} with a van and a simple rule: turn up on time, charge a fair price and leave the place tidier than we found it.", art: "toolbox", alt: "A toolbox", hint: "a friendly tradesperson smiling beside a branded van" },
      stats: [["{{years_open}}", "", "years in the trade"], ["{{clients_served}}", "+", "jobs completed"], ["{{team_size}}", "", "engineers on the team"]],
      process: ["How it works", "Three steps <em>to fixed</em>", steps],
      orderHome: "Get <em>a free quote</em>", orderMenu: "Need <em>a hand</em>?", orderLead: "Tell us what is wrong and we will call you back within the hour with a fixed price.",
      menuHero: ["Services and prices", "Our <em>services</em>", "Prices include VAT. Every quote is fixed before work begins. Emergency call-outs are available 24 hours a day."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Gas Safe &amp; NICEIC registered",
      heroH1: "Trades you can <em>trust</em>.",
      cta1: "Get a free quote", cta1Href: "#order", cta2: "See our services", cta2Href: "menu.html",
      badge: "24 hour emergencies &middot; {{phone}}",
      fav: ["Most booked", "Popular <em>jobs</em>", "The work our customers call us for most", "Book this &rarr;"],
      story: { eyebrow: "About us", h2: "One van, <em>one rule</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. We turn up on time, quote honestly and clear up after ourselves." },
      facts: [["{{years_open}}", "", "years in the trade"], ["{{clients_served}}", "+", "jobs completed"], ["{{team_size}}", "", "engineers on the team"]],
      panels: [["tap", "A kitchen tap", "Plumbing", "Leaks, taps and bathrooms.", "plumber fixing a tap", "featured"], ["bulb", "A light bulb", "Electrical", "Safe, certified electrical work.", "electrician at work", "secondary"], ["house", "A house", "Heating", "Boilers, radiators and servicing.", "boiler service", "secondary"]],
      statement: "<span>Plumbing,</span> <span>electrics,</span> <span>heating</span> <span>and</span> <span><em>fast</em></span> <span>help in {{city}}.</span>",
      orderHome: "Get <em>a free quote</em>", orderMenu: "Need <em>a hand</em>?", orderLead: "Tell us what is wrong and we will call you back within the hour with a fixed price.",
      menuHero: ["Services", "Our <em>services</em>", "Prices include VAT. Every quote is fixed before work begins."],
    },
    motion: {
      heroLines: ["Fixed", "right"],
      cta1: "Get a free quote", cta1Href: "#order", cta2: "See our services", cta2Href: "menu.html",
      marquee: ["Plumbing", "Electrics", "Heating", "Emergencies"],
      tiles: ["Our <em>services</em>", "All services"],
      nums: [["{{years_open}}", "", "Years in the trade"], ["{{clients_served}}", "+", "Jobs done"], ["{{team_size}}", "", "Engineers"]],
      about: "{{owner_name}} started {{business_name}} in {{year_founded}}. Honest quotes, tidy work and a guarantee on every job.",
      orderHome: "Call us<br><em>or book online.</em>", orderMenu: "Ready to <em>book?</em>", orderLead: "Tell us what is wrong and we will call you back within the hour with a fixed price.",
      menuHero: ["Our <em>services</em>", "Prices include VAT. Every quote is fixed before work begins."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#1D2630", crust: "#F6D58A", crustDark: "#B8431D", light: "#FFE9A8", cream: "#F5F1EA", accent: "#E5582A", accent2: "#F6B93B", shadow: "rgba(20,30,40,.38)", plate: "#FFFFFF" },
    motifs: ["wrench", "bulb", "house", "tap", "toolbox", "hardhat"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFFAF0 0%,#F6E3C2 55%,#E8C58F 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(90,60,20,.12) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { wrench: "#F4D9B0", bulb: "#FBE6A6", house: "#F6C9A8", tap: "#BFE0F2", toolbox: "#F6BFA8", hardhat: "#FBDDA0" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { wrench: "#E88A4C", bulb: "#F2B84B", house: "#E5582A", tap: "#5AA9D6", toolbox: "#D9481E", hardhat: "#F2A33A" } },
    },
    videos: {
      atelier: { T: 8, page: "#101820", sky: ["#0A1016", "#14202B", "#233647"], glow: "255,170,70", beam: "255,215,150", dust: "255,225,180", steam: "230,240,250", items: [["toolbox", 700, 650, 420, 0], ["bulb", 500, 660, 250, 0.4], ["wrench", 1010, 640, 260, 0.7]] },
      gallery: { T: 10, disc: ["#FFF0D0", "#F9D79B", "#EDB56A"], ring: "200,110,40", items: ["toolbox", "bulb", "house", "tap", "hardhat"] },
      motion: { T: 8, base: "#FBF3E4", blobs: ["#D9481E", "#F2B33D", "#1D2630", "#5AA9D6", "#F9DFA0", "#E8704A", "#2F4858"] },
    },
  },
};
