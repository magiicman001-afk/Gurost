"use strict";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../bots/library-bot");
const A = require("../lib/sections/assemble");

const MODEL = {
  brand: "Luvky Bakes",
  description: "Small-batch sourdough and pastries.",
  sections: {
    hero: { eyebrow: "Bakery", headline: "Fresh bread, baked every morning", subhead: "Sourdough and pastries made by hand.", cta1_label: "Order now", image_brief: "sourdough loaves on counter", cta1_href: "javascript:alert(1)" },
    services: { title: "What we bake", items: [{ icon: "heart", title: "Sourdough", text: "Slow-fermented loaves." }, { icon: "nonsense", title: "Pastries", text: "Butter and flour." }] },
    about: { title: "Our kitchen", body: "A small neighbourhood bakery.", image_brief: "baker shaping dough" },
    faq: { title: "Questions", items: [{ question: "Do you do custom cakes?", answer: "Yes, ask us in the shop." }] },
    cta: { title: "Come and say hello", cta1_label: "Visit" },
    gallery: { title: "From the oven", images: [{ brief: "croissants" }, { brief: "rye bread" }, { brief: "cake slice" }] },
    testimonials: { title: "Reviews", items: [{ quote: "Best ever", name: "Sam" }] },
  },
};
const INFO = { name: "Luvky Bakes", phone: "0113 496 0000", email: "hi@luvky.example", address: "12 High Street, Leeds", instagram: "https://www.instagram.com/luvky" };
const search = async (q) => ({ url: "https://cdn.pixabay.com/photo/" + encodeURIComponent(q) + ".jpg", credit: "Pixabay" });

test("composeContent: owner facts come from businessInfo, never the model", () => {
  const c = L.composeContent({ prompt: "a bakery in Leeds", businessInfo: INFO, modelOut: { ...MODEL, sections: { ...MODEL.sections, location: { address: "999 Fake Rd" } } } });
  assert.equal(c.palette, "cafe");
  assert.equal(c.content.location.address, "12 High Street, Leeds");
  assert.equal(c.content.footer.phone, "0113 496 0000");
  assert.equal(c.content.booking.methods[0].href, "tel:01134960000");
  assert.equal(c.content.navbar.brand, "Luvky Bakes");
  assert.deepEqual(c.content.footer.socials, [{ platform: "instagram", url: "https://www.instagram.com/luvky" }]);
});

test("composeContent: sections that need invented facts never appear", () => {
  const c = L.composeContent({ prompt: "a bakery", businessInfo: INFO, modelOut: MODEL });
  for (const id of ["testimonials", "stats", "pricing", "team"]) assert.equal(c.content[id], undefined, id);
});

test("composeContent: model links are ignored; icons are validated; photos get tokens", () => {
  const c = L.composeContent({ prompt: "a bakery", businessInfo: INFO, modelOut: MODEL });
  assert.equal(c.content.hero.cta1_href, "#booking");
  assert.notEqual(c.content.services.items[1].icon, "nonsense");
  assert.equal(c.content.hero.image, "IMG_1");
  assert.equal(c.content.about.image, "IMG_2");
  assert.equal(c.content.gallery.images.length, 3);
});

test("composeContent: no owner details means no booking or location, and no dead buttons", () => {
  const c = L.composeContent({ prompt: "a bakery", businessInfo: null, modelOut: MODEL });
  assert.equal(c.content.booking, undefined);
  assert.equal(c.content.location, undefined);
  assert.equal(c.content.cta.cta1_label, undefined);
  assert.ok(c.content.hero.cta1_href.startsWith("#"));
  assert.ok(c.content.navbar.links.length >= 3);
});

test("composeContent: garbage from the model still gives a valid page", () => {
  for (const bad of [null, "x", 5, [], { sections: "no" }, { sections: { hero: 7 } }]) {
    const c = L.composeContent({ prompt: "a plumber", businessInfo: { name: "Pipes Ltd" }, modelOut: bad });
    const page = A.assemble({ palette: c.palette, recipe: c.recipe, content: c.content });
    assert.match(page.html, /<h1\b/);
  }
});

test("the prompt tells the model to write words only and lists its slots", () => {
  const p = L.systemPrompt(["hero", "services"]);
  assert.match(p, /Never write prices/);
  assert.match(p, /## hero[\s\S]*headline: text, max 70/);
  assert.doesNotMatch(p, /cta1_href/);
});

test("generateLibraryVariants: two directions, same words, real photos, stages reported", async () => {
  const stages = [];
  let calls = 0;
  const out = await L.generateLibraryVariants("a bakery in Leeds", { businessInfo: INFO, callModel: async () => (calls++, MODEL), search, browserChecks: false, onStage: (s, st) => stages.push(s + ":" + st) });
  assert.equal(calls, 1);
  assert.deepEqual(out.variants.map((v) => v.id).sort(), ["bold", "minimal"]);
  for (const v of out.variants) {
    assert.match(v.html, /Fresh bread, baked every morning/);
    assert.match(v.html, /cdn\.pixabay\.com/);
    assert.doesNotMatch(v.html, /IMG_\d/);
    assert.equal(v.site.engine, "section-library");
    assert.equal(v.verified, true);
  }
  assert.notEqual(out.variants[0].html, out.variants[1].html);
  assert.ok(stages.includes("designing:variant-complete") && stages.includes("done:complete"));
});

test("'Show 2 more' reuses the saved words: no second model call", async () => {
  const first = await L.generateLibraryVariants("a bakery", { businessInfo: INFO, callModel: async () => MODEL, search, browserChecks: false });
  let calls = 0;
  const more = await L.generateLibraryVariants("a bakery", { businessInfo: INFO, directionIds: L.MORE_IDS, siteCopy: first.variants[0].site.copy, callModel: async () => (calls++, MODEL), search, browserChecks: false });
  assert.equal(calls, 0);
  assert.deepEqual(more.variants.map((v) => v.id).sort(), ["corporate", "playful"]);
});

test("a model failure rejects (the server then falls back to the old generator)", async () => {
  await assert.rejects(L.generateLibraryVariants("x", { callModel: async () => { throw new Error("402"); }, search }), /402/);
});

test("no photos found: the page still ships with no broken images", async () => {
  const out = await L.generateLibraryVariants("a bakery", { businessInfo: INFO, callModel: async () => MODEL, search: async () => null, browserChecks: false });
  assert.ok(out.variants.length);
  for (const v of out.variants) assert.doesNotMatch(v.html, /IMG_\d/);
});

test("the flag: off by default, on only for exactly 1", () => {
  assert.equal(L.enabled({}), false);
  assert.equal(L.enabled({ SECTION_LIBRARY: "1" }), true);
  assert.equal(L.enabled({ SECTION_LIBRARY: "true" }), false);
});

test("server wiring: both routes go through the flagged helper, the old generator is the fallback, select keeps the site", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "server.js"), "utf8");
  assert.equal((src.match(/await generateWebsiteDesigns\(/g) || []).length, 2);
  assert.match(src, /if \(libraryBot\.enabled\(\)\)[\s\S]*return variantBot\.generateVariantsStaged\(prompt, opts\)/);
  assert.match(src, /project\.site = picked && picked\.site \? picked\.site : null/);
});

test("gate: the demo bakery ships without failures", async () => {
  const out = await L.generateLibraryVariants("a bakery in Leeds", { businessInfo: INFO, callModel: async () => MODEL, search, browserChecks: false });
  for (const v of out.variants) assert.deepEqual({ ok: v.gate.ok, degraded: v.gate.degraded }, { ok: true, degraded: false });
});

// ---- Bug EE: the Live Preview is not blank while the words are written ----
test("live preview: a styled shell appears BEFORE the words arrive, then the page grows section by section", async () => {
  const events = [];
  let modelAsked = false;
  const modelOut = { brand: "Luvky Bakes", description: "Bakery.", sections: { hero: { headline: "Fresh bread every morning", subhead: "Sourdough and cakes.", cta1_label: "Order now", image_brief: "bread" }, services: { title: "What we bake", items: [{ icon: "heart", title: "Birthday Cake", text: "Made to order." }, { icon: "leaf", title: "Sourdough", text: "Slow loaves." }, { icon: "sparkle", title: "Pastries", text: "Butter." }] }, about: { title: "Our kitchen", body: "A small bakery.", image_brief: "baker" }, cta: { title: "Say hello", cta1_label: "Visit" } } };
  const out = await L.generateLibraryVariants("a bakery in Leeds", {
    businessInfo: { name: "Luvky Bakes", phone: "0113 496 0000" },
    previewStepMs: 0,
    browserChecks: false,
    search: async () => ({ url: "https://cdn.pixabay.com/photo/x.jpg", credit: "P" }),
    callModel: async () => { modelAsked = true; events.push(["model-called"]); await new Promise((r) => setTimeout(r, 20)); events.push(["model-done"]); return modelOut; },
    onStage: (stage, status, data) => events.push([stage + "/" + status, data]),
  });
  assert.ok(out.variants.length >= 1);
  const names = events.map((e) => e[0]);
  const firstPartial = names.indexOf("designing/partial");
  assert.ok(firstPartial !== -1 && firstPartial < names.indexOf("model-done"), "the shell is shown before the model has answered");
  const shell = events[firstPartial][1];
  assert.match(shell.html, /Luvky Bakes/, "the shell carries the owner's business name");
  assert.match(shell.html, /Writing the words/, "and says honestly that the words are still being written");
  assert.ok(!/IMG_\d+/.test(shell.html), "no raw image tokens in a preview");
  assert.equal(shell.progress, 8);
  const partials = events.filter((e) => e[0] === "designing/partial").map((e) => e[1]);
  assert.ok(partials.length >= 4, "shell + one step per section, got " + partials.length);
  const progress = partials.map((p) => p.progress);
  assert.deepEqual(progress, [...progress].sort((a, b) => a - b), "progress only moves forward");
  assert.ok(partials.some((p) => p.sections[0] === "services"), "services is announced as it is added");
  assert.ok(partials.every((p) => /<h1\b/.test(p.html)), "every frame is a whole page");
  // nothing is announced after a finished design is pickable
  const firstDone = names.indexOf("designing/variant-complete");
  assert.ok(names.slice(firstDone + 1).every((n) => n !== "designing/partial"), "no preview frame after a design is ready");
});
