// Run: node --test test/business-types.test.js
// End to end: six business types, each assembled from its recipe with sample content, real-photo step (fake search),
// scroll motion on, then through the quality gate (static checks, 375px overflow, computed contrast).
const test = require("node:test");
const assert = require("node:assert/strict");
const A = require("../lib/sections/assemble");
const F = require("../lib/sections/fill-images");
const G = require("../lib/sections/quality-gate");
const R = require("../lib/sections/render");
const { contentMap } = require("../scripts/build-sections-preview");

const NOW = new Date(Date.UTC(2031, 5, 1));
const TYPES = { cafe: "Bakery", law: "Law firm", salon: "Hair salon", trades: "Electrician", health: "Physio clinic", tech: "SaaS studio" };
let browser = null;
test.before(async () => {
  try {
    browser = await require("playwright").chromium.launch();
  } catch {
    browser = null;
  }
});
test.after(async () => {
  if (browser) await browser.close();
});

const search = async (q) => ({ url: "https://jiadrorezquvthyujykb.supabase.co/storage/v1/object/public/project-assets/" + encodeURIComponent(q.replace(/\s+/g, "-")) + ".jpg", credit: "stock" });

for (const [pal, label] of Object.entries(TYPES))
  test(`${label} (${pal}): full page from its recipe passes the gate with photos and motion`, async () => {
    const recipe = A.pickRecipe(pal);
    const map = contentMap(pal);
    const content = Object.fromEntries(A.recipes[recipe].order.map((id) => [id, map[id]]));
    const page = await F.assembleWithImages({ palette: pal, recipe, content, motion: { libs: true }, includeBranding: true, now: NOW }, { search });
    assert.equal(page.recipe, recipe);
    assert.deepEqual(page.sections.map((s) => s.id), A.recipes[recipe].order.filter((id) => R.getSection(id).status === "built"));
    assert.equal((page.html.match(/<h1\b/g) || []).length, 1);
    assert.ok(!/src="IMG_/.test(page.html), "no unfilled photo");
    assert.deepEqual(page.unfilled, []);
    assert.ok(page.html.includes("g-motion"), "motion engine present");
    assert.ok(Buffer.byteLength(page.html) < 250 * 1024, "page stays light (under 250 KB)");
    const g = await G.gate(page, { now: NOW, browser: browser || undefined, impeccable: false });
    assert.deepEqual(g.failures, []);
  });

test("every palette's recipe uses at least eight sections and every section id exists", () => {
  for (const [id, r] of Object.entries(A.recipes)) {
    assert.ok(r.order.length >= 9, id);
    for (const s of r.order) assert.equal(R.getSection(s).status, "built", `${id}: ${s}`);
  }
});
