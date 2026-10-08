/**
 * Security headers for every response - pages included.
 *
 * Audit 2026-10-08: express.static was mounted before helmet(), so every
 * HTML page (login included) went out with no security headers at all: it
 * could be framed by another site (clickjacking) and had no Content Security
 * Policy. pageSecurity() is mounted before the static server now.
 *
 * Enforced now: X-Frame-Options SAMEORIGIN + CSP frame-ancestors 'self'
 * (no framing by other sites), HSTS, nosniff, Referrer-Policy, COOP.
 *
 * Content Security Policy: REPORT-ONLY for now. The builder's preview
 * frames show generated sites, and a srcdoc frame inherits its page's
 * policy - so the policy must also fit every generated site (Tailwind CDN,
 * Google Fonts, stock photos and video, Google Maps). Violations are sent
 * to /api/csp-report and logged; once a full walkthrough and real use show
 * none, the policy is switched to enforced (CSP_ENFORCE=1, no code change).
 * frame-ancestors only works when enforced, which is why X-Frame-Options
 * carries the clickjacking protection meanwhile.
 *
 * sandboxSharedPage(res): /shared/:token serves a generated site from
 * Gurost's own origin. The CSP `sandbox` directive gives that page an
 * opaque origin of its own - its scripts can't read Gurost's storage or
 * call the API as the visitor - while it still runs, submits its forms and
 * opens links.
 */

const helmet = require("helmet");

const DIRECTIVES = {
  "default-src": ["'self'"],
  // Pages and generated sites use inline scripts and the Tailwind CDN; React
  // for the App Builder preview comes from unpkg / jsDelivr.
  "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  // Generated sites show stock photos and video from many hosts.
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "blob:", "https:"],
  "connect-src": ["'self'", "wss:", "https://cdn.jsdelivr.net", "https://unpkg.com"],
  "frame-src": ["'self'", "https://www.google.com", "https://maps.google.com"],
  "frame-ancestors": ["'self'"],
  "object-src": ["'none'"],
  // No base-uri: the builder's preview sets <base href="about:srcdoc"> on
  // purpose (shared/code-boxes.js - "#section" links stay inside the
  // preview), and a srcdoc frame inherits this policy.
  "form-action": ["'self'"],
  "report-uri": ["/api/csp-report"]
};

function pageSecurity({ enforce = process.env.CSP_ENFORCE === "1" } = {}) {
  return helmet({
    contentSecurityPolicy: { useDefaults: false, reportOnly: !enforce, directives: DIRECTIVES },
    frameguard: { action: "sameorigin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginEmbedderPolicy: false
  });
}

const SHARED_SANDBOX = "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals";

function sandboxSharedPage(res) {
  res.setHeader("Content-Security-Policy", SHARED_SANDBOX);
  // The sandbox is the protection here; the report-only page policy would
  // only turn a generated site's normal loads into report noise.
  res.removeHeader("Content-Security-Policy-Report-Only");
}

module.exports = { pageSecurity, sandboxSharedPage, DIRECTIVES, SHARED_SANDBOX };
