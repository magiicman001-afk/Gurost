// Run: node --test test/template-site.test.js
// The template picker's engine: the catalog, what a customer may type, how it is filled in, what a draft serves, and that a
// template project survives a restart. No network, no model.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

let saved = null;
require.cache[path.join(__dirname, "../lib/db.js")] = {
  exports: { supabase: { from: () => ({ upsert: (row) => { saved = row; return Promise.resolve({ error: null }); } }) } },
  loaded: true,
  id: "db",
};
const ps = require("../project-state");
const T = require("../lib/template-site");

const cat = T.catalog();
const byId = (id) => cat.industries.find((i) => i.id === id);

test("the catalog lists every industry and style that has built output", () => {
  assert.equal(cat.industries.length, 15);
  assert.equal(cat.industries.reduce((n, i) => n + i.styles.length, 0), 159);
  for (const i of cat.industries) {
    assert.ok(i.label && i.styles.length >= 10, i.id);
    assert.ok(cat.fields[i.id].some((f) => f.name === "business_name" && f.required), `${i.id} asks for a business name`);
    for (const s of i.styles) assert.ok(fs.existsSync(path.join(__dirname, "..", "templates", i.id, s.id, "index.html")), `${i.id}/${s.id}`);
  }
  assert.deepEqual(byId("bakery").styles.slice(0, 2).map((s) => s.kind), ["special", "special"]);
  assert.equal(byId("tech").styles.find((s) => s.id === "atelier").kind, "general");
});

test("the details asked for never include the ones the server derives", () => {
  for (const [pack, fields] of Object.entries(cat.fields)) {
    for (const f of fields) assert.ok(!["phone_href", "maps_url", "form_endpoint"].includes(f.name), `${pack}: ${f.name}`);
  }
  assert.ok(cat.fields.sanctuary.some((f) => f.name === "donate_url" && f.type === "url"));
  assert.ok(cat.fields.tech.some((f) => f.name === "team_size" && f.type === "count"));
});

test("typed details are checked: required, length, email, phone, numbers and links", () => {
  const bad = (pack, input) => T.cleanValues(pack, input);
  assert.equal(bad("tech", {}).ok, false);
  assert.ok(bad("tech", {}).errors.business_name);
  assert.ok(bad("tech", { business_name: "x".repeat(81) }).errors.business_name);
  assert.ok(bad("tech", { business_name: "A", email: "not-an-email" }).errors.email);
  assert.ok(bad("tech", { business_name: "A", phone: "call me" }).errors.phone);
  assert.ok(bad("tech", { business_name: "A", team_size: "lots" }).errors.team_size);
  assert.ok(bad("tech", { business_name: "A", year_founded: "1066" }).errors.year_founded);
  assert.ok(bad("tech", { business_name: "A\nB" }).errors.business_name);
  assert.ok(bad("nope", { business_name: "A" }).errors.pack);
  const ok = T.cleanValues("tech", { business_name: "  Acme  ", phone: "07700 900123", team_size: "7", instagram_url: "instagram.com/acme", ignored: "x" });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.values, { business_name: "Acme", phone: "07700 900123", team_size: "7", instagram_url: "https://instagram.com/acme" });
});

test("a link can only be http or https, so no script address gets into a page", () => {
  for (const u of ["javascript:alert(1)", "data:text/html,<script>1</script>", "vbscript:x", "https://", "https://nodot", "https://a.com/\"onmouseover=\"x", "ftp://a.com/x"]) {
    assert.equal(T.cleanUrl(u), null, u);
  }
  assert.equal(T.cleanUrl(""), "");
  assert.equal(T.cleanUrl("example.com/page"), "https://example.com/page");
  assert.equal(T.cleanUrl("http://example.com"), "http://example.com/");
});

test("phone numbers become a tel: link, UK style by default", () => {
  assert.equal(T.phoneHref("07700 900123"), "+447700900123");
  assert.equal(T.phoneHref("+1 (555) 010-2000"), "+15550102000");
  assert.equal(T.phoneHref("0044 7700 900123"), "+447700900123");
  assert.equal(T.phoneHref(""), "");
});

test("a filled page shows the customer's words, escaped, and example text where they left a blank", () => {
  const values = T.cleanValues("tech", { business_name: "Acme <b>x</b> & Co", phone: "07700 900123", city: "Leeds" }).values;
  const site = T.makeSite("tech", "estimate", values);
  const home = T.respond(site, "/", { formEndpoint: "https://gurost.test/api/site-forms/abc" });
  assert.equal(home.status, 200);
  assert.match(home.type, /^text\/html/);
  assert.ok(home.body.includes("Acme &lt;b&gt;x&lt;/b&gt; &amp; Co"));
  assert.ok(!home.body.includes("<b>x</b>"));
  assert.ok(home.body.includes('href="tel:+447700900123"'));
  assert.ok(home.body.includes('data-endpoint="https://gurost.test/api/site-forms/abc"'));
  assert.ok(!home.body.includes("Northlight"), "the example business name is replaced");
  assert.ok(home.body.includes("Oxford Road"), "an unfilled address keeps its example text");
  assert.ok(!/\{\{/.test(home.body), "no token is left behind");
  const second = T.respond(site, "/menu.html", {});
  assert.equal(second.status, 200);
  assert.ok(second.body.includes("Acme &lt;b&gt;x&lt;/b&gt; &amp; Co"));
});

test("every page of every template fills completely, with and without details", () => {
  for (const i of cat.industries) {
    for (const s of i.styles) {
      const dir = path.join(__dirname, "..", "templates", i.id, s.id);
      const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
      assert.ok(pages.includes("index.html"), `${i.id}/${s.id} has a home page`);
      for (const f of pages) {
        for (const site of [T.makeSite(i.id, s.id, {}), T.makeSite(i.id, s.id, { business_name: "Acme & Co" })]) {
          const r = T.respond(site, "/" + f, { formEndpoint: "https://x.test/api/site-forms/1" });
          assert.equal(r.status, 200, `${i.id}/${s.id}/${f}`);
          assert.ok(!/\{\{[a-z_:0-9]+\}\}/.test(r.body), `${i.id}/${s.id}/${f} left a token`);
        }
      }
    }
  }
});

test("files go out as files, and nothing outside the template can be read", () => {
  const site = T.makeSite("tech", "estimate", {});
  const css = T.respond(site, "/assets/style.css");
  assert.equal(css.status, 200);
  assert.ok(css.file && css.file.endsWith(path.join("tech", "estimate", "assets", "style.css")));
  assert.match(css.type, /css/);
  for (const rel of ["/../../server.js", "/assets/../../../x", "/.env", "/assets/.hidden", "/nope.html", "/%2e%2e/server.js", "//etc/passwd", "/assets/fonts"]) {
    const r = T.respond(site, rel);
    assert.ok(r.status === 404 && !r.file, rel);
  }
  assert.equal(T.respond({ pack: "tech", style: "../bakery/atelier", values: {} }, "/").status, 404);
  assert.equal(T.respond({ pack: "../x", style: "atelier", values: {} }, "/").status, 404);
  assert.equal(T.respond(null, "/").status, 404);
});

test("the picker's live preview uses example details only", () => {
  const r = T.respondDemo("bakery", "atelier", "/");
  assert.equal(r.status, 200);
  assert.ok(r.body.includes("Maple &amp; Rye"));
  assert.equal(T.respondDemo("bakery", "nope", "/").status, 404);
  assert.equal(T.respondDemo("nope", "atelier", "/").status, 404);
});

test("a template project is saved and comes back after a restart, and counts as built", () => {
  const site = T.makeSite("tech", "estimate", { business_name: "Acme" });
  const project = { state: "DONE", prompt: "Acme (tech template, estimate)", userId: "u1", type: "website", currentHtml: null, history: [], stateHistory: [], templateSite: site };
  assert.equal(ps.isBuilt(project), true);
  const row = ps.toRow("p1", "u1", project);
  assert.deepEqual(row.context.templateSite, site);
  assert.equal(row.context.built, true);
  const back = ps.fromRow({ ...row, user_id: "u1", updated_at: new Date().toISOString() });
  assert.deepEqual(back.templateSite, site);
  assert.equal(ps.isBuilt({ state: "DONE", currentHtml: null }), false);
});

test("the server wires the routes and keeps publish, download and GitHub save untouched", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(src, /app\.get\("\/api\/template-sites"/);
  assert.match(src, /app\.post\("\/api\/template-sites"/);
  assert.match(src, /app\.post\("\/api\/project\/:id\/template-link"/);
  assert.match(src, /\/\^\\\/templates-preview\\\//);
  assert.match(src, /if \(project\.templateSite\) return sendTemplatePage\(/);
  const gate = src.indexOf('\napp.use("/api", auth.requireAuth);');
  assert.ok(gate > 0);
  assert.ok(src.indexOf("app.get(/^\\/templates-preview") < gate, "the preview is public, above the sign-in line");
  assert.ok(src.indexOf('app.post("/api/template-sites"') > gate, "creating a project needs a sign-in");
});
