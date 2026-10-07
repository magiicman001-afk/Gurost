/**
 * Invented figures out of generated pages, in code - the model ignores the
 * prompt rule (2026-10-07 live bakery build: eight made-up prices, "Founded
 * in 2019"). UK consumer protection law covers fake prices, reviews and
 * claims, so a figure the owner never gave becomes a marked placeholder:
 *
 *   £5.50 / $450 / 450 €            -> [Add your price]
 *   Founded in 2019 / Est. 2019 / since 2019   -> [Year founded]
 *   4.9★ / 4.8/5 / 5 stars           -> [Add your rating]
 *   500+ happy customers / 98% satisfaction   -> [Add your number]
 *   20 years of experience           -> [Add your number] years of experience
 *
 * A figure is kept when it is the owner's own, found in the `allowed` texts
 * (company details, the build prompt, a Pulse instruction, the page as it was
 * before an edit): a price only if the owner wrote it as a price (£4.50), any
 * other figure if the same number appears (two or more digits, or a decimal -
 * a lone digit from an address or phone number is a coincidence, not a source). Only visible text is touched - never
 * scripts, styles, comments or attributes (links, image URLs, form values).
 * No AI.
 *
 * enforceHonestContent(html, { allowed: [text...] })
 *   -> { html, replaced: { prices, years, ratings, numbers }, total }
 */

const YEAR = String.raw`(?:1[89]\d{2}|20\d{2})`;
const NUM = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;

const RULES = [
  { key: "prices", placeholder: "[Add your price]",
    re: new RegExp(String.raw`([£$€])\s?(${NUM})(?:\s?(?:k|K)\b)?|\b(${NUM})\s?(€|EUR\b|GBP\b|USD\b)`, "g"),
    number: (m) => m[2] || m[3] },
  { key: "years", placeholder: "[Year founded]", keepWords: true,
    re: new RegExp(String.raw`\b((?:founded|established|est\.?|since|opened|open since|in business since|baking since|serving [a-z ,]{0,30}since)\s+(?:in\s+)?)(${YEAR})\b`, "gi"),
    number: (m) => m[2] },
  { key: "ratings", placeholder: "[Add your rating]",
    re: /\b([0-5](?:\.\d)?)\s?(?:\/\s?5\b|★|☆|stars?\b|out of 5\b)/gi,
    number: (m) => m[1] },
  { key: "numbers", placeholder: "[Add your number]", keepWords: true, numberFirst: true,
    re: /\b(\d{1,3}(?:,\d{3})*\+?|\d+\+?)(\s?(?:k\+?\s)?(?:happy |satisfied |loyal |returning )?(?:customers|clients|guests|reviews|members|students|visitors|orders served|families|businesses)\b)/gi,
    number: (m) => m[1].replace(/\+$/, "") },
  { key: "numbers", placeholder: "[Add your number]", keepWords: true, numberFirst: true,
    re: /\b(\d{1,3}%)(\s?(?:satisfaction|satisfied|recommend|of (?:our )?(?:customers|clients|guests)|positive|return rate|retention|success rate))/gi,
    number: (m) => m[1].replace("%", "") },
  { key: "numbers", placeholder: "[Add your number]", keepWords: true, numberFirst: true,
    re: /\b(\d{1,2}\+?)(\s?(?:years?|yrs?)\s+(?:of\s+)?(?:experience|expertise|in business|baking|serving|of service|heritage))/gi,
    number: (m) => m[1].replace(/\+$/, "") }
];

// "4.50" and "4.5" are the same figure; "1,200" is "1200".
const norm = (n) => { const x = String(n).replace(/,/g, ""); return [x, String(Number(x))]; };

// What the owner actually gave: prices written as prices, and other numbers
// of two or more digits (or with a decimal point).
function ownFigures(allowed) {
  const prices = new Set(), numbers = new Set();
  for (const raw of allowed) {
    const text = String(raw || "");
    for (const m of text.matchAll(RULES[0].re)) norm(m[2] || m[3]).forEach((n) => prices.add(n));
    for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) if (/\d{2}|\./.test(m[0])) norm(m[0]).forEach((n) => numbers.add(n));
  }
  return { prices, numbers };
}

const isOwn = (num, set) => norm(num).some((n) => set.has(n));

function cleanText(text, own, replaced) {
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.re, (...args) => {
      const m = args.slice(0, -2);
      const num = rule.number(m);
      if (!num || isOwn(num, rule.key === "prices" ? own.prices : own.numbers)) return m[0];
      replaced[rule.key]++;
      if (!rule.keepWords) return rule.placeholder;
      // Keep the words around the number: "since [Year founded]", "[Add your number] happy customers".
      return rule.numberFirst ? `${rule.placeholder}${m[2]}` : `${m[1]}${rule.placeholder}`;
    });
  }
  return out;
}

function enforceHonestContent(html, { allowed = [] } = {}) {
  const own = ownFigures(allowed);
  const replaced = { prices: 0, years: 0, ratings: 0, numbers: 0 };
  // Text between tags only; scripts, styles, comments and every tag (with its attributes) pass through untouched.
  const parts = String(html).split(/(<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<[^>]+>)/i);
  const out = parts.map((part, i) => (i % 2 === 1 ? part : cleanText(part, own, replaced))).join("");
  const total = Object.values(replaced).reduce((a, b) => a + b, 0);
  return { html: out, replaced, total };
}

// "4 invented prices and 1 founding year" - for logs and the conversation.
function describeReplaced(replaced) {
  const words = { prices: ["price", "prices"], years: ["year", "years"], ratings: ["rating", "ratings"], numbers: ["statistic", "statistics"] };
  return Object.entries(replaced).filter(([, n]) => n).map(([k, n]) => `${n} invented ${words[k][n === 1 ? 0 : 1]}`).join(", ");
}

module.exports = { enforceHonestContent, describeReplaced };
