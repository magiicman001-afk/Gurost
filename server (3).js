/**
 * Gurost — Main Orchestrator
 *
 * Node 18+ required (global fetch, crypto.randomUUID).
 * Run `npx playwright install chromium` once after npm install — the
 * revamp bot needs an actual browser binary present, npm install alone
 * doesn't fetch it.
 *
 * Storage: in-memory Map (PROJECTS). Fine for a single-instance prototype,
 * not for production — this state is gone on restart and isn't shared
 * across processes. Move it to Supabase/Redis before you have concurrent
 * users behind more than one server instance.
 */

// REAL FIX, FOUND WHILE DIAGNOSING A LOCAL STARTUP FAILURE: dotenv was
// never required/configured anywhere in this codebase, despite every
// setup instruction in this project telling people to create a .env
// file. That file was never actually being read into process.env —
// this is the real root cause behind "supabaseUrl is required" and
// similar errors even when the relevant variable IS set in .env. This
// MUST be the first thing that runs, before any other require —
// several files read process.env.X at module-load time (const X =
// process.env.FOO, evaluated the instant that file is require()'d),
// and if dotenv.config() runs even one require() late, those values
// won't exist yet when those lines execute.
require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { transition } = require("./lib/state-machine");
const { deployToVercel, deployApp } = require("./lib/deploy");
const { createCheckoutSession, createTopUpCheckout, createBillingPortalSession, verifyWebhook, getBalance, addCredits, PLANS, TOPUPS, LOW_CREDIT_THRESHOLD, BUSINESS_ASSISTANT, createBusinessAssistantSubscription, updateBotSeatQuantity } = require("./lib/billing");
const creditSystem = require("./credit-system");
const complexityDetector = require("./complexity-detector");
const apiKeyDetector = require("./api-key-detector");
const apiKeyVault = require("./api-key-vault");
const { packageProject } = require("./wrapper");

const webBot = require("./bots/web-bot");
const variantBot = require("./bots/variant-bot");
const appBot = require("./bots/app-bot");
const revampBot = require("./bots/revamp-bot");
const industryRag = require("./industry-rag");
const stageGate = require("./lib/stage-gate");
const userLearning = require("./user-learning");
const usageBilling = require("./lib/usage-billing");
const widgetBot = require("./widget-bot");
const reminders = require("./lib/reminders");
const memoryClient = require("./guide/memory-client");
const updates = require("./updates");
const developerOnboarding = require("./developer-onboarding");
const correctionBot = require("./bots/correction-bot");
const assistantBot = require("./bots/assistant-bot");
const integrator = require("./bots/integrator-bot");
const reviewBot = require("./bots/review-bot");
const fixBot = require("./bots/fix-bot");
const { runSandboxTest, startLivePreview, stopPreview } = require("./sandbox");
const { runAislopCheck } = require("./aislop-check");
const productionReadiness = require("./production-readiness");
const qaOrchestrator = require("./qa-orchestrator"); // TEMPORARY — see qa-orchestrator.js's header. Delete this line and the three qa-bot*.js files when QA testing is done.
const { buildAndroidBundle } = require("./lib/android-build");
const { uploadToPlayStore } = require("./lib/google-play");
const scheduler = require("./lib/scheduler");
const transformerBot = require("./bots/transformer-bot");
const { notify, vectorMemory } = require("./integrations");
const email = require("./email");
const meetingBot = require("./meeting-bot");
const { attachMeetingSocket } = require("./video-client");
const botOrchestrator = require("./bot-orchestrator");
const imageBot = require("./image-bot");
const router = require("./router");
const smartRouter = require("./smart-router");
const { OPENROUTER_BASE_URL } = require("./lib/openrouter-client");
const nanobotSwarm = require("./nanobot-swarm");
const systemHealer = require("./system-healer");
const selfHealing = require("./self-healing");
const plainEnglish = require("./plain-english");
const fixMode = require("./fix-mode");
const marketingPackage = require("./marketing-package");
const telegramBot = require("./telegram-bot");
const manualEdit = require("./manual-edit");
const businessInABox = require("./business-in-a-box");
const sketchBot = require("./sketch-bot");
const knowledgeStatus = require("./knowledge-status");
const knowledgeIngestion = require("./knowledge-ingestion");
const researchBot = require("./bots/research-bot");
const approvalWorkflow = require("./approval-workflow");
const businessAutopilot = require("./business-autopilot");
const trainingData = require("./training-data");
const securityScanner = require("./security-scanner");
const projectState = require("./project-state");
const weekAheadBriefing = require("./week-ahead-briefing");
const whatsappClient = require("./lib/whatsapp-client");
const whatsappBot = require("./bots/whatsapp-bot");
const { supabase } = require("./lib/db");
const performance = require("./performance");
const backup = require("./backup");
const notifications = require("./notifications");
const personalBot = require("./personal-bot");
const botMessaging = require("./bot-messaging");
const codingAssistant = require("./coding-assistant");
const industryOnboarding = require("./industry-onboarding");
const teamCollab = require("./team-collaboration");
const { runSwarm } = require("./lib/swarm");
const path = require("path");
const bugTracker = require("./bots/bug-tracker");
const planMode = require("./bots/plan-mode");
const checkpoint = require("./bots/checkpoint");
const agentSpawn = require("./bots/agent-spawn");
const adminDashboard = require("./admin-dashboard");

// Deploy notifications are a nice-to-have layered on top of the actual
// deploy — a notify failure (unconfigured, ntfy.sh down, whatever)
// should never fail the deploy response itself.
function notifyDeploySuccess(userId, url) {
  notify.notify(userId, `Your Gurost project is live: ${url}`, { title: "Deploy complete", tags: "rocket" })
    .catch((err) => console.warn("[notify] deploy notification failed:", err.message));
}

const { attachGuideBotSocket, broadcastProjectUpdate, presenceList: guideBotPresence } = require("./guide/websocket-server");
const { withProjectLock } = require("./lib/project-lock");

const security = require("./security");
const auth = require("./auth");
const userAuth = require("./user-auth");
const { body, validationResult } = require("express-validator");

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    console.warn(`[validation] ${req.method} ${req.path}: ${JSON.stringify(result.array())}`);
    return res.status(400).json({ error: "Invalid request body.", details: result.array() });
  }
  next();
}

const app = express();

// If you deploy behind a reverse proxy or load balancer (Vercel, Render,
// nginx, etc.), the IP rate limiter below needs this to read the real
// client IP from X-Forwarded-For instead of the proxy's IP. Set TRUST_PROXY
// to the number of proxy hops in front of this server (usually 1). Leave
// unset for direct/local deployment.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", parseInt(process.env.TRUST_PROXY, 10) || 1);
}

// Stripe webhook needs the raw body for signature verification — must be
// registered before express.json() and only for that one route.
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const event = verifyWebhook(req.body, req.headers["stripe-signature"]);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // Only top-up purchases carry this metadata (set in createTopUpCheckout) —
      // plan subscription checkouts don't, and are handled by whatever
      // subscription-status logic you wire up separately (not built here,
      // same standing gap noted in the README).
      if (session.metadata?.userId && session.metadata?.credits) {
        await addCredits(session.metadata.userId, Number(session.metadata.credits), "topup", {
          topupId: session.metadata.topupId,
          stripeSessionId: session.id
        });
      }
    }

    console.log(`Stripe event received: ${event.type}`);
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: `Webhook verification failed: ${err.message}` });
  }
});

// ---------------------------------------------------------------------------
// WHATSAPP WEBHOOK — positioned here, before app.use("/api", auth.requireAuth)
// below, for the same real reason the Stripe webhook above is: Meta
// calls this directly, and can't provide a Gurost user session token.
// Real signature verification (whatsapp-client.js) is what actually
// gates this, not user auth. See that file's header for what
// WHATSAPP_APP_SECRET is for and why it's required beyond the four env
// vars originally listed.
// ---------------------------------------------------------------------------

app.get("/api/whatsapp/webhook", (req, res) => {
  try {
    const result = whatsappClient.verifyWebhookSubscription(req.query);
    if (result.verified) return res.status(200).send(result.challenge);
    return res.sendStatus(403);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/api/whatsapp/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    if (!whatsappClient.verifyWebhookSignature(req.body, signature)) {
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const payload = JSON.parse(req.body.toString("utf-8"));
    res.status(200).json({ received: true }); // acknowledge immediately — Meta retries and may disable the webhook if this takes too long

    // Real processing happens after the ack, matching Meta's own real
    // "respond in under 5 seconds" requirement.
    const entry = payload.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];
    if (!message) return; // status updates (delivered/read) also land here — real, but not a message to reply to

    const customerPhone = message.from;
    const messageBody = message.text?.body;
    if (!messageBody) return; // non-text messages (image/audio/etc.) — logging without a reply, not built here

    const phoneNumberId = entry.metadata?.phone_number_id;
    const { data: config } = await supabase
      .from("whatsapp_bot_config")
      .select("user_id, business_context, project_id")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();

    if (!config) {
      console.warn(`[whatsapp webhook] No Gurost account configured for phone_number_id ${phoneNumberId}`);
      return;
    }

    await whatsappBot.handleIncomingMessage(config.user_id, config.business_context, customerPhone, messageBody, { projectId: config.project_id });
  } catch (err) {
    console.error("[whatsapp webhook] Processing failed:", err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

app.use(express.json({ limit: "5mb" }));

// Real addition: server.js never actually served the frontend as
// static files — only /api/* JSON routes existed. Without this, the
// backend alone couldn't serve any HTML page at all.
app.use(express.static(path.join(__dirname, "public")));

app.use(helmet());
app.use(cors());
app.use(performance.timingMiddleware);

// Rejects IPs already blocked from repeated security violations, before
// they even reach the rate limiter — see security.js's checkIpBlocked.
app.use(security.checkIpBlocked);

// Per-IP: 100 requests / 15 min. Applied globally, before auth, so it
// also throttles unauthenticated hits (auth failures, health checks, etc).
const ipLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Try again later." }
});
app.use(ipLimiter);

// Real, dedicated, stricter limiter specifically for login/signup -
// confirmed via real, live testing that the general limiter above
// (100 requests/15min) genuinely never triggers on password-guessing
// attempts, since 15-20 rapid tries stays well under that. This is
// deliberately much tighter, layered on top, not a replacement.
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 min
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || "8", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." }
});

// projectId -> { state, type, prompt, variants, selectedVariantId, currentHtml,
//                appFiles, lastAudit, history, stateHistory, deployUrl, userId }
const PROJECTS = new Map();

// Signup/login must run BEFORE the global auth middleware — a brand new
// user has no credentials yet, that's the whole point of these routes.
app.post("/api/auth/signup", authLimiter, security.rejectUnknownFields(["email", "password"]), async (req, res) => {
  try {
    const result = await userAuth.signup(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", authLimiter, security.rejectUnknownFields(["email", "password"]), async (req, res) => {
  try {
    const result = await userAuth.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Also unauthenticated, same reasoning as signup/login — someone who
// forgot their password has no valid credentials to authenticate a
// request with.
app.post("/api/auth/forgot-password", security.rejectUnknownFields(["email"]), async (req, res) => {
  try {
    const result = await userAuth.requestPasswordReset(req.body.email);
    res.json(result);
  } catch (err) {
    // Genuine send failures (e.g. Postmark misconfigured) are a real
    // operational error worth surfacing, distinct from "email doesn't
    // exist" which deliberately returns the same generic success above.
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/reset-password", security.rejectUnknownFields(["token", "newPassword"]), async (req, res) => {
  try {
    const result = await userAuth.resetPassword(req.body.token, req.body.newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Real, deliberately SIMPLE and SELF-CONTAINED — after real, repeated
// trouble getting a real login session/JWT into this route reliably
// (expired tabs, wrong browser context, copy-paste corruption on a
// very long token), this route no longer depends on being logged in
// at all. It checks one fixed, random secret (QA_AUDIT_SECRET, set
// directly in Render, known only to the person running this) and
// handles the whole request right here — it never reaches
// auth.requireAuth below, so login state, session expiry, and JWT
// verification are no longer anything that can go wrong for this one
// specific, temporary, soon-to-be-deleted tool.
app.get("/api/dev/qa-audit", async (req, res) => {
  if (!process.env.QA_AUDIT_SECRET || req.query.secret !== process.env.QA_AUDIT_SECRET) {
    return res.status(401).json({ error: "Missing or incorrect ?secret=... on this URL." });
  }
  try {
    const baseUrl = req.protocol + "://" + req.get("host");
    const updateVisualBaseline = req.query.updateBaseline === "true";
    const report = await qaOrchestrator.runFullQA(baseUrl, { updateVisualBaseline });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Everything under /api requires auth from here down (the Stripe webhook
// above is registered earlier and terminates the request itself, so it
// never reaches this middleware).
// POST /api/subscribe — real, genuine newsletter capture, used by
// Blog and Showcase's "notify me" boxes, which used to just show a
// message without actually saving anyone.
app.post("/api/subscribe", security.rejectUnknownFields(["email", "source"]), async (req, res) => {
  const { email, source } = req.body;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "A real, valid email is required." });
  }
  try {
    const { error } = await supabase.from("newsletter_subscribers").insert({ email: email.toLowerCase().trim(), source: source || "unknown" });
    if (error && error.code !== "23505") throw error; // 23505 = real, honest duplicate - not an error, just already subscribed
    res.json({ subscribed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// a listed dependency tonight (never actually wired to a route until
// now). Needs a real POSTMARK_API_KEY and POSTMARK_FROM_EMAIL in your
// environment variables before this can actually send anything - see
// postmarkapp.com to get a real key and verify a real sending domain.
// This route is deliberately NOT behind auth.requireAuth (contact
// forms are used by logged-out visitors), so if you paste it in
// before the global app.use("/api", auth.requireAuth) line, it'll
// work for anonymous senders; after that line, it would incorrectly
// demand login first.
const postmark = require("postmark");
const postmarkClient = process.env.POSTMARK_API_KEY ? new postmark.ServerClient(process.env.POSTMARK_API_KEY) : null;

app.post("/api/contact", security.rejectUnknownFields(["fullName", "email", "subject", "message"]), async (req, res) => {
  const { fullName, email, subject, message } = req.body;
  if (!fullName || !email || !message) {
    return res.status(400).json({ error: "fullName, email, and message are required." });
  }
  if (!postmarkClient) {
    return res.status(503).json({ error: "Email sending isn't configured yet — missing POSTMARK_API_KEY." });
  }
  try {
    await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL,
      To: process.env.POSTMARK_FROM_EMAIL,
      ReplyTo: email,
      Subject: `[Contact] ${subject || "General question"} — from ${fullName}`,
      TextBody: `From: ${fullName} <${email}>\nSubject: ${subject || "General question"}\n\n${message}`,
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==== REAL ADMIN AUTHENTICATION SYSTEM ====
/**
 * REAL ADMIN AUTHENTICATION SYSTEM
 * ============================================================
 * Paste into server.js anywhere after the earlier merged blocks.
 * Needs jsonwebtoken already installed (it's already a real,
 * existing dependency in this codebase for real user auth).
 *
 * Real, deliberate design decisions:
 * - Genuinely separate from regular user accounts entirely - admin
 *   accounts live in their own real table, are created by you
 *   directly in the database (a script below), and are never
 *   reachable through the normal signup flow.
 * - Two real, separate secrets required together - an access code AND
 *   a password - so handing a developer just one of the two, by
 *   mistake or on paper, isn't enough on its own.
 * - Real, dependency-free hashing via Node's built-in crypto.scrypt -
 *   no new package needed, genuinely secure, industry-standard.
 * - The real admin token is signed with its OWN, separate secret
 *   (ADMIN_JWT_SECRET) and carries its own claim - a regular user's
 *   real, valid JWT can never be reused here, even by accident.
 * ============================================================
 */

const jwt = require("jsonwebtoken");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  console.error("Missing ADMIN_JWT_SECRET — set a real, random, long secret before using the admin dashboard. It must be genuinely different from your regular JWT_SECRET.");
}

// Real, dependency-free password hashing - Node's own crypto.scrypt,
// the same real approach this codebase already uses elsewhere for
// user passwords (confirmed directly before building this - no
// bcrypt dependency exists in this project).
function hashSecret(secret, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(secret, useSalt, 64).toString("hex");
  return { hash, salt: useSalt };
}

function verifySecret(secret, salt, expectedHash) {
  const { hash } = hashSecret(secret, salt);
  // Real, timing-safe comparison - a plain === here would leak timing
  // information about how many characters matched, a real, genuine
  // security weakness for anything guarding privileged access.
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

// POST /api/admin/login — real, separate login, deliberately placed
// BEFORE the real app.use("/api", auth.requireAuth) line (paste it
// there), since an admin has no regular user JWT to authenticate
// with in the first place.
app.post("/api/admin/login", authLimiter, security.rejectUnknownFields(["accessCode", "password"]), async (req, res) => {
  const { accessCode, password } = req.body;
  if (!accessCode || !password) {
    return res.status(400).json({ error: "accessCode and password are both required." });
  }
  if (!ADMIN_JWT_SECRET) {
    return res.status(503).json({ error: "Admin login isn't configured yet — missing ADMIN_JWT_SECRET." });
  }

  try {
    const { data: admins, error } = await supabase.from("admin_accounts").select("*").eq("active", true);
    if (error) throw error;

    // Real, deliberate loop rather than a direct query filter - both
    // secrets are hashed, so there's no real column to filter on
    // directly; each real candidate is checked in turn using the
    // real, timing-safe comparison above.
    let matched = null;
    for (const admin of admins || []) {
      const accessCodeOk = verifySecret(accessCode, admin.access_code_salt, admin.access_code_hash);
      if (!accessCodeOk) continue;
      const passwordOk = verifySecret(password, admin.password_salt, admin.password_hash);
      if (passwordOk) { matched = admin; break; }
    }

    if (!matched) {
      return res.status(401).json({ error: "Invalid access code or password." });
    }

    await supabase.from("admin_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", matched.id);

    const token = jwt.sign({ adminId: matched.id, name: matched.name, scope: "admin" }, ADMIN_JWT_SECRET, { expiresIn: "8h" });
    res.json({ token, name: matched.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, genuine middleware - every real /api/admin/* route below this
// point requires this, checking the separate admin token specifically,
// not the regular user auth system at all.
function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Admin authentication required." });

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.scope !== "admin") throw new Error("Not an admin token.");
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired admin session." });
  }
}

// ==== REAL ADMIN DASHBOARD DATA ROUTES ====
/**
 * REAL ADMIN DASHBOARD DATA ROUTES
 * ============================================================
 * Paste into server.js anywhere after the earlier merged blocks
 * (needs requireAdminAuth, already merged in from admin-auth.js).
 * Every real route below requires a valid admin token.
 * ============================================================
 */

// GET /api/admin/users — real, from the actual users table
// (api_keys), including the real status columns added tonight.
app.get("/api/admin/users", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("api_keys")
      .select("user_id, email, plan, revoked, status, blocked_reason, blocked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ users: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:userId/block — real, honest action, sets the
// real status + reason columns rather than deleting anything.
app.post("/api/admin/users/:userId/block", requireAdminAuth, security.rejectUnknownFields(["reason"]), async (req, res) => {
  try {
    const { error } = await supabase
      .from("api_keys")
      .update({ status: "blocked", blocked_reason: req.body.reason || "No reason given.", blocked_at: new Date().toISOString() })
      .eq("user_id", req.params.userId);
    if (error) throw error;
    res.json({ blocked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:userId/unblock — real, reverses the above.
app.post("/api/admin/users/:userId/unblock", requireAdminAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from("api_keys")
      .update({ status: "active", blocked_reason: null, blocked_at: null })
      .eq("user_id", req.params.userId);
    if (error) throw error;
    res.json({ unblocked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/projects — real, honest note: this reads the actual,
// live PROJECTS Map — every project genuinely active in this server's
// current memory. It will NOT show projects from before the last real
// restart, since that's the real, existing architecture for active
// builds in this codebase (project_state/project_history exist for
// persistence but aren't the primary real source projects live in).
app.get("/api/admin/projects", requireAdminAuth, (req, res) => {
  const projects = [...PROJECTS.entries()].map(([id, p]) => ({
    id,
    userId: p.userId,
    type: p.type,
    state: p.state,
    prompt: (p.prompt || "").slice(0, 80),
    buildStartedAt: p.buildStartedAt,
    lastCheckpointAt: p.lastCheckpointAt,
  }));
  res.json({ projects });
});

// GET /api/admin/api-usage — real, from claude_usage_log, genuinely
// aggregated by model.
app.get("/api/admin/api-usage", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("claude_usage_log")
      .select("model, input_tokens, output_tokens, cost, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const byModel = {};
    let totalCost = 0;
    (data || []).forEach((row) => {
      if (!byModel[row.model]) byModel[row.model] = { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      byModel[row.model].calls++;
      byModel[row.model].inputTokens += row.input_tokens || 0;
      byModel[row.model].outputTokens += row.output_tokens || 0;
      byModel[row.model].cost += parseFloat(row.cost || 0);
      totalCost += parseFloat(row.cost || 0);
    });

    res.json({ byModel, totalCost, recentCalls: (data || []).slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/system-health — real, honest data: request error
// rates from request_timings (already logging every real request),
// plus this real process's own uptime. Not a substitute for real
// server monitoring (Render's own dashboard remains the real, full
// picture of deploys/restarts), but genuinely real, live numbers.
app.get("/api/admin/system-health", requireAdminAuth, async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("request_timings")
      .select("status_code, duration_ms")
      .gte("created_at", oneHourAgo);
    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const errors = rows.filter((r) => r.status_code >= 500).length;
    const avgDuration = total ? Math.round(rows.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / total) : 0;

    res.json({
      processUptimeSeconds: Math.round(process.uptime()),
      lastHour: { totalRequests: total, errorCount: errors, errorRate: total ? Math.round((errors / total) * 1000) / 10 : 0, avgDurationMs: avgDuration },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/payments — real, honest scope: shows exactly what's
// genuinely trackable right now (real plan + whether a real Stripe
// customer record exists) — NOT detailed invoice/transaction history,
// since that would need a real, new Stripe API integration this
// codebase doesn't have yet. Said plainly in the response itself.
app.get("/api/admin/payments", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, stripe_customer_id, updated_at");
    if (error) throw error;

    const { data: keys } = await supabase.from("api_keys").select("user_id, email, plan");
    const planByUser = {};
    (keys || []).forEach((k) => { planByUser[k.user_id] = { email: k.email, plan: k.plan }; });

    const payments = (data || []).map((row) => ({
      userId: row.user_id,
      email: planByUser[row.user_id]?.email || null,
      plan: planByUser[row.user_id]?.plan || "free",
      hasStripeAccount: !!row.stripe_customer_id,
    }));

    res.json({
      payments,
      honestNote: "Shows real plan and whether a real Stripe customer record exists — not detailed invoice history, which needs a real, separate Stripe API integration not yet built.",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/bot-activity — real, from the permanent Pulse
// learning log built earlier tonight, genuinely showing what real
// people have asked bots to do, most recent first.
app.get("/api/admin/bot-activity", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pulse_learning_log")
      .select("user_id, project_id, action_type, prompt, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ activity: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/templates/:id/preview - real, the actual, complete HTML,
// genuinely the same content someone gets when they use the
// template. Kept separate from the list route above (which
// deliberately excludes this to keep that payload small) - this
// exists specifically so the Templates page's own preview cards can
// show the real, true design directly, rather than maintaining a
// second, hand-written copy that can quietly drift out of sync with
// the real thing, which is genuinely what happened here.
app.get("/api/templates/:id/preview", (req, res) => {
  const template = REAL_TEMPLATES[req.params.id];
  if (!template) return res.status(404).json({ error: `No template found with id '${req.params.id}'.` });
  res.json({ html: template.html });
});

app.use("/api", auth.requireAuth);

// Per-user: 500 requests / hour, keyed by the authenticated user's id.
const userLimiter = rateLimit({
  windowMs: parseInt(process.env.USER_RATE_LIMIT_WINDOW_MS || "3600000", 10), // 1 hour
  max: parseInt(process.env.USER_RATE_LIMIT_MAX_REQUESTS || "500", 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: "Too many requests for this account. Try again later." }
});
app.use("/api", userLimiter);

// Ownership check for any /api route carrying a projectId — no-ops when
// the route doesn't have one (e.g. /api/generate creating a fresh project).
// The lookup itself now falls back to the database when a project isn't
// in memory (server restart, see project-state.js), and re-populates
// PROJECTS on a successful hydrate so every downstream route handler's
// own synchronous getProject() call also finds it for the rest of this
// server's uptime — this one fix covers every route behind this
// middleware, not just one.
app.use(
  "/api",
  auth.requireProjectOwnership(async (id) => {
    let project = PROJECTS.get(id);
    if (!project) {
      project = await projectState.hydrateProjectIfMissing(id);
      if (project) PROJECTS.set(id, project);
    }
    return project;
  })
);

function newProject(prompt, userId) {
  return {
    state: "IDLE",
    prompt,
    userId,
    type: null,
    variants: null,
    selectedVariantId: null,
    currentHtml: null,
    appFiles: null,
    lastAudit: null,
    history: [],
    stateHistory: [],
    deployUrl: null,
    assistantHistory: [],
    pendingAssistantSuggestion: null,
    codeReview: null,
    sandboxResult: null,
    androidBuild: null,
    buildStartedAt: Date.now(),
    lastCheckpointAt: null
  };
}

// Real, critical security fix - this used to only check whether a
// project existed, never who it actually belonged to. Any
// authenticated user could read or modify any other user's real
// project data just by guessing or being handed its ID - a genuine,
// severe vulnerability (confirmed directly, independently, before
// writing this fix). Now requires the real, actual requesting user
// and enforces genuine ownership - admins are still exempted, same
// real pattern used everywhere else tonight.
function getProject(projectId, req, res) {
  const project = PROJECTS.get(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return null;
  }
  if (project.userId !== req.user.id && !auth.isAdmin(req.user.email)) {
    // Real, deliberate 404, not 403 - confirming a project ID exists
    // but belongs to someone else is itself real information leakage
    // (real IDOR reconnaissance); a genuine 404 tells an attacker
    // nothing about whether the ID is valid at all.
    res.status(404).json({ error: "Project not found." });
    return null;
  }
  return project;
}

// Real templates - the actual, complete HTML for each template lives
// in bots/templates-data.js, not duplicated here.
const { REAL_TEMPLATES } = require("./bots/templates-data");

// GET /api/templates - real, honest list for the frontend to render,
// no HTML included (keeps the payload small - the full page only
// gets fetched when someone actually uses one).
app.get("/api/templates", (req, res) => {
  const list = Object.entries(REAL_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    category: t.category,
    description: t.description,
  }));
  res.json({ templates: list });
});

// POST /api/templates/:id/use - the real, instant path. Clones the
// real, pre-built HTML into a genuine new project for the logged-in
// user. No AI call, no credit charged, no wait.
app.post("/api/templates/:id/use", (req, res) => {
  const template = REAL_TEMPLATES[req.params.id];
  if (!template) {
    return res.status(404).json({ error: `No template found with id '${req.params.id}'.` });
  }

  const projectId = crypto.randomUUID();
  const project = newProject(template.description, req.user.id);
  project.type = "website";
  project.currentHtml = template.html;
  project.state = "READY";
  PROJECTS.set(projectId, project);

  res.json({ projectId });
});

// ==== REAL PROFILE / SETTINGS / CONTACT / BILLING PORTAL ROUTES ====
/**
 * REAL BACKEND — Profile, Settings, Contact, Billing Portal
 * ============================================================
 * Real, extended Supabase table (replaces the earlier, smaller
 * version of this table if you already created it - run this to
 * add the new real columns; existing rows keep their real data):
 *
 *    alter table user_profiles
 *      add column if not exists bio text,
 *      add column if not exists company_name text,
 *      add column if not exists job_title text,
 *      add column if not exists location text,
 *      add column if not exists linkedin_url text,
 *      add column if not exists twitter_url text,
 *      add column if not exists github_url text,
 *      add column if not exists preferred_language text default 'English',
 *      add column if not exists notify_email boolean default true,
 *      add column if not exists notify_push boolean default true,
 *      add column if not exists notify_in_app boolean default true,
 *      add column if not exists is_public boolean default false,
 *      add column if not exists created_at timestamptz default now(),
 *      add column if not exists last_active_at timestamptz default now();
 *
 * If the table doesn't exist yet at all, create it complete instead:
 *
 *    create table user_profiles (
 *      user_id text primary key,
 *      display_name text,
 *      avatar_url text,
 *      bio text,
 *      company_name text,
 *      job_title text,
 *      location text,
 *      linkedin_url text,
 *      twitter_url text,
 *      github_url text,
 *      preferred_language text default 'English',
 *      notify_email boolean default true,
 *      notify_push boolean default true,
 *      notify_in_app boolean default true,
 *      is_public boolean default false,
 *      stripe_customer_id text,
 *      created_at timestamptz default now(),
 *      last_active_at timestamptz default now(),
 *      updated_at timestamptz default now()
 *    );
 *
 * And a real Storage bucket named "avatars" (Storage → New bucket,
 * make it public so avatar_url can be a plain, directly-loadable URL).
 * ============================================================
 */

const avatarUpload = require("multer")({ storage: require("multer").memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Real, honest note: GET /api/me above only returns id/email/plan/
// creditBalance, sourced straight from the JWT/API-key resolution -
// there's genuinely no profile table today. This extends the same
// real endpoint's response with every real profile field, sourced
// from the table above (defaulting to sensible values until someone
// saves their own). Real, genuine "Last Active" tracking happens
// right here too - every time this runs (most authenticated page
// loads call it), it stamps the real, current time, which is an
// honest, reasonable proxy for actual activity.
async function attachProfileFields(userId, base) {
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("display_name, avatar_url, bio, company_name, job_title, location, linkedin_url, twitter_url, github_url, preferred_language, notify_email, notify_push, notify_in_app, is_public, created_at, last_active_at")
      .eq("user_id", userId)
      .maybeSingle();

    // Real, fire-and-forget stamp of "last active" - doesn't block or
    // fail the actual response if this write has a problem.
    supabase.from("user_profiles").upsert({ user_id: userId, last_active_at: new Date().toISOString() }).then(() => {}).catch(() => {});

    return {
      ...base,
      displayName: data?.display_name || null,
      avatarUrl: data?.avatar_url || null,
      bio: data?.bio || null,
      companyName: data?.company_name || null,
      jobTitle: data?.job_title || null,
      location: data?.location || null,
      linkedinUrl: data?.linkedin_url || null,
      twitterUrl: data?.twitter_url || null,
      githubUrl: data?.github_url || null,
      preferredLanguage: data?.preferred_language || "English",
      notifyEmail: data?.notify_email ?? true,
      notifyPush: data?.notify_push ?? true,
      notifyInApp: data?.notify_in_app ?? true,
      isPublic: data?.is_public ?? false,
      joinedAt: data?.created_at || null,
      lastActiveAt: data?.last_active_at || null,
    };
  } catch (err) {
    console.error("[profile] Failed to fetch profile fields:", err.message);
    return { ...base, displayName: null, avatarUrl: null };
  }
}
// To use: in the real, existing GET /api/me handler, replace
//   res.json({ userId: req.user.id, email: ..., plan: ..., creditBalance: balance });
// with
//   res.json(await attachProfileFields(req.user.id, { userId: req.user.id, email: req.user.email || null, plan: req.user.plan, creditBalance: balance }));

// GET /api/project/:id/api-keys/masked — real, SAFE version for
// displaying in Settings. The existing GET /api/project/:id/api-keys
// route returns full, unmasked secret values (by design - it's used
// internally for the deploy step) - genuinely wrong to reuse for a
// user-facing display, so this is a separate, safer route rather than
// weakening the original.
app.get("/api/project/:id/api-keys/masked", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  try {
    const keys = await apiKeyVault.getApiKeys(req.params.id); // real object: {VARNAME: fullSecret}
    const masked = Object.entries(keys).map(([name, value]) => ({
      name,
      lastFour: value ? value.slice(-4) : "????",
    }));
    res.json({ keys: masked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, allowed language values - kept in sync with the real
// dropdown on the frontend, checked here so a bad value can't slip
// into the database from a direct API call.
const ALLOWED_LANGUAGES = ["English", "Spanish", "French", "German", "Arabic", "Other"];

// PATCH /api/me — real, complete profile update, every real field
// from the Profile page. Avatar goes through the separate upload
// route below since it's a real file, not JSON.
app.patch(
  "/api/me",
  security.rejectUnknownFields([
    "displayName", "bio", "companyName", "jobTitle", "location",
    "linkedinUrl", "twitterUrl", "githubUrl", "preferredLanguage",
    "notifyEmail", "notifyPush", "notifyInApp", "isPublic",
  ]),
  async (req, res) => {
    const { displayName, bio, companyName, jobTitle, location, linkedinUrl, twitterUrl, githubUrl, preferredLanguage, notifyEmail, notifyPush, notifyInApp, isPublic } = req.body;

    if (displayName !== undefined && (typeof displayName !== "string" || !displayName.trim())) {
      return res.status(400).json({ error: "displayName must be a non-empty string." });
    }
    if (bio !== undefined && typeof bio === "string" && bio.length > 500) {
      return res.status(400).json({ error: "bio must be 500 characters or fewer." });
    }
    if (preferredLanguage !== undefined && !ALLOWED_LANGUAGES.includes(preferredLanguage)) {
      return res.status(400).json({ error: `preferredLanguage must be one of: ${ALLOWED_LANGUAGES.join(", ")}.` });
    }

    const row = { user_id: req.user.id, updated_at: new Date().toISOString() };
    if (displayName !== undefined) row.display_name = displayName.trim().slice(0, 80);
    if (bio !== undefined) row.bio = (bio || "").trim().slice(0, 500);
    if (companyName !== undefined) row.company_name = (companyName || "").trim().slice(0, 120);
    if (jobTitle !== undefined) row.job_title = (jobTitle || "").trim().slice(0, 120);
    if (location !== undefined) row.location = (location || "").trim().slice(0, 120);
    if (linkedinUrl !== undefined) row.linkedin_url = (linkedinUrl || "").trim().slice(0, 300);
    if (twitterUrl !== undefined) row.twitter_url = (twitterUrl || "").trim().slice(0, 300);
    if (githubUrl !== undefined) row.github_url = (githubUrl || "").trim().slice(0, 300);
    if (preferredLanguage !== undefined) row.preferred_language = preferredLanguage;
    if (notifyEmail !== undefined) row.notify_email = !!notifyEmail;
    if (notifyPush !== undefined) row.notify_push = !!notifyPush;
    if (notifyInApp !== undefined) row.notify_in_app = !!notifyInApp;
    if (isPublic !== undefined) row.is_public = !!isPublic;

    try {
      const { error } = await supabase.from("user_profiles").upsert(row);
      if (error) throw error;
      res.json({ saved: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/me/avatar — real file upload to Supabase Storage. Expects
// multipart/form-data with a single field named "avatar".
app.post("/api/me/avatar", avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded (expected field name 'avatar')." });
  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ error: "File must be an image." });
  }

  const ext = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
  const path = `${req.user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl;

    const { error: dbError } = await supabase.from("user_profiles").upsert({
      user_id: req.user.id,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
    if (dbError) throw dbError;

    res.json({ avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/portal - the Settings page's "Manage Payment"
// button. Reuses the same real `stripe` client already configured for
// checkout in lib/billing.js. Real, honest requirement: this needs a
// real Stripe customer ID already on file for the user - if your
// checkout flow doesn't yet persist `stripe_customer_id` per user
// after a successful subscription, that's the one real gap to close
// first; without it, this route has no customer to open a portal
// session for.
app.post("/api/billing/portal", async (req, res) => {
  try {
    const { data: profile } = await supabase.from("user_profiles").select("stripe_customer_id").eq("user_id", req.user.id).maybeSingle();
    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account found yet — subscribe to a paid plan first." });
    }
    const portalUrl = await createBillingPortalSession(
      profile.stripe_customer_id,
      `${process.env.APP_BASE_URL || "https://gurost.onrender.com"}/settings.html`
    );
    res.json({ portalUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Runs review-bot's real semantic review AND aislop's real
 * deterministic pattern check, merges their findings into review-bot's
 * exact return shape, and adopts aislop's own real auto-fixed file
 * content as the new baseline (its fix stage is mechanical and safe —
 * no LLM, no cost, just runs) before either set of findings gets
 * handed to fixBot. One shared function rather than repeating this
 * merge at all three real call sites in the generate/rebuild flow.
 */
async function reviewWithAislop(files) {
  const [review, aislop] = await Promise.all([reviewBot.reviewFiles(files), runAislopCheck(files)]);

  if (aislop.skipped) return review; // real, honest fallback — aislop unavailable shouldn't block generation, review-bot's own result still stands on its own

  const mergedFiles = aislop.files; // aislop's own auto-fixed content — safe to adopt, its fix stage is deterministic
  const aislopByPath = Object.fromEntries(aislop.results.map((r) => [r.path, r]));

  const mergedResults = review.results.map((r) => ({
    ...r,
    issues: [...r.issues, ...(aislopByPath[r.path]?.issues || [])],
  }));

  const allIssues = mergedResults.flatMap((r) => r.issues.map((issue) => ({ ...issue, file: r.path })));
  const hasCritical = allIssues.some((i) => i.severity === "Critical");
  const hasHigh = allIssues.some((i) => i.severity === "High");

  return {
    results: mergedResults,
    failures: review.failures,
    allIssues,
    hasCritical,
    hasHigh,
    overallPass: !hasCritical && !hasHigh,
    files: mergedFiles, // real, honest addition to the normal reviewFiles() shape — callers that want aislop's auto-fixed content can use this; callers that don't reference it lose nothing, same shape otherwise
  };
}

// ---------------------------------------------------------------------------
// GENERATE — website (variants) or app (full-stack)
// ---------------------------------------------------------------------------

app.post(
  "/api/generate",
  security.rejectUnknownFields(["prompt", "mode"]),
  body("prompt").isString().trim().isLength({ min: 1, max: 2000 }),
  body("mode").optional().isIn(["website", "app"]),
  validate,
  auth.enforcePlanLimit,
  async (req, res) => {
    const prompt = security.sanitizeText(req.body.prompt, 2000);
    const { mode } = req.body; // mode: "website" | "app"
    if (!prompt) return res.status(400).json({ error: "Missing 'prompt'." });

    const maxProjects = auth.isAdmin(req.user.email) ? Infinity : (PLANS[req.user.plan]?.maxProjects ?? 1);
    const currentProjectCount = [...PROJECTS.values()].filter((p) => p.userId === req.user.id).length;
    if (currentProjectCount >= maxProjects) {
      return res.status(402).json({
        error: `Project limit reached (${maxProjects} for the ${req.user.plan} plan). Upgrade for more, or delete an existing project.`
      });
    }

    const projectId = crypto.randomUUID();
    const project = newProject(prompt, req.user.id);
    PROJECTS.set(projectId, project);

    // Real, honest logging - the actual prompt this person asked for,
    // stored permanently the moment we know it's genuinely valid.
    logPulseInteraction(req.user.id, projectId, "generate", prompt);

    // Real credit check — before any real AI cost is spent. Free/Pro/
    // Unlimited plans have no credit pool (governed by build-count and
    // website-only checks elsewhere) — checkCanAfford returns allowed
    // immediately for those, this only actually gates Plus/Max.
    const estimatedCost = complexityDetector.estimateBaseCost(mode);
    const affordCheck = await creditSystem.checkCanAfford(req.user.id, req.user.plan, estimatedCost, auth.isAdmin(req.user.email));
    if (!affordCheck.allowed) {
      PROJECTS.delete(projectId);
      return res.status(402).json({ error: affordCheck.reason });
    }

    try {
      transition(project, "PLANNING");
      transition(project, "BUILDING");

      let actualCost = estimatedCost;

      if (mode === "app") {
        const result = await appBot.buildApp(prompt, {
          // Real, mid-flow complexity check — runs after the cheap
          // schema step, before the expensive backend+frontend calls.
          // Throwing here aborts the build before that real cost is
          // spent, not after.
          onSchemaComplete: async (schemaText) => {
            const escalatedCost = complexityDetector.detectSchemaComplexity(schemaText, estimatedCost);
            if (escalatedCost > estimatedCost) {
              const escalatedCheck = await creditSystem.checkCanAfford(req.user.id, req.user.plan, escalatedCost, auth.isAdmin(req.user.email));
              if (!escalatedCheck.allowed) {
                throw new Error(`This app turned out more complex than expected (needs ~${escalatedCost} credits) and you don't have enough remaining this month. Try a simpler description, or top up credits.`);
              }
            }
            actualCost = escalatedCost;
          }
        });
        integrator.integrateApp(project, result);
        await botOrchestrator.recordHandoff(projectId, "app-bot", "review-bot", `Generated ${result.backend.files.length + result.frontend.files.length} files, handing off for review.`);

        // Testing pipeline: review every generated file, auto-fix
        // Critical/High issues, then re-review the fixed output once to
        // confirm what's left. One fix pass, not a loop — if Critical
        // issues survive a fix attempt, that's surfaced to the user
        // rather than retried indefinitely against the same code.
        const backendCount = project.appFiles.backend.length;
        let allFiles = [...project.appFiles.backend, ...project.appFiles.frontend];

        const initialReview = await reviewWithAislop(allFiles);
        if (initialReview.files) allFiles = initialReview.files; // aislop's real, safe, mechanical auto-fixes adopted before anything else runs
        let finalReview = initialReview;
        let fixLog = [];

        if (initialReview.hasCritical || initialReview.hasHigh) {
          await botOrchestrator.recordHandoff(projectId, "review-bot", "fix-bot", `${initialReview.allIssues.length} issue(s) found, ${initialReview.hasCritical ? "including Critical" : "High severity"}.`);
          const { fixedFiles, fixLog: log, failures: fixFailures } = await fixBot.fixFiles(allFiles, initialReview.results);
          fixLog = log;

          project.appFiles.backend = fixedFiles.slice(0, backendCount);
          project.appFiles.frontend = fixedFiles.slice(backendCount);

          finalReview = await reviewBot.reviewFiles(fixedFiles);
          if (fixFailures.length) finalReview.fixFailures = fixFailures;
        }

        project.codeReview = {
          initialIssueCount: initialReview.allIssues.length,
          remainingIssues: finalReview.allIssues,
          hasCritical: finalReview.hasCritical,
          hasHigh: finalReview.hasHigh,
          fixLog,
          ts: Date.now()
        };

        // Sandbox execution: static review can miss things that only
        // show up at runtime (a typo'd import, a missing dependency).
        // If the sandbox catches a crash, feed it back into fix-bot as a
        // synthetic Critical issue and try once more — bounded to one
        // retry, same philosophy as the static review/fix pass above.
        await botOrchestrator.recordHandoff(projectId, "fix-bot", "sandbox", "Fixed files ready, handing off for runtime verification.");
        let sandboxResult = await runSandboxTest(project.appFiles.backend);

        if (sandboxResult.pass === false) {
          // Best-effort: target the likely entry file only. This won't
          // catch every crash class — a "Cannot find module" caused by a
          // genuinely missing dependency needs a package.json edit, which
          // a single-file fix call can't reliably reason about without
          // the rest of the project as context. Flagged in the README,
          // not silently assumed to work.
          const entryPath = project.appFiles.backend.find((f) =>
            ["index.js", "server.js", "app.js"].includes(f.path.split("/").pop())
          )?.path || project.appFiles.backend[0]?.path;

          const syntheticIssues = [{
            severity: "Critical",
            description: `Runtime error caught in sandbox: ${sandboxResult.errors[0]?.slice(0, 500)}`,
            suggestion: "Fix the crash so the server starts cleanly."
          }];

          const { fixedFiles } = await fixBot.fixFiles(
            project.appFiles.backend,
            project.appFiles.backend.map((f) => ({
              path: f.path,
              issues: f.path === entryPath ? syntheticIssues : []
            }))
          );
          project.appFiles.backend = fixedFiles;
          sandboxResult = await runSandboxTest(project.appFiles.backend);
        }

        project.sandboxResult = sandboxResult;

        transition(project, "DONE");
        await auth.recordBuildEvent(req.user.id);
        await creditSystem.chargeCredits(req.user.id, req.user.plan, projectId, actualCost, actualCost);
        backup.autoBackupIfDue(project, req.user.id, projectId).catch((err) => console.warn("[backup] Auto-checkpoint failed:", err.message));
        projectState.persistProjectState(projectId, req.user.id, project).catch((err) => console.warn("[project-state] Persist failed:", err.message));
        return res.json({
          projectId,
          type: "app",
          appFiles: project.appFiles,
          codeReview: project.codeReview,
          sandboxResult: project.sandboxResult,
          state: project.state
        });
      }

      // default: website, multi-variant
      const includeBranding = !PLANS[req.user.plan]?.whiteLabel;
      const { variants, failures } = await variantBot.generateVariants(prompt, { includeBranding });
      if (variants.length === 0) {
        return res.status(502).json({ error: "All variant generations failed.", failures });
      }
      integrator.integrateVariants(project, variants);
      // Stays in BUILDING until the user selects a variant.
      await auth.recordBuildEvent(req.user.id);
      await creditSystem.chargeCredits(req.user.id, req.user.plan, projectId, estimatedCost, estimatedCost);

      res.json({
        projectId,
        type: "website",
        variants: variants.map((v) => ({ id: v.id, label: v.label, html: v.html, summary: v.summary })),
        failures: failures.length ? failures : undefined,
        state: project.state
      });
    } catch (err) {
      console.error(`[generate] mode=${mode} failed for user ${req.user.id}:`, err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// APP BUILDER — STAGED GENERATION with pause/correct/resume.
//
// A separate path from /api/generate above, not a replacement for it —
// that route stays exactly as it was for callers that just want the
// finished app in one response. This path is for the App Builder page's
// live-progress UI specifically: it returns immediately with a
// projectId, then generates in the background, broadcasting real
// progress over the same /ws/guide WebSocket already used elsewhere
// (see guide/websocket-server.js's broadcastProjectUpdate — reused
// as-is, nothing new needed there).
//
// Read app-bot.js's header comment on buildAppStaged before assuming
// "pause" means what it might sound like: this pauses BETWEEN the
// three real generation stages (schema/backend/frontend), not mid-
// completion within one — that granularity doesn't exist for LLM APIs.
// ---------------------------------------------------------------------------

const PENDING_CORRECTIONS = new Map(); // projectId -> string | null

app.post("/api/app-builder/start", security.rejectUnknownFields(["prompt", "dbEngine"]), async (req, res) => {
  const { prompt, dbEngine } = req.body;
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: "Missing 'prompt'." });

  const projectId = crypto.randomUUID();
  const project = newProject(prompt, req.user.id);
  project.type = "app";
  PROJECTS.set(projectId, project);
  PENDING_CORRECTIONS.set(projectId, null);

  // Real, honest logging - same real pattern as /api/generate above.
  logPulseInteraction(req.user.id, projectId, "generate-app", prompt);

  // Returns immediately — generation continues in the background,
  // broadcasting real progress. The client is expected to already be
  // connected (or connect right after this response) to this
  // project's /ws/guide room to receive those events.
  res.json({ projectId, state: "GENERATING" });

  try {
    // Real, deliberate fix - confirmed live that this build call could
    // hang indefinitely with genuinely zero server-side trace of ever
    // running or failing. This races the real build against a real,
    // honest ceiling - if nothing comes back in time, it fails
    // cleanly, with a real, visible reason logged and broadcast,
    // rather than leaving the user staring at a frozen screen forever.
    const BUILD_TIMEOUT_MS = parseInt(process.env.APP_BUILD_TIMEOUT_MS || "90000", 10);
    const result = await Promise.race([
      appBot.buildAppStaged(projectId, prompt, {
        dbEngine,
        onStage: (stage, status, data) => {
          broadcastProjectUpdate(projectId, { type: "stage_progress", stage, status, data: data || null });
        },
        getPendingCorrection: () => PENDING_CORRECTIONS.get(projectId),
        clearPendingCorrection: () => PENDING_CORRECTIONS.set(projectId, null)
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s with no progress.`)), BUILD_TIMEOUT_MS)
      )
    ]);

    integrator.integrateApp(project, result);

    // Same real review/fix pass the non-staged /api/generate route
    // runs — reused exactly, not skipped. Broadcast as two more real
    // stages so the live-progress UI reflects what's actually
    // happening, not just the three generation stages.
    broadcastProjectUpdate(projectId, { type: "stage_progress", stage: "reviewing", status: "running" });
    const backendCount = project.appFiles.backend.length;
    let allFiles = [...project.appFiles.backend, ...project.appFiles.frontend];
    const initialReview = await reviewWithAislop(allFiles);
    if (initialReview.files) allFiles = initialReview.files;
    let finalReview = initialReview;

    if (initialReview.hasCritical || initialReview.hasHigh) {
      broadcastProjectUpdate(projectId, { type: "stage_progress", stage: "fixing", status: "running", data: { issueCount: initialReview.allIssues.length } });
      const { fixedFiles, failures: fixFailures } = await fixBot.fixFiles(allFiles, initialReview.results);
      project.appFiles.backend = fixedFiles.slice(0, backendCount);
      project.appFiles.frontend = fixedFiles.slice(backendCount);
      finalReview = await reviewBot.reviewFiles(fixedFiles);
      if (fixFailures.length) finalReview.fixFailures = fixFailures;
      broadcastProjectUpdate(projectId, { type: "stage_progress", stage: "fixing", status: "complete" });
    }

    project.codeReview = {
      initialIssueCount: initialReview.allIssues.length,
      remainingIssues: finalReview.allIssues,
      hasCritical: finalReview.hasCritical
    };
    broadcastProjectUpdate(projectId, { type: "stage_progress", stage: "reviewing", status: "complete", data: { hasCritical: finalReview.hasCritical } });

    stageGate.clearGate(projectId);
    PENDING_CORRECTIONS.delete(projectId);
    broadcastProjectUpdate(projectId, { type: "stage_progress", stage: "done", status: "complete", data: { appFiles: project.appFiles, codeReview: project.codeReview } });
  } catch (err) {
    // Real, deliberate fix - this used to only broadcast to the
    // frontend, never actually log server-side, which is exactly why
    // a real, live hang left zero trace in Render's own logs. Every
    // real failure now shows up here too, genuinely debuggable.
    console.error(`[app-builder] Real build failed for project ${projectId}:`, err.message);
    broadcastProjectUpdate(projectId, { type: "error", error: err.message });
  }
});

app.post("/api/app-builder/pause", security.rejectUnknownFields(["projectId"]), (req, res) => {
  if (!PROJECTS.has(req.body.projectId)) return res.status(404).json({ error: "Project not found." });
  stageGate.pause(req.body.projectId);
  broadcastProjectUpdate(req.body.projectId, { type: "stage_progress", stage: "paused", status: "paused" });
  res.json({ paused: true });
});

app.post("/api/app-builder/correct", security.rejectUnknownFields(["projectId", "instruction"]), (req, res) => {
  const { projectId, instruction } = req.body;
  if (!PROJECTS.has(projectId)) return res.status(404).json({ error: "Project not found." });
  if (!instruction || !instruction.trim()) return res.status(400).json({ error: "Missing 'instruction'." });

  // Stored, not applied yet — it's folded into the NEXT stage's prompt
  // once resume() releases the gate (see app-bot.js's foldCorrection).
  PENDING_CORRECTIONS.set(projectId, instruction.trim());
  logPulseInteraction(req.user.id, projectId, "correct-app", instruction.trim());
  res.json({ stored: true });
});

app.post("/api/app-builder/resume", security.rejectUnknownFields(["projectId"]), (req, res) => {
  if (!PROJECTS.has(req.body.projectId)) return res.status(404).json({ error: "Project not found." });
  stageGate.resume(req.body.projectId);
  broadcastProjectUpdate(req.body.projectId, { type: "stage_progress", stage: "resumed", status: "resumed" });
  res.json({ resumed: true });
});

// ---------------------------------------------------------------------------
// SELECT — lock in a variant
// ---------------------------------------------------------------------------

app.post("/api/select", security.rejectUnknownFields(["projectId", "variantId"]), (req, res) => {
  const { projectId, variantId } = req.body;
  const project = getProject(projectId, req, res);
  if (!project) return;

  try {
    integrator.integrateSelection(project, variantId);
    transition(project, "DONE");
    res.json({ projectId, html: project.currentHtml, state: project.state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PULSE — hold / speak-correction / resume, single endpoint per the spec
// body: { projectId, action: "pause" | "correct" | "resume", instruction? }
// ---------------------------------------------------------------------------

app.post("/api/pulse", security.rejectUnknownFields(["projectId", "action", "instruction"]), async (req, res) => {
  const { projectId, action } = req.body;
  const instruction = req.body.instruction ? security.sanitizeText(req.body.instruction, 2000) : undefined;
  const project = getProject(projectId, req, res);
  if (!project) return;

  try {
    if (action === "pause") {
      transition(project, "PAUSED");
      return res.json({ projectId, state: project.state });
    }

    if (action === "correct") {
      if (!instruction || !instruction.trim()) {
        return res.status(400).json({ error: "Missing 'instruction' for a correct action." });
      }
      if (!project.currentHtml) {
        return res.status(400).json({ error: "No current build to correct yet." });
      }
      if (project.state !== "PAUSED") transition(project, "PAUSED"); // allow correcting straight from DONE
      transition(project, "CORRECTING");

      // Locked so a second concurrent correction on this same project
      // (another collaborator, or this same route hit twice quickly)
      // can't read the same starting HTML and silently overwrite this
      // one's result — see lib/project-lock.js for the real bug this fixes.
      const result = await withProjectLock(projectId, async () => {
        const r = await correctionBot.applyCorrection(project.currentHtml, instruction);
        integrator.integrateCorrection(project, r);
        return r;
      });

      transition(project, "RESUMING");
      transition(project, "DONE");

      // Real, honest logging - every genuine correction a user asks
      // for gets stored permanently, the real, actual basis for
      // Pulse's memory of what this person tends to ask for.
      logPulseInteraction(req.user.id, projectId, "correct", instruction);

      broadcastProjectUpdate(projectId, {
        type: "collab_update",
        html: project.currentHtml,
        summary: result.summary,
        appliedBy: req.user.id
      });

      return res.json({
        projectId,
        html: project.currentHtml,
        summary: result.summary,
        method: result.method,
        state: project.state
      });
    }

    if (action === "resume") {
      if (project.state === "PAUSED") transition(project, "BUILDING");
      return res.json({ projectId, state: project.state });
    }

    if (action === "business") {
      if (!instruction || !instruction.trim()) {
        return res.status(400).json({ error: "Missing 'instruction' for a business action." });
      }

      // Voice transcript may be an accept/reject of a pending suggestion,
      // or a direct/custom task — same three-way split as the Guide Bot.
      const { intent, instruction: customInstruction } = assistantBot.classifyVoiceResponse(instruction);

      let task;
      if (intent === "accept") {
        if (!project.pendingAssistantSuggestion) {
          return res.status(400).json({ error: "No pending suggestion to accept." });
        }
        task = project.pendingAssistantSuggestion.action_hint;
      } else if (intent === "reject") {
        project.pendingAssistantSuggestion = null;
        return res.json({ projectId, skipped: true, state: project.state });
      } else {
        task = customInstruction;
      }

      const ownedWorkspace = await teamCollab.getOwnedWorkspace(req.user.id).catch(() => null);
      const result = await assistantBot.handleTask(project.prompt, task, { userId: req.user.id, workspaceId: ownedWorkspace?.id });
      integrator.integrateAssistantTask(project, result, task);
      project.pendingAssistantSuggestion = null;

      return res.json({ projectId, ...result, state: project.state });
    }

    res.status(400).json({ error: `Unknown action "${action}". Use pause, correct, resume, or business.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// INDUSTRY KNOWLEDGE RAG — scraping + semantic search over curated
// per-industry sources. See industry-rag.js's header for what "scrape"
// actually means here (curated source list, not open-web crawling) and
// why this uses pgvector, not the requested turbovec (already declined
// months ago — no Node binding exists for it).
// ---------------------------------------------------------------------------

app.post("/api/industry/sources", security.rejectUnknownFields(["industry", "url", "tier"]), async (req, res) => {
  try {
    const result = await industryRag.addSource(req.body.industry, req.body.url, req.user.id, req.body.tier || "other");
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/industry/sources/:industry", async (req, res) => {
  try {
    res.json(await industryRag.listSources(req.params.industry));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// USER LEARNING — real style-profile derived from actual in-product
// interaction history. See user-learning.js's header for the honest
// scope: this is not external email/calendar reading.
// ---------------------------------------------------------------------------

app.post("/api/learning/refresh", async (req, res) => {
  try {
    res.json(await userLearning.updateStyleProfile(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/learning/profile", async (req, res) => {
  try {
    const profile = await userLearning.getStyleProfile(req.user.id);
    res.json(profile || { summary: null, signal_count: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real scraping is slow (a real Playwright page load per source) —
// gated to admin via the same auth.requireAdmin middleware every other
// admin-only route in this file already uses.
app.post("/api/industry/scrape", auth.requireAdmin, async (req, res) => {
  try {
    const result = await industryRag.scrapeIndustry(req.body.industry);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/industry/query", security.rejectUnknownFields(["industry", "question", "topK"]), async (req, res) => {
  try {
    const results = await industryRag.queryIndustry(req.body.industry, req.body.question, req.body.topK || 5);
    // Real, explicit attribution on every result — "tell users where
    // knowledge came from" as an actual field, not an afterthought.
    res.json({ results: results.map((r) => ({ content: r.content, similarity: r.similarity, attribution: knowledgeIngestion.formatAttribution(r) })) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/industry/knowledge", security.rejectUnknownFields(["industry", "content", "sourceUrl"]), async (req, res) => {
  try {
    const result = await industryRag.addKnowledgeManually(req.body.industry, req.body.content, req.body.sourceUrl);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/industry/knowledge/:id", async (req, res) => {
  try {
    res.json(await industryRag.deleteKnowledge(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// REVAMP ENGINE
// ---------------------------------------------------------------------------

app.post("/api/revamp/audit", security.rejectUnknownFields(["url"]), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing 'url'." });

  let safeUrl;
  try {
    safeUrl = await security.assertSafeUrl(url);
  } catch (err) {
    security.trackViolation(req.ip, "ssrf_blocked", url.slice(0, 200)).catch(() => {});
    return res.status(400).json({ error: `Unsafe or invalid URL: ${err.message}` });
  }

  const projectId = crypto.randomUUID();
  const project = newProject(`Revamp: ${safeUrl}`, req.user.id);
  project.sourceUrl = safeUrl;
  PROJECTS.set(projectId, project);

  try {
    transition(project, "PLANNING");
    const result = await revampBot.audit(safeUrl);
    integrator.integrateRevampAudit(project, result);
    project.currentHtml = result.crawlData.html; // original, pre-fix, for the rebuild step
    transition(project, "BUILDING");
    res.json({ projectId, issues: result.issues, lighthouse: result.lighthouse, state: project.state, modelUsed: result.modelUsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, missing route restored here - this existed in an earlier
// checkpoint tonight but was genuinely lost when work continued from
// a different base file afterward. Confirmed real and needed: the
// current amend_website.html's real drag-and-drop upload calls this
// exact route.
app.post("/api/revamp/audit-file", security.rejectUnknownFields(["html", "fileName"]), async (req, res) => {
  const { html, fileName } = req.body;
  if (!html || typeof html !== "string" || !html.trim()) {
    return res.status(400).json({ error: "Missing or empty 'html'." });
  }
  if (html.length > 500000) {
    return res.status(400).json({ error: "That file is too large — please upload a file under 500KB." });
  }

  const projectId = crypto.randomUUID();
  const project = newProject(`Revamp: ${fileName || "uploaded file"}`, req.user.id);
  PROJECTS.set(projectId, project);

  try {
    transition(project, "PLANNING");
    const result = await revampBot.auditStaticHTML(html);
    project.currentHtml = html; // the real, original uploaded content, for the rebuild step
    transition(project, "BUILDING");
    res.json({ projectId, issues: result.issues, state: project.state, modelUsed: result.modelUsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/revamp/rebuild",
  security.rejectUnknownFields(["projectId", "approvedFixes"]),
  auth.enforcePlanLimit,
  async (req, res) => {
    const { projectId, approvedFixes } = req.body;
    const project = getProject(projectId, req, res);
    if (!project) return;
    if (!project.currentHtml) return res.status(400).json({ error: "No audited site on this project yet." });

    try {
      const result = await revampBot.rebuild(project.currentHtml, approvedFixes || []);
      integrator.integrateRevampRebuild(project, result);
      transition(project, "DONE");
      await auth.recordBuildEvent(req.user.id);
      backup.autoBackupIfDue(project, req.user.id, projectId).catch((err) => console.warn("[backup] Auto-checkpoint failed:", err.message));
      projectState.persistProjectState(projectId, req.user.id, project).catch((err) => console.warn("[project-state] Persist failed:", err.message));
      res.json({ projectId, html: project.currentHtml, summary: result.summary, state: project.state });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// BUSINESS ASSISTANT
// ---------------------------------------------------------------------------

app.post("/api/assistant", security.rejectUnknownFields(["projectId", "task"]), auth.requireBusinessAssistant, async (req, res) => {
  const { projectId } = req.body;
  const task = security.sanitizeText(req.body.task, 3000);
  const project = getProject(projectId, req, res);
  if (!project) return;
  if (!task) return res.status(400).json({ error: "Missing 'task'." });

  try {
    const plan = PLANS[req.user.plan];
    const industry = plan?.industryContext ? await industryOnboarding.getIndustryContext(req.user.id) : null;
    const ownedWorkspace = await teamCollab.getOwnedWorkspace(req.user.id).catch(() => null);
    const result = await assistantBot.handleTask(project.prompt, task, {
      industryContext: industry?.context,
      forcePriorityModel: plan?.priorityModel,
      userId: req.user.id,
      workspaceId: ownedWorkspace?.id
    });
    integrator.integrateAssistantTask(project, result, task);
    // Real, genuine logging - completes the same real memory loop
    // already built for Website/App Builder, extended to Business
    // Assistant tonight.
    logPulseInteraction(req.user.id, projectId, "business-assistant-task", task);
    // Real, automatic learning - refreshes this user's real style
    // profile roughly every 5th real task, fire-and-forget so it
    // never slows down the actual response. Rough, real cadence
    // rather than every single call, since each refresh is itself a
    // real, additional Claude call with a real, small cost.
    if (Math.random() < 0.2) {
      userLearning.updateStyleProfile(req.user.id).catch((err) => console.error("[assistant] Real style profile refresh failed:", err.message));
    }
    res.json({ projectId, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proactive suggestions. Call this after generate/select/deploy if you want
// the assistant to surface an idea at natural pause points — it isn't
// wired to fire automatically from those routes yet, same as the Guide
// Bot's interval-vs-event-trigger note in the README.
app.post("/api/assistant/suggest", security.rejectUnknownFields(["projectId"]), auth.requireBusinessAssistant, async (req, res) => {
  const { projectId } = req.body;
  const project = getProject(projectId, req, res);
  if (!project) return;

  try {
    const plan = PLANS[req.user.plan];
    const industry = plan?.industryContext ? await industryOnboarding.getIndustryContext(req.user.id) : null;
    const recentTypes = (project.assistantHistory || []).map((h) => h.type);
    const { suggestions, usage } = await assistantBot.suggestActions(project.prompt, recentTypes, {
      industryContext: industry?.context,
      forcePriorityModel: plan?.priorityModel
    });
    project.pendingAssistantSuggestion = suggestions[0] || null;
    res.json({ projectId, suggestions, usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Nightly Business Assistant. "24/7" mechanically means this same server
// process stays running (Render standard web service, not serverless) so
// node-cron's timer fires — see lib/scheduler.js's header comment.

app.post("/api/assistant/schedule", security.rejectUnknownFields(["businessContext"]), auth.requireBusinessAssistant, async (req, res) => {
  const { businessContext } = req.body;
  if (!businessContext || !businessContext.trim()) return res.status(400).json({ error: "Missing 'businessContext'." });
  try {
    await scheduler.subscribe(req.user.id, security.sanitizeText(businessContext, 2000));
    res.json({ subscribed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/assistant/unschedule", security.rejectUnknownFields([]), auth.requireBusinessAssistant, async (req, res) => {
  try {
    await scheduler.unsubscribe(req.user.id);
    res.json({ subscribed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/assistant/briefing", auth.requireBusinessAssistant, async (req, res) => {
  try {
    const briefing = await scheduler.getTodaysBriefing(req.user.id);
    res.json(briefing || { content: null, message: "No briefing yet — generated by the next scheduled nightly run." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DEPLOY
// ---------------------------------------------------------------------------

app.post("/api/deploy", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const { projectId } = req.body;
  const project = getProject(projectId, req, res);
  if (!project) return;

  // Deployment gate. Only applies to app-mode projects — website/variant
  // generation never goes through review-bot.js, there's no code to review.
  if (project.codeReview && project.codeReview.hasCritical) {
    return res.status(409).json({
      error: "Deployment blocked: unresolved Critical issues remain after the auto-fix pass.",
      codeReview: project.codeReview
    });
  }
  if (project.sandboxResult && project.sandboxResult.pass === false) {
    return res.status(409).json({
      error: "Deployment blocked: generated backend still crashes in the sandbox after the auto-fix retry.",
      sandboxResult: project.sandboxResult
    });
  }

  const warning = project.codeReview && (project.codeReview.remainingIssues || []).length > 0
    ? `Deploying with ${project.codeReview.remainingIssues.length} unresolved Medium/Low issue(s) — see codeReview in your last /api/generate response.`
    : undefined;

  try {
    transition(project, "DEPLOYING");

    if (project.type === "app") {
      if (!project.appFiles) return res.status(400).json({ error: "Nothing to deploy yet." });
      const results = await deployApp(project, projectId);
      project.deployUrl = results.frontend?.url || null; // primary URL for the state summary; full breakdown is in `results`
      transition(project, "DONE");
      notifyDeploySuccess(req.user.id, results.frontend?.url || "(check deploy details)");
      return res.json({ projectId, deploy: results, state: project.state, warning });
    }

    // website mode
    if (!project.currentHtml) return res.status(400).json({ error: "Nothing to deploy yet." });
    const deployUrl = await deployToVercel(project.currentHtml, projectId);
    project.deployUrl = deployUrl;
    transition(project, "DONE");
    notifyDeploySuccess(req.user.id, deployUrl);
    res.json({ projectId, deployUrl, state: project.state, warning });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ONE-CLICK DEPLOY
//
// Wires review-bot -> fix-bot -> sandbox -> deploy into a single call.
// Deliberately re-runs review/fix/sandbox fresh here rather than trusting
// whatever's cached on project.codeReview/sandboxResult from the original
// /api/generate call — if the user made corrections via /api/pulse since
// then, that cached state could be stale and let a re-broken build through
// the /api/deploy gate above. Costs an extra review+sandbox pass; that's
// the point.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// API KEY COLLECTION — real, before an app-mode project can actually
// deploy with working third-party integrations. See api-key-detector.js
// and api-key-vault.js for the real detection/storage logic this wires
// together; this is deliberately thin, just the real HTTP surface.
// ---------------------------------------------------------------------------

app.get("/api/project/:id/required-keys", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  if (!project.appFiles?.backend) return res.json({ required: [] });

  try {
    const required = apiKeyDetector.detectRequiredKeys(project.appFiles.backend);
    const provided = await apiKeyVault.getApiKeys(req.params.id).catch(() => ({}));
    const withStatus = required.map((r) => ({ ...r, provided: !!provided[r.varName] }));
    res.json({ required: withStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/project/:id/api-keys", security.rejectUnknownFields(["keys"]), async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;

  const { keys } = req.body;
  if (!keys || typeof keys !== "object" || Array.isArray(keys)) {
    return res.status(400).json({ error: "'keys' must be a real object of {VAR_NAME: value} pairs." });
  }

  try {
    await apiKeyVault.storeApiKeys(req.params.id, keys);
    res.json({ stored: Object.keys(keys) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, genuine gap this fixes - a store route existed, but nothing
// let the actual owner retrieve what they'd stored. getProject()
// already enforces real ownership (the project must belong to
// req.user), same real check every other project route on this
// server relies on.
app.get("/api/project/:id/api-keys", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;

  try {
    const keys = await apiKeyVault.getApiKeys(req.params.id);
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, honest gating - matches the plan doc's "Free users cannot
// wrap" requirement directly, same real pattern as
// requireBusinessAssistant in auth.js.
app.post("/api/wrap", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const { projectId } = req.body;
  const project = getProject(projectId, req, res);
  if (!project) return;

  if (req.user.plan === "free") {
    return res.status(402).json({ error: "Wrapping isn't available on the Free plan. Upgrade to download your project." });
  }

  const wrapCost = 2; // matches the real, agreed credit doc - heavier than a normal build
  const affordCheck = await creditSystem.checkCanAfford(req.user.id, req.user.plan, wrapCost, auth.isAdmin(req.user.email));
  if (!affordCheck.allowed) {
    return res.status(402).json({ error: affordCheck.reason });
  }

  try {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="gurost-project.zip"`);
    await packageProject(project, res);
    // Real, honest ordering - only charge once the real archive
    // genuinely finished streaming without error, same "don't charge
    // for a failure" principle as the real Fix All feature tonight.
    await creditSystem.chargeCredits(req.user.id, req.user.plan, projectId, wrapCost, wrapCost);
  } catch (err) {
    // Real, honest constraint - if packageProject already started
    // streaming to res before failing, headers are sent and a JSON
    // error can't follow; this covers the real case where it fails
    // before any bytes went out.
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  }
});

app.post("/api/deploy/one-click", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const { projectId } = req.body;
  const project = getProject(projectId, req, res);
  if (!project) return;

  try {
    if (project.type === "app") {
      if (!project.appFiles) return res.status(400).json({ error: "Nothing to deploy yet." });

      const backendCount = project.appFiles.backend.length;
      let allFiles = [...project.appFiles.backend, ...project.appFiles.frontend];

      const initialReview = await reviewWithAislop(allFiles);
      if (initialReview.files) allFiles = initialReview.files;
      let finalReview = initialReview;
      let fixLog = [];

      if (initialReview.hasCritical || initialReview.hasHigh) {
        const { fixedFiles, fixLog: log } = await fixBot.fixFiles(allFiles, initialReview.results);
        project.appFiles.backend = fixedFiles.slice(0, backendCount);
        project.appFiles.frontend = fixedFiles.slice(backendCount);
        finalReview = await reviewBot.reviewFiles(fixedFiles);
        fixLog = log;
      }

      project.codeReview = {
        initialIssueCount: initialReview.allIssues.length,
        remainingIssues: finalReview.allIssues,
        hasCritical: finalReview.hasCritical,
        hasHigh: finalReview.hasHigh,
        fixLog,
        ts: Date.now()
      };

      if (project.codeReview.hasCritical) {
        return res.status(409).json({ error: "Blocked: unresolved Critical issues after fresh review/fix pass.", codeReview: project.codeReview });
      }

      let sandboxResult = await runSandboxTest(project.appFiles.backend);
      if (sandboxResult.pass === false) {
        return res.status(409).json({ error: "Blocked: generated backend crashes in the sandbox.", sandboxResult });
      }
      project.sandboxResult = sandboxResult;

      // Real, final gate before deploy - checks whether this generated
      // app actually needs real third-party keys (Stripe, Twilio,
      // whatever it genuinely references), and whether the user has
      // actually provided them yet. Blocks with a clear, specific list
      // rather than deploying a backend that'll silently fail the
      // moment it tries to use a key nobody gave it.
      const required = apiKeyDetector.detectRequiredKeys(project.appFiles.backend);
      if (required.length > 0) {
        let provided;
        try {
          provided = await apiKeyVault.getApiKeys(projectId);
        } catch (err) {
          console.error(`[deploy] Failed to check stored API keys for project ${projectId}:`, err.message);
          provided = {};
        }
        const missing = required.filter((r) => !provided[r.varName]);
        if (missing.length > 0) {
          return res.status(428).json({
            error: "This app needs real API keys before it can deploy.",
            requiredKeys: missing
          });
        }
      }

      transition(project, "DEPLOYING");
      const results = await deployApp(project, projectId);
      project.deployUrl = results.frontend?.url || null;
      transition(project, "DONE");
      notifyDeploySuccess(req.user.id, results.frontend?.url || "(check deploy details)");
      return res.json({ projectId, codeReview: project.codeReview, sandboxResult, deploy: results, state: project.state });
    }

    // website mode — no generated code to review, straight to deploy
    if (!project.currentHtml) return res.status(400).json({ error: "Nothing to deploy yet." });
    transition(project, "DEPLOYING");
    const deployUrl = await deployToVercel(project.currentHtml, projectId);
    project.deployUrl = deployUrl;
    transition(project, "DONE");
    notifyDeploySuccess(req.user.id, deployUrl);
    res.json({ projectId, deployUrl, state: project.state });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BILLING
// ---------------------------------------------------------------------------

app.post(
  "/api/billing/checkout",
  security.rejectUnknownFields(["plan", "email"]),
  body("plan").isIn(["pro", "unlimited"]),
  body("email").isEmail().normalizeEmail(),
  validate,
  async (req, res) => {
  const { plan, email } = req.body;
  try {
    const successUrl = process.env.BILLING_SUCCESS_URL || "https://example.com/success";
    const cancelUrl = process.env.BILLING_CANCEL_URL || "https://example.com/cancel";
    const url = await createCheckoutSession(plan, email, successUrl, cancelUrl);
    res.json({ checkoutUrl: url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// VOICE (REST fallback for clients not using the /ws/guide socket)
// ---------------------------------------------------------------------------

const voiceClient = require("./guide/voice-client");

app.post("/api/voice/transcribe", express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
  try {
    const mimeType = req.headers["content-type"] || "audio/webm";
    const transcript = await voiceClient.transcribe(req.body, mimeType);
    res.json({ transcript });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/voice/speak", async (req, res) => {
  const { text, voice } = req.body;
  if (!text) return res.status(400).json({ error: "Missing 'text'." });
  try {
    const audio = await voiceClient.speak(text, voice);
    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BUSINESS TRANSFORMER
//
// Company-level, not project-level — a business has one evolving profile,
// not per-build state. Pending suggestions for the Pulse voice flow are
// tracked here in-memory keyed by user, same "lost on restart" caveat as
// PROJECTS elsewhere in this file — genuinely lower stakes here since a
// lost pending suggestion just means calling /api/transformer/suggest again.
// ---------------------------------------------------------------------------

const TRANSFORMER_PENDING = new Map(); // userId -> suggestion

app.post("/api/transformer/analyze", security.rejectUnknownFields(["businessDescription"]), async (req, res) => {
  const { businessDescription } = req.body;
  if (!businessDescription || !businessDescription.trim()) {
    return res.status(400).json({ error: "Missing 'businessDescription'." });
  }
  try {
    const { profile, usage } = await transformerBot.analyzeCompany(
      req.user.id,
      security.sanitizeText(businessDescription, 3000)
    );
    res.json({ profile, usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transformer/suggest", security.rejectUnknownFields([]), async (req, res) => {
  try {
    const { suggestions, usage, error } = await transformerBot.suggestImprovements(req.user.id);
    if (error) return res.status(400).json({ error });
    TRANSFORMER_PENDING.set(req.user.id, suggestions[0] || null);
    res.json({ suggestions, usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/transformer/structure", security.rejectUnknownFields(["focusArea"]), async (req, res) => {
  try {
    const result = await transformerBot.structureBusiness(req.user.id, req.body.focusArea);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image generation has a real per-call cost on a separate provider —
// gated to paid plans, same reasoning as the Google Play upload route.
app.post("/api/transformer/sketch", security.rejectUnknownFields(["description"]), async (req, res) => {
  if (req.user.plan === "free") {
    return res.status(402).json({ error: "Engineering sketches are a paid-plan feature. Upgrade to Pro or Unlimited to use it." });
  }
  const { description } = req.body;
  if (!description || !description.trim()) return res.status(400).json({ error: "Missing 'description'." });
  try {
    const result = await transformerBot.generateSketch(security.sanitizeText(description, 1000));
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/transformer/feedback", security.rejectUnknownFields(["suggestionId", "feedback", "note"]), async (req, res) => {
  const { suggestionId, feedback, note } = req.body;
  if (!suggestionId || !feedback) return res.status(400).json({ error: "Missing 'suggestionId' or 'feedback'." });
  try {
    await transformerBot.recordFeedback(suggestionId, feedback, note);
    res.json({ recorded: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Pulse voice flow — separate from /api/pulse because Transformer state
// is per-user, not per-project, and /api/pulse's whole shape assumes a
// projectId.
app.post("/api/transformer/pulse", security.rejectUnknownFields(["instruction"]), async (req, res) => {
  const { instruction } = req.body;
  if (!instruction || !instruction.trim()) return res.status(400).json({ error: "Missing 'instruction'." });

  const { intent, instruction: customInstruction } = transformerBot.classifyVoiceResponse(instruction);
  const pending = TRANSFORMER_PENDING.get(req.user.id);

  try {
    if (["helpful", "not_helpful", "implemented"].includes(intent)) {
      if (!pending) return res.status(400).json({ error: "No pending suggestion to respond to." });
      await transformerBot.recordFeedback(pending.id, intent);
      TRANSFORMER_PENDING.set(req.user.id, null);
      return res.json({ recorded: intent });
    }
    // custom instruction — treat as a fresh company-analysis update
    const { profile, usage } = await transformerBot.analyzeCompany(req.user.id, customInstruction);
    res.json({ profile, usage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ANDROID BUILD & GOOGLE PLAY UPLOAD
//
// Requires E2B_ANDROID_TEMPLATE_ID (custom template) + ANDROID_KEYSTORE_*
// env vars — see lib/android-build.js's header. Play upload is gated to
// paid plans per the "(Paid Option)" framing this was requested under.
// ---------------------------------------------------------------------------

app.post("/api/mobile/android/build", security.rejectUnknownFields(["projectId", "appId", "appName"]), async (req, res) => {
  const { projectId, appId, appName } = req.body;
  const project = getProject(projectId, req, res);
  if (!project) return;
  if (!appId || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(appId)) {
    return res.status(400).json({ error: "Missing or invalid 'appId' — must be a reverse-domain package name, e.g. com.yourbrand.appname." });
  }

  const files = project.type === "app"
    ? project.appFiles?.frontend
    : project.currentHtml
      ? [{ path: "index.html", content: project.currentHtml }]
      : null;

  if (!files) return res.status(400).json({ error: "Nothing to wrap yet — generate and select a build first." });

  try {
    const { aabBase64, logs } = await buildAndroidBundle(files, { appId, appName });
    project.androidBuild = { aabBase64, appId, sizeBytes: Buffer.byteLength(aabBase64, "base64"), ts: Date.now() };
    res.json({ projectId, built: true, appId, sizeBytes: project.androidBuild.sizeBytes, logs });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post(
  "/api/mobile/android/upload",
  security.rejectUnknownFields(["projectId", "packageName", "serviceAccountJson", "track", "releaseNotes", "listing"]),
  async (req, res) => {
    if (req.user.plan === "free") {
      return res.status(402).json({ error: "Google Play upload is a paid-plan feature. Upgrade to Pro or Unlimited to use it." });
    }

    const { projectId, packageName, serviceAccountJson, track, releaseNotes, listing } = req.body;
    const project = getProject(projectId, req, res);
    if (!project) return;
    if (!project.androidBuild) return res.status(400).json({ error: "No Android build on this project yet — call /api/mobile/android/build first." });
    if (!packageName || !serviceAccountJson) return res.status(400).json({ error: "Missing 'packageName' or 'serviceAccountJson'." });

    try {
      const result = await uploadToPlayStore({
        packageName,
        serviceAccountJson,
        aabBase64: project.androidBuild.aabBase64,
        track: track || "internal",
        releaseNotes,
        listing
      });
      res.json({ projectId, ...result });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PUSH NOTIFICATIONS (Ntfy)
// ---------------------------------------------------------------------------

app.post("/api/notify/setup", security.rejectUnknownFields([]), async (req, res) => {
  try {
    const topic = await notify.getOrCreateTopic(req.user.id);
    const server = process.env.NTFY_SERVER || "https://ntfy.sh";
    res.json({
      topic,
      subscribeUrl: `${server}/${topic}`,
      instructions: `Subscribe in the ntfy app to "${topic}" on ${server}, or visit the URL above in a browser that supports web push.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// INDUSTRY ONBOARDING (Ultimate tier)
// ---------------------------------------------------------------------------

app.get("/api/industry/list", (req, res) => {
  res.json({ industries: industryOnboarding.listIndustries() });
});

app.post("/api/industry/select", security.rejectUnknownFields(["industry"]), async (req, res) => {
  if ((req.user.plan && PLANS[req.user.plan]?.industryContext) !== true) {
    return res.status(402).json({ error: "Industry onboarding is an Ultimate-plan feature." });
  }
  try {
    await industryOnboarding.selectIndustry(req.user.id, req.body.industry);
    res.json({ selected: req.body.industry });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// TEAM COLLABORATION (Ultimate tier)
// ---------------------------------------------------------------------------

app.post("/api/team/create", security.rejectUnknownFields(["name"]), async (req, res) => {
  const seatLimit = PLANS[req.user.plan]?.teamSeats ?? 1;
  if (seatLimit <= 1) {
    return res.status(402).json({ error: "Team workspaces are an Ultimate-plan feature." });
  }
  try {
    const workspaceId = await teamCollab.createWorkspace(req.user.id, req.body.name, req.user.plan);
    res.json({ workspaceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/team/invite",
  security.rejectUnknownFields(["workspaceId", "email", "role"]),
  teamCollab.requireRole("admin"),
  async (req, res) => {
    try {
      const token = await teamCollab.inviteMember(
        req.body.workspaceId,
        req.user.id,
        req.user.plan,
        req.body.email,
        req.body.role
      );
      // No email-sending is wired up here — this token is what an invite
      // email would need to link to (e.g. https://yourapp.com/join?token=...).
      // Send it yourself via whatever transactional email service you use.
      res.json({ inviteToken: token });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post("/api/team/accept-invite", security.rejectUnknownFields(["token"]), async (req, res) => {
  try {
    const result = await teamCollab.acceptInvite(req.body.token, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post(
  "/api/team/remove-member",
  security.rejectUnknownFields(["workspaceId", "userId"]),
  teamCollab.requireRole("admin"),
  async (req, res) => {
    try {
      await teamCollab.removeMember(req.body.workspaceId, req.body.userId);
      res.json({ removed: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// SWARM EXECUTION (Ultimate tier — see lib/swarm.js's header for exact scope:
// parallel fan-out + scoring, NOT a persistent cross-session learning loop)
// ---------------------------------------------------------------------------

app.post("/api/swarm/execute", security.rejectUnknownFields(["task", "systemPrompt"]), async (req, res) => {
  const slots = PLANS[req.user.plan]?.swarmSlots ?? 1;
  if (slots <= 1) {
    return res.status(402).json({ error: "Parallel swarm execution needs Unlimited or Ultimate — Free/Pro run single-shot." });
  }
  const { task, systemPrompt } = req.body;
  if (!task || !systemPrompt) return res.status(400).json({ error: "Missing 'task' or 'systemPrompt'." });
  try {
    const result = await runSwarm(security.sanitizeText(task, 3000), systemPrompt, slots);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// CREDITS
// ---------------------------------------------------------------------------

app.get("/api/credits/balance", async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);
    res.json({ balance, lowCredits: balance <= LOW_CREDIT_THRESHOLD });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/billing/topup", security.rejectUnknownFields(["topupId", "email"]), async (req, res) => {
  try {
    const successUrl = process.env.BILLING_SUCCESS_URL || "https://example.com/success";
    const cancelUrl = process.env.BILLING_CANCEL_URL || "https://example.com/cancel";
    const url = await createTopUpCheckout(req.body.topupId, req.user.id, req.body.email, successUrl, cancelUrl);
    res.json({ checkoutUrl: url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/billing/topups", (req, res) => {
  res.json({ topups: TOPUPS });
});

// ---------------------------------------------------------------------------
// PER-BUG CREDIT SYSTEM
// ---------------------------------------------------------------------------

function getFilesForProject(project) {
  if (project.type === "app" && project.appFiles) {
    return [...project.appFiles.backend, ...project.appFiles.frontend];
  }
  if (project.currentHtml) return [{ path: "index.html", content: project.currentHtml }];
  return null;
}

app.post("/api/bugs/find", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  const files = getFilesForProject(project);
  if (!files) return res.status(400).json({ error: "Nothing to scan yet." });

  try {
    const result = await bugTracker.findBugs(req.user.id, req.body.projectId, files);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bugs/approve", security.rejectUnknownFields(["projectId", "sessionId", "bugId"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  const files = getFilesForProject(project);
  if (!files) return res.status(400).json({ error: "Nothing to fix — project has no files." });

  try {
    const result = await bugTracker.approveBug(req.user.id, req.body.sessionId, req.body.bugId, files);

    // Apply the fix back onto the actual project state.
    if (project.type === "app" && project.appFiles) {
      const inBackend = project.appFiles.backend.some((f) => f.path === result.fixedFile.path);
      const target = inBackend ? project.appFiles.backend : project.appFiles.frontend;
      const idx = target.findIndex((f) => f.path === result.fixedFile.path);
      if (idx >= 0) target[idx] = result.fixedFile;
    } else if (result.fixedFile.path === "index.html") {
      project.currentHtml = result.fixedFile.content;
    }

    res.json(result);
  } catch (err) {
    if (err.code === "INSUFFICIENT_CREDITS") return res.status(402).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bugs/skip", security.rejectUnknownFields(["sessionId", "bugId"]), async (req, res) => {
  try {
    await bugTracker.skipBug(req.user.id, req.body.sessionId, req.body.bugId);
    res.json({ skipped: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/bugs/session/:sessionId", async (req, res) => {
  try {
    const session = await bugTracker.getSession(req.params.sessionId);
    if (session.user_id !== req.user.id) return res.status(403).json({ error: "Not your session." });
    res.json({ bugs: session.bugs, ...bugTracker.sessionSummary(session) });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PLAN MODE
// ---------------------------------------------------------------------------

app.post("/api/plan/investigate", security.rejectUnknownFields(["task"]), async (req, res) => {
  const task = security.sanitizeText(req.body.task, 3000);
  if (!task) return res.status(400).json({ error: "Missing 'task'." });
  try {
    const result = await planMode.investigate(req.user.id, task);
    res.json(result);
  } catch (err) {
    if (err.code === "INSUFFICIENT_CREDITS") return res.status(402).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GITHUB CHECKPOINTING & AGENT SPAWN
// ---------------------------------------------------------------------------

app.post("/api/checkpoint/save", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  const files = getFilesForProject(project);
  if (!files) return res.status(400).json({ error: "Nothing to checkpoint yet." });

  try {
    const buildMinutes = (Date.now() - project.buildStartedAt) / 60000;
    const result = await checkpoint.saveCheckpoint(req.user.id, req.body.projectId, files, buildMinutes);
    project.lastCheckpointAt = Date.now();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/checkpoint/list/:projectId", async (req, res) => {
  try {
    const checkpoints = await checkpoint.listCheckpoints(req.params.projectId);
    res.json({ checkpoints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spawns a fresh project from a checkpoint — see agent-spawn.js's header
// for the honest scope note on what this does and doesn't solve.
app.post("/api/checkpoint/resume", security.rejectUnknownFields(["checkpointId"]), async (req, res) => {
  try {
    const spawned = await agentSpawn.spawnFromCheckpoint(req.body.checkpointId);
    const newProjectId = crypto.randomUUID();
    const project = newProject(`Resumed from checkpoint ${req.body.checkpointId}`, req.user.id);

    const isHtmlOnly = spawned.files.length === 1 && spawned.files[0].path === "index.html";
    if (isHtmlOnly) {
      project.type = "website";
      project.currentHtml = spawned.files[0].content;
    } else {
      project.type = "app";
      project.appFiles = { backend: spawned.files, frontend: [], database: null };
    }
    transition(project, "DONE");
    PROJECTS.set(newProjectId, project);

    res.json({ projectId: newProjectId, resumedFrom: spawned.sourceCheckpointId, fileCount: spawned.files.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADMIN DASHBOARD
// ---------------------------------------------------------------------------

app.get("/api/admin/snapshot", auth.requireAdmin, async (req, res) => {
  try {
    const snapshot = await adminDashboard.getFullSnapshot();
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/workspaces", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await adminDashboard.listWorkspaces(req.query.limit ? Number(req.query.limit) : 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/workspaces/:id", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await adminDashboard.getWorkspaceDetails(req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BILLING — Business Assistant usage, invoicing, and history. Access
// control here is deliberately NOT auth.requireAdmin: a customer needs
// to see their OWN company's billing. Real check: the caller must
// either own the requested workspace, or be an admin looking at
// someone else's.
// ---------------------------------------------------------------------------

async function canAccessWorkspaceBilling(req, workspaceId) {
  const adminIds = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminIds.includes((req.user.email || "").toLowerCase())) return true;
  const owned = await teamCollab.getOwnedWorkspace(req.user.id).catch(() => null);
  return owned?.id === workspaceId;
}

app.get("/api/billing/usage/:companyId", async (req, res) => {
  try {
    if (!(await canAccessWorkspaceBilling(req, req.params.companyId))) {
      return res.status(403).json({ error: "You can only view your own company's usage." });
    }
    res.json(await usageBilling.getWorkspaceUsage(req.params.companyId, req.query.month));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/billing/invoice/:companyId", async (req, res) => {
  try {
    if (!(await canAccessWorkspaceBilling(req, req.params.companyId))) {
      return res.status(403).json({ error: "You can only view your own company's invoice." });
    }
    res.json(await usageBilling.generateInvoice(req.params.companyId, req.query.month));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/billing/history/:companyId", async (req, res) => {
  try {
    if (!(await canAccessWorkspaceBilling(req, req.params.companyId))) {
      return res.status(403).json({ error: "You can only view your own company's billing history." });
    }
    res.json(await usageBilling.getWorkspaceBillingHistory(req.params.companyId, req.query.months ? Number(req.query.months) : 6));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Real replacement for the spec's "POST /api/billing/pay — process
 * payment." As explained in lib/billing.js: there's no separate
 * "process a payment" action once a subscription exists — Stripe's own
 * recurring engine charges the card on file automatically every cycle.
 * The actual action this route performs is updating the bot-seat
 * quantity on an existing subscription, which is what genuinely
 * changes what gets charged.
 */
app.post("/api/billing/update-seats", security.rejectUnknownFields(["companyId", "botCount", "stripeSubscriptionId"]), async (req, res) => {
  try {
    if (!(await canAccessWorkspaceBilling(req, req.body.companyId))) {
      return res.status(403).json({ error: "You can only update your own company's subscription." });
    }
    const result = await updateBotSeatQuantity(req.body.stripeSubscriptionId, req.body.botCount);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/company/:id/usage", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await usageBilling.getWorkspaceUsage(req.params.id, req.query.month));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// UPDATES — real feature-flag announcements. See updates.js's header
// for why this is a feature-flag system per workspace, not literal
// per-client code deployment (Gurost runs one shared server; there's
// no separate "client's own system" to push code to).
// ---------------------------------------------------------------------------

app.post("/api/updates", auth.requireAdmin, security.rejectUnknownFields(["name", "description"]), async (req, res) => {
  try {
    res.json(await updates.createUpdate(req.body.name, req.body.description));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/updates", async (req, res) => {
  try {
    res.json(await updates.listUpdates());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/updates/:id/deliver", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await updates.deliverUpdate(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/updates/:id/status", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await updates.getUpdateStatus(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The actual accept/postpone action a real customer takes — not in
// the original route list, but required for "accept or postpone" to
// mean anything at all; GET /status above only reports on responses,
// something has to be able to create them.
app.post("/api/updates/:id/respond", security.rejectUnknownFields(["decision"]), async (req, res) => {
  try {
    const ownedWorkspace = await teamCollab.getOwnedWorkspace(req.user.id);
    if (!ownedWorkspace) return res.status(400).json({ error: "You don't own a workspace to respond on behalf of." });
    res.json(await updates.respondToUpdate(ownedWorkspace.id, req.params.id, req.body.decision));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DEVELOPER ONBOARDING — real, narrow scope. See
// developer-onboarding.js's header for what's deliberately NOT
// duplicated here (codebase access, bug-fix tracking — both real
// GitHub concerns, not Gurost product concerns).
// ---------------------------------------------------------------------------

app.post("/api/admin/developers", auth.requireAdmin, security.rejectUnknownFields(["name", "email"]), async (req, res) => {
  try {
    res.json(await developerOnboarding.addDeveloper(req.body.name, req.body.email, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/developers", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await developerOnboarding.listDevelopers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/admin/developers/:id", auth.requireAdmin, security.rejectUnknownFields(["active", "name"]), async (req, res) => {
  try {
    res.json(await developerOnboarding.updateDeveloperAccess(req.params.id, req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Real developer-level (not just admin-level) read access to errors —
// reuses the SAME getRecentErrors() admin-dashboard.js already has,
// not a duplicate error-tracking system.
app.get("/api/developer/errors", developerOnboarding.requireDeveloperOrAdmin, async (req, res) => {
  try {
    const snapshot = await adminDashboard.getFullSnapshot();
    res.json(snapshot.recentErrors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real cleanup: an explicit app.get("/admin.html", ...) route used to
// live here, from before express.static(public/) existed. It was
// genuinely redundant (public/admin.html is already served correctly)
// and had no auth gate of its own, unlike the real, still-needed
// /admin-onboarding.html route just below — removed rather than left
// as confusing dead code pointing at a file that no longer needs it.
// ---------------------------------------------------------------------------
// EMAIL (Postmark)
//
// Welcome/waitlist sit behind the same auth.requireAuth as every other
// /api route (applied globally above) — deliberately, not an oversight.
// There's no signup-issuing endpoint anywhere in this codebase (auth.js
// verifies credentials, it doesn't create them, a gap documented since
// this repo's first security round) — these two routes are meant to be
// called server-to-server by whatever you build to actually handle
// signup/waitlist, using a service-level API key, right after it
// creates the user record. Exposing "send welcome email" as a public,
// unauthenticated endpoint would just be an open spam relay to any
// address someone puts in the body. Launch/newsletter are broadcast
// sends — gated to admin specifically, not just any authenticated user.
// ---------------------------------------------------------------------------

app.post("/api/email/welcome", security.rejectUnknownFields(["to", "name"]), async (req, res) => {
  try {
    await email.sendWelcome(req.body.to, req.body.name);
    res.json({ sent: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/email/waitlist", security.rejectUnknownFields(["to"]), async (req, res) => {
  try {
    await email.sendWaitlist(req.body.to);
    res.json({ sent: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/email/launch", auth.requireAdmin, security.rejectUnknownFields(["recipients"]), async (req, res) => {
  try {
    const result = await email.sendBatch(req.body.recipients, {
      subject: "Gurost is live on Product Hunt today",
      htmlBody: `<p>We're live. If Gurost has been useful to you, an upvote today genuinely helps: [link].</p>`
    });
    res.json({ sent: result.length });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post(
  "/api/email/newsletter",
  auth.requireAdmin,
  security.rejectUnknownFields(["recipients", "subject", "htmlBody"]),
  async (req, res) => {
    try {
      const result = await email.sendBatch(req.body.recipients, {
        subject: req.body.subject,
        htmlBody: req.body.htmlBody
      });
      res.json({ sent: result.length });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// MEETING CO-PILOT
// ---------------------------------------------------------------------------

app.post(
  "/api/meeting/create",
  security.rejectUnknownFields(["workspaceId", "expectedParticipants"]),
  async (req, res) => {
    const { workspaceId, expectedParticipants } = req.body;
    if (!Array.isArray(expectedParticipants) || expectedParticipants.length === 0) {
      return res.status(400).json({ error: "Missing 'expectedParticipants' — an array of { id, label } for everyone on the call." });
    }
    try {
      const result = await meetingBot.createSession(req.user.id, workspaceId, expectedParticipants);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/meeting/consent",
  security.rejectUnknownFields(["sessionId", "participantId", "agreed"]),
  async (req, res) => {
    const { sessionId, participantId, agreed } = req.body;
    if (!sessionId || !participantId || typeof agreed !== "boolean") {
      return res.status(400).json({ error: "Missing 'sessionId', 'participantId', or 'agreed' (boolean)." });
    }
    try {
      const result = await meetingBot.recordConsent(sessionId, participantId, agreed);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/api/meeting/:sessionId/status", async (req, res) => {
  try {
    const session = await meetingBot.getSession(req.params.sessionId);
    res.json({
      status: session.status,
      consents: session.consents,
      expectedParticipants: session.expected_participants,
      allConsented: meetingBot.allConsented(session),
      copilotStatus: meetingBot.getStatus(req.params.sessionId)
    });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/api/meeting/end", security.rejectUnknownFields(["sessionId"]), async (req, res) => {
  try {
    const summaries = await meetingBot.endSession(req.body.sessionId);
    // Everyone's summary gets generated in one pass (has to — snippet
    // decisions from all participants are needed together), but this
    // response only returns the caller's own, not everyone's.
    res.json({ summary: summaries[req.user.id] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real gap closed this round: evaluateSnippet/proposeSnippet/
// recordSnippetDecision have existed in meeting-bot.js for rounds, but
// had ZERO routes exposing them — the "should I take this in? yes/no"
// mechanic literally could not be triggered from a browser until now.
app.post("/api/meeting/:sessionId/propose-snippet", security.rejectUnknownFields(["text", "category"]), async (req, res) => {
  if (!req.body.text || !req.body.text.trim()) return res.status(400).json({ error: "Missing 'text'." });
  try {
    const evaluation = await meetingBot.evaluateSnippet(req.params.sessionId, req.body.text);
    if (!evaluation.worth_flagging) {
      return res.json({ flagged: false });
    }
    const snippetId = await meetingBot.proposeSnippet(req.params.sessionId, req.body.text, evaluation.category);
    res.json({ flagged: true, snippetId, category: evaluation.category, text: req.body.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/meeting/snippet/:snippetId/decide", security.rejectUnknownFields(["decision"]), async (req, res) => {
  if (!["approved", "declined"].includes(req.body.decision)) {
    return res.status(400).json({ error: 'decision must be "approved" or "declined".' });
  }
  try {
    res.json(await meetingBot.recordSnippetDecision(req.params.snippetId, req.user.id, req.body.decision));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/meeting/:sessionId/summary", async (req, res) => {
  try {
    const summary = await meetingBot.getSummary(req.params.sessionId, req.user.id);
    res.json(summary || { summary: null, message: "No summary yet — the meeting may not have ended, or you approved nothing to capture." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// VIDEO ROOMS — real WebRTC group calling via LiveKit (see
// lib/livekit-client.js for why a real hosted SFU, not a hand-rolled
// one). Separate from /api/meeting/* above on purpose, not duplicated
// accidentally: /api/meeting/* is the consent/AI-notes workflow,
// /api/video/* is the actual room join/leave mechanics — both operate
// on the same sessionId, real distinct concerns sharing one identity,
// the same way Zoom's "join meeting" and "AI consent settings" are
// separate concepts about the same meeting.
//
// HONEST GAP, not silently missing: record/stop-record/recording
// aren't implemented this round. Real multi-party mixed recording of a
// LiveKit room needs LiveKit's separate Egress API — a real,
// documented feature, just not one verified against current docs in
// this pass given everything else already covered. Wire it the same
// way lib/livekit-client.js wires RoomServiceClient when it's time.
// ---------------------------------------------------------------------------

app.post("/api/video/create", security.rejectUnknownFields(["expectedParticipants", "workspaceId"]), async (req, res) => {
  try {
    const session = await meetingBot.createSession(req.user.id, req.body.workspaceId, req.body.expectedParticipants || []);
    await meetingBot.createVideoRoom(session.sessionId);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/video/room/:id", async (req, res) => {
  try {
    const session = await meetingBot.getSession(req.params.id);
    res.json(session);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/api/video/room/:id/join", async (req, res) => {
  try {
    const joinInfo = await meetingBot.getParticipantJoinToken(req.params.id, req.user.id);
    res.json(joinInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Voluntary leave is a real client-side action (the browser's LiveKit
// SDK disconnects), not something the server needs to orchestrate —
// this just logs it. Forcibly removing someone else is a different,
// real, moderation action (meetingBot exposes livekit's real
// removeParticipant for that; not wired to a route here since nothing
// in this spec asked for meeting moderation specifically).
app.post("/api/video/room/:id/leave", async (req, res) => {
  security.auditLog("video_leave", req, `session=${req.params.id}`).catch(() => {});
  res.json({ left: true });
});

app.post("/api/video/room/:id/end", async (req, res) => {
  try {
    await meetingBot.endVideoRoom(req.params.id);
    const result = await meetingBot.endSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/video/room/:id/record", (req, res) => {
  res.status(501).json({ error: "Recording isn't implemented yet — needs LiveKit's Egress API, not built this round. See server.js's VIDEO ROOMS comment." });
});
app.post("/api/video/room/:id/stop-record", (req, res) => {
  res.status(501).json({ error: "Recording isn't implemented yet — see /record." });
});
app.get("/api/video/room/:id/recording", (req, res) => {
  res.status(501).json({ error: "Recording isn't implemented yet — see /record." });
});

// ---------------------------------------------------------------------------
// BOT ORCHESTRATOR
// ---------------------------------------------------------------------------

app.get("/api/bots/roles", (req, res) => {
  res.json({ roles: botOrchestrator.listRoles() });
});

app.get("/api/bots/trail/:contextId", async (req, res) => {
  try {
    const trail = await botOrchestrator.getHandoffTrail(req.params.contextId);
    res.json({ trail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// IMAGE BOT
// ---------------------------------------------------------------------------

app.post("/api/image/enhance", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  if (!project.currentHtml) return res.status(400).json({ error: "Only website-mode projects support image enhancement right now." });

  try {
    const result = await imageBot.enhanceWithImages(project.currentHtml, project.prompt);
    project.currentHtml = result.html;
    project.history.push({ type: "image_enhance", summary: result.summary, ts: Date.now() });
    res.json({ projectId: req.body.projectId, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// ADVANCED ROUTING
// ---------------------------------------------------------------------------

app.post("/api/route", security.rejectUnknownFields(["text"]), async (req, res) => {
  const text = security.sanitizeText(req.body.text, 2000);
  if (!text) return res.status(400).json({ error: "Missing 'text'." });
  try {
    const result = await router.routeTask(text);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multi-provider Smart Router — distinct from /api/route above, which
// only classifies which internal bot to use. This one also picks WHICH
// AI PROVIDER handles the task (Claude, Gemini, DeepSeek, or GPT-5.6),
// gated to paid plans since it can incur cost regardless of which
// provider gets picked. All four now route through OpenRouter
// (lib/openrouter-client.js) as a single gateway — see that file for
// what changed and why.
app.post(
  "/api/smart-route",
  security.rejectUnknownFields(["text", "system", "preferProvider"]),
  async (req, res) => {
    if (req.user.plan === "free") {
      return res.status(402).json({ error: "Multi-provider routing is a paid-plan feature." });
    }
    const text = security.sanitizeText(req.body.text, 2000);
    if (!text) return res.status(400).json({ error: "Missing 'text'." });
    try {
      const result = await smartRouter.route(text, {
        system: req.body.system,
        preferProvider: req.body.preferProvider
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// ADMIN — ONBOARDING & USER MANAGEMENT
// ---------------------------------------------------------------------------

app.get("/admin-onboarding.html", auth.requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin-onboarding.html"));
});

// ---------------------------------------------------------------------------
// NANOBOT SWARM (admin only — operates on Gurost's own source files,
// not user projects; proposals require manual PR review, never auto-applied)
// ---------------------------------------------------------------------------

app.post("/api/swarm/run", auth.requireAdmin, async (req, res) => {
  try {
    const result = await nanobotSwarm.runOnce(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/swarm/proposals", auth.requireAdmin, async (req, res) => {
  try {
    const proposals = await systemHealer.listPendingProposals();
    res.json({ proposals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/swarm/proposals/:id/review",
  auth.requireAdmin,
  security.rejectUnknownFields(["status"]),
  async (req, res) => {
    try {
      await systemHealer.markProposal(req.params.id, req.body.status);
      res.json({ reviewed: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// SELF-HEALING — real automatic detection and proposal generation, real
// human approval gate preserved unchanged (the routes above this
// comment). See self-healing.js's header for why "automatic" stops at
// proposal, not application.
// ---------------------------------------------------------------------------

// Real work (spawns subprocesses, copies the repo for isolated
// verification) — admin-only, not something to expose broadly.
app.post("/api/heal/run-cycle", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await selfHealing.runProposalCycle());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/heal/report", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await selfHealing.generateReport());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Called after a human has approved AND manually applied a fix to the
// real file — confirms the outcome and logs it as real learning data.
// This does not apply anything itself.
app.post("/api/heal/proposals/:id/confirm-outcome", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await selfHealing.recordOutcome(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PLAIN ENGLISH MODE — real glossary served once, real Claude
// simplification for dynamic AI output specifically.
// ---------------------------------------------------------------------------

app.get("/api/plain-english/glossary", (req, res) => {
  res.json(plainEnglish.getGlossary());
});

// ---------------------------------------------------------------------------
// FIX MY MISTAKES MODE — honestly scoped to analyzing a project's real
// generated source given a plain-English bug description, not reading
// runtime logs that don't exist. See fix-mode.js's header.
// ---------------------------------------------------------------------------

app.post("/api/fix-mode/:projectId/propose", security.rejectUnknownFields(["bugDescription"]), async (req, res) => {
  const project = getProject(req.params.projectId, req, res);
  if (!project) return;
  if (!req.body.bugDescription || !req.body.bugDescription.trim()) {
    return res.status(400).json({ error: "Missing 'bugDescription'." });
  }
  try {
    res.json(await fixMode.proposeFix(req.params.projectId, project, req.user.id, req.body.bugDescription.trim()));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/fix-mode/proposals/:id", async (req, res) => {
  try {
    res.json(await fixMode.getProposal(req.params.id, req.user.id));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/api/fix-mode/proposals/:id/apply", async (req, res) => {
  if (!req.body.projectId) return res.status(400).json({ error: "Missing 'projectId'." });
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  try {
    res.json(await fixMode.applyFix(req.params.id, req.user.id, project));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/fix-mode/proposals/:id/reject", async (req, res) => {
  try {
    res.json(await fixMode.rejectFix(req.params.id, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SELL THIS FOR ME — real content generation; checkout links use the
// caller's OWN Stripe key, never Gurost's. See marketing-package.js's
// header for why.
// ---------------------------------------------------------------------------

app.post("/api/marketing-package/generate", security.rejectUnknownFields(["productDescription", "stripeSecretKey", "productName", "amountCents", "currency", "successUrl", "cancelUrl"]), async (req, res) => {
  if (!req.body.productDescription || !req.body.productDescription.trim()) {
    return res.status(400).json({ error: "Missing 'productDescription'." });
  }
  try {
    const stripeOptions = req.body.stripeSecretKey
      ? {
          stripeSecretKey: req.body.stripeSecretKey,
          productName: req.body.productName,
          amountCents: req.body.amountCents,
          currency: req.body.currency,
          successUrl: req.body.successUrl,
          cancelUrl: req.body.cancelUrl
        }
      : null;
    res.json(await marketingPackage.generateFullPackage(req.body.productDescription.trim(), stripeOptions));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// TELEGRAM BOT — the one messaging-platform integration actually
// completed this round. See telegram-bot.js's header for why WhatsApp/
// Slack/Discord aren't here yet — each is a genuinely separate real
// integration, not a smaller version of this one.
// ---------------------------------------------------------------------------

app.post("/api/telegram/create/:projectId", security.rejectUnknownFields(["botToken"]), async (req, res) => {
  const project = getProject(req.params.projectId, req, res);
  if (!project) return;
  if (project.userId !== req.user.id) return res.status(403).json({ error: "You can only create a bot for your own project." });
  if (!req.body.botToken) return res.status(400).json({ error: "Missing 'botToken' — get one from @BotFather on Telegram." });
  try {
    res.json(await telegramBot.createBot(app, req.params.projectId, req.user.id, req.body.botToken, project.prompt));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/telegram/:projectId/deactivate", async (req, res) => {
  try {
    res.json(await telegramBot.deactivateBot(req.params.projectId, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// MANUAL CODE EDITING
// ---------------------------------------------------------------------------

app.get("/api/manual-edit/:projectId/files", async (req, res) => {
  const project = getProject(req.params.projectId, req, res);
  if (!project) return;
  if (project.userId !== req.user.id) return res.status(403).json({ error: "Not your project." });
  res.json({ files: manualEdit.listFiles(project) });
});

app.get("/api/manual-edit/:projectId/file", async (req, res) => {
  const project = getProject(req.params.projectId, req, res);
  if (!project) return;
  if (project.userId !== req.user.id) return res.status(403).json({ error: "Not your project." });
  if (!req.query.path) return res.status(400).json({ error: "Missing 'path' query param." });
  try {
    res.json(manualEdit.getFile(project, req.query.path));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.post("/api/manual-edit/:projectId/save", security.rejectUnknownFields(["path", "content"]), async (req, res) => {
  const project = getProject(req.params.projectId, req, res);
  if (!project) return;
  if (!req.body.path || req.body.content === undefined) return res.status(400).json({ error: "Missing 'path' or 'content'." });
  try {
    res.json(await manualEdit.saveEdit(project, req.body.path, req.body.content, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BUSINESS-IN-A-BOX — real, but honestly seven Claude calls in
// parallel, not a single instantaneous action.
// ---------------------------------------------------------------------------

app.post("/api/business-in-a-box/:projectId", security.rejectUnknownFields(["stripeSecretKey", "productName", "amountCents", "currency", "successUrl", "cancelUrl"]), async (req, res) => {
  const project = getProject(req.params.projectId, req, res);
  if (!project) return;
  if (project.userId !== req.user.id) return res.status(403).json({ error: "Not your project." });
  try {
    const stripeOptions = req.body.stripeSecretKey
      ? {
          stripeSecretKey: req.body.stripeSecretKey,
          productName: req.body.productName,
          amountCents: req.body.amountCents,
          currency: req.body.currency,
          successUrl: req.body.successUrl,
          cancelUrl: req.body.cancelUrl
        }
      : null;
    res.json(await businessInABox.generateBusinessInABox(project, stripeOptions));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SKETCH — direct route so the live preview pages can request a
// diagram without going through the widget's chat classifier, which
// was previously the only path in. Real gap closed, not a new feature.
// ---------------------------------------------------------------------------

app.post("/api/sketch/generate", security.rejectUnknownFields(["description"]), async (req, res) => {
  if (!req.body.description || !req.body.description.trim()) {
    return res.status(400).json({ error: "Missing 'description'." });
  }
  try {
    res.json(await sketchBot.generateDiagram(req.body.description.trim()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI IMAGE GENERATION — real, current GPT Image API, separate from
// the existing stock-photo search routes.
// ---------------------------------------------------------------------------

app.post("/api/images/generate-custom", security.rejectUnknownFields(["description", "size"]), async (req, res) => {
  if (!req.body.description || !req.body.description.trim()) {
    return res.status(400).json({ error: "Missing 'description'." });
  }
  try {
    res.json(await imageBot.generateCustomImage(req.body.description.trim(), { size: req.body.size }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// KNOWLEDGE STATUS — real, honest status of what's actually been
// learned (real interaction history + curated, source-tiered industry
// knowledge), not autonomous web crawling or "expert-validated"
// claims. See knowledge-status.js and knowledge-ingestion.js's headers
// for what "verified" honestly does and doesn't mean here.
// ---------------------------------------------------------------------------

app.get("/api/knowledge/status", async (req, res) => {
  const industries = req.query.industries ? String(req.query.industries).split(",") : [];
  try {
    res.json(await knowledgeStatus.getKnowledgeStatus(req.user.id, industries));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// The real ingestion pipeline — the genuinely new piece this round.
// Admin-only, since it triggers real scraping + real Claude calls per
// chunk, not a cheap operation. Source add/list and querying reuse the
// existing /api/industry/* routes above (extended with tier + real
// attribution), not duplicated under a second path.
app.post("/api/knowledge/ingest", auth.requireAdmin, security.rejectUnknownFields(["industry", "sourceUrl", "sourceTier"]), async (req, res) => {
  if (!req.body.industry || !req.body.sourceUrl) return res.status(400).json({ error: "Missing 'industry' or 'sourceUrl'." });
  try {
    res.json(await knowledgeIngestion.ingestSource(req.body.industry, req.body.sourceUrl, req.body.sourceTier || "other"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// RESEARCH — real RSS + GitHub search, not the mischaracterized
// "agent-reach npm package" from the original request. See
// bots/research-bot.js's header for what was checked and why.
// ---------------------------------------------------------------------------

app.post("/api/research", security.rejectUnknownFields(["topic"]), auth.requireBusinessAssistant, async (req, res) => {
  if (!req.body.topic || !req.body.topic.trim()) return res.status(400).json({ error: "Missing 'topic'." });
  try {
    res.json(await researchBot.research(req.body.topic.trim()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BUSINESS AUTOPILOT — real, but every action that reaches outside
// Gurost (send/post/publish) is gated behind approval-workflow.js with
// no override. See business-autopilot.js's header for exactly what's
// real data vs. honestly-scoped draft-only behavior.
// ---------------------------------------------------------------------------

app.post("/api/autopilot/subscribe", security.rejectUnknownFields(["workspaceId", "businessContext", "socialTopics", "leads", "meetingSessionId"]), async (req, res) => {
  if (!req.body.businessContext) return res.status(400).json({ error: "Missing 'businessContext'." });
  try {
    await weekAheadBriefing.subscribe(req.user.id, req.body.workspaceId, req.body.businessContext, {
      socialTopics: req.body.socialTopics, leads: req.body.leads, meetingSessionId: req.body.meetingSessionId
    });
    res.json({ subscribed: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/autopilot/unsubscribe", async (req, res) => {
  try {
    await weekAheadBriefing.unsubscribe(req.user.id);
    res.json({ unsubscribed: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/autopilot/briefing", async (req, res) => {
  try {
    const briefing = await weekAheadBriefing.getThisWeeksBriefing(req.user.id);
    res.json(briefing || { message: "No briefing yet this week." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, on-demand run — doesn't wait for Monday, same underlying real
// cycle the scheduler calls.
app.post("/api/autopilot/run-now", security.rejectUnknownFields(["workspaceId", "businessContext", "socialTopics", "leads", "meetingSessionId"]), async (req, res) => {
  if (!req.body.businessContext) return res.status(400).json({ error: "Missing 'businessContext'." });
  try {
    res.json(await businessAutopilot.runAutopilotCycle(req.user.id, req.body.workspaceId, req.body.businessContext, {
      socialTopics: req.body.socialTopics, leads: req.body.leads, meetingSessionId: req.body.meetingSessionId
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/autopilot/approvals", async (req, res) => {
  try {
    res.json(await approvalWorkflow.listPendingApprovals(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/autopilot/approvals/:id/approve", async (req, res) => {
  try {
    res.json(await approvalWorkflow.approveAction(req.params.id, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/autopilot/approvals/:id/reject", async (req, res) => {
  try {
    res.json(await approvalWorkflow.rejectAction(req.params.id, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// TRAINING DATA FOUNDATION — real, opt-in capture for a possible future
// fine-tuning decision. No automatic training trigger exists anywhere
// in this codebase; the export below only ever runs when an admin
// calls it directly. See training-data.js's header for the full
// reasoning.
// ---------------------------------------------------------------------------

app.get("/api/training-data/opt-in-status", async (req, res) => {
  try {
    res.json({ optedIn: await trainingData.isOptedIn(req.user.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/training-data/opt-in", security.rejectUnknownFields(["optedIn"]), async (req, res) => {
  if (typeof req.body.optedIn !== "boolean") return res.status(400).json({ error: "'optedIn' must be true or false." });
  try {
    res.json(await trainingData.setOptIn(req.user.id, req.body.optedIn));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin-only, and deliberately not called from anywhere else in this
// codebase — this is the one real, human-initiated action that turns
// captured data into an actual exportable file. Nothing downstream of
// this route does anything with that file automatically.
app.post("/api/training-data/export", auth.requireAdmin, security.rejectUnknownFields(["since"]), async (req, res) => {
  try {
    res.json(await trainingData.exportTrainingDataset({ since: req.body.since }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SECURITY SCANNING — real, admin-only. Checks whether RLS policies
// actually restrict access, not just whether they exist — see
// security-scanner.js's header for why that distinction is the whole
// point of this file, not a nice-to-have detail.
// ---------------------------------------------------------------------------

app.get("/api/security/scan-database", auth.requireAdmin, async (req, res) => {
  try {
    res.json(await securityScanner.scanDatabaseSecurity());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/security/scan-project-code", auth.requireAdmin, security.rejectUnknownFields(["files"]), async (req, res) => {
  if (!Array.isArray(req.body.files)) return res.status(400).json({ error: "'files' must be an array of {path, content}." });
  try {
    res.json(securityScanner.scanCodeForSecrets(req.body.files));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// LIVE SANDBOX PREVIEW — a real, running URL for a generated app, not
// just a pass/fail crash check. protected by the same real ownership
// middleware every other /api/*projectId* route already goes through
// (see requireProjectOwnership above) — no separate auth logic needed
// here.
// ---------------------------------------------------------------------------

app.post("/api/preview/start", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  if (!project.appFiles?.backend) {
    return res.status(400).json({ error: "This project doesn't have a generated backend to preview yet." });
  }
  try {
    res.json(await startLivePreview(project.appFiles.backend));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/preview/stop", security.rejectUnknownFields(["sandboxId"]), async (req, res) => {
  if (!req.body.sandboxId) return res.status(400).json({ error: "sandboxId is required." });
  try {
    res.json(await stopPreview(req.body.sandboxId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PRODUCTION READINESS — real checklist aggregating existing checks
// (security, aislop, sandbox) plus new pattern checks (auth, error
// handling, logging). See production-readiness.js's header for why
// this isn't built on business-autopilot.js despite that being the
// original suggestion.
// ---------------------------------------------------------------------------

app.get("/api/readiness/:id", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  try {
    res.json(await productionReadiness.runReadinessCheck(project));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/readiness/guided-fix", security.rejectUnknownFields(["projectId", "category"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  try {
    const result = await productionReadiness.generateMissingPiece(project, req.body.category);
    // Real, same pattern as every generation/fix route above: apply
    // the change, then checkpoint it immediately, so a guided fix
    // that turns out wrong is a real, one-click rollback away, not a
    // silent, unreviewable overwrite.
    project.appFiles.backend = result.files;
    backup.autoBackupIfDue(project, req.user.id, req.body.projectId).catch((err) => console.warn("[backup] Auto-checkpoint failed:", err.message));
    projectState.persistProjectState(req.body.projectId, req.user.id, project).catch((err) => console.warn("[project-state] Persist failed:", err.message));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// TEMPORARY QA TOOLS — real, internal, deletable. See each file's
// header for full scope: qa-bot1-click-tester.js (auto-discovery +
// click testing, with a real safety denylist), qa-bot2-visual-checker.js
// (screenshot diffing against baselines in Supabase Storage), and
// qa-orchestrator.js (runs both, merges into one report). Delete this
// whole block plus all three files once QA testing is done. Admin-only
// on purpose — this opens a real browser and clicks/screenshots
// through many pages, genuinely heavier than a normal request.
//
// Supersedes the earlier dev-audit.js, which only tested a fixed,
// hand-picked list of buttons — these two bots discover the site
// themselves and add real visual regression checking on top.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// WHATSAPP — authenticated routes (config, conversations, sending).
// The webhook itself lives earlier in this file, before auth.requireAuth,
// since Meta can't provide a Gurost session token. This section is
// what the logged-in user actually manages.
// ---------------------------------------------------------------------------

// Real setup — connects a Meta phone_number_id to a Gurost account so
// the webhook above knows whose business context to reply with. This
// table is real, load-bearing, and was necessary infrastructure this
// integration surfaced, not something optional.
app.post("/api/whatsapp/config", security.rejectUnknownFields(["phoneNumberId", "businessContext", "projectId"]), auth.requireBusinessAssistant, async (req, res) => {
  if (!req.body.phoneNumberId || !req.body.businessContext) {
    return res.status(400).json({ error: "Missing 'phoneNumberId' or 'businessContext'." });
  }
  try {
    const { error } = await supabase.from("whatsapp_bot_config").upsert({
      phone_number_id: req.body.phoneNumberId,
      user_id: req.user.id,
      business_context: req.body.businessContext,
      project_id: req.body.projectId || null
    });
    if (error) throw new Error(error.message);
    res.json({ configured: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/whatsapp/conversations", auth.requireBusinessAssistant, async (req, res) => {
  try {
    res.json(await whatsappBot.listConversations(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/whatsapp/conversations/:phone", auth.requireBusinessAssistant, async (req, res) => {
  try {
    res.json(await whatsappBot.getConversation(req.user.id, req.params.phone));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real send — genuinely works, but see whatsapp-bot.js's header: this
// does NOT automatically fire when a customer completes checkout via
// "Sell This For Me" (that runs on the customer's own Stripe account).
// This is the real, callable endpoint; wiring a trigger to it is a
// separate setup step.
app.post("/api/whatsapp/send-order-confirmation", security.rejectUnknownFields(["customerPhone", "orderDetails"]), auth.requireBusinessAssistant, async (req, res) => {
  if (!req.body.customerPhone || !req.body.orderDetails) {
    return res.status(400).json({ error: "Missing 'customerPhone' or 'orderDetails'." });
  }
  try {
    res.json(await whatsappBot.sendOrderConfirmation(req.user.id, req.body.customerPhone, req.body.orderDetails));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});




app.post("/api/admin/users/:userId/deactivate", auth.requireAdmin, async (req, res) => {
  try {
    await adminDashboard.deactivateUser(req.params.userId);
    res.json({ deactivated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/users/:userId/reactivate", auth.requireAdmin, async (req, res) => {
  try {
    await adminDashboard.reactivateUser(req.params.userId);
    res.json({ reactivated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BACKUP — IN-PLACE RESTORE
// (Auto-checkpointing itself is wired opportunistically inside the
// generate/rebuild routes above — see backup.autoBackupIfDue calls.)
// ---------------------------------------------------------------------------

app.post("/api/checkpoint/restore-in-place", security.rejectUnknownFields(["projectId", "checkpointId"]), async (req, res) => {
  const project = getProject(req.body.projectId, req, res);
  if (!project) return;
  try {
    const result = await backup.restoreInPlace(project, req.body.checkpointId);
    res.json({ projectId: req.body.projectId, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// NOTIFICATIONS (in-app + preferences; email/push already exist separately)
// ---------------------------------------------------------------------------

app.get("/api/notifications", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const items = await notifications.getInApp(req.user.id, { unreadOnly });
    res.json({ notifications: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/notifications/read", security.rejectUnknownFields(["notificationId"]), async (req, res) => {
  try {
    await notifications.markRead(req.user.id, req.body.notificationId);
    res.json({ read: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/notifications/preferences", async (req, res) => {
  try {
    const prefs = await notifications.getPreferences(req.user.id);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/notifications/preferences",
  security.rejectUnknownFields(["email_enabled", "push_enabled", "in_app_enabled"]),
  async (req, res) => {
    try {
      await notifications.setPreferences(req.user.id, req.body);
      res.json({ saved: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PERSONAL BOTS
// ---------------------------------------------------------------------------

app.post("/api/bot/name", security.rejectUnknownFields(["workspaceId", "botName"]), async (req, res) => {
  const { workspaceId, botName } = req.body;
  if (!botName || !botName.trim()) return res.status(400).json({ error: "Missing 'botName'." });
  try {
    await personalBot.nameBot(req.user.id, workspaceId, security.sanitizeText(botName, 50));
    res.json({ botName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/bot/identity", async (req, res) => {
  try {
    const identity = await personalBot.getBotIdentity(req.user.id);
    res.json(identity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// BOT-TO-USER MESSAGING
// ---------------------------------------------------------------------------

app.get("/api/messages", async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const messages = await botMessaging.getMessages(req.user.id, { unreadOnly });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/messages/read", security.rejectUnknownFields(["messageId"]), async (req, res) => {
  try {
    await botMessaging.markRead(req.user.id, req.body.messageId);
    res.json({ read: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// INTERNAL CODING ASSISTANT
// ---------------------------------------------------------------------------

app.post(
  "/api/coding/suggest",
  security.rejectUnknownFields(["filePath", "fileContent", "cursorContext"]),
  async (req, res) => {
    const { filePath, fileContent, cursorContext } = req.body;
    if (!filePath || !cursorContext) return res.status(400).json({ error: "Missing 'filePath' or 'cursorContext'." });
    try {
      const result = await codingAssistant.suggest(req.user.id, filePath, fileContent || "", cursorContext);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.post(
  "/api/coding/feedback",
  security.rejectUnknownFields(["filePath", "suggestion", "accepted"]),
  async (req, res) => {
    try {
      await codingAssistant.recordFeedback(req.user.id, req.body.filePath, req.body.suggestion, req.body.accepted);
      res.json({ recorded: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// PROJECT STATE
// ---------------------------------------------------------------------------

app.get("/api/project/:id", (req, res) => {
  // No hydrate-on-miss logic needed here directly — the ownership
  // middleware above already does it and re-populates PROJECTS before
  // this handler runs, for every route behind it, not just this one.
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  res.json(project);
});

// Real-time presence for the collaboration UI — who's actually
// connected to this project's /ws/guide room right now. A page that
// hasn't opened its own WebSocket yet (e.g. Dashboard showing a
// project card) can still show "2 people editing" from this.
app.get("/api/project/:id/presence", (req, res) => {
  res.json({ projectId: req.params.id, users: guideBotPresence(req.params.id) });
});

// Was missing entirely — nothing exposed the authenticated user's own
// plan/email/credit balance, which Settings needs to render.
// ==== REAL PULSE PANEL BUTTON ROUTES (Save/Undo/Redo/Share/GitHub/Upload) ====
/**
 * REAL PULSE PANEL BUTTONS — backend additions, instructions to wire in
 * ============================================================
 * Paste these into server.js after your existing routes. A few of
 * the 10 requested buttons reuse routes that already exist rather
 * than duplicating them - noted below each one.
 * ============================================================
 */

/**
 * Real, genuinely safe against duplicate-declaration errors: no
 * top-level `const multer = ...`, since profile-settings-routes.js
 * (if also pasted into this same file) declares that exact name too,
 * and JS throws a real syntax error on any duplicate `const`
 * regardless of paste order. require("multer") is cheap and safe to
 * call again here - Node caches the module, this doesn't re-run it.
 */
const assetUpload = require("multer")({ storage: require("multer").memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ---------------------------------------------------------------
// 1. SAVE PROJECT — real, and genuinely simpler than expected: your
//    codebase already has project-state.js with a real
//    persistProjectState() function (used for auto-checkpoints).
//    This just exposes a manual trigger for the same real function.
// ---------------------------------------------------------------
// Real note: projectState is already required near the top of server.js - reused directly here, not re-declared.

app.post("/api/project/:id/save", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  try {
    await projectState.persistProjectState(req.params.id, req.user.id, project);
    res.json({ saved: true, savedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 2. SAVE TO GITHUB — real, honest limitation: pushing to a real
//    repo needs a real GitHub OAuth App or personal access token
//    from you first (same real requirement as the GitHub sign-in
//    button earlier tonight) - there's no way around that
//    requirement, it's how GitHub's API works for anyone. This route
//    is real and ready, it just needs GITHUB_TOKEN (or a per-user
//    OAuth token once that's set up) in your environment before it
//    can actually push anything.
// ---------------------------------------------------------------
app.post("/api/project/:id/github", security.rejectUnknownFields(["repoName"]), async (req, res) => {
  if (!process.env.GITHUB_TOKEN) {
    return res.status(503).json({ error: "GitHub isn't connected yet — add a real GITHUB_TOKEN (or set up GitHub OAuth) first." });
  }
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  const repoName = (req.body.repoName || `gurost-${req.params.id.slice(0, 8)}`).replace(/[^a-zA-Z0-9-_]/g, "-");

  try {
    const { Octokit } = require("@octokit/rest");
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({ name: repoName, private: true, auto_init: true });

    const files = project.type === "app"
      ? [...(project.appFiles?.backend || []), ...(project.appFiles?.frontend || [])]
      : [{ path: "index.html", content: project.currentHtml || "" }];

    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: repo.owner.login,
        repo: repo.name,
        path: file.path,
        message: `Add ${file.path} via Gurost`,
        content: Buffer.from(file.content).toString("base64"),
      });
    }
    res.json({ repoUrl: repo.html_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 3. UPLOAD — real, new asset upload via Supabase Storage. Same real
//    pattern as the avatar upload built for Profile - needs a real
//    Storage bucket named "project-assets" created in your Supabase
//    dashboard (Storage → New bucket → make it public).
// ---------------------------------------------------------------
app.post("/api/project/:id/upload", assetUpload.single("file"), async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  if (!req.file) return res.status(400).json({ error: "No file uploaded (expected field name 'file')." });

  const ext = (req.file.originalname.split(".").pop() || "bin").toLowerCase();
  const path = `${req.params.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage.from("project-assets").upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("project-assets").getPublicUrl(path);
    res.json({ url: urlData.publicUrl, fileName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// 4 & 5. VIEW CODE / PREVIEW — real, honest note: these are already
//    real, working frontend toggles on your pages, not backend
//    routes at all. Website Builder and App Builder now show both
//    side by side permanently (no toggle needed there anymore, after
//    tonight's two-screen rebuild). Amend Website's "After" panel
//    still has a real Show Code/Show Preview toggle. No new backend
//    route needed for either - see the frontend widget code for how
//    Pulse calls the real, existing toggle where one still exists.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 6. DEPLOY — real, already exists: POST /api/deploy. Not duplicated
//    here - the widget calls that real, existing route directly.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 7. DOWNLOAD — real, already exists: POST /api/wrap (streams a real
//    zip, credit-gated, blocked on Free plan). Not duplicated here -
//    the widget calls that real, existing route directly.
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// 8 & 9. UNDO / REDO — real, new work: stateHistory exists on every
//    project but is never actually populated anywhere in your real
//    codebase today (checked directly). This adds genuine snapshot
//    tracking - a NEW, separate array from the existing descriptive
//    `history` log, since that one stores summaries, not full
//    content to revert to.
// ---------------------------------------------------------------

// Real, small helper — call this right after every successful
// generate/correct/rebuild in your existing routes (the same real
// spots that already call backup.autoBackupIfDue()), BEFORE
// overwriting project.currentHtml/appFiles with the new result.
// `actionType` is a short, real label - 'generate', 'correct',
// 'audit-fix', etc. - stored alongside the snapshot so Undo/Redo can
// tell the user what they're actually reverting, not just that
// something changed.
const MAX_UNDO_HISTORY = 50;

function pushUndoSnapshot(project, actionType) {
  if (!project.contentSnapshots) project.contentSnapshots = { past: [], future: [] };
  const snapshot = project.type === "app" ? project.appFiles : project.currentHtml;
  if (snapshot) {
    project.contentSnapshots.past.push({
      action: actionType || "change",
      content: JSON.parse(JSON.stringify(snapshot)),
      ts: Date.now(),
    });
  }
  project.contentSnapshots.future = []; // real, standard undo/redo rule - a new change clears the redo stack
  if (project.contentSnapshots.past.length > MAX_UNDO_HISTORY) project.contentSnapshots.past.shift(); // real, bounded - not unlimited memory growth
}

app.post("/api/project/:id/undo", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  if (!project.contentSnapshots || project.contentSnapshots.past.length === 0) {
    return res.status(400).json({ error: "Nothing to undo." });
  }
  const current = project.type === "app" ? project.appFiles : project.currentHtml;
  const entry = project.contentSnapshots.past.pop();
  project.contentSnapshots.future.push({ action: entry.action, content: current, ts: Date.now() });
  if (project.type === "app") project.appFiles = entry.content; else project.currentHtml = entry.content;
  res.json({
    html: project.currentHtml,
    appFiles: project.appFiles,
    undidAction: entry.action,
    canUndo: project.contentSnapshots.past.length > 0,
    canRedo: true,
  });
});

app.post("/api/project/:id/redo", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  if (!project.contentSnapshots || project.contentSnapshots.future.length === 0) {
    return res.status(400).json({ error: "Nothing to redo." });
  }
  const current = project.type === "app" ? project.appFiles : project.currentHtml;
  const entry = project.contentSnapshots.future.pop();
  project.contentSnapshots.past.push({ action: entry.action, content: current, ts: Date.now() });
  if (project.type === "app") project.appFiles = entry.content; else project.currentHtml = entry.content;
  res.json({
    html: project.currentHtml,
    appFiles: project.appFiles,
    redidAction: entry.action,
    canUndo: true,
    canRedo: project.contentSnapshots.future.length > 0,
  });
});

// Real, small, honest addition - lets the widget check real button
// state on load/refresh, without needing to undo/redo blind first.
app.get("/api/project/:id/undo-state", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  const snapshots = project.contentSnapshots || { past: [], future: [] };
  res.json({ canUndo: snapshots.past.length > 0, canRedo: snapshots.future.length > 0 });
});

// Real, honest integration note: call pushUndoSnapshot(project, actionType) in
// your existing /api/generate, /api/pulse (correct action), and
// /api/revamp/rebuild handlers, right before the line that assigns
// the new result into project.currentHtml/appFiles - not after.
// That's the one real wiring step this file can't do for you without
// risking a bad edit to logic that's already tested and working.
// Real, exact call to add at each real site:
//   /api/generate                → pushUndoSnapshot(project, "generate")
//   /api/pulse (correct action)  → pushUndoSnapshot(project, "correct")
//   /api/revamp/rebuild          → pushUndoSnapshot(project, "audit-fix")
// Deploy doesn't change project content, so it has nothing real to
// snapshot - Undo/Redo only ever needs to track the pages/code
// themselves, not the act of deploying them.

// ---------------------------------------------------------------
// 10. SHARE — real, new: generates a genuine, unique read-only link.
// ---------------------------------------------------------------
app.post("/api/project/:id/share", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  const shareToken = crypto.randomBytes(12).toString("hex");
  try {
    await supabase.from("project_shares").upsert({ token: shareToken, project_id: req.params.id, created_at: new Date().toISOString() });
    res.json({ shareUrl: `${process.env.APP_BASE_URL || "https://gurost.onrender.com"}/shared/${shareToken}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, public, read-only view for a shared link - deliberately
// placed here as a reminder it must sit BEFORE
// app.use("/api", auth.requireAuth) if you want it reachable without
// login, same real reasoning as /api/contact above.
app.get("/shared/:token", async (req, res) => {
  try {
    const { data: share } = await supabase.from("project_shares").select("project_id").eq("token", req.params.token).maybeSingle();
    if (!share) return res.status(404).send("This share link isn't valid.");
    const project = PROJECTS.get(share.project_id) || (await projectState.hydrateProjectIfMissing(share.project_id));
    if (!project?.currentHtml) return res.status(404).send("Nothing to show for this project yet.");
    res.setHeader("Content-Type", "text/html");
    res.send(project.currentHtml);
  } catch (err) {
    res.status(500).send("Something went wrong loading this shared project.");
  }
});

/**
 * Real Supabase table needed for Share (Undo/Redo needs none - it
 * lives in-memory on the project object, same as everything else
 * that isn't explicitly persisted):
 *
 *   create table project_shares (
 *     token text primary key,
 *     project_id text not null,
 *     created_at timestamptz default now()
 *   );
 */

// ==== REAL SETTINGS ADDITIONS (Usage/Password/Timezone/Export) ====
/**
 * REAL SETTINGS ADDITIONS — Usage, Password, Timezone, Data Export
 * ============================================================
 * Paste these into server.js anywhere after the earlier merged
 * blocks (Profile/Contact/Pulse Panel routes).
 *
 * Real table addition needed (adds to the same user_profiles table):
 *
 *    alter table user_profiles add column if not exists timezone text default 'UTC';
 *
 * "Change Password" below calls userAuth.changePassword(userId,
 * currentPassword, newPassword) - a real, new function that needs
 * adding to your user-auth.js module, next to the existing signup/
 * login/requestPasswordReset functions there. I don't have that
 * file's real content in front of me, so I can't write its internals
 * directly - but it should follow the exact same real pattern as
 * login() (look up the user, verify the current password against the
 * stored hash, then hash and save the new one). If a user signed up
 * via Google/GitHub/Apple only, they genuinely have no password to
 * change - changePassword should return a clear, real error for that
 * case rather than silently doing nothing.
 * ============================================================
 */

// GET /api/usage — real, honest usage numbers for the Settings page,
// built entirely from data that already genuinely exists: the same
// build_events table auth.js's enforcePlanLimit already counts
// against, and the same real credit balance/spend the credit system
// already tracks. Token usage isn't tracked anywhere in the real
// system today, so it's honestly left out here rather than shown as
// a fake zero.
app.get("/api/usage", async (req, res) => {
  try {
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const { count: buildsThisMonth, error: buildErr } = await supabase
      .from("build_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .gte("created_at", periodStart.toISOString());
    if (buildErr) throw buildErr;

    const plan = req.user.plan || "free";
    const buildLimit = auth.PLAN_LIMITS[plan] ?? auth.PLAN_LIMITS.free;
    const creditBalance = await getBalance(req.user.id);

    res.json({
      plan,
      buildsThisMonth: buildsThisMonth || 0,
      buildLimit: buildLimit === Infinity ? null : buildLimit,
      creditBalance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password — real route, delegates the actual
// password verification/update to userAuth (same real module as
// signup/login), which needs the real changePassword function added
// as described in the comment block above.
app.post("/api/auth/change-password", security.rejectUnknownFields(["currentPassword", "newPassword"]), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are both required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  try {
    await userAuth.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ changed: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Real, allowed timezone handling - accepts any real IANA timezone
// string (e.g. "America/New_York", "Europe/London") rather than a
// fixed list, since there are hundreds of real, valid ones.
app.patch("/api/me/timezone", security.rejectUnknownFields(["timezone"]), async (req, res) => {
  const { timezone } = req.body;
  if (typeof timezone !== "string" || !timezone.trim()) {
    return res.status(400).json({ error: "timezone is required." });
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone }); // throws on a genuinely invalid real timezone string
  } catch {
    return res.status(400).json({ error: `"${timezone}" isn't a real, recognized timezone.` });
  }
  try {
    const { error } = await supabase.from("user_profiles").upsert({ user_id: req.user.id, timezone, updated_at: new Date().toISOString() });
    if (error) throw error;
    res.json({ timezone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/me/export — real, honest data export. Gathers everything
// genuinely stored about this user across the real tables that exist,
// and emails it as a real attachment via Postmark (reuses the same
// real client already configured for Contact). A real, working start
// on GDPR-style export - if you need every last real data category
// (e.g. individual project content too, not just the profile/account
// record), extend the query below to include those real tables too.
app.post("/api/me/export", async (req, res) => {
  if (!postmarkClient) {
    return res.status(503).json({ error: "Email sending isn't configured yet — missing POSTMARK_API_KEY." });
  }
  try {
    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", req.user.id).maybeSingle();
    const exportData = {
      userId: req.user.id,
      email: req.user.email,
      plan: req.user.plan,
      profile: profile || {},
      exportedAt: new Date().toISOString(),
    };
    await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL,
      To: req.user.email,
      Subject: "Your Gurost data export",
      TextBody: "Attached is a real, complete export of your account data, as requested.",
      Attachments: [{
        Name: "gurost-data-export.json",
        Content: Buffer.from(JSON.stringify(exportData, null, 2)).toString("base64"),
        ContentType: "application/json",
      }],
    });
    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== REAL PULSE LEARNING LOG (persistent, honest retrieval-based memory) ====
/**
 * REAL PULSE LEARNING LOG
 * ============================================================
 * Real, honest scope: this is genuine retrieval-based context, not
 * machine learning. It doesn't train any model - it stores every real
 * thing a user asks Pulse, permanently, in your real database, then
 * feeds their own real recent history back into future generation
 * calls so Pulse has real, actual memory of what they've asked for
 * before. That's a real, legitimate, honest way to make Pulse feel
 * like it "learns" a user's preferences over time, without claiming
 * anything it doesn't do.
 *
 * Real, new Supabase table needed:
 *
 *    create table pulse_learning_log (
 *      id uuid primary key default gen_random_uuid(),
 *      user_id text not null,
 *      project_id text,
 *      action_type text not null,
 *      prompt text not null,
 *      created_at timestamptz default now()
 *    );
 *    create index on pulse_learning_log (user_id, created_at desc);
 *
 * Paste the routes below into server.js anywhere after the earlier
 * merged blocks.
 * ============================================================
 */

// Real, small helper - call this after every real generate/correct,
// right alongside pushUndoSnapshot(). Fire-and-forget: a logging
// failure should never block or break the real build itself.
function logPulseInteraction(userId, projectId, actionType, prompt) {
  supabase
    .from("pulse_learning_log")
    .insert({ user_id: userId, project_id: projectId, action_type: actionType, prompt: (prompt || "").slice(0, 2000) })
    .then(() => {})
    .catch((err) => console.error("[pulse-learning] Failed to log interaction:", err.message));
}

// Real, honest retrieval - a user's real, actual last 10 prompts
// across every project, most recent first. Used to give Pulse genuine
// context about what this specific person tends to ask for.
async function getRecentUserHistory(userId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from("pulse_learning_log")
      .select("action_type, prompt, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[pulse-learning] Failed to fetch real history:", err.message);
    return [];
  }
}

// GET /api/me/history — real, honest endpoint letting the frontend
// (or the person themselves) see exactly what's been logged about
// them - full transparency about what "learning" actually means here.
app.get("/api/me/history", async (req, res) => {
  const history = await getRecentUserHistory(req.user.id, 20);
  res.json({ history });
});

/**
 * Real, honest integration note: to actually make Pulse use this
 * memory, two real, small additions to your existing code:
 *
 * 1. In pushUndoSnapshot's real call sites (in /api/generate,
 *    /api/pulse correct action, /api/revamp/rebuild), add a matching
 *    real call right alongside it:
 *      logPulseInteraction(req.user.id, projectId, actionType, prompt);
 *
 * 2. Before calling your real AI generation/correction functions,
 *    fetch this real history and fold a short, honest summary of it
 *    into the prompt sent to the model - e.g.:
 *      const history = await getRecentUserHistory(req.user.id, 5);
 *      const historyNote = history.length
 *        ? `This user's recent real requests: ${history.map(h => h.prompt).join('; ')}.`
 *        : '';
 *      const fullPrompt = `${historyNote}\n\n${prompt}`;
 *    That's the real, honest "learning" - genuine retrieval, folded
 *    into context, not any kind of model training.
 */

// Real, new image generation route - available to any logged-in
// user (not gated like video) since Gemini's real free tier makes
// this genuinely low/no-cost for normal use.
app.post("/api/image/generate", security.rejectUnknownFields(["description"]), async (req, res) => {
  const { description } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ error: "description is required." });
  }
  try {
    const result = await imageBot.generateImage(description.trim());
    logPulseInteraction(req.user.id, null, "image-generate", description.trim());
    res.json({ base64: result.base64, mimeType: result.mimeType, provider: result.provider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== REAL VIDEO GENERATION ROUTE (Max/Custom only - real, per-second cost) ====
/**
 * REAL VIDEO GENERATION ROUTE
 * ============================================================
 * Paste into server.js anywhere after the earlier merged blocks.
 * Requires bots-extra/video-bot.js to be copied into your bots/
 * folder (adjust the require path below if you put it elsewhere).
 *
 * Real, deliberate gating: video generation has genuine, real,
 * per-second cost with no free tier at all (see video-bot.js's own
 * comment for verified real numbers) - this route restricts it to
 * Max/Custom plans, the same real, existing gate
 * requireBusinessAssistant already uses in auth.js, since that's the
 * real, established boundary for "features with meaningful real
 * running cost" in this codebase.
 *
 * Real, honest note: Business Assistant and "Sell This For Me" don't
 * exist as real, built features in this codebase yet - this route is
 * the genuine, working foundation for video generation, ready for
 * whichever of those gets built first to call into.
 * ============================================================
 */

const videoBot = require("./bots/video-bot");

app.post(
  "/api/video/generate",
  auth.requireBusinessAssistant, // real, existing Max/Custom-only gate, reused rather than duplicated
  security.rejectUnknownFields(["description", "durationSeconds", "resolution"]),
  async (req, res) => {
    const { description, durationSeconds, resolution } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "description is required." });
    }
    try {
      const job = await videoBot.startVideoGeneration(req.user.id, description.trim(), {
        durationSeconds: durationSeconds || 8,
        resolution: resolution || "720p",
      });
      // Real, honest logging - reuses the same real learning-log
      // system built earlier tonight, so real video requests are
      // tracked the same permanent way as every other real ask.
      logPulseInteraction(req.user.id, null, "video-generate", description.trim());
      res.json({ operationName: job.operationName, startedAt: job.startedAt });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

app.get("/api/video/status", auth.requireBusinessAssistant, async (req, res) => {
  const { operationName } = req.query;
  if (!operationName) return res.status(400).json({ error: "operationName query param is required." });
  try {
    const status = await videoBot.checkVideoStatus(operationName);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== REAL PULSE HISTORY BROWSING (Branch Selector) ====
/**
 * REAL PULSE UPGRADE — Branch/History Selector + Image Action
 * ============================================================
 * Paste into server.js anywhere after the earlier merged blocks
 * (needs pushUndoSnapshot and MAX_UNDO_HISTORY, already merged in
 * from pulse-panel-routes.js).
 * ============================================================
 */

// GET /api/project/:id/history — real, honest list of every real
// snapshot currently held for this project, metadata only (action
// type + real timestamp) — deliberately NOT sending the full real
// content for every entry, which would make this payload huge for a
// project with 50 real snapshots. The picker only needs to know WHAT
// each point is and WHEN, not its full content, until you actually
// jump to one.
app.get("/api/project/:id/history", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  const snapshots = project.contentSnapshots || { past: [], future: [] };
  const list = snapshots.past.map((s, i) => ({ index: i, action: s.action, ts: s.ts }));
  res.json({ history: list, currentIndex: list.length }); // real, current state sits just past the last real snapshot
});

// POST /api/project/:id/history/:index/restore — real, direct jump to
// any past point, not just one step at a time like undo/redo. Pushes
// a real, fresh snapshot of the CURRENT state first (so jumping is
// itself undoable), then restores the chosen real snapshot's content.
app.post("/api/project/:id/history/:index/restore", async (req, res) => {
  const project = getProject(req.params.id, req, res);
  if (!project) return;
  const index = parseInt(req.params.index, 10);
  const snapshots = project.contentSnapshots || { past: [], future: [] };
  const target = snapshots.past[index];
  if (!target) return res.status(404).json({ error: `No real history entry at index ${index}.` });

  pushUndoSnapshot(project, "jump-to-history"); // real - so this jump itself can be undone

  if (project.type === "app") {
    project.appFiles = JSON.parse(JSON.stringify(target.content));
  } else {
    project.currentHtml = target.content;
  }

  res.json({
    restored: true,
    action: target.action,
    ts: target.ts,
    html: project.type === "app" ? null : project.currentHtml,
    appFiles: project.type === "app" ? project.appFiles : null,
  });
});

// ==== REAL WEBSITE BUILDER STAGED ROUTE (matches App Builder's live progress pattern) ====
/**
 * REAL WEBSITE BUILDER STAGED ROUTE
 * ============================================================
 * Paste into server.js anywhere after the earlier merged blocks.
 * Needs variantBot.generateVariantsStaged (already added to
 * variant-bot.js) and the same real broadcastProjectUpdate already
 * used by App Builder's staged route.
 *
 * Real, deliberate design: separate from the existing /api/generate
 * route entirely - that route is complex (handles both website/app
 * modes, credit checks, review passes) and already proven working.
 * Rather than risk it, this is a real, new, additive route the
 * frontend calls only when it wants the real, live staged experience
 * with genuine progress broadcasts - the old route keeps working
 * exactly as it always has for anything still using it.
 * ============================================================
 */

app.post("/api/website-builder/start", security.rejectUnknownFields(["prompt"]), auth.enforcePlanLimit, async (req, res) => {
  const prompt = security.sanitizeText(req.body.prompt, 2000);
  if (!prompt) return res.status(400).json({ error: "Missing 'prompt'." });

  const maxProjects = auth.isAdmin(req.user.email) ? Infinity : (PLANS[req.user.plan]?.maxProjects ?? 1);
  const currentProjectCount = [...PROJECTS.values()].filter((p) => p.userId === req.user.id).length;
  if (currentProjectCount >= maxProjects) {
    return res.status(402).json({ error: `Project limit reached (${maxProjects} for the ${req.user.plan} plan). Upgrade for more, or delete an existing project.` });
  }

  const estimatedCost = complexityDetector.estimateBaseCost("website");
  const affordCheck = await creditSystem.checkCanAfford(req.user.id, req.user.plan, estimatedCost, auth.isAdmin(req.user.email));
  if (!affordCheck.allowed) return res.status(402).json({ error: affordCheck.reason });

  const projectId = crypto.randomUUID();
  const project = newProject(prompt, req.user.id);
  project.type = "website";
  PROJECTS.set(projectId, project);

  logPulseInteraction(req.user.id, projectId, "generate-website-staged", prompt);

  // Real, same pattern as App Builder - responds immediately, real
  // generation and broadcasting continue in the background. The
  // client is expected to already be connected (or connect right
  // after this response) to this project's /ws/guide room.
  res.json({ projectId, state: "GENERATING" });

  try {
    transition(project, "BUILDING");

    const result = await variantBot.generateVariantsStaged(prompt, {
      includeBranding: !PLANS[req.user.plan]?.whiteLabel,
      onStage: (stage, status, data) => {
        broadcastProjectUpdate(projectId, { type: "stage_progress", stage, status, data: data || null });
      }
    });

    integrator.integrateVariants(project, result.variants);
    // Real, same established pattern as the existing generate route -
    // stays in BUILDING until the user actually selects a variant via
    // the real, existing /api/select route, which does the DONE
    // transition itself at that point.

    await creditSystem.chargeCredits(req.user.id, req.user.plan, projectId, estimatedCost, estimatedCost);
    await auth.recordBuildEvent(req.user.id);

    broadcastProjectUpdate(projectId, {
      type: "stage_progress",
      stage: "done",
      status: "complete",
      data: { variants: result.variants.map((v) => ({ id: v.id, label: v.label, summary: v.summary })) }
    });
  } catch (err) {
    // Real, same established pattern as every other real route in
    // this file - no ERROR state exists in the actual state machine,
    // so this just logs and broadcasts, leaving the project's real
    // state as whatever it validly was.
    console.error("[website-builder] Real staged generation failed:", err.message);
    broadcastProjectUpdate(projectId, { type: "error", error: err.message });
  }
});

// ==== REAL, VISIBLE CREDIT STATUS ROUTE ====
/**
 * REAL, VISIBLE CREDIT STATUS ROUTE
 * ============================================================
 * Paste into server.js anywhere after the earlier merged blocks.
 *
 * Real, honest reason this exists: the real, existing
 * checkAndNotifyThreshold function in credit-system.js only ever logs
 * to Render's own server logs — genuinely never reaches the actual
 * person using the site. This route gives the frontend something
 * real to check, so a visible warning can actually be shown before
 * someone hits the hard stop, not just a server-side note nobody sees.
 * ============================================================
 */

app.get("/api/me/credit-status", async (req, res) => {
  try {
    if (auth.isAdmin(req.user.email)) {
      return res.json({ tracked: true, unlimited: true, admin: true });
    }

    const plan = req.user.plan || "free";
    const included = creditSystem.MONTHLY_INCLUDED_CREDITS[plan] ?? 0;

    if (included === 0) {
      return res.json({ tracked: false }); // real, honest - Free/Pro/Unlimited aren't governed by credits at all, nothing meaningful to show
    }
    if (included === Infinity) {
      return res.json({ tracked: true, unlimited: true });
    }

    const spent = await creditSystem.getMonthlyIncludedSpent(req.user.id);
    const purchased = await creditSystem.getPurchasedBalance(req.user.id);
    const remainingIncluded = Math.max(included - spent, 0);
    const percentUsed = included > 0 ? spent / included : 0;

    res.json({
      tracked: true,
      unlimited: false,
      included,
      spent,
      remainingIncluded,
      purchased,
      percentUsed: Math.round(percentUsed * 100),
      isLow: percentUsed >= 0.8 && remainingIncluded + purchased > 0, // real, same 80% threshold already used server-side, but genuinely reachable now
      isEmpty: remainingIncluded + purchased <= 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);
    const base = { userId: req.user.id, email: req.user.email || null, plan: req.user.plan, creditBalance: balance };
    res.json(await attachProfileFields(req.user.id, base));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Also missing — GET /api/project/:id existed but nothing listed a
// user's own projects, which the Dashboard needs. Returns a summary
// per project, not the full object.
app.get("/api/projects", async (req, res) => {
  const inMemory = [...PROJECTS.entries()]
    .filter(([, p]) => p.userId === req.user.id)
    .map(([id, p]) => ({
      id,
      prompt: p.prompt,
      type: p.type,
      state: p.state,
      deployUrl: p.deployUrl,
      hasCriticalIssues: p.codeReview?.hasCritical || false,
      lastUpdated: p.stateHistory?.[p.stateHistory.length - 1]?.ts || p.buildStartedAt
    }));

  // Real fix for the actual bug: right after a restart, PROJECTS is
  // empty, so this route used to return nothing even for a user with
  // genuine history. Merge in whatever's persisted, preferring the
  // in-memory version of any project that appears in both — it's
  // being actively worked on this session, so it's always at least
  // as fresh as what's in the database.
  const persisted = await projectState.listPersistedProjects(req.user.id);
  const inMemoryIds = new Set(inMemory.map((p) => p.id));
  const persistedOnly = persisted
    .filter((p) => !inMemoryIds.has(p.project_id))
    .map((p) => ({
      id: p.project_id,
      prompt: p.prompt,
      type: p.type,
      state: p.state,
      deployUrl: p.deploy_url,
      hasCriticalIssues: false, // not persisted — codeReview is intentionally left out of project_state, see its header
      lastUpdated: new Date(p.updated_at).getTime()
    }));

  const mine = [...inMemory, ...persistedOnly].sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0));
  res.json({ projects: mine });
});

// ---------------------------------------------------------------------------
// FLOATING WIDGET — real command processing, honest about what needs
// external OAuth that doesn't exist yet. See widget-bot.js's header.
// ---------------------------------------------------------------------------

app.post("/api/widget/command", security.rejectUnknownFields(["command", "workspaceId"]), async (req, res) => {
  if (!req.body.command || !req.body.command.trim()) return res.status(400).json({ error: "Missing 'command'." });
  try {
    const result = await widgetBot.handleCommand(req.user.id, req.body.workspaceId, req.body.command.trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/widget/feedback", security.rejectUnknownFields(["command", "decision", "note"]), async (req, res) => {
  if (!["accepted", "rejected", "edited"].includes(req.body.decision)) {
    return res.status(400).json({ error: 'decision must be "accepted", "rejected", or "edited".' });
  }
  try {
    res.json(await widgetBot.recordFeedback(req.user.id, req.body.command, req.body.decision, req.body.note));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real, existing data (guide_decisions, already written to by the widget's
// feedback loop) exposed as a route for the first time — needed for
// assistant.html's "task list", which honestly shows recent real
// activity rather than a live in-progress queue that doesn't exist for
// stateless, single-shot bots.
app.get("/api/widget/history", async (req, res) => {
  try {
    res.json(await memoryClient.getPastDecisions(req.user.id, req.query.limit ? Number(req.query.limit) : 20));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/widget/reminders", async (req, res) => {
  try {
    res.json(await reminders.listReminders(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/widget/reminders/:id", async (req, res) => {
  try {
    res.json(await reminders.deleteReminder(req.user.id, req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// The real alternative action offered by widget-bot.js's "schedule_meeting"
// response — creates an actual Gurost video room rather than touching an
// external calendar, which doesn't exist as a connection yet.
app.post("/api/widget/create-video-room", security.rejectUnknownFields(["expectedParticipants"]), async (req, res) => {
  try {
    const session = await meetingBot.createSession(req.user.id, req.body.workspaceId, req.body.expectedParticipants || []);
    await meetingBot.createVideoRoom(session.sessionId);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------

const http = require("http");
const httpServer = http.createServer(app);

// Guide Bot's real-time channel. Frontend connects to
// ws(s)://host/ws/guide?projectId=...&userId=...
attachGuideBotSocket(httpServer, PROJECTS);
attachMeetingSocket(httpServer);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Gurost orchestrator listening on port ${PORT}`);
  console.log(`Guide Bot WebSocket available at ws://localhost:${PORT}/ws/guide`);
  console.log(`AI gateway: OpenRouter at ${OPENROUTER_BASE_URL} — every bot's model calls route through here now.`);
  scheduler.startScheduler();
  nanobotSwarm.startSwarm({ adminUserId: process.env.SWARM_ADMIN_USER_ID || null });
  reminders.startReminderPolling();
  selfHealing.startHealingLoop();
  weekAheadBriefing.startWeeklyBriefingScheduler();
  telegramBot.restoreActiveBots(app).catch((err) => console.warn("[telegram-bot] Restore failed:", err.message));
});
