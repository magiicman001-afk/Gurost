"use strict";
/**
 * Industry pack: estate agent and lettings (homes for sale, homes to rent, selling with us, landlord services). Words, example
 * listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for
 * the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "home", name: "Buying and selling", blurb: "Conveyancing from offer to keys, with one fixed fee and a named lawyer.", art: "folder", items: [
    A("Buying a home", "from &pound;895 + VAT", "A fixed-fee purchase, with searches, Land Registry and stamp duty handled for you.", { tags: ["Popular"], star: true }),
    A("Selling a home", "from &pound;795 + VAT", "We deal with the buyer's solicitor and keep your sale on track to completion.", { tags: [], star: true }),
    A("Remortgage", "from &pound;395 + VAT", "A quick, fixed-fee remortgage when you switch lender, with no surprises.", { tags: [], art: "contract" }),
    A("Leasehold and lease extensions", "from &pound;1,100 + VAT", "Clear advice on leases, ground rent and extending your lease.", { tags: ["New"], art: "scroll" }),
  ] },
  { id: "family", name: "Family and divorce", blurb: "Calm, practical advice at the hardest of times, with fixed fees where we can.", art: "scales", items: [
    A("Divorce", "from &pound;750 + VAT", "Guidance through every step of an uncontested divorce, in plain English.", { tags: ["Popular"], star: true, art: "contract" }),
    A("Children and arrangements", "from &pound;300 an hour", "Agreements and court orders that put your children first.", { tags: [], star: true }),
    A("Financial settlements", "from &pound;1,500 + VAT", "A fair, legally binding agreement about money and property.", { tags: [], art: "folder" }),
    A("Prenuptial agreements", "from &pound;950 + VAT", "A clear, fair agreement before the wedding, drafted with care.", { tags: ["New"], art: "pen" }),
  ] },
  { id: "wills", name: "Wills, probate and trusts", blurb: "Look after the people you love, and settle an estate without the stress.", art: "scroll", items: [
    A("Single will", "&pound;180 + VAT", "A clear, properly witnessed will, written to your wishes.", { tags: ["Popular"], star: true }),
    A("Lasting power of attorney", "&pound;295 + VAT", "Choose who can make decisions for you if you ever cannot.", { tags: [], star: true, art: "pen" }),
    A("Probate", "from &pound;1,250 + VAT", "We deal with the paperwork, so you can focus on your family.", { tags: [], art: "folder" }),
    A("Trusts", "from &pound;650 + VAT", "Protect your home and savings for the next generation.", { tags: ["New"], art: "contract" }),
  ] },
  { id: "work", name: "Work and business", blurb: "Straight answers for employees and owners, before a problem becomes a fight.", art: "pen", items: [
    A("Employment advice", "first call free", "Unfair dismissal, redundancy, pay and discrimination, explained clearly.", { tags: ["Popular"], star: true, art: "scales" }),
    A("Settlement agreements", "from &pound;350 + VAT", "Independent advice before you sign, as the law requires.", { tags: [], art: "contract" }),
    A("Business contracts", "from &pound;450 + VAT", "Terms and conditions, supplier and client contracts that protect you.", { tags: [], star: true, art: "folder" }),
    A("Debt recovery", "no win, no fee options", "A firm letter, and court action if needed, to collect what you are owed.", { tags: ["New"], art: "gavel" }),
  ] },
].map((c) => ({
  ...c,
  photo: { home: "a solicitor handing house keys and papers to a happy couple in a bright office", family: "a calm lawyer listening to a client in a warm, quiet meeting room", wills: "an elderly couple signing papers with a kind solicitor, soft daylight", work: "a lawyer advising a small business owner across a desk, modern office" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { home: "a solicitor helping with {n}", family: "a family lawyer advising on {n}", wills: "a solicitor preparing {n}", work: "a lawyer advising on {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "Our purchase had a deadline and three other parties. One named solicitor kept us informed every week and we got the keys on time.", by: "Sample review, Callum and Ria" },
  { q: "Going through a divorce was frightening. Nobody rushed me, the fee was fixed, and every letter made sense.", by: "Sample review, Hannah M." },
  { q: "Mum's estate was settled in four months. They handled all of it with real kindness.", by: "Sample review, Mr Anand" },
];
const chef = { n: "Eleanor Hartley", role: "Senior partner", bio: "Born in Manchester, she founded Hartley & Pryce to give ordinary people clear advice, a named lawyer and a fee they can see before they start." };
const sup = ["Authorised and regulated by the Solicitors Regulation Authority (sample text)", "Fixed fees agreed in writing before we begin", "A named solicitor who answers your calls"];
const faq = [["How much will it cost?", "Wherever we can, we quote a fixed fee in writing before you instruct us. Where we cannot, we explain the likely range and tell you before it changes."], ["Do you offer a free first call?", "Yes. A 15 minute call with a solicitor, with no obligation, so you know where you stand before you decide."], ["How long will my matter take?", "It depends on the matter. We give you a realistic timeline at the start and update you at each stage."], ["Can I meet you in person?", "Yes, at our office, or by phone and video if that suits you better. Evening appointments are available."]];
const steps = [["Free first call", "Tell us what has happened. A solicitor listens and explains your options in plain English."], ["A clear fixed fee", "We confirm the cost and the timeline in writing, so there are no surprises."], ["We get it done", "Your named solicitor handles the work and keeps you updated at every stage."]];

const T = {
  atelier: ":root{--accent:#1F3A5F;--soft:#F5F1E8;--line:#E0D8C6;--ink:#14202E;--muted:#58657A}.hero-box{background:#14202E}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#1F3A5F;--gold:#C99A3E;--soft:#F5F1E8;--line:#E0D8C6;--ink:#14202E;--muted:#58657A}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#1F3A5F;--butter:#EBDDB8;--soft:#F5F1E8;--line:#E0D8C6;--ink:#14202E;--muted:#58657A}",
  studio: ":root{--accent:#C99A3E}.btn-primary{color:#14110A}.tag.star{color:#14110A}",
  daylight: ":root{--accent:#1A3354}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "legal",
  label: "Law firm and solicitors",
  ldType: "LegalService",
  ldExtra: { areaServed: "Manchester" },
  hint: "scales",
  photo: "natural bright photograph of a calm modern solicitor's office, honest friendly lawyers, soft daylight, photorealistic, no text",
  videoQuery: "law office solicitor",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "counsel", "fees", "verdict", "plain", "bring"],
  mediaDir: "legal",
  nav: { home: "Home", menu: "Services", cta: "Free first call", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most requested", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Solicitors and law firm", desc: "{{business_name}} are friendly solicitors in {{city}}. Property, family, wills and employment law, with fixed fees and a free first call." },
    menu: { title: "Legal services and fees", desc: "See legal services and clear fees at {{business_name}} in {{city}}: conveyancing, divorce, wills, probate and employment law." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Free first call", submit: "Request my free call" },
  demo: {
    business_name: "Hartley & Pryce", tagline: "Friendly, straight-talking solicitors in Manchester. Fixed fees, a named lawyer and a free first call.", city: "Manchester",
    phone: "0161 555 0136", phone_href: "+441615550136", email: "advice@hartleypryce.example", address_line1: "18 Spring Gardens", address_line2: "Manchester M2 1FB",
    hours_weekdays: "9am – 5:30pm", hours_saturday: "By appointment", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Spring+Gardens+Manchester", form_endpoint: "", year_founded: "2006", owner_name: "Eleanor Hartley",
    years_open: "19", clients_served: "12000", team_size: "14", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Solicitors",
      heroH1: "Law, <em>made clear</em>.",
      cta1: "Book a free call", cta1Href: "#order", cta2: "See services", cta2Href: "menu.html",
      glass: ["Open today", "Free first call", "Open {{hours_weekdays}} on weekdays. Evening appointments available."],
      promise: [["Fixed fees", "Agreed in writing before we begin."], ["A named lawyer", "One person who knows your matter."], ["Plain English", "No jargon, no surprises."]],
      collection: ["Services", "Advice for <em>every stage</em>", "All services"],
      fav: ["Popular", "Services <em>clients ask for</em>"],
      story: { eyebrow: "About us", h2: "Born in Manchester, <em>for Manchester</em>", lead: "{{owner_name}} founded {{business_name}} in {{year_founded}} to give ordinary people clear advice, a named lawyer and a fee they can see first.", art: "scales", alt: "The scales of justice", hint: "a friendly solicitor smiling in an office" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "clients helped"], ["{{team_size}}", "", "people on the team"]],
      process: ["How it works", "Three steps <em>to clear advice</em>", steps],
      orderHome: "Book <em>a free call</em>", orderMenu: "Ready <em>to talk</em>?", orderLead: "Tell us briefly what has happened. A solicitor will call you back to arrange your free 15 minute call.",
      menuHero: ["Services", "Advice <em>and fees</em>", "Fees are examples. We confirm a fixed fee in writing before we start."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Solicitors",
      heroH1: "Advice you can <em>trust</em>.",
      cta1: "Book a free call", cta1Href: "#order", cta2: "See services", cta2Href: "menu.html",
      badge: "Free first call &middot; {{phone}}",
      fav: ["Popular", "Services <em>clients ask for</em>", "Our most requested advice", "Ask &rarr;"],
      story: { eyebrow: "About us", h2: "One firm, <em>one promise</em>", lead: "{{owner_name}} founded {{business_name}} in {{year_founded}}. We value clear advice, fixed fees and a named lawyer who picks up the phone." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "clients helped"], ["{{team_size}}", "", "people on the team"]],
      panels: [["folder", "A case file", "Property", "Buying, selling and leasehold.", "case file", "featured"], ["scales", "The scales of justice", "Family", "Divorce and children, with care.", "scales of justice", "secondary"], ["scroll", "A will", "Wills", "Wills, probate and trusts.", "will and ribbon", "secondary"]],
      statement: "<span>Clear,</span> <span>fair,</span> <span>and</span> <span><em>on your</em></span> <span>side in {{city}}.</span>",
      orderHome: "Book <em>a free call</em>", orderMenu: "Ready <em>to talk</em>?", orderLead: "Tell us briefly what has happened. A solicitor will call you back to arrange your free 15 minute call.",
      menuHero: ["Services", "Advice <em>and fees</em>", "Fees are examples. We confirm a fixed fee in writing before we start."],
    },
    motion: {
      heroLines: ["Law,", "made clear"],
      cta1: "Free first call", cta1Href: "#order", cta2: "See services", cta2Href: "menu.html",
      marquee: ["Property", "Family", "Wills", "Employment"],
      tiles: ["Our <em>services</em>", "All services"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Clients"], ["{{team_size}}", "", "Team"]],
      about: "{{owner_name}} founded {{business_name}} in {{year_founded}}. Clear advice, fixed fees and a named lawyer.",
      orderHome: "Need advice?<br><em>Call us free.</em>", orderMenu: "Ready <em>to talk?</em>", orderLead: "Tell us briefly what has happened. A solicitor will call you back to arrange your free 15 minute call.",
      menuHero: ["Advice <em>and fees</em>", "Fees are examples. We confirm a fixed fee in writing before we start."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#14202E", crust: "#D9CDB0", crustDark: "#1F3A5F", light: "#F1E9D6", cream: "#F5F1E8", accent: "#9C2B3A", accent2: "#E2B14C", shadow: "rgba(20,32,46,.36)", plate: "#FFFFFF" },
    motifs: ["scales", "contract", "pen", "gavel", "folder", "scroll"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#F9F6EE 0%,#E7DFCB 55%,#CBBE9F 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(30,40,60,.13) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { scales: "#E6DDC6", contract: "#D3DCEA", pen: "#E4D3D3", gavel: "#E8DCCB", folder: "#D4DDE8", scroll: "#EADFC6" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { scales: "#C99A3E", contract: "#1F3A5F", pen: "#9C2B3A", gavel: "#8A5A3A", folder: "#3E6A8F", scroll: "#E2B14C" } },
    },
    videos: {
      atelier: { T: 8, page: "#0F1824", sky: ["#0A111B", "#142235", "#27405C"], glow: "255,210,130", beam: "255,230,175", dust: "255,238,205", steam: "230,238,250", items: [["scales", 700, 650, 420, 0], ["pen", 500, 660, 250, 0.4], ["contract", 1010, 640, 260, 0.7]] },
      gallery: { T: 10, disc: ["#F6F1E4", "#E3D8BE", "#C8B88F"], ring: "31,58,95", items: ["scales", "contract", "pen", "gavel", "folder"] },
      motion: { T: 8, base: "#F4F1EA", blobs: ["#1F3A5F", "#C99A3E", "#14202E", "#9C2B3A", "#EBDDB8", "#3E6A8F", "#8A5A3A"] },
    },
  },
};
