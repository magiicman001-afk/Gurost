"use strict";
// Premium Pipeline (docs/PREMIUM_PIPELINE_SPEC.md): 24 curated looks, the 0-100 score, the review loop, the library-bot wiring.
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../lib/sections/premium");
const S = require("../lib/sections/premium-score");
const Loop = require("../lib/sections/premium-loop");
const G = require("../lib/sections/quality-gate");
const L = require("../bots/library-bot");
const { assembleWithImages } = require("../lib/sections/fill-images");
const H = require("./helpers/premium-sample");

const PALETTES = ["cafe", "law", "salon", "trades", "health", "tech"];
const KIND = { services: "list", features: "list", process: "list", faq: "list", about: "feature", gallery: "feature", cta: "action", booking: "action", location: "action" };
const none = async () => null;

let browser = null;
test.before(async () => { try { browser = await require("playwright").chromium.launch(); } catch { browser = null; } });
test.after(async () => { if (browser) await browser.close(); });
const needBrowser = (t) => { if (!browser) { t.skip("no browser in this environment"); return false; } return true; };
const inject = (page, css) => ({ ...page, html: page.html.replace("</style>", css + "</style>") });
const scoreOf = async (page, look, extra = {}) => S.score(page, { look, metrics: await S.measure(page.html, { browser }), ...extra });

// ------------------------------------------------------------------ the data
test("24 looks: 6 palettes x 4, every palette named by the matcher, ids unique", () => {
  assert.equal(P.allLooks().length, 24);
  for (const pal of PALETTES) assert.equal(P.looksFor(pal).length, 4, pal);
  assert.equal(new Set(P.allLooks().map((l) => l.id)).size, 24);
  assert.equal(P.forPalette("nonsense"), P.forPalette("tech"), "an unknown palette falls back to tech, as the matcher does");
});

test("every look: navbar + hero first, footer last, 4 content sections the copy supports, a variant for each", () => {
  for (const pal of PALETTES) {
    for (const look of P.looksFor(pal)) {
      assert.deepEqual(look.order.slice(0, 2), ["navbar", "hero"], look.id);
      assert.equal(look.order[look.order.length - 1], "footer", look.id);
      const copy = look.order.filter((id) => !["navbar", "hero", "footer", "booking", "location"].includes(id));
      assert.equal(copy.length, 4, look.id + " has 4 content sections");
      for (const id of copy) assert.ok(P.copyFor(pal).includes(id), `${look.id}: the model must write ${id}`);
      for (const id of look.order) assert.match(look.variants[id] || "", /^[abc]$/, `${look.id}: variant for ${id}`);
      assert.ok(look.order.length - 3 <= 6, look.id + " is at most 6 content sections with contact");
    }
  }
});

test("rhythm: no two list sections or two feature sections side by side; a transparent navbar only over a dark photo hero", () => {
  for (const look of P.allLooks()) {
    const kinds = look.order.map((id) => KIND[id]).filter(Boolean);
    for (let i = 1; i < kinds.length; i++) if (kinds[i] !== "action") assert.notEqual(kinds[i], kinds[i - 1], `${look.id}: ${look.order.join(" > ")}`);
    if (look.variants.navbar === "c") assert.equal(look.variants.hero, "b", look.id + ": navbar c needs hero b");
  }
});

test("needs follow the hero: a type-led hero (c) needs no photo, a photo hero needs one; a gallery needs three", () => {
  for (const look of P.allLooks()) {
    assert.equal(look.needs.includes("hero-image"), look.variants.hero !== "c", look.id);
    assert.equal(look.needs.includes("gallery-3"), look.order.includes("gallery"), look.id);
  }
});

test("the flag is on unless PREMIUM_PIPELINE is exactly 0", () => {
  assert.equal(P.enabled({}), true);
  assert.equal(P.enabled({ PREMIUM_PIPELINE: "1" }), true);
  assert.equal(P.enabled({ PREMIUM_PIPELINE: "0" }), false);
  assert.equal(P.config().threshold, 70);
});

// ------------------------------------------------------------------ all 24 looks, built with real assembly + a real browser
test("all 24 looks build, pass the hard gates and score 70 or more (measured in a browser)", async (t) => {
  if (!needBrowser(t)) return;
  for (const pal of PALETTES) {
    for (let i = 0; i < 4; i++) {
      const { page, look } = await H.buildLook(pal, i);
      const g = await G.gate(page, { facts: [JSON.stringify(H.INFO), "scheduling cuts physiotherapy plumbing legal bread"], browser, impeccable: false });
      assert.deepEqual(g.failures.filter((f) => f.severity === "high" || f.severity === G.HIGH).map((f) => `${f.rule}:${f.detail}`), [], look.id + " hard gates");
      const s = await scoreOf(page, look);
      assert.equal(s.partial, false);
      assert.ok(s.pass, `${look.id} scored ${s.total}: ${s.reasons.map((r) => r.text).join("; ")}`);
      assert.ok(s.total >= 70, look.id);
    }
  }
});

// ------------------------------------------------------------------ the score catches cheap pages
// Single mild flaws are tolerated on purpose (one tight section is not a bad page). Each named bad page below combines the
// flaw with the company it usually keeps: no photos, thin copy, flat type.
test("bad page: thin (one content section, no photos) scores under 70", async (t) => {
  if (!needBrowser(t)) return;
  const { page, look } = await H.buildLook("cafe", 1, { search: none, mutate: (c) => { for (const k of Object.keys(c.content)) if (!["navbar", "hero", "footer", "services"].includes(k)) delete c.content[k]; } });
  const s = await scoreOf(page, look);
  assert.ok(s.total < 70, `thin scored ${s.total}`);
  assert.ok(s.reasons.some((r) => r.code === "few-sections"));
});

test("bad page: bloated (8 content sections, no photos) scores under 70", async (t) => {
  if (!needBrowser(t)) return;
  const look = { id: "bloat", needs: ["hero-image"], variants: {}, order: ["navbar", "hero", "services", "features", "about", "gallery", "process", "faq", "cta", "booking", "location", "footer"] };
  const composed = L.composeContent({ prompt: "cafe", businessInfo: { ...H.INFO, name: "X" }, modelOut: H.sampleModel("cafe"), copy: P.copyFor("cafe") });
  const page = await assembleWithImages({ palette: "cafe", recipe: P.recipeFor(look, new Set(Object.keys(composed.content))), content: composed.content, variants: {}, meta: composed.meta }, { search: none });
  const s = await scoreOf(page, look);
  assert.ok(s.total < 70, `bloated scored ${s.total}`);
  assert.ok(s.reasons.some((r) => r.code === "many-sections"));
});

test("bad page: cramped sections with no photos scores under 70", async (t) => {
  if (!needBrowser(t)) return;
  const { page, look } = await H.buildLook("trades", 1, { search: none });
  const s = await scoreOf(inject(page, "section{padding-top:6px!important;padding-bottom:6px!important}"), look);
  assert.ok(s.total < 70, `cramped scored ${s.total}`);
  assert.ok(s.reasons.some((r) => r.code === "cramped"));
});

test("bad page: one font size, three font families, no photos scores under 70", async (t) => {
  if (!needBrowser(t)) return;
  const { page, look } = await H.buildLook("salon", 1, { search: none });
  const s = await scoreOf(inject(page, "h1{font-size:15px!important;font-family:Impact!important}h2{font-family:'Comic Sans MS'!important}p,body{font-size:14px!important}"), look);
  assert.ok(s.total < 70, `flat type scored ${s.total}`);
  assert.ok(s.reasons.some((r) => r.code === "weak-hierarchy"));
});

test("bad page: off-palette colours with failing contrast and no photos scores under 70", async (t) => {
  if (!needBrowser(t)) return;
  const { page, look } = await H.buildLook("trades", 1, { search: none });
  const s = await scoreOf(inject(page, ".g-page a{color:#ff00aa}h2{color:#00ffcc}.g-page{background:#ffee00}"), look, { contrastFailed: true });
  assert.ok(s.total < 70, `off-palette scored ${s.total}`);
  assert.ok(s.reasons.some((r) => r.code === "off-palette"));
});

test("a look that cannot get its hero photo fails even if the rest scores high", async (t) => {
  if (!needBrowser(t)) return;
  const { page, look } = await H.buildLook("trades", 1, { search: none }); // immersive: needs a hero photo
  const s = await scoreOf(page, look);
  assert.ok(s.total >= 70, "the rest of the page is fine, so the total alone would pass: " + s.total);
  assert.deepEqual(s.needsUnmet, ["hero-image"]);
  assert.equal(s.pass, false);
  const typeLed = await H.buildLook("trades", 0, { search: none }); // editorial: type-led, needs no hero photo
  assert.equal((await scoreOf(typeLed.page, typeLed.look)).pass, true);
});

test("with no browser the score is scaled over what was measured and says so", () => {
  const page = { html: "<style></style>", palette: "cafe", sections: [{ id: "navbar" }, { id: "hero" }, { id: "services" }, { id: "about" }, { id: "cta" }, { id: "footer" }], parts: [], filled: [], unfilled: [] };
  const s = S.score(page, { look: { needs: [] }, metrics: null });
  assert.equal(s.partial, true);
  assert.equal(s.max, 60);
  assert.ok(!("whitespace" in s.parts) && !("typography" in s.parts));
});

// ------------------------------------------------------------------ the loop (no model, no network, no browser)
const mkScore = (total, codes = [], needsUnmet = []) => ({ total, pass: total >= 70 && !needsUnmet.length, reasons: codes.map((c) => ({ code: c, text: c })), parts: {}, needsUnmet });
const loopOpts = (scores, extra = {}) => {
  const built = [];
  const used = new Set();
  let n = 0;
  return {
    built, used,
    o: { palette: "trades", startLook: P.looksFor("trades")[1], available: new Set(["services", "about", "gallery", "process", "faq", "cta"]), used, cfg: { maxLoops: 2 }, buildOne: async (look, opt) => { built.push({ id: look.id, order: look.order, fallback: opt.fallbackSearch }); return { look: look.id }; }, review: async () => scores[n++] || mkScore(10), ...extra },
  };
};

test("loop: a look that passes is shown at once, with no swap", async () => {
  const { o, built } = loopOpts([mkScore(88)]);
  const r = await Loop.runSlot(o);
  assert.equal(built.length, 1);
  assert.equal(r.passed, true);
  assert.equal(r.note, "");
});

test("loop: a failing score swaps to another unused look and shows that one when it passes", async () => {
  const swaps = [];
  const { o, built, used } = loopOpts([mkScore(60, ["weak-hierarchy"]), mkScore(82)], { onSwap: (x) => swaps.push(x) });
  used.add("trades-editorial"); // another slot already has this one
  const r = await Loop.runSlot(o);
  assert.equal(built.length, 2);
  assert.notEqual(built[1].id, built[0].id);
  assert.notEqual(built[1].id, "trades-editorial", "never the look another slot claimed");
  assert.equal(r.best.look.id, built[1].id);
  assert.equal(swaps.length, 1);
});

test("loop: two loops at most, then the best attempt is kept with a one-line note", async () => {
  const { o, built } = loopOpts([mkScore(55, ["weak-hierarchy"]), mkScore(64, ["cramped"]), mkScore(61, ["fonts"])]);
  const r = await Loop.runSlot(o);
  assert.equal(built.length, 3, "first build + 2 loops");
  assert.equal(r.passed, false);
  assert.equal(r.best.score.total, 64, "the best of the three, not the last");
  assert.equal(r.note, "Quality check 64/100: cramped");
});

test("loop: a missing hero photo goes to a look that needs no photo", async () => {
  const { o, built } = loopOpts([mkScore(80, ["no-hero-image"], ["hero-image"]), mkScore(90)]);
  await Loop.runSlot(o);
  const second = P.looksFor("trades").find((l) => l.id === built[1].id);
  assert.ok(!second.needs.includes("hero-image"));
});

test("loop: with no photo-free look left, the photo search is retried once with the industry's own words", async () => {
  const { o, built, used } = loopOpts([mkScore(80, ["no-hero-image"], ["hero-image"]), mkScore(80, ["no-hero-image"], ["hero-image"]), mkScore(90)]);
  for (const l of P.looksFor("trades")) if (!l.needs.includes("hero-image")) used.add(l.id);
  await Loop.runSlot(o);
  assert.equal(built[1].fallback, true);
  assert.equal(built[1].id, built[0].id, "same look, different search");
});

test("loop: a thin page gets the next section the copy supports; a bloated page loses the least important", async () => {
  const thin = loopOpts([mkScore(50, ["few-sections"]), mkScore(80)]);
  await Loop.runSlot(thin.o);
  const added = thin.built[1].order.filter((id) => !thin.built[0].order.includes(id));
  assert.equal(added.length, 1);
  assert.ok(Loop.ADD_ORDER.includes(added[0]));
  const bloated = loopOpts([mkScore(50, ["many-sections"]), mkScore(80)]);
  await Loop.runSlot(bloated.o);
  assert.equal(bloated.built[1].order.length, bloated.built[0].order.length - 1);
});

test("loop: a look that cannot be built counts as a loop and the next look is tried; all failing throws", async () => {
  let calls = 0;
  const { o } = loopOpts([mkScore(90)], { buildOne: async () => { if (calls++ === 0) throw new Error("boom"); return { ok: 1 }; } });
  const r = await Loop.runSlot(o);
  assert.equal(r.passed, true);
  const bad = loopOpts([], { buildOne: async () => { throw new Error("always"); } });
  await assert.rejects(() => Loop.runSlot(bad.o), /always/);
});

// ------------------------------------------------------------------ wired into the library bot
const INFO = { name: "Studio Nine", phone: "0161 496 0000", address: "12 High Street, Manchester" };

test("library bot, flag off: nothing changes (the four plain directions)", async () => {
  const stages = [];
  const r = await L.generateLibraryVariants("a hair salon in Manchester", { businessInfo: INFO, premium: false, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("salon"), search: H.search, onStage: (s, st) => stages.push(st) });
  assert.deepEqual(r.variants.map((v) => v.id).sort(), ["bold", "minimal"]);
  assert.equal(r.variants[0].premium, undefined);
  assert.ok(!stages.includes("reviewing"));
});

test("library bot, flag on: each slot is a curated look, scored, logged and different from the other", async () => {
  const stages = [];
  const logs = [];
  const orig = console.log;
  console.log = (...a) => { if (String(a[0]).startsWith("[premium]")) logs.push(a.join(" ")); };
  let r;
  try {
    r = await L.generateLibraryVariants("a hair salon in Manchester", { businessInfo: INFO, premium: true, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("salon"), search: H.search, onStage: (s, st, d) => stages.push([st, d]) });
  } finally { console.log = orig; }
  assert.equal(r.variants.length, 2);
  const looks = r.variants.map((v) => v.premium.look);
  assert.equal(new Set(looks).size, 2);
  for (const v of r.variants) {
    assert.ok(v.premium.look.startsWith("salon-"));
    assert.equal(v.site.look, v.premium.look);
    assert.match(v.html, /<h1\b/);
    assert.ok(P.looksFor("salon").some((l) => l.label === v.label));
  }
  assert.ok(stages.some(([st]) => st === "reviewing"));
  assert.ok(logs.length >= 2 && logs.every((l) => /score=\d+/.test(l)));
});

test("library bot, flag on: no photos anywhere swaps photo looks for a type-led one instead of showing a blank hero", async () => {
  const stages = [];
  const orig = console.log;
  console.log = () => {};
  let r;
  try {
    r = await L.generateLibraryVariants("a plumber in Leeds", { businessInfo: { name: "Pipes Ltd", phone: "0113 496 0000" }, premium: true, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("trades"), search: none, onStage: (s, st, d) => stages.push([st, d]) });
  } finally { console.log = orig; }
  assert.ok(r.variants.length >= 1);
  assert.ok(stages.some(([st]) => st === "swapping"), "a photo look had to be swapped");
  for (const v of r.variants) {
    const look = P.looksFor("trades").find((l) => l.id === v.premium.look);
    if (v.premium.passed) assert.ok(!look.needs.includes("hero-image") || /<img[^>]+https:/.test(v.html));
  }
});

test("the builder log shows the Review score and swaps", () => {
  const html = require("fs").readFileSync(require("path").join(__dirname, "..", "public", "builder.html"), "utf8");
  assert.match(html, /msg\.status === 'reviewing'/);
  assert.match(html, /log\('Reviewer', `Checked the/);
  assert.match(html, /msg\.status === 'swapping'/);
});

test("the premium preview page exists and shows all 24 looks with their scores", () => {
  const fs = require("fs");
  const html = fs.readFileSync(require("path").join(__dirname, "..", "public", "premium-looks-preview.html"), "utf8");
  assert.equal((html.match(/<iframe /g) || []).length, 24);
  for (const l of P.allLooks()) assert.ok(html.includes(`title="${l.id}"`), l.id);
  assert.match(html, /meta name="robots" content="noindex"/);
  assert.ok(!/<script/i.test(html), "a static page, no scripts");
});
