/**
 * Production Readiness — a real checklist for a generated project,
 * built by aggregating the real checks that already existed by the
 * time this was written (security-scanner.js, aislop-check.js,
 * sandbox.js) rather than duplicating any of them, plus genuinely new
 * pattern-based checks for things nothing else in this codebase yet
 * covers: whether the project has any authentication code, any error
 * handling, and any logging at all.
 *
 * NOT built on business-autopilot.js, despite that being the original
 * suggestion — checked its real content first and it's about running
 * an ongoing business (weekly reviews, social drafts, follow-ups),
 * not about auditing a generated project's own code. Different
 * problem. self-healing.js was checked too, for the same reason —
 * also a different scope (Gurost's own platform health, not a user's
 * generated project).
 *
 * HONEST SCOPE, STATED PLAINLY: every check here detects *presence*
 * of a pattern, not *correctness*. Finding `bcrypt` imported doesn't
 * confirm passwords are actually hashed correctly everywhere they
 * should be — it confirms the project has at least started building
 * real auth, which is what "missing vs not missing" actually needs to
 * answer. Treat a passing checklist as "worth a human looking closer,"
 * not "verified secure."
 */

const securityScanner = require("./security-scanner");
const { runAislopCheck } = require("./aislop-check");
const { runSandboxTest } = require("./sandbox");
const { callClaude } = require("./lib/claude-client");

const AUTH_PATTERNS = /bcrypt|jsonwebtoken|passport|express-session|requireAuth|jwt\.verify|jwt\.sign/i;
const PAYMENT_PATTERNS = /stripe|paypal|braintree|checkout\.session/i;
const LOGGING_PATTERNS = /console\.(log|error|warn|info)|winston|pino|bunyan/i;

function detectPattern(files, pattern) {
  return files.some((f) => pattern.test(f.content));
}

/**
 * Real, honest signal for error handling coverage — counts real
 * try/catch blocks against real async function and route handler
 * counts. Not a claim that every risky operation is covered, just a
 * genuine, checkable ratio rather than a guess.
 */
function checkErrorHandlingCoverage(files) {
  let tryCatchCount = 0;
  let asyncOpCount = 0;
  for (const f of files) {
    tryCatchCount += (f.content.match(/\btry\s*{/g) || []).length;
    asyncOpCount += (f.content.match(/async\s+function|async\s*\(|app\.(get|post|put|delete|patch)\(/g) || []).length;
  }
  if (asyncOpCount === 0) return { ratio: null, tryCatchCount, asyncOpCount };
  return { ratio: tryCatchCount / asyncOpCount, tryCatchCount, asyncOpCount };
}

/**
 * Real, aggregated readiness checklist. Runs the existing real checks
 * alongside the new pattern checks, in parallel where they're
 * independent of each other's results.
 */
async function runReadinessCheck(project) {
  const backendFiles = project.appFiles?.backend || [];
  const frontendFiles = project.appFiles?.frontend || [];
  const allFiles = [...backendFiles, ...frontendFiles];

  const [security, quality, sandbox] = await Promise.all([
    securityScanner.scanDatabaseSecurity().catch((err) => ({ skipped: true, reason: err.message })),
    runAislopCheck(allFiles),
    backendFiles.length ? runSandboxTest(backendFiles) : Promise.resolve({ skipped: true, reason: "No backend to test." }),
  ]);

  const secretFindings = securityScanner.scanCodeForSecrets(frontendFiles);
  const hasAuth = detectPattern(allFiles, AUTH_PATTERNS);
  const hasPayments = detectPattern(allFiles, PAYMENT_PATTERNS);
  const hasLogging = detectPattern(allFiles, LOGGING_PATTERNS);
  const errorHandling = checkErrorHandlingCoverage(backendFiles);

  const checklist = [
    {
      category: "Security",
      status: security.skipped ? "unknown" : security.criticalCount > 0 ? "missing" : "present",
      detail: security.skipped
        ? `Couldn't check database security: ${security.reason}`
        : security.criticalCount > 0
        ? `${security.criticalCount} table(s) with real, unprotected access — see security-scanner.js findings.`
        : "Database access checks passed.",
    },
    {
      category: "Exposed secrets in frontend code",
      status: secretFindings.findings.length > 0 ? "missing" : "present",
      detail: secretFindings.findings.length > 0 ? `${secretFindings.findings.length} possible hardcoded key(s) found in client-side code.` : "No hardcoded secrets detected in frontend files.",
    },
    {
      category: "Code quality (AI-slop patterns)",
      status: quality.skipped ? "unknown" : quality.results.some((r) => !r.pass) ? "missing" : "present",
      detail: quality.skipped ? `Couldn't run quality check: ${quality.reason}` : `${quality.results.flatMap((r) => r.issues).length} pattern issue(s) found.`,
    },
    {
      category: "Runtime stability",
      status: sandbox.skipped ? "unknown" : sandbox.pass ? "present" : "missing",
      detail: sandbox.skipped ? sandbox.reason : sandbox.pass ? "Backend starts without crashing." : "Backend crashed on startup — see sandbox errors.",
    },
    {
      category: "Authentication",
      status: hasAuth ? "present" : "missing",
      detail: hasAuth ? "Real auth-related code detected." : "No authentication code detected — worth checking if this project needs user accounts.",
    },
    {
      category: "Payment processing",
      status: hasPayments ? "present" : "not_detected",
      detail: hasPayments ? "Real payment integration code detected." : "No payment code detected — not necessarily missing, only relevant if this business needs to charge customers.",
    },
    {
      category: "Error handling",
      status: errorHandling.ratio === null ? "unknown" : errorHandling.ratio < 0.3 ? "missing" : "present",
      detail: errorHandling.ratio === null
        ? "No backend functions to check."
        : `${errorHandling.tryCatchCount} try/catch block(s) across roughly ${errorHandling.asyncOpCount} async operation(s).`,
    },
    {
      category: "Logging",
      status: hasLogging ? "present" : "missing",
      detail: hasLogging ? "Real logging calls detected." : "No logging detected — debugging a live issue without any logs is genuinely hard.",
    },
  ];

  const missingCount = checklist.filter((c) => c.status === "missing").length;

  return {
    generatedAt: new Date().toISOString(),
    checklist,
    missingCount,
    readyForProduction: missingCount === 0,
    note: "This detects presence of patterns, not correctness — a 'present' result means the project has started building the thing, not that it's verified right. Worth a real human look either way before shipping to real customers.",
  };
}

/**
 * Real, guided fix for one missing checklist item — reuses the exact
 * same callClaude pattern fix-bot.js already established, rather than
 * inventing a second way of calling Claude for code changes.
 */
const GUIDED_FIX_SYSTEM = `You are a backend engineer adding one specific missing capability to an existing project. Given the existing files and what's missing, add ONLY that capability — don't refactor unrelated code, don't add other features.
Output ONLY valid JSON, no preamble, no markdown fences:
{"files": [{"path": "...", "content": "..."}], "summary": "one sentence describing what was added"}
Return every file that needs to change, complete, not fragments. If a new file is needed (e.g. an auth middleware), include it.`;

async function generateMissingPiece(project, category) {
  const backendFiles = project.appFiles?.backend || [];
  if (!backendFiles.length) throw new Error("No backend files to add to.");

  const { parsed } = await callClaude({
    system: GUIDED_FIX_SYSTEM,
    messages: [{
      role: "user",
      content: `Existing backend files:\n${JSON.stringify(backendFiles)}\n\nMissing capability to add: ${category}`,
    }],
    maxTokens: 8000,
  });

  return { category, files: parsed.files, summary: parsed.summary };
}

module.exports = { runReadinessCheck, generateMissingPiece };
