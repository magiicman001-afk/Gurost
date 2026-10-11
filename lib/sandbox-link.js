"use strict";
/**
 * The sandbox: a draft of the site on real URLs (/builder/sandbox/<projectId>/<token>/about), so links, back, refresh
 * and "copy the URL into a new tab" all work, including on a phone.
 *
 * Access is a signed, expiring link made for the signed-in owner (POST /api/project/:id/sandbox-link). It is not an
 * account cookie, so a browser can open it directly. Anyone holding the link can view the draft until it expires;
 * pages carry X-Robots-Tag: noindex. Live sites (Website Builder V2, commit 4) use their own hostnames instead.
 */
const crypto = require("crypto");
const { renderSite, servePage } = require("./sections/site");

const TTL_MS = 12 * 60 * 60 * 1000;
let warned = false;
const randomSecret = crypto.randomBytes(32).toString("hex");

function secret(env = process.env) {
  const s = env.SANDBOX_LINK_SECRET || env.ADMIN_JWT_SECRET;
  if (s) return s;
  if (!warned) {
    warned = true;
    console.warn("[sandbox] no SANDBOX_LINK_SECRET or ADMIN_JWT_SECRET: draft links stop working on every restart");
  }
  return randomSecret;
}

const mac = (projectId, exp, env) => crypto.createHmac("sha256", secret(env)).update(`sandbox.${projectId}.${exp}`).digest("base64url").slice(0, 32);

/** A link token valid for 12 hours: "<expiry>-<signature>". */
function makeToken(projectId, now = Date.now(), env = process.env) {
  const exp = Math.floor((now + TTL_MS) / 1000);
  return `${exp}-${mac(projectId, exp, env)}`;
}

function verifyToken(projectId, token, now = Date.now(), env = process.env) {
  const m = /^(\d{9,12})-([A-Za-z0-9_-]{32})$/.exec(String(token || ""));
  if (!m) return false;
  if (Number(m[1]) * 1000 < now) return false;
  const want = Buffer.from(mac(projectId, m[1], env));
  const got = Buffer.from(m[2]);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

const sha1 = (s) => crypto.createHash("sha1").update(String(s || "")).digest("hex");

/** A library site is "fresh" while the page the owner picked has not been edited since (edits change the HTML). */
function isFresh(project) {
  const s = project && project.site;
  return !!(s && s.engine === "section-library" && s.baseHash && project.currentHtml && sha1(project.currentHtml) === s.baseHash);
}

const TYPES = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".html": "text/html; charset=utf-8" };

/**
 * What to send for `rel` (the path after the token). Returns { status, type, body }.
 * Fresh library sites get real pages from their content; anything edited since falls back to the page split of the
 * edited HTML (lib/site-pages.js), so an edit is never hidden behind an old copy.
 */
function serve(project, rel, { base, formEndpoint, includeBranding = false, buildSite }) {
  if (isFresh(project)) {
    const rendered = renderSite(project.site, { base, formEndpoint, includeBranding });
    const r = servePage(rendered, project.site, rel, { includeBranding });
    return { status: r.status, type: TYPES[".html"], body: r.html };
  }
  if (!project || !project.currentHtml) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Nothing built yet</title><p>Nothing has been built for this project yet.</p>" };
  const site = buildSite(project.currentHtml, { businessInfo: project.businessInfo || null });
  const files = site.multi ? site.files : [{ path: "index.html", content: project.currentHtml }];
  const clean = String(rel || "/").split("?")[0].split("#")[0].replace(/^\/+/, "") || "index.html";
  const f = files.find((x) => x.path === clean) || files.find((x) => x.path === clean + ".html");
  if (!f) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>Page not found.</p>" };
  const ext = (f.path.match(/\.[a-z]+$/i) || [".html"])[0].toLowerCase();
  return { status: 200, type: TYPES[ext] || "text/plain; charset=utf-8", body: String(f.content) };
}

module.exports = { makeToken, verifyToken, serve, isFresh, sha1, TTL_MS };
