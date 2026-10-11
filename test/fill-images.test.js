// Run: node --test test/fill-images.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../lib/sections/fill-images");
const { SAMPLES } = require("../scripts/build-sections-preview");

const NOW = new Date(Date.UTC(2031, 5, 1));
const L = (label, href) => ({ label, href });
const SB = "https://jiadrorezquvthyujykb.supabase.co/storage/v1/object/public/project-assets/";
function input(p = "cafe", extra = {}) {
  const s = SAMPLES[p];
  return {
    palette: p, now: NOW,
    content: {
      navbar: { brand: s.brand, links: s.links.map((l) => L(l, "#x")), cta_label: s.cta, cta_href: "#c" },
      hero: { headline: s.headline, subhead: s.subhead, cta1_label: s.cta, cta1_href: "#c", image: "IMG_1", image_brief: "Fresh loaves cooling on a wire rack", image_alt: "Loaves" },
      about: { title: "About", body: "We bake.", image: "IMG_2", image_brief: "Baker shaping dough", image_alt: "Baker" },
      gallery: { title: "Gallery", images: [3, 4, 5].map((n) => ({ image: "IMG_" + n, brief: "Pastry " + n })) },
      footer: { brand: s.brand, link_groups: s.groups },
    },
    ...extra,
  };
}
const fake = (map = {}) => async (q) => (q in map ? map[q] : { url: SB + encodeURIComponent(q) + ".jpg", credit: "Photo by X on Pixabay", provider: "pixabay" });

test("queryFor: plain words, at most six, an industry hint only for very short briefs", () => {
  assert.equal(F.queryFor("Fresh loaves cooling on a wire rack today", "cafe"), "Fresh loaves cooling on a wire");
  assert.equal(F.queryFor("Bread", "cafe"), "Bread bakery cafe");
  assert.equal(F.queryFor('<script>alert(1)</script> "x"', "law"), "script alert 1 script x");
  assert.equal(F.queryFor("", "nope"), "");
});

test("fill: every IMG_n becomes a stored https URL; no token is left; credits are returned, not written into the page", async () => {
  const r = await F.assembleWithImages(input(), { search: fake() });
  assert.ok(!/src="IMG_\d+"/.test(r.html));
  assert.deepEqual(r.unfilled, []);
  assert.equal(r.filled.length, 5);
  assert.ok((r.html.match(new RegExp(`src="${SB.replace(/[.]/g, "\\.")}`, "g")) || []).length >= 5);
  assert.deepEqual(r.credits, ["Photo by X on Pixabay"]);
  assert.ok(!/Pixabay|Photo by/.test(r.html), "credits never appear on the customer's page");
});

test("fill: a photo that is not found never ships broken: the hero and about swap to their no-photo variants", async () => {
  const r = await F.assembleWithImages(input(), { search: async (q) => (/loaves|dough/i.test(q) ? null : { url: SB + "a.jpg", credit: "", provider: "pixabay" }) });
  assert.deepEqual(r.unfilled.sort(), ["IMG_1", "IMG_2"]);
  assert.ok(!/src="IMG_/.test(r.html));
  assert.equal(r.sections.find((s) => s.id === "hero").variant, "c");
  assert.equal(r.sections.find((s) => s.id === "about").variant, "b");
  assert.equal((r.html.match(/<h1\b/g) || []).length, 1);
});

test("fill: search errors and empty results count as not found; the page still ships", async () => {
  const r = await F.assembleWithImages(input(), { search: async () => { throw new Error("network"); } });
  assert.equal(r.filled.length, 0);
  assert.ok(!/src="IMG_/.test(r.html));
  assert.ok(r.html.startsWith("<!doctype html>"));
  const r2 = await F.assembleWithImages(input(), { search: async () => ({ url: "" }) });
  assert.equal(r2.unfilled.length, 5);
});

test("fill: only https URLs on an allowed image host are used; anything else is treated as not found", async () => {
  for (const bad of ["http://cdn.pixabay.com/a.jpg", "javascript:alert(1)", "https://evil.example/a.jpg", 'https://cdn.pixabay.com/a.jpg"onerror="x']) {
    const r = await F.assembleWithImages(input(), { search: async () => ({ url: bad }) });
    assert.ok(!r.html.includes("evil.example") && !/"\s*onerror=/.test(r.html) && !/src="http:/.test(r.html), bad);
  }
  const ok = await F.assembleWithImages(input(), { search: async () => ({ url: "https://cdn.pixabay.com/photo/a.jpg?x=1&y=2" }) });
  assert.ok(ok.html.includes("https://cdn.pixabay.com/photo/a.jpg?x=1&amp;y=2"), "ampersands are escaped in the attribute");
});

test("fill: one lookup per distinct token, the hero is searched first, and the cap and concurrency hold", async () => {
  const seen = [];
  let running = 0, peak = 0;
  const search = async (q) => {
    seen.push(q);
    running++; peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running--;
    return { url: SB + "a.jpg" };
  };
  const r = await F.assembleWithImages(input(), { search, concurrency: 2, maxImages: 3 });
  assert.equal(seen.length, 3);
  assert.match(seen[0], /loaves/i, "hero first");
  assert.ok(peak <= 2);
  assert.equal(r.unfilled.length, 2, "beyond the cap counts as not found");
  assert.ok(!/src="IMG_/.test(r.html));
});

test("fill: needs a search function; the page is deterministic for the same results", async () => {
  await assert.rejects(() => F.assembleWithImages(input(), {}), /search function/);
  const a = await F.assembleWithImages(input(), { search: fake() });
  const b = await F.assembleWithImages(input(), { search: fake() });
  assert.equal(a.html, b.html);
});

test("dropTokens removes only the named tokens, deeply, and leaves the rest alone", () => {
  const out = F.dropTokens({ a: { image: "IMG_1", x: "keep" }, list: [{ image: "IMG_2" }, { image: "IMG_3", t: "k" }] }, new Set(["IMG_1", "IMG_3"]));
  assert.deepEqual(out, { a: { x: "keep" }, list: [{ image: "IMG_2" }, { t: "k" }] });
});
