// Run: node --test test/published-sites.test.js
// Website Builder V2 commit 4: slugs, hostnames, the 60 second cache, Launch (frozen copy + quality check), serving, takedown.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const P = require("../lib/published-sites");
const L = require("../bots/library-bot");
const SB = require("../lib/sandbox-link");
const { buildSite } = require("../lib/site-pages");

// ---------------------------------------------------------------- an in-memory stand-in for the one table
function fakeDb({ missingTable = false } = {}) {
  const rows = [];
  const calls = { select: 0 };
  const err = () => ({ error: { code: "42P01", message: 'relation "public.published_sites" does not exist' } });
  const chain = (op, payload) => {
    const f = [];
    const q = {
      eq(c, v) { f.push([c, v]); return q; },
      select() { return q; },
      async maybeSingle() {
        if (missingTable) return err();
        const hit = () => rows.filter((r) => f.every(([c, v]) => r[c] === v));
        if (op === "select") { calls.select++; return { data: hit()[0] || null, error: null }; }
        if (op === "insert") {
          if (rows.some((r) => r.slug === payload.slug || r.project_id === payload.project_id)) return { data: null, error: { code: "23505", message: "duplicate" } };
          const row = { id: "id" + rows.length, domain: null, takedown_reason: null, ...payload };
          rows.push(row);
          return { data: row, error: null };
        }
        if (op === "update") {
          const r = hit()[0];
          if (!r) return { data: null, error: null };
          if (payload.slug && rows.some((x) => x !== r && x.slug === payload.slug)) return { data: null, error: { code: "23505", message: "duplicate" } };
          Object.assign(r, payload);
          return { data: r, error: null };
        }
      },
    };
    return q;
  };
  return { rows, calls, from: () => ({ select: () => chain("select"), insert: (p) => chain("insert", p), update: (p) => chain("update", p) }) };
}

const MODEL = {
  brand: "Luvky Bakes",
  sections: {
    hero: { headline: "Fresh bread, baked every morning", subhead: "Sourdough, cakes and pastries made by hand.", cta1_label: "Order now", image_brief: "sourdough loaves" },
    services: { title: "What we bake", items: [{ icon: "heart", title: "Birthday Cake", text: "Made to order for your day." }, { icon: "leaf", title: "Sourdough", text: "Slow-fermented loaves." }, { icon: "sparkle", title: "Pastries", text: "Butter and flour." }] },
    about: { title: "Our kitchen", body: "A small neighbourhood bakery." },
    faq: { title: "Questions", items: [{ question: "Do you do custom cakes?", answer: "Yes, ask us." }] },
    cta: { title: "Come and say hello", cta1_label: "Visit" },
  },
};
const INFO = { name: "Luvky Bakes", phone: "0113 496 0000", email: "hi@luvky.example", address: "12 High Street, Leeds" };
const search = async (q) => ({ url: "https://cdn.pixabay.com/photo/" + encodeURIComponent(q) + ".jpg", credit: "Pixabay" });
async function project() {
  const out = await L.generateLibraryVariants("a bakery and cafe in Leeds", { businessInfo: INFO, callModel: async () => MODEL, search, browserChecks: false });
  const v = out.variants.find((x) => x.id === "minimal");
  return { type: "website", prompt: "a bakery and cafe in Leeds", currentHtml: v.html, site: v.site, businessInfo: INFO, history: [] };
}
const launchArgs = (store, p, slug = "luvky") => ({ store, project: p, projectId: "proj-1", userId: "u1", slug, includeBranding: false, formEndpoint: "https://app.test/api/site-forms/proj-1", buildSite });

// ---------------------------------------------------------------- slugs and hosts
test("slugs: 3-40 chars of a-z 0-9 and hyphens; reserved and look-alike names refused", () => {
  for (const ok of ["luvky", "luvky-bakes", "a1b", "k".repeat(40), "bakery-2"]) assert.ok(P.validateSlug(ok).ok, ok);
  assert.equal(P.validateSlug("Luvky ").slug, "luvky", "trimmed and lower-cased");
  for (const bad of ["ab", "k".repeat(41), "-luvky", "luvky-", "lu--vky", "luv ky", "luvky.com", "lüvky", "", null, "a/b"]) assert.ok(!P.validateSlug(bad).ok, String(bad));
  for (const r of ["www", "app", "api", "admin", "login", "sandbox", "builder", "mail", "stripe", "gurost"]) assert.ok(!P.validateSlug(r).ok, r);
  for (const b of ["paypal-login", "my-paypal", "pay-pal", "google-help", "nazi-cafe"]) assert.ok(!P.validateSlug(b).ok, b);
  assert.equal(P.suggestSlug("Luvky Bakes & Café!"), "luvky-bakes-cafe");
  assert.equal(P.suggestSlug("API"), "", "a suggestion is never a reserved name");
});

test("hostInfo: customer subdomains only; the app, the bare domain and reserved names fall through", () => {
  const R = "gurost.com";
  assert.deepEqual(P.hostInfo("luvky.gurost.com", R), { slug: "luvky" });
  assert.deepEqual(P.hostInfo("LUVKY.Gurost.com:443", R), { slug: "luvky" });
  assert.deepEqual(P.hostInfo("a.b.gurost.com", R), { slug: "" }, "nested names are never sites");
  for (const h of ["gurost.com", "www.gurost.com", "app.gurost.com", "api.gurost.com", "admin.gurost.com", "gurost.onrender.com", "localhost:3000", "", undefined, "evilgurost.com", "gurost.com.evil.test"]) assert.equal(P.hostInfo(h, R), null, String(h));
});

// ---------------------------------------------------------------- the store and its cache
test("store: a lookup is cached for 60 seconds, a miss for 15, and a publish clears the slug at once", async () => {
  const db = fakeDb();
  let t = 1_000_000;
  const store = P.createStore(db, { now: () => t });
  assert.equal(await store.bySlug("luvky"), null);
  assert.equal(await store.bySlug("luvky"), null);
  assert.equal(db.calls.select, 1, "second miss comes from the cache");
  await store.publish({ userId: "u1", projectId: "p1", slug: "luvky", payload: { engine: "library", pages: {} } });
  assert.equal((await store.bySlug("luvky")).slug, "luvky", "a publish is visible at once");
  const n = db.calls.select;
  t += 59_000;
  await store.bySlug("luvky");
  assert.equal(db.calls.select, n, "still cached at 59s");
  t += 2_000;
  await store.bySlug("luvky");
  assert.equal(db.calls.select, n + 1, "refetched after 60s");
});

test("store: re-launch bumps the version; a taken slug is refused; a missing table is a quiet 'not ready', never a crash", async () => {
  const db = fakeDb();
  const store = P.createStore(db);
  const a = await store.publish({ userId: "u1", projectId: "p1", slug: "luvky", payload: { v: 1 } });
  assert.equal(a.version, 1);
  const b = await store.publish({ userId: "u1", projectId: "p1", slug: "luvky", payload: { v: 2 } });
  assert.equal(b.version, 2);
  await assert.rejects(store.publish({ userId: "u2", projectId: "p2", slug: "luvky", payload: {} }), { code: "slug-taken" });
  const none = P.createStore(fakeDb({ missingTable: true }));
  assert.equal(await none.bySlug("luvky"), null);
  assert.equal(await none.byProject("p1"), null);
  await assert.rejects(none.publish({ userId: "u", projectId: "p", slug: "luvky", payload: {} }), { code: "not-ready" });
});

// ---------------------------------------------------------------- launching
test("launch: freezes every page; a library site's links are under the base token; branding follows the plan", async () => {
  const p = await project();
  const store = P.createStore(fakeDb());
  const { row, placeholders } = await P.launch({ ...launchArgs(store, p), includeBranding: true });
  const pages = row.published_html.pages;
  assert.ok(pages["/"] && pages["/menu"] && pages["/menu/birthday-cake"] && pages["/contact"]);
  assert.match(pages["/"], /href="\/__B__\/menu"/);
  assert.match(pages["/"], /Built with Gurost/);
  assert.match(pages["/"], /gsap/, "published sites carry the scroll motion libraries");
  assert.ok(row.published_html.notFound.includes("Page not found"));
  assert.ok(Array.isArray(placeholders));
  const paid = await P.launch({ ...launchArgs(P.createStore(fakeDb()), p), includeBranding: false });
  assert.doesNotMatch(paid.row.published_html.pages["/"], /Built with Gurost/);
});

test("launch: refuses a bad name, a taken name, nothing built, and a site with an invented fact", async () => {
  const p = await project();
  const store = P.createStore(fakeDb());
  await assert.rejects(P.launch(launchArgs(store, p, "www")), { code: "bad-slug" });
  await P.launch(launchArgs(store, p, "luvky"));
  await assert.rejects(P.launch({ ...launchArgs(store, p, "luvky"), projectId: "proj-2" }), { code: "slug-taken" });
  await P.launch(launchArgs(store, p, "luvky-two")); // the same project may move to another name
  await assert.rejects(P.launch(launchArgs(P.createStore(fakeDb()), { ...p, currentHtml: "" })), { code: "nothing-built" });
  const lying = JSON.parse(JSON.stringify(p));
  lying.site.content.hero.subhead = "Rated 4.9 stars by 2,000 happy customers since 1987.";
  await assert.rejects(P.launch(launchArgs(P.createStore(fakeDb()), lying)), (e) => e.code === "quality-gate" && /not ready to launch/.test(e.message) && e.failures.length > 0);
});

test("the live site is frozen: editing the draft after Launch changes the sandbox, never the live copy", async () => {
  const p = await project();
  const store = P.createStore(fakeDb());
  const { row } = await P.launch(launchArgs(store, p));
  const live1 = P.serveFrozen(row, "/").body;
  p.site.content.hero.headline = "A brand new headline";
  const draft = SB.serve(p, "/", { base: "/b", buildSite }).body;
  assert.match(draft, /A brand new headline/);
  assert.equal(P.serveFrozen(row, "/").body, live1);
  assert.doesNotMatch(live1, /A brand new headline/);
  const relaunch = await P.launch(launchArgs(store, p));
  assert.match(P.serveFrozen(relaunch.row, "/").body, /A brand new headline/);
  assert.equal(relaunch.row.version, 2);
});

test("launch: an old-generator or edited design is frozen from its HTML (same split as before)", async () => {
  const html = "<!doctype html><html><head><title>Old</title></head><body><header><nav><a href=\"#about\">About</a></nav></header><h1>Old site</h1><section id=\"about\"><h2>About</h2><p>Hello</p></section></body></html>";
  const store = P.createStore(fakeDb());
  const { row } = await P.launch(launchArgs(store, { type: "website", currentHtml: html, businessInfo: {}, prompt: "x", history: [] }));
  assert.equal(row.published_html.engine, "legacy");
  assert.equal(P.serveFrozen(row, "/").status, 200);
  assert.match(P.serveFrozen(row, "/").body, /Old site/);
  assert.equal(P.serveFrozen(row, "/nope.html").status, 404);
});

// ---------------------------------------------------------------- serving
test("serveFrozen: base swapped in every link; unknown page is a 404 with the site's own look; not live is a plain 404", async () => {
  const p = await project();
  const { row } = await P.launch(launchArgs(P.createStore(fakeDb()), p));
  const own = P.serveFrozen(row, "/menu");
  assert.equal(own.status, 200);
  assert.match(own.body, /href="\/menu\/birthday-cake"/);
  assert.doesNotMatch(own.body, /__B__/);
  const sub = P.serveFrozen(row, "/menu", { base: "/sites/luvky" });
  assert.match(sub.body, /href="\/sites\/luvky\/menu\/birthday-cake"/);
  assert.match(sub.body, /href="\/sites\/luvky\/"/);
  const nf = P.serveFrozen(row, "/nope");
  assert.equal(nf.status, 404);
  assert.match(nf.body, /Page not found/);
  for (const status of ["unpublished", "taken_down"]) assert.equal(P.serveFrozen({ ...row, status }, "/").status, 404);
  assert.equal(P.serveFrozen(null, "/").status, 404);
});

test("headers: library sites get a strict CSP; a site that is off is noindex and never cached", async () => {
  const p = await project();
  const { row } = await P.launch(launchArgs(P.createStore(fakeDb()), p));
  const h = P.siteHeaders(row, { connectOrigin: "https://app.test" });
  assert.match(h["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(h["Content-Security-Policy"], /connect-src 'self' https:\/\/app\.test/);
  assert.match(h["Content-Security-Policy"], /script-src[^;]*cdnjs\.cloudflare\.com[^;]*cdn\.jsdelivr\.net/);
  assert.equal(h["X-Robots-Tag"], undefined);
  assert.equal(h["Cache-Control"], "public, max-age=60");
  const off = P.siteHeaders({ ...row, status: "taken_down" }, {});
  assert.equal(off["X-Robots-Tag"], "noindex, nofollow");
  assert.equal(off["Cache-Control"], "no-store");
});

// A tiny express-shaped response, so the real middleware runs without express.
function shimRes(raw) {
  const r = { _h: {}, set(k, v) { if (typeof k === "object") Object.assign(r._h, k); else r._h[k] = v; return r; }, status(c) { r._s = c; return r; }, type(t) { r._t = t; return r; }, send(b) { raw.writeHead(r._s || 200, { "content-type": r._t || "text/html", ...r._h }); raw.end(b); } };
  return r;
}
async function withHostServer(store, fn, { hostOverride } = {}) {
  const mw = P.hostMiddleware({ store, root: "gurost.com", appOrigin: "https://app.test" });
  const server = http.createServer((req, res) => {
    if (hostOverride) req.headers.host = hostOverride;
    req.path = req.url.split("?")[0];
    mw(req, shimRes(res), () => { res.writeHead(200, { "content-type": "text/plain", "x-passed": "1" }); res.end("app"); });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try { await fn(server.address().port); } finally { server.close(); }
}
const get = (port, path, host, method = "GET") => new Promise((resolve, reject) => {
  const rq = http.request({ host: "127.0.0.1", port, path, method, headers: { host } }, (res) => { let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: b })); });
  rq.on("error", reject); rq.end();
});

test("hostname middleware: a live slug serves its pages, an unknown slug is a 404, other hosts pass through to the app", async () => {
  const p = await project();
  const store = P.createStore(fakeDb());
  await P.launch(launchArgs(store, p, "luvky"));
  await withHostServer(store, async (port) => {
    const home = await get(port, "/", "luvky.gurost.com");
    assert.equal(home.status, 200);
    assert.match(home.body, /Fresh bread, baked every morning/);
    assert.match(home.headers["content-security-policy"], /default-src 'self'/);
    assert.equal((await get(port, "/menu/sourdough", "luvky.gurost.com")).status, 200);
    assert.equal((await get(port, "/menu/nothing", "luvky.gurost.com")).status, 404);
    assert.equal((await get(port, "/", "nobody.gurost.com")).status, 404, "unknown slug");
    assert.equal((await get(port, "/", "a.b.gurost.com")).status, 404, "nested name");
    assert.equal((await get(port, "/", "bad_name.gurost.com")).status, 404, "invalid name");
    for (const host of ["www.gurost.com", "app.gurost.com", "gurost.com", "gurost.onrender.com", "localhost:3000"]) assert.equal((await get(port, "/", host)).headers["x-passed"], "1", host);
    assert.equal((await get(port, "/", "luvky.gurost.com", "POST")).status, 405);
    assert.equal((await get(port, "/", "luvky.gurost.com", "HEAD")).status, 200);
    const robots = await get(port, "/robots.txt", "luvky.gurost.com");
    assert.match(robots.body, /Allow: \//);
    assert.match(robots.body, /Sitemap: https:\/\/luvky\.gurost\.com\/sitemap\.xml/);
    const map = await get(port, "/sitemap.xml", "luvky.gurost.com");
    assert.match(map.body, /<loc>https:\/\/luvky\.gurost\.com\/menu\/birthday-cake<\/loc>/);
    assert.match(map.body, /<loc>https:\/\/luvky\.gurost\.com\/<\/loc>/);
  });
});

test("takedown and unpublish: the site is a 404 within the cache window, and robots disallows everything", async () => {
  const p = await project();
  const store = P.createStore(fakeDb());
  await P.launch(launchArgs(store, p, "luvky"));
  await withHostServer(store, async (port) => {
    assert.equal((await get(port, "/", "luvky.gurost.com")).status, 200);
    await store.setStatusBySlug("luvky", "taken_down", "abuse report");
    const gone = await get(port, "/", "luvky.gurost.com");
    assert.equal(gone.status, 404);
    assert.equal(gone.headers["x-robots-tag"], "noindex, nofollow");
    assert.match((await get(port, "/robots.txt", "luvky.gurost.com")).body, /Disallow: \//);
    assert.equal((await get(port, "/sitemap.xml", "luvky.gurost.com")).status, 404);
    await store.setStatusBySlug("luvky", "live", null);
    assert.equal((await get(port, "/", "luvky.gurost.com")).status, 200, "restore");
  });
});

test("a database error never takes the app down: it is a 404 for the site host", async () => {
  const store = P.createStore(fakeDb({ missingTable: true }));
  await withHostServer(store, async (port) => {
    assert.equal((await get(port, "/", "luvky.gurost.com")).status, 404);
    assert.equal((await get(port, "/", "gurost.onrender.com")).headers["x-passed"], "1");
  });
});

// ---------------------------------------------------------------- wiring
test("server wiring: the host middleware is mounted before everything else; routes, admin takedown and the widget button exist", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const at = (re) => src.search(re);
  assert.ok(at(/publishedSites\.hostMiddleware/) > 0 && at(/publishedSites\.hostMiddleware/) < at(/app\.use\(express\.json/), "host middleware before body parsing");
  assert.ok(at(/publishedSites\.hostMiddleware/) < at(/app\.use\(pageSecurity/), "before page security headers");
  assert.ok(at(/app\.use\(express\.static/) > at(/\^\\\/sites\\\//), "path mode before static files");
  for (const route of ["/api/project/:id/site-links", "/api/project/:id/publish", "/api/project/:id/unpublish", "/api/sites/check-slug", "/api/admin/sites/:slug/takedown", "/api/admin/sites/:slug/restore"]) assert.ok(src.includes(`"${route}"`), route);
  assert.ok(at(/app\.post\("\/api\/project\/:id\/publish"/) > at(/app\.use\("\/api", auth\.requireAuth\)/), "publish needs a login");
  assert.ok(at(/app\.post\("\/api\/admin\/sites\/:slug\/takedown", requireAdminAuth/) > 0, "takedown needs the admin login");
  const w = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "pulse-widget.js"), "utf8");
  assert.match(w, /id="actSite"/);
  assert.match(w, /shared\/site-panel\.js/);
  const sql = fs.readFileSync(path.join(__dirname, "..", "docs", "migrations", "2026-10-11_published_sites.sql"), "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /project_id text not null unique/);
});

// ---------------------------------------------------------------- real browser: draft and live are the same site
test("browser: the draft and the launched site show the same pages; live links, forms, back and refresh work on the live copy", async (t) => {
  let browser;
  try { browser = await require("playwright").chromium.launch(); } catch { return t.skip("no chromium"); }
  t.after(() => browser.close());
  const p = await project();
  const id = "11111111-2222-3333-4444-555555555555";
  const store = P.createStore(fakeDb());
  const posts = [];
  const mw = P.hostMiddleware({ store, root: "gurost.com", appOrigin: "https://app.test" });
  let port;
  await P.launch({ ...launchArgs(store, p, "luvky"), projectId: id, formEndpoint: "https://app.test/api/site-forms/" + id });
  const sandboxBase = `/builder/sandbox/${id}/${SB.makeToken(id)}`;
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/site-forms/" + id) {
      let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { posts.push(JSON.parse(b)); res.setHeader("content-type", "application/json"); res.end('{"ok":true}'); }); return;
    }
    req.path = req.url.split("?")[0];
    if (req.path.startsWith(sandboxBase)) {
      const out = SB.serve(p, req.url.slice(sandboxBase.length) || "/", { base: sandboxBase, formEndpoint: `http://127.0.0.1:${port}/api/site-forms/${id}`, buildSite });
      res.writeHead(out.status, { "content-type": out.type }); return res.end(out.body);
    }
    if (req.path.startsWith("/sites/luvky")) {
      store.bySlug("luvky").then((row) => { const out = P.serveFrozen(row, req.path.slice("/sites/luvky".length) || "/", { base: "/sites/luvky" }); res.writeHead(out.status, { "content-type": out.type }); res.end(out.body); });
      return;
    }
    req.headers.host = "luvky.gurost.com";
    mw(req, shimRes(res), () => res.end("app"));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await ctx.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    const texts = {};
    for (const [name, base] of [["sandbox", sandboxBase], ["path", "/sites/luvky"], ["host", ""]]) {
      await page.goto(origin + base + "/");
      texts[name] = { title: await page.title(), h1: await page.textContent("h1"), nav: await page.$$eval("header nav a", (a) => a.map((x) => x.textContent.trim())) };
    }
    assert.deepEqual(texts.path, texts.sandbox, "launched copy and draft show the same site");
    assert.deepEqual(texts.host, texts.sandbox);

    // every link on every page of the live copy works (own hostname mode)
    const seen = new Set(["/"]); const queue = ["/"]; let n = 0;
    while (queue.length) {
      const cur = queue.shift();
      await page.goto(origin + cur);
      for (const raw of [...new Set(await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href"))))]) {
        if (/^(tel:|mailto:|https?:|#)/.test(raw)) continue;
        assert.ok(raw.startsWith("/") && !raw.startsWith("/sites/") && !raw.includes("__B__"), `${cur}: ${raw}`);
        const r = await page.goto(origin + raw); n++;
        assert.equal(r.status(), 200, `${cur} -> ${raw}`);
        const key = raw.split("?")[0];
        if (!seen.has(key)) { seen.add(key); queue.push(key); }
      }
    }
    assert.ok(n > 20 && seen.size >= 8);

    // live click path, a form, back, refresh
    await page.goto(origin + "/");
    await page.click('header a[href="/menu"]'); await page.waitForURL("**/menu");
    await page.click('a[href="/menu/birthday-cake"]'); await page.waitForURL("**/menu/birthday-cake");
    await page.click('main a[href*="/contact?item=birthday-cake"]'); await page.waitForURL("**/contact?item=birthday-cake");
    assert.equal(await page.inputValue("#g-f-about"), "Enquiry about Birthday Cake");
    await page.fill("#g-f-name", "Irfan"); await page.fill("#g-f-email", "irfan@example.com"); await page.fill("#g-f-message", "Cake please");
    // the frozen copy posts to the endpoint it was launched with (https://app.test/...): point it at this server for the test
    await page.route("https://app.test/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}', headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" } }));
    await page.click('form[data-form-kind="contact"] button[type=submit]');
    await page.waitForFunction(() => /got your message/.test((document.querySelector("[data-form-status]") || {}).textContent || ""));
    await page.goto(origin + "/about"); await page.goto(origin + "/menu/pastries"); await page.goBack();
    assert.equal(new URL(page.url()).pathname, "/about");
    await page.reload();
    assert.equal(new URL(page.url()).pathname, "/about");
    assert.equal((await page.goto(origin + "/nope")).status(), 404);
    assert.deepEqual(errors.filter((e) => !/Lenis|gsap|ScrollTrigger/i.test(e)), []);
  } finally { await browser.close(); server.close(); }
});
