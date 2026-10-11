"use strict";
/**
 * Fills the IMG_n slots of a section-library page with real photos.
 *
 *   const out = await assembleWithImages({ palette, content, ... }, { search });
 *   // out = everything assemble() returns, plus { filled, unfilled, credits }
 *
 * `search(query)` is the existing stock-photo step (`image-bot.js` searchImage: Pixabay, then Openverse, then Unsplash).
 * It returns { url, credit, provider } where url is already a copy stored in our own bucket, never a hotlink.
 * Pure otherwise: no network of its own, so the tests inject a fake `search`.
 *
 * Rules:
 *  - a photo that cannot be found is never left as a broken IMG_n: the slot is removed from the content and the page is
 *    assembled again, so sections that need a photo swap to their no-photo variant (hero, about) or drop the tile;
 *  - credits are returned for the project record and are NEVER written into the page (decision 2026-10-08);
 *  - only https URLs on an allowed image host are ever put into the page.
 */
const R = require("./render");
const A = require("./assemble");

const PALETTE_WORDS = { cafe: "bakery cafe food", law: "office professional", salon: "salon hair beauty", trades: "tradesperson home repair", health: "clinic wellness", tech: "modern office technology" };
const ROLE_ORDER = { hero: 0, about: 1, "product": 1, location: 2, gallery: 3, team: 3, blog: 4 };

/** Search words from a brief: plain letters only, at most 6 words, with an industry hint when the brief is very short. */
function queryFor(brief, palette) {
  const words = String(brief || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter(Boolean);
  const hint = words.length < 3 ? (PALETTE_WORDS[palette] || "").split(" ").slice(0, 2) : [];
  return [...words, ...hint].slice(0, 6).join(" ");
}

/** A copy of the content without every image slot whose value is one of the given tokens. */
function dropTokens(node, tokens) {
  if (Array.isArray(node)) return node.map((n) => dropTokens(n, tokens));
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && tokens.has(v)) continue;
      out[k] = dropTokens(v, tokens);
    }
    return out;
  }
  return node;
}

const safeUrl = (u, hosts) => {
  try {
    const x = new URL(String(u));
    return x.protocol === "https:" && hosts.some((h) => x.hostname === h || x.hostname.endsWith("." + h)) ? x.toString() : "";
  } catch {
    return "";
  }
};

async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]).catch(() => null);
      }
    })
  );
  return out;
}

/**
 * @param {object} input   same input as assemble()
 * @param {{ search: Function, maxImages?: number, concurrency?: number, hosts?: string[] }} o
 */
async function assembleWithImages(input, o = {}) {
  if (typeof o.search !== "function") throw new Error("assembleWithImages needs a search function");
  const hosts = o.hosts || R.DEFAULT_IMAGE_HOSTS;
  const maxImages = o.maxImages || 12;
  let page = A.assemble(input);

  // one lookup per distinct token; the most visible pictures first, and any beyond the cap are treated as not found
  const wanted = [];
  for (const im of page.images) if (!wanted.some((w) => w.token === im.token)) wanted.push(im);
  wanted.sort((a, b) => (ROLE_ORDER[a.role] ?? 5) - (ROLE_ORDER[b.role] ?? 5));
  const lookups = wanted.slice(0, maxImages);
  const results = await pool(lookups, o.concurrency || 4, (im) => o.search(queryFor(im.brief, page.palette)));

  const urls = new Map();
  const credits = [];
  lookups.forEach((im, i) => {
    const r = results[i];
    const url = r && safeUrl(r.url, hosts);
    if (url) {
      urls.set(im.token, url);
      if (r.credit) credits.push(r.credit);
    }
  });
  const missing = wanted.filter((im) => !urls.has(im.token)).map((im) => im.token);

  if (missing.length) {
    // assemble again without the photos we could not find, so variants swap instead of showing a broken image
    page = A.assemble({ ...input, content: dropTokens(input.content || {}, new Set(missing)) });
  }
  const fill = (h) => {
    for (const [token, url] of urls) h = h.replace(new RegExp(`src="${token}"`, "g"), () => `src="${R.esc(url)}"`);
    return h;
  };
  const html = fill(page.html);
  const parts = page.parts.map((p) => ({ ...p, html: fill(p.html) })); // the quality gate checks the parts, so they carry the photos too
  // anything still tokenised (e.g. a slot the second pass produced) must not ship as a broken image
  const leftovers = [...html.matchAll(/\ssrc="(IMG_\d+)"/g)].map((m) => m[1]);
  if (leftovers.length) page.warnings.push(`unfilled image tokens: ${[...new Set(leftovers)].join(", ")}`);

  return { ...page, html, parts, images: A.collectImages(html), filled: [...urls.keys()], unfilled: missing, credits: [...new Set(credits)] };
}

module.exports = { assembleWithImages, queryFor, dropTokens };
