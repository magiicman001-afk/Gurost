// Run: node --test test/template-publish.test.js
// Track 2d: a template site can be launched (frozen into one published_sites row), served from that row, and taken offline.
// A throwaway project and an in-memory stand-in for the table: no network, no model.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const P = require("../lib/published-sites");
const T = require("../lib/template-site");

function fakeDb() {
  const rows = [];
  const chain = (op, payload) => {
    const f = [];
    const q = {
      eq(c, v) { f.push([c, v]); return q; },
      select() { return q; },
      async maybeSingle() {
        const hit = () => rows.filter((r) => f.every(([c, v]) => r[c] === v));
        if (op === "select") return { data: hit()[0] || null, error: null };
        if (op === "insert") {
          if (rows.some((r) => r.slug === payload.slug || r.project_id === payload.project_id)) return { data: null, error: { code: "23505", message: "duplicate" } };
          const row = { id: "id" + rows.length, takedown_reason: null, ...payload };
          rows.push(row);
          return { data: row, error: null };
        }
        const r = hit()[0];
        if (!r) return { data: null, error: null };
        Object.assign(r, payload);
        return { data: r, error: null };
      },
    };
    return q;
  };
  return { rows, from: () => ({ select: () => chain("select"), insert: (p) => chain("insert", p), update: (p) => chain("update", p) }) };
}

const throwaway = (values = { business_name: "Throwaway Bakes", phone: "07700 900123", city: "Leeds" }, style = "atelier") => ({
  type: "website", state: "DONE", currentHtml: null, history: [], templateSite: T.makeSite("bakery", style, T.cleanValues("bakery", values).values),
});
const args = (store, project, extra = {}) => ({ store, project, projectId: "11111111-1111-4111-8111-111111111111", userId: "u1", slug: "throwaway-bakes", includeBranding: true, formEndpoint: "https://gurost.test/api/site-forms/11111111-1111-4111-8111-111111111111", buildSite: () => { throw new Error("not used"); }, ...extra });

test("launching a template project writes one live row with every page filled", async () => {
  const db = fakeDb();
  const out = await P.launch(args(P.createStore(db), throwaway()));
  assert.equal(db.rows.length, 1);
  const row = db.rows[0];
  assert.equal(row.status, "live");
  assert.equal(row.slug, "throwaway-bakes");
  assert.equal(row.published_html.engine, "template");
  assert.deepEqual(out.pages.slice().sort(), ["/", "/menu.html"]);
  const home = row.published_html.pages["/index.html"];
  assert.ok(home.includes("Throwaway Bakes"));
  assert.ok(home.includes('href="tel:+447700900123"'));
  assert.ok(home.includes('data-endpoint="https://gurost.test/api/site-forms/11111111-1111-4111-8111-111111111111"'));
  assert.ok(!/\{\{/.test(home), "no slot left behind");
  assert.ok(!home.includes("Maple") && !home.includes("Rye"), "never the example business");
  assert.ok(out.placeholders.length > 0, "blank details are reported to the owner");
  assert.ok(JSON.stringify(row.published_html).length < 900000, "small enough for a jsonb column");
});

test("a second launch updates the same row (version 2), not a second site", async () => {
  const db = fakeDb();
  const store = P.createStore(db);
  await P.launch(args(store, throwaway()));
  await P.launch(args(store, throwaway({ business_name: "Throwaway Bakes", city: "York" })));
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].version, 2);
});

test("the live site serves pages, files and a styled 404, only while live", async () => {
  const db = fakeDb();
  await P.launch(args(P.createStore(db), throwaway()));
  const row = db.rows[0];
  const home = P.serveFrozen(row, "/");
  assert.equal(home.status, 200);
  assert.match(home.type, /html/);
  assert.equal(P.serveFrozen(row, "/menu.html").status, 200);
  assert.equal(P.serveFrozen(row, "/menu").status, 200);
  const css = P.serveFrozen(row, "/assets/style.css");
  assert.equal(css.status, 200);
  assert.ok(css.file && css.file.endsWith(path.join("bakery", "atelier", "assets", "style.css")));
  for (const bad of ["/nope.html", "/../../server.js", "/.env", "/assets/../../../x", "/%2e%2e/server.js"]) {
    const r = P.serveFrozen(row, bad);
    assert.ok(r.status === 404 && !r.file, bad);
  }
  assert.equal(P.serveFrozen({ ...row, status: "unpublished" }, "/").status, 404);
  assert.equal(P.serveFrozen({ ...row, status: "unpublished" }, "/assets/style.css").status, 404);
});

test("headers: strict policy with the site's own fonts, indexable only while live; sitemap lists real pages", async () => {
  const db = fakeDb();
  await P.launch(args(P.createStore(db), throwaway()));
  const row = db.rows[0];
  const h = P.siteHeaders(row, { connectOrigin: "https://gurost.test" });
  assert.match(h["Content-Security-Policy"], /font-src 'self'/);
  assert.match(h["Content-Security-Policy"], /connect-src 'self' https:\/\/gurost\.test/);
  assert.ok(!h["X-Robots-Tag"]);
  const xml = P.sitemapXml(row, "https://throwaway-bakes.gurost.com");
  assert.ok(xml.includes("<loc>https://throwaway-bakes.gurost.com/</loc>") && xml.includes("/menu.html"));
  assert.ok(!xml.includes("/index.html"));
});

test("a page with a leftover slot is refused, not launched", async () => {
  const bad = throwaway();
  const real = T.pagesFor;
  T.pagesFor = (...a) => { const p = real(...a); p["/index.html"] += "{{oops}}"; return p; };
  try {
    await assert.rejects(P.launch(args(P.createStore(fakeDb()), bad)), (e) => e.code === "quality-gate");
  } finally { T.pagesFor = real; }
});

test("a preview-only layout is never launched for customers' data to be shown with example figures", () => {
  assert.equal(T.isHonest("minimal"), false);
});

test("every generic layout of every industry freezes without a failure", () => {
  for (const i of T.catalog().industries) {
    for (const s of i.styles.filter((x) => x.ready)) {
      const f = P.freeze({ templateSite: T.makeSite(i.id, s.id, { business_name: "Acme" }) }, { formEndpoint: "https://x.test/api/site-forms/1" });
      assert.deepEqual(f.failures, [], `${i.id}/${s.id}`);
    }
  }
});

test("the server sends template files with sendFile and keeps the link slash for path mode", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(src, /publishedSites\.sendOut\(res, out\)/);
  assert.match(src, /engine === "template"\) return res\.redirect\(301/);
});

test("the auto-chooser is wired behind TEMPLATE_AUTOCHOOSE=1, before any credit check, and the page opens the result", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  const a = src.indexOf('process.env.TEMPLATE_AUTOCHOOSE === "1"');
  const b = src.indexOf("complexityDetector.estimateBaseCost(\"website\")", a);
  assert.ok(a > 0 && b > a, "the chooser runs before credits are checked");
  assert.match(src, /templateSite\.isHonest\(pick\.style\)/);
  assert.match(fs.readFileSync(path.join(__dirname, "..", "public", "builder.html"), "utf8"), /if \(result\.templateSite\)/);
});

test("end to end without a server: 'bakery in Leeds' -> chosen, filled, launched, no example business, fast", async () => {
  const C = require("../lib/template-chooser");
  const t0 = Date.now();
  const pick = C.choose("bakery in Leeds", { name: "Luvky Bakes", phone: "07700 900123" });
  assert.equal(pick.pack, "bakery");
  assert.ok(T.isHonest(pick.style));
  const filled = C.valuesFrom(pick.pack, "bakery in Leeds", { name: "Luvky Bakes", phone: "07700 900123" });
  const db = fakeDb();
  await P.launch(args(P.createStore(db), { type: "website", currentHtml: null, history: [], templateSite: T.makeSite(pick.pack, pick.style, filled.values) }));
  assert.ok(Date.now() - t0 < 10000, "well inside the 10 second target");
  const home = db.rows[0].published_html.pages["/index.html"];
  assert.ok(home.includes("Luvky Bakes") && home.includes("Leeds") && !home.includes("Maple"));
  assert.equal(C.choose("a quiz app for kids", null), null, "unknown industry falls back to the builder");
});
