// Run: node --test test/motion.test.js
// Scroll motion (lib/sections/motion.js + motion.css): reveals, stagger, counters, reduced motion, GSAP/Lenis wiring.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const A = require("../lib/sections/assemble");
const { SAMPLES } = require("../scripts/build-sections-preview");

const NOW = new Date(Date.UTC(2031, 5, 1));
const L = (label, href) => ({ label, href });
function build(motion, over = {}) {
  const s = SAMPLES.cafe;
  const content = {
    navbar: { brand: s.brand, links: s.links.map((l) => L(l, "#x")), cta_label: s.cta, cta_href: "#c" },
    hero: { headline: s.headline, subhead: s.subhead, cta1_label: s.cta, cta1_href: "#c" },
    features: { title: "Features", items: [1, 2, 3].map((n) => ({ icon: "check", title: "Feature " + n, text: "Text " + n })) },
    stats: { title: "In numbers", items: [{ value: "1,200+", label: "Customers" }, { value: "4.5", label: "Score" }, { value: "[Add number]", label: "Other" }] },
    faq: { title: "FAQ", items: [1, 2, 3, 4, 5, 6].map((n) => ({ question: "Q" + n, answer: "A" + n })) },
    footer: { brand: s.brand, link_groups: s.groups },
    ...over,
  };
  return A.assemble({ palette: "cafe", recipe: "landing", content, now: NOW, motion, variants: { stats: "a" } });
}

test("motion: off by default; the preview and plain pages carry no motion script or hiding CSS", () => {
  const r = build(undefined);
  assert.ok(!r.html.includes("g-motion") && !r.html.includes("IntersectionObserver"));
  assert.equal((r.html.match(/<script\b/g) || []).length, 1, "only the navbar script");
  assert.ok(!fs.readFileSync(path.join(__dirname, "..", "public", "sections-preview.html"), "utf8").includes("IntersectionObserver"));
});

test("motion: true adds the built-in engine inline (no external script); libs:true adds GSAP, ScrollTrigger and Lenis with exact versions", () => {
  const m = build(true);
  assert.equal((m.html.match(/<script\b/g) || []).length, 2);
  assert.ok(!/<script[^>]*\ssrc=/.test(m.html));
  assert.ok(m.html.includes(".g-motion [data-g-reveal]"));
  const f = build({ libs: true });
  const srcs = [...f.html.matchAll(/<script src="([^"]+)" defer>/g)].map((x) => x[1]);
  assert.equal(srcs.length, 3);
  for (const u of srcs) assert.match(u, /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/.*\d+\.\d+\.\d+/);
  assert.ok(f.html.indexOf(srcs[0]) < f.html.indexOf("IntersectionObserver"), "libraries load before the engine runs");
  assert.ok(!/javascript:|onload=|onerror=/.test(f.html));
});

test("motion: every motion hook in the templates is handled; CSS holds no colour values", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "lib", "sections", "motion.css"), "utf8");
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(css));
  assert.ok(!/!important/.test(css));
  assert.ok(css.includes(".g-motion") && !/^\[data-g-reveal\]/m.test(css), "nothing is hidden outside .g-motion");
});

async function withBrowser(t, fn) {
  let browser;
  try {
    browser = await require("playwright").chromium.launch();
  } catch {
    return t.skip("no chromium");
  }
  try {
    await fn(browser);
  } finally {
    await browser.close();
  }
}
const open = async (browser, html, { width = 1200, reduced = false, init } = {}) => {
  const ctx = await browser.newContext({ viewport: { width, height: 700 }, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
  // The published-site libraries come from a CDN. Tests must not depend on the network: where the CDN is reachable the
  // real GSAP/Lenis would replace the stand-ins below and the counts would be wrong. Serve every library as empty.
  await page.route(/^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//, (r) => r.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("http://gurost.test/**", (r) => r.fulfill({ contentType: "text/html", body: html }));
  await page.goto("http://gurost.test/", { waitUntil: "load" });
  return { page, ctx };
};
const hidden = (page) => page.evaluate(() => [...document.querySelectorAll("[data-g-reveal]")].filter((e) => Number(getComputedStyle(e).opacity) < 0.99).length);

test("motion: nothing is hidden without the script; with it, items below the fold wait and then arrive on scroll", async (t) => {
  await withBrowser(t, async (browser) => {
    const plain = await open(browser, build(undefined).html);
    assert.equal(await hidden(plain.page), 0);
    await plain.ctx.close();

    const { page, ctx } = await open(browser, build(true).html);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("g-motion")));
    await page.waitForTimeout(900);
    const faq = page.locator("#faq .g-faq__item").last();
    assert.equal(await faq.evaluate((e) => e.classList.contains("is-in")), false, "below the fold: still waiting");
    await faq.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    assert.ok(await faq.evaluate((e) => e.classList.contains("is-in") || !e.hasAttribute("data-g-reveal")));
    assert.ok(Number(await faq.evaluate((e) => getComputedStyle(e).opacity)) > 0.99);
    await ctx.close();
  });
});

test("motion: stagger index counts siblings; arrived items drop their reveal styling so hover lifts work", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build(true).html);
    const idx = await page.$$eval("#faq .g-faq__item", (els) => els.map((e) => e.style.getPropertyValue("--g-i")));
    assert.deepEqual(idx, ["0", "1", "2", "3", "4", "5"]);
    await page.locator("[data-gurost-section='features']").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    const left = await page.$$eval("[data-gurost-section='features'] [data-g-reveal]", (els) => els.length);
    assert.equal(left, 0, "reveal attribute removed after arrival");
    await ctx.close();
  });
});

test("motion: reduced motion or no IntersectionObserver means the engine never starts and nothing is hidden", async (t) => {
  await withBrowser(t, async (browser) => {
    const a = await open(browser, build(true).html, { reduced: true });
    assert.equal(await a.page.evaluate(() => document.documentElement.classList.contains("g-motion")), false);
    assert.equal(await hidden(a.page), 0);
    await a.ctx.close();
    const b = await open(browser, build(true).html, { init: () => { delete window.IntersectionObserver; } });
    assert.equal(await b.page.evaluate(() => document.documentElement.classList.contains("g-motion")), false);
    assert.equal(await hidden(b.page), 0);
    await b.ctx.close();
  });
});

test("motion: counters end on the exact text the owner wrote; non-numbers are untouched; screen readers get the final value", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build(true).html);
    await page.locator("[data-gurost-section='stats']").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2200);
    const vals = await page.$$eval(".g-stats__value", (els) => els.map((e) => ({ text: e.textContent.trim(), hidden: e.querySelector('[aria-hidden="true"]') ? e.querySelector('[aria-hidden="true"]').textContent : null, sr: e.querySelector(".g-sr-only") ? e.querySelector(".g-sr-only").textContent : null })));
    assert.equal(vals[0].hidden, "1,200+");
    assert.equal(vals[0].sr, "1,200+");
    assert.equal(vals[1].hidden, "4.5");
    assert.equal(vals[2].hidden, null, "a placeholder is left alone");
    assert.match(vals[2].text, /\[Add number\]/);
    await ctx.close();
  });
});

test("motion: a jump link past earlier sections shows them at once (no hidden content above the target)", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build(true).html);
    await page.evaluate(() => document.querySelector("#faq").scrollIntoView());
    await page.waitForTimeout(300);
    const above = await page.$$eval("[data-gurost-section='features'] [data-g-reveal], [data-gurost-section='stats'] [data-g-reveal]", (els) => els.every((e) => e.classList.contains("is-in") || !e.hasAttribute("data-g-reveal")));
    assert.ok(above);
    await ctx.close();
  });
});

test("motion: no horizontal overflow at 375px with motion on", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build(true).html, { width: 375 });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, w: window.innerWidth }));
    assert.ok(m.s <= m.w, `${m.s} > ${m.w}`);
    await ctx.close();
  });
});

const stubs = () => {
  window.__calls = { fromTo: 0, reg: 0, tick: 0, lenis: null, lenisRaf: 0 };
  window.ScrollTrigger = { update() {} };
  window.gsap = {
    registerPlugin() { window.__calls.reg++; },
    fromTo(el, from, to) { window.__calls.fromTo++; window.__calls.last = { from, to }; el.style.opacity = "1"; if (to.scrollTrigger && to.scrollTrigger.onEnter) to.scrollTrigger.onEnter(); },
    ticker: { add(fn) { window.__calls.tick++; }, lagSmoothing() {} },
  };
  window.Lenis = function (o) { window.__calls.lenis = o; this.on = () => {}; this.raf = () => { window.__calls.lenisRaf++; }; };
};

test("motion: with GSAP and Lenis present the engine uses them (stand-ins; the real libraries run only on a published site)", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build({ libs: true }).html, { init: stubs });
    const c = await page.evaluate(() => ({ calls: window.__calls, cls: document.documentElement.className }));
    assert.ok(c.calls.fromTo >= 10, "one tween per reveal element");
    assert.equal(c.calls.reg, 1);
    assert.equal(c.calls.tick, 1);
    assert.equal(c.calls.lenis.anchors, true);
    assert.match(c.cls, /g-gsap/);
    assert.match(c.cls, /g-lenis/);
    assert.equal(c.calls.last.to.clearProps, "opacity,transform");
    await ctx.close();
  });
});

test("motion: if GSAP throws, the page falls back to fully visible content", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build({ libs: true }).html, { init: () => { window.ScrollTrigger = {}; window.gsap = { registerPlugin() { throw new Error("boom"); } }; } });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("g-motion")), false);
    assert.equal(await hidden(page), 0);
    await ctx.close();
  });
});

test("motion: Lenis alone (no GSAP) runs its own frame loop", async (t) => {
  await withBrowser(t, async (browser) => {
    const { page, ctx } = await open(browser, build({ libs: true }).html, { init: () => { window.Lenis = function (o) { window.__o = o; this.on = () => {}; this.raf = () => { window.__raf = (window.__raf || 0) + 1; }; }; } });
    await page.waitForTimeout(200);
    assert.ok((await page.evaluate(() => window.__raf)) > 2);
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains("g-lenis")));
    await ctx.close();
  });
});
