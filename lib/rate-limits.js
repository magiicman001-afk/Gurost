"use strict";
/**
 * Every rate limit in one table, so the numbers can be reviewed in one place (security spec 1.3).
 * Environment variables can only change the first three (they existed before); the admin limit is fixed on purpose.
 *
 *   all routes, per IP          100 / 15 min   RATE_LIMIT_MAX_REQUESTS
 *   login and signup, per IP      8 / 15 min   AUTH_RATE_LIMIT_MAX_REQUESTS
 *   signed-in user, per account 500 / hour     USER_RATE_LIMIT_MAX_REQUESTS
 *   public site forms, per IP    10 / 15 min   (siteFormLimiter in server.js)
 *   admin changes, per IP        30 / 15 min   (this file) - POST / PUT / PATCH / DELETE under /api/admin
 *   admin ops actions            password again, cooldowns, 5 wrong passwords lock (lib/admin-ops-actions.js)
 */
const LIMITS = {
  admin: { windowMs: 15 * 60 * 1000, max: 30, message: "Too many admin changes from this address. Wait a few minutes." },
};

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Limiter for admin routes that CHANGE something. Reads are covered by the all-routes limit. */
function adminWriteLimiter(rateLimit, overrides = {}) {
  const cfg = { ...LIMITS.admin, ...overrides };
  return rateLimit({
    windowMs: cfg.windowMs,
    max: cfg.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => READ_METHODS.has(req.method),
    message: { error: cfg.message },
  });
}

module.exports = { LIMITS, adminWriteLimiter, READ_METHODS };
