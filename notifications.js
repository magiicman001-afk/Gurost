/**
 * Unified notifications. Email (Postmark, email.js) and push (Ntfy,
 * lib/notify.js) already existed as separate systems — this doesn't
 * rebuild either. What was missing: in-app notifications (a plain
 * Supabase-backed inbox) and a per-user preference gate that decides
 * which channels actually fire for a given event type.
 *
 * SQL (run once):
 *   create table notification_preferences (
 *     user_id text primary key,
 *     email_enabled boolean not null default true,
 *     push_enabled boolean not null default true,
 *     in_app_enabled boolean not null default true
 *   );
 *   create table in_app_notifications (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     title text not null,
 *     body text not null,
 *     read boolean not null default false,
 *     created_at timestamptz default now()
 *   );
 *   create index on in_app_notifications (user_id, created_at desc);
 */

const { supabase } = require("./lib/db");
const email = require("./email");
const { notify: pushClient } = require("./integrations");

async function getPreferences(userId) {
  const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return data || { email_enabled: true, push_enabled: true, in_app_enabled: true };
}

async function setPreferences(userId, prefs) {
  const { error } = await supabase.from("notification_preferences").upsert({ user_id: userId, ...prefs });
  if (error) throw new Error(`Failed to save preferences: ${error.message}`);
}

async function storeInApp(userId, title, body) {
  const { error } = await supabase.from("in_app_notifications").insert({ user_id: userId, title, body });
  if (error) console.warn("[notifications] In-app store failed:", error.message);
}

async function getInApp(userId, { unreadOnly = false, limit = 30 } = {}) {
  let query = supabase.from("in_app_notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (unreadOnly) query = query.eq("read", false);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function markRead(userId, notificationId) {
  const { error } = await supabase.from("in_app_notifications").update({ read: true }).eq("id", notificationId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

async function getUserEmail(userId) {
  const { data } = await supabase.from("api_keys").select("email").eq("user_id", userId).not("email", "is", null).limit(1).maybeSingle();
  return data?.email || null;
}

/**
 * The actual unified send — respects per-channel preferences, fans out
 * to whichever channels are enabled. Each channel failing independently
 * doesn't block the others (a missing email address shouldn't suppress
 * the in-app notification, for example).
 */
async function send(userId, { title, body, emailHtml, pushTags }) {
  const prefs = await getPreferences(userId);
  const results = { inApp: false, email: false, push: false };

  if (prefs.in_app_enabled) {
    await storeInApp(userId, title, body);
    results.inApp = true;
  }

  if (prefs.email_enabled && emailHtml) {
    const toAddress = await getUserEmail(userId);
    if (!toAddress) {
      console.warn(`[notifications] No email on file for user ${userId} — skipping email channel, not failing the whole send.`);
    } else {
      try {
        await email.sendNewsletter(toAddress, { subject: title, htmlBody: emailHtml });
        results.email = true;
      } catch (err) {
        console.warn("[notifications] Email send failed:", err.message);
      }
    }
  }

  if (prefs.push_enabled) {
    try {
      await pushClient.notify(userId, body, { title, tags: pushTags });
      results.push = true;
    } catch (err) {
      console.warn("[notifications] Push send failed:", err.message);
    }
  }

  return results;
}

module.exports = { getPreferences, setPreferences, getInApp, markRead, send };
