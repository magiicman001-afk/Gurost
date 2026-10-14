"use strict";
/**
 * Industry pack: estate agent and lettings (homes for sale, homes to rent, selling with us, landlord services). Words, example
 * listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for
 * the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "sale", name: "Homes for sale", blurb: "Family houses, first flats and a few special finds across Leeds.", art: "villa", items: [
    A("Three-bed semi, Headingley", "&pound;295,000", "Bay-fronted, a sunny garden and a short walk to the park. Chain free.", { tags: ["New", "Chain free"], star: true, beds: 3, price: 295000 }),
    A("Two-bed flat, city centre", "&pound;189,500", "Top-floor apartment with river views, secure parking and a concierge.", { tags: ["Popular"], art: "flat", star: true, beds: 2, price: 189500 }),
    A("Four-bed detached, Roundhay", "&pound;625,000", "Generous family home with a kitchen extension, an office and mature gardens.", { tags: ["New"], star: true, beds: 4, price: 625000 }),
    A("One-bed starter, Chapel Allerton", "&pound;139,950", "A bright first home above the shops, with a Juliet balcony.", { tags: ["Chain free"], art: "flat", beds: 1, price: 139950 }),
  ] },
  { id: "rent", name: "Homes to rent", blurb: "Well-kept lets, managed by people who answer the phone.", art: "flat", items: [
    A("Two-bed flat, Hyde Park", "&pound;1,150 pcm", "Modern flat with a balcony, close to the university and the station.", { tags: ["Popular", "Pets ok"], star: true, beds: 2, price: 1150 }),
    A("Three-bed terrace, Armley", "&pound;1,295 pcm", "Renovated throughout, a courtyard garden and a new kitchen.", { tags: ["New"], art: "villa", star: true, beds: 3, price: 1295 }),
    A("Studio, South Bank", "&pound;795 pcm", "Furnished studio, all bills in one easy payment.", { tags: ["Furnished"], beds: 0, price: 795 }),
    A("Four-bed house share, Headingley", "&pound;2,100 pcm", "Spacious professional let with a big garden and off-street parking.", { tags: ["Pets ok"], art: "villa", beds: 4, price: 2100 }),
  ] },
  { id: "sell", name: "Sell with us", blurb: "A free valuation, honest advice and a team that sells homes faster.", art: "sign", items: [
    A("Free home valuation", "free, no obligation", "A local expert visits, measures up and gives you a realistic price.", { tags: ["Popular"], star: true }),
    A("Premium marketing", "included in our fee", "Professional photos, a floor plan, a video tour and top listing on every portal.", { tags: [], art: "door" }),
    A("Open house events", "included in our fee", "A managed viewing day that brings serious buyers through the door at once.", { tags: ["New"], art: "door" }),
    A("Sale progression", "included in our fee", "We chase solicitors and keep your chain moving until completion.", { tags: [], star: true }),
  ] },
  { id: "landlord", name: "For landlords", blurb: "Hands-off lettings that keep your property full and your rent coming in.", art: "key", items: [
    A("Tenant find", "from 50% of one month's rent", "Marketing, viewings, referencing and the tenancy agreement.", { tags: ["Popular"], star: true }),
    A("Full management", "8% + VAT of monthly rent", "Rent collection, repairs, inspections and compliance, all handled.", { tags: [], star: true }),
    A("Rent guarantee", "from &pound;14 a month", "Insurance that pays your rent if a tenant stops.", { tags: ["New"] }),
    A("Safety certificates", "from &pound;75", "Gas, electrical and EPC certificates arranged for you.", { tags: [] }),
  ] },
].map((c) => ({
  ...c,
  photo: { sale: "a sunny British family house with a garden, bright photograph", rent: "a modern bright apartment living room with a balcony", sell: "an estate agent handing keys to a smiling couple outside a house", landlord: "a tidy well-kept rental home interior with a for-let sign outside" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { sale: "a bright photograph of a {n}", rent: "a bright photograph of a {n}", sell: "an estate agent doing {n}", landlord: "a landlord arranging {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "They valued our house on Monday, listed on Wednesday and had three offers by the weekend. Brilliant.", by: "Sample review, Hannah and Joe" },
  { q: "As a first-time buyer I was nervous. Priya talked me through every step and never made me feel rushed.", by: "Sample review, Callum R." },
  { q: "Eight years of managing my flats with them and not one missed rent. Highly recommended.", by: "Sample review, Mrs Anand" },
];
const chef = { n: "Priya Shah", role: "Founder and senior negotiator", bio: "Born and raised in Leeds, she started Larkfield & Co to give local people straight answers and better service." };
const sup = ["Fully regulated and a member of the property redress scheme", "Clients' money protected", "Local people who know every street"];
const faq = [["How much does it cost to sell?", "Our fee is a fixed percentage agreed up front, with no hidden extras. We confirm everything in writing."], ["How long does a sale take?", "Most homes find a buyer within a month. Legal completion typically takes 10 to 14 weeks."], ["Do you manage tenant deposits?", "Yes. Deposits are protected in a government-approved scheme within 30 days."], ["Can I view out of hours?", "Yes. We offer evening and weekend viewings, seven days a week."]];
const areas = ["Headingley", "Roundhay", "Chapel Allerton", "Hyde Park", "Horsforth", "Chapeltown", "City centre", "Adel"];
const steps = [["Talk to us", "Tell us what you are looking for, or book a free valuation."], ["See the homes", "We arrange viewings that fit around your day."], ["Move in", "We handle the paperwork and keep you updated to the keys."]];

const T = {
  atelier: ":root{--accent:#2F6EA8;--soft:#F4F1EA;--line:#E3DCCD;--ink:#16263A;--muted:#566578}.hero-box{background:#0F2236}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#2F6EA8;--gold:#D9A441;--soft:#F4F1EA;--line:#E3DCCD;--ink:#16263A;--muted:#566578}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#2F6EA8;--butter:#F3E2B3;--soft:#F4F1EA;--line:#E3DCCD;--ink:#16263A;--muted:#566578}",
  studio: ":root{--accent:#E2B14C}.btn-primary{color:#0E1B2A}.tag.star{color:#0E1B2A}",
  daylight: ":root{--accent:#245C91}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "realestate",
  label: "Estate agent and lettings",
  ldType: "RealEstateAgent",
  ldExtra: { areaServed: "Leeds" },
  hint: "house",
  photo: "natural bright photograph of a lovely British home exterior or interior, welcoming, honest, photorealistic, no text",
  videoQuery: "house exterior real estate",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "listings", "mortgage", "skyline", "valuer", "tour"],
  mediaDir: "realestate",
  nav: { home: "Home", menu: "Properties", cta: "Free valuation", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, areas, steps,
  tags: { Popular: "Most viewed", New: "New to the market", "Chain free": "No onward chain", "Pets ok": "Pets considered", Furnished: "Comes furnished" },
  seo: {
    home: { title: "Estate agent and lettings", desc: "{{business_name}} is an independent estate agent and lettings agent in {{city}}. Homes for sale, homes to rent and a free valuation." },
    menu: { title: "Properties for sale and to rent", desc: "Browse homes for sale and to rent with {{business_name}} in {{city}}, plus our selling and landlord services." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Free valuation", submit: "Book my valuation" },
  demo: {
    business_name: "Larkfield & Co", tagline: "An independent estate and lettings agent in Leeds. Local people, honest advice and a free valuation.", city: "Leeds",
    phone: "0113 555 0182", phone_href: "+441135550182", email: "hello@larkfield.example", address_line1: "14 Park Row", address_line2: "Leeds LS1 5HD",
    hours_weekdays: "9am – 6pm", hours_saturday: "9am – 4pm", hours_sunday: "Viewings by appointment", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Park+Row+Leeds", form_endpoint: "", year_founded: "2011", owner_name: "Priya Shah",
    years_open: "14", clients_served: "3800", team_size: "12", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Independent estate agents",
      heroH1: "Find <em>your place</em>.",
      cta1: "Book a free valuation", cta1Href: "#order", cta2: "See properties", cta2Href: "menu.html",
      glass: ["Open today", "Viewings 7 days", "Open {{hours_weekdays}} on weekdays. Evening and weekend viewings available."],
      promise: [["Local experts", "We live where we sell."], ["Honest advice", "Realistic prices, no hard sell."], ["Fully protected", "Regulated and clients' money protected."]],
      collection: ["Our services", "Four ways <em>we help</em>", "All properties"],
      fav: ["Featured", "Homes <em>we love</em>"],
      story: { eyebrow: "About us", h2: "Born in Leeds, <em>for Leeds</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}} to give local people straight answers and better service. We still answer every call ourselves.", art: "key", alt: "A house key", hint: "a friendly estate agent standing outside a house" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "homes sold and let"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to the keys</em>", steps],
      orderHome: "Book <em>a free valuation</em>", orderMenu: "Thinking <em>of selling</em>?", orderLead: "Tell us about your home and we will arrange a free, no obligation valuation.",
      menuHero: ["Properties", "Homes <em>and services</em>", "Prices are examples. Contact us for the latest availability and to arrange a viewing."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Independent estate agents",
      heroH1: "Homes with <em>local roots</em>.",
      cta1: "Book a free valuation", cta1Href: "#order", cta2: "See properties", cta2Href: "menu.html",
      badge: "Viewings 7 days &middot; {{phone}}",
      fav: ["Featured", "Homes <em>we love</em>", "Recently listed by our team", "Enquire &rarr;"],
      story: { eyebrow: "About us", h2: "One office, <em>one promise</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. We value honest advice, realistic prices and a quick reply." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "homes sold and let"], ["{{team_size}}", "", "people on the team"]],
      panels: [["villa", "A family house", "For sale", "Houses and flats across Leeds.", "family house", "featured"], ["flat", "An apartment block", "To rent", "Well-kept lets, managed properly.", "apartment", "secondary"], ["sign", "A for-sale sign", "Sell with us", "A free, honest valuation.", "for sale sign", "secondary"]],
      statement: "<span>Selling,</span> <span>letting,</span> <span>and</span> <span><em>finding</em></span> <span>homes in {{city}}.</span>",
      orderHome: "Book <em>a free valuation</em>", orderMenu: "Thinking <em>of selling</em>?", orderLead: "Tell us about your home and we will arrange a free, no obligation valuation.",
      menuHero: ["Properties", "Homes <em>and services</em>", "Prices are examples. Contact us for the latest availability."],
    },
    motion: {
      heroLines: ["Find", "your place"],
      cta1: "Free valuation", cta1Href: "#order", cta2: "See properties", cta2Href: "menu.html",
      marquee: ["For sale", "To rent", "Valuations", "Landlords"],
      tiles: ["Our <em>services</em>", "All properties"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Homes moved"], ["{{team_size}}", "", "Team"]],
      about: "{{owner_name}} started {{business_name}} in {{year_founded}}. Local people, honest advice and a quick reply.",
      orderHome: "Thinking of<br><em>moving?</em>", orderMenu: "Ready to <em>talk?</em>", orderLead: "Tell us about your home and we will arrange a free, no obligation valuation.",
      menuHero: ["Homes <em>and services</em>", "Prices are examples. Contact us for the latest availability."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#16263A", crust: "#E5C98A", crustDark: "#1F4B7A", light: "#F6E9C6", cream: "#F4F1EA", accent: "#2F6EA8", accent2: "#E2B14C", shadow: "rgba(15,34,54,.38)", plate: "#FFFFFF" },
    motifs: ["key", "flat", "sign", "villa", "door", "plant"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#F7FAFD 0%,#DCE8F3 55%,#B9D0E6 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(20,50,90,.12) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { key: "#F7E3B0", flat: "#C9DDF0", sign: "#F0D3C2", villa: "#D3E8D0", door: "#C7D9EE", plant: "#D6EBD2" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { key: "#E2B14C", flat: "#2F6EA8", sign: "#E5775A", villa: "#5E9B5A", door: "#245C91", plant: "#7DB874" } },
    },
    videos: {
      atelier: { T: 8, page: "#0F2236", sky: ["#0A1623", "#13283D", "#24435F"], glow: "255,200,120", beam: "255,225,170", dust: "255,235,200", steam: "230,240,250", items: [["villa", 700, 650, 420, 0], ["key", 500, 660, 250, 0.4], ["flat", 1010, 640, 260, 0.7]] },
      gallery: { T: 10, disc: ["#EAF2FA", "#C9DDF0", "#9DBEE0"], ring: "47,110,168", items: ["villa", "key", "flat", "sign", "door"] },
      motion: { T: 8, base: "#F3F6FA", blobs: ["#2F6EA8", "#E2B14C", "#16263A", "#7DB874", "#F3E2B3", "#E5775A", "#245C91"] },
    },
  },
};
