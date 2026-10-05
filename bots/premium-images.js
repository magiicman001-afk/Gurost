/**
 * Premium images for the design a paid user keeps.
 *
 * The 4 designs are built with Pixabay first (fast, free); premium
 * generation happens once, on "Use this design", for paid plans only:
 *   hero                          -> FLUX Pro (fal.ai, ~$0.04)
 *   up to 3 key images            -> FLUX Dev (~$0.025 each)
 *     (featured first, then secondary)
 * Each image is regenerated from its own brief - the data-gurost-image
 * attribute the design wrote on the <img>, which survives the build.
 * Decorative images (textures, avatars) keep their stock photo.
 * An image that fails keeps the one it had; nothing is ever left broken.
 */

const imageBot = require("../image-bot");

const MAX_SECTION_UPGRADES = 3;

const decode = (s) => String(s || "").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag);
  return m ? decode(m[2]) : "";
};

// The <img> tags worth upgrading, most important first.
function findUpgradeTargets(html) {
  const imgs = [...String(html).matchAll(/<img\b[^>]*>/gi)]
    .map((m) => ({ tag: m[0], role: attr(m[0], "data-gurost-image-role").toLowerCase(), brief: attr(m[0], "data-gurost-image"), src: attr(m[0], "src") }))
    .filter((i) => i.brief && i.src);
  const hero = imgs.filter((i) => i.role === "hero").slice(0, 1);
  const sections = [...imgs.filter((i) => i.role === "featured"), ...imgs.filter((i) => i.role === "secondary")].slice(0, MAX_SECTION_UPGRADES);
  return [
    ...hero.map((i) => ({ ...i, model: "pro", aspectRatio: "16:9" })),
    ...sections.map((i) => ({ ...i, model: "dev", aspectRatio: "4:3" }))
  ];
}

/**
 * onProgress(message) narrates for the bot conversation.
 * Returns { html, upgraded: [{ role, model, cost }], failed, cost }.
 */
async function upgradeImages(html, { onProgress = () => {} } = {}) {
  const targets = findUpgradeTargets(html);
  if (!targets.length) return { html, upgraded: [], failed: 0, cost: 0 };
  const hero = targets.some((t) => t.model === "pro");
  const sections = targets.filter((t) => t.model === "dev").length;
  onProgress(`Upgrading ${[hero && "the hero image with FLUX Pro", sections && `${sections} section image${sections === 1 ? "" : "s"} with FLUX Dev`].filter(Boolean).join(" and ")}…`);

  const results = await Promise.allSettled(targets.map((t) => imageBot.generateFalImageUrl(t.brief, { model: t.model, aspectRatio: t.aspectRatio })));
  let out = String(html);
  const upgraded = [];
  let failed = 0;
  targets.forEach((t, i) => {
    const r = results[i];
    if (r.status !== "fulfilled") {
      failed++;
      console.error(`[premium-images] ${t.role} image kept its stock photo:`, r.reason?.message);
      return;
    }
    // Swap only this tag's src (same tag text, so other images are untouched).
    const newTag = t.tag.replace(/\bsrc\s*=\s*(["'])[\s\S]*?\1/i, `src="${r.value.url}"`);
    out = out.replace(t.tag, newTag);
    upgraded.push({ role: t.role, model: r.value.model, cost: r.value.cost });
  });
  const cost = Math.round(upgraded.reduce((sum, u) => sum + u.cost, 0) * 1000) / 1000;
  return { html: out, upgraded, failed, cost };
}

module.exports = { upgradeImages, findUpgradeTargets, MAX_SECTION_UPGRADES };
