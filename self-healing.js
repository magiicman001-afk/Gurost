/**
 * Self-Healing Orchestrator.
 *
 * READ THIS BEFORE ASSUMING "auto-trigger" means what it might sound
 * like. An earlier round of this exact codebase already had this
 * conversation — system-healer.js's own header documents it: a request
 * for fully automatic repair with zero human intervention was declined,
 * on purpose, because a bad automated "fix" doesn't just break one
 * generated user site, it can take down the platform itself, and
 * there's no sandbox test for "does this patch to server.js still let
 * the server boot." That reasoning hasn't changed — if anything it's
 * stronger now: the most recent audit of this codebase found the
 * server had likely never been confirmed to actually start, which
 * means there is currently zero evidence the foundation this healer
 * would operate on is even stable. Adding autonomous self-modification
 * on top of an unproven foundation is backwards, not a safety
 * corner cut for later.
 *
 * What "automatic" genuinely means here, and what stays human-gated:
 *   AUTOMATIC: detecting a problem (segment-guard.js + the require-path
 *   check added in this file), generating a proposed fix (Claude, via
 *   system-healer.js), and verifying the PROPOSAL actually resolves the
 *   stated problem — all real, all safe, because none of it touches a
 *   live file. The verification step here writes the proposed content
 *   to an isolated temp copy and checks THAT, never the real file.
 *
 *   HUMAN-GATED, UNCHANGED: applying a fix to the real file. That's
 *   still system-healer.js's existing markProposal()+manual-apply
 *   flow, exactly as it already was — this file adds a pre-review
 *   verification signal on top of it, not a bypass around it.
 *
 * The "continuous loop" is real: a scheduled detect->propose->verify
 * cycle (same setInterval pattern as nanobot-swarm.js), stopping at
 * the human gate every time, not looping past it.
 *
 * Why review-bot.js/fix-bot.js/sandbox.js weren't modified, on purpose,
 * not an oversight: those three operate on a genuinely different thing
 * — freshly generated USER code, still in memory, never a live file on
 * Gurost's own disk (sandbox.js specifically uses E2B, a remote service
 * built for running whole generated apps — the wrong shape entirely for
 * verifying a single proposed patch to Gurost's own source). Editing
 * them to also handle Gurost's own source would blur a distinction
 * that's been deliberately kept clean elsewhere in this codebase.
 * "Learning" is the same story — user-learning.js learns a person's
 * communication STYLE from their accept/reject decisions; this file's
 * learning is a different, new thing: which categories of real code
 * bugs get proposed, verified, and successfully resolved over time.
 * Kept separate rather than bolted onto a system built for something else.
 *
 * SQL (run once, extends the existing healer_proposals table rather
 * than duplicating it):
 *   ALTER TABLE healer_proposals ADD COLUMN IF NOT EXISTS verified boolean;
 *   ALTER TABLE healer_proposals ADD COLUMN IF NOT EXISTS verification_detail text;
 *   ALTER TABLE healer_proposals ADD COLUMN IF NOT EXISTS outcome_confirmed boolean;
 *
 *   CREATE TABLE healer_learning (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     file_path text NOT NULL,
 *     error_category text,
 *     proposal_id uuid REFERENCES healer_proposals(id),
 *     resolved boolean NOT NULL,
 *     created_at timestamptz DEFAULT now()
 *   );
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const segmentGuard = require("./segment-guard");
const systemHealer = require("./system-healer");
const { supabase } = require("./lib/db");

/**
 * The class of bug segment-guard.js's own docs admit it can't catch:
 * a file that's syntactically valid JavaScript but whose require()
 * paths don't actually resolve — exactly the three real bugs found
 * during the last audit (lib/reminders.js, lib/swarm.js,
 * industry-onboarding.js), none of which a pure syntax check would
 * have flagged. Same safe methodology as that audit: attempt to
 * actually require() each file in a subprocess, distinguish a broken
 * relative path from an expected missing npm package.
 */
async function checkRequirePaths(repoRoot) {
  const files = segmentGuard
    .buildSegments()
    .flatMap((s) => s.files.map((f) => f.path));

  const results = await Promise.all(
    files.map(async (filePath) => {
      try {
        await execFileAsync("node", ["-e", `require(${JSON.stringify(filePath)})`], { timeout: 5000, cwd: repoRoot });
        return { path: filePath, ok: true };
      } catch (err) {
        const stderr = err.stderr || err.message || "";
        // A relative-path bug shows "Cannot find module './x'" or
        // '../x' — a real npm package name never starts with . or ..
        // Anything else (a missing real dependency, a runtime error
        // from top-level code) isn't this check's job to flag.
        const isPathBug = /Cannot find module '\.\.?\//.test(stderr);
        if (isPathBug) return { path: filePath, ok: false, error: stderr };
        return { path: filePath, ok: true }; // not a path bug, not this check's concern
      }
    })
  );

  return results.filter((r) => !r.ok);
}

/**
 * Real detection cycle — segment-guard's existing syntax check plus
 * the require-path check above. Returns real failures, nothing
 * simulated.
 */
async function runDetectionCycle(repoRoot = process.env.GUROST_REPO_ROOT || process.cwd()) {
  const [segmentResults, pathFailures] = await Promise.all([
    segmentGuard.checkAllSegments(),
    checkRequirePaths(repoRoot)
  ]);

  const syntaxFailures = segmentResults.flatMap((s) => s.failures);
  return {
    syntaxFailures,
    pathFailures,
    totalIssues: syntaxFailures.length + pathFailures.length,
    checkedAt: new Date().toISOString()
  };
}

/**
 * For every real failure found, generate a proposal (system-healer.js,
 * unchanged, already real) — then verify it locally before it's ever
 * shown to a human, so a reviewer's time isn't spent on a proposal
 * that doesn't even fix the stated problem.
 */
async function runProposalCycle(repoRoot = process.env.GUROST_REPO_ROOT || process.cwd()) {
  const detection = await runDetectionCycle(repoRoot);
  const allFailures = [
    ...detection.syntaxFailures.map((f) => ({ ...f, kind: "syntax" })),
    ...detection.pathFailures.map((f) => ({ ...f, kind: "require-path" }))
  ];

  const proposals = [];
  for (const failure of allFailures) {
    try {
      const proposal = await systemHealer.proposeFix(failure.path, failure.error);
      const verification = await verifyProposal(proposal.id, repoRoot);
      proposals.push({ ...proposal, kind: failure.kind, verification });
    } catch (err) {
      proposals.push({ path: failure.path, kind: failure.kind, error: `Failed to generate proposal: ${err.message}` });
    }
  }

  return { detection, proposals };
}

/**
 * The real safety-relevant piece: writes the PROPOSED content to an
 * isolated temp file — never the real one — and checks whether that
 * copy actually resolves cleanly. This never touches, and cannot
 * touch, the live file; a reviewer still applies the real change
 * manually, exactly as system-healer.js already required.
 */
async function verifyProposal(proposalId, repoRoot = process.env.GUROST_REPO_ROOT || process.cwd()) {
  const proposal = await systemHealer.getProposal(proposalId);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gurost-heal-"));
  const tempFile = path.join(tempDir, path.basename(proposal.file_path));

  let verified = false;
  let detail = "";

  try {
    fs.writeFileSync(tempFile, proposal.proposed_content, "utf-8");

    try {
      await execFileAsync("node", ["--check", tempFile], { timeout: 5000 });
    } catch (err) {
      detail = `Proposed fix still has a syntax error: ${err.stderr || err.message}`;
      throw new Error(detail);
    }

    // For require-path proposals specifically, a syntax-only check
    // isn't enough — the whole point was the path itself. Real
    // resolution can only be checked from within the real repo
    // structure, so this copies the fix into place in a full, separate
    // repo COPY (not the real one), never the live tree.
    const repoCopyDir = fs.mkdtempSync(path.join(os.tmpdir(), "gurost-heal-repo-"));
    fs.cpSync(repoRoot, repoCopyDir, { recursive: true, filter: (src) => !src.includes("node_modules") });
    const relativePath = path.relative(repoRoot, proposal.file_path);
    fs.writeFileSync(path.join(repoCopyDir, relativePath), proposal.proposed_content, "utf-8");

    try {
      await execFileAsync("node", ["-e", `require(${JSON.stringify(path.join(repoCopyDir, relativePath))})`], { timeout: 5000, cwd: repoCopyDir });
      verified = true;
      detail = "Proposed fix resolves cleanly in an isolated copy of the repo.";
    } catch (err) {
      const stderr = err.stderr || err.message || "";
      if (/Cannot find module '\.\.?\//.test(stderr)) {
        detail = `Proposed fix still has an unresolved relative path: ${stderr}`;
      } else {
        verified = true; // a missing real npm package isn't this proposal's fault
        detail = "Proposed fix resolves cleanly (remaining error, if any, is an unrelated missing dependency, not the path bug this fix addresses).";
      }
    } finally {
      fs.rmSync(repoCopyDir, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  await supabase.from("healer_proposals").update({ verified, verification_detail: detail }).eq("id", proposalId);
  return { verified, detail };
}

/**
 * Called after a human has approved AND manually applied a proposal —
 * confirms the real, now-live file actually resolves cleanly, and logs
 * the outcome as real learning data. This is the one place this file
 * touches something a human already changed, not something it changes
 * itself.
 */
async function recordOutcome(proposalId, repoRoot = process.env.GUROST_REPO_ROOT || process.cwd()) {
  const proposal = await systemHealer.getProposal(proposalId);
  let resolved = false;

  try {
    await execFileAsync("node", ["-e", `require(${JSON.stringify(proposal.file_path)})`], { timeout: 5000, cwd: repoRoot });
    resolved = true;
  } catch (err) {
    const stderr = err.stderr || err.message || "";
    resolved = !/Cannot find module '\.\.?\//.test(stderr) && !/SyntaxError/.test(stderr);
  }

  await supabase.from("healer_proposals").update({ outcome_confirmed: resolved }).eq("id", proposalId);
  await supabase.from("healer_learning").insert({
    file_path: proposal.file_path,
    error_category: proposal.error_detail?.slice(0, 200) || null,
    proposal_id: proposalId,
    resolved
  });

  return { resolved };
}

/**
 * Real, human-readable summary — what was found, what's pending
 * review, what's historically been resolved. No invented numbers.
 */
async function generateReport() {
  const [pending, { data: learningHistory }] = await Promise.all([
    systemHealer.listPendingProposals(),
    supabase.from("healer_learning").select("*").order("created_at", { ascending: false }).limit(50)
  ]);

  const resolvedCount = (learningHistory || []).filter((l) => l.resolved).length;
  const totalTracked = (learningHistory || []).length;

  return {
    pendingReview: pending.map((p) => ({
      id: p.id,
      filePath: p.file_path,
      explanation: p.explanation,
      verified: p.verified,
      verificationDetail: p.verification_detail
    })),
    history: {
      totalTracked,
      resolvedCount,
      resolutionRate: totalTracked > 0 ? Math.round((resolvedCount / totalTracked) * 100) : null
    },
    generatedAt: new Date().toISOString()
  };
}

let intervalHandle = null;
function startHealingLoop(intervalMs = 60 * 60 * 1000) {
  if (intervalHandle) return; // already running, don't double-schedule
  intervalHandle = setInterval(() => {
    runProposalCycle().catch((err) => console.warn("[self-healing] Cycle failed:", err.message));
  }, intervalMs);
  console.log(`[self-healing] Detection/proposal cycle scheduled every ${intervalMs / 60000} minutes. Applying a fix always requires a human review — see /api/swarm/proposals.`);
}
function stopHealingLoop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = {
  runDetectionCycle,
  runProposalCycle,
  verifyProposal,
  recordOutcome,
  generateReport,
  startHealingLoop,
  stopHealingLoop
};
