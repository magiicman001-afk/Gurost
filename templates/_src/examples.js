"use strict";
/**
 * Example content as slots (Track 2b, Irfan's honest-content rule).
 *
 * A template ships with an example business baked into its words: menu items and prices, reviews, an owner and a team, FAQ
 * answers, "Gas Safe registered", "12 month guarantee", "24 hour emergencies". None of that is true of a customer's business.
 * After a style is generated, every such string in the HTML is swapped for a token `{{html:ex_<hash>}}`, and the original is kept
 * in templates/_examples/<pack>.json. Then:
 *   - the picker's preview fills the tokens with the original text, so a preview looks exactly as before;
 *   - a customer's own site leaves them empty, and each shows an "[Add ... here]" marker (lib/template-site.js).
 *
 * What counts as example content:
 *   ALWAYS  : the menu items (name, price, description, the category blurb), reviews, the owner/team, plans, FAQ, areas served,
 *             the timetable, the sanctuary's day and events: every string inside them.
 *   CLAIMS  : any other string in the pack's copy that makes a factual or commercial claim (a number, a price, "free",
 *             "guarantee", "certified", "24 hour", "never", ...). See isClaim().
 * The rest is page chrome ("Home", "Pre-order", headings) and stays as it is. test/example-slots.test.js lints every committed
 * page so a claim cannot slip through.
 */
const crypto = require("crypto");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Pack keys whose whole content is example business content.
const ALWAYS = new Set(["reviews", "chef", "sup", "plans", "faq", "areas", "coaches", "week", "planRows", "day", "events", "ways"]);
// Keys that are not words on the page.
const SKIP = new Set(["id", "art", "hint", "tagList", "star", "alt", "href", "cta1Href", "cta2Href", "query", "brief", "mediaDir", "photo", "videoQuery", "styles", "media", "css", "form", "ldType", "ldExtra", "icon", "kind", "per"]);

const strip = (s) => String(s).replace(/\{\{[^}]*\}\}/g, " ").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, (m) => (/^&(pound|euro|dollar|percnt);$/i.test(m) ? m : " "));
const CLAIM = new RegExp([
  "&pound;|&euro;|£|\\$|€|&percnt;|%",
  "\\d",
  "\\b(?:free|guarantee[ds]?|guaranteed|warranty|warranties|certified|certificate|accredited|registered|regulated|insured|insurance|licen[cs]ed|licen[cs]e|awards?|award-winning|best|finest|leading|top|trusted|rated|qualified|protected|fixed|unlimited|lowest|cheapest|expert|experts|specialists?|official|fully|safe|safely)\\b",
  "\\b(?:emergency|emergencies|24\\s?/\\s?7|same[- ]day|next[- ]day|within the hour|day and night|any time|round the clock|money[- ]back|refund|no win|no obligation|no hidden|no surprises|no fuss|no contract)\\b",
  "\\b(?:never|always|ever|every|all our|each and every|100)\\b",
  "\\b(?:sourced|locally|local|handmade|hand-made|hand-picked|in-house|organic|stoneground|family-run|family run|independent|established|founded|decades?|generations?|experienced|professional|professionally|skilled|trained|vetted|approved|recommended|proven|reliable|honest|genuine|authentic|bespoke|tailored|dedicated)\\b",
  "\\b(?:eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|dozens?|millions?)(?:-\\w+)?\\b",
].join("|"), "i");
const isClaim = (s) => CLAIM.test(strip(s));
const isPrice = (s) => /^(?:from\s+)?(?:&pound;|£|\$|€)\s?[\d,.]+/i.test(String(s).trim());

/** Words that belong to the example business itself: its name, town, owner and street, as written into the pack's demo details. */
function demoWords(demo) {
  const out = [];
  for (const k of ["business_name", "city", "owner_name", "address_line1", "address_line2", "email"]) {
    const v = demo && demo[k];
    if (typeof v === "string") for (const w of [v, ...v.split(/[,]\s*/)]) if (w.trim().length >= 4) out.push(w.trim());
  }
  return [...new Set(out)];
}
const mentions = (s, words) => words.some((w) => strip(s).toLowerCase().includes(w.toLowerCase()));

/** Every example string of a pack, with a role ("price", "name", "desc" or "text") that picks the marker's wording. */
function leaves(pack) {
  const words = demoWords(pack.demo);
  const out = new Map();
  const chrome = new Set();
  const forced = new Set(); // example items and statistics are blanked even where the same words also appear as a label elsewhere
  const add = (s, role, always, force) => {
    if (typeof s !== "string" || s.length < 3) return;
    if (/^(\{\{[^}]*\}\}\s*)+$/.test(s.trim())) return; // only tokens
    if (/^(#|\/|https?:|mailto:|tel:)/i.test(s) || /^[\w-]+\.html(#[\w-]*)?$/.test(s)) return; // a link, not words
    if (always && (force || (role && role !== "text"))) forced.add(s);
    if (always || isClaim(s) || mentions(s, words)) out.set(s, isPrice(s) ? "price" : role || "text");
    else chrome.add(s);
  };
  const walk = (node, always, role) => {
    if (typeof node === "string") return add(node, role, always);
    if (Array.isArray(node)) return node.forEach((x) => walk(x, always, role));
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node)) {
      if (SKIP.has(k)) continue;
      const r = k === "n" ? "name" : ["d", "blurb", "bio", "text", "q", "blurb"].includes(k) ? "desc" : k === "meta" ? "price" : role;
      walk(v, always || ALWAYS.has(k), r);
    }
  };
  for (const c of pack.cats || []) {
    if (c.name) add(c.name, "text", false); // a category name is page chrome unless it makes a claim ("Emergency call-outs")
    if (c.blurb) add(c.blurb, "desc", true);
    for (const i of c.items || []) {
      for (const k of ["n", "meta", "d"]) add(i[k], k === "n" ? "name" : k === "meta" ? "price" : "desc", true);
      for (const t of i.tags || []) add(t, "text", false);
    }
  }
  const rest = { ...pack };
  for (const k of ["cats", "demo", "label", ...SKIP]) delete rest[k];
  walk(rest, false); // the whole pack: copy, nav, order, seo, steps, ... (claims only, except the containers named in ALWAYS)
  // Stat blocks: ["36", "h", "slow rise"]. If the number is the customer's own token it stays; if it is an example, the whole entry is.
  const stats = (n) => {
    if (Array.isArray(n) && n.length >= 2 && n.every((x) => typeof x === "string")) {
      if (!/^\{\{/.test(n[0])) for (const x of n) add(x, "text", true, true);
    } else if (Array.isArray(n)) n.forEach(stats);
    else if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) { if (["stats", "facts"].includes(k)) stats(v); else stats(v); }
  };
  for (const l of Object.values(pack.copy || {})) { for (const k of ["stats", "facts"]) if (l && l[k]) stats(l[k]); }
  for (const c of chrome) if (!forced.has(c)) out.delete(c); // a string that is also page chrome somewhere is not safe to blank
  return out;
}

const token = (variant) => "ex_" + crypto.createHash("sha1").update(variant).digest("hex").slice(0, 10);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Swaps every example string in the generated HTML for a token. Short strings must sit alone in their tag or attribute;
 * longer ones only need to not sit inside a word. Longest first, so a price inside a longer line is not cut out of it.
 * @returns {{ files, table }} table: { token: { h: original text as it was in the page, r: role } }
 */
function tokenise(files, pack) {
  const list = [...leaves(pack)].sort((a, b) => b[0].length - a[0].length);
  const table = {};
  const out = {};
  for (const [name, body] of Object.entries(files)) {
    if (!/\.html$/.test(name) || typeof body !== "string") { out[name] = body; continue; }
    let html = body;
    // Counting numbers ("36h", "100%") are an element whose text a script animates: the whole element is the example, unless the number is the customer's own token.
    html = html.replace(/<(\w+)([^>]*?)( data-count="\d[\d.,]*"(?: data-suffix="[^"]*")?)([^>]*)>([^<]*)<\/\1>/g, (_m, tag, pre, attrs, post, inner) => {
      const a = token("attr:" + attrs), s = token("text:" + inner);
      table[a] = { h: attrs, r: "attr" };
      table[s] = { h: inner, r: "text" };
      return `<${tag}${pre}{{html:${a}}}${post}>{{html:${s}}}</${tag}>`;
    });
    for (const [leaf, role] of list) {
      for (const form of new Set([leaf, esc(leaf)])) {
        const edge = form.length < 14 ? ["(?<=[>\"'])", "(?=[<\"'])"] : ["(?<![A-Za-z0-9])", "(?![A-Za-z0-9])"];
        html = html.replace(new RegExp(edge[0] + reEsc(form) + edge[1], "g"), () => {
          const t = token(form);
          table[t] = { h: form, r: role };
          return `{{html:${t}}}`;
        });
      }
    }
    out[name] = html;
  }
  return { files: out, table };
}

/** The lint behind test/example-slots.test.js: claims left in the visible text and attributes of a page. */
function leftovers(html, demo) {
  const words = demoWords(demo);
  const h = String(html).replace(/<(script|style|svg|dialog)[\s\S]*?<\/\1>/g, " ");
  const found = new Set();
  const texts = h.split(/<[^>]*>/);
  for (const m of h.matchAll(/\s(?:alt|title|aria-label|placeholder)="([^"]*)"/g)) texts.push(m[1]);
  for (const m of h.matchAll(/<meta[^>]+(?:name="description"|property="og:(?:title|description)")[^>]*content="([^"]*)"/g)) texts.push(m[1]);
  for (const t of texts) {
    const clean = t.replace(/\{\{[^}]*\}\}/g, " ").trim();
    if (clean.length > 2 && (isClaim(clean) || mentions(clean, words))) found.add(clean.replace(/\s+/g, " ").slice(0, 100));
  }
  return [...found];
}

/** { token: original text } for filling a preview. */
const exampleValues = (table) => Object.fromEntries(Object.entries(table || {}).map(([k, v]) => [k, v.h]));

module.exports = { exampleValues, tokenise, leaves, leftovers, isClaim, isPrice, esc };
