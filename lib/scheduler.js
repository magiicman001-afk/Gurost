/**
 * Nightly job runner for the Business Assistant. "24/7" here means
 * exactly one thing mechanically: this process (server.js) needs to be
 * deployed as an always-on service (Render's standard web service type,
 * not a serverless function that spins down between requests) so
 * node-cron's in-process timer actually fires at 3am. There's no
 * separate infrastructure to stand up beyond that — the scheduler lives
 * inside the same server.
 *
 * Subscriptions and results are stored in Supabase, not the in-memory
 * PROJECTS map — a server restart shouldn't unsubscribe someone from
 * their nightly report the way it currently loses everything else in
 * this codebase's project state.
 *
 * SQL (run once against your Supabase/Postgres instance):
 *
 * create table scheduled_assistant_jobs (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null,
 *   business_context text not null,
 *   enabled boolean not null default true,
 *   created_at timestamptz default now()
 * );
 * create table assistant_briefings (
 *   id uuid primary key default gen_random_uuid(),
 *   user_id uuid not null,
 *   briefing_date date not null,
 *   content jsonb not null,
 *   created_at timestamptz default now(),
 *   unique (user_id, briefing_date)
 * );
 *
 * Known limitation, stated plainly: the cron schedule runs in the
 * server's own timezone/clock, not each user's local timezone. "Ready
 * by morning" means server-local morning unless you add a per-user
 * timezone column and compute per-user cron windows — not done here.
 */

const cron = require("node-cron");
const { supabase } = require("./db");
const assistantBot = require("../bots/assistant-bot");
const { notify } = require("../integrations");

async function subscribe(userId, businessContext) {
  const { error } = await supabase
    .from("scheduled_assistant_jobs")
    .insert({ user_id: userId, business_context: businessContext, enabled: true });
  if (error) throw new Error(`Failed to schedule nightly job: ${error.message}`);
}

async function unsubscribe(userId) {
  const { error } = await supabase
    .from("scheduled_assistant_jobs")
    .update({ enabled: false })
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to unschedule: ${error.message}`);
}

async function getTodaysBriefing(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("assistant_briefings")
    .select("content, created_at")
    .eq("user_id", userId)
    .eq("briefing_date", today)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch briefing: ${error.message}`);
  return data || null;
}

async function runOneJob(job) {
  // Two concrete drafts plus the same proactive-suggestion logic used
  // during the day — the nightly briefing is "what would the assistant
  // have suggested, already drafted" rather than a different code path.
  const { suggestions } = await assistantBot.suggestActions(job.business_context, []);

  const drafts = [];
  for (const s of suggestions.slice(0, 2)) {
    try {
      const result = await assistantBot.handleTask(job.business_context, s.action_hint);
      drafts.push({ prompt: s.action_hint, ...result.output });
    } catch (err) {
      drafts.push({ prompt: s.action_hint, error: err.message });
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("assistant_briefings").upsert(
    {
      user_id: job.user_id,
      briefing_date: today,
      content: { summary: `${drafts.length} draft(s) ready for review.`, drafts, suggestions }
    },
    { onConflict: "user_id,briefing_date" }
  );
  if (error) throw new Error(`Failed to store briefing: ${error.message}`);

  try {
    await notify.notify(job.user_id, `Your morning briefing is ready — ${drafts.length} draft(s) waiting.`, {
      title: "Gurost briefing ready",
      tags: "sunrise"
    });
  } catch (err) {
    // Non-fatal — the briefing itself is already stored and retrievable
    // via GET /api/assistant/briefing regardless of whether the push
    // notification succeeded.
    console.warn(`[scheduler] Briefing-ready notification failed for user ${job.user_id}:`, err.message);
  }
}

async function runNightlyJobs() {
  const { data: jobs, error } = await supabase
    .from("scheduled_assistant_jobs")
    .select("user_id, business_context")
    .eq("enabled", true);

  if (error) {
    console.error("[scheduler] Failed to load scheduled jobs:", error.message);
    return;
  }

  console.log(`[scheduler] Running nightly jobs for ${jobs.length} user(s)`);
  for (const job of jobs) {
    try {
      await runOneJob(job);
    } catch (err) {
      // One user's failure shouldn't take down the run for everyone else.
      console.error(`[scheduler] Nightly job failed for user ${job.user_id}:`, err.message);
    }
  }
}

function startScheduler({ cronExpression = "0 3 * * *" } = {}) {
  cron.schedule(cronExpression, () => {
    runNightlyJobs().catch((err) => console.error("[scheduler] Nightly run crashed:", err.message));
  });
  console.log(`[scheduler] Business Assistant nightly job scheduled: "${cronExpression}" (server-local time)`);
}

module.exports = { startScheduler, subscribe, unsubscribe, getTodaysBriefing, runNightlyJobs };
