"use strict";
/**
 * Builds the template presets from templates/_src into templates/<industry>/<style>/ (tokenised, ready to fill), and with
 * --demo <dir> also writes a copy filled with sample details, for screenshots.
 *   node scripts/build-templates.js [--demo <dir>] [industry ...]      (no industry = every pack in templates/_src/packs)
 */
const fs = require("fs");
const path = require("path");
const { fillTemplate } = require("../templates/_src/fill");

const FONT_DIR = process.env.FONT_DIR || "/mnt/skills/examples/canvas-design/canvas-fonts";
const args = process.argv.slice(2);
const demoArg = args.indexOf("--demo");
const demoDir = demoArg > -1 ? path.resolve(args[demoArg + 1]) : null;
const only = args.filter((a, i) => !a.startsWith("--") && i !== demoArg + 1);
const PACKS = fs.readdirSync(path.join(__dirname, "..", "templates", "_src", "packs")).filter((f) => f.endsWith(".js")).map((f) => require(`../templates/_src/packs/${f}`)).filter((p) => !only.length || only.includes(p.id));

const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };

for (const pack of PACKS) {
  const outRoot = path.join(__dirname, "..", "templates", pack.id);
  for (const style of pack.styles) {
    const b = require(`../templates/_src/${style}`).build(pack);
    const files = {};
    for (const [p, body] of Object.entries(b.files)) files[p] = typeof body === "string" ? body.replace(/\{\{theme_color\}\}/g, b.themeColor) : body;
    for (const [dir, base] of [[path.join(outRoot, style), null], demoDir ? [path.join(demoDir, pack.id, style), pack.demo] : [null, null]]) {
      if (!dir) continue;
      let out = files;
      if (base) { const r = fillTemplate(files, base); out = r.files; if (r.missing.length) console.warn(pack.id, style, "tokens without a demo value:", r.missing.join(", ")); }
      fs.rmSync(dir, { recursive: true, force: true });
      for (const [p, body] of Object.entries(out)) write(path.join(dir, p), body);
      fs.mkdirSync(path.join(dir, "assets", "fonts"), { recursive: true });
      for (const [src, dest] of b.fonts) fs.copyFileSync(path.join(FONT_DIR, src), path.join(dir, "assets", "fonts", dest));
      // premium plus templates ship pictures and a looping video, built by scripts/build-media.js into templates/_media/<industry>
      for (const [src, dest] of b.media || []) { fs.mkdirSync(path.dirname(path.join(dir, "assets", dest)), { recursive: true }); fs.copyFileSync(path.join(__dirname, "..", "templates", "_media", src), path.join(dir, "assets", dest)); }
    }
    console.log(pack.id, style, Object.keys(files).length, "files");
  }
}
