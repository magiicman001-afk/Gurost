/**
 * Proactive suggestions for the Business Assistant.
 *
 * What it looks at: only the audit trail's counts (which bot, which tool, which
 * day and time). Never message text. No model is called and nothing costs money.
 * Every suggestion's "Yes" only does something free and harmless on the user's
 * own screen (open a bot with a starter message already typed). Nothing is sent
 * or bought.
 *
 * Limits (hard): at most 2 per user per day - enforced by the database key
 * (user_id, day_key, slot 1..2), so two page loads at once cannot exceed it.
 * "Not now" is respected for 7 days; two declines in a row for one kind stops
 * that kind for 30 days; a kind the user keeps accepting is shown first.
 * Memory paused, or any error: nothing is suggested (fails closed).
 *
 * Every function takes the Supabase client first so tests can pass a stub.
 */
const crypto = require("crypto");

const TABLE = "proactive_suggestions";
const MAX_PER_DAY = 2;
const DAY = 24 * 60 * 60 * 1000;
const EXPIRES_MS = 3 * DAY;
const COOLDOWN_MS = 7 * DAY;       // the same kind is not offered again within a week
const SNOOZE_MS = 7 * DAY;         // "Not now"
const DECLINE_PAUSE_MS = 30 * DAY; // two declines in a row
const ACTIONS = ["accepted", "declined", "snoozed"];

const BOT_LABELS = { sales: "Sales", hr: "HR", finance: "Finance", payroll: "Payroll", support: "Support", custom: "Custom" };
const label = (bot) => BOT_LABELS[bot] || "assistant";

/** Weekday name and part of day in the user's own time zone (falls back to UTC). */
function localParts(date, tz) {
  let zone = "UTC";
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); zone = tz || "UTC"; } catch (e) { zone = "UTC"; }
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long", hour: "numeric", hour12: false }).formatToParts(date);
  const weekday = (parts.find((p) => p.type === "weekday") || {}).value;
  const hour = parseInt((parts.find((p) => p.type === "hour") || {}).value, 10) % 24;
  const part = hour >= 5 && hour < 12 ? "mornings" : hour >= 12 && hour < 17 ? "afternoons" : hour >= 17 && hour < 22 ? "evenings" : "late nights";
  return { weekday, part };
}

const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

/**
 * Pure: audit rows (newest first or any order) -> candidate suggestions.
 * `events` need { created_at, event, tool_used, bot_type, ok }.
 */
function analyze(events, { now = Date.now(), tz = "UTC" } = {}) {
  const out = [];
  const t = (e) => new Date(e.created_at).getTime();
  const week = events.filter((e) => now - t(e) <= 7 * DAY);

  // 1. Repetition: many email drafts this week.
  const drafts = week.filter((e) => e.event === "tool_call" && e.tool_used === "email_draft" && e.ok !== false);
  if (drafts.length >= 5) {
    const bots = {}; drafts.forEach((e) => { if (e.bot_type) bots[e.bot_type] = (bots[e.bot_type] || 0) + 1; });
    const bot = (top(bots) || [])[0] || "sales";
    out.push({ type: "repeat_drafts", content: `You have drafted ${drafts.length} emails in the last 7 days. Want help writing a reusable template for the one you send most?`,
      action: { kind: "prefill", bot, text: "Help me write a reusable email template for the kind of email I send most often. Ask me what it is." } });
  }

  // 2. Timing: the same weekday and time of day keeps coming up.
  const chats = events.filter((e) => e.event === "chat" && e.ok !== false && now - t(e) <= 14 * DAY);
  if (chats.length >= 6) {
    const slots = {};
    chats.forEach((e) => { const p = localParts(new Date(t(e)), tz); const k = `${p.weekday}|${p.part}`; (slots[k] = slots[k] || { n: 0, weeks: new Set(), bots: {} }); const s = slots[k]; s.n++; s.weeks.add(Math.floor(t(e) / (7 * DAY))); if (e.bot_type) s.bots[e.bot_type] = (s.bots[e.bot_type] || 0) + 1; });
    const best = Object.entries(slots).sort((a, b) => b[1].n - a[1].n)[0];
    if (best && best[1].n >= 4 && best[1].weeks.size >= 2) {
      const [weekday, part] = best[0].split("|");
      const bot = (top(best[1].bots) || [])[0] || "sales";
      out.push({ type: "usual_time", content: `You often use the ${label(bot)} assistant on ${weekday} ${part}. Want to plan what to get done next time?`,
        action: { kind: "prefill", bot, text: `Help me plan my next ${weekday.toLowerCase()} session: ask me what needs doing and put it in order.` } });
    }
  }

  // 3. Welcome back: quiet for 5+ days after being active.
  const lastAt = events.reduce((m, e) => Math.max(m, t(e)), 0);
  const earlier = events.filter((e) => e.event === "chat" && now - t(e) > 5 * DAY);
  if (lastAt && now - lastAt >= 5 * DAY && earlier.length >= 3) {
    const days = Math.floor((now - lastAt) / DAY);
    const lastChat = events.filter((e) => e.event === "chat" && e.bot_type).sort((a, b) => t(b) - t(a))[0];
    out.push({ type: "welcome_back", content: `Welcome back - it has been ${days} days. Want a quick plan for this week?`,
      action: { kind: "prefill", bot: (lastChat && lastChat.bot_type) || "sales", text: "Help me plan this week: ask me about my priorities and make a short list." } });
  }
  return out;
}

/**
 * Pure: which candidates may be shown, best first, given past suggestions.
 * `history` rows need { suggestion_type, action, shown_at, decided_at, snooze_until }.
 */
function choose(candidates, history, { now = Date.now(), slots = MAX_PER_DAY } = {}) {
  const byType = {};
  history.forEach((h) => { (byType[h.suggestion_type] = byType[h.suggestion_type] || []).push(h); });
  const ok = candidates.filter((c) => {
    const rows = (byType[c.type] || []).slice().sort((a, b) => new Date(b.shown_at) - new Date(a.shown_at));
    if (!rows.length) return true;
    if (now - new Date(rows[0].shown_at).getTime() < COOLDOWN_MS) return false;                 // not within a week of the last one
    if (rows.some((r) => r.action === "snoozed" && r.snooze_until && new Date(r.snooze_until).getTime() > now)) return false; // "not now"
    const decided = rows.filter((r) => r.action === "accepted" || r.action === "declined");
    if (decided.length >= 2 && decided[0].action === "declined" && decided[1].action === "declined" && now - new Date(decided[0].decided_at || decided[0].shown_at).getTime() < DECLINE_PAUSE_MS) return false; // learned: not wanted
    return true;
  });
  const score = (type) => { const rows = byType[type] || []; const acc = rows.filter((r) => r.action === "accepted").length; return (acc + 1) / (rows.length + 2); };
  return ok.sort((a, b) => score(b.type) - score(a.type)).slice(0, Math.max(0, slots));
}

const dayKey = (now) => new Date(now).toISOString().slice(0, 10);
const card = (r) => ({ id: r.id, type: r.suggestion_type, content: r.content, action: (r.payload && r.payload.action) || null, expiresAt: r.expires_at });

/**
 * The suggestions to show now (existing unanswered ones, plus new ones if today's
 * 2 are not used up). deps: { isPaused(db,userId) }.
 */
async function suggestionsFor(db, userId, { tz, now = Date.now(), isPaused, auditList }) {
  try {
    if (!userId || (await isPaused(db, userId))) return [];
    const { data: rows, error } = await db.from(TABLE).select("id, suggestion_type, content, payload, day_key, slot, action, shown_at, decided_at, snooze_until, expires_at").eq("user_id", userId);
    if (error) throw new Error(error.message);
    const all = (rows || []).filter((r) => now - new Date(r.shown_at).getTime() < 60 * DAY);

    // Unanswered ones that ran out are marked ignored (that is a signal too).
    const stale = all.filter((r) => r.action === "pending" && new Date(r.expires_at).getTime() <= now);
    for (const r of stale) { r.action = "ignored"; await db.from(TABLE).update({ action: "ignored" }).eq("id", r.id).eq("user_id", userId).eq("action", "pending"); }

    const today = dayKey(now);
    const usedSlots = new Set(all.filter((r) => r.day_key === today).map((r) => r.slot));
    const free = [1, 2].filter((s) => !usedSlots.has(s));
    if (free.length) {
      const events = await auditList(db, { userId, since: new Date(now - 30 * DAY).toISOString(), limit: 200 });
      const picks = choose(analyze(events, { now, tz }), all, { now, slots: free.length });
      for (const c of picks) {
        const slot = free.shift();
        if (!slot) break;
        const row = { id: crypto.randomUUID(), user_id: userId, suggestion_type: c.type, content: c.content, payload: { action: c.action }, day_key: today, slot, action: "pending", expires_at: new Date(now + EXPIRES_MS).toISOString(), shown_at: new Date(now).toISOString() };
        const { error: insErr } = await db.from(TABLE).insert(row);
        if (!insErr) all.push(row); // a clash on (user, day, slot) means another request got there first: that is the hard limit working
      }
    }
    return all.filter((r) => r.action === "pending" && new Date(r.expires_at).getTime() > now).slice(0, MAX_PER_DAY).map(card);
  } catch (err) {
    console.error("[proactive] could not load suggestions:", err.message);
    return [];
  }
}

/** The user's answer: accepted, declined, or snoozed ("Not now"). Only the owner, only once. */
async function respond(db, userId, id, action, { now = Date.now() } = {}) {
  if (!ACTIONS.includes(action)) return { status: 400, body: { error: "Unknown answer." } };
  const patch = { action, decided_at: new Date(now).toISOString() };
  if (action === "snoozed") patch.snooze_until = new Date(now + SNOOZE_MS).toISOString();
  const { data, error } = await db.from(TABLE).update(patch).eq("id", id).eq("user_id", userId).eq("action", "pending").select("id");
  if (error) throw new Error(error.message);
  if (!data || !data.length) return { status: 404, body: { error: "That suggestion is no longer waiting." } };
  return { status: 200, body: { ok: true } };
}

module.exports = { TABLE, MAX_PER_DAY, COOLDOWN_MS, SNOOZE_MS, DECLINE_PAUSE_MS, analyze, choose, suggestionsFor, respond, localParts };
