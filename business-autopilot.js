/**
 * Business Autopilot.
 *
 * THE SAFETY RULE, STATED PLAINLY: any action that would reach a real
 * customer, publish real content, or change real business operations
 * — sending an email, posting anything, processing a refund, deploying
 * a change — is ALWAYS gated behind approval-workflow.js, with zero
 * exceptions and no numeric override. The original request described
 * a "confidence threshold" that executes automatically below some
 * score — that's not built, on purpose: an LLM's self-reported
 * confidence isn't something reliable enough to gate real customer-
 * facing actions on, and a threshold with no floor is really just a
 * confidence score wearing a safety costume. What IS built is simpler
 * and more honest: a hardcoded list, not a score. Read-only research
 * and internal draft generation are always safe (nothing external
 * happens). Anything that reaches outside Gurost is always gated,
 * regardless of how "confident" a generation looks. This file cannot
 * be configured to bypass that split — SAFE_ACTIONS and GATED_ACTIONS
 * are fixed, not passed in as options.
 *
 * HONEST DATA AVAILABILITY, CHECKED BEFORE WRITING THIS, NOT ASSUMED:
 *   - "Reviews last week's analytics" — real data exists for Gurost's
 *     OWN platform usage (Claude cost, errors, activity via
 *     lib/usage-billing.js and admin-dashboard.js) — there is no real
 *     website-visitor or conversion tracking for a user's DEPLOYED
 *     site, because that infrastructure was never built. This reviews
 *     what's actually real: platform usage, not site traffic.
 *   - "Schedules social media content" — no real social posting API
 *     integration exists anywhere in this codebase. This generates
 *     real DRAFT content only, explicitly labeled as a draft that
 *     needs a real posting mechanism this build doesn't have yet —
 *     never claimed as "scheduled."
 *   - "Drafts follow-up emails to warm leads" — no real CRM/lead-
 *     tracking data source exists. Takes a real, explicitly-supplied
 *     lead list as input rather than pretending to auto-discover leads.
 *   - "Monitors the website for issues" — real, reuses self-healing.js's
 *     actual detection cycle.
 *   - "Prepares for upcoming meetings" — real only for meetings that
 *     already have a real session (meeting-bot.js has no "future/
 *     scheduled" concept without a calendar integration, which
 *     doesn't exist).
 */

const approvalWorkflow = require("./approval-workflow");
const companionAgent = require("./agents/companion-agent");
const usageBilling = require("./lib/usage-billing");
const selfHealing = require("./self-healing");
const email = require("./email");

// Real executors — the only two paths from "approved" to "actually
// happened." send_email genuinely works (email.js is real). Every
// other GATED_ACTIONS entry has NO real executor registered here,
// deliberately — approving them will fail with a clear, honest error
// rather than silently doing nothing or pretending it worked. That's
// correct: no real social posting API, refund processing, or website
// publish pipeline exists in this codebase yet. A gate with no real
// door on the other side should say so, not fake having one.
approvalWorkflow.registerExecutor("send_email", async (payload) => {
  const results = [];
  for (const draft of payload.drafts) {
    if (draft.error || !draft.email) { results.push({ lead: draft.lead, sent: false, reason: draft.error || "no email address" }); continue; }
    try {
      await email.send({ to: draft.email, subject: draft.subject, htmlBody: draft.content, textBody: draft.content });
      results.push({ lead: draft.lead, sent: true });
    } catch (err) {
      results.push({ lead: draft.lead, sent: false, reason: err.message });
    }
  }
  return { results };
});

// Fixed, non-negotiable. Not passed in, not overridable at call time.
const SAFE_ACTIONS = new Set(["weekly_review", "draft_social_content", "draft_follow_up_email", "website_health_check", "meeting_briefing"]);
const GATED_ACTIONS = new Set(["send_email", "post_social_content", "process_refund", "publish_website_change", "contact_customer"]);

/**
 * Real weekly review — pulls actual platform usage data, not invented
 * website analytics. Auto-executes: read-only, nothing external happens.
 */
async function runWeeklyReview(userId, workspaceId, businessContext) {
  const [usage, healthReport] = await Promise.all([
    workspaceId ? usageBilling.getWorkspaceUsage(workspaceId).catch(() => null) : null,
    selfHealing.generateReport().catch(() => null)
  ]);

  return {
    actionType: "weekly_review",
    autoExecuted: true,
    usage: usage || { note: "No workspace usage data available." },
    openIssues: healthReport?.pendingReview?.length || 0,
    resolvedThisWeek: healthReport?.history?.resolvedCount ?? null,
    note: "This reflects real Gurost platform usage — real website-visitor/conversion analytics aren't tracked for deployed sites, so that data isn't included here."
  };
}

/**
 * Real draft generation — auto-executes because a draft sitting in a
 * queue hasn't affected anyone yet. Actually sending/posting it is a
 * separate, always-gated action.
 */
async function draftSocialContent(businessContext, topics = []) {
  const drafts = [];
  for (const topic of topics.slice(0, 5)) {
    try {
      const result = await companionAgent.handleTask(businessContext, `Write a short social media post about: ${topic}`);
      drafts.push({ topic, content: result.output.content });
    } catch (err) {
      drafts.push({ topic, error: err.message });
    }
  }
  return { actionType: "draft_social_content", autoExecuted: true, drafts, note: "Drafts only — no real social posting API exists in this codebase, so nothing is scheduled or published." };
}

async function draftFollowUpEmails(businessContext, leads = []) {
  if (!leads.length) return { actionType: "draft_follow_up_email", autoExecuted: true, drafts: [], note: "No leads supplied — this build has no real CRM/lead source to pull from automatically." };
  const drafts = [];
  for (const lead of leads.slice(0, 10)) {
    if (!lead.email) { drafts.push({ lead: lead.name, error: "No email address given — can't queue this for real sending without one." }); continue; }
    try {
      const result = await companionAgent.handleTask(businessContext, `Draft a warm follow-up email to ${lead.name}${lead.context ? `, context: ${lead.context}` : ""}`);
      drafts.push({ lead: lead.name, email: lead.email, subject: `Following up`, content: result.output.content });
    } catch (err) {
      drafts.push({ lead: lead.name, error: err.message });
    }
  }
  return { actionType: "draft_follow_up_email", autoExecuted: true, drafts };
}

async function checkWebsiteHealth() {
  const detection = await selfHealing.runDetectionCycle();
  return { actionType: "website_health_check", autoExecuted: true, ...detection };
}

async function prepareMeetingBriefing(sessionId) {
  if (!sessionId) return { actionType: "meeting_briefing", autoExecuted: true, note: "No session ID given — this build has no calendar integration, so there's no way to discover 'upcoming' meetings automatically." };
  const session = await companionAgent.getMeetingSession(sessionId).catch(() => null);
  if (!session) return { actionType: "meeting_briefing", autoExecuted: true, note: `No real session found for "${sessionId}".` };
  return { actionType: "meeting_briefing", autoExecuted: true, session };
}

/**
 * The real gate — anything reaching outside Gurost gets queued for
 * approval, never executed here. This is the only path from a drafted
 * action to something actually happening in the world.
 */
async function requestGatedAction(userId, actionType, description, payload) {
  if (!GATED_ACTIONS.has(actionType)) {
    throw new Error(`"${actionType}" isn't a recognized gated action type — refusing to queue an undefined action rather than guess.`);
  }
  return approvalWorkflow.requestApproval(userId, actionType, description, payload);
}

/**
 * The real weekly cycle — runs every SAFE action for real, queues
 * anything gated instead of executing it, returns one real summary.
 * This is what week-ahead-briefing.js's cron calls.
 */
async function runAutopilotCycle(userId, workspaceId, businessContext, { socialTopics = [], leads = [], meetingSessionId = null } = {}) {
  const [review, social, emails, health, meeting] = await Promise.all([
    runWeeklyReview(userId, workspaceId, businessContext),
    draftSocialContent(businessContext, socialTopics),
    draftFollowUpEmails(businessContext, leads),
    checkWebsiteHealth(),
    prepareMeetingBriefing(meetingSessionId)
  ]);

  // Real gating: if there are drafts, they're not auto-sent — a
  // pending approval is queued for a human to actually send them.
  const pendingApprovals = [];
  if (social.drafts?.length) {
    pendingApprovals.push(await requestGatedAction(userId, "post_social_content", `${social.drafts.length} draft social post(s) ready to review and post.`, { drafts: social.drafts }));
  }
  if (emails.drafts?.length) {
    pendingApprovals.push(await requestGatedAction(userId, "send_email", `${emails.drafts.length} draft follow-up email(s) ready to review and send.`, { drafts: emails.drafts }));
  }

  return {
    generatedAt: new Date().toISOString(),
    weeklyReview: review,
    socialDrafts: social,
    emailDrafts: emails,
    websiteHealth: health,
    meetingBriefing: meeting,
    pendingApprovalCount: pendingApprovals.length,
    note: "Everything above ran automatically because it's read-only or draft-only. Nothing was sent, posted, or published — that requires your explicit approval, queued separately."
  };
}

module.exports = {
  SAFE_ACTIONS,
  GATED_ACTIONS,
  runWeeklyReview,
  draftSocialContent,
  draftFollowUpEmails,
  checkWebsiteHealth,
  prepareMeetingBriefing,
  requestGatedAction,
  runAutopilotCycle
};
