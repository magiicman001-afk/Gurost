"use strict";
// Run: node --test test/templates.test.js
// The template presets in templates/<industry>/<style>/ (one pack per industry in templates/_src/packs): every page is complete, links and files resolve, nothing loads from outside,
// filling a business's details leaves no gaps, and the committed output matches what the generators in templates/_src produce.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { fillTemplate } = require("../templates/_src/fill");

const PACK_DIR = path.join(__dirname, "..", "templates", "_src", "packs");
const PACKS = fs.readdirSync(PACK_DIR).filter((f) => f.endsWith(".js")).map((f) => require(path.join(PACK_DIR, f)));
const PAGES = { minimal: 6, bold: 6, editorial: 6, atelier: 2, gallery: 2, motion: 2, linen: 2, split: 2, journal: 2, market: 2, studio: 2, daylight: 2, hearth: 2, kindred: 2, stories: 2, commons: 2, gazette: 2, wildkind: 2, letter: 2, aura: 2, boudoir: 2, swatch: 2, booker: 2, reel: 2, pulse: 2, timetable: 2, tiers: 2, matcher: 2, interval: 2, cellar: 2, smokehouse: 2, trattoria: 2, cocktail: 2, tasting: 2, sparks: 2, pipeworks: 2, warmth: 2, quoter: 2, vanline: 2, listings: 2, mortgage: 2, skyline: 2, valuer: 2, tour: 2 };
const PLUS = ["atelier", "gallery", "motion", "linen", "split", "journal", "market", "studio", "daylight", "hearth", "kindred", "stories", "commons", "gazette", "wildkind", "letter", "aura", "boudoir", "swatch", "booker", "reel", "pulse", "timetable", "tiers", "matcher", "interval", "cellar", "smokehouse", "trattoria", "cocktail", "tasting", "sparks", "pipeworks", "warmth", "quoter", "vanline", "listings", "mortgage", "skyline", "valuer", "tour"]; // premium plus: video, hints, pop-ups
const NO_VIDEO = ["kindred", "gazette", "wildkind", "letter", "aura", "boudoir", "swatch", "booker", "reel", "pulse", "timetable", "tiers", "matcher", "interval", "cellar", "smokehouse", "trattoria", "cocktail", "tasting", "sparks", "pipeworks", "warmth", "quoter", "vanline", "listings", "mortgage", "skyline", "valuer", "tour"]; // photo-led layouts with no hero loop
const CORE = ["atelier", "gallery", "motion"]; // every industry must have at least these
const each = (fn) => { for (const pack of PACKS) for (const s of pack.styles) fn(pack, s, path.join(__dirname, "..", "templates", pack.id)); };
const html = (root, s) => fs.readdirSync(path.join(root, s)).filter((f) => f.endsWith(".html"));

test("every pack has at least the bakery's three premium plus styles", () => {
  assert.ok(PACKS.length >= 2);
  for (const pack of PACKS) for (const s of CORE) assert.ok(pack.styles.includes(s), `${pack.id} ${s}`);
});

test("every style has the expected pages, a stylesheet and a script", () => {
  each((pack, s, root) => {
    assert.strictEqual(html(root, s).length, PAGES[s], `${pack.id}/${s} page count`);
    for (const f of ["index.html", "menu.html", "assets/style.css", "assets/site.js"]) assert.ok(fs.existsSync(path.join(root, s, f)), `${pack.id}/${s}/${f}`);
  });
});

test("local links and assets exist, and nothing loads from another site", () => {
  each((pack, s, root) => {
    for (const page of html(root, s)) {
      const h = fs.readFileSync(path.join(root, s, page), "utf8");
      for (const m of h.matchAll(/(?:src|href|poster)="([^"#][^"]*)"/g)) {
        const u = m[1];
        if (/^(https?:|mailto:|tel:)/.test(u) || /^\{\{[a-z_]+\}\}$/.test(u)) { assert.ok(!/\.(js|css|png|jpe?g|webp|mp4|webm|woff2?|ttf)(\?|$)/.test(u) || /^\{\{/.test(u), `${pack.id}/${s}/${page} loads ${u}`); continue; }
        assert.ok(fs.existsSync(path.join(root, s, u.split("#")[0].split("?")[0])), `${pack.id}/${s}/${page} missing ${u}`);
      }
      assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, `${pack.id}/${s}/${page} should have one h1`);
    }
  });
});

test("filling the sample details leaves no empty token (the form address is set by the platform)", () => {
  each((pack, s, root) => {
    const files = {};
    for (const p of html(root, s)) files[p] = fs.readFileSync(path.join(root, s, p), "utf8");
    const r = fillTemplate(files, pack.demo);
    assert.deepStrictEqual(r.missing, ["form_endpoint"], `${pack.id}/${s}`);
    for (const body of Object.values(r.files)) assert.ok(!/\{\{/.test(body), `${pack.id}/${s} unfilled token`);
  });
});

test("premium plus styles: a video with a poster, picture hints and the legal pop-ups", () => {
  each((pack, s, root) => {
    if (!PLUS.includes(s)) return;
    const h = fs.readFileSync(path.join(root, s, "index.html"), "utf8");
    if (!NO_VIDEO.includes(s)) assert.match(h, /<video[^>]*data-hero-video[^>]*poster=/, `${pack.id}/${s} video`);
    assert.ok((h.match(/data-gurost-image=/g) || []).length >= 4, `${pack.id}/${s} picture hints`);
    assert.match(h, /id="legal-privacy"/); assert.match(h, /id="legal-terms"/);
    if (NO_VIDEO.includes(s)) return;
    for (const ext of ["mp4", "webm"]) assert.ok(fs.existsSync(path.join(root, s, "assets", "video", `${s}-hero.${ext}`)), `${pack.id}/${s} ${ext}`);
    assert.ok(fs.statSync(path.join(root, s, "assets", "video", `${s}-hero.mp4`)).size < 2 * 1024 * 1024, `${pack.id}/${s} video under 2 MB`);
  });
});

test("the committed pages match the generators", () => {
  each((pack, s, root) => {
    const b = require(`../templates/_src/${s}`).build(pack);
    for (const [p, body] of Object.entries(b.files)) {
      if (typeof body !== "string") continue;
      const want = body.replace(/\{\{theme_color\}\}/g, b.themeColor);
      assert.strictEqual(fs.readFileSync(path.join(root, s, p), "utf8"), want, `${pack.id}/${s}/${p} is out of date: run node scripts/build-templates.js`);
    }
  });
});
