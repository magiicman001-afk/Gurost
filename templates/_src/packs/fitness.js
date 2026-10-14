"use strict";
/**
 * Industry pack: gym and fitness studio (strength, HIIT and cardio, yoga and mobility, personal training). Words, classes, plans,
 * coaches, timetable, colours and art for every layout that serves this industry. Classes, prices and names are EXAMPLE content
 * for the sample site; the platform replaces them with the customer's own. "meta" is the price line ("&pound;9 drop-in · 50 min").
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "strength", name: "Strength", blurb: "Coached lifting, from your first barbell to your next personal best.", art: "dumbbell", items: [
    A("Strength foundations", "&pound;9 drop-in &middot; 50 min", "Learn the big lifts with small groups and a coach watching your form.", { tags: ["Popular", "Beginner"], star: true }),
    A("Kettlebell club", "&pound;9 drop-in &middot; 45 min", "Swings, cleans and carries. Strong, fast and a lot of fun.", { tags: ["New"], art: "kettlebell", star: true }),
    A("Barbell basics", "&pound;9 drop-in &middot; 50 min", "Squat, press, deadlift. A calm, step-by-step start with the bar.", { tags: ["Beginner"] }),
    A("Powerlifting", "&pound;11 drop-in &middot; 75 min", "Programmed training for the squat, bench and deadlift.", { tags: [] }),
  ] },
  { id: "hiit", name: "HIIT and cardio", blurb: "Big effort, short sessions, and a room that carries you through.", art: "bolt", items: [
    A("HIIT 45", "&pound;9 drop-in &middot; 45 min", "Intervals on the floor with the whole room. Scale it up or down.", { tags: ["Popular"], star: true }),
    A("Boxing conditioning", "&pound;10 drop-in &middot; 50 min", "Pads, bags and footwork. No sparring, plenty of sweat.", { tags: ["Popular"], art: "glove", star: true }),
    A("Spin ride", "&pound;9 drop-in &middot; 40 min", "Music, a rolling route and a coach calling the climbs.", { tags: [] }),
    A("Run club", "Free for members &middot; 60 min", "Easy, steady and tempo groups. Every pace has a place.", { tags: ["Beginner"] }),
  ] },
  { id: "mind", name: "Yoga and mobility", blurb: "Move well, recover properly and clear your head.", art: "lotus", items: [
    A("Vinyasa flow", "&pound;9 drop-in &middot; 60 min", "Breath-led movement linking one pose to the next.", { tags: ["Popular", "Beginner"], star: true }),
    A("Mat pilates", "&pound;9 drop-in &middot; 50 min", "Core, posture and control, one slow rep at a time.", { tags: [] }),
    A("Mobility reset", "&pound;8 drop-in &middot; 40 min", "Open stiff hips and shoulders so everything else gets easier.", { tags: ["New"], star: true }),
    A("Restorative stretch", "&pound;8 drop-in &middot; 45 min", "Long holds, soft lights. The best way to end a hard week.", { tags: ["Beginner"] }),
  ] },
  { id: "pt", name: "Personal training", blurb: "A plan built around you, with a coach who keeps you honest.", art: "stopwatch", items: [
    A("1-to-1 session", "from &pound;38 &middot; 55 min", "Your goals, your pace, your coach. We write the plan and run it with you.", { tags: ["Popular"], star: true }),
    A("Partner training", "from &pound;26 each &middot; 55 min", "Train with a friend and split the cost. Twice the fun.", { tags: [] }),
    A("Starter assessment", "&pound;25 &middot; 45 min", "Movement check, goal chat and a simple first month plan.", { tags: ["New", "Beginner"], star: true }),
    A("Nutrition coaching", "from &pound;60 / month", "Simple habits and weekly check-ins. No crash diets.", { tags: [] }),
  ] },
].map((c) => ({
  ...c,
  photo: { strength: "a coach spotting a lifter at a barbell in a bright gym", hiit: "a group class mid-workout in a bright studio", mind: "a yoga class in a calm, sunlit studio", pt: "a personal trainer and a client smiling at the gym" }[c.id],
  items: c.items.map((i) => ({ ...i, hint: { strength: "a person doing {n} in a bright gym", hiit: "a group doing {n} in a bright studio", mind: "a class doing {n} in a calm studio", pt: "a personal trainer running a {n}" }[c.id].replace("{n}", i.n.toLowerCase()) })),
}));

const plans = [
  { n: "Off-peak", price: 24, per: "month", blurb: "Gym floor 10am to 4pm on weekdays.", feats: ["Gym floor, weekdays 10am to 4pm", "Two classes a week", "Free starter assessment"], star: false },
  { n: "Everything", price: 39, per: "month", blurb: "All hours, all classes, no catches.", feats: ["Gym floor, every hour we are open", "Every class, unlimited", "Run club and workshops", "Bring a friend, once a month"], star: true },
  { n: "Coached", price: 119, per: "month", blurb: "Everything, plus a coach in your corner.", feats: ["Everything in Everything", "Four 1-to-1 sessions a month", "A written plan, updated monthly", "Nutrition check-ins"], star: false },
];
const coaches = [
  { n: "Dan Okafor", role: "Head coach and founder", art: "dumbbell", bio: "Powerlifter turned coach. Believes anybody can get strong." },
  { n: "Maya Lindqvist", role: "Yoga and mobility", art: "lotus", bio: "Twelve years teaching. Makes stiff people feel brilliant." },
  { n: "Josh Bellamy", role: "HIIT and boxing", art: "glove", bio: "Former amateur boxer. Loud music, louder encouragement." },
  { n: "Sam Reyes", role: "Personal training", art: "stopwatch", bio: "Rehab and performance. Gets you strong without getting you hurt." },
];
/** Sample week: [time, class, coach, category id] */
const week = {
  Mon: [["6:30am", "HIIT 45", "Josh", "hiit"], ["12:15pm", "Mobility reset", "Maya", "mind"], ["6:00pm", "Strength foundations", "Dan", "strength"], ["7:15pm", "Vinyasa flow", "Maya", "mind"]],
  Tue: [["6:30am", "Spin ride", "Josh", "hiit"], ["12:15pm", "Kettlebell club", "Dan", "strength"], ["6:00pm", "Boxing conditioning", "Josh", "hiit"], ["7:15pm", "Mat pilates", "Maya", "mind"]],
  Wed: [["6:30am", "Strength foundations", "Dan", "strength"], ["12:15pm", "HIIT 45", "Josh", "hiit"], ["6:00pm", "Barbell basics", "Dan", "strength"], ["7:15pm", "Restorative stretch", "Maya", "mind"]],
  Thu: [["6:30am", "Boxing conditioning", "Josh", "hiit"], ["12:15pm", "Mat pilates", "Maya", "mind"], ["6:00pm", "Kettlebell club", "Dan", "strength"], ["7:15pm", "Spin ride", "Josh", "hiit"]],
  Fri: [["6:30am", "HIIT 45", "Josh", "hiit"], ["12:15pm", "Vinyasa flow", "Maya", "mind"], ["5:30pm", "Run club", "Sam", "hiit"]],
  Sat: [["9:00am", "Powerlifting", "Dan", "strength"], ["10:30am", "HIIT 45", "Josh", "hiit"], ["11:45am", "Vinyasa flow", "Maya", "mind"]],
  Sun: [["10:00am", "Mobility reset", "Maya", "mind"], ["11:15am", "Restorative stretch", "Maya", "mind"]],
};

const planRows = [
  ["Gym floor", ["Weekdays 10am to 4pm", "Every hour we are open", "Every hour we are open"]],
  ["Classes", ["Two a week", "Unlimited", "Unlimited"]],
  ["Run club and workshops", [false, true, true]],
  ["Bring a friend", [false, "Once a month", "Once a month"]],
  ["1-to-1 sessions", [false, false, "Four a month"]],
  ["Written plan and nutrition check-ins", [false, false, true]],
];
const faq = [
  ["Is there a contract?", "No. Every plan is month to month and you can cancel any time from your account or at the front desk."],
  ["I have never trained before. Is that okay?", "Yes, most of our members started as beginners. Your free first session is with a coach who will show you around and match you to the right classes."],
  ["Can I freeze my membership?", "Yes. Pause for up to two months a year, for holidays, injury or anything else, at no charge."],
  ["What do I need to bring?", "Trainers, water and a towel. Mats, bars, bikes and kettlebells are all here."],
];

const T = {
  atelier: ":root{--accent:#E8431F;--soft:#F6F2EE;--line:#E8DFD8;--ink:#14181C;--muted:#5E666E}.tags{flex-wrap:wrap}.hero-box{background:#0E1114}.hero-box::after{background:linear-gradient(180deg,rgba(14,17,20,.55) 0%,rgba(14,17,20,0) 36%,rgba(14,17,20,.78) 100%)}.tile::after{background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(20,10,6,.74))}",
  gallery: ":root{--accent:#E8431F;--gold:#E9B949;--soft:#F6F2EE;--line:#E8DFD8;--ink:#14181C;--muted:#5E666E}.tags{flex-wrap:wrap}.mc .row{flex-wrap:wrap}@media(max-width:480px){.grid4{grid-template-columns:minmax(0,1fr)}}",
  motion: ":root{--accent:#E8431F;--butter:#FFD9A8;--soft:#F6F2EE;--line:#E8DFD8;--ink:#14181C;--muted:#5E666E}.order .lead,.order .hours th,.order .f label{color:#3A2118}",
  studio: ":root{--accent:#FF6A3D}.btn-primary{color:#1A0B05}.tag.star{color:#1A0B05}",
  daylight: ":root{--accent:#D93A17}.mc .r{flex-wrap:wrap}.tags{flex-wrap:wrap}@media(max-width:480px){.mgrid{grid-template-columns:minmax(0,1fr)}}",
};

module.exports = {
  id: "fitness",
  label: "Gym and fitness studio",
  ldType: "HealthClub",
  ldExtra: {},
  hint: "gym and fitness studio",
  photo: "natural-light fitness photograph, bright modern gym, real people mid-movement, honest athletic physiques, shallow depth of field, photorealistic, no text",
  videoQuery: "gym workout",
  styles: ["atelier", "gallery", "motion", "studio", "daylight", "pulse", "timetable", "tiers", "matcher", "interval"],
  mediaDir: "fitness",
  nav: { home: "Home", menu: "Classes", cta: "Join now", ctaHref: "index.html#order" },
  cats,
  plans,
  coaches,
  week,
  planRows,
  faq,
  tags: { Popular: "Our most booked", New: "New this season", Beginner: "Great for first-timers" },
  seo: {
    home: { title: "Gym, classes and personal training", desc: "{{business_name}} is a friendly gym and fitness studio in {{city}}. Strength, HIIT, yoga and personal training. Try a free first session." },
    menu: { title: "Classes, prices and timetable", desc: "See every class, price and timetable at {{business_name}}, {{city}}: strength, HIIT and cardio, yoga and mobility, personal training." },
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Start today", submit: "Claim my free session" },
  demo: {
    business_name: "Forge Fitness", tagline: "A friendly gym with coached classes, a proper strength floor and a free first session for everyone.", city: "Leeds",
    phone: "0113 555 0147", phone_href: "+441135550147", email: "hello@forgefitness.example", address_line1: "8 Canal Wharf", address_line2: "Leeds LS1 4AB",
    hours_weekdays: "6am – 9pm", hours_saturday: "8am – 5pm", hours_sunday: "9am – 3pm", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=8+Canal+Wharf+Leeds", form_endpoint: "", year_founded: "2014", owner_name: "Dan Okafor",
    years_open: "11", clients_served: "3200", team_size: "9", booking_url: "https://example.org/join",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Strength, HIIT &amp; yoga",
      heroH1: "Get strong. <em>Stay</em> strong.",
      cta1: "Join now", cta1Href: "{{booking_url}}", cta2: "See classes", cta2Href: "menu.html",
      glass: ["Open today", "First session free", "Open {{hours_weekdays}} on weekdays. Come and try us."],
      promise: [["Real coaches", "Qualified, insured and genuinely friendly."], ["Every level", "Beginners welcome. Every class scales up or down."], ["No pressure", "No hard sell, no lock-in. Cancel any time."]],
      collection: ["What we do", "Four ways <em>to train</em>", "All classes"],
      fav: ["Most booked", "Member <em>favourites</em>"],
      story: { eyebrow: "Our story", h2: "A gym that <em>feels like a club</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} after years of gyms that made beginners feel small. Here, everyone is coached and everyone is known by name.", art: "dumbbell", alt: "A dumbbell", hint: "a coach high-fiving a member in a bright gym" },
      stats: [["{{years_open}}", "", "years open"], ["{{clients_served}}", "+", "members trained"], ["{{team_size}}", "", "coaches"]],
      process: ["How to start", "Three steps <em>to your first session</em>", [["Say hello", "Tell us your goals and how much you have trained."], ["Try it free", "Come in for a free session with a coach."], ["Choose a plan", "Pick the membership that fits. No pressure."]]],
      orderHome: "Claim <em>your free session</em>", orderMenu: "Ready to <em>start</em>?", orderLead: "Tell us a little about you and we will book your free first session within a day.",
      menuHero: ["Classes and prices", "The <em>full timetable</em>", "Drop-in prices are shown. Members attend classes free of charge. Every class can be scaled to your level."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Strength, HIIT &amp; yoga",
      heroH1: "Train <em>with people</em> who care.",
      cta1: "Join now", cta1Href: "{{booking_url}}", cta2: "See classes", cta2Href: "menu.html",
      badge: "Open today &middot; {{hours_weekdays}}",
      fav: ["Most booked", "Member <em>favourites</em>", "Classes members love", "Book this &rarr;"],
      story: { eyebrow: "Our story", h2: "Built for <em>beginners</em> and lifers", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. We coach every session, learn every name and celebrate every first." },
      facts: [["{{years_open}}", "", "years open"], ["{{clients_served}}", "+", "members trained"], ["{{team_size}}", "", "coaches"]],
      panels: [["dumbbell", "A dumbbell", "Strength", "Coached lifting for every level.", "strength training", "featured"], ["bolt", "A lightning bolt", "HIIT", "Big effort in 45 minutes.", "hiit class", "secondary"], ["lotus", "A lotus flower", "Yoga", "Move well and breathe easy.", "yoga class", "secondary"]],
      statement: "<span>Strength,</span> <span>cardio,</span> <span>yoga</span> <span>and</span> <span><em>coaching</em></span> <span>in {{city}}.</span>",
      orderHome: "Claim <em>your free session</em>", orderMenu: "Ready to <em>start</em>?", orderLead: "Tell us a little about you and we will book your free first session within a day.",
      menuHero: ["Classes", "The <em>full</em> timetable", "Drop-in prices are shown. Members attend classes free of charge."],
    },
    motion: {
      heroLines: ["Move", "better"],
      cta1: "Join now", cta1Href: "{{booking_url}}", cta2: "See classes", cta2Href: "menu.html",
      marquee: ["Strength", "HIIT", "Yoga", "Coaching"],
      tiles: ["What we <em>do</em>", "All classes"],
      nums: [["{{years_open}}", "", "Years open"], ["{{clients_served}}", "+", "Members trained"], ["{{team_size}}", "", "Coaches"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Every session is coached, every member is known by name.",
      orderHome: "Come in<br><em>and train.</em>", orderMenu: "Ready to <em>start?</em>", orderLead: "Tell us a little about you and we will book your free first session within a day.",
      menuHero: ["Our <em>classes</em>", "Drop-in prices are shown. Members attend classes free of charge."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#161A1F", crust: "#E9B949", crustDark: "#B58420", light: "#FBE9B8", cream: "#F6F2EE", accent: "#E8431F", accent2: "#FF9A5A", shadow: "rgba(60,20,10,.35)", plate: "#FFFFFF" },
    motifs: ["dumbbell", "bolt", "lotus", "kettlebell", "stopwatch", "glove"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFF8F3 0%,#FBE3D6 55%,#F2C6B1 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(120,50,20,.10) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { dumbbell: "#FAD0C2", bolt: "#FFE08A", lotus: "#F6C9D6", kettlebell: "#F5C7B3", stopwatch: "#CFE3EE", glove: "#F8C3B5" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { dumbbell: "#FF7A4D", bolt: "#FFD166", lotus: "#F7A8C0", kettlebell: "#F28A5E", stopwatch: "#9CCBE8", glove: "#F26A55" } },
    },
    videos: {
      atelier: { T: 8, page: "#0E1114", sky: ["#0A0C0E", "#1A1410", "#33190F"], glow: "255,140,90", beam: "255,200,170", dust: "255,220,200", steam: "", items: [["dumbbell", 700, 650, 400, 0], ["kettlebell", 500, 660, 250, 0.4], ["stopwatch", 1010, 620, 240, 0.7]] },
      gallery: { T: 10, disc: ["#FCE3D6", "#F8C6AF", "#EEA489"], ring: "200,90,50", items: ["dumbbell", "bolt", "lotus", "kettlebell", "stopwatch"] },
      motion: { T: 8, base: "#FBEFE8", blobs: ["#E8431F", "#FF9A5A", "#E9B949", "#14181C", "#FFD9A8", "#F26A55", "#8E5BA3"] },
    },
  },
};
