"use strict";
/**
 * Builds the bakery template presets from templates/_src into templates/bakery/<style>/ (tokenised, ready to fill), and with
 * --demo <dir> also writes a copy filled with sample details, for screenshots.
 *   node scripts/build-bakery-templates.js [--demo <dir>]
 */
const fs = require("fs");
const path = require("path");
const { fillTemplate, DEMO } = require("../templates/_src/fill");

const FONT_DIR = process.env.FONT_DIR || "/mnt/skills/examples/canvas-design/canvas-fonts";
const STYLES = ["minimal", "bold", "editorial", "atelier", "gallery", "motion"].filter((s) => fs.existsSync(path.join(__dirname, "..", "templates", "_src", s + ".js")));
const demoArg = process.argv.indexOf("--demo");
const demoDir = demoArg > -1 ? path.resolve(process.argv[demoArg + 1]) : null;
const outRoot = path.join(__dirname, "..", "templates", "bakery");

const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };

for (const style of STYLES) {
  const b = require(`../templates/_src/${style}`).build();
  const files = {};
  for (const [p, body] of Object.entries(b.files)) files[p] = typeof body === "string" ? body.replace(/\{\{theme_color\}\}/g, b.themeColor) : body;
  for (const [dir, base] of [[path.join(outRoot, style), null], demoDir ? [path.join(demoDir, style), DEMO] : [null, null]]) {
    if (!dir) continue;
    let out = files;
    if (base) { const r = fillTemplate(files, base); out = r.files; if (r.missing.length) console.warn(style, "tokens without a demo value:", r.missing.join(", ")); }
    fs.rmSync(dir, { recursive: true, force: true });
    for (const [p, body] of Object.entries(out)) write(path.join(dir, p), body);
    fs.mkdirSync(path.join(dir, "assets", "fonts"), { recursive: true });
    for (const [src, dest] of b.fonts) fs.copyFileSync(path.join(FONT_DIR, src), path.join(dir, "assets", "fonts", dest));
    // premium plus templates ship pictures and a looping video, built by scripts/build-bakery-media.js into templates/_media
    for (const [src, dest] of b.media || []) { fs.mkdirSync(path.dirname(path.join(dir, "assets", dest)), { recursive: true }); fs.copyFileSync(path.join(__dirname, "..", "templates", "_media", src), path.join(dir, "assets", dest)); }
  }
  console.log(style, Object.keys(files).length, "files");
}
