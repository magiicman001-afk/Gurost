/**
 * Gurost authentication and plan enforcement.
 *
 * This module VERIFIES credentials — it doesn't issue them. You need one
 * of two things upstream of this:
 *   (a) Supabase Auth (or your own login endpoint) issuing JWTs, with
 *       JWT_SECRET here set to that issuer's signing secret, or
 *   (b) an api_keys table you populate when a user generates a key in
 *       your dashboard (schema below).
 * Neither login/signup nor an API-key-generation endpoint exists in this
 * file — those are product surface you build, this is the gate that
 * checks what they produce.
 *
 * Required Supabase tables (run in the SQL editor):
 *
 *   create table api_keys (
 *     key_hash text primary key,
 *     user_id uuid not null,
 *     email text,
 *     plan text not null default 'free',
 *     revoked boolean not null default false,
 *     created_at timestamptz not null default now()
 *   );
 *
 *   create table build_events (
 *     id bigint generated always as identity primary key,
 *     user_id uuid not null,
 *     created_at timestamptz not null default now()
 *   );
 *   create index on build_events (user_id, created_at);
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { supabase } = require("./lib/db");
const security = require("./security");

const JWT_SECRET = process.env.JWT_SECRET;
const PLAN_LIMITS = { free: 3, pro: 30, unlimited: 150, ultimate: Infinity };

function hashApiKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function resolveApiKey(rawKey) {
  const keyHash = hashApiKey(rawKey);
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id, email, plan, revoked")
    .eq("key_hash", keyHash)
    .single();
  if (error || !data || data.revoked) return null;
  return { id: data.user_id, email: data.email || null, plan: data.plan || "free" };
}

function resolveJwt(token) {
  if (!JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.sub || payload.userId, email: payload.email || null, plan: payload.plan || "free" };
  } catch {
    return null;
  }
}

// SSO login is gated to the Ultimate plan — a valid SSO token alone
// isn't enough, the authenticated user's own plan (looked up separately,
// the SSO token doesn't carry it) must actually be "ultimate". This is
// what makes SSO an Ultimate-tier *feature* rather than just an
// alternate login method anyone could use.
async function resolveSSO(token) {
  let ssoIdentity;
  try {
    ssoIdentity = security.verifySSOToken(token);
  } catch {
    return null;
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("plan")
    .eq("user_id", ssoIdentity.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = !error && data ? data.plan : "free";
  if (plan !== "ultimate") return null; // valid identity, but SSO isn't unlocked for this plan

  return { id: ssoIdentity.id, plan, org: ssoIdentity.org, ssoProvider: ssoIdentity.ssoProvider };
}

// Accepts `x-api-key: <key>`, `Authorization: Bearer <jwt>` (either this
// app's own JWT, or a Supabase-issued SSO token — tried in that order).
async function requireAuth(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  const authHeader = req.headers["authorization"];

  let user = null;
  try {
    if (apiKey) {
      user = await resolveApiKey(apiKey);
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      user = resolveJwt(token) || (await resolveSSO(token));
    }
  } catch (err) {
    console.error("Auth check failed:", err.message);
    return res.status(500).json({ error: "Authentication check failed." });
  }

  if (!user) {
    security.auditLog("auth_failed", req, "No valid credentials").catch(() => {});
    security.trackViolation(req.ip, "auth_failed", req.path).catch(() => {});
    return res.status(401).json({ error: "Valid API key (x-api-key header) or JWT (Authorization: Bearer) required." });
  }

  req.user = user;
  if (user.ssoProvider) security.auditLog("sso_login", req, `provider=${user.ssoProvider} org=${user.org || "none"}`).catch(() => {});
  next();
}

// Pass a lookup function (projectId) -> project | null, e.g. server.js's
// existing in-memory PROJECTS.get. Requires requireAuth to have run first.
function requireProjectOwnership(lookupProject) {
  // lookupProject can return a project directly OR a Promise that
  // resolves to one — `await` on a non-Promise value just resolves
  // immediately, so this one function correctly supports both a
  // plain synchronous in-memory lookup and a real async one (e.g.
  // one that falls back to a database fetch when nothing's in
  // memory) without needing two separate versions of this middleware.
  return async (req, res, next) => {
    const projectId = req.body.projectId || req.params.id;
    if (!projectId) return next(); // routes that create a new project have nothing to own yet
    const project = await lookupProject(projectId);
    if (!project) return res.status(404).json({ error: "Project not found." });
    if (project.userId && project.userId !== req.user.id) {
      return res.status(403).json({ error: "You don't have access to this project." });
    }
    next();
  };
}

// Requires requireAuth to have run first. Counts this calendar month's
// build_events for the user against their plan's limit.
async function enforcePlanLimit(req, res, next) {
  if (isAdmin(req.user?.email)) return next();

  const plan = req.user.plan || "free";
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (limit === Infinity) return next();

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("build_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", req.user.id)
    .gte("created_at", periodStart.toISOString());

  if (error) {
    console.error("Plan limit check failed:", error.message);
    return res.status(500).json({ error: "Could not verify plan limit." });
  }

  if (count >= limit) {
    return res.status(429).json({ error: `Monthly build limit reached for the ${plan} plan (${limit}/mo). Upgrade to continue.` });
  }

  next();
}

async function recordBuildEvent(userId) {
  const { error } = await supabase.from("build_events").insert({ user_id: userId });
  if (error) console.error("Failed to record build event:", error.message);
}

// Gates admin routes to a fixed allowlist of emails, not a plan or role —
// admin access to billing/usage data shouldn't be purchasable. Requires
// requireAuth to have run first, and requires the authenticated user's
// credential to actually carry an email (JWT payload or api_keys row).
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user?.email)) {
    return res.status(403).json({ error: "Admin access only." });
  }
  next();
}

// Real, current gate for Business Assistant — only plans meant to
// include it can actually use it, checked here on the server, not
// just a hidden button on the frontend. A hidden button alone is
// never real security; this is the part that actually matters.
//
// REAL NAMING NOTE, same one credit-system.js already flags: the live
// plan field still uses unlimited/ultimate, not the newer Max/Custom
// names agreed on for the landing page. Using the real, current values
// here so this actually works today — rename together with the wider
// billing.js reconciliation, not separately here.
const BUSINESS_ASSISTANT_PLANS = ["unlimited", "ultimate"];

function requireBusinessAssistant(req, res, next) {
  if (!BUSINESS_ASSISTANT_PLANS.includes(req.user?.plan)) {
    return res.status(402).json({ error: "Business Assistant is included with the Max and Custom plans. Upgrade to get access." });
  }
  next();
}

module.exports = {
  requireAuth,
  requireProjectOwnership,
  enforcePlanLimit,
  recordBuildEvent,
  hashApiKey,
  requireAdmin,
  isAdmin,
  requireBusinessAssistant,
  PLAN_LIMITS
};
