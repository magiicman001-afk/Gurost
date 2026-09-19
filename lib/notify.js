/**
 * Ntfy (ntfy.sh or self-hosted) push notifications.
 *
 * Correction to how this was requested: ntfy sends PUSH notifications
 * (its phone app, web push, desktop), not SMS text messages — its own
 * docs explicitly note it "will not try to send SMS" when compared to
 * services that do. If you need actual SMS, that's a different service
 * (Twilio, etc.) — not swappable in here without a different API shape.
 *
 * Security note, not optional: on the public ntfy.sh server, a topic
 * name IS the access control — anyone who knows/guesses it can read
 * that topic's notifications. A predictable topic like `gurost-user-42`
 * would leak deploy URLs and status to anyone who guessed it. This
 * module generates an opaque random topic per user instead and stores
 * it in Supabase, rather than deriving it from the user ID.
 *
 * SQL (run once):
 *   create table notify_topics (
 *     user_id text primary key,
 *     topic text not null unique,
 *     created_at timestamptz default now()
 *   );
 */

const crypto = require("crypto");
const { supabase } = require("./db");

const NTFY_SERVER = process.env.NTFY_SERVER || "https://ntfy.sh";

async function getOrCreateTopic(userId) {
  const { data: existing } = await supabase
    .from("notify_topics")
    .select("topic")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing.topic;

  const topic = `gurost-${crypto.randomBytes(12).toString("hex")}`;
  const { error } = await supabase.from("notify_topics").insert({ user_id: userId, topic });
  if (error) throw new Error(`Failed to create notify topic: ${error.message}`);
  return topic;
}

async function notify(userId, message, { title, priority, tags } = {}) {
  const topic = await getOrCreateTopic(userId);
  const headers = { "Content-Type": "text/plain; charset=utf-8" };
  if (title) headers["Title"] = title;
  if (priority) headers["Priority"] = priority; // "max"|"high"|"default"|"low"|"min"
  if (tags) headers["Tags"] = tags; // comma-separated emoji shortcodes, e.g. "rocket,white_check_mark"
  if (process.env.NTFY_TOKEN) headers["Authorization"] = `Bearer ${process.env.NTFY_TOKEN}`;

  const response = await fetch(`${NTFY_SERVER}/${topic}`, { method: "POST", headers, body: message });
  if (!response.ok) {
    // Notifications are a nice-to-have on top of the actual feature (deploy,
    // briefing, etc.) — callers should catch this rather than let a failed
    // notification fail the underlying operation.
    throw new Error(`ntfy publish failed (${response.status})`);
  }
  return { topic };
}

module.exports = { notify, getOrCreateTopic };
