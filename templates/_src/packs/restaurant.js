"use strict";
/**
 * Industry pack: restaurant and bistro (small plates, grill, sweet things, drinks). Words, dishes, prices, colours and art for every
 * layout that serves this industry. Dishes and prices are EXAMPLE content for the sample site; the platform replaces them with the
 * customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "small", name: "Small plates", blurb: "Made to share, or not. Order a few and let them land as they are ready.", art: "bowl", items: [
    A("Burnt-onion soup", "&pound;8", "Slow-cooked onions, sourdough and a melted aged-cheddar toastie on top.", { tags: ["Popular", "V"], star: true }),
    A("Whipped feta and honey", "&pound;9", "Warm flatbread, chilli oil and thyme honey.", { tags: ["V"] }),
    A("Crispy squid", "&pound;11", "Lightly floured, fried hot, with lemon and smoked aioli.", { tags: ["Popular"], star: true }),
    A("Charred hispi cabbage", "&pound;8", "Grilled until sweet, with miso butter and toasted hazelnuts.", { tags: ["New", "V"] }),
  ] },
  { id: "fire", name: "From the fire", blurb: "Oak and charcoal, one grill, and nowhere to hide. Everything is cooked over flame.", art: "cloche", items: [
    A("10oz ribeye", "&pound;34", "Dry-aged for 35 days, cooked over oak. Served with bone-marrow butter and chips.", { tags: ["Popular", "GF"], star: true }),
    A("Half wood-fired chicken", "&pound;19", "Brined overnight, glazed with chilli honey, with a bright green salsa.", { tags: ["GF"] }),
    A("Whole sea bream", "&pound;26", "Grilled whole with fennel, capers and lemon butter.", { tags: ["GF", "New"], star: true }),
    A("Nduja and honey pizza", "&pound;15", "Slow-fermented dough, San Marzano tomato, mozzarella and hot honey.", { tags: ["Popular"], art: "pizza" }),
  ] },
  { id: "sweet", name: "Sweet things", blurb: "Not an afterthought. Save room.", art: "tart", items: [
    A("Burnt basque cheesecake", "&pound;8", "Deeply caramelised outside, soft in the middle. Poached cherries on the side.", { tags: ["Popular", "V"], star: true }),
    A("Sticky toffee pudding", "&pound;8", "Date sponge, hot toffee sauce and clotted cream ice cream.", { tags: ["V"] }),
    A("Dark chocolate pot", "&pound;7", "Silky and not too sweet, with sea salt and olive oil.", { tags: ["V", "GF"], star: true }),
    A("Lemon tart", "&pound;8", "Crisp pastry, sharp curd and a little torched meringue.", { tags: ["V", "New"] }),
  ] },
  { id: "drinks", name: "Drinks", blurb: "Small producers, honest pours and cocktails with a bit of smoke.", art: "wineglass", items: [
    A("House red", "&pound;7.50 a glass", "A soft, juicy tempranillo from a family estate in Rioja.", { tags: ["Popular"], star: true }),
    A("Smoked old fashioned", "&pound;11", "Bourbon, maple and bitters, smoked at the table with oak chips.", { tags: ["Popular"], art: "cocktail", star: true }),
    A("Local craft ale", "&pound;5.50 a pint", "Rotating guest taps from breweries within ten miles.", { tags: [] }),
    A("Elderflower spritz", "&pound;7", "Elderflower, sparkling wine and soda, over ice with cucumber.", { tags: ["New"], art: "cocktail" }),
  ] },
].map((c) => ({
  ...c,
  photo: { small: "small plates on a rustic restaurant table in warm light", fire: "a steak cooking over a flaming oak grill in a restaurant kitchen", sweet: "a dessert on a dark wooden table in a candlelit restaurant", drinks: "cocktails and wine glasses on a bar in warm evening light" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { small: "a plate of {n} on a rustic table", fire: "{n} fresh off a wood fire grill", sweet: "a plated {n} in warm candlelight", drinks: "a {n} on a bar at golden hour" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "The ribeye is the best I have had outside of a steakhouse. And the staff make you feel like a regular on day one.", by: "Sample review, Hannah W." },
  { q: "We came for a quick bite and stayed three hours. The burnt-onion soup alone is worth the trip.", by: "Sample review, Marcus T." },
  { q: "Lovely room, proper cooking and a fair price. Our new family favourite.", by: "Sample review, the Patel family" },
];
const chef = { n: "Tom Hartley", role: "Chef and owner", bio: "Fifteen years in kitchens from Lyon to London, and one big idea: cook everything over fire and buy from people he can shake hands with." };
const sup = ["Oak-smoked and dry-aged beef from a farm 20 miles away", "Fish landed that morning at the south coast", "Sourdough baked in the building, every day"];

const T = {
  atelier: ":root{--accent:#B5362B;--soft:#F7F0E6;--line:#E8DACA;--ink:#241612;--muted:#6C5A50}.hero-box{background:#140B08}.hero-box::after{background:linear-gradient(180deg,rgba(20,11,8,.55) 0%,rgba(20,11,8,0) 36%,rgba(20,11,8,.8) 100%)}.tile::after{background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(30,12,8,.75))}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#B5362B;--gold:#E2B14C;--soft:#F7F0E6;--line:#E8DACA;--ink:#241612;--muted:#6C5A50}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#B5362B;--butter:#F5D9A0;--soft:#F7F0E6;--line:#E8DACA;--ink:#241612;--muted:#6C5A50}.order .lead,.order .hours th,.order .f label{color:#4A2218}",
  studio: ":root{--accent:#F08A3C}.btn-primary{color:#1B0C04}.tag.star{color:#1B0C04}",
  daylight: ":root{--accent:#A82F25}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "restaurant",
  label: "Restaurant and bistro",
  ldType: "Restaurant",
  ldExtra: { servesCuisine: "Modern British, wood-fired" },
  hint: "restaurant",
  photo: "natural warm restaurant photograph, candlelight and wood fire, honest plated food, shallow depth of field, photorealistic, no text",
  videoQuery: "restaurant kitchen fire",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "cellar", "smokehouse", "trattoria", "cocktail", "tasting"],
  mediaDir: "restaurant",
  nav: { home: "Home", menu: "Menu", cta: "Book a table", ctaHref: "index.html#order" },
  cats,
  reviews,
  chef,
  sup,
  tags: { Popular: "Our most ordered", New: "New this season", V: "Vegetarian", GF: "Gluten free" },
  seo: {
    home: { title: "Wood-fired restaurant and bar", desc: "{{business_name}} is a wood-fired restaurant and bar in {{city}}. Dry-aged steaks, small plates, sweet things and cocktails. Book a table online." },
    menu: { title: "Menu and prices", desc: "See the full menu and prices at {{business_name}}, {{city}}: small plates, dishes from the fire, desserts and drinks." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Book a table", submit: "Request my table" },
  demo: {
    business_name: "Ember & Oak", tagline: "A wood-fired restaurant and bar in the heart of Bristol. Dry-aged steaks, small plates and cocktails with a bit of smoke.", city: "Bristol",
    phone: "0117 555 0164", phone_href: "+441175550164", email: "hello@emberandoak.example", address_line1: "22 Harbour Street", address_line2: "Bristol BS1 5AA",
    hours_weekdays: "5pm – 10:30pm", hours_saturday: "12pm – 11pm", hours_sunday: "12pm – 8pm", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=22+Harbour+Street+Bristol", form_endpoint: "", year_founded: "2017", owner_name: "Tom Hartley",
    years_open: "8", clients_served: "90000", team_size: "14", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Fire, smoke &amp; good company",
      heroH1: "Dinner, <em>cooked over fire</em>.",
      cta1: "Book a table", cta1Href: "{{booking_url}}", cta2: "See the menu", cta2Href: "menu.html",
      glass: ["Open tonight", "Walk-ins welcome", "Open {{hours_weekdays}} on weekdays. Bar seats are never booked."],
      promise: [["From the fire", "Oak and charcoal, one grill, no shortcuts."], ["Local first", "Beef, fish and bread from people we know."], ["Made to share", "Order a few plates and pass them round."]],
      collection: ["On the menu", "Four ways <em>to eat well</em>", "Full menu"],
      fav: ["Most ordered", "House <em>favourites</em>"],
      story: { eyebrow: "Our story", h2: "One grill, <em>a lot of love</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} with a wood-fired grill and a simple promise: good food, honest prices and a room you will not want to leave.", art: "cloche", alt: "A serving cloche", hint: "a chef plating a dish in a warm open kitchen" },
      stats: [["{{years_open}}", "", "years open"], ["{{clients_served}}", "+", "plates served"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to dinner</em>", [["Book", "Pick a day and time, or just walk in."], ["Sit", "Settle in, we will bring water and the menu."], ["Share", "Order a few plates and we will bring them as they are ready."]]],
      orderHome: "Book <em>a table</em>", orderMenu: "Ready to <em>eat</em>?", orderLead: "Tell us when and how many, and we will confirm your table within the hour.",
      menuHero: ["Menu and prices", "The <em>full menu</em>", "Prices include VAT. Tell us about any allergies and we will look after you. V means vegetarian, GF means gluten free."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Fire, smoke &amp; good company",
      heroH1: "Food that <em>tastes of fire</em>.",
      cta1: "Book a table", cta1Href: "{{booking_url}}", cta2: "See the menu", cta2Href: "menu.html",
      badge: "Open tonight &middot; {{hours_weekdays}}",
      fav: ["Most ordered", "House <em>favourites</em>", "Dishes people come back for", "Order this &rarr;"],
      story: { eyebrow: "Our story", h2: "One grill, <em>one big idea</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. We cook over oak, buy from neighbours and treat every table like friends." },
      facts: [["{{years_open}}", "", "years open"], ["{{clients_served}}", "+", "plates served"], ["{{team_size}}", "", "people on the team"]],
      panels: [["cloche", "A serving cloche", "From the fire", "Oak-grilled steaks, fish and chicken.", "steak on a grill", "featured"], ["bowl", "A bowl of soup", "Small plates", "Made to share.", "small plates", "secondary"], ["cocktail", "A cocktail", "Drinks", "Smoked cocktails and local ales.", "cocktail", "secondary"]],
      statement: "<span>Oak,</span> <span>fire,</span> <span>steak</span> <span>and</span> <span><em>smoke</em></span> <span>in {{city}}.</span>",
      orderHome: "Book <em>a table</em>", orderMenu: "Ready to <em>eat</em>?", orderLead: "Tell us when and how many, and we will confirm your table within the hour.",
      menuHero: ["Menu", "The <em>full</em> menu", "Prices include VAT. Tell us about any allergies."],
    },
    motion: {
      heroLines: ["Cooked", "over fire"],
      cta1: "Book a table", cta1Href: "{{booking_url}}", cta2: "See the menu", cta2Href: "menu.html",
      marquee: ["Steak", "Smoke", "Sourdough", "Cocktails"],
      tiles: ["On the <em>menu</em>", "Full menu"],
      nums: [["{{years_open}}", "", "Years open"], ["{{clients_served}}", "+", "Plates served"], ["{{team_size}}", "", "Team"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. One grill, local suppliers and a room that feels like a friend's dining table.",
      orderHome: "Come in<br><em>and eat.</em>", orderMenu: "Ready to <em>book?</em>", orderLead: "Tell us when and how many, and we will confirm your table within the hour.",
      menuHero: ["The <em>menu</em>", "Prices include VAT. Tell us about any allergies."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#2A1A14", crust: "#D9A55B", crustDark: "#A9722A", light: "#F6DDA8", cream: "#F7F0E6", accent: "#B5362B", accent2: "#F0A23B", shadow: "rgba(50,20,10,.38)", plate: "#FFFFFF" },
    motifs: ["cloche", "wineglass", "pizza", "cocktail", "bowl", "tart"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFF6EA 0%,#F7DFC2 55%,#E8BE92 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(110,50,20,.12) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { cloche: "#F4D2B0", wineglass: "#F2B9AE", pizza: "#FBE0A6", cocktail: "#F6C9A0", bowl: "#F2CBA7", tart: "#F6BFC0" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { cloche: "#E88A4C", wineglass: "#C94A3C", pizza: "#F2B84B", cocktail: "#F29B4B", bowl: "#E08A5A", tart: "#E6788A" } },
    },
    videos: {
      atelier: { T: 8, page: "#140B08", sky: ["#0C0605", "#1F0F09", "#3A1A0C"], glow: "255,140,70", beam: "255,200,150", dust: "255,215,170", steam: "255,230,205", items: [["cloche", 700, 650, 420, 0], ["wineglass", 500, 660, 250, 0.4], ["bowl", 1010, 640, 260, 0.7]] },
      gallery: { T: 10, disc: ["#FBE6CF", "#F4C79B", "#E8A06A"], ring: "190,90,40", items: ["cloche", "wineglass", "pizza", "cocktail", "tart"] },
      motion: { T: 8, base: "#FBEFE3", blobs: ["#B5362B", "#F0A23B", "#E2B14C", "#3A1A0C", "#F5D9A0", "#E8704A", "#7A3A4B"] },
    },
  },
};
