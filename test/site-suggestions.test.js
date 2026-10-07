// Run: node --test test/site-suggestions.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const S = require("../lib/site-suggestions");

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse("2026-10-07T12:00:00Z");
const page = (body, head = "") => `<!DOCTYPE html><html><head><title>Crumb</title>${head}</head><body>${body}</body></html>`;
const proj = (html, extra = {}) => ({ type: "website", currentHtml: html, ...extra });
const ids = (list) => list.map((s) => s.id);

// A thin page: a heading and a paragraph, nothing else - every idea is missing.
const THIN = page('<header><nav><a href="#top">Crumb</a></nav></header><main><section><h1>Crumb &amp; Co</h1><p>Bread.</p></section></main>');

// One section for each idea, so a page with all of them should get no suggestions.
const SECTIONS = {
  cta: '<a href="#order" class="btn">Order now</a>',
  "contact-details": '<section id="contact"><h2>Visit us</h2><p>Opening hours: Mon-Sat 7-4. Find us at 42 Stokes Croft.</p></section>',
  testimonials: '<section id="testimonials"><h2>Kind words</h2><p>"Best loaf in the city"</p></section>',
  about: '<section id="about"><h2>Our story</h2><p>Three generations.</p></section>',
  faq: '<section id="faq"><h2>Common questions</h2><p>Do you deliver?</p></section>',
  pricing: '<section id="menu"><h2>The menu</h2><p>Loaf from £4.</p></section>',
  gallery: '<section id="gallery"><h2>Gallery</h2><img src="a.jpg"></section>',
  newsletter: '<section><h2>Stay in touch</h2><form><input type="email"><button>Send</button></form></section>'
};
const full = (without = []) => page(`<main><section><h1>Crumb</h1>${without.includes("cta") ? "" : SECTIONS.cta}</section>${Object.entries(SECTIONS).filter(([k]) => k !== "cta" && !without.includes(k)).map(([, v]) => v).join("")}</main>`);

test("a thin page gets the three most useful ideas, in order, with friendly text and a ready instruction", () => {
  const got = S.pick(proj(THIN));
  assert.deepEqual(ids(got), ["cta", "contact-details", "testimonials"]);
  for (const s of got) {
    assert.ok(s.title && s.text.length > 20 && s.instruction.length > 20, s.id);
    assert.deepEqual(Object.keys(s).sort(), ["id", "instruction", "text", "title"]);
  }
});

test("never more than 3, even if asked for more", () => {
  assert.equal(S.pick(proj(THIN), { max: 50 }).length, 3);
  assert.equal(S.pick(proj(THIN), { max: 1 }).length, 1);
  assert.equal(S.MAX, 3);
});

test("a page that already has every section gets no suggestions", () => {
  assert.deepEqual(S.pick(proj(full())), []);
});

test("each of the eight ideas is offered when its section is missing, and only that one", () => {
  for (const id of Object.keys(SECTIONS)) {
    const missingOnly = ids(S.pick(proj(full([id]))));
    assert.deepEqual(missingOnly, [id], `${id}: expected only ${id}, got ${missingOnly}`);
  }
  assert.equal(S.CATALOG.length, 8);
});

test("instructions never ask Pulse to invent reviews, names or prices", () => {
  const byId = Object.fromEntries(S.CATALOG.map((c) => [c.id, c.instruction]));
  assert.match(byId.testimonials, /example|placeholder/i);
  assert.match(byId.testimonials, /do not invent/i);
  assert.match(byId.pricing, /placeholder/i);
  assert.match(byId.pricing, /do not invent/i);
});

test("company details that include an address count as hours/address being covered", () => {
  const withInfo = ids(S.pick(proj(THIN, { businessInfo: { name: "Crumb", address: "42 Stokes Croft, Bristol" } })));
  assert.ok(!withInfo.includes("contact-details"));
  assert.ok(ids(S.pick(proj(THIN, { businessInfo: { name: "Crumb" } }))).includes("contact-details"));
});

test("words only inside scripts, styles or comments do not count as a section", () => {
  const base = full(["testimonials", "faq", "newsletter"]);
  const sneaky = base.replace("</head>", "<style>.testimonials,.faq{color:red}</style></head>").replace("<main>", "<main><!-- testimonials faq subscribe -->") + '<script>var s = "testimonials faq newsletter subscribe";</script>';
  assert.deepEqual(ids(S.pick(proj(sneaky))).sort(), ["faq", "newsletter", "testimonials"]);
});

test("apps, empty projects and rubbish never throw and show nothing", () => {
  assert.deepEqual(S.pick({ type: "app", currentHtml: THIN }), []);
  assert.deepEqual(S.pick({ type: "website" }), []);
  for (const bad of [null, undefined, 5, "x", [], {}, { currentHtml: 7 }, { currentHtml: THIN, suggestionLog: "junk" }]) assert.doesNotThrow(() => S.pick(bad));
});

test("'Maybe later': hidden for 7 days, back on day 8; the next idea takes its place", () => {
  const p = proj(THIN);
  assert.deepEqual(S.respond(p, "cta", "skipped", T0), { ok: true });
  assert.deepEqual(ids(S.pick(p, { now: T0 + 1000 })), ["contact-details", "testimonials", "about"], "replaced, still 3");
  assert.ok(!ids(S.pick(p, { now: T0 + 6 * DAY + 23 * 3600e3 })).includes("cta"), "still hidden just before 7 days");
  assert.equal(ids(S.pick(p, { now: T0 + 7 * DAY + 1 }))[0], "cta", "offered again after 7 days");
});

test("accepted ideas are not offered again for 7 days either", () => {
  const p = proj(THIN);
  S.respond(p, "testimonials", "accepted", T0);
  assert.ok(!ids(S.pick(p, { now: T0 + 2 * DAY })).includes("testimonials"));
  assert.ok(ids(S.pick(p, { now: T0 + 8 * DAY })).includes("testimonials"), "if it is still missing a week later, it can come back");
});

test("accepts and skips are counted per idea and in total", () => {
  const p = proj(THIN);
  S.respond(p, "faq", "skipped", T0);
  S.respond(p, "faq", "skipped", T0 + 8 * DAY);
  S.respond(p, "faq", "accepted", T0 + 16 * DAY);
  S.respond(p, "about", "skipped", T0);
  const st = S.stats(p);
  assert.equal(st.accepted, 1);
  assert.equal(st.skipped, 3);
  assert.deepEqual({ a: st.byIdea.faq.accepted, s: st.byIdea.faq.skipped, last: st.byIdea.faq.status }, { a: 1, s: 2, last: "accepted" });
  assert.equal(st.byIdea.about.skipped, 1);
});

test("bad answers are refused and change nothing", () => {
  const p = proj(THIN);
  assert.equal(S.respond(p, "nonsense", "skipped").ok, false);
  assert.equal(S.respond(p, "faq", "maybe").ok, false);
  assert.equal(S.respond(p, "faq", undefined).ok, false);
  assert.equal(p.suggestionLog, undefined);
});

test("older projects (no log) and damaged logs work; unknown ideas and bad times are dropped", () => {
  assert.equal(S.pick(proj(THIN, { suggestionLog: undefined })).length, 3);
  assert.equal(S.pick(proj(THIN, { suggestionLog: null })).length, 3);
  const messy = { cta: { status: "skipped", at: "not a time" }, ghost: { status: "skipped", at: T0 }, faq: 7, testimonials: { status: "weird", at: T0, accepted: -4, skipped: "x" } };
  const clean = S.cleanLog(messy);
  assert.deepEqual(Object.keys(clean), ["testimonials"]);
  assert.deepEqual(clean.testimonials, { status: "skipped", at: T0, accepted: 0, skipped: 0 });
  assert.deepEqual(S.cleanLog([]), {});
  assert.deepEqual(S.cleanLog("x"), {});
});

test("answering does not change the page or other ideas' history", () => {
  const p = proj(THIN);
  S.respond(p, "faq", "skipped", T0);
  const before = JSON.stringify(p.suggestionLog.faq);
  S.respond(p, "about", "accepted", T0 + 1);
  assert.equal(JSON.stringify(p.suggestionLog.faq), before);
  assert.equal(p.currentHtml, THIN);
});

test("false-positive sweep: realistic pages that already cover an idea under another name are not nagged", () => {
  const cafe = page('<header><a href="#book">Reserve a table</a></header><section id="visit"><h2>Where to find us</h2><p>Opening hours Mon-Fri</p></section><section><h2>What our guests say</h2></section><section><h2>Meet the team</h2></section><section><h2>Questions &amp; answers</h2></section><section><h2>Our prices</h2></section><section><h2>Portfolio</h2></section><section><p>Join our mailing list</p></section>');
  assert.deepEqual(S.pick(proj(cafe)), []);
});

test("server and storage are wired: routes, persistence and the widget", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const server = read("server.js");
  assert.match(server, /app\.get\("\/api\/project\/:id\/suggestions"/);
  assert.match(server, /app\.post\("\/api\/project\/:id\/suggestions\/:sid\/respond", security\.rejectUnknownFields\(\["action"\]\)/);
  assert.match(server, /siteSuggestions\.respond\(project, req\.params\.sid/);
  const state = read("project-state.js");
  assert.equal((state.match(/suggestionLog/g) || []).length >= 2, true, "saved and restored");
  const widget = read("public/shared/pulse-widget.js");
  assert.match(widget, /\/suggestions\/\$\{encodeURIComponent\(id\)\}\/respond/);
  assert.match(widget, /Maybe later/);
  assert.match(widget, /slice\(0, 3\)/);
  assert.match(widget, /onWebsiteBuilder/);
});
