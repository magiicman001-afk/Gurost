/**
 * Week Ahead Briefing — same real, proven cron pattern as
 * lib/scheduler.js's nightly job, just weekly (Monday mornings,
 * server-local time — same known limitation as the nightly one:
 * this doesn't account for per-user timezones, not solved here either).
 *
 * SQL (run once):
 *   CREATE TABLE autopilot_subscriptions (
 *     user_id text PRIMARY KEY,
 *     workspace_id uuid,
 *     business_context text NOT NULL,
 *     social_topics jsonb DEFAULT '[]',
 *     leads jsonb DEFAULT '[]',
 *     meeting_session_id text,
 *     enabled boolean NOT NULL DEFAULT true,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE TABLE week_ahead_briefings (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id text NOT NULL,
 *     week_start date NOT NULL,
 *     content jsonb NOT NULL,
 *     created_at timestamptz DEFAULT now(),
 *     UNIQUE (user_id, week_start)
 *   );
 */

const cron = require("node-cron");
const { supabase } = require("./lib/db");
const businessAutopilot = require("./business-autopilot");
const { notify } = require("./integrations");

async function subscribe(userId, workspaceId, businessContext, { socialTopics = [], leads = [], meetingSessionId = null } = {}) {
  const { error } = await supabase.from("autopilot_subscriptions").upsert({
    user_id: userId, workspace_id: workspaceId, business_context: businessContext,
    social_topics: socialTopics, leads, meeting_session_id: meetingSessionId, enabled: true
  });
  if (error) throw new Error(`Failed to subscribe: ${error.message}`);
}

async function unsubscribe(userId) {
  const { error } = await supabase.from("autopilot_subscriptions").update({ enabled: false }).eq("user_id", userId);
  if (error) throw new Error(`Failed to unsubscribe: ${error.message}`);
}

function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // real Monday calculation, handling Sunday correctly
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

async function getThisWeeksBriefing(userId) {
  const weekStart = getMondayOfCurrentWeek();
  const { data, error } = await supabase
    .from("week_ahead_briefings")
    .select("content, created_at")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch briefing: ${error.message}`);
  return data || null;
}

async function runOneJob(sub) {
  const content = await businessAutopilot.runAutopilotCycle(sub.user_id, sub.workspace_id, sub.business_context, {
    socialTopics: sub.social_topics || [],
    leads: sub.leads || [],
    meetingSessionId: sub.meeting_session_id
  });

  const weekStart = getMondayOfCurrentWeek();
  const { error } = await supabase.from("week_ahead_briefings").upsert(
    { user_id: sub.user_id, week_start: weekStart, content },
    { onConflict: "user_id,week_start" }
  );
  if (error) throw new Error(`Failed to store briefing: ${error.message}`);

  try {
    await notify.notify(sub.user_id, `Your Week Ahead briefing is ready — ${content.pendingApprovalCount} item(s) waiting for your review.`, {
      title: "Gurost — Week Ahead",
      tags: "calendar"
    });
  } catch (err) {
    console.warn(`[week-ahead-briefing] Notification failed for user ${sub.user_id}:`, err.message);
  }
}

async function runWeeklyJobs() {
  const { data: subs, error } = await supabase.from("autopilot_subscriptions").select("*").eq("enabled", true);
  if (error) {
    console.error("[week-ahead-briefing] Failed to load subscriptions:", error.message);
    return;
  }
  console.log(`[week-ahead-briefing] Running Week Ahead briefings for ${subs.length} user(s)`);
  for (const sub of subs) {
    try {
      await runOneJob(sub);
    } catch (err) {
      console.error(`[week-ahead-briefing] Failed for user ${sub.user_id}:`, err.message);
    }
  }
}

function startWeeklyBriefingScheduler({ cronExpression = "0 6 * * 1" } = {}) { // Monday 6am server-local
  cron.schedule(cronExpression, () => {
    runWeeklyJobs().catch((err) => console.error("[week-ahead-briefing] Weekly run crashed:", err.message));
  });
  console.log(`[week-ahead-briefing] Week Ahead briefing scheduled: "${cronExpression}" (server-local time)`);
}

module.exports = { startWeeklyBriefingScheduler, subscribe, unsubscribe, getThisWeeksBriefing, runWeeklyJobs };
