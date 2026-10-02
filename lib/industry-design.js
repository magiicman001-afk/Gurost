/**
 * Industry-specific design lookup: maps a free-text build prompt
 * ("a website for my bakery", "law firm landing page") to a palette and
 * font pairing chosen for that industry, instead of one fixed palette
 * for every site.
 *
 * Data: lib/design-data/*.csv from UI/UX Pro Max (MIT, see NOTICE.md).
 *   products.csv   - industry keywords, style + layout recommendations
 *   colors.csv     - one semantic palette per industry
 *   typography.csv - font pairings with "Best For" industry text
 *
 * getIndustryDesign(text) returns null when nothing matches, so callers
 * keep their existing default in that case.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "design-data");

// Minimal RFC 4180 parser - quoted fields, "" escapes, commas and
// newlines inside quotes. Returns an array of objects keyed by header.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);

  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] || "").trim()])));
}

let cache = null;
function load() {
  if (cache) return cache;
  const read = (name) => parseCsv(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
  const products = read("products.csv");
  const colors = new Map(read("colors.csv").map((r) => [r["Product Type"], r]));
  const typography = read("typography.csv");
  cache = { products, colors, typography };
  return cache;
}

// Words too generic to identify an industry on their own.
const STOPWORDS = new Set([
  "a", "an", "and", "the", "for", "with", "of", "to", "my", "our", "in", "on", "site", "website", "web",
  "page", "landing", "app", "online", "small", "business", "services", "service", "platform", "company",
  "shop", "store", "booking", "gallery", "tool", "called", "local", "studio"
]);

// Everyday words people type that the dataset's keywords don't use.
const SYNONYMS = {
  coffee: "cafe", espresso: "cafe", barista: "cafe", patisserie: "bakery", cupcake: "bakery",
  lawyer: "law", lawyers: "law", solicitor: "law", solicitors: "law", barrister: "law",
  dog: "pet", dogs: "pet", cat: "pet", cats: "pet", puppy: "pet", grooming: "pet", groomer: "pet",
  startup: "saas", startups: "saas",
  photographer: "photography", photographers: "photography",
  architect: "architecture", architects: "architectural architecture", architectural: "architecture",
  // Places to stay -> Hotel/Hospitality ("luxury resort ... spa section"
  // used to match Beauty/Spa on the word "spa").
  resort: "hotel", resorts: "hotel", inn: "hotel", motel: "hotel", lodge: "hotel", guesthouse: "hotel", hostel: "hotel",
  diner: "restaurant", bistro: "restaurant", brasserie: "restaurant", trattoria: "restaurant",
  dentist: "dental", dentists: "dental", orthodontist: "dental", orthodontics: "dental",
  pilates: "gym", crossfit: "gym",
  barber: "salon", barbers: "salon", barbershop: "salon", hairdresser: "salon"
};

// Multi-word names for a business, matched as whole phrases.
const PHRASE_SYNONYMS = [
  [/\bbed (and|&) breakfast\b|\bb ?& ?b\b/, "hotel"],
  [/\bwellness (centre|center)\b|\bday spa\b/, "spa"],
  [/\bcoffee (shop|house)\b/, "cafe"],
  [/\blegal practice\b/, "law"],
  [/\bfitness studio\b/, "gym"]
];

// Accents off, so "café" matches the dataset's "cafe" (not "caf").
const fold = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "");

function expand(text) {
  text = fold(text);
  const lower = String(text).toLowerCase();
  const words = lower.split(/[^a-z0-9]+/);
  const extra = words.map((w) => SYNONYMS[w]).filter(Boolean);
  for (const [re, term] of PHRASE_SYNONYMS) if (re.test(lower)) extra.push(term);
  return `${lower} ${extra.join(" ")}`;
}

// Plural -> singular so "cafes"/"cafe", "bakeries"/"bakery" and
// "clinics"/"clinic" compare equal.
function stem(t) {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (/(ss|x|z|ch|sh)es$/.test(t)) return t.slice(0, -2);
  if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1); // >4 keeps "saas"
  return t;
}

function tokens(text) {
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t)).map(stem);
}

// Position of a keyword phrase in the prompt (plural-tolerant), or -1.
function phraseIndex(haystack, phrase) {
  const p = phrase.toLowerCase().trim();
  if (!p || STOPWORDS.has(p)) return -1;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[-\s]+/g, "[-\\s]+");
  const m = new RegExp(`\\b${escaped}(s|es)?\\b`).exec(haystack);
  return m ? m.index : -1;
}

function containsPhrase(haystack, phrase) {
  return phraseIndex(haystack, phrase) !== -1;
}

// How many industries mention each term (in keywords or name). A term
// shared by many ("tech" is in 6, "app" in 21) says little about which
// one this prompt is, so matches are weighted by rarity, and a match
// built only from common terms is not trusted.
const WEAK_TERM_MIN_INDUSTRIES = 4;

// "<term> firm", "<term> studio"... - the term names the business itself.
const BUSINESS_NOUNS = new Set(["firm", "company", "studio", "agency", "shop", "practice", "clinic", "business", "startup", "salon", "store", "consultancy", "office"]);
let termIndustryCount = null;
function industryCount(term) {
  if (!termIndustryCount) {
    termIndustryCount = new Map();
    for (const row of load().products) {
      const terms = new Set([
        ...row.Keywords.split(",").map((k) => stem(k.trim().toLowerCase())).filter(Boolean),
        ...tokens(row["Product Type"])
      ]);
      for (const t of terms) termIndustryCount.set(t, (termIndustryCount.get(t) || 0) + 1);
    }
  }
  return termIndustryCount.get(stem(String(term).trim().toLowerCase())) || 1;
}

// Best industry for the prompt. Each matched keyword adds log(N/count)
// - rare, specific terms dominate - and words from the industry's own
// name add half that. A term that names the business itself counts
// double: one reached via SYNONYMS (photographer, architects, startup,
// groomer...) or followed by a business noun ("architecture firm",
// "coffee shop"); otherwise a feature word like "scheduling" or an
// adjective like "sustainable" can outscore the actual business.
// Ties go to the term that appears first in the prompt. Returns null
// when only common terms matched, so the caller keeps its default
// design instead of guessing an industry from generic words.
function matchIndustry(text) {
  const original = fold(text).toLowerCase();
  const haystack = expand(text);
  const n = load().products.length;
  const weight = (term) => Math.log(n / industryCount(term));
  const namesBusiness = (term, at) => {
    if (at >= original.length) return true; // came from a synonym
    const after = /^[\w-]*\s+([a-z]+)/.exec(haystack.slice(at + term.trim().length));
    return !!after && BUSINESS_NOUNS.has(after[1]);
  };
  let best = null;
  for (const row of load().products) {
    let score = 0;
    let firstAt = Infinity;
    let specific = false;
    const hit = (term, factor) => {
      const at = phraseIndex(haystack, term);
      if (at === -1) return;
      score += factor * weight(term) * (namesBusiness(term, at) ? 2 : 1);
      firstAt = Math.min(firstAt, at);
      if (industryCount(term) < WEAK_TERM_MIN_INDUSTRIES) specific = true;
    };
    for (const kw of row.Keywords.split(",")) hit(kw, 1);
    for (const t of tokens(row["Product Type"])) hit(t, 0.5);
    if (!specific || score === 0) continue;
    if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && firstAt < best.firstAt)) {
      best = { row, score, firstAt };
    }
  }
  return best ? best.row : null;
}

// Font pairing whose "Best For" / mood text shares the most words with
// the industry's name and keywords.
function matchFonts(product) {
  const wanted = new Set(tokens(`${product["Product Type"]} ${product.Keywords}`));
  let best = null;
  let bestScore = 0;
  for (const row of load().typography) {
    const have = new Set(tokens(`${row["Best For"]} ${row["Mood/Style Keywords"]}`));
    let score = 0;
    for (const t of wanted) if (have.has(t)) score++;
    if (score > bestScore) { best = row; bestScore = score; }
  }
  return best;
}

function getIndustryDesign(text) {
  if (!text || !String(text).trim()) return null;
  const product = matchIndustry(text);
  if (!product) return null;

  const c = load().colors.get(product["Product Type"]);
  const f = matchFonts(product);

  return {
    industry: product["Product Type"],
    style: product["Primary Style Recommendation"],
    landingPattern: product["Landing Page Pattern"],
    considerations: product["Key Considerations"],
    colors: c ? {
      primary: c.Primary,
      onPrimary: c["On Primary"],
      secondary: c.Secondary,
      accent: c.Accent,
      onAccent: c["On Accent"],
      background: c.Background,
      foreground: c.Foreground,
      card: c.Card,
      muted: c.Muted,
      mutedForeground: c["Muted Foreground"],
      border: c.Border,
      notes: c.Notes
    } : null,
    fonts: f ? {
      name: f["Font Pairing Name"],
      heading: f["Heading Font"],
      body: f["Body Font"],
      googleFontsUrl: f["Google Fonts URL"]
    } : null
  };
}

// Hand-written layout direction for the industries Gurost is tuned for;
// other industries get the dataset's pattern and style line only.
const ARCHITECTURE_LAYOUT = "Minimal and structured: lots of whitespace, a strict grid, large full-bleed project imagery, and a gallery-style project portfolio where each project shows its name, location and year. Understated typography, almost no decoration, calm motion.";
const LAYOUT_NOTES = {
  "Legal Services": "Serious and structured: generous whitespace, serif headings, a credentials or trust bar near the top, practice areas as a clean grid, attorney profiles with photo and qualifications, a calm consultation call to action. Restrained motion; no playful shapes or emoji.",
  "Bakery/Cafe": "Warm and handcrafted: soft rounded shapes, cream backgrounds, large appetising food photography, a menu laid out like a printed menu card with prices, friendly hand-drawn touches kept tidy.",
  "SaaS (General)": "Modern and bold: a large confident sans-serif headline, a product mock-up or dashboard visual in the hero, a feature grid with icons, customer logos as social proof, a pricing table and one strongly contrasting call to action.",
  "Restaurant/Food Service": "Elegant and food-led: deep, dark-toned backgrounds, full-bleed food photography, refined serif display type, the menu grouped by course, and a prominent reservation call to action with opening hours.",
  "Construction/Architecture": ARCHITECTURE_LAYOUT,
  "Architecture / Interior": ARCHITECTURE_LAYOUT
};

// Ready-made "Typography:" / "Color:" lines for the builders' system
// prompts. Returns null when the prompt matches no industry, and a null
// typography line when the industry has no font pairing, so callers
// fall back to their own default line in either case.
function designPromptLines(prompt) {
  const d = getIndustryDesign(prompt);
  if (!d || !d.colors) return null;
  const c = d.colors;
  const note = c.notes ? ` (${c.notes.replace(/\s*\[.*\]\s*$/, "")})` : "";
  return {
    industry: d.industry,
    // Short labels for the builder's activity log.
    fonts: d.fonts ? `${d.fonts.heading} + ${d.fonts.body}` : null,
    palette: `${c.primary} on ${c.background}`,
    // What sites in this industry need (e.g. menu, hours, ordering).
    mustHaves: d.considerations || null,
    layout: `Layout: for a ${d.industry} site, use the "${d.landingPattern}" page pattern with a "${d.style}" visual style.${LAYOUT_NOTES[d.industry] ? ` ${LAYOUT_NOTES[d.industry]}` : ""}`,
    typography: d.fonts
      // Font names only, never the Google Fonts URL: the site must echo
      // that URL verbatim, and security.detectPromptLeak rejects any
      // output repeating 50+ chars of the system prompt.
      ? `Typography: this is a ${d.industry} business - use ${d.fonts.heading} for headings and ${d.fonts.body} for body text, imported from Google Fonts. Real, deliberate type hierarchy — headings should look considered, not just "bigger and bold."`
      : null,
    color: `Color: this is a ${d.industry} business - build on its industry palette${note}: primary ${c.primary} (text on it ${c.onPrimary}), secondary ${c.secondary}, accent ${c.accent} for calls to action (text on it ${c.onAccent}), background ${c.background}, body text ${c.foreground}, cards ${c.card}, muted surfaces ${c.muted}, muted text ${c.mutedForeground}, borders ${c.border}. Adapt shades to the design's own mood, but keep these hues recognizable - do not swap in a generic palette.`
  };
}

module.exports = { getIndustryDesign, designPromptLines, parseCsv };
