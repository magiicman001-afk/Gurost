// Run: node --test test/quality-gate.test.js
// Mutation style: every rule has a bad fixture that MUST fail and the good fixtures MUST pass.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const G = require("../lib/sections/quality-gate");
const A = require("../lib/sections/assemble");
const R = require("../lib/sections/render");
const { SAMPLES } = require("../scripts/build-sections-preview");

const NOW = new Date(Date.UTC(2031, 5, 1));
const PALETTES = Object.keys(R.palettes.palettes);
const PHOTO = "https://cdn.pixabay.com/photo/2020/01/01/bread.jpg";
const L = (label, href) => ({ label, href });

function input(p, over = {}) {
  const s = SAMPLES[p];
  const content = {
    navbar: { brand: s.brand, links: s.links.map((l) => L(l, "#" + l.toLowerCase().replace(/\W+/g, "-"))), cta_label: s.cta, cta_href: "#contact", phone: s.phone },
    hero: { eyebrow: s.eyebrow, headline: s.headline, subhead: s.subhead, cta1_label: s.cta, cta1_href: "#contact", image: PHOTO, image_brief: "Photo", image_alt: "A photo", trust_line: s.trust },
    footer: { brand: s.brand, tagline: s.tagline, link_groups: s.groups, address: s.address, phone: s.phone, email: s.email, hours: s.hours },
  };
  return { palette: p, content, now: NOW, ...over };
}
const rules = (list) => list.map((f) => f.rule);
const frag = (html) => G.checkStatic(html, { now: NOW });
const NOBROWSER = { browserChecks: false, impeccable: false };

let browser;
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

// ---------------------------------------------------------------- good fixtures pass
for (const p of PALETTES)
  test(`gate: the assembled ${p} page passes every check (static and browser)`, async (t) => {
    const page = A.assemble(input(p, { includeBranding: true }));
    const g = await G.gate(page, { now: NOW, browser: browser || undefined, impeccable: false });
    assert.deepEqual(g.failures, []);
    assert.equal(g.ok, true);
    if (!browser) t.diagnostic("browser checks skipped: " + g.skipped.join(","));
  });

// ---------------------------------------------------------------- static mutations
const BAD = {
  "leftover-slot": "<p>{{headline}}</p>",
  lorem: "<p>Lorem ipsum dolor sit amet</p>",
  "fake-fact:price £": "<p>Cakes from £12</p>",
  "fake-fact:price $": "<p>Only $5 a loaf</p>",
  "fake-fact:price words": "<p>Just 20 pounds</p>",
  "fake-fact:rating stars": "<p>Rated 4.9 stars</p>",
  "fake-fact:rating /5": "<p>4.8/5 on reviews</p>",
  "fake-fact:rating glyphs": "<p>★★★★★</p>",
  "fake-fact:count": "<p>Trusted by 500+ customers</p>",
  "fake-fact:since": "<p>Serving Leeds since 1998</p>",
  "fake-fact:years": "<p>Over 20 years of experience</p>",
  "fake-fact:copyright": "<p>© 1999 Luvky</p>",
  "unfilled-image": '<img src="IMG_3" alt="x">',
  "unfilled-image:empty": '<img src="" alt="x">',
  "img-alt": '<img src="https://cdn.pixabay.com/a.jpg">',
  "bare-icon-name:snake": "<a>dark_mode</a>",
  "bare-icon-name:upper": "<a>DARK_MODE</a>",
  "bare-icon-name:ligature": '<span class="material-symbols-outlined">menu_open</span>',
};
for (const [name, html] of Object.entries(BAD))
  test(`gate mutation: "${name}" is rejected`, () => {
    const rule = name.split(":")[0];
    const hits = frag(html).filter((f) => f.severity === "fail");
    assert.ok(rules(hits).includes(rule), `${name} -> ${JSON.stringify(frag(html))}`);
  });

test("gate mutation: the Bug X page (Luvky | DARK_MODE | menu) is rejected, the fixed one passes", () => {
  assert.ok(rules(frag('<nav><a>Luvky</a><span>DARK_MODE</span><button>☰</button></nav>')).includes("bare-icon-name"));
  assert.deepEqual(frag('<nav><a>Luvky</a><button aria-label="Dark mode"><svg aria-hidden="true"></svg></button></nav>').filter((f) => f.severity === "fail"), []);
});

test("gate: honest text is not a false positive (addresses, phones, current year, normal words)", () => {
  assert.deepEqual(frag("<p>0121 496 0000</p><a>jobs@brightspark.example</a>").filter((f) => f.severity === "fail"), [], "a phone number next to an email is not a job count");
  assert.ok(frag("<p>Over 1,200 jobs done</p>").some((f) => f.rule === "fake-fact"));
  const ok = "<p>12 High Street, Leeds LS1 1AA. Call 0113 496 0000. © 2031 Luvky. Open menu. Our story. Mon to Sat 7am to 4pm. Home_page</p>";
  assert.deepEqual(frag(ok).filter((f) => f.severity === "fail"), []);
  assert.deepEqual(frag("<p>menu</p><a>Book now</a><span>star</span><b>phone</b>").filter((f) => f.severity === "fail"), []);
});

test("gate: facts the owner supplied are allowed through; invented ones are not", () => {
  const html = "<p>Cakes from £12 since 1998</p>";
  assert.equal(G.checkStatic(html, { now: NOW, facts: ["Birthday cakes from £12", "Baking since 1998"] }).filter((f) => f.severity === "fail").length, 0);
  assert.ok(G.checkStatic(html, { now: NOW, facts: ["Birthday cakes from £12"] }).some((f) => /year/.test(f.detail)));
});

test("gate: dead links are warnings (href='#', anchors with no section), not failures", () => {
  const w = G.checkStatic('<a href="#">x</a><a href="#nowhere">y</a><a href="#here">z</a><section id="here"></section>', { now: NOW, ids: ["here"] });
  assert.ok(w.length === 2 && w.every((f) => f.rule === "dead-link" && f.severity === "warn"));
});

test("gate: placeholders the owner still has to fill are listed, not failed", async () => {
  const page = A.assemble({ palette: "law", content: {}, now: NOW });
  const g = await G.gate(page, { now: NOW, ...NOBROWSER });
  assert.ok(g.ok);
  assert.ok(g.placeholders.length > 0 && g.placeholders.every((x) => x.startsWith("[Add ")));
});

test("gate mutation: a palette with a failing contrast pair is rejected", () => {
  assert.deepEqual(G.checkPalette("cafe"), []);
  const c = R.palettes.palettes.cafe.colors;
  const old = c.muted;
  try {
    c.muted = "#CCCCCC";
    assert.ok(G.checkPalette("cafe").some((f) => f.rule === "palette-contrast" && /muted/.test(f.detail)));
  } finally {
    c.muted = old;
  }
  const d = R.palettes.palettes.law.colors;
  const od = d["on-dark"];
  try {
    d["on-dark"] = "#999999";
    assert.ok(G.checkPalette("law").some((f) => /scrim/.test(f.detail)));
  } finally {
    d["on-dark"] = od;
  }
});

// ---------------------------------------------------------------- browser mutations
test("gate mutation (browser): overflow at 375px and low text contrast are rejected, with the section named", async (t) => {
  if (!browser) return t.skip("no chromium");
  const page = A.assemble(input("cafe"));
  const wide = page.html.replace('<main id="main">', '<main id="main"><div class="g-hero__x" style="width:700px">wide</div>');
  const b1 = await G.checkBrowser(wide, { browser });
  assert.ok(b1.failures.some((f) => f.rule === "overflow-375"), JSON.stringify(b1));
  const pale = page.html.replace("</style>", ".g-hero__sub{color:#cccccc}</style>");
  const b2 = await G.checkBrowser(pale, { browser });
  const hit = b2.failures.find((f) => f.rule === "text-contrast");
  assert.ok(hit && hit.section === "hero", JSON.stringify(b2));
  const ok = await G.checkBrowser(page.html, { browser });
  assert.deepEqual(ok.failures, []);
});

// ---------------------------------------------------------------- fallbacks
test("buildWithGate: a good build ships untouched", async () => {
  const r = await G.buildWithGate(input("cafe"), { now: NOW, browser: browser || undefined, impeccable: false });
  assert.deepEqual(r.steps, []);
  assert.equal(r.degraded, false);
  assert.equal(r.gate.ok, true);
});

test("buildWithGate: a variant that fails is swapped for one that passes (free, content unchanged)", async () => {
  const bad = (part) => (part.id === "footer" && part.variant === "a" ? [{ rule: "test-mutation", detail: "footer A rejected" }] : []);
  const r = await G.buildWithGate(input("cafe"), { now: NOW, ...NOBROWSER, extraChecks: bad });
  assert.deepEqual(r.steps, [{ step: "swap-variant", id: "footer", from: "a", to: "b" }]);
  assert.equal(r.sections.find((s) => s.id === "footer").variant, "b");
  assert.equal(r.degraded, false);
  assert.ok(r.gate.ok);
});

test("buildWithGate: content that fails in every variant gets that section's default content, the rest is kept", async () => {
  const i = input("cafe");
  i.content.hero.subhead = "Loved by 500+ customers, rated 4.9 stars, from £3";
  const r = await G.buildWithGate(i, { now: NOW, ...NOBROWSER });
  assert.ok(r.steps.some((s) => s.step === "default-content" && s.id === "hero"));
  assert.ok(r.html.includes("[Add your headline]"));
  assert.ok(r.html.includes(SAMPLES.cafe.brand), "navbar and footer kept their real content");
  assert.ok(!/500\+|4\.9 stars|£3/.test(r.html));
  assert.equal(r.degraded, true);
  assert.equal(r.gate.ok, true);
  assert.equal(r.shipped, true);
});

test("buildWithGate: the owner's own facts are not treated as inventions", async () => {
  const i = input("cafe");
  i.content.hero.subhead = "Birthday cakes from £12, baking since 1998.";
  const r = await G.buildWithGate(i, { now: NOW, ...NOBROWSER, facts: ["Birthday cakes from £12", "Baking since 1998"] });
  assert.deepEqual(r.steps, []);
  assert.ok(r.html.includes("£12"));
});

test("buildWithGate: it never dies (bad palette still ships a plain page)", async () => {
  const r = await G.buildWithGate({ palette: "does-not-exist", content: {}, now: NOW }, { now: NOW, ...NOBROWSER });
  assert.equal(r.shipped, true);
  assert.equal(r.degraded, true);
  assert.equal(r.steps[0].step, "emergency-default");
  assert.match(r.html, /^<!doctype html>/);
});

test("buildWithGate: a failure with no section (page level) falls back to all default content", async () => {
  const c = R.palettes.palettes.salon.colors;
  const old = c.muted;
  try {
    c.muted = "#DDDDDD";
    const r = await G.buildWithGate(input("salon"), { now: NOW, ...NOBROWSER });
    assert.ok(r.steps.some((s) => s.step === "all-default-content"));
    assert.equal(r.shipped, true);
    assert.equal(r.gate.ok, false, "the palette itself is broken: ship, but say so");
  } finally {
    c.muted = old;
  }
});

// ---------------------------------------------------------------- Impeccable (advisory)
test("gate: Impeccable findings are warnings, never failures; a missing detector is reported as skipped", async () => {
  const page = A.assemble(input("cafe"));
  const none = await G.gate(page, { now: NOW, browserChecks: false });
  assert.ok(none.skipped.some((s) => s.startsWith("impeccable")));
  const fake = path.join(os.tmpdir(), `fake-impeccable-${process.pid}.js`);
  fs.writeFileSync(fake, 'console.log(JSON.stringify([{antipattern:"tight-leading",name:"Tight line height",snippet:"line-height 1.28x",severity:"warning"},{antipattern:"tight-leading",name:"Tight line height",snippet:"line-height 1.28x"}])); process.exit(2);');
  try {
    const g = await G.gate(page, { now: NOW, browserChecks: false, impeccableCli: fake });
    assert.equal(g.ok, true);
    assert.deepEqual(g.warnings.filter((w) => w.rule.startsWith("impeccable")).map((w) => w.rule), ["impeccable:tight-leading"], "duplicates collapse");
    assert.ok(!g.skipped.some((s) => s.startsWith("impeccable")));
  } finally {
    fs.rmSync(fake, { force: true });
  }
});
