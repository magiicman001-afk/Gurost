"use strict";
// Run: node --test test/bakery-templates.test.js
// The bakery template presets in templates/bakery/: every page is complete, links and files resolve, nothing loads from outside,
// filling a business's details leaves no gaps, and the committed output matches what the generators in templates/_src produce.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { fillTemplate, DEMO } = require("../templates/_src/fill");

const ROOT = path.join(__dirname, "..", "templates", "bakery");
const STYLES = ["minimal", "bold", "editorial", "atelier", "gallery", "motion"];
const PAGES = { minimal: 6, bold: 6, editorial: 6, atelier: 2, gallery: 2, motion: 2 };
const html = (s) => fs.readdirSync(path.join(ROOT, s)).filter((f) => f.endsWith(".html"));

test("every style has the expected pages, a stylesheet and a script", () => {
  for (const s of STYLES) {
    assert.strictEqual(html(s).length, PAGES[s], `${s} page count`);
    for (const f of ["index.html", "menu.html", "assets/style.css", "assets/site.js"]) assert.ok(fs.existsSync(path.join(ROOT, s, f)), `${s}/${f}`);
  }
});

test("local links and assets exist, and nothing loads from another site", () => {
  for (const s of STYLES) for (const page of html(s)) {
    const h = fs.readFileSync(path.join(ROOT, s, page), "utf8");
    for (const m of h.matchAll(/(?:src|href|poster)="([^"#][^"]*)"/g)) {
      const u = m[1];
      if (/^(https?:|mailto:|tel:)/.test(u) || /^\{\{[a-z_]+\}\}$/.test(u)) { assert.ok(!/\.(js|css|png|jpe?g|webp|mp4|webm|woff2?|ttf)(\?|$)/.test(u) || /^\{\{/.test(u), `${s}/${page} loads ${u}`); continue; }
      assert.ok(fs.existsSync(path.join(ROOT, s, u.split("#")[0].split("?")[0])), `${s}/${page} missing ${u}`);
    }
    assert.strictEqual((h.match(/<h1[ >]/g) || []).length, 1, `${s}/${page} should have one h1`);
  }
});

test("filling the sample details leaves no empty token (the form address is set by the platform)", () => {
  for (const s of STYLES) {
    const files = {};
    for (const p of html(s)) files[p] = fs.readFileSync(path.join(ROOT, s, p), "utf8");
    const r = fillTemplate(files, DEMO);
    assert.deepStrictEqual(r.missing, ["form_endpoint"], s);
    for (const body of Object.values(r.files)) assert.ok(!/\{\{/.test(body), `${s} unfilled token`);
  }
});

test("premium plus styles: a video with a poster, picture hints and the legal pop-ups", () => {
  for (const s of ["atelier", "gallery", "motion"]) {
    const h = fs.readFileSync(path.join(ROOT, s, "index.html"), "utf8");
    assert.match(h, /<video[^>]*data-hero-video[^>]*poster=/, `${s} video`);
    assert.ok((h.match(/data-gurost-image=/g) || []).length >= 4, `${s} picture hints`);
    assert.match(h, /id="legal-privacy"/); assert.match(h, /id="legal-terms"/);
    assert.ok(fs.existsSync(path.join(ROOT, s, "assets", "video", `${s}-hero.mp4`)) && fs.existsSync(path.join(ROOT, s, "assets", "video", `${s}-hero.webm`)));
    assert.ok(fs.statSync(path.join(ROOT, s, "assets", "video", `${s}-hero.mp4`)).size < 2 * 1024 * 1024, `${s} video under 2 MB`);
  }
});

test("the committed pages match the generators", () => {
  for (const s of STYLES) {
    const b = require(`../templates/_src/${s}`).build();
    for (const [p, body] of Object.entries(b.files)) {
      if (typeof body !== "string") continue;
      const want = body.replace(/\{\{theme_color\}\}/g, b.themeColor);
      assert.strictEqual(fs.readFileSync(path.join(ROOT, s, p), "utf8"), want, `${s}/${p} is out of date: run node scripts/build-bakery-templates.js`);
    }
  }
});
