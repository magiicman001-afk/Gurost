"use strict";
/**
 * Industry pack: tutoring and education (primary, GCSE, A-level, special support). Words, example
 * listings, prices, colours and art for every layout that serves this industry. Listings, prices and names are EXAMPLE content for
 * the sample site; the platform replaces them with the customer's own. "meta" is the price line.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "primary", name: "Primary school", blurb: "Confidence first. Gentle one-to-one help in reading, writing and number.", art: "book", items: [
    A("Maths and English", "&pound;32 an hour", "Weekly sessions that close gaps and make school feel easier.", { tags: ["Popular"], star: true, art: "book" }),
    A("11+ preparation", "&pound;38 an hour", "Verbal, non-verbal and exam technique, with timed practice papers.", { tags: [], star: true, art: "pencil" }),
    A("Reading and phonics", "&pound;30 an hour", "Patient, playful help for children who find reading hard.", { tags: [], art: "book" }),
    A("SATs booster", "&pound;34 an hour", "A six-week plan before the tests, with practice and feedback.", { tags: ["New"], art: "calc" }),
  ] },
  { id: "gcse", name: "GCSE", blurb: "Clear explanations, past papers and a plan for every topic.", art: "calc", items: [
    A("GCSE Maths", "&pound;40 an hour", "Every topic covered, with exam-style questions and worked answers.", { tags: ["Popular"], star: true, art: "calc" }),
    A("GCSE English", "&pound;40 an hour", "Essay structure, set texts and the skills examiners reward.", { tags: [], star: true, art: "book" }),
    A("GCSE Sciences", "&pound;42 an hour", "Biology, chemistry and physics, taught so that it sticks.", { tags: [], art: "atom" }),
    A("Languages", "&pound;42 an hour", "French, Spanish and Welsh, with speaking practice every week.", { tags: ["New"], art: "pencil" }),
  ] },
  { id: "alevel", name: "A-level and beyond", blurb: "Expert tutors for the top grades, and help with university applications.", art: "atom", items: [
    A("A-level Maths", "&pound;50 an hour", "Pure, mechanics and statistics from tutors with maths degrees.", { tags: ["Popular"], star: true, art: "calc" }),
    A("A-level Sciences", "&pound;50 an hour", "Biology, chemistry and physics, with practical and exam support.", { tags: [], star: true, art: "atom" }),
    A("Essay subjects", "&pound;48 an hour", "History, English and politics: argue clearly and write well.", { tags: [], art: "book" }),
    A("UCAS and personal statements", "&pound;55 an hour", "Shape your story, practise interviews and apply with confidence.", { tags: ["New"], art: "trophy" }),
  ] },
  { id: "extra", name: "Extra support", blurb: "Learning that fits the person, not the other way round.", art: "backpack", items: [
    A("SEN and dyslexia support", "&pound;45 an hour", "Specialist tutors, calm pace and strategies that last.", { tags: ["Popular"], star: true, art: "backpack" }),
    A("Home education", "&pound;38 an hour", "A weekly tutor for families who learn at home.", { tags: [], star: true, art: "book" }),
    A("Exam technique workshop", "&pound;25 each", "Two hours on revision, timing and nerves, in small groups.", { tags: [], art: "trophy" }),
    A("Adult learners", "&pound;40 an hour", "Maths and English for work, apprenticeships or pure pleasure.", { tags: ["New"], art: "pencil" }),
  ] },
].map((c) => ({
  ...c,
  photo: { primary: "a friendly tutor helping a primary school child read at a bright table", gcse: "a teenager and a tutor working through a maths problem on paper, soft daylight", alevel: "a university-bound student and a tutor discussing a book, warm light", extra: "a patient tutor sitting beside a child with learning materials, calm room" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { primary: "a tutor helping a child with {n}", gcse: "a tutor helping a student with {n}", alevel: "a tutor helping a sixth-former with {n}", extra: "a tutor offering {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const reviews = [
  { q: "My son went from dreading maths to asking for extra questions. His tutor never made him feel silly.", by: "Sample review, Aisha K." },
  { q: "Predicted a 5, got a 7. The weekly plan and past papers made the difference.", by: "Sample review, Callum, GCSE student" },
  { q: "They matched us with a tutor who understood dyslexia. Reading is now a pleasure, not a battle.", by: "Sample review, Mrs Davies" },
];
const chef = { n: "Rhian Oakfield", role: "Founder and head tutor", bio: "A former secondary maths teacher, Rhian started Oakfield Tutors in {{year_founded}} so every child could have a tutor who explains things properly and never makes them feel behind." };
const sup = ["All tutors have an enhanced DBS check (sample text)", "First lesson free, no obligation", "Online or at home, your choice"];
const faq = [["Is the first lesson really free?", "Yes. A 30 minute trial with your tutor so you can see if it is a good fit. No payment details needed."], ["How do you match tutors?", "By subject, level, personality and timetable. If it is not right, we change tutor for free."], ["Online or in person?", "Both. Online lessons use a shared whiteboard. Home visits are available in our area."], ["How many lessons will we need?", "Most families start with a weekly lesson for a term. We review progress with you every six weeks."]];
const steps = [["Free consultation", "Tell us what your child needs. We listen and suggest a plan."], ["Meet your tutor", "A matched tutor gives a free 30 minute trial lesson."], ["Watch progress", "Weekly lessons, a short report each month and a review every six weeks."]];

const T = {
  atelier: ":root{--accent:#4448B8;--soft:#F4F3FB;--line:#DEDCF0;--ink:#1E2142;--muted:#5D6082}.hero-box{background:#1E2142}.tags{flex-wrap:wrap}",
  gallery: ":root{--accent:#4448B8;--gold:#FFC83D;--soft:#F4F3FB;--line:#DEDCF0;--ink:#1E2142;--muted:#5D6082}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#4448B8;--butter:#FFE9A8;--soft:#F4F3FB;--line:#DEDCF0;--ink:#1E2142;--muted:#5D6082}",
  studio: ":root{--accent:#FFC83D}.btn-primary{color:#14110A}.tag.star{color:#14110A}",
  daylight: ":root{--accent:#3033A0}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "tutor",
  label: "Tutoring and education",
  ldType: "EducationalOrganization",
  ldExtra: { areaServed: "Cardiff" },
  hint: "book",
  photo: "natural bright photograph of a friendly tutor and a child learning together at a table, soft daylight, photorealistic, no text",
  videoQuery: "tutor teaching child",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "lessons", "chalk", "quickfire", "progress", "countdown"],
  mediaDir: "tutor",
  nav: { home: "Home", menu: "Subjects", cta: "Free trial", ctaHref: "index.html#order" },
  cats, reviews, chef, sup, faq, steps,
  tags: { Popular: "Most requested", New: "New", "Chain free": "", "Pets ok": "", Furnished: "" },
  seo: {
    home: { title: "Tutors for primary, GCSE and A-level", desc: "{{business_name}} are friendly, DBS-checked tutors in {{city}} and online. Maths, English, sciences and more, with a free first lesson." },
    menu: { title: "Subjects, levels and prices", desc: "See tutoring subjects and prices at {{business_name}} in {{city}}: primary, 11+, GCSE, A-level and extra support." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Free first lesson", submit: "Book my free lesson" },
  demo: {
    business_name: "Oakfield Tutors", tagline: "Friendly, DBS-checked tutors in Cardiff and online. Primary to A-level, with a free first lesson.", city: "Cardiff",
    phone: "029 2055 0164", phone_href: "+442920550164", email: "hello@oakfieldtutors.example", address_line1: "12 Windsor Place", address_line2: "Cardiff CF10 3BY",
    hours_weekdays: "3pm – 8pm", hours_saturday: "9am – 2pm", hours_sunday: "Closed", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Windsor+Place+Cardiff", form_endpoint: "", year_founded: "2013", owner_name: "Rhian Oakfield",
    years_open: "12", clients_served: "3500", team_size: "40", booking_url: "https://example.org/book",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Tutors",
      heroH1: "Learning that <em>clicks</em>.",
      cta1: "Book a free lesson", cta1Href: "#order", cta2: "See subjects", cta2Href: "menu.html",
      glass: ["Lessons today", "First lesson free", "Lessons {{hours_weekdays}} on weekdays, online or at home."],
      promise: [["DBS-checked tutors", "Every tutor, every time."], ["First lesson free", "No payment details needed."], ["Change tutor free", "If it is not the right fit."]],
      collection: ["Subjects", "Help for <em>every stage</em>", "All subjects"],
      fav: ["Popular", "Subjects <em>families ask for</em>"],
      story: { eyebrow: "About us", h2: "Tutors who <em>explain properly</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}} so every child could have a tutor who explains things clearly and never makes them feel behind.", art: "book", alt: "A hardback book", hint: "a smiling tutor with a young student" },
      stats: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "students helped"], ["{{team_size}}", "", "tutors on the team"]],
      process: ["How it works", "Three steps <em>to confident learning</em>", steps],
      orderHome: "Book <em>a free lesson</em>", orderMenu: "Ready <em>to start</em>?", orderLead: "Tell us the subject and level. We will match a tutor and arrange a free 30 minute trial lesson.",
      menuHero: ["Subjects", "Help <em>and prices</em>", "Prices are examples. We confirm the price before your first paid lesson."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Tutors",
      heroH1: "Grades <em>and</em> confidence.",
      cta1: "Book a free lesson", cta1Href: "#order", cta2: "See subjects", cta2Href: "menu.html",
      badge: "First lesson free &middot; {{phone}}",
      fav: ["Popular", "Subjects <em>families ask for</em>", "Our most requested help", "Book &rarr;"],
      story: { eyebrow: "About us", h2: "One team, <em>one goal</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. Clear teaching, patient tutors and progress you can see." },
      facts: [["{{years_open}}", "", "years in {{city}}"], ["{{clients_served}}", "+", "students helped"], ["{{team_size}}", "", "tutors on the team"]],
      panels: [["book", "A hardback book", "Primary", "Reading, writing and number.", "hardback book", "featured"], ["calc", "A calculator", "GCSE", "Past papers and plans.", "calculator", "secondary"], ["atom", "An atom", "A-level", "Expert help for top grades.", "atom", "secondary"]],
      statement: "<span>Patient,</span> <span>clear,</span> <span>and</span> <span><em>on your side</em></span> <span>in {{city}}.</span>",
      orderHome: "Book <em>a free lesson</em>", orderMenu: "Ready <em>to start</em>?", orderLead: "Tell us the subject and level. We will match a tutor and arrange a free 30 minute trial lesson.",
      menuHero: ["Subjects", "Help <em>and prices</em>", "Prices are examples. We confirm the price before your first paid lesson."],
    },
    motion: {
      heroLines: ["Learning", "that clicks"],
      cta1: "Free first lesson", cta1Href: "#order", cta2: "See subjects", cta2Href: "menu.html",
      marquee: ["Primary", "GCSE", "A-level", "Support"],
      tiles: ["Our <em>subjects</em>", "All subjects"],
      nums: [["{{years_open}}", "", "Years in {{city}}"], ["{{clients_served}}", "+", "Students"], ["{{team_size}}", "", "Tutors"]],
      about: "{{owner_name}} started {{business_name}} in {{year_founded}}. Clear teaching, patient tutors and progress you can see.",
      orderHome: "Need a tutor?<br><em>Try one free.</em>", orderMenu: "Ready <em>to start?</em>", orderLead: "Tell us the subject and level. We will match a tutor and arrange a free 30 minute trial lesson.",
      menuHero: ["Help <em>and prices</em>", "Prices are examples. We confirm the price before your first paid lesson."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#1E2142", crust: "#D6D4EE", crustDark: "#2A2D6B", light: "#EEEDFA", cream: "#F4F3FB", accent: "#4B4FC9", accent2: "#FFC83D", shadow: "rgba(30,33,66,.34)", plate: "#FFFFFF" },
    motifs: ["book", "pencil", "atom", "calc", "trophy", "backpack"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#F9F8FF 0%,#E4E2F6 55%,#C7C4E6 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(30,33,80,.13) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { book: "#E0DFF6", pencil: "#FFEDB8", atom: "#D9E6F8", calc: "#E3E3F0", trophy: "#FFEDB8", backpack: "#E0DFF6" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { book: "#4B4FC9", pencil: "#FFC83D", atom: "#2F8FA0", calc: "#2A2D6B", trophy: "#E8A21A", backpack: "#E0584A" } },
    },
    videos: {
      atelier: { T: 8, page: "#0F1130", sky: ["#0B0D26", "#16193F", "#2B2F66"], glow: "255,210,110", beam: "255,230,170", dust: "255,238,205", steam: "225,228,250", items: [["book", 700, 650, 430, 0], ["pencil", 480, 660, 240, 0.4], ["atom", 1010, 650, 230, 0.7]] },
      gallery: { T: 10, disc: ["#F9F8FF", "#E4E2F6", "#C7C4E6"], ring: "75,79,201", items: ["book", "pencil", "atom", "calc", "trophy"] },
      motion: { T: 8, base: "#F4F3FB", blobs: ["#4B4FC9", "#FFC83D", "#2A2D6B", "#2F8FA0", "#FFE9A8", "#E0584A", "#E8A21A"] },
    },
  },
};
