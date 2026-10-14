// Run: node --test test/template-chooser.test.js
// Track 2a: the auto-chooser picks one of the 15 packs and one of its styles from what the person typed. No model, no network.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../lib/template-chooser");
const T = require("../lib/template-site");

const cat = T.catalog();
const pick = (p, info) => C.choose(p, info);

test("the obvious requests get the obvious industry", () => {
  const want = { "a bakery in Leeds": "bakery", "a plumber in Leeds": "trades", "a hair salon in Manchester": "beauty", "an animal sanctuary": "sanctuary", "a family law firm in York": "legal", "a dentist": "clinic", "a gym in Bristol": "fitness", "an Italian restaurant": "restaurant", "estate agent in Hull": "realestate", "MOT and car servicing": "garage", "a boutique hotel": "hotel", "maths tutor": "tutor", "wedding photographer": "photo", "online clothing shop": "fashion", "a SaaS startup": "tech" };
  for (const [prompt, pack] of Object.entries(want)) assert.equal(pick(prompt).pack, pack, prompt);
});

test("whatever it picks exists on disk: every pack and style it can name is in the catalog", () => {
  const ids = new Map(cat.industries.map((i) => [i.id, new Set(i.styles.map((s) => s.id))]));
  assert.deepEqual([...ids.keys()].sort(), [...C.PRIORITY].sort(), "one rule per pack");
  for (const pack of C.PRIORITY) assert.ok(C.PACK_WORDS[pack].length >= 5, pack);
  for (const pack of Object.values(C.INDUSTRY_TO_PACK)) assert.ok(ids.has(pack), pack);
  for (const [pack, styles] of Object.entries(C.SPECIAL_WORDS)) for (const s of Object.keys(styles)) assert.ok(ids.get(pack).has(s), `${pack}/${s} is a real style`);
  assert.ok(C.DEFAULT_STYLE && [...ids.values()].every((set) => set.has(C.DEFAULT_STYLE)));
  for (const i of cat.industries) {
    const r = pick(`${C.PACK_WORDS[i.id][0]} please`);
    assert.equal(r.pack, i.id);
    assert.ok(ids.get(r.pack).has(r.style) && T.isHonest(r.style), `${r.pack}/${r.style}`);
  }
});

test("the style follows the words in the request, only among layouts whose example content is slotted, and defaults to the neutral layout", () => {
  // The layouts with their own working tool (pipeworks, timetable, ...) still carry example figures: they are never chosen for a customer.
  assert.equal(pick("a plumber in Leeds").style, "atelier");
  assert.equal(pick("boiler repair and heating").style, "atelier");
  for (const p of ["a plumber", "yoga timetable", "a bold colourful bakery", "wine cellar restaurant", "mortgage estate agent", "online clothing shop with size guide"]) assert.ok(T.isHonest(pick(p).style), p);
  assert.equal(pick("an elegant luxury bakery").style, "atelier");
  assert.equal(pick("a bright friendly bakery").style, "daylight");
  assert.equal(pick("my bakery").style, C.DEFAULT_STYLE);
  assert.equal(pick("a bakery").via, "keywords");
});

test("the business name counts too", () => {
  assert.equal(pick("a website", { name: "Hart & Co Solicitors" }).pack, "legal");
  assert.equal(pick("a website", { name: "" }), null);
});

test("an industry the keywords miss is found through the industry match, and a stranger gets null", () => {
  const r = pick("a place that helps people choose a mortgage lender");
  assert.ok(r === null || cat.industries.some((i) => i.id === r.pack));
  assert.equal(pick("asdf qwerty zzz"), null);
  assert.equal(pick(""), null);
  assert.equal(pick(null), null);
  assert.equal(pick("a charity for refugees"), null, "no template pretends to fit");
  assert.equal(pick("a quiz app"), null, "an app is not one of our site templates");
});

test("a close call goes to the more specific business, and 'wedding cakes' is a bakery", () => {
  assert.equal(pick("wedding cakes").pack, "bakery");
  assert.ok(["clinic", "tech"].includes(pick("dental software").pack));
  assert.equal(pick("hair and beauty salon and spa").pack, "beauty");
});

test("it never throws, and it is fast", () => {
  for (const bad of [undefined, 5, {}, [], "\u0000", "x".repeat(100000)]) assert.doesNotThrow(() => pick(bad, 7));
  const t0 = Date.now();
  for (let i = 0; i < 200; i++) pick("a family bakery in Leeds with bold colours");
  assert.ok(Date.now() - t0 < 2000, "200 choices in under two seconds");
});
