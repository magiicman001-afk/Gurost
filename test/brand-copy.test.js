// Run: node --test test/brand-copy.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", "public", f), "utf8");

test("pages that name the AI take the name from the config (a placeholder, never typed)", () => {
  for (const f of ["assistant.html", "amend_website.html", "analytics.html", "help.html", "pricing.html"]) {
    const src = read(f);
    assert.match(src, /data-brand-name/, f + " uses the placeholder");
    assert.match(src, /shared\/brand-config\.js/, f + " loads the config");
    assert.ok(src.indexOf("shared/brand-config.js") < src.indexOf("shared/ai-brand.js"), f + ": config before brand");
  }
});
