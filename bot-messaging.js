/**
 * Bot-to-user messaging. "Work only" is enforced at the point of
 * sending, not left as a policy note — every message is classified
 * before it goes out, and non-work messages are dropped rather than
 * sent with a warning label.
 *
 * SQL (run once):
 *   create table bot_messages (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     bot_name text not null,
 *     message text not null,
 *     category text not null,
 *     read boolean not null default false,
 *     created_at timestamptz default now()
 *   );
 *   create index on bot_messages (user_id, created_at desc);
 */

const { supabase } = require("./lib/db");
const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");
const notifications = require("./notifications");

const CLASSIFY_SYSTEM = `You are checking whether a message a bot wants to send a user is work-relevant.

Output ONLY valid JSON: {"is_work_related": true|false, "category": "task_update"|"suggestion"|"alert"|"other"}

Rules:
- Work-related: build status, suggestions, credit/billing alerts, meeting summaries ready, errors needing attention.
- Not work-related: anything conversational, personal, or off-topic — a bot has no reason to send that.`;

async function sendToUser(userId, botName, message) {
  const { parsed } = await callClaude({
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: message }],
    maxTokens: 100,
    model: CLAUDE_MODEL_FAST
  });

  if (!parsed.is_work_related) {
    console.warn(`[bot-messaging] Blocked non-work message from ${botName} to user ${userId}: "${message.slice(0, 80)}"`);
    return { sent: false, reason: "Message was classified as not work-related and was not sent." };
  }

  const { error } = await supabase.from("bot_messages").insert({ user_id: userId, bot_name: botName, message, category: parsed.category });
  if (error) throw new Error(`Failed to store message: ${error.message}`);

  // Route through the existing in-app/push notification layer rather
  // than inventing a separate delivery mechanism.
  await notifications.send(userId, { title: botName, body: message, pushTags: "speech_balloon" }).catch((err) =>
    console.warn("[bot-messaging] Notification delivery failed (message still stored):", err.message)
  );

  return { sent: true, category: parsed.category };
}

async function getMessages(userId, { unreadOnly = false, limit = 30 } = {}) {
  let query = supabase.from("bot_messages").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (unreadOnly) query = query.eq("read", false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function markRead(userId, messageId) {
  const { error } = await supabase.from("bot_messages").update({ read: true }).eq("id", messageId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

module.exports = { sendToUser, getMessages, markRead };
