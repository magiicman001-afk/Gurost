// Run: node --test test/site-multipage.test.js
// Bug U: a library site is real pages with real links, forms that submit, and working deep links / back / refresh.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const L = require("../bots/library-bot");
const S = require("../lib/sections/site");
const SB = require("../lib/sandbox-link");
const { buildSite } = require("../lib/site-pages");

const MODEL = {
  brand: "Luvky Bakes",
  description: "Small-batch sourdough, cakes and pastries.",
  sections: {
    hero: { headline: "Fresh bread, baked every morning", subhead: "Sourdough, cakes and pastries made by hand.", cta1_label: "Order now", image_brief: "sourdough loaves" },
    services: { title: "What we bake", items: [{ icon: "heart", title: "Birthday Cake", text: "Made to order for your day." }, { icon: "leaf", title: "Sourdough", text: "Slow-fermented loaves." }, { icon: "sparkle", title: "Pastries", text: "Butter and flour." }, { icon: "check", title: "Birthday cake!", text: "A second cake page." }] },
    about: { title: "Our kitchen", body: "A small neighbourhood bakery.", image_brief: "baker shaping dough" },
    process: { title: "How ordering works", steps: [{ title: "Tell us", text: "Send a message." }, { title: "We bake", text: "Fresh for you." }] },
    faq: { title: "Questions", items: [{ question: "Do you do custom cakes?", answer: "Yes, ask us." }] },
    cta: { title: "Come and say hello", cta1_label: "Visit" },
  },
};
const INFO = { name: "Luvky Bakes", phone: "0113 496 0000", email: "hi@luvky.example", address: "12 High Street, Leeds" };
const search = async (q) => ({ url: "https://cdn.pixabay.com/photo/" + encodeURIComponent(q) + ".jpg", credit: "Pixabay" });

async function cafeProject() {
  const out = await L.generateLibraryVariants("a bakery and cafe in Leeds", { businessInfo: INFO, callModel: async () => MODEL, search, browserChecks: false });
  const v = out.variants.find((x) => x.id === "minimal");
  return { currentHtml: v.html, site: v.site, businessInfo: INFO, variants: out.variants };
}

test("planSite: real pages, item pages from the services, cafe says menu", async () => {
  const p = await cafeProject();
  const plan = S.planSite(p.site, "");
  const paths = plan.pages.map((x) => x.path);
  assert.deepEqual(paths.slice(0, 3), ["/", "/menu", "/menu/birthday-cake"]);
  assert.ok(paths.includes("/menu/birthday-cake-2"), "duplicate titles get their own page");
  for (const want of ["/about", "/contact", "/booking", "/menu/sourdough", "/menu/pastries"]) assert.ok(paths.includes(want), want);
});

test("renderSite: no link on any page is an in-page anchor except the skip link; every internal link is a real page", async () => {
  const p = await cafeProject();
  const base = "/builder/sandbox/00000000-0000-0000-0000-000000000000/tok";
  const r = S.renderSite(p.site, { base, formEndpoint: "https://x.test/api/site-forms/p" });
  const keys = new Set(Object.keys(r.pages).map((k) => base + (k === "/" ? "" : k)));
  for (const [path, html] of Object.entries(r.pages)) {
    for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
      const h = m[1].replace(/&amp;/g, "&");
      if (/^(tel:|mailto:|https?:)/.test(h)) continue;
      if (h === "#main") continue; // the skip link is the one allowed anchor
      assert.ok(!h.startsWith("#"), `${path}: anchor link ${h}`);
      const target = h.split("?")[0].split("#")[0].replace(/(.)\/$/, "$1");
      assert.ok(keys.has(target), `${path}: ${h} goes nowhere`);
    }
  }
});

test("renderSite: pages carry their own title, one h1, the form only where it belongs", async () => {
  const p = await cafeProject();
  const r = S.renderSite(p.site, { base: "", formEndpoint: "https://x.test/api/site-forms/p" });
  for (const [path, html] of Object.entries(r.pages)) {
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path + " h1");
    assert.doesNotMatch(html, /IMG_\d|\{\{/, path);
    assert.equal(/data-form-kind/.test(html), path === "/contact" || path === "/booking", path + " form");
  }
  assert.match(r.pages["/about"], /<title>About \| Luvky Bakes<\/title>/);
  assert.match(r.pages["/contact"], /data-form-kind="contact"/);
  assert.match(r.pages["/booking"], /data-form-kind="booking"/);
});

test("pageKey and servePage: odd paths are normalised or refused; unknown pages are a real 404 with the site's navbar", async () => {
  assert.equal(S.pageKey("/About/"), "/about");
  assert.equal(S.pageKey("/menu/pastries.html?x=1"), "/menu/pastries");
  assert.equal(S.pageKey("/../etc/passwd"), null);
  assert.equal(S.pageKey("/%2e%2e/x"), null);
  const p = await cafeProject();
  const rendered = S.renderSite(p.site, { base: "/b" });
  const nf = S.servePage(rendered, p.site, "/nope");
  assert.equal(nf.status, 404);
  assert.match(nf.html, /Page not found/);
  assert.match(nf.html, /href="\/b\/menu"/);
  assert.equal(S.servePage(rendered, p.site, "/about").status, 200);
});

test("sandbox links: signed, expiring, tied to the project", () => {
  const env = { SANDBOX_LINK_SECRET: "s".repeat(32) };
  const T0 = 1_900_000_000_000;
  const t = SB.makeToken("p1", T0, env);
  assert.ok(SB.verifyToken("p1", t, T0 + 500, env));
  assert.ok(!SB.verifyToken("p2", t, T0 + 500, env), "other project");
  assert.ok(!SB.verifyToken("p1", t, T0 + SB.TTL_MS + 5000, env), "expired");
  assert.ok(!SB.verifyToken("p1", t.slice(0, -1) + "x", T0 + 500, env), "tampered");
  assert.ok(!SB.verifyToken("p1", "garbage", T0 + 500, env));
  assert.ok(!SB.verifyToken("p1", t, T0 + 500, { SANDBOX_LINK_SECRET: "o".repeat(32) }), "other secret");
});

test("an edited site falls back to the edited HTML, never an old copy", async () => {
  const p = await cafeProject();
  assert.ok(SB.isFresh(p));
  const edited = { ...p, currentHtml: p.currentHtml.replace("Fresh bread", "Warm bread") };
  assert.ok(!SB.isFresh(edited));
  const out = SB.serve(edited, "/", { base: "/b", buildSite });
  assert.match(out.body, /Warm bread/);
});

// ---------------------------------------------------------------- real browser
test("browser: every nav, button and footer link opens a real page; forms submit; deep link, back and refresh work", async (t) => {
  let browser;
  try {
    browser = await require("playwright").chromium.launch();
  } catch {
    return t.skip("no chromium");
  }
  const project = await cafeProject();
  const id = "11111111-2222-3333-4444-555555555555";
  const token = SB.makeToken(id);
  const base = `/builder/sandbox/${id}/${token}`;
  const posts = [];
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === `/api/site-forms/${id}`) {
      let b = "";
      req.on("data", (d) => (b += d));
      req.on("end", () => { posts.push(JSON.parse(b)); res.setHeader("content-type", "application/json"); res.end('{"ok":true}'); });
      return;
    }
    if (req.url.startsWith(base)) {
      const rel = req.url.slice(base.length) || "/";
      const out = SB.serve(project, rel, { base, formEndpoint: `http://127.0.0.1:${server.address().port}/api/site-forms/${id}`, buildSite });
      res.writeHead(out.status, { "content-type": out.type });
      return res.end(out.body);
    }
    res.writeHead(404).end("no");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
  // fonts and photos live on other hosts: not needed for navigation
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(origin + base + "/");
    const here = () => new URL(page.url()).pathname.slice(base.length) || "/";
    assert.equal(await page.title(), "Luvky Bakes: Fresh bread, baked every morning");

    // 1 + 2 + 3: collect every internal link on every page, click each one, and land on a real 200 page
    const seen = new Set(["/"]);
    const queue = ["/"];
    let clicked = 0;
    while (queue.length) {
      const cur = queue.shift();
      await page.goto(origin + base + (cur === "/" ? "/" : cur));
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
      for (const raw of [...new Set(hrefs)]) {
        if (/^(tel:|mailto:|https?:|#)/.test(raw)) continue;
        assert.ok(raw.startsWith(base), `${cur}: ${raw} is not under the site`);
        const resp = await page.goto(origin + raw);
        clicked++;
        assert.equal(resp.status(), 200, `${cur} -> ${raw}`);
        const key = (raw.slice(base.length) || "/").split("?")[0];
        if (!seen.has(key)) { seen.add(key); queue.push(key); }
      }
    }
    assert.ok(clicked > 20 && seen.size >= 8, `clicked ${clicked} links across ${seen.size} pages`);

    // a real click on the nav, not just a request: menu -> birthday cake item
    await page.goto(origin + base + "/");
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.click('header a[href$="/menu"]');
    await page.waitForURL("**/menu");
    assert.equal(here(), "/menu");
    await page.click('a[href$="/menu/birthday-cake"]');
    await page.waitForURL("**/menu/birthday-cake");
    assert.match(await page.textContent("h1"), /Birthday Cake/);

    // 5: the item's Enquire button opens the contact form pre-filled
    await page.click('main a[href*="/contact?item=birthday-cake"]');
    await page.waitForURL("**/contact?item=birthday-cake");
    assert.equal(await page.inputValue("#g-f-about"), "Enquiry about Birthday Cake");

    // 4: the form submits, shows the confirmation, and the handler got the fields
    await page.fill("#g-f-name", "Irfan");
    await page.fill("#g-f-email", "irfan@example.com");
    await page.fill("#g-f-message", "Cake for Saturday please");
    await page.click('form[data-form-kind="contact"] button[type=submit]');
    await page.waitForSelector("[data-form-status]");
    await page.waitForFunction(() => /got your message/.test(document.querySelector("[data-form-status]").textContent));
    assert.equal(posts.length, 1);
    assert.equal(posts[0].kind, "contact");
    assert.equal(posts[0].fields.name, "Irfan");
    assert.equal(posts[0].fields.about, "Enquiry about Birthday Cake");

    // booking form
    await page.goto(origin + base + "/booking");
    await page.fill("#g-f-name", "Irfan");
    await page.fill("#g-f-phone", "07000 000000");
    await page.fill("#g-f-date", "2031-06-14");
    await page.click('form[data-form-kind="booking"] button[type=submit]');
    await page.waitForFunction(() => /booking request is in/.test((document.querySelector("[data-form-status]") || {}).textContent || ""));
    assert.equal(posts[1].kind, "booking");
    assert.equal(posts[1].fields.date, "2031-06-14");

    // 6: back goes to the previous page; 7: refresh stays on the same page; 5b: a copied URL opens in a new tab
    await page.goto(origin + base + "/about");
    await page.goto(origin + base + "/menu/pastries");
    await page.goBack();
    assert.equal(here(), "/about");
    await page.reload();
    assert.equal(here(), "/about");
    assert.match(await page.textContent("h1"), /About Luvky Bakes/);
    const tab = await ctx.newPage();
    await tab.goto(origin + base + "/menu/sourdough");
    assert.match(await tab.textContent("h1"), /Sourdough/);

    // a wrong or expired link is refused, not shown
    const bad = await tab.goto(origin + `/builder/sandbox/${id}/${token.slice(0, -2)}xx/`);
    assert.equal(bad.status(), 404, "the test server only knows the real base");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
