"use strict";
/**
 * Business Assistant 2.0, phase 7: Google Calendar, in the person's OWN calendar.
 *
 * Can do:    show a short list of upcoming events (only if the person opted in to "view"); ADD one event after the person
 *            approves it (the create tool is needsApproval, parked by lib/approvals.js).
 * Cannot do: change or delete an event. There is no tool for it and this file never makes an update or delete call (a test
 *            scans for them). Events are added WITHOUT guests, so no invitation email is ever sent to anyone.
 * Honest limit: Google has no "add only" permission. The create permission (calendar.events) technically also covers change and
 *            delete, so the guarantee here is our code, not Google's scope. A view-only connection asks for the read-only scope.
 * Tokens:    sealed with SECRETS_KEY in `calendar_connections` (same pattern as lib/gmail.js, which this follows).
 * Env:       CALENDAR_CLIENT_ID / CALENDAR_CLIENT_SECRET; if absent, the Gmail pair is used (same Google OAuth client works).
 */
const crypto = require("crypto");
const box = require("./secret-box");
const { signState, readState } = require("./gmail");

const SCOPE_CREATE = "https://www.googleapis.com/auth/calendar.events";
const SCOPE_VIEW = "https://www.googleapis.com/auth/calendar.events.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TABLE = "calendar_connections";
const STATE_TTL_MS = 10 * 60 * 1000;
const CREATES_PER_DAY = 20;

function settings(env = process.env) {
  const base = env.APP_BASE_URL || env.PUBLIC_URL || "https://gurost.onrender.com";
  let keyOk = false;
  try { box.keyFrom(env); keyOk = true; } catch (e) { keyOk = false; }
  const clientId = env.CALENDAR_CLIENT_ID || env.GMAIL_CLIENT_ID || "";
  const clientSecret = env.CALENDAR_CLIENT_SECRET || env.GMAIL_CLIENT_SECRET || "";
  return { clientId, clientSecret, redirectUri: `${base.replace(/\/+$/, "")}/api/calendar/callback`, keyOk, configured: !!(clientId && clientSecret && keyOk) };
}

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const oneLine = (s) => String(s == null ? "" : s).replace(/[\r\n\u0000\u2028\u2029]+/g, " ").trim();
const isMissingTable = (e) => !!e && /does not exist|schema cache|relation|Could not find the table/i.test(String(e.message || e));
const scopeList = (s) => String(s || "").split(/\s+/).filter(Boolean);

/** An event, checked. Returns what Google needs. Throws plain-words errors. */
function cleanEvent({ title, start, timezone, duration_minutes, location, description }, zonedToUtc) {
  const name = oneLine(title).slice(0, 150);
  if (!name) throw new Error("The event needs a title.");
  const zone = timezone || "Europe/London";
  const mins = Math.round(duration_minutes === undefined ? 60 : Number(duration_minutes));
  if (!(mins >= 5 && mins <= 1440)) throw new Error("The length must be between 5 minutes and 24 hours.");
  const startUtc = zonedToUtc(String(start || ""), zone);
  const endUtc = new Date(startUtc.getTime() + mins * 60000);
  return { name, zone, mins, startUtc, endUtc, loc: oneLine(location).slice(0, 200), notes: String(description || "").replace(/\u0000/g, "").trim().slice(0, 1000) };
}

function createCalendarService({ db, env = process.env, fetchImpl, now = Date.now, random = () => crypto.randomBytes(8).toString("hex") } = {}) {
  const doFetch = (...a) => (fetchImpl || fetch)(...a);
  const cfg = () => settings(env);
  const tokens = new Map();
  const creates = new Map();

  async function row(userId) {
    const { data, error } = await db.from(TABLE).select("user_id, email, scopes, read_calendar, refresh_token_sealed, connected_at").eq("user_id", String(userId));
    if (error) { if (isMissingTable(error)) return null; throw new Error(error.message); }
    return (data && data[0]) || null;
  }

  async function status(userId) {
    const c = cfg();
    const base = { configured: c.configured, connected: false, canCreate: false, canView: false, viewing: false };
    if (!c.configured) return base;
    let r = null;
    try { r = await row(userId); } catch (e) { return { ...base, error: "Could not check Calendar just now." }; }
    if (!r) return base;
    const sc = scopeList(r.scopes);
    const canCreate = sc.includes(SCOPE_CREATE), canView = canCreate || sc.includes(SCOPE_VIEW);
    return { ...base, connected: true, email: r.email, canCreate, canView, viewing: !!r.read_calendar && canView, connectedAt: r.connected_at };
  }

  /** view: allow showing upcoming events. create: allow adding events (after approval). At least one is needed. */
  function authUrl(userId, { view = false, create = false } = {}) {
    const c = cfg();
    if (!c.configured || (!view && !create)) return null;
    const state = signState({ u: String(userId), exp: now() + STATE_TTL_MS, v: view ? 1 : 0, c: create ? 1 : 0, n: random(), k: "cal" }, box.keyFrom(env));
    const q = new URLSearchParams({ client_id: c.clientId, redirect_uri: c.redirectUri, response_type: "code", access_type: "offline", prompt: "consent", scope: create ? SCOPE_CREATE : SCOPE_VIEW, state });
    return `${AUTH_URL}?${q}`;
  }

  async function tokenCall(params) {
    const c = cfg();
    const res = await doFetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...params }) });
    let body = {}; try { body = await res.json(); } catch (e) { /* not JSON */ }
    return { ok: res.ok, status: res.status, body };
  }

  async function complete(userId, { code, state, error }) {
    const c = cfg();
    if (!c.configured) return { ok: false, reason: "not_configured" };
    if (error) return { ok: false, reason: "denied" };
    const st = readState(state, box.keyFrom(env), now());
    if (!st || st.k !== "cal" || st.u !== String(userId) || !code || typeof code !== "string") return { ok: false, reason: "bad_state" };
    const t = await tokenCall({ code, grant_type: "authorization_code", redirect_uri: c.redirectUri });
    if (!t.ok || !t.body.access_token) return { ok: false, reason: "google_refused" };
    const scopes = String(t.body.scope || "");
    const sc = scopeList(scopes);
    if (!sc.includes(SCOPE_CREATE) && !sc.includes(SCOPE_VIEW)) return { ok: false, reason: "missing_permission" };
    const canCreate = sc.includes(SCOPE_CREATE);
    const prev = await row(userId).catch(() => null);
    const refresh = t.body.refresh_token || (prev && prev.refresh_token_sealed ? box.open(prev.refresh_token_sealed, { key: box.keyFrom(env) }) : null);
    if (!refresh) return { ok: false, reason: "no_refresh_token" };
    const iso = new Date(now()).toISOString();
    const viewing = st.v === 1;
    const { error: dbErr } = await db.from(TABLE).upsert({ user_id: String(userId), email: null, scopes, read_calendar: viewing, refresh_token_sealed: box.seal(refresh, { key: box.keyFrom(env) }), connected_at: (prev && prev.connected_at) || iso, updated_at: iso }, { onConflict: "user_id" });
    if (dbErr) return { ok: false, reason: isMissingTable(dbErr) ? "no_table" : "save_failed" };
    tokens.set(String(userId), { token: t.body.access_token, exp: now() + ((Number(t.body.expires_in) || 3000) - 60) * 1000 });
    return { ok: true, canCreate, viewing };
  }

  async function setViewing(userId, on) {
    const r = await row(userId);
    if (!r) return { ok: false, reason: "not_connected" };
    const sc = scopeList(r.scopes);
    if (on && !sc.includes(SCOPE_CREATE) && !sc.includes(SCOPE_VIEW)) return { ok: false, reason: "needs_consent" };
    const { error } = await db.from(TABLE).update({ read_calendar: !!on, updated_at: new Date(now()).toISOString() }).eq("user_id", String(userId));
    if (error) throw new Error(error.message);
    return { ok: true, viewing: !!on };
  }

  async function disconnect(userId) {
    const r = await row(userId).catch(() => null);
    tokens.delete(String(userId));
    if (!r) return { ok: true, revoked: false };
    let revoked = false;
    try {
      const token = box.open(r.refresh_token_sealed, { key: box.keyFrom(env) });
      const res = await doFetch(`${REVOKE_URL}?${new URLSearchParams({ token })}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } });
      revoked = res.ok;
    } catch (e) { revoked = false; }
    const { error } = await db.from(TABLE).delete().eq("user_id", String(userId));
    if (error) throw new Error(error.message);
    return { ok: true, revoked };
  }

  async function accessToken(userId) {
    const hit = tokens.get(String(userId));
    if (hit && hit.exp > now()) return hit.token;
    const r = await row(userId);
    if (!r) throw new Error("Calendar is not connected. Connect it in Settings first.");
    const t = await tokenCall({ grant_type: "refresh_token", refresh_token: box.open(r.refresh_token_sealed, { key: box.keyFrom(env) }) });
    if (!t.ok || !t.body.access_token) {
      if (t.body && t.body.error === "invalid_grant") { await db.from(TABLE).delete().eq("user_id", String(userId)); tokens.delete(String(userId)); throw new Error("Calendar access was removed from your Google account, so I disconnected it. Connect it again in Settings."); }
      throw new Error("Google would not give access just now. Try again in a minute.");
    }
    tokens.set(String(userId), { token: t.body.access_token, exp: now() + ((Number(t.body.expires_in) || 3000) - 60) * 1000 });
    return t.body.access_token;
  }

  async function api(userId, query, init) {
    const token = await accessToken(userId);
    const res = await doFetch(`${API}${query || ""}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" } });
    let body = {}; try { body = await res.json(); } catch (e) { /* empty */ }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) tokens.delete(String(userId));
      throw new Error(res.status === 429 ? "Calendar says that is too many requests. Try again shortly." : "Calendar did not accept that. Check the connection in Settings.");
    }
    return body;
  }

  /** Upcoming events: title, start, end, place. No guests, no notes, no links. Other people's text: untrusted. */
  async function listUpcoming(userId, { days = 7 } = {}) {
    const st = await status(userId);
    if (!st.connected) throw new Error("Calendar is not connected. Connect it in Settings first.");
    if (!st.viewing) throw new Error("Viewing your calendar is switched off. You can turn it on in Settings, under Calendar.");
    const d = Math.max(1, Math.min(14, Math.floor(Number(days)) || 7));
    const q = new URLSearchParams({ timeMin: new Date(now()).toISOString(), timeMax: new Date(now() + d * 86400000).toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "25" });
    const out = await api(userId, `?${q}`);
    const events = (out.items || []).slice(0, 25).map((e) => ({ title: oneLine(e.summary || "(no title)").slice(0, 120), start: (e.start && (e.start.dateTime || e.start.date)) || "", end: (e.end && (e.end.dateTime || e.end.date)) || "", allDay: !!(e.start && e.start.date && !e.start.dateTime), location: oneLine(e.location).slice(0, 120) }));
    return { type: "calendar_view", days: d, count: events.length, untrusted: true, events };
  }

  /** Add ONE event with no guests. Only reached through the approval route. */
  async function createEvent(userId, args, zonedToUtc) {
    const st = await status(userId);
    if (!st.connected) throw new Error("Calendar is not connected. Connect it in Settings first.");
    if (!st.canCreate) throw new Error("Adding events is not allowed on your connection. Reconnect in Settings and tick adding events.");
    const e = cleanEvent(args, zonedToUtc);
    const day = new Date(now()).toISOString().slice(0, 10);
    const s = creates.get(String(userId));
    const used = s && s.day === day ? s.n : 0;
    if (used >= CREATES_PER_DAY) throw new Error(`That is ${CREATES_PER_DAY} events added today, which is the daily limit. Try again tomorrow.`);
    const body = { summary: e.name, start: { dateTime: e.startUtc.toISOString(), timeZone: e.zone }, end: { dateTime: e.endUtc.toISOString(), timeZone: e.zone }, reminders: { useDefault: true } };
    if (e.loc) body.location = e.loc;
    if (e.notes) body.description = e.notes;
    const out = await api(userId, "?sendUpdates=none", { method: "POST", body: JSON.stringify(body) });
    creates.set(String(userId), { day, n: used + 1 });
    return { type: "calendar_created", eventId: out.id, title: e.name, startUtc: e.startUtc.toISOString(), endUtc: e.endUtc.toISOString(), timezone: e.zone, added: true };
  }

  async function adminSummary() {
    const c = cfg();
    const out = { configured: c.configured, clientId: !!c.clientId, clientSecret: !!c.clientSecret, secretsKey: c.keyOk, redirectUri: c.redirectUri, connected: null, viewing: null };
    if (!c.configured) return out;
    const { data, error } = await db.from(TABLE).select("user_id, read_calendar");
    if (error) { out.table = isMissingTable(error) ? "missing" : "error"; return out; }
    out.table = "ok"; out.connected = (data || []).length; out.viewing = (data || []).filter((r) => r.read_calendar).length;
    return out;
  }

  return { status, authUrl, complete, setViewing, disconnect, listUpcoming, createEvent, adminSummary };
}

let shared_ = null;
function shared() {
  if (!shared_) shared_ = createCalendarService({ db: require("./db").supabase });
  return shared_;
}

module.exports = { shared, SCOPE_CREATE, SCOPE_VIEW, CREATES_PER_DAY, settings, createCalendarService, cleanEvent };
