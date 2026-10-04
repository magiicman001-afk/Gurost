/**
 * "Use this design" - finalises the picked design in milliseconds, no AI,
 * no rebuild. Adds what a launch-ready page needs and the design left
 * out; anything the design already has is kept as it is:
 *   - <meta name="description">
 *   - Open Graph + Twitter card tags (title, description, hero image)
 *   - schema.org LocalBusiness JSON-LD from the user's business details
 * Returns { html, added: [human-readable list of what was added] }.
 */

const { SOCIAL_FIELDS } = require("./business-info");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const ENTITIES = { amp: "&", quot: '"', apos: "'", "#39": "'", lt: "<", gt: ">", nbsp: " ", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
const textOf = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&([a-z]+|#\d+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

const has = (html, re) => re.test(html);

function finalizeSite(html, { businessInfo = null, summary = "" } = {}) {
  let page = String(html);
  const head = [];
  const added = [];
  const title = textOf((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(page) || [])[1]) || textOf((/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(page) || [])[1]);
  const body = page.slice(page.search(/<body\b/i) + 1);

  // Description: the design's own one-line summary, else the hero's first paragraph.
  let description = textOf((/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(page) || [])[1]);
  if (!description) {
    description = clip(textOf(summary) || textOf((/<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(body) || [])[1]), 160);
    if (description) { head.push(`<meta name="description" content="${esc(description)}">`); added.push("meta description"); }
  }

  // Each tag on its own: a design that already set some keeps them, unduplicated.
  const og = (prop) => has(page, new RegExp(`<meta\\s+property=["']og:${prop}["']`, "i"));
  const image = (/<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["']/i.exec(body) || /\bposter=["'](https:\/\/[^"']+)["']/i.exec(body) || [])[1];
  const ogTags = [];
  if (!og("type")) ogTags.push(`<meta property="og:type" content="website">`);
  if (title && !og("title")) ogTags.push(`<meta property="og:title" content="${esc(title)}">`);
  if (description && !og("description")) ogTags.push(`<meta property="og:description" content="${esc(description)}">`);
  const addedImage = image && !og("image");
  if (addedImage) ogTags.push(`<meta property="og:image" content="${esc(image)}">`);
  if (ogTags.length) {
    if (!has(page, /<meta\s+name=["']twitter:card["']/i)) ogTags.push(`<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`);
    head.push(...ogTags);
    added.push(addedImage ? "Open Graph tags with the hero image" : "Open Graph tags");
  }

  if (businessInfo && !has(page, /application\/ld\+json/i)) {
    const sameAs = SOCIAL_FIELDS.map((k) => businessInfo[k]).filter(Boolean);
    const data = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: businessInfo.name || title || undefined,
      description: description || undefined,
      telephone: businessInfo.phone,
      email: businessInfo.email,
      address: businessInfo.address,
      url: businessInfo.website,
      sameAs: sameAs.length ? sameAs : undefined
    };
    // "<" escaped so text can never close the script tag.
    head.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);
    added.push("LocalBusiness schema");
  }

  if (head.length) {
    const block = `\n${head.join("\n")}\n`;
    page = /<\/head\s*>/i.test(page) ? page.replace(/<\/head\s*>/i, `${block}</head>`) : block + page;
  }
  return { html: page, added };
}

module.exports = { finalizeSite };
