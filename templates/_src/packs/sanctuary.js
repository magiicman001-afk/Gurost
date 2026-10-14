"use strict";
/**
 * Industry pack: animal sanctuary / rescue. The same three layouts as the bakery, with a sanctuary's words, animals, colours and art.
 * The animals and numbers below are EXAMPLE content for the sample site. The platform replaces them with the customer's own.
 */
const C = require("../common");

const A = (n, meta, d, extra = {}) => ({ n, meta, d, tags: [], ...extra });

const cats = [
  { id: "dogs", name: "Dogs", blurb: "Rescued, rehabilitated and ready for a home.", art: "dog", items: [
    A("Biscuit", "Age 3 &middot; Labrador cross", "Gentle and clumsy, loves long walks and chasing tennis balls.", { tags: ["Kids", "Pets"], star: true }),
    A("Juno", "Age 8 &middot; Collie", "A calm senior who wants a warm bed and a slow stroll.", { tags: ["Quiet"] }),
    A("Murphy", "Age 1 &middot; Terrier mix", "Bouncy, bright and learning fast. Best with a training-minded family.", { tags: ["Kids"], star: true }),
    A("Pepper", "Age 4 &middot; Spaniel", "Affectionate and a little shy at first. Warms up with treats.", { tags: ["Pets"] }),
  ] },
  { id: "cats", name: "Cats", blurb: "Independent, cuddly and everything between.", art: "cat", items: [
    A("Mochi", "Age 2 &middot; Tabby", "Playful and chatty. Follows you from room to room.", { tags: ["Kids", "Pets"], star: true }),
    A("Smoky", "Age 5 &middot; Grey", "A lap cat who purrs the moment you sit down.", { tags: ["Quiet"] }),
    A("Ginger", "Age 1 &middot; Orange", "Full of energy, loves toys and climbing the curtains.", { tags: ["Kids"], star: true }),
    A("Willow", "Age 9 &middot; Tortoiseshell", "Gentle and wise. Happiest with one calm person.", { tags: ["Quiet"] }),
  ] },
  { id: "small", name: "Small animals", blurb: "Rabbits, guinea pigs and other little friends.", art: "rabbit", items: [
    A("Clover", "Age 2 &middot; Rabbit", "Curious and gentle. Bonded with Hazel, so they go home together.", { tags: ["Kids"], star: true }),
    A("Hazel", "Age 3 &middot; Rabbit", "Calm, loves a cuddle and a dandelion leaf.", { tags: ["Kids", "Pets"] }),
    A("Nutmeg", "Age 1 &middot; Guinea pig", "Chirpy and sociable, needs a friend of her own kind.", { tags: ["Kids"], star: true }),
    A("Biscotti", "Age 4 &middot; Guinea pig", "Quiet and sweet, a perfect first small pet.", { tags: ["Kids"] }),
  ] },
  { id: "wildlife", name: "Wildlife", blurb: "Injured and orphaned wild animals, cared for until release.", art: "owl", items: [
    A("Barnaby", "In care &middot; Barn owl", "Recovering from a wing injury. Release planned in the spring.", { tags: [], star: true }),
    A("Hoot", "In care &middot; Tawny owl", "Found as a chick and hand-reared by our wildlife team.", { tags: [] }),
    A("Willa", "In care &middot; Little owl", "A small owl with a big personality, almost ready to fly free.", { tags: [], star: true }),
    A("Ash", "In care &middot; Long-eared owl", "Quiet and watchful, on the mend after a road accident.", { tags: [] }),
  ] },
].map((c) => ({
  ...c,
  photo: { dogs: "happy rescue dogs at an animal sanctuary", cats: "rescue cats relaxing at an animal sanctuary", small: "rabbits and guinea pigs in a sanctuary", wildlife: "an owl being cared for at a wildlife rescue" }[c.id],
  // a photographic brief for each animal: its kind (the part of "meta" after the age), not its name
  items: c.items.map((i) => ({ ...i, p: "", d: i.d, hint: { dogs: "a friendly {k} dog looking into the camera", cats: "a {k} cat sitting calmly", small: "a {k}", wildlife: "a {k} recovering at a wildlife rescue centre" }[c.id].replace("{k}", String(i.meta).split("&middot;").pop().trim().toLowerCase()) })),
}));

const T = {
  atelier: ":root{--accent:#2F7D6B;--soft:#F2F7F2;--line:#DFE9DF;--ink:#14201A;--muted:#5C6C62}.hero-box{background:#0d1a14}.hero-box::after{background:linear-gradient(180deg,rgba(6,18,12,.55) 0%,rgba(6,18,12,0) 36%,rgba(6,18,12,.74) 100%)}.tile::after{background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(8,26,18,.72))}.hero-box::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(6,18,12,.6),rgba(6,18,12,0) 68%)}.hero h1 em{color:#9BE3C2}@media(max-width:860px){.hero-box::after{background:linear-gradient(180deg,rgba(6,18,12,.55) 0%,rgba(6,18,12,.45) 30%,rgba(6,18,12,.86) 100%)}}",
  gallery: ":root{--accent:#2A7561;--gold:#F2B93B;--soft:#F5F8F3;--line:#E4ECE0;--ink:#16221B;--muted:#5E6E64}",
  motion: ":root{--accent:#1F7A5C;--butter:#BFE37A;--soft:#F2F7EE;--line:#E1EADB;--ink:#12201A;--muted:#5C6C62}.order .lead,.order .hours th,.order .f label{color:#1F3A25}",
  linen: ":root{--accent:#2F6F5C;--sage:#2F6F5C;--paper:#F8FAF4;--soft:#EEF3E8;--line:#DCE5D3;--ink:#1D2A22;--muted:#5F6E63}body{background:var(--paper)}.btn-primary{background:var(--accent);border-color:var(--accent)}",
  split: ":root{--accent:#2F7D6B;--pop:#F2B93B}.pan{background:#E6F2E4}.pan::after{background:linear-gradient(180deg,rgba(236,247,232,.55) 0%,rgba(236,247,232,0) 32%,rgba(236,247,232,0) 60%,rgba(236,247,232,.7) 100%)}",
  journal: ":root{--accent:#1F7A5C;--soft:#F1F5EE}",
  market: ":root{--accent:#1F7A66;--sun:#FFD966;--mint:#BFE9CF;--pink:#FFC4B8}",
  studio: ":root{--accent:#8FD6B5}.btn-primary{color:#0B1A13}.tag.star{color:#0B1A13}",
  daylight: ":root{--accent:#2F7D6B}",
  hearth: ":root{--accent:#2F6F5C;--deep:#1F3A2E;--paper:#F9FAF4;--soft:#EEF3E8;--line:#DCE5D3;--ink:#1D2A22;--muted:#5F6E63}body{background:var(--paper)}.site-header.is-stuck,.mpanel{background:rgba(249,250,244,.92)}",
};

module.exports = {
  id: "sanctuary",
  label: "Animal sanctuary",
  ldType: "AnimalShelter",
  ldExtra: {},
  hint: "animal sanctuary",
  photo: "natural-light documentary photograph, warm and honest, calm gentle mood, shallow depth of field, true-to-life colours, photorealistic, no text",
  videoQuery: "dogs animal shelter",
  styles: ["atelier", "gallery", "motion", "linen", "split", "journal", "market", "studio", "daylight", "hearth", "kindred", "stories", "commons"],
  mediaDir: "sanctuary",
  nav: { home: "Home", menu: "Our animals", cta: "Adopt or visit", ctaHref: "index.html#order" },
  cats,
  tags: { Kids: "Good with children", Pets: "Good with other pets", Quiet: "Needs a quiet home" },
  seo: {
    home: { title: "Animal sanctuary", desc: "{{business_name}} is an animal sanctuary in {{city}}. Meet the animals looking for homes, plan a visit or donate." },
    menu: { title: "Our animals", desc: "Meet the dogs, cats, small animals and wildlife in our care at {{business_name}}, {{city}}." },
  },
  community: {
    visitEyebrow: "Find us", visitH2: "Come and <em>say hello</em>", eventsEyebrow: "Coming up", eventsH2: "What is <em>on</em> at the sanctuary", waysEyebrow: "Get involved", waysH2: "Four ways to <em>help</em>",
    events: [["14", "Nov", "Open day and dog walks", "Meet the dogs and take one for a walk. Free entry."], ["28", "Nov", "Christmas craft fair", "Stalls, hot chocolate and a raffle for the animals."], ["12", "Dec", "Carols in the barn", "Songs by lantern light with mince pies for everyone."]],
    ways: [["Volunteer", "Walk dogs, groom cats or help in the barn. A few hours a week makes a real difference.", "Volunteer with us", "#order"], ["Foster", "Give an animal a quiet home while it waits for its forever family.", "Become a foster carer", "#order"], ["Sponsor", "Sponsor an animal and get updates and photographs as it settles in.", "Sponsor an animal", "{{donate_url}}"], ["Wish list", "Blankets, food and toys. Everything on our list is used within days.", "See the wish list", "#order"]],
  },
  donate: {
    eyebrow: "Support the animals", h2: "Every <em>gift</em> goes straight to their care", lead: "We are a small charity and we depend on kind people. Give once, or every month, and we will show you exactly where it went.",
    amounts: [10, 25, 50, 100], note: "You will finish on our secure donation page.",
    gifts: [["&pound;10", "feeds a dog for a week"], ["&pound;25", "pays for a vaccination and a health check"], ["&pound;50", "neuters a cat so it can be rehomed"], ["&pound;100", "covers a month of care for a rescued owl"]],
  },
  form: (submit) => C.form("contact", { submit }),
  order: { eyebrow: "Visit or adopt", submit: "Send my enquiry" },
  demo: {
    business_name: "Willowbrook Sanctuary", tagline: "A safe place for rescued dogs, cats and small animals to heal, and to find loving homes.", city: "Exeter",
    phone: "01392 555 0148", phone_href: "+441392555148", email: "hello@willowbrook.example", address_line1: "Hill Farm Lane", address_line2: "Exeter EX4 2AB",
    hours_weekdays: "10am – 4pm", hours_saturday: "10am – 4pm", hours_sunday: "11am – 3pm", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
    maps_url: "https://www.google.com/maps/search/?api=1&query=Hill+Farm+Lane+Exeter", form_endpoint: "", year_founded: "2011", owner_name: "Helen Ward",
    years_open: "15", animals_rehomed: "1200", animals_in_care: "85", donate_url: "https://example.org/donate",
  },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Caring since {{year_founded}}",
      heroH1: "A safe place <em>to begin again</em>.",
      cta1: "Adopt or visit", cta2: "Donate", cta2Href: "{{donate_url}}",
      glass: ["Open to visitors", "Come and say hello", "Visiting hours {{hours_weekdays}}. Please book ahead for groups."],
      promise: [["Every animal", "Fed, checked and loved from day one."], ["Careful matching", "The right animal for the right home."], ["Run by people", "Staff and volunteers who truly care."]],
      collection: ["Who we care for", "Four families <em>of friends</em>", "All animals"],
      fav: ["Meet them", "Looking for <em>a home</em>"],
      story: { eyebrow: "Our story", h2: "Small sanctuary, <em>big hearts</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} to give animals in need a second chance. Today our team and volunteers care for them every day of the year.", art: "heart", alt: "A heart", hint: "volunteer caring for a rescued dog" },
      stats: [["{{years_open}}", "", "years open"], ["{{animals_rehomed}}", "", "animals rehomed"], ["{{animals_in_care}}", "", "in our care today"]],
      process: ["How adopting works", "Three steps to <em>a new friend</em>", [["Meet", "Visit us, walk the dogs and meet the animals who need a home."], ["Match", "Tell us about your home and we help you find the right fit."], ["Take home", "Complete the adoption form, then welcome them home."]]],
      orderHome: "Plan a visit <em>or ask to adopt</em>", orderMenu: "Ready to <em>meet them</em>?", orderLead: "Send us a message and we will reply within a few days.",
      menuHero: ["Our animals", "Meet <em>everyone</em>", "Tags show if an animal is good with children, good with other pets, or needs a quiet home. Ask us about any animal."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Caring since {{year_founded}}",
      heroH1: "Every animal <em>deserves a home</em>.",
      cta1: "Adopt or visit", cta2: "Donate", cta2Href: "{{donate_url}}",
      badge: "Open today &middot; {{hours_weekdays}}",
      fav: ["Meet them", "Looking for <em>a home</em>", "Animals looking for homes", "Ask about me &rarr;"],
      story: { eyebrow: "Our story", h2: "Rescued, cared for, <em>rehomed</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. We rescue, rehabilitate and rehome animals, and we never give up on one." },
      facts: [["{{years_open}}", "", "years open"], ["{{animals_rehomed}}", "", "animals rehomed"], ["{{animals_in_care}}", "", "in our care"]],
      panels: [["dog", "A rescue dog", "Rescue", "Every animal arrives with a story.", "rescued dog", "featured"], ["cat", "A cat", "Care", "Good food, vet checks and plenty of patience.", "rescue cat", "secondary"], ["heart", "A heart", "Rehome", "Matched carefully with a loving family.", "adoption", "secondary"]],
      statement: "<span>Giving</span> <span>animals</span> <span>a second</span> <span><em>chance</em></span> <span>in {{city}}.</span>",
      orderHome: "Visit us <em>or ask to adopt</em>", orderMenu: "Ready to <em>meet them</em>?", orderLead: "Send us a message and we will reply within a few days.",
      menuHero: ["Our animals", "The <em>full</em> list", "Tags show if an animal is good with children, good with other pets, or needs a quiet home. Ask us about any animal."],
    },
    motion: {
      heroLines: ["Safe", "haven"],
      cta1: "Adopt or visit", cta2: "Donate", cta2Href: "{{donate_url}}",
      marquee: ["Rescue", "Rehome", "Volunteer", "Donate"],
      tiles: ["Who we <em>help</em>", "All animals"],
      nums: [["{{years_open}}", "", "Years open"], ["{{animals_rehomed}}", "", "Animals rehomed"], ["{{animals_in_care}}", "", "In our care"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. Every animal here has a name, a warm bed and someone who cares.",
      orderHome: "Come and<br><em>say hello.</em>", orderMenu: "Ready to <em>visit?</em>", orderLead: "Send us a message and we will reply within a few days.",
      menuHero: ["Our <em>animals</em>", "Tags show if an animal is good with children, good with other pets, or needs a quiet home. Ask us about any animal."],
    },
  },
  css: T,
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#3A2418", crust: "#C98B52", crustDark: "#8E5A2E", light: "#F3D5A8", cream: "#FFF1DC", accent: "#2F7D6B", accent2: "#F2A3A3", shadow: "rgba(30,60,40,.35)", plate: "#FFFFFF" },
    motifs: ["dog", "cat", "rabbit", "owl", "paw", "heart"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FBFFF8 0%,#EAF3E6 55%,#D4E5CF 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(40,80,50,.10) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { dog: "#F7C36B", cat: "#B9CCE6", rabbit: "#F4C6C6", owl: "#C9DFB5", paw: "#F3B8C4", heart: "#F6B7A8" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { dog: "#FFD166", cat: "#8EC5FF", rabbit: "#FFADC6", owl: "#9EE0A8", paw: "#B9A6FF", heart: "#FFE08A" } },
    },
    videos: {
      atelier: { T: 8, page: "#08140E", sky: ["#06100B", "#0F2318", "#1B3A2A"], glow: "255,190,100", beam: "255,230,160", dust: "255,240,190", steam: "", items: [["dog", 700, 650, 400, 0], ["cat", 500, 660, 250, 0.4], ["owl", 1010, 610, 230, 0.7]] },
      gallery: { T: 10, disc: ["#DDEFC8", "#BFE0A4", "#A8D48A"], ring: "120,170,100", items: ["dog", "cat", "rabbit", "owl", "heart"] },
      motion: { T: 8, base: "#EAF6DE", blobs: ["#4FA37A", "#F5C451", "#FF8A6B", "#9ED8B8", "#1F5A45", "#FFB86B", "#7CC4E8"] },
    },
  },
};
