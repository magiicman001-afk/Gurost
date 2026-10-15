"use strict";
/**
 * Bot video calls (Business Assistant 2.0, phase 3): who may call, how long, and the room bookkeeping.
 * The media itself is LiveKit's (rooms and join tokens come from lib/livekit-client.js). The bot is not a LiveKit
 * participant: the person's browser listens, asks the bot's chat route, and plays the bot's own voice (see
 * public/shared/bot-video-call.js). Nothing here stores audio, video or words: only who, which bot, and for how long.
 *
 * Paid plans only (the same plans as the Business Assistant). Free plans keep text chat.
 * Cost guard: a monthly minutes cap per person (VIDEO_MINUTES_PER_MONTH, default 120) and a 30-minute limit per call.
 * If the calls table is missing the app refuses to start a call: an unmetered call would be an unbounded bill.
 *
 * Everything the service needs is passed in, so the flow is tested with stand-ins (no LiveKit, no database).
 */
const crypto = require("crypto");
const personalities = require("./bot-personalities");

const PAID_PLANS = ["unlimited", "ultimate"];
const MAX_CALL_SECONDS = 30 * 60;
const DEFAULT_MONTHLY_MINUTES = 120;
const TABLE = "bot_calls";

/** The secret may be named LIVEKIT_API_SECRET (existing) or LIVEKIT_SECRET (Irfan's name for it). */
function settings(env = process.env) {
  const url = env.LIVEKIT_URL, key = env.LIVEKIT_API_KEY, secret = env.LIVEKIT_API_SECRET || env.LIVEKIT_SECRET;
  const n = parseInt(env.VIDEO_MINUTES_PER_MONTH, 10);
  return { url, key, secret, configured: !!(url && key && secret), monthlyMinutes: Number.isFinite(n) && n >= 0 ? n : DEFAULT_MONTHLY_MINUTES };
}

/** LiveKit signals over wss:// and checks over https:// on the same host; the call page needs both once the CSP is enforced. */
function livekitConnectSources(env = process.env) {
  try {
    const u = new URL(env.LIVEKIT_URL || "");
    if (u.protocol !== "wss:" && u.protocol !== "https:") return [];
    return ["https://" + u.host, "wss://" + u.host];
  } catch (e) { return []; }
}

const isPaid = (plan) => PAID_PLANS.includes(plan);
const monthStart = (now) => new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1)).toISOString();

function createCallService(deps) {
  const { db, env = process.env, now = () => Date.now(), random = () => crypto.randomBytes(8).toString("hex") } = deps;
  const cfg = () => settings(env);
  // The LiveKit client reads its own variables when it loads, so the second spelling of the secret is copied across first.
  const client = () => {
    if (deps.client) return deps.client;
    if (!env.LIVEKIT_API_SECRET && env.LIVEKIT_SECRET) process.env.LIVEKIT_API_SECRET = env.LIVEKIT_SECRET;
    return require("./livekit-client");
  };

  async function usedSeconds(userId) {
    const { data, error } = await db.from(TABLE).select("seconds, started_at, ended_at").eq("user_id", String(userId)).gte("started_at", monthStart(now()));
    if (error) throw Object.assign(new Error("The calls table is not ready."), { code: "metering-unavailable" });
    // A call still open counts up to the 30-minute limit, so leaving a tab open cannot hide minutes.
    return (data || []).reduce((sum, r) => {
      if (typeof r.seconds === "number") return sum + r.seconds;
      const open = Math.min(MAX_CALL_SECONDS, Math.max(0, Math.floor((now() - Date.parse(r.started_at)) / 1000)));
      return sum + open;
    }, 0);
  }

  /** { available, reason, minutesLeft, monthlyMinutes, maxCallMinutes }. reason: plan | not-configured | metering | limit | null. */
  async function status({ userId, plan }) {
    const c = cfg();
    const base = { monthlyMinutes: c.monthlyMinutes, maxCallMinutes: MAX_CALL_SECONDS / 60 };
    if (!isPaid(plan)) return { ...base, available: false, reason: "plan", minutesLeft: 0, message: "Video calls are part of the Max and Custom plans. Text chat with the team stays free." };
    if (!c.configured) return { ...base, available: false, reason: "not-configured", minutesLeft: 0, message: "Video calls are not switched on yet." };
    let used;
    try { used = await usedSeconds(userId); } catch (e) { return { ...base, available: false, reason: "metering", minutesLeft: 0, message: "Video calls are being set up. Please try again later." }; }
    const left = Math.max(0, Math.floor((c.monthlyMinutes * 60 - used) / 60));
    if (left <= 0) return { ...base, available: false, reason: "limit", minutesLeft: 0, message: "You have used this month's call minutes. They reset on the 1st." };
    return { ...base, available: true, reason: null, minutesLeft: left };
  }

  async function start({ userId, plan, botId, recordingConsent }) {
    if (!personalities.has(botId)) return { status: 404, body: { error: "Unknown assistant." } };
    const st = await status({ userId, plan });
    if (!st.available) return { status: st.reason === "plan" ? 402 : st.reason === "limit" ? 429 : 503, body: { error: st.message, reason: st.reason } };
    try {
      // One call at a time per person: a call left open past the limit is closed first, a live one blocks a second.
      const open = await db.from(TABLE).select("id, started_at").eq("user_id", String(userId)).is("ended_at", null);
      if (open.error) throw new Error(open.error.message);
      for (const r of open.data || []) {
        if (now() - Date.parse(r.started_at) > MAX_CALL_SECONDS * 1000) await db.from(TABLE).update({ ended_at: new Date(now()).toISOString(), seconds: MAX_CALL_SECONDS }).eq("id", r.id);
        else return { status: 409, body: { error: "You already have a call open. End it first.", reason: "open-call" } };
      }
      const room = `call-${botId}-${random()}`;
      await client().createRoom(room);
      const ins = await db.from(TABLE).insert({ user_id: String(userId), bot_id: botId, room, recording_consent: recordingConsent === true }).select("id").single();
      if (ins.error || !ins.data) { await Promise.resolve(client().deleteRoom(room)).catch(() => {}); throw new Error(ins.error ? ins.error.message : "no row"); }
      const join = await client().createJoinToken(room, `user-${userId}`, { canPublish: true, canSubscribe: true });
      return { status: 200, body: { callId: ins.data.id, room, token: join.token, url: join.url, minutesLeft: st.minutesLeft, maxCallMinutes: st.maxCallMinutes, bot: botId } };
    } catch (err) {
      console.error("[livekit] could not start a call:", err.message);
      return { status: 502, body: { error: "I could not start the call. Please try again in a moment." } };
    }
  }

  /** Length is worked out here from the start time, never taken from the browser. */
  async function end({ userId, callId }) {
    try {
      const { data, error } = await db.from(TABLE).select("id, room, started_at, ended_at, seconds").eq("id", String(callId)).eq("user_id", String(userId)).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return { status: 404, body: { error: "Call not found." } };
      if (data.ended_at) return { status: 200, body: { seconds: data.seconds || 0, alreadyEnded: true } };
      const seconds = Math.min(MAX_CALL_SECONDS, Math.max(0, Math.round((now() - Date.parse(data.started_at)) / 1000)));
      const up = await db.from(TABLE).update({ ended_at: new Date(now()).toISOString(), seconds }).eq("id", data.id).eq("user_id", String(userId));
      if (up.error) throw new Error(up.error.message);
      await Promise.resolve(client().deleteRoom(data.room)).catch(() => {}); // an already-closed room is not an error
      return { status: 200, body: { seconds } };
    } catch (err) {
      console.error("[livekit] could not end a call:", err.message);
      return { status: 502, body: { error: "I could not close that call cleanly. It will be closed automatically." } };
    }
  }

  return { status, start, end };
}

module.exports = { livekitConnectSources, PAID_PLANS, MAX_CALL_SECONDS, DEFAULT_MONTHLY_MINUTES, TABLE, settings, isPaid, monthStart, createCallService };
