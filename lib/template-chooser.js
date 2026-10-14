"use strict";
/**
 * Template auto-chooser (Track 2a). Reads what the person typed ("a bakery in Leeds") and silently picks one of the 15
 * industry packs and one of its styles in `templates/`. No model, no network, no cost: a keyword rule, then the industry
 * match in lib/industry-design.js (192 industries), then a small table from those industry names to our 15 packs.
 *
 *   choose(prompt, businessInfo) -> { pack, style, via, industry?, hits } | null
 *
 * null means "no template fits": the caller keeps the section-library builder. It never throws.
 */
const T = require("./template-site");

const fold = (s) => String(s == null ? "" : s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// pack id -> words that say "this business is one of these". Whole words or word starts (see wordRe).
const PACK_WORDS = {
  sanctuary: ["sanctuary", "animal rescue", "rescue centre", "rescue center", "rescue shelter", "animal shelter", "rehoming", "rehome", "wildlife", "refuge", "donkey", "horse rescue"],
  legal: ["solicitor", "law firm", "lawyer", "legal", "barrister", "conveyancing", "attorney", "notary", "immigration advisor"],
  clinic: ["dentist", "dental", "clinic", "doctor", "physio", "chiropract", "optician", "medical", "health centre", "orthodont", "podiatr", "osteopath", "therapist", "gp surgery"],
  realestate: ["estate agent", "letting", "lettings", "property", "real estate", "realtor", "landlord", "mortgage"],
  garage: ["garage", "mot", "mechanic", "tyre", "tyres", "tire", "car repair", "car service", "auto repair", "car wash", "bodyshop", "body shop"],
  hotel: ["hotel", "b&b", "bed and breakfast", "guest house", "guesthouse", "hostel", "travel agent", "travel agency", "holiday", "resort", "villa", "campsite", "tour operator", "inn"],
  tutor: ["tutor", "tutoring", "tuition", "teacher", "school", "academy", "lessons", "exam", "college", "nursery", "childcare", "courses", "education"],
  photo: ["photographer", "photography", "wedding photographer", "videographer", "portrait", "photo studio"],
  beauty: ["salon", "hair", "hairdresser", "barber", "beauty", "nails", "nail", "tanning", "spa", "lash", "lashes", "brows", "makeup", "aesthetics", "massage"],
  fitness: ["gym", "fitness", "personal trainer", "crossfit", "pilates", "yoga", "boxing", "martial arts", "bootcamp", "training studio"],
  restaurant: ["restaurant", "bistro", "pub", "gastropub", "bar", "grill", "pizzeria", "takeaway", "steakhouse", "brasserie", "diner", "cocktail bar", "food truck", "curry house", "tapas"],
  trades: ["plumber", "plumbing", "electrician", "electrical", "builder", "roofer", "roofing", "heating", "boiler", "carpenter", "joiner", "painter", "decorator", "handyman", "locksmith", "landscaper", "gardener", "cleaner", "cleaning", "removals", "man and van"],
  fashion: ["fashion", "clothing", "clothes", "boutique", "apparel", "jewellery", "jewelry", "shoes", "sneakers", "online shop", "online store", "ecommerce", "e-commerce", "streetwear", "handbags", "accessories"],
  bakery: ["bakery", "bakeries", "baker", "bread", "cake", "cakes", "pastry", "patisserie", "cupcake", "cupcakes", "sourdough", "cafe", "coffee shop", "donut", "doughnut"],
  tech: ["software", "saas", "web design", "web agency", "digital agency", "marketing agency", "developer", "it support", "startup", "cyber", "cloud", "software company"],
};
// When two packs score the same, the more specific business wins (earlier here). "wedding bakery" is a bakery; "dental software" is tech.
const PRIORITY = ["sanctuary", "legal", "clinic", "realestate", "garage", "hotel", "tutor", "photo", "fitness", "beauty", "restaurant", "trades", "bakery", "fashion", "tech"];

// industry-design.js product type -> pack, for requests no keyword caught ("hair braiding" never mentions a salon).
const INDUSTRY_TO_PACK = {
  "Bakery/Cafe": "bakery", "Restaurant/Food Service": "restaurant", "Brewery/Winery": "restaurant", "Food Delivery / On-Demand": "restaurant",
  "Beauty/Spa/Wellness Service": "beauty", "Fitness/Gym App": "fitness", "Yoga & Stretching Guide": "fitness",
  "Home Services (Plumber/Electrician)": "trades", "Hyperlocal Services": "trades", "Construction/Architecture": "trades",
  "Real Estate/Property": "realestate", "Medical Clinic": "clinic", "Dental Practice": "clinic", "Legal Services": "legal",
  "Automotive/Car Dealership": "garage", "Hotel/Hospitality": "hotel", "Travel/Tourism Agency": "hotel",
  "Online Course/E-learning": "tutor", "Language Learning App": "tutor", "Childcare/Daycare": "tutor", "Photography Studio": "photo", "Wedding/Event Planning": "photo",
  "E-commerce": "fashion", "E-commerce Luxury": "fashion", "Luxury/Premium Brand": "fashion",
  "SaaS (General)": "tech", "Micro SaaS": "tech", "B2B Service": "tech", "Creative Agency": "tech", "Marketing Agency": "tech", "Developer Tool / IDE": "tech", "Cybersecurity Platform": "tech",
};

// Style words. The five generic layouts exist in every pack; the others are one pack's own layouts, each with one working tool.
const GENERIC_WORDS = {
  atelier: ["elegant", "refined", "boutique", "luxury", "premium", "classic", "upmarket", "sophisticated"],
  gallery: ["portfolio", "gallery", "showcase", "visual", "photos", "art"],
  motion: ["modern", "dynamic", "animated", "energetic", "video", "lively", "vibrant"],
  studio: ["creative", "studio", "minimal", "minimalist", "clean", "simple", "sleek"],
  daylight: ["bright", "light", "friendly", "fresh", "airy", "family", "welcoming", "cheerful"],
};
const SPECIAL_WORDS = {
  bakery: { minimal: ["minimal", "minimalist", "simple"], bold: ["bold", "loud", "colourful", "colorful"], editorial: ["editorial", "magazine", "story"], linen: ["linen", "natural", "rustic"], split: ["split"], journal: ["journal", "blog", "diary"], market: ["market", "stall", "farmers"], hearth: ["cosy", "cozy", "warm", "hearth", "family"] },
  sanctuary: { linen: ["natural", "linen"], split: ["split"], journal: ["journal", "blog", "diary"], market: ["market", "shop", "merch"], hearth: ["warm", "cosy", "cozy"], kindred: ["sponsor", "adopt", "kindred"], stories: ["stories", "story"], commons: ["community", "volunteer", "commons"], gazette: ["news", "gazette", "newsletter"], wildkind: ["wild", "wildlife"], letter: ["letter", "donate"] },
  beauty: { aura: ["aura", "wellness", "glow"], boudoir: ["boudoir", "luxury", "romantic"], swatch: ["colour", "color", "swatch", "tanning", "shade"], booker: ["booking", "book online", "appointments"], reel: ["reel", "video", "social"] },
  fitness: { pulse: ["pulse", "energy", "hiit"], timetable: ["timetable", "classes", "schedule"], tiers: ["membership", "pricing", "tiers"], matcher: ["beginner", "goals", "match"], interval: ["interval", "timer", "boxing", "bootcamp"] },
  restaurant: { cellar: ["wine", "cellar"], smokehouse: ["smokehouse", "bbq", "barbecue", "smoked", "grill"], trattoria: ["italian", "pizza", "trattoria", "pasta"], cocktail: ["cocktail", "bar", "drinks"], tasting: ["tasting", "fine dining", "menu"] },
  trades: { sparks: ["electrician", "electrical", "sparks"], pipeworks: ["plumber", "plumbing", "pipes", "boiler"], warmth: ["heating", "warmth", "boiler"], quoter: ["quote", "quotes", "estimate"], vanline: ["removals", "van", "delivery", "cleaning"] },
  realestate: { listings: ["listings", "homes for sale", "estate agent"], mortgage: ["mortgage"], skyline: ["city", "skyline", "apartments", "luxury"], valuer: ["valuation", "valuer", "sell"], tour: ["tour", "viewing", "viewings"] },
  clinic: { smile: ["dentist", "dental", "smile"], checkup: ["checkup", "check-up", "screening"], plans: ["plans", "membership", "payment"], kids: ["kids", "children", "paediatric", "pediatric", "family"], urgent: ["urgent", "emergency", "same day"] },
  legal: { counsel: ["counsel", "barrister"], fees: ["fees", "fixed fee", "costs"], verdict: ["litigation", "court", "dispute", "verdict"], plain: ["plain", "simple", "family"], bring: ["documents", "what to bring"] },
  garage: { motcheck: ["mot", "test"], tyrefit: ["tyre", "tyres", "tire"], servicing: ["servicing", "service", "repair"], dash: ["diagnostic", "warning light", "dash"], forecourt: ["forecourt", "used cars", "dealership", "sales"] },
  hotel: { rooms: ["rooms", "hotel", "b&b", "guest house"], voyage: ["voyage", "trip", "travel", "tour"], packing: ["packing", "holiday", "break"], lantern: ["lantern", "boutique", "cosy", "cozy"], seasons: ["seasons", "seasonal", "resort"] },
  tutor: { lessons: ["lessons", "tutor", "one to one"], chalk: ["chalk", "classroom", "school", "timetable"], quickfire: ["quiz", "quickfire", "practice"], progress: ["progress", "tracking", "results"], countdown: ["exam", "exams", "gcse", "a level", "revision"] },
  photo: { packages: ["packages", "pricing", "wedding"], shotlist: ["shot list", "shotlist", "wedding"], daycast: ["golden hour", "timeline", "wedding day"], grade: ["edit", "editing", "retouch", "grade"], prints: ["prints", "albums", "framing"] },
  fashion: { sizer: ["size", "sizes", "fit"], outfit: ["outfit", "outfits", "styling"], bundle: ["bundle", "bundles", "deals"], drop: ["drop", "limited", "streetwear", "launch"], wears: ["sustainable", "second hand", "vintage", "pre-loved"] },
  tech: { estimate: ["estimate", "quote", "project"], care: ["support", "care", "maintenance"], stack: ["stack", "developer", "tools"], status: ["status", "uptime", "hosting", "cloud"], metrics: ["analytics", "metrics", "dashboard", "data"] },
};
const DEFAULT_STYLE = "atelier"; // exists in every pack; the most neutral of the five generic layouts

/** True when `word` appears in `text` as a whole word, or as the start of a longer one ("bak" is not "bakery", but "plumb" is "plumber" only if listed). */
const wordRe = (w) => new RegExp(`(^|[^a-z0-9])${fold(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}(?![a-z0-9])`);
const has = (text, w) => wordRe(w).test(text);
const score = (text, words) => words.filter((w) => has(text, w));

/** Pick the pack: the most keyword hits, ties by PRIORITY; else the industry match mapped to a pack; else null. */
function choosePack(text) {
  let best = null;
  for (const pack of PRIORITY) {
    const hits = score(text, PACK_WORDS[pack]);
    if (hits.length && (!best || hits.length > best.hits.length)) best = { pack, hits, via: "keywords" };
  }
  if (best) return best;
  let industry = null;
  try { industry = require("./industry-design").getIndustryDesign(text); } catch (_e) { industry = null; }
  const pack = industry && INDUSTRY_TO_PACK[industry.industry];
  return pack ? { pack, hits: [], via: "industry-match", industry: industry.industry } : null;
}

/** Pick the style inside the pack: the most style words in the request, the pack's own layouts before the generic ones on a tie; else the default. */
function chooseStyle(pack, text) {
  const info = T.catalog().industries.find((i) => i.id === pack);
  if (!info) return null;
  // Only layouts whose example content is fully slotted are chosen for a customer (see lib/template-site.js isHonest).
  const have = new Set(info.styles.filter((s) => T.isHonest(s.id)).map((s) => s.id));
  let best = null;
  const consider = (style, words, special) => {
    if (!have.has(style)) return;
    const hits = score(text, words);
    if (hits.length && (!best || hits.length > best.hits.length || (hits.length === best.hits.length && special && !best.special))) best = { style, hits, special };
  };
  for (const [s, w] of Object.entries(SPECIAL_WORDS[pack] || {})) consider(s, w, true);
  for (const [s, w] of Object.entries(GENERIC_WORDS)) consider(s, w, false);
  return best ? { style: best.style, hits: best.hits } : { style: have.has(DEFAULT_STYLE) ? DEFAULT_STYLE : info.styles[0].id, hits: [] };
}

// ---------------------------------------------------------------- the details form -> the template's fields (Track 2b)
/** "in Leeds", "in Newcastle upon Tyne": a town the person typed themselves. Nothing is guessed when there is none. */
function cityFrom(prompt) {
  const m = /\b(?:in|near|from|based in)\s+([A-Z][A-Za-z'\u2019-]+(?:\s+(?:upon|on|under|le|de|St\.?|[A-Z][A-Za-z'\u2019-]+)){0,3})/.exec(String(prompt || ""));
  return m ? m[1].trim() : "";
}

/** "12 High Street, Leeds LS1 4AB" -> line 1 "12 High Street", line 2 "Leeds LS1 4AB". One part stays whole, in line 1. */
function splitAddress(address) {
  const parts = String(address || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { address_line1: parts[0] || "", address_line2: "" };
  return { address_line1: parts.slice(0, -1).join(", "), address_line2: parts[parts.length - 1] };
}

/**
 * What the person told us (the details form: name, tagline, phone, email, address, Instagram, Facebook; and a town typed in the
 * request) laid into this pack's own fields. Only what was given goes in; a value that fails the pack's checks is dropped, not
 * "fixed". Everything else stays empty, and the template shows an "Add ... here" marker for it (never the example business).
 * @returns {{ values: object, used: string[], dropped: string[] }}
 */
function valuesFrom(pack, prompt, businessInfo) {
  const b = businessInfo && typeof businessInfo === "object" ? businessInfo : {};
  const want = { business_name: b.name, tagline: b.tagline, phone: b.phone, email: b.email, instagram_url: b.instagram, facebook_url: b.facebook, city: cityFrom(prompt), ...splitAddress(b.address) };
  const given = Object.fromEntries(Object.entries(want).filter(([, v]) => typeof v === "string" && v.trim()));
  // The picker requires a business name; here a missing one is allowed (the page then shows "[Add business name here]"), so the
  // check runs with a stand-in that is removed again.
  const hadName = !!given.business_name;
  if (!hadName) given.business_name = "x";
  let r = T.cleanValues(pack, given);
  const dropped = [];
  if (!r.ok) {
    for (const k of Object.keys(r.errors)) { dropped.push(k); delete given[k]; }
    if (!given.business_name) given.business_name = "x";
    r = T.cleanValues(pack, given);
  }
  const values = r.ok ? { ...r.values } : {};
  if (!hadName || dropped.includes("business_name")) delete values.business_name;
  return { values, used: Object.keys(values), dropped, ok: r.ok };
}

function choose(prompt, businessInfo) {
  try {
    const name = businessInfo && typeof businessInfo === "object" ? businessInfo.name : "";
    const text = fold(`${prompt || ""} ${name || ""}`);
    if (!text.trim()) return null;
    const p = choosePack(text);
    if (!p) return null;
    const s = chooseStyle(p.pack, text);
    if (!s) return null;
    return { pack: p.pack, style: s.style, via: p.via, industry: p.industry, hits: [...p.hits, ...s.hits] };
  } catch (err) {
    console.warn("[template-chooser] no choice:", err.message);
    return null;
  }
}

module.exports = { choose, valuesFrom, cityFrom, splitAddress, choosePack, chooseStyle, PACK_WORDS, PRIORITY, INDUSTRY_TO_PACK, GENERIC_WORDS, SPECIAL_WORDS, DEFAULT_STYLE };
