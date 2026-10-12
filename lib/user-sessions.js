/**
 * S3c: cookie login. The browser never holds a token it can read.
 *
 *   gurost_at  15 minutes, httpOnly  - a signed access token { sub, sid }. No plan or email in it: both are
 *                                      read from the database (cached 60s), so an upgrade shows at once.
 *   gurost_rt  30 days, httpOnly     - "<session id>.<random>", sent only to /api/auth. Only sha256(random) is
 *                                      stored (user_sessions). Each refresh swaps it for a new one; an old one
 *                                      coming back means the cookie was copied, and the whole session ends.
 *   gurost_li  30 days, readable     - "1": lets pages know a refresh is worth trying. Holds nothing secret.
 *
 * All three are SameSite=Lax and Secure (except plain-http localhost, for local runs). Requests that
 * change something AND log in by cookie must also come from one of Gurost's own origins (CSRF).
 * API keys and Bearer tokens are unaffected; existing Bearer tokens keep working until they expire.
 * Until the user_sessions table exists (docs/migrations/2026-10-12_user_sessions.sql), sign-in quietly
 * skips the cookies and works exactly as before.
 */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const AT = "gurost_at";
const RT = "gurost_rt";
const LI = "gurost_li";
const ACCESS_MS = 15 * 60 * 1000;
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MS = 60 * 1000;
// Two tabs refreshing at the same moment both send the same cookie; the second gets the first one's
// answer instead of looking like a stolen cookie.
const GRACE_MS = 30 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const sha256 = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const sameHash = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const name = part.slice(0, i).trim();
    if (!(name in out)) {
      try { out[name] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* not ours */ }
    }
  }
  return out;
}

// The user_sessions table and the plan, through Supabase's service role.
function supabaseStore(supabase = require("./db").supabase) {
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  return {
    async insert(row) { return must(await supabase.from("user_sessions").insert(row).select("id").single()); },
    async get(id) { return must(await supabase.from("user_sessions").select("*").eq("id", id).maybeSingle()); },
    async rotate(id, oldHash, version, newHash, at) {
      const rows = must(await supabase.from("user_sessions")
        .update({ refresh_token: newHash, token_version: version + 1, last_used_at: at })
        .eq("id", id).eq("refresh_token", oldHash).eq("revoked", false).select("id"));
      return rows.length === 1;
    },
    async revoke(id) { must(await supabase.from("user_sessions").update({ revoked: true }).eq("id", id)); },
    async revokeAll(userId, exceptId) {
      let q = supabase.from("user_sessions").update({ revoked: true }).eq("user_id", userId).eq("revoked", false);
      if (exceptId) q = q.neq("id", exceptId);
      must(await q);
    },
    async profileFor(userId) {
      const row = must(await supabase.from("api_keys").select("plan, email").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle());
      return { plan: row?.plan || "free", email: row?.email || null };
    }
  };
}

function createSessions({ store = supabaseStore(), secret = () => process.env.JWT_SECRET, now = () => Date.now(), allowed = () => require("./cors-policy").allowedOrigins(), log = console } = {}) {
  const cache = new Map(); // "user:<id>" / "live:<session>" -> { value, at }
  const recent = new Map(); // session id -> { prevHash, cookie, at } for the two-tabs case

  async function cached(key, load, fallback) {
    const hit = cache.get(key);
    if (hit && now() - hit.at < CACHE_MS) return hit.value;
    try {
      const value = await load();
      cache.set(key, { value, at: now() });
      return value;
    } catch (err) {
      // Database trouble: keep the last answer if there is one, never lock everyone out over it.
      log.warn(`[sessions] ${key.split(":")[0]} lookup failed: ${err.message}`);
      return hit ? hit.value : fallback;
    }
  }

  const isLocalHttp = (req) => !(req.secure || req.headers["x-forwarded-proto"] === "https") && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host || "");
  function cookieOptions(req, extra) {
    return { sameSite: "lax", secure: !isLocalHttp(req), path: "/", ...extra };
  }

  function setCookies(req, res, { userId, sid, refreshCookie, expiresAt }) {
    const access = jwt.sign({ sub: String(userId), sid, typ: "session" }, secret(), { expiresIn: Math.floor(ACCESS_MS / 1000) });
    const rtMaxAge = Math.max(0, expiresAt - now());
    res.cookie(AT, access, cookieOptions(req, { httpOnly: true, maxAge: ACCESS_MS }));
    res.cookie(RT, refreshCookie, cookieOptions(req, { httpOnly: true, maxAge: rtMaxAge, path: "/api/auth" }));
    res.cookie(LI, "1", cookieOptions(req, { httpOnly: false, maxAge: rtMaxAge }));
  }

  function clearCookies(req, res) {
    res.clearCookie(AT, cookieOptions(req, { httpOnly: true }));
    res.clearCookie(RT, cookieOptions(req, { httpOnly: true, path: "/api/auth" }));
    res.clearCookie(LI, cookieOptions(req, { httpOnly: false }));
  }

  // After a correct password: a new session row and the three cookies. false = cookies skipped
  // (no JWT_SECRET, or the table isn't there yet); the caller's existing login still works.
  async function start(req, res, { userId }) {
    if (!secret() || !userId) return false;
    const random = crypto.randomBytes(32).toString("base64url");
    const expiresAt = now() + SESSION_MS;
    try {
      const row = await store.insert({ user_id: String(userId), refresh_token: sha256(random), expires_at: new Date(expiresAt).toISOString() });
      setCookies(req, res, { userId, sid: row.id, refreshCookie: `${row.id}.${random}`, expiresAt });
      return true;
    } catch (err) {
      log.warn(`[sessions] Cookie login skipped: ${err.message}`);
      return false;
    }
  }

  function splitRefresh(cookie) {
    const [sid, random] = String(cookie || "").split(".");
    return sid && random && UUID_RE.test(sid) ? { sid, random } : null;
  }

  // gurost_rt -> a fresh pair of cookies, or { error }. An old cookie used again ends the session.
  async function refresh(req, res) {
    const parts = splitRefresh(parseCookies(req.headers.cookie)[RT]);
    if (!parts || !secret()) return { error: "no_session" };
    const { sid, random } = parts;
    const hash = sha256(random);
    const row = await store.get(sid);
    if (!row || row.revoked || Date.parse(row.expires_at) <= now()) return { error: "session_ended" };
    const expiresAt = Date.parse(row.expires_at);

    // This exact cookie was swapped moments ago (another tab, or a request still in flight): same answer.
    const r = recent.get(sid);
    if (r && sameHash(hash, r.prevHash) && now() - r.at < GRACE_MS) {
      setCookies(req, res, { userId: row.user_id, sid, refreshCookie: r.cookie, expiresAt });
      return { userId: row.user_id };
    }

    if (!sameHash(hash, row.refresh_token)) {
      // A refresh cookie that was already swapped has come back: someone has a copy. End the session.
      await store.revoke(sid);
      forget(sid);
      log.warn(`[sessions] Old refresh cookie reused for session ${sid}: session revoked (possible theft).`);
      return { error: "reused" };
    }

    const nextRandom = crypto.randomBytes(32).toString("base64url");
    const cookie = `${sid}.${nextRandom}`;
    recent.set(sid, { prevHash: hash, cookie, at: now() });
    const ok = await store.rotate(sid, hash, row.token_version, sha256(nextRandom), new Date(now()).toISOString());
    if (!ok) {
      // Revoked, or swapped by another server process in between: this cookie is done either way.
      if (recent.get(sid)?.cookie === cookie) recent.delete(sid);
      return { error: "session_ended" };
    }
    setCookies(req, res, { userId: row.user_id, sid, refreshCookie: cookie, expiresAt });
    return { userId: row.user_id };
  }

  function forget(sid) {
    cache.delete(`live:${sid}`);
    recent.delete(sid);
  }

  // The session this browser is signed in with, from either cookie (the access one may have expired).
  function currentSessionId(req) {
    const cookies = parseCookies(req.headers.cookie);
    const fromRt = splitRefresh(cookies[RT]);
    if (fromRt) return fromRt.sid;
    try { return jwt.decode(cookies[AT])?.sid || null; } catch { return null; }
  }

  async function logout(req, res) {
    const sid = currentSessionId(req);
    if (sid && UUID_RE.test(sid)) {
      await store.revoke(sid).catch((err) => log.warn(`[sessions] Logout revoke failed: ${err.message}`));
      forget(sid);
    }
    clearCookies(req, res);
  }

  // Sign out everywhere, or (password change) everywhere except this browser.
  async function revokeAll(userId, { keep } = {}) {
    await store.revokeAll(String(userId), keep && UUID_RE.test(keep) ? keep : undefined);
    for (const key of cache.keys()) if (key.startsWith("live:") && key !== `live:${keep}`) cache.delete(key);
  }

  // requireAuth's cookie path: { user } | { error: "token_expired" | "token_invalid" | "session_ended" } | null (no cookie).
  async function userFromCookie(req) {
    const token = parseCookies(req.headers.cookie)[AT];
    if (!token) return null;
    const key = secret();
    if (!key) return { error: "token_invalid" };
    let payload;
    try {
      payload = jwt.verify(token, key);
    } catch (err) {
      return { error: err.name === "TokenExpiredError" ? "token_expired" : "token_invalid" };
    }
    if (payload.typ !== "session" || !payload.sub || !payload.sid) return { error: "token_invalid" };
    const live = await cached(`live:${payload.sid}`, async () => {
      const row = await store.get(payload.sid);
      return !!row && !row.revoked && Date.parse(row.expires_at) > now();
    }, true);
    if (!live) return { error: "session_ended" };
    const profile = await cached(`user:${payload.sub}`, () => store.profileFor(payload.sub), { plan: "free", email: null });
    return { user: { id: payload.sub, email: profile.email, plan: profile.plan, sessionId: payload.sid } };
  }

  // CSRF: a change made with a cookie login must come from one of Gurost's own pages.
  function originAllowed(req) {
    const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const own = `${proto}://${req.headers.host}`;
    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
      try { origin = new URL(req.headers.referer).origin; } catch { origin = null; }
    }
    if (!origin || origin === "null") return false;
    return origin === own || allowed().has(origin);
  }
  const needsOriginCheck = (req) => UNSAFE.has(String(req.method).toUpperCase());

  return { start, refresh, logout, revokeAll, userFromCookie, originAllowed, needsOriginCheck, clearCookies, currentSessionId, parseCookies, _cache: cache };
}

// The HTTP side, for server.js. Mounted before the global requireAuth (refresh and logout must work
// with an expired access cookie); sign-out-everywhere is mounted after it.
function sessionRoutes(sessions) {
  const guard = (req, res) => {
    if (sessions.originAllowed(req)) return true;
    res.status(403).json({ error: "This request must come from a Gurost page.", code: "bad_origin" });
    return false;
  };
  return {
    async refresh(req, res) {
      if (!guard(req, res)) return;
      try {
        const r = await sessions.refresh(req, res);
        if (r.error) {
          sessions.clearCookies(req, res);
          return res.status(401).json({ error: "Please log in again.", code: r.error });
        }
        res.json({ refreshed: true });
      } catch (err) {
        console.error("[sessions] Refresh failed:", err.message);
        res.status(503).json({ error: "Could not refresh your login. Try again in a moment.", code: "refresh_unavailable" });
      }
    },
    async logout(req, res) {
      if (!guard(req, res)) return;
      await sessions.logout(req, res);
      res.json({ loggedOut: true });
    },
    async logoutAll(req, res) {
      if (!guard(req, res)) return;
      try {
        await sessions.revokeAll(req.user.id);
        sessions.clearCookies(req, res);
        res.json({ loggedOutEverywhere: true });
      } catch (err) {
        console.error("[sessions] Sign out everywhere failed:", err.message);
        res.status(500).json({ error: "Could not sign out other devices. Try again." });
      }
    }
  };
}

module.exports = { createSessions, sessionRoutes, supabaseStore, parseCookies, sha256, COOKIE: { AT, RT, LI }, ACCESS_MS, SESSION_MS, CACHE_MS, GRACE_MS };
