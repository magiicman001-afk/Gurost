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
  dog: "pet", dogs: "pet", cat: "pet", cats: "pet", puppy: "pet", grooming: "pet", groomer: "pet"
};

function expand(text) {
  const words = String(text).toLowerCase().split(/[^a-z0-9]+/);
  const extra = words.map((w) => SYNONYMS[w]).filter(Boolean);
  return `${String(text).toLowerCase()} ${extra.join(" ")}`;
}

// Plural -> singular so "cafes"/"cafe", "bakeries"/"bakery" and
// "clinics"/"clinic" compare equal.
function stem(t) {
  if (t.length > 4 && t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (/(ss|x|z|ch|sh)es$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

function tokens(text) {
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t)).map(stem);
}

function containsPhrase(haystack, phrase) {
  const p = phrase.toLowerCase().trim();
  if (!p || STOPWORDS.has(p)) return false;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[-\s]+/g, "[-\\s]+");
  return new RegExp(`\\b${escaped}(s|es)?\\b`).test(haystack);
}

// Best industry row for the prompt: an exact keyword phrase counts 3,
// a word from the industry's own name counts 1. Ties keep file order.
function matchIndustry(text) {
  const haystack = expand(text);
  const promptTokens = new Set(tokens(haystack));
  let best = null;
  let bestScore = 0;
  for (const row of load().products) {
    let score = 0;
    for (const kw of row.Keywords.split(",")) if (containsPhrase(haystack, kw)) score += 3;
    for (const t of tokens(row["Product Type"])) if (promptTokens.has(t)) score += 1;
    if (score > bestScore) { best = row; bestScore = score; }
  }
  return best;
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
