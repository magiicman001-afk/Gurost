/**
 * Which other websites may call the API from a browser (CORS).
 *
 * Audit 2026-10-08: cors() with no options answered every origin with
 * `Access-Control-Allow-Origin: *`, so any website could call the API from a
 * visitor's browser and read the reply. Today the login token is sent by
 * hand (Authorization header), which limits the damage; once sessions move
 * to cookies (security step S3) an open policy would hand every visitor's
 * session to any site. Now:
 *
 *   - Gurost's own pages: same origin - allowed (they also need no CORS).
 *   - Gurost's domains (CORS_ORIGINS, else PUBLIC_URL + gurost.com): allowed,
 *     with credentials, so cookie sessions can work across them.
 *   - /api/site-forms/*: any origin, never credentials - published sites post
 *     their contact and order forms from their own domains (and sandboxed
 *     shared pages, whose origin is "null").
 *   - Anything else: no CORS headers, so the browser won't let the page
 *     read the reply.
 *
 * A browser still SENDS a simple cross-site request whatever this says - it
 * only stops the page reading the answer. Protecting state-changing requests
 * once cookies arrive is S3's job (SameSite cookies).
 */

const DEFAULT_ORIGINS = ["https://gurost.onrender.com", "https://gurost.com", "https://www.gurost.com"];

function allowedOrigins(env = process.env) {
  const list = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",")
    : [...DEFAULT_ORIGINS, env.PUBLIC_URL, env.FRONTEND_BASE_URL];
  return new Set(list.map((o) => String(o || "").trim().replace(/\/+$/, "")).filter((o) => /^https?:\/\/[^/]+$/.test(o)));
}

const OPEN_PATHS = /^\/api\/site-forms\//;

// What the `cors` package should do for this request.
function corsOptionsFor(req, allowed = allowedOrigins()) {
  const origin = req.headers.origin;
  if (OPEN_PATHS.test(req.path || req.url || "")) return { origin: "*", credentials: false };
  if (!origin) return { origin: false }; // not a cross-origin browser request
  const host = req.headers.host;
  const sameOrigin = !!host && (origin === `https://${host}` || origin === `http://${host}`);
  if (sameOrigin || allowed.has(origin)) return { origin, credentials: true };
  return { origin: false };
}

function corsPolicy(cors = require("cors"), allowed = allowedOrigins()) {
  return cors((req, callback) => callback(null, corsOptionsFor(req, allowed)));
}

module.exports = { corsPolicy, corsOptionsFor, allowedOrigins, DEFAULT_ORIGINS };
