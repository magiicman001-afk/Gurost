"use strict";
/**
 * Industry pack: bakery. A pack is the words, items, pictures and colours that turn a layout (atelier, gallery, motion) into a
 * site for one kind of business. The layouts hold no industry wording; everything a visitor reads comes from here.
 * Copy strings are final HTML and may hold {{tokens}} that the customer's details fill in later.
 */
const C = require("../common");
const { DEMO } = require("../fill");

const cats = C.MENU.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i, meta: `&pound;${i.p}`, tagList: i.tags })) }));

module.exports = {
  id: "bakery",
  label: "Bakery",
  ldType: "Bakery",
  ldExtra: { servesCuisine: "Bakery" },
  hint: "bakery",
  photo: "professional food photograph, natural window light, shallow depth of field, rustic wooden surface, appetising, true-to-life colours, photorealistic, no text, no people",
  videoQuery: "baking bread bakery",
  styles: ["minimal", "bold", "editorial", "atelier", "gallery", "motion", "linen", "split", "journal", "market", "studio", "daylight", "hearth"],
  mediaDir: "bakery",
  nav: { home: "Home", menu: "Menu", cta: "Pre-order", ctaHref: "index.html#order" },
  cats,
  tags: C.TAGS,
  demo: DEMO,
  seo: {
    home: { title: "Fresh bakery", desc: "Artisan bakery in {{city}}. Sourdough, pastries and coffee, baked fresh every morning." },
    menu: { title: "Menu", desc: "Our full menu: bread, pastries, cakes and coffee at {{business_name}}, {{city}}." },
  },
  form: (submit) => C.form("order", { submit }),
  order: { eyebrow: "Pre-order", submit: "Send my pre-order" },
  copy: {
    atelier: {
      heroEyebrow: "{{city}} &middot; Since {{year_founded}}",
      heroH1: "Baked slowly, <em>for {{city}}</em>.",
      cta1: "Pre-order for tomorrow", cta2: "See the menu",
      glass: ["Fresh today", "Out of the oven", "Sourdough, butter croissants and warm cinnamon rolls. Open {{hours_weekdays}}."],
      promise: [["Slow dough", "Fermented for 36 hours for flavour."], ["Real butter", "Nothing artificial, ever."], ["Baked daily", "Made this morning, gone by evening."]],
      collection: ["The collection", "Four things we <em>do well</em>", "Full menu"],
      fav: ["Most loved", "Start <em>here</em>"],
      story: { eyebrow: "Our story", h2: "Small bakery, <em>big patience</em>", lead: "{{owner_name}} opened {{business_name}} in {{year_founded}} with one oven and a simple idea: bake the way it used to be done, and do it every morning.", art: "wheat", alt: "Wheat and flour", hint: "bakery flour wheat" },
      stats: [["{{years_baking}}", "", "years baking"], ["36", "h", "slow rise"], ["27", "", "croissant layers"]],
      process: ["How it works", "Three steps to <em>warm bread</em>", [["Choose", "Pick your favourites from the menu, or just tell us what you fancy."], ["Pre-order", "Send the form below with a day and time that suits you."], ["Collect", "Pop in, say hello and take it home still warm."]]],
      orderHome: "Order ahead, <em>skip the queue</em>", orderMenu: "Ready to <em>order</em>?", orderLead: "Tell us what you would like and when. We confirm by email.",
      menuHero: ["Menu", "Everything, <em>fresh</em>", "Prices include VAT. V vegetarian, VG vegan, GF gluten free. Ask us about allergens."],
    },
    gallery: {
      heroEyebrow: "{{city}} &middot; Since {{year_founded}}",
      heroH1: "Bread worth <em>the walk</em>.",
      cta1: "Pre-order", cta2: "Browse the menu",
      badge: "Baking now &middot; open {{hours_weekdays}}",
      fav: ["Today's best", "Our <em>favourites</em>", "Favourite bakes", "Add to pre-order &rarr;"],
      story: { eyebrow: "Our story", h2: "Made by hand, <em>never rushed</em>", lead: "{{owner_name}} started {{business_name}} in {{year_founded}}. Every loaf is mixed, shaped and baked on site, the same way, every day." },
      facts: [["{{years_baking}}", "", "years baking"], ["36", "h", "slow rise"], ["100", "%", "real butter"]],
      panels: [["wheat", "Flour and wheat", "Good flour", "Stoneground and sourced close to home.", "bakery flour wheat", "featured"], ["loaf", "Sourdough loaf", "Slow fermentation", "Thirty-six hours for flavour and a better crumb.", "sourdough loaf", "secondary"], ["croissant", "Butter croissant", "Out of the oven", "Warm when you pick it up, as it should be.", "butter croissant", "secondary"]],
      statement: "<span>Baked</span> <span>in</span> <span><em>{{city}}</em></span> <span>every</span> <span>morning.</span>",
      orderHome: "Order ahead and <em>skip the queue</em>", orderMenu: "Ready to <em>order</em>?", orderLead: "Pick a day and a time. We bake it, you collect it.",
      menuHero: ["Menu", "The <em>full</em> menu", "Prices include VAT. V vegetarian, VG vegan, GF gluten free. Ask us about allergens."],
    },
    motion: {
      heroLines: ["Fresh", "baked"],
      cta1: "Pre-order", cta2: "See the menu",
      marquee: ["Fresh bread", "Butter pastries", "Warm coffee", "Baked daily"],
      tiles: ["What we <em>bake</em>", "Full menu"],
      nums: [["{{years_baking}}", "", "Years baking"], ["36", "h", "Slow rise"], ["27", "", "Croissant layers"]],
      about: "{{owner_name}} opened {{business_name}} in {{year_founded}}. One oven, real butter, good flour and a lot of patience.",
      orderHome: "Order ahead.<br><em>Skip the queue.</em>", orderMenu: "Ready to <em>order?</em>", orderLead: "Pick a day and a time. We bake it, you collect it.",
      menuHero: ["The <em>menu</em>", "Prices include VAT. V vegetarian, VG vegan, GF gluten free. Ask us about allergens."],
    },
  },
  css: { atelier: "", gallery: "", motion: "", linen: "", split: "", journal: "", market: "", studio: "", daylight: "", hearth: "" },
  // what scripts/build-media.js draws for this industry: pictures (three looks) and the three hero loops
  media: {
    pal: { soft3d: true, sw: 0, bg: "#FFFFFF", ink: "#8A5A2B", crust: "#D99A4E", crustDark: "#A8672A", light: "#F6D8A6", cream: "#FFF4E2", accent: "#C2512F", accent2: "#F0A59A", shadow: "rgba(90,50,10,.38)", plate: "#FFF8EC" },
    motifs: ["croissant", "loaf", "baguettes", "cupcake", "slice", "coffee", "roll", "wheat"],
    sets: {
      atelier: { w: 960, h: 1200, bg: "radial-gradient(ellipse 70% 46% at 50% 40%,#FFFCF5 0%,#F6ECDC 55%,#E9D9BF 100%)", floor: "linear-gradient(180deg,transparent 0,transparent 62%,rgba(120,80,30,.10) 100%)", scale: 0.88, top: 0.2 },
      gallery: { w: 960, h: 1200, bg: "#FFFFFF", scale: 0.8, top: 0.28, disc: { loaf: "#F7BF4F", croissant: "#F8BDAE", roll: "#C3DCC6", slice: "#F4C9D8", cupcake: "#D3C8F3", baguettes: "#FAD98F", coffee: "#C0DBEA", wheat: "#F2E0B4" } },
      motion: { w: 1000, h: 1000, scale: 0.84, top: 0.14, tint: { loaf: "#FFD83D", croissant: "#FF8E6B", roll: "#8FE3C0", slice: "#FF9EC1", cupcake: "#B9A6FF", baguettes: "#FFB48A", coffee: "#7FD1FF", wheat: "#D6F06B" } },
    },
    videos: {
      atelier: { T: 8, page: "#150B05", sky: ["#120904", "#2A160A", "#3F2210"], glow: "255,150,60", beam: "255,214,150", dust: "255,236,205", steam: "255,238,215", items: [["loaf", 360, 560, 440, 0], ["croissant", 150, 760, 270, 0.33], ["roll", 880, 600, 250, 0.66]] },
      gallery: { T: 10, disc: ["#FFD36A", "#F7BF4F", "#F2AE36"], ring: "247,191,79", items: ["loaf", "croissant", "roll", "cupcake", "baguettes"] },
      motion: { T: 8, base: "#FFE9C7", blobs: ["#E8892B", "#FF5A36", "#FFC93C", "#FF9EB5", "#5A2A10", "#FF7A2F", "#F7B267"] },
    },
  },
};
