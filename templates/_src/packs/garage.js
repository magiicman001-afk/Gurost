"use strict";
/**
 * Industry pack: garage and MOT centre (MOT, servicing, tyres, repairs, used cars). Words, example
 * listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for
 * the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "mot", name: "MOT and servicing", blurb: "Honest checks, fixed prices and a text when your car is ready.", art: "hatch", items: [
    A("MOT test", "&pound;45", "A full class 4 MOT, with a free retest within 10 working days if it fails.", { tags: ["Popular"], star: true, art: "hatch" }),
    A("Interim service", "from &pound;129", "Oil and filter, fluid top-ups and a 30 point health check every 6 months.", { tags: [], star: true, art: "oilcan" }),
    A("Full service", "from &pound;219", "Everything in an interim service plus air, fuel and pollen filters and spark plugs where due.", { tags: ["Popular"], art: "plug" }),
    A("Pre-purchase inspection", "from &pound;99", "A second pair of eyes before you buy a used car, with a written report.", { tags: ["New"], art: "hatch" }),
  ] },
  { id: "tyres", name: "Tyres and brakes", blurb: "Safe stopping and grip, fitted the same day for most cars.", art: "tyre", items: [
    A("New tyres, fitted", "from &pound;58 each", "Budget, mid-range and premium brands, with fitting, balancing and a new valve.", { tags: ["Popular"], star: true }),
    A("Wheel alignment", "&pound;49", "Laser-checked tracking to stop uneven wear and a pulling steering wheel.", { tags: [], art: "tyre" }),
    A("Brake pads and discs", "from &pound;139 an axle", "Quality parts, fitted and road-tested, with a 12 month guarantee.", { tags: [], star: true, art: "rotor" }),
    A("Puncture repair", "&pound;20", "Fixed properly from the inside, usually while you wait.", { tags: [], art: "tyre" }),
  ] },
  { id: "repairs", name: "Repairs and diagnostics", blurb: "Warning light on? We find the fault before we quote the fix.", art: "plug", items: [
    A("Diagnostic scan", "&pound;45", "We read the fault codes, explain them, and take the fee off any repair we do.", { tags: ["Popular"], star: true, art: "plug" }),
    A("Battery test and fit", "from &pound;95", "Free test. If you need a new battery, we fit it in 20 minutes.", { tags: [], star: true, art: "battery" }),
    A("Clutch and gearbox", "from &pound;380", "Slipping, juddering or grinding? A clear quote before any work starts.", { tags: [], art: "rotor" }),
    A("Air conditioning regas", "from &pound;69", "Cold air again, with a leak check included.", { tags: ["New"], art: "oilcan" }),
  ] },
  { id: "cars", name: "Used cars", blurb: "Small, honest forecourt. Every car is checked in our own workshop.", art: "hatch", items: [
    A("Everyday hatchbacks", "from &pound;4,995", "Cheap to run, easy to park, with a 3 month warranty.", { tags: ["Popular"], star: true }),
    A("Family estates and SUVs", "from &pound;8,995", "Room for the kids, the dog and the shopping, all fully serviced.", { tags: [], star: true }),
    A("Electric and hybrid", "from &pound;11,495", "Battery health reports on every car, and a charging guide for first-timers.", { tags: ["New"] }),
    A("Part exchange", "free valuation", "A fair, written offer in 15 minutes, with no obligation to buy.", { tags: [], art: "battery" }),
  ] },
].map((c) => ({
  ...c,
  photo: { mot: "a friendly mechanic checking a car on a ramp in a clean modern garage", tyres: "a mechanic fitting a new alloy wheel and tyre in a bright workshop", repairs: "a technician running a diagnostic scan on a car with a tablet", cars: "a row of clean used hatchbacks on a small forecourt in soft morning light" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { mot: "a mechanic doing {n}", tyres: "a mechanic doing {n}", repairs: "a technician doing {n}", cars: "a clean used car, {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "They told me the car did not need the work another garage quoted for. I now take everything there.", by: "Sample review, Daniel R." },
  { q: "MOT booked online at 8pm, done by lunch, and a text with the photo of my worn tyre. Brilliant.", by: "Sample review, Priya S." },
  { q: "Bought a used Yaris. They showed me the whole check sheet before I signed anything.", by: "Sample review, Mrs Okafor" },
];
const chef = { n: "Tom Ironside", role: "Owner and master technician", bio: "A Sheffield mechanic for 22 years, Tom opened Ironside Motors to give drivers straight answers, photos of every fault and a fixed price before the work starts." };
const sup = ["MOT testing station approved by the DVSA (sample text)", "12 month guarantee on parts and labour", "Photos of every fault, sent to your phone"];
const faq = [["How long does an MOT take?", "Usually 45 minutes. Book in the morning and you can often drive away at lunch. We can wait with you or drop you in town."], ["Will you ring before doing extra work?", "Always. We show you a photo and the price first. Nothing is done without your yes."], ["Do you do courtesy cars?", "Yes, a small number of free courtesy cars for services and repairs. Ask when you book."], ["Can I pay by instalments?", "For bigger repairs and tyres we offer interest-free payments over 3 months. Subject to status."]];
const steps = [["Tell us the problem", "Book online, call or pop in. Tell us the reg and what is wrong."], ["We check and show you", "A technician inspects the car and sends photos with a clear, fixed price."], ["Fixed and ready", "We do the work, road-test it and text you when it is ready to collect."]];

const T = {
  atelier: ":root{--accent:#E5601A;--soft:#F3F4F6;--line:#D9DDE3;--ink:#161B22;--muted:#596270}.hero-box{background:#161B22}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#E5601A;--gold:#FFC857;--soft:#F3F4F6;--line:#D9DDE3;--ink:#161B22;--muted:#596270}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#E5601A;--butter:#FFD9A8;--soft:#F3F4F6;--line:#D9DDE3;--ink:#161B22;--muted:#596270}",
  studio: ":root{--accent:#FF7A2F}.btn-primary{color:#14110A}.tag.star{color:#14110A}",
  daylight: ":root{--accent:#C84E10}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "garage",
  label: "Garage and MOT centre",
  ldType: "AutoRepair",
  ldExtra: { areaServed: "Sheffield" },
  hint: "hatch",
  photo: "natural bright photograph of a clean modern independent garage workshop, friendly mechanics, soft daylight, photorealistic, no text",
  videoQuery: "car garage mechanic",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "motcheck", "tyrefit", "servicing", "dash", "forecourt"],
  mediaDir: "garage",
  nav: { home: "Home", menu: "Services", cta: "Book now", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most requested", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Garage, MOT and car servicing", desc: "{{business_name}} is a friendly independent garage in {{city}}. MOT, servicing, tyres, repairs and used cars, with fixed prices and photos of every fault." },
    menu: { title: "MOT, service and repair prices", desc: "See MOT, servicing, tyre and repair prices at {{business_name}} in {{city}}, plus used cars with a 3 month warranty." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Book your car in", submit: "Request a booking" },
  demo: {
    business_name: "Ironside Motors", tagline: "Friendly independent garage in Sheffield. MOT, servicing, tyres and repairs with fixed prices and photos of every fault.", city: "Sheffield",
    phone: "0114 555 0172", phone_href: "+441145550172", email: "bookings@ironsidemotors.example", address_line1: "7 Cutlers Yard", address_line2: "Sheffield S1 4EW",
    hours_weekdays: "8am – 6pm", hours_saturday: "8am – 2pm", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Cutlers+Yard+Sheffield", form_endpoint: "", year_founded: "2011", owner_name: "Tom Ironside",
    years_open: "14", clients_served: "18000", team_size: "9", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Garage and MOT",
      heroH1: "Fixed <em>properly</em>.",
      cta1: "Book your car in", cta1Href: "#order", cta2: "See prices", cta2Href: "menu.html",
      glass: ["Open today", "MOTs from £45", "Open {{hours_weekdays}} on weekdays. Courtesy cars available."],
      promise: [["Fixed prices", "Agreed before we touch the car."], ["Photos of every fault", "Sent to your phone."], ["12 month guarantee", "On all parts and labour."]],
      collection: ["Services", "Everything your car <em>needs</em>", "All services"],
      fav: ["Popular", "Jobs <em>drivers book most</em>"],
      story: { eyebrow: "About us", h2: "A Sheffield garage, <em>run honestly</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} to give drivers straight answers, photos of every fault and a fixed price before the work starts.", art: "hatch", alt: "A small car", hint: "a friendly mechanic smiling in a clean garage" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "cars looked after"], ["{{team_size}}", "", "technicians and staff"]],
      process: ["How it works", "Three steps <em>to a fixed car</em>", steps],
      orderHome: "Book <em>your car in</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us your registration and what is wrong. We will confirm a time and a fixed price.",
      menuHero: ["Services", "Prices <em>and jobs</em>", "Prices are examples. We confirm a fixed price before any work starts."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Garage and MOT",
      heroH1: "Cars, <em>sorted</em>.",
      cta1: "Book your car in", cta1Href: "#order", cta2: "See prices", cta2Href: "menu.html",
      badge: "MOTs from £45 &middot; {{phone}}",
      fav: ["Popular", "Jobs <em>drivers book most</em>", "Our most booked work", "Book &rarr;"],
      story: { eyebrow: "About us", h2: "One garage, <em>one promise</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}}. We show you the fault, give you a fixed price and guarantee the work for a year." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "cars looked after"], ["{{team_size}}", "", "technicians and staff"]],
      panels: [["hatch", "A small car", "MOT and service", "Tests, servicing and checks.", "small car", "featured"], ["tyre", "A tyre and alloy wheel", "Tyres and brakes", "Fitted the same day.", "tyre and wheel", "secondary"], ["plug", "A spark plug", "Repairs", "Diagnostics and fixes.", "spark plug", "secondary"]],
      statement: "<span>Honest,</span> <span>fast,</span> <span>and</span> <span><em>fairly priced</em></span> <span>in {{city}}.</span>",
      orderHome: "Book <em>your car in</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us your registration and what is wrong. We will confirm a time and a fixed price.",
      menuHero: ["Services", "Prices <em>and jobs</em>", "Prices are examples. We confirm a fixed price before any work starts."],
    },
    motion: {
      heroLines: ["Fixed", "properly"],
      cta1: "Book your car in", cta1Href: "#order", cta2: "See prices", cta2Href: "menu.html",
      marquee: ["MOT", "Servicing", "Tyres", "Repairs"],
      tiles: ["Our <em>services</em>", "All services"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Cars"], ["{{team_size}}", "", "Team"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Fixed prices, photos of every fault and a 12 month guarantee.",
      orderHome: "Car trouble?<br><em>Book it in.</em>", orderMenu: "Ready <em>to book?</em>", orderLead: "Tell us your registration and what is wrong. We will confirm a time and a fixed price.",
      menuHero: ["Prices <em>and jobs</em>", "Prices are examples. We confirm a fixed price before any work starts."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#161B22", crust: "#C3CAD3", crustDark: "#2B3139", light: "#EEF0F3", cream: "#F3F4F6", accent: "#E5601A", accent2: "#FFC857", shadow: "rgba(22,27,34,.36)", plate: "#FFFFFF" },
    motifs: ["hatch", "tyre", "plug", "oilcan", "battery", "rotor"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#F7F8FA 0%,#DDE1E7 55%,#B9C0CB 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(20,26,36,.14) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { hatch: "#FBE0CE", tyre: "#DCE1E8", plug: "#E6E9EE", oilcan: "#FBE7C2", battery: "#D6E3EE", rotor: "#E3E6EB" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { hatch: "#E5601A", tyre: "#2B3139", plug: "#8E98A6", oilcan: "#FFC857", battery: "#3E6A8F", rotor: "#C84E10" } },
    },
    videos: {
      atelier: { T: 8, page: "#0E1217", sky: ["#0A0D12", "#151B24", "#2A3340"], glow: "255,160,90", beam: "255,215,170", dust: "255,232,205", steam: "225,232,242", items: [["hatch", 700, 650, 430, 0], ["tyre", 480, 680, 240, 0.4], ["plug", 1010, 650, 230, 0.7]] },
      gallery: { T: 10, disc: ["#F7F8FA", "#DDE1E7", "#B9C0CB"], ring: "229,96,26", items: ["hatch", "tyre", "plug", "oilcan", "rotor"] },
      motion: { T: 8, base: "#F3F4F6", blobs: ["#E5601A", "#2B3139", "#FFC857", "#8E98A6", "#FFD9A8", "#C84E10", "#3E6A8F"] },
    },
  },
};
