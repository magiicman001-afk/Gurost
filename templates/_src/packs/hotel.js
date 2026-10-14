"use strict";
/**
 * Industry pack: boutique hotel and travel (rooms, dining, experiences, holiday packages). Words, example
 * listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for
 * the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "rooms", name: "Rooms and suites", blurb: "Quiet, comfortable rooms with proper beds, blackout curtains and a kettle you will actually use.", art: "bed", items: [
    A("Classic double", "from &pound;129 a night", "A calm double with a king bed, rainfall shower and garden views.", { tags: ["Popular"], star: true, art: "bed" }),
    A("Garden view room", "from &pound;159 a night", "A larger room opening onto the walled garden, with a reading chair.", { tags: [], star: true, art: "lamp" }),
    A("Family suite", "from &pound;219 a night", "Two rooms, sleeps four, with bunk beds the children will argue over.", { tags: ["Popular"], art: "bed" }),
    A("The Tower suite", "from &pound;329 a night", "Our top-floor suite with a freestanding bath and a view over the rooftops.", { tags: ["New"], art: "compass" }),
  ] },
  { id: "dining", name: "Dining and bar", blurb: "Seasonal food from local suppliers, and a bar that closes when you do.", art: "shell", items: [
    A("Cooked breakfast", "&pound;14", "Local eggs, smoked bacon and sourdough, served until 10.30am.", { tags: ["Popular"], star: true, art: "shell" }),
    A("Afternoon tea", "&pound;22", "Sandwiches, warm scones and cakes, with a pot of loose-leaf tea.", { tags: [], star: true, art: "lamp" }),
    A("Tasting dinner", "&pound;48", "Five small courses from the garden and the farm next door.", { tags: ["New"], art: "shell" }),
    A("Sunday lunch", "&pound;26", "Slow-roast beef or nut roast with all the trimmings, booked by the table.", { tags: [], art: "boat" }),
  ] },
  { id: "do", name: "Things to do", blurb: "Easy days out we have tried ourselves, bookable at the desk.", art: "compass", items: [
    A("Guided coastal walk", "&pound;25 each", "Three hours with a local guide, tea and cake halfway.", { tags: ["Popular"], star: true, art: "compass" }),
    A("Boat trip", "&pound;35 each", "A two-hour trip along the coast with a skipper who knows every cove.", { tags: [], star: true, art: "boat" }),
    A("Spa treatment", "from &pound;65", "A massage or facial in our quiet garden treatment room.", { tags: [], art: "shell" }),
    A("Cookery class", "&pound;55 each", "Cook a three-course supper in the hotel kitchen, then eat it.", { tags: ["New"], art: "lamp" }),
  ] },
  { id: "trips", name: "Holidays arranged", blurb: "Not just our hotel. We plan complete trips, with real people on the phone.", art: "suitcase", items: [
    A("Weekend break", "from &pound;249 each", "Two nights, breakfast and one dinner, with a walk or trip included.", { tags: ["Popular"], star: true, art: "suitcase" }),
    A("Romantic escape", "from &pound;389 each", "Tower suite, champagne on arrival and a tasting dinner for two.", { tags: [], star: true, art: "bed" }),
    A("City break abroad", "from &pound;420 each", "Flights, central hotel and a local guide, planned around your dates.", { tags: ["New"], art: "compass" }),
    A("Family holiday", "from &pound;1,150 a family", "A week of sun, sorted: flights, transfers and a kids club.", { tags: [], art: "boat" }),
  ] },
].map((c) => ({
  ...c,
  photo: { rooms: "a bright, calm boutique hotel bedroom with a made-up king bed and soft daylight", dining: "a beautifully plated seasonal breakfast on a linen-covered table by a window", do: "two walkers on a coastal path with the sea behind them, soft morning light", trips: "an open vintage suitcase on a bed with a passport and a map, soft daylight" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { rooms: "a hotel room, {n}", dining: "a plated dish, {n}", do: "a day out, {n}", trips: "a holiday scene, {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "The bed was perfect and the breakfast was the best we have had anywhere. They remembered our names on day two.", by: "Sample review, Laura and Ben" },
  { q: "They planned our whole trip to Lisbon in one phone call and it ran like clockwork.", by: "Sample review, Mr Hussain" },
  { q: "Brought the children for half term. The family suite, the garden and the staff were all brilliant.", by: "Sample review, Sophie T." },
];
const chef = { n: "Margaret Ellis", role: "Owner and host", bio: "Margaret bought a run-down guest house in {{year_founded}} and turned it into a place she would want to stay herself. She still greets guests at the door." };
const sup = ["Sample star rating and awards go here", "Free cancellation up to 48 hours before", "Dogs welcome in garden rooms"];
const faq = [["What time are check-in and check-out?", "Check-in is from 3pm and check-out by 11am. Early arrival? We will store your bags and have the kettle on."], ["Can I cancel?", "Yes, free up to 48 hours before arrival. Inside 48 hours we charge the first night."], ["Do you welcome dogs?", "In our garden rooms, for a small fee. Please tell us when you book."], ["Is there parking?", "Yes, free parking for guests, and a charging point for electric cars."]];
const steps = [["Tell us your dates", "Choose dates and who is coming. We show what is free and the price."], ["We confirm in writing", "A named person confirms by email, with directions and anything we should know."], ["Arrive and relax", "We take your bags, put the kettle on and show you the best of the area."]];

const T = {
  atelier: ":root{--accent:#B5532F;--soft:#F6F0E6;--line:#E3D9C7;--ink:#1B2A2E;--muted:#5C6A6C}.hero-box{background:#1B2A2E}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#B5532F;--gold:#E8B76B;--soft:#F6F0E6;--line:#E3D9C7;--ink:#1B2A2E;--muted:#5C6A6C}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#B5532F;--butter:#F5DDB0;--soft:#F6F0E6;--line:#E3D9C7;--ink:#1B2A2E;--muted:#5C6A6C}",
  studio: ":root{--accent:#E8B76B}.btn-primary{color:#14110A}.tag.star{color:#14110A}",
  daylight: ":root{--accent:#97431F}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "hotel",
  label: "Hotel and travel",
  ldType: "Hotel",
  ldExtra: { areaServed: "Bath" },
  hint: "bed",
  photo: "natural bright photograph of a calm boutique hotel with a walled garden, warm daylight, photorealistic, no text",
  videoQuery: "boutique hotel",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "rooms", "voyage", "packing", "lantern", "seasons"],
  mediaDir: "hotel",
  nav: { home: "Home", menu: "Stay and do", cta: "Check dates", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most booked", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Boutique hotel and holidays", desc: "{{business_name}} is a friendly boutique hotel in {{city}}. Comfortable rooms, seasonal dining, days out and holidays arranged by real people." },
    menu: { title: "Rooms, dining and holidays", desc: "See rooms, dining, things to do and holiday packages at {{business_name}} in {{city}}." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Plan your stay", submit: "Send my enquiry" },
  demo: {
    business_name: "The Larkspur", tagline: "A friendly boutique hotel in Bath. Quiet rooms, seasonal food, easy days out, and holidays planned by real people.", city: "Bath",
    phone: "01225 555 0148", phone_href: "+441225555014", email: "stay@thelarkspur.example", address_line1: "4 Lansdown Crescent", address_line2: "Bath BA1 5EX",
    hours_weekdays: "Reception 7am – 10pm", hours_saturday: "Reception 7am – 10pm", hours_sunday: "Reception 7am – 10pm", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Lansdown+Crescent+Bath", form_endpoint: "", year_founded: "2009", owner_name: "Margaret Ellis",
    years_open: "16", clients_served: "40000", team_size: "22", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Boutique hotel",
      heroH1: "Stay <em>a little longer</em>.",
      cta1: "Check dates", cta1Href: "#order", cta2: "See rooms", cta2Href: "menu.html",
      glass: ["Rooms free", "From £129 a night", "{{hours_weekdays}}. Free cancellation up to 48 hours before."],
      promise: [["Free cancellation", "Up to 48 hours before arrival."], ["Breakfast you will remember", "Local eggs, bacon and bread."], ["Real people", "One phone call, one named host."]],
      collection: ["Stay and do", "Everything for <em>a good stay</em>", "All options"],
      fav: ["Popular", "What guests <em>book most</em>"],
      story: { eyebrow: "About us", h2: "A hotel run <em>like a home</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} to create a place she would want to stay herself. She still greets guests at the door.", art: "bed", alt: "A made-up hotel bed", hint: "a warm hotel owner welcoming guests at the door" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "guests welcomed"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to a good stay</em>", steps],
      orderHome: "Plan <em>your stay</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us your dates and who is coming. A real person replies the same day.",
      menuHero: ["Stay and do", "Rooms <em>and more</em>", "Prices are examples. We confirm the exact price for your dates."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Boutique hotel",
      heroH1: "Come <em>and stay</em>.",
      cta1: "Check dates", cta1Href: "#order", cta2: "See rooms", cta2Href: "menu.html",
      badge: "From £129 a night &middot; {{phone}}",
      fav: ["Popular", "What guests <em>book most</em>", "Our favourite rooms and days out", "Book &rarr;"],
      story: { eyebrow: "About us", h2: "One hotel, <em>one welcome</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Quiet rooms, honest food and a host who knows your name." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "guests welcomed"], ["{{team_size}}", "", "people on the team"]],
      panels: [["bed", "A made-up hotel bed", "Rooms", "Quiet rooms with proper beds.", "hotel bed", "featured"], ["shell", "A seashell", "Dining", "Seasonal food and a good bar.", "seashell", "secondary"], ["compass", "A brass compass", "Days out", "Easy trips we have tried.", "compass", "secondary"]],
      statement: "<span>Rest,</span> <span>eat,</span> <span>and</span> <span><em>explore</em></span> <span>in {{city}}.</span>",
      orderHome: "Plan <em>your stay</em>", orderMenu: "Ready <em>to book</em>?", orderLead: "Tell us your dates and who is coming. A real person replies the same day.",
      menuHero: ["Stay and do", "Rooms <em>and more</em>", "Prices are examples. We confirm the exact price for your dates."],
    },
    motion: {
      heroLines: ["Stay a", "little longer"],
      cta1: "Check dates", cta1Href: "#order", cta2: "See rooms", cta2Href: "menu.html",
      marquee: ["Rooms", "Dining", "Days out", "Holidays"],
      tiles: ["Stay <em>and do</em>", "All options"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Guests"], ["{{team_size}}", "", "Team"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Quiet rooms, honest food and a host who knows your name.",
      orderHome: "Need a break?<br><em>Plan your stay.</em>", orderMenu: "Ready <em>to book?</em>", orderLead: "Tell us your dates and who is coming. A real person replies the same day.",
      menuHero: ["Rooms <em>and more</em>", "Prices are examples. We confirm the exact price for your dates."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#1B2A2E", crust: "#D8CBB4", crustDark: "#1F3F46", light: "#F6F0E6", cream: "#F6F0E6", accent: "#C75B39", accent2: "#F0C27B", shadow: "rgba(27,42,46,.34)", plate: "#FFFFFF" },
    motifs: ["bed", "suitcase", "compass", "lamp", "boat", "shell"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FBF6EC 0%,#EADFC9 55%,#D3C3A4 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(40,40,30,.13) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { bed: "#F3DDD3", suitcase: "#F6E3C6", compass: "#E6E0CE", lamp: "#F6E3C6", boat: "#D3E4EA", shell: "#F3DDD3" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { bed: "#C75B39", suitcase: "#1F6F78", compass: "#C99A3E", lamp: "#F0C27B", boat: "#6FB3C8", shell: "#B5532F" } },
    },
    videos: {
      atelier: { T: 8, page: "#10181B", sky: ["#0C1214", "#17262A", "#2C4249"], glow: "255,200,130", beam: "255,225,170", dust: "255,236,205", steam: "235,238,238", items: [["bed", 700, 650, 430, 0], ["lamp", 480, 660, 240, 0.4], ["suitcase", 1010, 650, 230, 0.7]] },
      gallery: { T: 10, disc: ["#FBF6EC", "#EADFC9", "#D3C3A4"], ring: "181,83,47", items: ["bed", "suitcase", "compass", "lamp", "boat"] },
      motion: { T: 8, base: "#F6F0E6", blobs: ["#C75B39", "#1F3F46", "#F0C27B", "#6FB3C8", "#F5DDB0", "#B5532F", "#8A5A3A"] },
    },
  },
};
