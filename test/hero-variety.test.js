// Run: node --test test/hero-variety.test.js
// Bug UU (phone test 2026-10-13): both designs looked alike (dark, text-only). Photo-led heroes are the default; the two first designs differ.
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../bots/library-bot");

const MODEL = {
  brand: "Hillside Sanctuary", description: "A home for rescued animals.",
  sections: {
    hero: { headline: "A safe place for every animal", subhead: "We rescue, heal and rehome.", cta1_label: "Adopt", image_brief: "rescued dogs at a sanctuary" },
    services: { title: "How we help", items: [{ icon: "heart", title: "Rescue", text: "We take animals in." }, { icon: "leaf", title: "Rehoming", text: "Forever homes." }, { icon: "sparkle", title: "Care", text: "Vet care." }] },
    about: { title: "Our story", body: "Started by volunteers.", image_brief: "volunteer with a dog" },
    faq: { title: "Questions", items: [{ question: "Can I visit?", answer: "Yes." }] },
    cta: { title: "Help us", cta1_label: "Donate" },
  },
};
const INFO = { name: "Hillside Sanctuary", email: "hi@hillside.example" };
const heroVariant = (html) => (html.match(/data-gurost-section="hero" data-variant="(\w)"/) || [])[1];
const withPhotos = async (q) => ({ url: "https://cdn.pixabay.com/photo/" + encodeURIComponent(q) + ".jpg", credit: "Pixabay" });

async function build(search, directionIds) {
  return L.generateLibraryVariants("animal sanctuary", { businessInfo: INFO, callModel: async () => MODEL, search, browserChecks: false, directionIds, premium: false });
}

test("with photos: the first two designs are photo-led and different (split and full-bleed); none is text-only", async () => {
  const out = await build(withPhotos);
  const h = Object.fromEntries(out.variants.map((v) => [v.id, heroVariant(v.html)]));
  assert.deepEqual(h, { minimal: "a", bold: "b" });
  for (const v of out.variants) assert.match(v.html, /g-hero__img" src="https:\/\/cdn\.pixabay\.com/, `${v.id} has a hero photo`);
});

test("the 'more' designs are photo-led too", async () => {
  const out = await build(withPhotos, L.MORE_IDS);
  for (const v of out.variants) assert.notEqual(heroVariant(v.html), "c", v.id);
});

test("an animal sanctuary is not built in the neutral navy 'tech' palette", async () => {
  const out = await build(withPhotos);
  for (const v of out.variants) assert.notEqual(v.site.palette, "tech");
  assert.equal(out.variants[0].site.palette, "health");
});

test("with no photo found, the hero never ships a broken image (it falls back to the text hero, and nothing says IMG_)", async () => {
  const out = await build(async () => null);
  for (const v of out.variants) { assert.equal(heroVariant(v.html), "c"); assert.ok(!/IMG_\d/.test(v.html)); }
});

test("Bug SS: when the brief finds nothing, the person's own words are tried, then industry words; the hero gets a photo", async () => {
  const asked = [];
  const out = await build(async (q) => { asked.push(q); return /animal sanctuary/.test(q) ? { url: "https://cdn.pixabay.com/photo/found.jpg", credit: "Pixabay" } : null; });
  assert.ok(asked.some((q) => /rescued dogs/.test(q)), "the model's brief was tried first");
  assert.ok(asked.includes("animal sanctuary"), "then the person's own words");
  for (const v of out.variants) assert.match(v.html, /g-hero__img" src="https:\/\/cdn\.pixabay\.com\/photo\/found\.jpg/, `${v.id} hero has the photo`);
});

test("Bug SS: when no photo can be found at all, the build log says so in plain words (never silent)", async () => {
  const entries = [];
  const logger = { log: (e) => { entries.push(e); return e; }, step: async (b, t, fn) => fn(), entries };
  await L.generateLibraryVariants("animal sanctuary", { businessInfo: INFO, callModel: async () => MODEL, search: async () => null, browserChecks: false, premium: false, logger });
  const msg = entries.find((e) => e.task && /^hero photo for/.test(e.task));
  assert.ok(msg, "a hero-photo message was logged");
  assert.match(msg.reason, /plain hero/);
  assert.match(msg.reason, /add a photo/);
});
