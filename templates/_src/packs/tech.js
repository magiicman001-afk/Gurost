"use strict";
/**
 * Industry pack: tech agency and SaaS (a digital studio building websites, apps and software for small businesses, with care plans).
 * Words, example listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE
 * content for the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "websites", name: "Websites", blurb: "Fast, beautiful sites that look great on every phone and turn visitors into customers.", art: "laptop", items: [
    A("Brochure website", "from &pound;2,500", "Five pages, your brand, your words and a launch in four weeks.", { tags: ["Popular"], star: true, art: "laptop" }),
    A("Online shop", "from &pound;5,500", "Products, payments and stock, set up so you can run it yourself.", { tags: [], star: true, art: "chart" }),
    A("Landing page", "from &pound;900", "One page built to sell one thing, with tracking from day one.", { tags: [], art: "rocket" }),
    A("Website refresh", "from &pound;1,400", "A new look and faster pages for the site you already have.", { tags: ["New"], art: "gear" }),
  ] },
  { id: "apps", name: "Mobile apps", blurb: "iPhone and Android apps your customers will actually open.", art: "phone", items: [
    A("Customer app", "from &pound;12,000", "Bookings, accounts and notifications, on both iPhone and Android.", { tags: ["Popular"], star: true, art: "phone" }),
    A("Internal team app", "from &pound;8,500", "Replace paper and spreadsheets with a simple app for your staff.", { tags: [], star: true, art: "gear" }),
    A("App prototype", "from &pound;3,000", "A clickable prototype to test your idea with real people.", { tags: [], art: "phone" }),
    A("App store launch", "&pound;950", "Listings, screenshots and submission, handled for you.", { tags: ["New"], art: "rocket" }),
  ] },
  { id: "software", name: "Software and SaaS", blurb: "Custom tools and cloud products that fit the way you work.", art: "cloud", items: [
    A("Custom web app", "from &pound;15,000", "Dashboards, portals and workflow tools, built around your process.", { tags: ["Popular"], star: true, art: "cloud" }),
    A("MVP in 8 weeks", "from &pound;18,000", "Launch a first version of your product and learn from real users.", { tags: [], star: true, art: "rocket" }),
    A("Integrations and APIs", "from &pound;4,000", "Connect the tools you already use so data flows on its own.", { tags: [], art: "gear" }),
    A("Cloud migration", "from &pound;6,500", "Move to the cloud safely, with backups and a rollback plan.", { tags: ["New"], art: "cloud" }),
  ] },
  { id: "growth", name: "Care and growth", blurb: "Hosting, updates and marketing that keep your product healthy.", art: "chart", items: [
    A("Care plan", "&pound;149 a month", "Hosting, security updates, backups and two hours of changes.", { tags: ["Popular"], star: true, art: "gear" }),
    A("SEO and analytics", "&pound;450 a month", "Be found on Google and see exactly what is working.", { tags: [], star: true, art: "chart" }),
    A("Performance audit", "&pound;650", "A written report on speed, security and accessibility.", { tags: [], art: "laptop" }),
    A("Product support", "&pound;60 an hour", "Developers on call when something breaks or needs building.", { tags: ["New"], art: "phone" }),
  ] },
].map((c) => ({
  ...c,
  photo: { websites: "a designer working on a website layout on a large monitor in a bright modern studio", apps: "hands holding a smartphone showing a clean mobile app interface, soft office light", software: "two developers discussing code on a screen in a calm modern office", growth: "a team reviewing analytics charts on a screen in a bright meeting room" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { websites: "a screenshot-style image of {n}", apps: "a mobile app screen for {n}", software: "a clean product dashboard for {n}", growth: "an analytics dashboard for {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "They rebuilt our website in four weeks and bookings doubled. Clear, honest and never jargon-y.", by: "Sample review, Anya R., physiotherapist" },
  { q: "The MVP launched on time and on budget. We had paying customers in the first month.", by: "Sample review, Luke M., founder" },
  { q: "The care plan is the best money we spend. Something breaks, they fix it before we notice.", by: "Sample review, Sandra P., shop owner" },
];
const chef = { n: "Jonah Reed", role: "Founder and technical director", bio: "Jonah started {{business_name}} in {{year_founded}} after ten years building software for big companies. He wanted small businesses to get the same quality without the same bills." };
const sup = ["Fixed prices, agreed in writing (sample text)", "You own your code and your accounts", "UK-based team, no outsourcing"];
const faq = [["Do I own the website or app?", "Yes. You own the code, the designs and every account from day one. We hand over everything, any time you ask."], ["How long does a project take?", "A brochure website takes about four weeks. An app or custom web app usually takes 8 to 16 weeks, depending on scope."], ["Do you offer fixed prices?", "Always. We agree the scope and the price in writing before we start. No surprises."], ["What happens after launch?", "Our care plans cover hosting, security updates and changes. You can also move away at any time, with no lock-in."]];
const steps = [["Discovery call", "A free 30 minute call about your goals, users and budget."], ["Fixed proposal", "A clear scope, timeline and price within three working days."], ["Build and launch", "Weekly demos, then a smooth launch and ongoing care."]];

const T = {
  atelier: ":root{--accent:#4F46E5;--soft:#F3F2FF;--line:#DEDCF7;--ink:#12142B;--muted:#5A5E7E}.hero-box{background:#12142B}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#4F46E5;--gold:#0EA5C6;--soft:#F3F2FF;--line:#DEDCF7;--ink:#12142B;--muted:#5A5E7E}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#4F46E5;--butter:#C9F2FB;--soft:#F3F2FF;--line:#DEDCF7;--ink:#12142B;--muted:#5A5E7E}",
  studio: ":root{--accent:#22D3EE}.btn-primary{color:#06202A}.tag.star{color:#06202A}",
  daylight: ":root{--accent:#3730A3}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "tech",
  label: "Tech agency and SaaS",
  ldType: "ProfessionalService",
  ldExtra: { areaServed: "GB" },
  hint: "laptop",
  photo: "natural bright photograph of a small team collaborating at a desk with laptops in a modern studio, soft daylight, photorealistic, no text",
  videoQuery: "software developers",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "estimate", "care", "stack", "status", "metrics"],
  mediaDir: "tech",
  nav: { home: "Home", menu: "Services", cta: "Book a call", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most chosen", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Websites, apps and software for small businesses", desc: "{{business_name}} designs and builds websites, mobile apps and software in {{city}}. Fixed prices, you own your code, and care plans after launch." },
    menu: { title: "Services, packages and prices", desc: "See website, app and software packages and prices from {{business_name}} in {{city}}. Fixed prices, agreed in writing." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Book a call", submit: "Book my free call" },
  demo: {
    business_name: "Northlight Digital", tagline: "We design and build websites, apps and software for small businesses. Fixed prices, and you own everything.", city: "Manchester",
    phone: "0161 496 0377", phone_href: "+441614960377", email: "hello@northlight.example", address_line1: "40 Oxford Road", address_line2: "Manchester M1 5AN",
    hours_weekdays: "9am – 5:30pm", hours_saturday: "Closed", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Oxford+Road+Manchester", form_endpoint: "", year_founded: "2015", owner_name: "Jonah Reed",
    years_open: "10", clients_served: "180", team_size: "12", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Digital studio",
      heroH1: "Software that <em>works</em> as hard as you do.",
      cta1: "Book a call", cta1Href: "#order", cta2: "See services", cta2Href: "menu.html",
      glass: ["Free call", "Reply within a day", "Calls {{hours_weekdays}} on weekdays, no obligation."],
      promise: [["Fixed prices", "Agreed in writing first."], ["You own it", "Code, designs and accounts."], ["UK-based team", "No outsourcing."]],
      collection: ["Services", "Everything <em>you need to grow</em>", "All services"],
      fav: ["Popular", "Services <em>clients choose most</em>"],
      story: { eyebrow: "About us", h2: "Engineers who <em>speak human</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}} after ten years building software for large companies, to give small businesses the same quality at honest prices.", art: "laptop", alt: "A laptop", hint: "a developer smiling at a laptop" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "products launched"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to launch</em>", steps],
      orderHome: "Book <em>a free call</em>", orderMenu: "Ready <em>to build</em>?", orderLead: "Tell us what you want to build. We reply within a day with a time for a free 30 minute call.",
      menuHero: ["Services", "Packages <em>and prices</em>", "Prices are examples. Every project gets a fixed, written quote."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Digital studio",
      heroH1: "Digital products, <em>built properly</em>.",
      cta1: "Book a call", cta1Href: "#order", cta2: "See services", cta2Href: "menu.html",
      badge: "Free discovery call &middot; {{phone}}",
      fav: ["Popular", "Services <em>clients choose most</em>", "Our most requested work", "Book &rarr;"],
      story: { eyebrow: "About us", h2: "One team, <em>one clear plan</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. Clear plans, honest prices and software that earns its keep." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "products launched"], ["{{team_size}}", "", "people on the team"]],
      panels: [["laptop", "A laptop", "Websites", "Fast and beautiful.", "laptop", "featured"], ["phone", "A smartphone", "Apps", "Loved by your customers.", "smartphone", "secondary"], ["cloud", "A cloud", "Software", "Built around your process.", "cloud", "secondary"]],
      statement: "<span>Clear,</span> <span>fast,</span> <span>and</span> <span><em>built to last</em></span> <span>from {{city}}.</span>",
      orderHome: "Book <em>a free call</em>", orderMenu: "Ready <em>to build</em>?", orderLead: "Tell us what you want to build. We reply within a day with a time for a free 30 minute call.",
      menuHero: ["Services", "Packages <em>and prices</em>", "Prices are examples. Every project gets a fixed, written quote."],
    },
    motion: {
      heroLines: ["Software that", "works for you"],
      cta1: "Book a call", cta1Href: "#order", cta2: "See services", cta2Href: "menu.html",
      marquee: ["Websites", "Apps", "Software", "Growth"],
      tiles: ["Our <em>services</em>", "All services"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Launches"], ["{{team_size}}", "", "People"]],
      about: "{{owner_name}} started {{business_name}} in {{year_founded}}. Clear plans, honest prices and software that earns its keep.",
      orderHome: "Got an idea?<br><em>Let us talk.</em>", orderMenu: "Ready <em>to build?</em>", orderLead: "Tell us what you want to build. We reply within a day with a time for a free 30 minute call.",
      menuHero: ["Packages <em>and prices</em>", "Prices are examples. Every project gets a fixed, written quote."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#12142B", crust: "#DAD8F6", crustDark: "#1F1C5C", light: "#EEEDFC", cream: "#F3F2FF", accent: "#5B54E8", accent2: "#22D3EE", shadow: "rgba(30,28,90,.34)", plate: "#FFFFFF" },
    motifs: ["laptop", "rocket", "chart", "cloud", "phone", "gear"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#F9F8FF 0%,#E2E0F8 55%,#C3C0EC 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(30,28,100,.13) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { laptop: "#E0DEF8", rocket: "#D4F3FA", chart: "#E0DEF8", cloud: "#D4F3FA", phone: "#E0DEF8", gear: "#D4F3FA" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { laptop: "#5B54E8", rocket: "#22D3EE", chart: "#1F1C5C", cloud: "#38BDF8", phone: "#7C3AED", gear: "#F59E0B" } },
    },
    videos: {
      atelier: { T: 8, page: "#0B0C1F", sky: ["#080918", "#12143A", "#2A2D7A"], glow: "120,200,255", beam: "170,215,255", dust: "200,225,255", steam: "190,200,255", items: [["laptop", 700, 650, 430, 0], ["rocket", 480, 660, 240, 0.4], ["chart", 1010, 650, 240, 0.7]] },
      gallery: { T: 10, disc: ["#F9F8FF", "#E2E0F8", "#C3C0EC"], ring: "91,84,232", items: ["laptop", "rocket", "chart", "cloud", "phone"] },
      motion: { T: 8, base: "#F3F2FF", blobs: ["#5B54E8", "#22D3EE", "#1F1C5C", "#7C3AED", "#C9F2FB", "#38BDF8", "#F59E0B"] },
    },
  },
};
