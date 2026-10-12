#!/usr/bin/env node
"use strict";
// Builds public/premium-looks-preview.html: the 24 curated premium looks (6 industries x 4) on one phone-friendly page, each
// shown at phone width with its premium score, so Irfan can approve them (docs/PREMIUM_PIPELINE_SPEC.md section 3.3).
// Sample words and tinted placeholder photos only: it shows layout, spacing and hierarchy, not real photography or the
// final Google fonts (this machine cannot reach either). Run: node scripts/build-premium-preview.js
const fs = require("fs");
const path = require("path");
const P = require("../lib/sections/premium");
const S = require("../lib/sections/premium-score");
const R = require("../lib/sections/render");
const H = require("../test/helpers/premium-sample");

const OUT = path.join(__dirname, "..", "public", "premium-looks-preview.html");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** A soft tinted placeholder in the palette's own colours, in place of a stock photo. */
function placeholder(palette, n) {
  const c = R.getPalette(palette).colors;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.surface}"/><stop offset="1" stop-color="${n % 2 ? c.accent : c.primary}" stop-opacity=".55"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="${300 + (n % 4) * 160}" cy="360" r="150" fill="${c.primary}" fill-opacity=".14"/></svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

async function buildAll() {
  let browser = null;
  try { browser = await require("playwright").chromium.launch(); } catch { browser = null; }
  const palettes = {};
  for (const pal of Object.keys(require("../lib/sections/premium.json").palettes)) {
    palettes[pal] = [];
    for (let i = 0; i < 4; i++) {
      const { page, look } = await H.buildLook(pal, i);
      let n = 0;
      const html = page.html.replace(/https:\/\/cdn\.pixabay\.com\/photo\/[^"']+/g, () => placeholder(pal, n++));
      const m = browser ? await S.measure(html, { browser }) : null;
      const sc = S.score(page, { look, metrics: m });
      palettes[pal].push({ id: look.id, label: look.label, score: sc.total, partial: sc.partial, parts: sc.parts, sections: page.sections.map((s) => `${s.id}.${s.variant}`).join(" "), html });
    }
  }
  if (browser) await browser.close();
  return palettes;
}

(async () => {
  const data = await buildAll();
  const tabs = Object.keys(data);
  const cards = tabs.map((pal) => `<section class="pal" id="${pal}" data-pal="${pal}"><h2>${esc(R.getPalette(pal).name)}</h2><div class="grid">${data[pal].map((l) => `<figure><figcaption><b>${esc(l.label)}</b><span class="sc ${l.score >= 70 ? "ok" : "low"}">${l.score}/100${l.partial ? " (no browser)" : ""}</span><small>${esc(l.sections)}</small></figcaption><iframe loading="lazy" title="${esc(l.id)}" sandbox="" srcdoc="${esc(l.html)}"></iframe></figure>`).join("")}</div></section>`).join("\n");
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Gurost premium looks</title>
<style>
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f4f4f5;color:#18181b}
header{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #d4d4d8;padding:10px 16px}
header h1{margin:0 0 6px;font-size:17px}header p{margin:0 0 8px;font-size:13px;color:#52525b}
nav{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}nav a{flex:none;padding:10px 14px;border:1px solid #d4d4d8;border-radius:999px;color:#18181b;text-decoration:none;font-size:14px;min-height:44px;display:flex;align-items:center}
main{padding:16px;max-width:1500px;margin:0 auto}.pal{margin:0 0 40px;scroll-margin-top:130px}.pal h2{font-size:20px;margin:0 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(375px,1fr));gap:20px}
figure{margin:0;background:#fff;border:1px solid #d4d4d8;border-radius:12px;overflow:hidden}
figcaption{padding:10px 12px;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline}figcaption small{flex-basis:100%;color:#71717a;font-size:12px}
.sc{font-size:13px;font-weight:700;padding:2px 8px;border-radius:999px}.sc.ok{background:#dcfce7;color:#14532d}.sc.low{background:#fee2e2;color:#7f1d1d}
iframe{display:block;width:100%;height:760px;border:0;border-top:1px solid #e4e4e7;background:#fff}
</style></head><body>
<header><h1>Premium looks: 24 to approve</h1><p>Sample words and tinted placeholder photos, so judge the layout, spacing and type, not the pictures. Scroll inside each phone to see the whole page.</p><nav>${tabs.map((p) => `<a href="#${p}">${esc(R.getPalette(p).name)}</a>`).join("")}</nav></header>
<main>${cards}</main></body></html>
`;
  fs.writeFileSync(OUT, page);
  console.log(`wrote ${OUT} (${(page.length / 1024 / 1024).toFixed(1)} MB), ${Object.values(data).flat().length} looks, scores ${Object.values(data).flat().map((l) => l.score).join(",")}`);
})();
