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
const { createCheckoutSession, createTopUpCheckout, verifyWebhook, getBalance, addCredits, PLANS, TOPUPS, LOW_CREDIT_THRESHOLD, BUSINESS_ASSISTANT, createBusinessAssistantSubscription, updateBotSeatQuantity } = require("./lib/billing");

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

// projectId -> { state, type, prompt, variants, selectedVariantId, currentHtml,
//                appFiles, lastAudit, history, stateHistory, deployUrl, userId }
const PROJECTS = new Map();

// Signup/login must run BEFORE the global auth middleware — a brand new
// user has no credentials yet, that's the whole point of these routes.
app.post("/api/auth/signup", security.rejectUnknownFields(["email", "password"]), async (req, res) => {
  try {
    const result = await userAuth.signup(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/auth/login", security.rejectUnknownFields(["email", "password"]), async (req, res) => {
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

// Everything under /api requires auth from here down (the Stripe webhook
// above is registered earlier and terminates the request itself, so it
// never reaches this middleware).
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

function getProject(projectId, res) {
  const project = PROJECTS.get(projectId);
  if (!project) {
    res.status(404).json({ error: "Project not found." });
    return null;
  }
  return project;
}

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

    const maxProjects = PLANS[req.user.plan]?.maxProjects ?? 1;
    const currentProjectCount = [...PROJECTS.values()].filter((p) => p.userId === req.user.id).length;
    if (currentProjectCount >= maxProjects) {
      return res.status(402).json({
        error: `Project limit reached (${maxProjects} for the ${req.user.plan} plan). Upgrade for more, or delete an existing project.`
      });
    }

    const projectId = crypto.randomUUID();
    const project = newProject(prompt, req.user.id);
    PROJECTS.set(projectId, project);

    try {
      transition(project, "PLANNING");
      transition(project, "BUILDING");

      if (mode === "app") {
        const result = await appBot.buildApp(prompt);
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

      res.json({
        projectId,
        type: "website",
        variants: variants.map((v) => ({ id: v.id, label: v.label, html: v.html, summary: v.summary })),
        failures: failures.length ? failures : undefined,
        state: project.state
      });
    } catch (err) {
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

  // Returns immediately — generation continues in the background,
  // broadcasting real progress. The client is expected to already be
  // connected (or connect right after this response) to this
  // project's /ws/guide room to receive those events.
  res.json({ projectId, state: "GENERATING" });

  try {
    const result = await appBot.buildAppStaged(projectId, prompt, {
      dbEngine,
      onStage: (stage, status, data) => {
        broadcastProjectUpdate(projectId, { type: "stage_progress", stage, status, data: data || null });
      },
      getPendingCorrection: () => PENDING_CORRECTIONS.get(projectId),
      clearPendingCorrection: () => PENDING_CORRECTIONS.set(projectId, null)
    });

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
  const project = getProject(projectId, res);
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
  const project = getProject(projectId, res);
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
    res.json({ projectId, issues: result.issues, lighthouse: result.lighthouse, state: project.state });
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
    const project = getProject(projectId, res);
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

app.post("/api/assistant", security.rejectUnknownFields(["projectId", "task"]), async (req, res) => {
  const { projectId } = req.body;
  const task = security.sanitizeText(req.body.task, 3000);
  const project = getProject(projectId, res);
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
    res.json({ projectId, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proactive suggestions. Call this after generate/select/deploy if you want
// the assistant to surface an idea at natural pause points — it isn't
// wired to fire automatically from those routes yet, same as the Guide
// Bot's interval-vs-event-trigger note in the README.
app.post("/api/assistant/suggest", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const { projectId } = req.body;
  const project = getProject(projectId, res);
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

app.post("/api/assistant/schedule", security.rejectUnknownFields(["businessContext"]), async (req, res) => {
  const { businessContext } = req.body;
  if (!businessContext || !businessContext.trim()) return res.status(400).json({ error: "Missing 'businessContext'." });
  try {
    await scheduler.subscribe(req.user.id, security.sanitizeText(businessContext, 2000));
    res.json({ subscribed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/assistant/unschedule", security.rejectUnknownFields([]), async (req, res) => {
  try {
    await scheduler.unsubscribe(req.user.id);
    res.json({ subscribed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/assistant/briefing", async (req, res) => {
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
  const project = getProject(projectId, res);
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

app.post("/api/deploy/one-click", security.rejectUnknownFields(["projectId"]), async (req, res) => {
  const { projectId } = req.body;
  const project = getProject(projectId, res);
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
  const project = getProject(projectId, res);
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
    const project = getProject(projectId, res);
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.params.projectId, res);
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.params.projectId, res);
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
  const project = getProject(req.params.projectId, res);
  if (!project) return;
  if (project.userId !== req.user.id) return res.status(403).json({ error: "Not your project." });
  res.json({ files: manualEdit.listFiles(project) });
});

app.get("/api/manual-edit/:projectId/file", async (req, res) => {
  const project = getProject(req.params.projectId, res);
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
  const project = getProject(req.params.projectId, res);
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
  const project = getProject(req.params.projectId, res);
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

app.post("/api/research", security.rejectUnknownFields(["topic"]), async (req, res) => {
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.params.id, res);
  if (!project) return;
  try {
    res.json(await productionReadiness.runReadinessCheck(project));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/readiness/guided-fix", security.rejectUnknownFields(["projectId", "category"]), async (req, res) => {
  const project = getProject(req.body.projectId, res);
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

app.get("/api/dev/qa-audit", auth.requireAdmin, async (req, res) => {
  try {
    const baseUrl = req.protocol + "://" + req.get("host");
    const updateVisualBaseline = req.query.updateBaseline === "true";
    const report = await qaOrchestrator.runFullQA(baseUrl, { updateVisualBaseline });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
app.post("/api/whatsapp/config", security.rejectUnknownFields(["phoneNumberId", "businessContext", "projectId"]), async (req, res) => {
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

app.get("/api/whatsapp/conversations", async (req, res) => {
  try {
    res.json(await whatsappBot.listConversations(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/whatsapp/conversations/:phone", async (req, res) => {
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
app.post("/api/whatsapp/send-order-confirmation", security.rejectUnknownFields(["customerPhone", "orderDetails"]), async (req, res) => {
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
  const project = getProject(req.body.projectId, res);
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
  const project = getProject(req.params.id, res);
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
app.get("/api/me", async (req, res) => {
  try {
    const balance = await getBalance(req.user.id);
    res.json({ userId: req.user.id, email: req.user.email || null, plan: req.user.plan, creditBalance: balance });
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
