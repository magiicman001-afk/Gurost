"use strict";
/**
 * Business Assistant 2.0, phase 6: Gmail, in the person's OWN account.
 *
 * What it can do:   write a draft into Gmail's Drafts; send one email AFTER the person approves it (the send tool is
 *                   needsApproval, so lib/approvals.js parks it); read a short list of recent inbox messages ONLY if the
 *                   person turned on the separate "read my inbox" choice.
 * What it cannot:   delete, archive, label or change mail. We never ask Google for a scope that allows it
 *                   (the "modify" and full-access permissions), so even a bug in our code could not do it.
 *
 * Scopes (the least that does the job):
 *   gmail.compose  - create drafts and send.   gmail.readonly - only added when the person opts in to inbox reading.
 * Storage: the refresh token is sealed with SECRETS_KEY (lib/secret-box.js) in `gmail_connections`. Mail itself is never stored.
 * Everything is fail-closed: no client id/secret or no SECRETS_KEY, or no table -> "not set up", never a crash.
 */
const crypto = require("crypto");
const box = require("./secret-box");

const SCOPE_COMPOSE = "https://www.googleapis.com/auth/gmail.compose";
const SCOPE_READ = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
const TABLE = "gmail_connections";
const STATE_TTL_MS = 10 * 60 * 1000;
const SENDS_PER_DAY = 30;
const MAX_RECIPIENTS = 10;
const EMAIL = /^[^\s@<>(),;:\\"]+@[^\s@<>(),;:\\"]+\.[^\s@<>(),;:\\"]{2,}$/;

/** Env reading in one place. The redirect must be registered in the Google console exactly as shown. */
function settings(env = process.env) {
  const base = env.APP_BASE_URL || env.PUBLIC_URL || "https://gurost.onrender.com";
  let keyOk = false;
  try { box.keyFrom(env); keyOk = true; } catch (e) { keyOk = false; }
  const clientId = env.GMAIL_CLIENT_ID || "";
  const clientSecret = env.GMAIL_CLIENT_SECRET || "";
  return { clientId, clientSecret, redirectUri: `${base.replace(/\/+$/, "")}/api/gmail/callback`, keyOk, configured: !!(clientId && clientSecret && keyOk) };
}

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const oneLine = (s) => String(s == null ? "" : s).replace(/[\r\n\u0000\u2028\u2029]+/g, " ").trim();
const isMissingTable = (e) => !!e && /does not exist|schema cache|relation|Could not find the table/i.test(String(e.message || e));

/** Signed, short-lived state for the OAuth round trip. Binds the callback to the user who started it. */
function signState(payload, key) {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${b64url(crypto.createHmac("sha256", key).update(body).digest())}`;
}
function readState(state, key, now) {
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) return null;
  const want = b64url(crypto.createHmac("sha256", key).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p; try { p = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")); } catch (e) { return null; }
  if (!p || typeof p.u !== "string" || typeof p.exp !== "number" || p.exp < now) return null;
  return p;
}

/** The recipients, subject and body, checked. Throws a plain-words error the person can read. */
function cleanMessage({ to, subject, body }, { requireTo }) {
  const addresses = String(to || "").split(",").map((a) => a.trim()).filter(Boolean);
  const bad = addresses.find((a) => !EMAIL.test(a));
  if (bad) throw new Error(`"${bad.slice(0, 60)}" is not a valid email address.`);
  if (addresses.length > MAX_RECIPIENTS) throw new Error("That is too many recipients for one email.");
  if (requireTo && !addresses.length) throw new Error("An email needs at least one recipient before it can be sent.");
  const subj = oneLine(subject).slice(0, 200);
  const text = String(body == null ? "" : body).replace(/\u0000/g, "").replace(/\r\n?/g, "\n").trim().slice(0, 5000);
  if (!subj) throw new Error("The email needs a subject.");
  if (!text) throw new Error("The email needs a body.");
  return { addresses, subj, text };
}

/** RFC 5322 message as base64url (what Gmail wants). Headers cannot be injected: every header value is one line. */
function buildRaw({ addresses, subj, text }) {
  const encodedSubject = /^[\x20-\x7e]*$/.test(subj) ? subj : `=?UTF-8?B?${Buffer.from(subj, "utf8").toString("base64")}?=`;
  const lines = [];
  if (addresses.length) lines.push(`To: ${addresses.join(", ")}`);
  lines.push(`Subject: ${encodedSubject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "");
  const bodyB64 = Buffer.from(text.replace(/\n/g, "\r\n"), "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  return b64url(lines.join("\r\n") + "\r\n" + bodyB64);
}

function createGmailService({ db, env = process.env, fetchImpl, now = Date.now, random = () => crypto.randomBytes(8).toString("hex") } = {}) {
  const doFetch = (...a) => (fetchImpl || fetch)(...a);
  const cfg = () => settings(env);
  const tokens = new Map();   // userId -> { token, exp }   (short-lived access tokens, memory only)
  const sends = new Map();    // userId -> { day, n }

  async function row(userId) {
    const { data, error } = await db.from(TABLE).select("user_id, email, scopes, read_inbox, refresh_token_sealed, connected_at").eq("user_id", String(userId));
    if (error) { if (isMissingTable(error)) return null; throw new Error(error.message); }
    return (data && data[0]) || null;
  }

  async function status(userId) {
    const c = cfg();
    const base = { configured: c.configured, connected: false, email: null, readInbox: false, canSend: false };
    if (!c.configured) return base;
    let r = null;
    try { r = await row(userId); } catch (e) { return { ...base, error: "Could not check Gmail just now." }; }
    if (!r) return base;
    const scopes = String(r.scopes || "");
    return { ...base, connected: true, email: r.email, readInbox: !!r.read_inbox && scopes.includes(SCOPE_READ), canSend: scopes.includes(SCOPE_COMPOSE), canRead: scopes.includes(SCOPE_READ), connectedAt: r.connected_at };
  }

  /** The Google consent URL. Asks for compose only, plus readonly when the person opted in to inbox reading. */
  function authUrl(userId, { readInbox = false } = {}) {
    const c = cfg();
    if (!c.configured) return null;
    const state = signState({ u: String(userId), exp: now() + STATE_TTL_MS, r: readInbox ? 1 : 0, n: random() }, box.keyFrom(env));
    const q = new URLSearchParams({
      client_id: c.clientId, redirect_uri: c.redirectUri, response_type: "code", access_type: "offline", prompt: "consent",
      include_granted_scopes: "true", scope: readInbox ? `${SCOPE_COMPOSE} ${SCOPE_READ}` : SCOPE_COMPOSE, state
    });
    return `${AUTH_URL}?${q}`;
  }

  async function tokenCall(params) {
    const c = cfg();
    const res = await doFetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, ...params }) });
    let body = {}; try { body = await res.json(); } catch (e) { /* not JSON */ }
    return { ok: res.ok, status: res.status, body };
  }

  /** Callback: swap the code for tokens, learn the address, seal and store the refresh token. */
  async function complete(userId, { code, state, error }) {
    const c = cfg();
    if (!c.configured) return { ok: false, reason: "not_configured" };
    if (error) return { ok: false, reason: "denied" };
    const st = readState(state, box.keyFrom(env), now());
    if (!st || st.u !== String(userId)) return { ok: false, reason: "bad_state" };
    if (!code || typeof code !== "string") return { ok: false, reason: "bad_state" };
    const t = await tokenCall({ code, grant_type: "authorization_code", redirect_uri: c.redirectUri });
    if (!t.ok || !t.body.access_token) return { ok: false, reason: "google_refused" };
    const scopes = String(t.body.scope || "");
    if (!scopes.includes(SCOPE_COMPOSE)) return { ok: false, reason: "missing_permission" };
    const wantsRead = st.r === 1 && scopes.includes(SCOPE_READ);
    const prev = await row(userId).catch(() => null);
    const refresh = t.body.refresh_token || (prev && prev.refresh_token_sealed ? box.open(prev.refresh_token_sealed, { key: box.keyFrom(env) }) : null);
    if (!refresh) return { ok: false, reason: "no_refresh_token" };
    const prof = await doFetch(`${API}/profile`, { headers: { authorization: `Bearer ${t.body.access_token}` } });
    let email = null; try { email = (await prof.json()).emailAddress || null; } catch (e) { /* keep null */ }
    const iso = new Date(now()).toISOString();
    const { error: dbErr } = await db.from(TABLE).upsert({ user_id: String(userId), email, scopes, read_inbox: wantsRead, refresh_token_sealed: box.seal(refresh, { key: box.keyFrom(env) }), connected_at: (prev && prev.connected_at) || iso, updated_at: iso }, { onConflict: "user_id" });
    if (dbErr) return { ok: false, reason: isMissingTable(dbErr) ? "no_table" : "save_failed" };
    tokens.set(String(userId), { token: t.body.access_token, exp: now() + ((Number(t.body.expires_in) || 3000) - 60) * 1000 });
    return { ok: true, email, readInbox: wantsRead };
  }

  /** Turn inbox reading off (or on, if Google already granted it). Turning it ON the first time needs authUrl(readInbox). */
  async function setReadInbox(userId, on) {
    const r = await row(userId);
    if (!r) return { ok: false, reason: "not_connected" };
    if (on && !String(r.scopes || "").includes(SCOPE_READ)) return { ok: false, reason: "needs_consent" };
    const { error } = await db.from(TABLE).update({ read_inbox: !!on, updated_at: new Date(now()).toISOString() }).eq("user_id", String(userId));
    if (error) throw new Error(error.message);
    return { ok: true, readInbox: !!on };
  }

  /** Forget the connection: revoke at Google (best effort) and delete the sealed key. Safe to call twice. */
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
    if (!r) throw new Error("Gmail is not connected. Connect it in Settings first.");
    const t = await tokenCall({ grant_type: "refresh_token", refresh_token: box.open(r.refresh_token_sealed, { key: box.keyFrom(env) }) });
    if (!t.ok || !t.body.access_token) {
      if (t.body && t.body.error === "invalid_grant") { await db.from(TABLE).delete().eq("user_id", String(userId)); tokens.delete(String(userId)); throw new Error("Gmail access was removed from your Google account, so I disconnected it. Connect it again in Settings."); }
      throw new Error("Google would not give access just now. Try again in a minute.");
    }
    tokens.set(String(userId), { token: t.body.access_token, exp: now() + ((Number(t.body.expires_in) || 3000) - 60) * 1000 });
    return t.body.access_token;
  }

  async function api(userId, path, init) {
    const token = await accessToken(userId);
    const res = await doFetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...((init && init.headers) || {}) } });
    let body = {}; try { body = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) tokens.delete(String(userId));
      throw new Error(res.status === 429 ? "Gmail says that is too many requests. Try again shortly." : "Gmail did not accept that. Check the connection in Settings.");
    }
    return body;
  }

  /** Put a draft in the person's Gmail Drafts folder. Nothing is sent. */
  async function saveDraft(userId, msg) {
    const m = cleanMessage(msg, { requireTo: false });
    const out = await api(userId, "/drafts", { method: "POST", body: JSON.stringify({ message: { raw: buildRaw(m) } }) });
    return { type: "gmail_draft", draftId: out.id, to: m.addresses, subject: m.subj, saved: true, sent: false };
  }

  /** Send. Only ever reached through the approval route; there is also a daily cap as a second guard. */
  async function send(userId, msg) {
    const m = cleanMessage(msg, { requireTo: true });
    const day = new Date(now()).toISOString().slice(0, 10);
    const s = sends.get(String(userId));
    const used = s && s.day === day ? s.n : 0;
    if (used >= SENDS_PER_DAY) throw new Error(`That is ${SENDS_PER_DAY} emails sent today, which is the daily limit. Try again tomorrow.`);
    const out = await api(userId, "/messages/send", { method: "POST", body: JSON.stringify({ raw: buildRaw(m) }) });
    sends.set(String(userId), { day, n: used + 1 });
    return { type: "gmail_sent", messageId: out.id, to: m.addresses, subject: m.subj, sent: true };
  }

  /**
   * A short list of recent inbox messages: sender, subject, date and a 200-character preview. No bodies, no attachments.
   * Needs the separate opt-in. The text is somebody else's writing, so callers must treat it as data, never as instructions.
   */
  async function listInbox(userId, { max = 5, unreadOnly = false } = {}) {
    const st = await status(userId);
    if (!st.connected) throw new Error("Gmail is not connected. Connect it in Settings first.");
    if (!st.readInbox) throw new Error("Reading your inbox is switched off. You can turn it on in Settings, under Gmail.");
    const n = Math.max(1, Math.min(10, Math.floor(Number(max)) || 5));
    const q = new URLSearchParams({ maxResults: String(n), labelIds: "INBOX" });
    if (unreadOnly) q.set("q", "is:unread");
    const list = await api(userId, `/messages?${q}`);
    const out = [];
    for (const m of (list.messages || []).slice(0, n)) {
      const d = await api(userId, `/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
      const h = Object.fromEntries(((d.payload && d.payload.headers) || []).map((x) => [String(x.name).toLowerCase(), x.value]));
      out.push({ id: m.id, from: oneLine(h.from).slice(0, 120), subject: oneLine(h.subject).slice(0, 160), date: oneLine(h.date).slice(0, 40), preview: oneLine(d.snippet).slice(0, 200) });
    }
    return { type: "gmail_inbox", count: out.length, untrusted: true, messages: out };
  }

  /** For the admin page: counts only, no addresses. */
  async function adminSummary() {
    const c = cfg();
    const out = { configured: c.configured, clientId: !!c.clientId, clientSecret: !!c.clientSecret, secretsKey: c.keyOk, redirectUri: c.redirectUri, connected: null, readingInbox: null };
    if (!c.configured) return out;
    const { data, error } = await db.from(TABLE).select("user_id, read_inbox");
    if (error) { out.table = isMissingTable(error) ? "missing" : "error"; return out; }
    out.table = "ok"; out.connected = (data || []).length; out.readingInbox = (data || []).filter((r) => r.read_inbox).length;
    return out;
  }

  return { status, authUrl, complete, setReadInbox, disconnect, saveDraft, send, listInbox, adminSummary };
}

let sharedService = null;
/** The one service the server and the tools both use (so the token cache and the daily send cap are shared). */
function shared() {
  if (!sharedService) sharedService = createGmailService({ db: require("./db").supabase });
  return sharedService;
}

module.exports = { shared, SCOPE_COMPOSE, SCOPE_READ, SENDS_PER_DAY, settings, createGmailService, cleanMessage, buildRaw, signState, readState };
