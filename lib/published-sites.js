"use strict";
/**
 * Website Builder V2: the sandbox / live split.
 *
 *   sandbox  /builder/sandbox/<id>/<token>/...   the draft, rebuilt from the project on every request (lib/sandbox-link.js)
 *   live     <slug>.gurost.com   and   /sites/<slug>/...   a FROZEN copy made by Launch, stored in `published_sites`
 *
 * One project, two environments: editing the draft never changes the live site until the owner launches again.
 * A launch re-runs the static quality checks first and refuses a site that fails them (invented facts, broken images...).
 *
 * Everything here is pure or takes its database and clock as arguments, so it is tested without a network.
 */
const { renderSite, servePage, pageKey } = require("./sections/site");
const G = require("./sections/quality-gate");
const templateSite = require("./template-site");
const { isFresh } = require("./sandbox-link");

// Replaced with "" (own hostname) or "/sites/<slug>" (path mode) when a page is served, so one frozen copy works in both.
const BASE_TOKEN = "/__B__";
const CACHE_MS = 60 * 1000;
const NEGATIVE_CACHE_MS = 15 * 1000;

// ---------------------------------------------------------------- slugs
const RESERVED = new Set(
  ("www app api admin administrator login logout signin signup register sandbox builder dashboard static assets cdn mail email smtp imap ftp ns1 ns2 " +
    "docs help support status blog billing pay payments stripe auth oauth account accounts my test demo staging dev prod root gurost surii " +
    "security abuse postmaster webmaster hostmaster noreply images img media files download downloads site sites preview publish shared share " +
    "web ws wss mx vpn git github dns ssl tls secure internal localhost").split(/\s+/)
);
// Names that would impersonate a well-known brand or are plainly abusive. Substring match, hyphens ignored. Extend as needed.
const BLOCKED_WORDS = ["paypal", "stripe", "google", "apple", "microsoft", "amazon", "facebook", "instagram", "whatsapp", "netflix", "hmrc", "barclays", "lloydsbank", "natwest", "santander", "hsbc", "porn", "xxx", "nazi", "fuck", "cunt"];
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** { ok, slug, reason }: a slug is 3 to 40 characters, a-z, 0-9 and hyphens, no double hyphen, not reserved or blocked. */
function validateSlug(raw) {
  const slug = String(raw == null ? "" : raw).trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.includes("--")) return { ok: false, slug, reason: "Use 3 to 40 letters, numbers or hyphens (no spaces, no double hyphens, no hyphen at the start or end)." };
  if (RESERVED.has(slug)) return { ok: false, slug, reason: "That name is reserved. Please choose another." };
  const flat = slug.replace(/-/g, "");
  if (BLOCKED_WORDS.some((w) => flat.includes(w))) return { ok: false, slug, reason: "That name cannot be used. Please choose another." };
  return { ok: true, slug };
}

/** A starting suggestion from the business name. */
function suggestSlug(name) {
  const s = String(name || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
  return validateSlug(s).ok ? s : "";
}

// ---------------------------------------------------------------- hostnames
const rootDomain = (env = process.env) => String(env.SITES_ROOT_DOMAIN || "gurost.com").toLowerCase();

/**
 * Who is this request for? null = the Gurost app (any other host, the bare root, or a reserved name like www / app).
 * { slug } = a customer site: "<slug>.<root>". Nested names (a.b.gurost.com) are not sites and get { slug: "" } (a 404).
 */
function hostInfo(host, root = rootDomain()) {
  const h = String(host || "").toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (!h || h === root || !h.endsWith("." + root)) return null;
  const label = h.slice(0, -(root.length + 1));
  if (RESERVED.has(label)) return null;
  if (label.includes(".")) return { slug: "" };
  return { slug: label };
}

// ---------------------------------------------------------------- the store (database + 60 second cache)
const TABLE = "published_sites";

function notReady(error) {
  return !!error && (error.code === "42P01" || error.code === "PGRST205" || /published_sites/.test(String(error.message)) && /(does not exist|schema cache)/.test(String(error.message)));
}

function createStore(db, { now = Date.now } = {}) {
  const cache = new Map(); // slug -> { row, at }
  const ttl = (e) => (e.row ? CACHE_MS : NEGATIVE_CACHE_MS);
  const wrap = (error) => {
    if (notReady(error)) return Object.assign(new Error("Publishing is not switched on yet: the published_sites table has not been created."), { code: "not-ready" });
    return new Error(error.message || "Database error");
  };

  return {
    invalidate(slug) { cache.delete(slug); },
    clear() { cache.clear(); },

    /** The live-site row for a slug, cached for 60 seconds. `fresh` skips the cache. Errors become null (a 404), never a crash. */
    async bySlug(slug, { fresh = false } = {}) {
      const hit = cache.get(slug);
      if (!fresh && hit && now() - hit.at < ttl(hit)) return hit.row;
      const { data, error } = await db.from(TABLE).select("*").eq("slug", slug).maybeSingle();
      if (error) {
        if (!notReady(error)) console.warn("[published-sites] lookup failed:", error.message);
        return null;
      }
      cache.set(slug, { row: data || null, at: now() });
      return data || null;
    },

    async byProject(projectId) {
      const { data, error } = await db.from(TABLE).select("*").eq("project_id", projectId).maybeSingle();
      if (error) {
        if (notReady(error)) return null;
        throw wrap(error);
      }
      return data || null;
    },

    /** Creates or updates the one live site of a project (version +1 on every re-launch). */
    async publish({ userId, projectId, slug, payload }) {
      const existing = await this.byProject(projectId);
      const t = new Date(now()).toISOString();
      let res;
      if (existing) {
        res = await db.from(TABLE).update({ slug, published_html: payload, version: (existing.version || 1) + 1, status: "live", takedown_reason: null, published_at: t, updated_at: t }).eq("project_id", projectId).select("*").maybeSingle();
        if (existing.slug !== slug) cache.delete(existing.slug);
      } else {
        res = await db.from(TABLE).insert({ user_id: userId, project_id: projectId, slug, published_html: payload, version: 1, status: "live", published_at: t, updated_at: t }).select("*").maybeSingle();
      }
      if (res.error) {
        if (res.error.code === "23505") throw Object.assign(new Error("That site name was just taken. Please choose another."), { code: "slug-taken" });
        throw wrap(res.error);
      }
      cache.delete(slug);
      return res.data;
    },

    /** Switches a site off (unpublished by the owner) or on again, or takes it down (admin). */
    async setStatus(projectId, status, reason = null) {
      const existing = await this.byProject(projectId);
      if (!existing) return null;
      const { data, error } = await db.from(TABLE).update({ status, takedown_reason: reason, updated_at: new Date(now()).toISOString() }).eq("project_id", projectId).select("*").maybeSingle();
      if (error) throw wrap(error);
      cache.delete(existing.slug);
      return data;
    },

    async setStatusBySlug(slug, status, reason = null) {
      const row = await this.bySlug(slug, { fresh: true });
      return row ? this.setStatus(row.project_id, status, reason) : null;
    },
  };
}

// ---------------------------------------------------------------- freezing a project into a launchable copy
/**
 * Builds the frozen copy of the project's current site. Returns { payload, failures, placeholders, pages }.
 * `failures` non-empty = do not launch. A library site that has not been edited since it was picked is rebuilt from its
 * content; anything else (old generator, or edited since) is frozen from its HTML via the page splitter.
 */
function freezeTemplate(project, { formEndpoint }) {
  const site = project.templateSite;
  const pages = templateSite.pagesFor(site, { formEndpoint: formEndpoint || "" });
  if (!pages || !pages["/index.html"]) throw Object.assign(new Error("This template is no longer available."), { code: "nothing-built" });
  const failures = [];
  const placeholders = new Set();
  for (const [path, html] of Object.entries(pages)) {
    if (/\{\{[a-z_:0-9]+\}\}/.test(html)) failures.push({ page: path, rule: "unfilled-token", detail: "a slot was left unfilled" });
    for (const p of G.placeholdersLeft(html)) placeholders.add(p);
  }
  const notFound = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>Page not found</h1><p><a href="/">Back to the home page</a></p></body></html>';
  return { payload: { engine: "template", pack: site.pack, style: site.style, pages, notFound, brand: (site.values || {}).business_name || "" }, failures, placeholders: [...placeholders], pages: Object.keys(pages).map((k) => (k === "/index.html" ? "/" : k)) };
}

function freeze(project, { includeBranding = false, formEndpoint = null, buildSite, now = new Date() } = {}) {
  if (project && project.templateSite) return freezeTemplate(project, { formEndpoint });
  if (!project || !project.currentHtml) throw Object.assign(new Error("Pick a design first."), { code: "nothing-built" });
  const failures = [];
  const placeholders = new Set();

  if (isFresh(project)) {
    const site = project.site;
    const rendered = renderSite(site, { base: BASE_TOKEN, formEndpoint, includeBranding, motion: { libs: true } });
    const notFound = servePage(rendered, site, "/__not-found__", { includeBranding }).html;
    const facts = [project.prompt || "", JSON.stringify(project.businessInfo || {})];
    for (const [path, html] of Object.entries(rendered.pages)) {
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      // style and script text is code, not copy: CSS "}}" must not look like an unfilled {{ }} slot
      const markup = html.replace(/<(style|script)\b[\s\S]*?<\/\1>/gi, "<!-- code -->");
      for (const f of G.checkStatic(markup, { facts, ids, now })) if (f.severity === G.HIGH) failures.push({ page: path, rule: f.rule, detail: f.detail });
      for (const p of G.placeholdersLeft(html)) placeholders.add(p);
    }
    return { payload: { engine: "library", pages: rendered.pages, notFound, brand: (site.content.navbar || {}).brand || "" }, failures, placeholders: [...placeholders], pages: Object.keys(rendered.pages) };
  }

  const split = buildSite(project.currentHtml, { businessInfo: project.businessInfo || null });
  const list = split.multi ? split.files : [{ path: "index.html", content: project.currentHtml }];
  const files = {};
  const TYPES = { css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8", html: "text/html; charset=utf-8" };
  for (const f of list) files["/" + f.path] = { type: TYPES[(f.path.match(/\.([a-z]+)$/i) || [, "html"])[1].toLowerCase()] || "text/plain; charset=utf-8", body: String(f.content) };
  for (const f of list) if (/\.html$/.test(f.path)) for (const p of G.placeholdersLeft(f.content)) placeholders.add(p);
  return { payload: { engine: "legacy", files, brand: "" }, failures, placeholders: [...placeholders], pages: list.filter((f) => /\.html$/.test(f.path)).map((f) => "/" + f.path) };
}

/** Everything Launch does: check the name, freeze, check the site, save. Throws errors with a plain `.message` and a `.code`. */
async function launch({ store, project, projectId, userId, slug, includeBranding, formEndpoint, buildSite, now }) {
  const v = validateSlug(slug);
  if (!v.ok) throw Object.assign(new Error(v.reason), { code: "bad-slug" });
  const taken = await store.bySlug(v.slug, { fresh: true });
  if (taken && taken.project_id !== projectId) throw Object.assign(new Error("That site name is already taken. Please choose another."), { code: "slug-taken" });
  const frozen = freeze(project, { includeBranding, formEndpoint, buildSite, now });
  if (frozen.failures.length) {
    const first = frozen.failures[0];
    throw Object.assign(new Error(`This site is not ready to launch: ${first.detail || first.rule} (${first.page}).`), { code: "quality-gate", failures: frozen.failures });
  }
  const row = await store.publish({ userId, projectId, slug: v.slug, payload: frozen.payload });
  return { row, placeholders: frozen.placeholders, pages: frozen.pages };
}

// ---------------------------------------------------------------- serving the frozen copy
const swapBase = (html, base) => String(html).split(BASE_TOKEN).join(base);

const SITE_CSP = (connectOrigin) =>
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "media-src 'self' https:", // stock video clips (a hero background loop)
    `connect-src 'self'${connectOrigin ? " " + connectOrigin : ""}`,
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ");

// Template sites ship their own fonts, pictures and script: nothing is loaded from another host.
const TEMPLATE_CSP = (connectOrigin) => SITE_CSP(connectOrigin).replace("font-src https://fonts.gstatic.com", "font-src 'self'");

/** Headers every live page carries. Library sites get a strict CSP; old-generator sites (AI-written, CDN styles) do not. */
function siteHeaders(row, { connectOrigin, noindex = false } = {}) {
  const live = row && row.status === "live";
  const h = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": live ? "public, max-age=60" : "no-store",
  };
  const engine = row && row.published_html && row.published_html.engine;
  if (engine === "library") h["Content-Security-Policy"] = SITE_CSP(connectOrigin);
  if (engine === "template") h["Content-Security-Policy"] = TEMPLATE_CSP(connectOrigin);
  if (noindex || !live) h["X-Robots-Tag"] = "noindex, nofollow";
  return h;
}

const NOT_AVAILABLE = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site not available</title></head><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>This site is not available</h1><p>The address may be wrong, or the site has been taken offline.</p></body></html>';

/**
 * What to send for `rel` of a stored site. `base` = "" on its own hostname, "/sites/<slug>" in path mode.
 * Returns { status, type, body }. A site that is not live is a plain 404 for visitors.
 */
function serveFrozen(row, rel, { base = "" } = {}) {
  if (!row || row.status !== "live" || !row.published_html) return { status: 404, type: "text/html; charset=utf-8", body: NOT_AVAILABLE };
  const p = row.published_html;
  if (p.engine === "library") {
    const key = pageKey(rel);
    if (key && p.pages && p.pages[key]) return { status: 200, type: "text/html; charset=utf-8", body: swapBase(p.pages[key], base) };
    return { status: 404, type: "text/html; charset=utf-8", body: swapBase(p.notFound || NOT_AVAILABLE, base) };
  }
  if (p.engine === "template") {
    const clean = String(rel || "/").split("?")[0].split("#")[0];
    const k = clean === "/" || clean === "" ? "/index.html" : clean;
    const page = (p.pages || {})[k] || (p.pages || {})[k + ".html"];
    if (page) return { status: 200, type: "text/html; charset=utf-8", body: page };
    if (/\.html?$/i.test(k)) return { status: 404, type: "text/html; charset=utf-8", body: p.notFound || NOT_AVAILABLE };
    const a = templateSite.assetFor(p.pack, p.style, k);
    return a.file ? a : { status: 404, type: "text/html; charset=utf-8", body: p.notFound || NOT_AVAILABLE };
  }
  const clean = String(rel || "/").split("?")[0].split("#")[0];
  const k = clean === "/" || clean === "" ? "/index.html" : clean;
  const f = (p.files || {})[k] || (p.files || {})[k + ".html"];
  if (!f) return { status: 404, type: "text/html; charset=utf-8", body: NOT_AVAILABLE };
  return { status: 200, type: f.type, body: f.body };
}

/** Sends what serveFrozen returned: a page as text, a template file (font, picture, video) with sendFile so video can seek. */
function sendOut(res, out, { method = "GET" } = {}) {
  if (out.file) {
    if (out.font) res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=3600");
    return res.sendFile(out.rel, { root: out.root, dotfiles: "deny", cacheControl: false }, (err) => { if (err && !res.headersSent) res.status(404).end(); });
  }
  return res.status(out.status).type(out.type).send(method === "HEAD" ? undefined : out.body);
}

function robotsTxt(row, origin, base = "") {
  const live = row && row.status === "live";
  return live ? `User-agent: *\nAllow: /\nSitemap: ${origin}${base}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n";
}

function sitemapXml(row, origin, base = "") {
  const p = row && row.status === "live" && row.published_html;
  if (!p) return null;
  const paths = p.engine === "library" ? Object.keys(p.pages || {}) : p.engine === "template" ? Object.keys(p.pages || {}).map((k) => (k === "/index.html" ? "/" : k)) : Object.keys(p.files || {}).filter((k) => /\.html$/.test(k)).map((k) => (k === "/index.html" ? "/" : k));
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((x) => `<url><loc>${esc(origin + base + (x === "/" && base ? "/" : x))}</loc></url>`).join("\n")}\n</urlset>\n`;
}

/**
 * Express middleware for customer hostnames. Mount it FIRST: it answers for "<slug>.gurost.com" and calls next() for every
 * other host (the app). Only GET and HEAD are answered; forms post to the app's /api/site-forms, which is open to any origin.
 */
function hostMiddleware({ store, root = rootDomain(), appOrigin = null } = {}) {
  return async function siteHost(req, res, next) {
    const info = hostInfo(req.headers.host, root);
    if (!info) return next();
    const send = (out, headers = {}) => {
      res.set({ "X-Content-Type-Options": "nosniff", ...headers });
      sendOut(res, out, { method: req.method });
    };
    try {
      if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).set("Allow", "GET, HEAD").type("text/plain").send("Method not allowed");
      const row = info.slug && validateSlug(info.slug).ok ? await store.bySlug(info.slug) : null;
      const origin = `https://${String(req.headers.host).toLowerCase().replace(/:\d+$/, "")}`;
      const path = String(req.path || "/");
      if (path === "/robots.txt") return send({ status: 200, type: "text/plain", body: robotsTxt(row, origin) }, { "Cache-Control": "public, max-age=60" });
      if (path === "/sitemap.xml") {
        const xml = sitemapXml(row, origin);
        return xml ? send({ status: 200, type: "application/xml", body: xml }, { "Cache-Control": "public, max-age=60" }) : send({ status: 404, type: "text/plain", body: "Not found" });
      }
      const out = serveFrozen(row, path, { base: "" });
      return send(out, siteHeaders(row, { connectOrigin: appOrigin }));
    } catch (err) {
      console.error("[published-sites] serve failed:", err.message);
      return res.status(500).type("text/plain").send("Something went wrong.");
    }
  };
}

module.exports = {
  BASE_TOKEN, CACHE_MS, NEGATIVE_CACHE_MS, RESERVED, BLOCKED_WORDS,
  validateSlug, suggestSlug, rootDomain, hostInfo, createStore, freeze, launch,
  serveFrozen, sendOut, siteHeaders, robotsTxt, sitemapXml, hostMiddleware, swapBase, NOT_AVAILABLE,
};
