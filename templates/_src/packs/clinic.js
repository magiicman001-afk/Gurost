"use strict";
/**
 * Industry pack: estate agent and lettings (homes for sale, homes to rent, selling with us, landlord services). Words, example
 * listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for
 * the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "check", name: "Check-ups and prevention", blurb: "Gentle exams, scale and polish, and advice that keeps problems small.", art: "tooth", items: [
    A("New patient check-up", "&pound;49", "A full exam, x-rays if needed, and a clear plan with prices before we start.", { tags: ["Popular"], star: true }),
    A("Scale and polish", "&pound;65", "A thorough hygienist clean that removes stains and protects your gums.", { tags: [], art: "brush", star: true }),
    A("Children's check-up", "free under 18 (NHS)", "A relaxed first visit with a sticker at the end. Parents welcome in the room.", { tags: ["New"], art: "smile" }),
    A("Gum health programme", "from &pound;120", "Three visits to treat gum disease and teach you what works at home.", { tags: [] }),
  ] },
  { id: "white", name: "Whitening and smile design", blurb: "A brighter, straighter smile, planned with you and shown before it is done.", art: "smile", items: [
    A("Home whitening kit", "&pound;295", "Custom trays and professional gel for a safe, even shade over two weeks.", { tags: ["Popular"], star: true, art: "brush" }),
    A("Clear aligners", "from &pound;2,250", "Nearly invisible straightening, with a digital preview of your result.", { tags: ["New"], star: true }),
    A("Composite bonding", "from &pound;180 a tooth", "A chip, gap or edge reshaped in a single visit, often without any drilling.", { tags: [] }),
    A("Porcelain veneers", "from &pound;650 a tooth", "Thin, natural-looking shells made by a local ceramic lab.", { tags: [] }),
  ] },
  { id: "treat", name: "Fillings, crowns and implants", blurb: "Repairs that look natural and last, explained in plain English.", art: "chair", items: [
    A("White filling", "from &pound;85", "A tooth-coloured filling placed with local anaesthetic and a gentle touch.", { tags: [], star: true }),
    A("Root canal treatment", "from &pound;395", "Relieves pain and saves the tooth. Most are completed in one or two visits.", { tags: ["Popular"] }),
    A("Crown", "from &pound;595", "A strong, natural-looking cover made to fit your bite exactly.", { tags: [], art: "shield" }),
    A("Dental implant", "from &pound;2,100", "A permanent replacement tooth, planned with a 3D scan and a clear fixed price.", { tags: ["New"], star: true, art: "shield" }),
  ] },
  { id: "urgent", name: "Same-day and emergency", blurb: "Toothache, a broken tooth or a swelling: we keep slots free every day.", art: "shield", items: [
    A("Emergency appointment", "from &pound;75", "Seen the same day, usually within the hour, to ease pain and make a plan.", { tags: ["Popular"], star: true, art: "chair" }),
    A("Broken or knocked-out tooth", "from &pound;90", "Call us at once. We can often save a tooth if it is seen quickly.", { tags: [], art: "tooth" }),
    A("Lost filling or crown", "from &pound;60", "A quick repair or temporary fix so you can eat and smile again.", { tags: [] }),
    A("Dental anxiety care", "no extra charge", "A calm, unhurried visit, with signals so you stay in control.", { tags: ["New"], art: "smile", star: true }),
  ] },
].map((c) => ({
  ...c,
  photo: { check: "a friendly dentist talking to a relaxed patient in a bright modern clinic", white: "a person with a bright confident natural smile, soft daylight", treat: "a calm modern dental treatment room with a clean chair", urgent: "a reassuring dentist on the phone at a bright reception desk" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { check: "a dentist providing {n}", white: "a patient receiving {n}", treat: "a dentist carrying out {n}", urgent: "a dentist helping with {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "I had not been to a dentist in eight years. Nobody judged me, and the plan was clear, priced and done in two visits.", by: "Sample review, Callum R." },
  { q: "My daughter used to cry at the door. Now she asks when we are going back to see Dr Okafor.", by: "Sample review, Hannah M." },
  { q: "I rang at 8am with a broken tooth and was in the chair by 9. Painless, fast and kind.", by: "Sample review, Mr Anand" },
];
const chef = { n: "Dr Amara Okafor", role: "Principal dentist", bio: "Born in Leeds, she opened Brightside Dental to give local families calm, honest dentistry with prices you can see before you sit down." };
const sup = ["Registered with the Care Quality Commission", "NHS and private patients welcome", "Fixed prices agreed before treatment"];
const faq = [["Do you take new NHS patients?", "Yes, when places are open. Call us and we will tell you honestly where you stand, and offer a private plan if there is a wait."], ["I am really nervous. Can you help?", "Absolutely. We go at your pace, explain every step and agree a stop signal. Many of our patients come to us because they were anxious."], ["What if I need treatment urgently?", "We keep same-day slots free every weekday. Ring us as soon as you can and we will see you quickly."], ["Can I spread the cost?", "Yes. We offer 0% payment plans over 6 to 12 months on treatment over &pound;300, with no hidden fees."]];
const steps = [["Say hello", "Book a check-up online or by phone. Tell us if you are nervous and we will plan for it."], ["Get a clear plan", "We explain what we see, show you the options and agree the price in writing."], ["Smile", "Treatment at your pace, with a follow-up call to make sure you are comfortable."]];

const T = {
  atelier: ":root{--accent:#12808B;--soft:#EAF6F5;--line:#D5E6E6;--ink:#0B2B33;--muted:#4D6B70}.hero-box{background:#0B2B33}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#12808B;--gold:#7FD6C2;--soft:#EAF6F5;--line:#D5E6E6;--ink:#0B2B33;--muted:#4D6B70}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#12808B;--butter:#CFEFE8;--soft:#EAF6F5;--line:#D5E6E6;--ink:#0B2B33;--muted:#4D6B70}",
  studio: ":root{--accent:#7FD6C2}.btn-primary{color:#06242B}.tag.star{color:#06242B}",
  daylight: ":root{--accent:#0E6F7A}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "clinic",
  label: "Dental and health clinic",
  ldType: "Dentist",
  ldExtra: { areaServed: "Leeds" },
  hint: "tooth",
  photo: "natural bright photograph of a calm modern dental or health clinic, friendly honest people, soft daylight, photorealistic, no text",
  videoQuery: "dentist clinic smile",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "smile", "checkup", "plans", "kids", "urgent"],
  mediaDir: "clinic",
  nav: { home: "Home", menu: "Treatments", cta: "Book a visit", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most booked", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Dentist and health clinic", desc: "{{business_name}} is a friendly dental clinic in {{city}}. Check-ups, whitening, implants and same-day emergency appointments, with prices agreed up front." },
    menu: { title: "Treatments and prices", desc: "See treatments and clear prices at {{business_name}} in {{city}}: check-ups, whitening, fillings, implants and emergency care." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Book a visit", submit: "Request my appointment" },
  demo: {
    business_name: "Brightside Dental", tagline: "A calm, friendly dental clinic in Leeds. Honest advice, fixed prices and same-day appointments when you need them.", city: "Leeds",
    phone: "0113 555 0147", phone_href: "+441135550147", email: "smile@brightside.example", address_line1: "22 Albion Street", address_line2: "Leeds LS1 6AA",
    hours_weekdays: "8am – 6pm", hours_saturday: "9am – 2pm", hours_sunday: "Closed (emergency line only)", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Albion+Street+Leeds", form_endpoint: "", year_founded: "2012", owner_name: "Dr Amara Okafor",
    years_open: "13", clients_served: "9400", team_size: "11", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Dentist and clinic",
      heroH1: "Dentistry that <em>feels calm</em>.",
      cta1: "Book a visit", cta1Href: "#order", cta2: "See treatments", cta2Href: "menu.html",
      glass: ["Open today", "Same-day slots", "Open {{hours_weekdays}} on weekdays. We keep emergency appointments free every day."],
      promise: [["Gentle care", "Nervous patients are our speciality."], ["Fixed prices", "Agreed in writing before we start."], ["Same-day help", "Emergency slots every weekday."]],
      collection: ["Treatments", "Care for <em>every smile</em>", "All treatments"],
      fav: ["Popular", "Treatments <em>patients love</em>"],
      story: { eyebrow: "About us", h2: "Born in Leeds, <em>for Leeds</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} to give local families calm, honest dentistry. We still explain every price before every treatment.", art: "tooth", alt: "A healthy tooth", hint: "a friendly dentist smiling in a clinic" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "patients cared for"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to a calm visit</em>", steps],
      orderHome: "Book <em>a visit</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us what you need and any worries you have. We will call you back to find a time that suits.",
      menuHero: ["Treatments", "Care <em>and prices</em>", "Prices are examples. Your dentist will confirm a fixed price in writing before any treatment."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Dentist and clinic",
      heroH1: "A smile worth <em>sharing</em>.",
      cta1: "Book a visit", cta1Href: "#order", cta2: "See treatments", cta2Href: "menu.html",
      badge: "Same-day slots &middot; {{phone}}",
      fav: ["Popular", "Treatments <em>patients love</em>", "Our most booked care", "Book &rarr;"],
      story: { eyebrow: "About us", h2: "One clinic, <em>one promise</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}}. We value calm care, honest advice and prices you see first." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "patients cared for"], ["{{team_size}}", "", "people on the team"]],
      panels: [["smile", "A bright smile", "Whitening", "Safe, professional brightening.", "bright smile", "featured"], ["chair", "A treatment room", "Treatments", "Fillings, crowns and implants.", "treatment room", "secondary"], ["shield", "A health shield", "Same-day care", "Emergency slots every weekday.", "protective shield", "secondary"]],
      statement: "<span>Gentle,</span> <span>honest,</span> <span>and</span> <span><em>on your</em></span> <span>side in {{city}}.</span>",
      orderHome: "Book <em>a visit</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us what you need and any worries you have. We will call you back to find a time that suits.",
      menuHero: ["Treatments", "Care <em>and prices</em>", "Prices are examples. Your dentist will confirm a fixed price in writing."],
    },
    motion: {
      heroLines: ["Calm", "dentistry"],
      cta1: "Book a visit", cta1Href: "#order", cta2: "See treatments", cta2Href: "menu.html",
      marquee: ["Check-ups", "Whitening", "Implants", "Emergency"],
      tiles: ["Our <em>treatments</em>", "All treatments"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Patients"], ["{{team_size}}", "", "Team"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Calm care, honest advice and fixed prices.",
      orderHome: "Ready for a<br><em>calm visit?</em>", orderMenu: "Ready <em>to book?</em>", orderLead: "Tell us what you need and any worries you have. We will call you back to find a time that suits.",
      menuHero: ["Care <em>and prices</em>", "Prices are examples. Your dentist will confirm a fixed price in writing."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#0B2B33", crust: "#BFE6E4", crustDark: "#0B4F5C", light: "#E4F5F3", cream: "#EAF6F5", accent: "#12808B", accent2: "#7FD6C2", shadow: "rgba(8,43,51,.34)", plate: "#FFFFFF" },
    motifs: ["tooth", "brush", "smile", "chair", "shield", "plant"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#F6FCFB 0%,#D8EFEC 55%,#B3DBD7 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(8,70,80,.12) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { tooth: "#D4EEEA", brush: "#CFE6F3", smile: "#F7DCD6", chair: "#D6E6F0", shield: "#D2EEE7", plant: "#D6EBD2" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { tooth: "#7FD6C2", brush: "#12808B", smile: "#F2A7A0", chair: "#0E6F7A", shield: "#5FB8D6", plant: "#7DB874" } },
    },
    videos: {
      atelier: { T: 8, page: "#0A2229", sky: ["#061A20", "#0D2F38", "#1B5360"], glow: "150,230,215", beam: "200,245,235", dust: "225,250,245", steam: "225,245,245", items: [["tooth", 700, 650, 420, 0], ["brush", 500, 660, 250, 0.4], ["smile", 1010, 640, 260, 0.7]] },
      gallery: { T: 10, disc: ["#EEF9F7", "#CFEDE9", "#9FD9D3"], ring: "18,128,139", items: ["tooth", "smile", "brush", "chair", "shield"] },
      motion: { T: 8, base: "#F1F9F8", blobs: ["#12808B", "#7FD6C2", "#0B2B33", "#F2A7A0", "#CFEFE8", "#5FB8D6", "#0E6F7A"] },
    },
  },
};
