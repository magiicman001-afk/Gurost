// Run: node --test test/brand-pages.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const F = require("../public/shared/ai-brand");

const PUB = path.join(__dirname, "..", "public");
const read = (f) => fs.readFileSync(path.join(PUB, f), "utf8");

test("every speaker the builders use is a known one (no stray provider names, no default robot avatar)", () => {
  const panel = read("shared/bot-conversation.js");
  const known = new Set([...panel.matchAll(/^\s*(?:'([^']+)'|(\w+)):\s*\{ emoji:/gm)].map((m) => m[1] || m[2]));
  const roles = new Set([...panel.slice(panel.indexOf("const AI_ROLES"), panel.indexOf("const AI_COLOR")).matchAll(/(?:'([^']+)'|\b(\w+)):\s*'/g)].map((m) => m[1] || m[2]));
  assert.ok(known.has("Pulse") && known.has("You") && known.has("Images"));
  assert.ok(!known.has("Gemini") && !roles.has("Gemini"), "no model name as a speaker");
  for (const f of ["builder.html", "app-builder.html"]) {
    const src = read(f);
    const used = new Set([...src.matchAll(/\b(?:logBot|log)\(\s*'([^']+)'/g)].map((m) => m[1]));
    for (const name of used) assert.ok(known.has(name), `${f} speaks as "${name}", which has no avatar entry`);
    for (const name of used) if (!["Pulse", "You"].includes(name)) assert.ok(roles.has(name), `${f}: "${name}" should speak as the AI`);
    assert.match(src, /shared\/brand-config\.js/, `${f} loads the brand config`);
    assert.ok(src.indexOf("shared/brand-config.js") < src.indexOf("shared/ai-brand.js"), `${f}: config loads before the brand module`);
    assert.match(src, /shared\/ai-brand\.js/, `${f} loads the brand before the panel`);
    assert.ok(src.indexOf("shared/ai-brand.js") < src.indexOf("shared/bot-conversation.js"), `${f} load order`);
  }
});

test("the builders no longer print model names, costs or provider names in their logs", () => {
  const b = read("builder.html");
  assert.ok(!/Pixabay|FLUX|Gemini|all-Gemini|\$\$\{d\.cost/.test(b.replace(/d\.(pixabay|flux|gemini)/g, "")), "builder.html log text");
  const a = read("app-builder.html");
  assert.ok(!/stageModels|msg\.data\?\.model|data\.model/.test(a), "app-builder.html shows no model");
});

test("no AI model or provider name appears anywhere a person can read it (all pages and page scripts)", () => {
  // Allowed: the brand file that defines the word list, and the privacy policy, which has to
  // name data processors by law. Data-field names like d.gemini (a count from the server) are
  // code, not text, so they are blanked before the scan. Comments and base64 blobs are ignored.
  const allowedFiles = new Set(["shared/ai-brand.js", "privacy.html"]);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const hits = [];
  for (const file of walk(PUB).filter((f) => /\.(html|js)$/.test(f))) {
    const rel = path.relative(PUB, file).split(path.sep).join("/");
    if (allowedFiles.has(rel)) continue;
    const src = fs.readFileSync(file, "utf8")
      .replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
      .replace(/[A-Za-z0-9+\/=]{200,}/g, "")
      .replace(/\bd\.(gemini|flux|pixabay)\b/g, "d.x").replace(/'gemini-fallback'/g, "'fallback'");
    src.split("\n").forEach((line, i) => { if (F.mentionsModel(line)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`); });
  }
  assert.deepEqual(hits, [], "model names in user-facing files:\n" + hits.join("\n"));
});
