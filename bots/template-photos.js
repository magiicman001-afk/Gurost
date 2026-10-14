"use strict";
/**
 * Template photos: turns the picture slots of a filled template into real photographs.
 *
 * The premium templates ship with drawn placeholder art so they always render. Every picture frame is tagged:
 *   data-gurost-image   a full photographic brief (subject, light, lens, mood) - what an AI model is asked to make
 *   data-gurost-search  a short phrase for stock-photo search
 *   data-gurost-image-role   featured | secondary
 * and the hero loop can carry data-gurost-video (a stock-video search phrase).
 *
 * The customer picks how the pictures are made (mode):
 *   stock  real photographs from Pixabay / Openverse / Unsplash (free, the default)
 *   ai     generated photographs (FLUX through fal.ai), falling back to a stock photo, then to the drawn art
 *   mine   nothing is replaced here; the customer uploads their own (the slots are returned so the page can ask)
 *   art    keep the drawn art as it is
 * A slot that cannot be filled keeps the art it had: a page is never left with a broken picture.
 * No AI video is made here (it is slow and paid); the hero loop becomes a stock clip in stock and ai modes.
 *
 *   const { files, report } = await fillTemplatePhotos(files, { mode: "stock", tier: "free" });
 */

const MODES = [
  { id: "stock", label: "Real photos", note: "Free stock photographs, chosen to match your business. Recommended.", default: true },
  { id: "ai", label: "AI-generated photos", note: "Photographs made for your business by AI. Paid plans get the best quality." },
  { id: "mine", label: "My own photos", note: "You upload your own pictures after the site is built." },
];
const MAX_SLOTS = 40; // a safety cap on one site
const MAX_AI = 8; // AI images cost money: the most important ones only, the rest come from stock
const POOL = 4; // requests at once

const decode = (s) => String(s || "").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const encode = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (tag, name) => { const m = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag); return m ? decode(m[1]) : ""; };
const setAttr = (tag, name, value) => {
  const re = new RegExp(`(\\s${name}\\s*=\\s*)"[^"]*"`, "i");
  return re.test(tag) ? tag.replace(re, `$1"${encode(value)}"`) : tag.replace(/\s*\/?>$/, (end) => ` ${name}="${encode(value)}"${end}`);
};

/** Every picture slot in a set of pages: [{ file, tag, brief, search, role }] (already-filled slots are skipped). */
function findSlots(files) {
  const out = [];
  for (const [file, body] of Object.entries(files)) {
    if (typeof body !== "string" || !/\.html$/.test(file)) continue;
    for (const m of body.matchAll(/<img\b[^>]*\sdata-gurost-image="[^"]*"[^>]*>/gi)) {
      const tag = m[0];
      if (attr(tag, "data-gurost-filled")) continue;
      out.push({ file, tag, brief: attr(tag, "data-gurost-image"), search: attr(tag, "data-gurost-search"), role: (attr(tag, "data-gurost-image-role") || "secondary").toLowerCase() });
    }
  }
  return out;
}

function findVideos(files) {
  const out = [];
  for (const [file, body] of Object.entries(files)) {
    if (typeof body !== "string" || !/\.html$/.test(file)) continue;
    for (const m of body.matchAll(/<video\b[^>]*\sdata-gurost-video="[^"]*"[^>]*>[\s\S]*?<\/video>/gi)) {
      if (!attr(m[0].slice(0, m[0].indexOf(">") + 1), "data-gurost-filled")) out.push({ file, block: m[0], query: attr(m[0].slice(0, m[0].indexOf(">") + 1), "data-gurost-video") });
    }
  }
  return out;
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; results[i] = await fn(items[i], i).catch((e) => ({ error: e })); }
  }));
  return results;
}

/**
 * @param {Object<string,string>} files  page name -> html
 * @param {{mode?:string, tier?:string, onProgress?:Function, deps?:object}} opts
 * @returns {Promise<{files:Object, report:Object}>}
 */
async function fillTemplatePhotos(files, { mode = "stock", tier = "free", onProgress = () => {}, deps = {} } = {}) {
  const bot = deps.imageBot || require("../image-bot");
  const slots = findSlots(files);
  const videos = findVideos(files);
  const report = { mode, slots: slots.length, stock: 0, ai: 0, art: 0, videos: 0, failed: 0, cost: 0 };
  if (!["stock", "ai"].includes(mode) || (!slots.length && !videos.length)) {
    report.art = slots.length;
    return { files, report, pending: mode === "mine" ? slots.map(({ brief, search, role }) => ({ brief, search, role })) : [] };
  }

  // One photo per distinct brief: the same animal or loaf shown on two pages is fetched once.
  const unique = [...new Map(slots.map((s) => [s.brief, s])).values()].slice(0, MAX_SLOTS);
  const rank = { featured: 0, secondary: 1 };
  const aiWanted = mode === "ai" && bot.falAvailable && bot.falAvailable()
    ? new Set([...unique].sort((a, b) => (rank[a.role] ?? 2) - (rank[b.role] ?? 2)).slice(0, MAX_AI).map((s) => s.brief))
    : new Set();
  onProgress(mode === "ai" ? "Making photographs for your pictures…" : "Finding real photographs for your pictures…");

  const found = new Map();
  await pool(unique, POOL, async (s) => {
    if (aiWanted.has(s.brief)) {
      try {
        const model = tier === "paid" && s.role === "featured" ? "dev" : "schnell";
        const r = await bot.generateFalImageUrl(s.brief, { model, aspectRatio: "4:3" });
        found.set(s.brief, { url: r.url, source: "ai" }); report.cost += r.cost || 0; return;
      } catch (e) { console.error("[template-photos] AI picture failed, trying stock:", e.message); }
    }
    try {
      const r = await bot.searchImage(s.search || s.brief);
      if (r && r.url) found.set(s.brief, { url: r.url, source: "stock" });
    } catch (e) { console.error("[template-photos] stock search failed:", e.message); }
  });

  const out = { ...files };
  for (const s of slots) {
    const hit = found.get(s.brief);
    if (!hit) { report.art++; continue; }
    let tag = setAttr(s.tag, "src", hit.url);
    tag = setAttr(tag, "data-gurost-filled", hit.source);
    out[s.file] = out[s.file].replace(s.tag, () => tag);
    report[hit.source]++;
  }
  report.failed = slots.length - report.stock - report.ai - report.art;

  // The hero loop: a real stock clip, if one is found. The drawn loop stays otherwise.
  for (const v of videos) {
    let clip = null;
    try { clip = await bot.searchVideo(v.query); } catch (e) { console.error("[template-photos] stock video failed:", e.message); }
    if (!clip || !clip.url) continue;
    let block = v.block.replace(/<source\b[^>]*>/gi, "");
    block = block.replace(/(<video\b[^>]*>)/i, (open) => {
      let o = setAttr(open, "data-gurost-filled", "stock");
      if (clip.poster) o = setAttr(o, "poster", clip.poster);
      return `${o}<source src="${encode(clip.url)}" type="video/mp4">`;
    });
    out[v.file] = out[v.file].replace(v.block, () => block);
    report.videos++;
  }
  report.cost = Math.round(report.cost * 1000) / 1000;
  return { files: out, report, pending: [] };
}

module.exports = { fillTemplatePhotos, findSlots, findVideos, MODES };
