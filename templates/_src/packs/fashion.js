"use strict";
/**
 * Industry pack: fashion and online shop (a clothing label selling online: womenswear, menswear, accessories and everyday basics).
 * Words, example listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE
 * content for the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "women", name: "Womenswear", blurb: "Easy dresses, tailoring and layers that move from desk to dinner.", art: "dress", items: [
    A("Wrap midi dress", "&pound;89", "A flattering wrap in soft crepe, with pockets. Sizes 6 to 22.", { tags: ["Popular"], star: true, art: "dress" }),
    A("Relaxed linen shirt", "&pound;58", "Washed European linen that softens with every wear.", { tags: [], star: true, art: "tee" }),
    A("Wide-leg trousers", "&pound;72", "High waist, drapey fabric and a hem that skims the shoe.", { tags: [], art: "dress" }),
    A("Summer straw hat", "&pound;34", "Hand-woven, packable and made for long days outside.", { tags: ["New"], art: "hat" }),
  ] },
  { id: "men", name: "Menswear", blurb: "Well-cut basics and overshirts made to last more than a season.", art: "tee", items: [
    A("Heavyweight tee", "&pound;32", "Dense organic cotton, a boxy fit and a collar that holds its shape.", { tags: ["Popular"], star: true, art: "tee" }),
    A("Chore overshirt", "&pound;95", "Cotton twill with four pockets. Wear it open or buttoned.", { tags: [], star: true, art: "tee" }),
    A("Straight chinos", "&pound;68", "A clean, tapered leg in stretch cotton, in five colours.", { tags: [], art: "tee" }),
    A("Leather-trim sneakers", "&pound;110", "Minimal court sneakers with a cushioned, recycled sole.", { tags: ["New"], art: "sneaker" }),
  ] },
  { id: "accessories", name: "Accessories", blurb: "The finishing touches, in leather, linen and recycled materials.", art: "handbag", items: [
    A("Everyday leather bag", "&pound;129", "Vegetable-tanned leather that ages beautifully. Fits a 13 inch laptop.", { tags: ["Popular"], star: true, art: "handbag" }),
    A("Acetate sunglasses", "&pound;65", "Bio-acetate frames with UV400 lenses and a soft case.", { tags: [], star: true, art: "glasses" }),
    A("Canvas weekend bag", "&pound;78", "Waxed canvas with a leather handle and a zipped inner pocket.", { tags: [], art: "handbag" }),
    A("Wool beanie", "&pound;24", "Chunky ribbed lambswool in four warm colours.", { tags: ["New"], art: "hat" }),
  ] },
  { id: "basics", name: "Everyday basics", blurb: "The pieces you reach for every morning, made well and priced fairly.", art: "sneaker", items: [
    A("Organic cotton tee 3-pack", "&pound;45", "Three soft tees in white, black and sand. Free returns.", { tags: ["Popular"], star: true, art: "tee" }),
    A("Ribbed tank", "&pound;18", "A close-fitting layering staple in stretch organic cotton.", { tags: [], star: true, art: "dress" }),
    A("Canvas trainers", "&pound;55", "A classic low-top with a vulcanised sole and a recycled lining.", { tags: [], art: "sneaker" }),
    A("Sunday socks 5-pack", "&pound;16", "Cushioned cotton socks in neutral shades.", { tags: ["New"], art: "sneaker" }),
  ] },
].map((c) => ({
  ...c,
  photo: { women: "a model wearing a flowing midi dress in a bright airy studio, fashion editorial photograph", men: "a man wearing a plain heavyweight t-shirt and chinos against a plain wall, fashion photograph", accessories: "a leather handbag and sunglasses styled on a pale surface, product photograph", basics: "folded cotton t-shirts and canvas trainers on a pale background, flat lay product photograph" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { women: "a product photograph of a {n}", men: "a product photograph of {n}", accessories: "a product photograph of {n}", basics: "a product photograph of {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "The dress fits like it was made for me, and the fabric is gorgeous. I have already ordered a second one.", by: "Sample review, Priya S." },
  { q: "Free returns and a real person who answered in ten minutes. Rare for an online shop.", by: "Sample review, Tom H." },
  { q: "My leather bag has the best patina after a year. Worth every penny.", by: "Sample review, Joanne W." },
];
const chef = { n: "Maren Ashby", role: "Founder and designer", bio: "Maren started {{business_name}} in {{year_founded}} with one idea: clothes that fit properly, last for years and never cost the earth." };
const sup = ["Free UK delivery over &pound;60 (sample text)", "Free 30-day returns", "Made with organic and recycled fabrics"];
const faq = [["How long does delivery take?", "UK orders arrive in 2 to 3 working days. Express next day is available at checkout."], ["What is your returns policy?", "Free returns within 30 days, as long as the item is unworn with tags attached. We refund within three working days."], ["How do I find my size?", "Use our size finder on the home page, or message us. Most of our pieces fit true to size, and we list measurements for every item."], ["Where are your clothes made?", "In small, audited factories in Portugal and the UK. We publish every factory on our website."]];
const steps = [["Find your fit", "Use the size finder or browse by category. Every item lists measurements."], ["Order in a minute", "Free delivery over &pound;60 and express next day if you need it quickly."], ["Love it or return it", "Free returns within 30 days, no questions asked."]];

const T = {
  atelier: ":root{--accent:#1F4A3A;--soft:#F3F1EA;--line:#DEDACB;--ink:#1F2A24;--muted:#5F6A62}.hero-box{background:#1F2A24}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#1F4A3A;--gold:#B88A2E;--soft:#F3F1EA;--line:#DEDACB;--ink:#1F2A24;--muted:#5F6A62}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#1F4A3A;--butter:#F3E3B0;--soft:#F3F1EA;--line:#DEDACB;--ink:#1F2A24;--muted:#5F6A62}",
  studio: ":root{--accent:#F0C24A}.btn-primary{color:#14110A}.tag.star{color:#14110A}",
  daylight: ":root{--accent:#173A2D}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "fashion",
  label: "Fashion and online shop",
  ldType: "ClothingStore",
  ldExtra: { areaServed: "GB" },
  hint: "dress",
  photo: "natural bright fashion editorial photograph of a model wearing relaxed everyday clothes in soft daylight, photorealistic, no text",
  videoQuery: "fashion model",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "sizer", "outfit", "bundle", "drop", "wears"],
  mediaDir: "fashion",
  nav: { home: "Home", menu: "Shop", cta: "Shop now", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Bestseller", New: "New in", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Considered clothing, made to last", desc: "{{business_name}} makes womenswear, menswear and accessories from organic and recycled fabrics. Free UK delivery over £60 and free 30-day returns." },
    menu: { title: "Shop womenswear, menswear and accessories", desc: "Browse dresses, tees, shoes and bags from {{business_name}}. Free UK delivery over £60 and free 30-day returns." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Need help?", submit: "Send my question" },
  demo: {
    business_name: "Maren & Co.", tagline: "Considered clothing for every day. Organic and recycled fabrics, fair prices and free 30-day returns.", city: "Leeds",
    phone: "0113 496 0224", phone_href: "+441134960224", email: "hello@marenandco.example", address_line1: "21 Call Lane", address_line2: "Leeds LS1 7BT",
    hours_weekdays: "9am – 6pm", hours_saturday: "10am – 4pm", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Call+Lane+Leeds", form_endpoint: "", year_founded: "2016", owner_name: "Maren Ashby",
    years_open: "9", clients_served: "60000", team_size: "14", booking_url: "https://example.org/shop",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Online shop",
      heroH1: "Clothes you will <em>actually</em> wear.",
      cta1: "Shop now", cta1Href: "menu.html", cta2: "Ask a question", cta2Href: "#order",
      glass: ["Delivery today", "Free over £60", "Orders before 2pm ship the same day."],
      promise: [["Free UK delivery", "On orders over £60."], ["Free 30-day returns", "No questions asked."], ["Made to last", "Organic and recycled fabrics."]],
      collection: ["Shop", "Something <em>for every day</em>", "All products"],
      fav: ["Bestseller", "Pieces <em>everyone is wearing</em>"],
      story: { eyebrow: "Our story", h2: "Fewer, better <em>clothes</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}} to make clothes that fit properly, last for years and never cost the earth.", art: "dress", alt: "A dress", hint: "a designer fitting a dress on a mannequin" },
      stats: [["{{years_open}}", "", "years designing in {{city}}"], ["{{clients_served}}", "+", "happy customers"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to your new favourite</em>", steps],
      orderHome: "Questions <em>about an order</em>?", orderMenu: "Need <em>some help</em>?", orderLead: "Ask about sizing, delivery or returns. A real person replies within a few hours.",
      menuHero: ["Shop", "New in <em>and bestsellers</em>", "Prices include VAT. Delivery is free over £60. Example prices."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Online shop",
      heroH1: "Considered clothes, <em>fairly</em> priced.",
      cta1: "Shop now", cta1Href: "menu.html", cta2: "Ask a question", cta2Href: "#order",
      badge: "Free delivery over £60 &middot; {{phone}}",
      fav: ["Bestseller", "Pieces <em>people love most</em>", "Our best sellers", "Shop &rarr;"],
      story: { eyebrow: "Our story", h2: "Made well, <em>made to last</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. Honest fabrics, careful cutting and prices that make sense." },
      facts: [["{{years_open}}", "", "years designing in {{city}}"], ["{{clients_served}}", "+", "happy customers"], ["{{team_size}}", "", "people on the team"]],
      panels: [["dress", "A dress", "Womenswear", "Easy shapes in soft fabrics.", "dress", "featured"], ["tee", "A t-shirt", "Menswear", "Well-cut basics that last.", "t-shirt", "secondary"], ["handbag", "A leather handbag", "Accessories", "Bags, hats and sunglasses.", "handbag", "secondary"]],
      statement: "<span>Simple,</span> <span>honest,</span> <span>and</span> <span><em>made to wear</em></span> <span>from {{city}}.</span>",
      orderHome: "Questions <em>about an order</em>?", orderMenu: "Need <em>some help</em>?", orderLead: "Ask about sizing, delivery or returns. A real person replies within a few hours.",
      menuHero: ["Shop", "New in <em>and bestsellers</em>", "Prices include VAT. Delivery is free over £60. Example prices."],
    },
    motion: {
      heroLines: ["Clothes you", "will wear"],
      cta1: "Shop now", cta1Href: "menu.html", cta2: "Ask a question", cta2Href: "#order",
      marquee: ["Womenswear", "Menswear", "Accessories", "Basics"],
      tiles: ["Shop <em>the range</em>", "All products"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Customers"], ["{{team_size}}", "", "People"]],
      about: "{{owner_name}} started {{business_name}} in {{year_founded}}. Honest fabrics, careful cutting and prices that make sense.",
      orderHome: "Not sure of a size?<br><em>Just ask.</em>", orderMenu: "Need <em>some help?</em>", orderLead: "Ask about sizing, delivery or returns. A real person replies within a few hours.",
      menuHero: ["New in <em>and bestsellers</em>", "Prices include VAT. Delivery is free over £60. Example prices."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#1F2A24", crust: "#D7E3DA", crustDark: "#173A2D", light: "#EEF4EF", cream: "#F3F1EA", accent: "#2F7A5C", accent2: "#F0C24A", shadow: "rgba(20,50,38,.32)", plate: "#FFFFFF" },
    motifs: ["dress", "tee", "handbag", "glasses", "sneaker", "hat"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FBFDFB 0%,#E3EDE5 55%,#C4D6C9 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(20,60,45,.13) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { dress: "#DCE9DF", tee: "#FBEFC9", handbag: "#DCE9DF", glasses: "#E6E3EA", sneaker: "#FBEFC9", hat: "#DCE9DF" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { dress: "#2F7A5C", tee: "#F0C24A", handbag: "#B8693A", glasses: "#173A2D", sneaker: "#E0584A", hat: "#F0C24A" } },
    },
    videos: {
      atelier: { T: 8, page: "#0F1A15", sky: ["#0A120E", "#14241C", "#254A3A"], glow: "255,225,150", beam: "255,238,185", dust: "255,244,215", steam: "225,245,232", items: [["dress", 700, 650, 430, 0], ["handbag", 480, 660, 240, 0.4], ["sneaker", 1010, 650, 240, 0.7]] },
      gallery: { T: 10, disc: ["#FBFDFB", "#E3EDE5", "#C4D6C9"], ring: "47,122,92", items: ["dress", "tee", "handbag", "glasses", "sneaker"] },
      motion: { T: 8, base: "#F3F1EA", blobs: ["#2F7A5C", "#F0C24A", "#173A2D", "#E0584A", "#F3E3B0", "#B8693A", "#6FB896"] },
    },
  },
};
