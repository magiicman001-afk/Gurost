/**
 * Reminders — real, one-off, arbitrary-future-time reminders. Genuinely
 * different from lib/scheduler.js, which only handles recurring nightly
 * jobs, not "remind me in 2 hours" or "remind me tomorrow at 3pm".
 *
 * Real mechanism: a `reminders` table with a due timestamp, and a
 * polling loop (same pattern as nanobot-swarm.js's cron, just checking
 * more frequently since reminders need minute-level precision, not
 * daily) that fires notifications.js's already-real send() for
 * anything due. Not a new notification channel — reuses the one that
 * already exists (in-app + email + push).
 *
 * HONEST LIMIT: "remind me to X" from the widget needs a real due time
 * parsed from natural language ("in 2 hours", "tomorrow at 3pm") —
 * that parsing is real (a small Claude call, cheap tier), but genuinely
 * ambiguous phrasing ("remind me later") will get a best-effort
 * interpretation, not a guarantee of matching what the user meant.
 *
 * SQL (run once):
 *   CREATE TABLE reminders (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id text NOT NULL,
 *     text text NOT NULL,
 *     due_at timestamptz NOT NULL,
 *     fired boolean NOT NULL DEFAULT false,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX ON reminders (due_at) WHERE fired = false;
 */

const { supabase } = require("./db");
const { callClaude, CLAUDE_MODEL_FAST } = require("./claude-client");
const notifications = require("../notifications");

const PARSE_DUE_TIME_SYSTEM = `You are parsing a reminder request into a due time. You'll receive the reminder text and the current real timestamp.

Output ONLY valid JSON: {"dueAt": "ISO 8601 timestamp", "cleanedText": "the reminder text with time phrases removed"}

Rules:
- Compute dueAt as a real, absolute timestamp relative to the given current time — never a relative phrase.
- If no time is specified at all (just "remind me to call Sarah"), default to 1 hour from the current time.
- cleanedText should be just the task itself, e.g. "call Sarah" not "remind me to call Sarah in an hour".`;

async function createReminder(userId, rawText) {
  const { parsed } = await callClaude({
    system: PARSE_DUE_TIME_SYSTEM,
    messages: [{ role: "user", content: `Current time: ${new Date().toISOString()}\nReminder request: ${rawText}` }],
    maxTokens: 150,
    model: CLAUDE_MODEL_FAST
  });

  const { data, error } = await supabase
    .from("reminders")
    .insert({ user_id: userId, text: parsed.cleanedText, due_at: parsed.dueAt })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create reminder: ${error.message}`);

  return { id: data.id, text: parsed.cleanedText, dueAt: parsed.dueAt };
}

async function listReminders(userId, { includeFired = false } = {}) {
  let query = supabase.from("reminders").select("*").eq("user_id", userId).order("due_at", { ascending: true });
  if (!includeFired) query = query.eq("fired", false);
  const { data, error } = await query;
  if (error) return [];
  return data;
}

async function deleteReminder(userId, reminderId) {
  const { error } = await supabase.from("reminders").delete().eq("id", reminderId).eq("user_id", userId);
  if (error) throw new Error(`Failed to delete reminder: ${error.message}`);
  return { deleted: true };
}

/**
 * Real polling — checks for anything due, fires the real notification,
 * marks it fired so it doesn't repeat. Call startReminderPolling() once
 * at server startup, same pattern as nanobot-swarm's cron.
 */
async function checkDueReminders() {
  const { data: due, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("fired", false)
    .lte("due_at", new Date().toISOString());
  if (error || !due?.length) return;

  for (const reminder of due) {
    try {
      await notifications.send(reminder.user_id, {
        title: "Reminder",
        body: reminder.text,
        emailHtml: `<p>Reminder: ${reminder.text}</p>`,
        pushTags: ["reminder"]
      });
      await supabase.from("reminders").update({ fired: true }).eq("id", reminder.id);
    } catch (err) {
      console.warn(`[reminders] Failed to fire reminder ${reminder.id}:`, err.message);
      // Not marked fired — will retry on the next poll rather than
      // silently drop a reminder because one notification channel
      // hiccupped.
    }
  }
}

function startReminderPolling(intervalMs = 60 * 1000) {
  setInterval(() => {
    checkDueReminders().catch((err) => console.warn("[reminders] Poll failed:", err.message));
  }, intervalMs);
  console.log(`[reminders] Polling every ${intervalMs / 1000}s for due reminders.`);
}

module.exports = { createReminder, listReminders, deleteReminder, checkDueReminders, startReminderPolling };
