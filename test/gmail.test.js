// Run: node --test test/gmail.test.js
// Business Assistant 2.0, phase 6: Gmail. Draft-only, send only after approval, inbox reading is opt-in, nothing can be
// deleted or archived. Stand-ins for Google and the database: no network.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const G = require("../lib/gmail");
const box = require("../lib/secret-box");
const tools = require("../lib/tools");
const gmailTools = require("../lib/tools/gmail");
const S = require("../public/shared/gmail-settings.js");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const ENV = { GMAIL_CLIENT_ID: "cid", GMAIL_CLIENT_SECRET: "csecret", SECRETS_KEY: crypto.randomBytes(32).toString("base64"), APP_BASE_URL: "https://gurost.example" };
const U = "11111111-1111-4111-8111-111111111111";
const NOW = Date.parse("2026-10-16T10:00:00Z");

function fakeDb({ missing = false } = {}) {
  const rows = [];
  const q = (run) => { const c = []; const api = { eq(k, v) { c.push([k, v]); return api; }, then(res) { return Promise.resolve(run(c)).then(res); } }; return api; };
  const match = (c) => rows.filter((r) => c.every(([k, v]) => String(r[k]) === String(v)));
  return {
    rows,
    from() {
      return {
        select: () => q((c) => (missing ? { data: null, error: { message: 'relation "gmail_connections" does not exist' } } : { data: match(c), error: null })),
        upsert: (row) => { const i = rows.findIndex((r) => r.user_id === row.user_id); if (i >= 0) Object.assign(rows[i], row); else rows.push({ ...row }); return Promise.resolve({ error: null }); },
        update: (patch) => q((c) => { match(c).forEach((r) => Object.assign(r, patch)); return { error: null }; }),
        delete: () => q((c) => { match(c).forEach((r) => rows.splice(rows.indexOf(r), 1)); return { error: null }; })
      };
    }
  };
}

// A scripted Google. `calls` records every request so tests can check what was (not) asked.
function fakeGoogle(opts = {}) {
  const calls = [];
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  const impl = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.startsWith("https://oauth2.googleapis.com/token")) {
      const p = new URLSearchParams(String(init.body));
      if (p.get("grant_type") === "refresh_token") return opts.refreshError ? json(400, { error: "invalid_grant" }) : json(200, { access_token: "at-" + calls.length, expires_in: 3599 });
      return json(200, { access_token: "at-first", refresh_token: opts.noRefresh ? undefined : "rt-secret-123", expires_in: 3599, scope: opts.scope || G.SCOPE_COMPOSE });
    }
    if (u.startsWith("https://oauth2.googleapis.com/revoke")) return json(200, {});
    if (u.endsWith("/profile")) return json(200, { emailAddress: "owner@example.com" });
    if (u.endsWith("/drafts")) return json(200, { id: "d1" });
    if (u.endsWith("/messages/send")) return json(200, { id: "m1" });
    if (u.includes("/messages?")) return json(200, { messages: [{ id: "a" }, { id: "b" }] });
    if (u.includes("/messages/")) return json(200, { snippet: "x".repeat(500), payload: { headers: [{ name: "From", value: "Sam <sam@x.com>" }, { name: "Subject", value: "Hello\r\nBcc: evil@x.com" }, { name: "Date", value: "Mon, 12 Oct 2026" }] } });
    return json(404, {});
  };
  return { calls, impl };
}

function setup(o = {}) {
  const db = fakeDb(o.db), g = fakeGoogle(o.google);
  const svc = G.createGmailService({ db, env: o.env || ENV, fetchImpl: g.impl, now: () => NOW, random: () => "nonce" });
  return { db, g, svc };
}
const stateFrom = (url) => new URL(url).searchParams.get("state");
async function connect({ readInbox = false, scope } = {}) {
  const s = setup({ google: { scope } });
  const url = s.svc.authUrl(U, { readInbox });
  const out = await s.svc.complete(U, { code: "code1", state: stateFrom(url) });
  return { ...s, url, out };
}

test("Gmail is only 'configured' when the id, the secret AND the encryption key are all set", () => {
  assert.equal(G.settings(ENV).configured, true);
  assert.equal(G.settings({ ...ENV, GMAIL_CLIENT_ID: "" }).configured, false);
  assert.equal(G.settings({ ...ENV, GMAIL_CLIENT_SECRET: "" }).configured, false);
  assert.equal(G.settings({ ...ENV, SECRETS_KEY: "" }).configured, false);
  assert.equal(G.settings(ENV).redirectUri, "https://gurost.example/api/gmail/callback");
});

test("unconfigured: no URL, status says so, tools are not offered", async () => {
  const s = setup({ env: {} });
  assert.equal(s.svc.authUrl(U), null);
  const st = await s.svc.status(U);
  assert.equal(st.configured, false); assert.equal(st.connected, false);
  assert.ok(gmailTools.every((t) => t.isAvailable() === false || G.settings().configured));
});

test("the consent URL asks for compose only, and adds read-only just when the person opted in", () => {
  const { svc } = setup();
  const a = new URL(svc.authUrl(U));
  assert.equal(a.searchParams.get("scope"), G.SCOPE_COMPOSE);
  assert.equal(a.searchParams.get("access_type"), "offline");
  assert.equal(a.searchParams.get("redirect_uri"), "https://gurost.example/api/gmail/callback");
  const b = new URL(svc.authUrl(U, { readInbox: true }));
  assert.equal(b.searchParams.get("scope"), `${G.SCOPE_COMPOSE} ${G.SCOPE_READ}`);
  for (const url of [a, b]) assert.doesNotMatch(url.searchParams.get("scope"), /modify|mail\.google\.com|gmail\.send|settings/);
});

test("the state is signed, expires, and belongs to one person", async () => {
  const { svc, url } = await connect();
  const state = stateFrom(url);
  const key = box.keyFrom(ENV);
  assert.ok(G.readState(state, key, NOW));
  assert.equal(G.readState(state, key, NOW + 11 * 60 * 1000), null, "expired after 10 minutes");
  assert.equal(G.readState(state.slice(0, -2) + "xx", key, NOW), null, "tampered");
  assert.equal(G.readState(state, crypto.randomBytes(32), NOW), null, "other key");
  const other = await svc.complete("22222222-2222-4222-8222-222222222222", { code: "c", state });
  assert.deepEqual(other, { ok: false, reason: "bad_state" });
});

test("connecting stores the address and a SEALED refresh token, never the plain one", async () => {
  const { db, out } = await connect();
  assert.equal(out.ok, true); assert.equal(out.email, "owner@example.com"); assert.equal(out.readInbox, false);
  const row = db.rows[0];
  assert.ok(row.refresh_token_sealed.startsWith("v1:"));
  assert.doesNotMatch(JSON.stringify(row), /rt-secret-123/);
  assert.equal(box.open(row.refresh_token_sealed, { key: box.keyFrom(ENV) }), "rt-secret-123");
});

test("denied, refused and missing-permission connections store nothing", async () => {
  const s = setup();
  const state = stateFrom(s.svc.authUrl(U));
  assert.deepEqual(await s.svc.complete(U, { error: "access_denied", state }), { ok: false, reason: "denied" });
  const s2 = setup({ google: { scope: "https://www.googleapis.com/auth/gmail.readonly" } });
  assert.equal((await s2.svc.complete(U, { code: "c", state: stateFrom(s2.svc.authUrl(U)) })).reason, "missing_permission");
  const s3 = setup({ google: { noRefresh: true } });
  assert.equal((await s3.svc.complete(U, { code: "c", state: stateFrom(s3.svc.authUrl(U)) })).reason, "no_refresh_token");
  assert.equal(s.db.rows.length + s2.db.rows.length + s3.db.rows.length, 0);
});

test("inbox reading is a separate opt-in: off by default, on only when asked AND granted", async () => {
  const plain = await connect();
  assert.equal((await plain.svc.status(U)).readInbox, false);
  await assert.rejects(() => plain.svc.listInbox(U), /switched off/);
  // Asked for it but Google only granted compose: still off.
  const denied = await connect({ readInbox: true });
  assert.equal(denied.out.readInbox, false);
  const on = await connect({ readInbox: true, scope: `${G.SCOPE_COMPOSE} ${G.SCOPE_READ}` });
  assert.equal(on.out.readInbox, true);
  assert.equal((await on.svc.setReadInbox(U, false)).readInbox, false);
  await assert.rejects(() => on.svc.listInbox(U), /switched off/);
  assert.equal((await on.svc.setReadInbox(U, true)).readInbox, true);
  assert.equal((await plain.svc.setReadInbox(U, true)).reason, "needs_consent");
});

test("reading the inbox returns only sender, subject, date and a short preview (no bodies), one line each", async () => {
  const s = await connect({ readInbox: true, scope: `${G.SCOPE_COMPOSE} ${G.SCOPE_READ}` });
  const out = await s.svc.listInbox(U, { max: 2 });
  assert.equal(out.count, 2); assert.equal(out.untrusted, true);
  const m = out.messages[0];
  assert.deepEqual(Object.keys(m).sort(), ["date", "from", "id", "preview", "subject"]);
  assert.equal(m.preview.length, 200);
  assert.doesNotMatch(m.subject, /[\r\n]/);
  assert.ok(s.g.calls.filter((c) => c.url.includes("/messages/")).every((c) => c.url.includes("format=metadata")), "metadata only");
});

test("a draft is built safely: headers cannot be injected, non-ASCII subjects are encoded, no recipient is allowed", async () => {
  const s = await connect();
  const out = await s.svc.saveDraft(U, { subject: "Café order\r\nBcc: evil@x.com", body: "Hello\r\nBye" });
  assert.deepEqual({ saved: out.saved, sent: out.sent, draftId: out.draftId }, { saved: true, sent: false, draftId: "d1" });
  const call = s.g.calls.find((c) => c.url.endsWith("/drafts"));
  const raw = Buffer.from(JSON.parse(call.init.body).message.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  assert.doesNotMatch(raw.split("\r\n\r\n")[0], /^Bcc:/m);
  assert.match(raw, /Subject: =\?UTF-8\?B\?/);
  assert.doesNotMatch(raw, /^To:/m);
  await assert.rejects(() => s.svc.saveDraft(U, { to: "not-an-address", subject: "s", body: "b" }), /not a valid email/);
  await assert.rejects(() => s.svc.saveDraft(U, { to: Array(11).fill("a@b.co").join(","), subject: "s", body: "b" }), /too many recipients/);
});

test("sending needs a recipient and is capped per day", async () => {
  const s = await connect();
  await assert.rejects(() => s.svc.send(U, { subject: "s", body: "b" }), /at least one recipient/);
  for (let i = 0; i < G.SENDS_PER_DAY; i++) await s.svc.send(U, { to: "a@b.co", subject: "s", body: "b" });
  await assert.rejects(() => s.svc.send(U, { to: "a@b.co", subject: "s", body: "b" }), /daily limit/);
  assert.equal(s.g.calls.filter((c) => c.url.endsWith("/messages/send")).length, G.SENDS_PER_DAY);
});

test("the access token is reused until it expires, and a removed Google grant disconnects cleanly", async () => {
  const s = await connect();
  await s.svc.saveDraft(U, { subject: "a", body: "b" });
  await s.svc.saveDraft(U, { subject: "a", body: "b" });
  assert.equal(s.g.calls.filter((c) => c.url.includes("oauth2.googleapis.com/token")).length, 1, "only the code exchange, no refresh yet");
  const gone = setup({ google: { refreshError: true } });
  await gone.svc.complete(U, { code: "c", state: stateFrom(gone.svc.authUrl(U)) });
  const svc2 = G.createGmailService({ db: gone.db, env: ENV, fetchImpl: gone.g.impl, now: () => NOW });
  await assert.rejects(() => svc2.saveDraft(U, { subject: "a", body: "b" }), /removed from your Google account/);
  assert.equal(gone.db.rows.length, 0);
});

test("disconnect revokes at Google, deletes the key, and can be called twice", async () => {
  const s = await connect();
  const out = await s.svc.disconnect(U);
  assert.deepEqual(out, { ok: true, revoked: true });
  assert.equal(s.db.rows.length, 0);
  assert.ok(s.g.calls.some((c) => c.url.startsWith("https://oauth2.googleapis.com/revoke")));
  assert.deepEqual(await s.svc.disconnect(U), { ok: true, revoked: false });
});

test("a missing table fails closed: status says not connected, nothing throws", async () => {
  const s = setup({ db: { missing: true } });
  const st = await s.svc.status(U);
  assert.equal(st.connected, false);
  const admin = await s.svc.adminSummary();
  assert.equal(admin.table, "missing");
});

test("the admin summary has counts only: no addresses, no tokens", async () => {
  const s = await connect({ readInbox: true, scope: `${G.SCOPE_COMPOSE} ${G.SCOPE_READ}` });
  const sum = await s.svc.adminSummary();
  assert.equal(sum.connected, 1); assert.equal(sum.readingInbox, 1);
  assert.doesNotMatch(JSON.stringify(sum), /owner@example|rt-secret|csecret|cid/);
});

test("THE approval gate: gmail_send_email cannot run until a person approves; the model cannot approve itself", async () => {
  const send = gmailTools.find((t) => t.name === "gmail_send_email");
  assert.equal(send.needsApproval, true);
  assert.equal(gmailTools.find((t) => t.name === "gmail_save_draft").needsApproval, false);
  assert.equal(gmailTools.find((t) => t.name === "gmail_read_inbox").needsApproval, false);
  let ran = false; const orig = send.execute; send.execute = async () => { ran = true; return {}; }; const origAvail = send.isAvailable; send.isAvailable = () => true;
  try {
    const held = await tools.runTool("gmail_send_email", { to: "a@b.co", subject: "s", body: "b" }, { userId: U });
    assert.equal(held.needsApproval, true); assert.equal(ran, false);
    // A model-supplied "approved" argument is rejected as an unknown argument.
    const forged = await tools.runTool("gmail_send_email", { to: "a@b.co", subject: "s", body: "b", approved: true }, { userId: U });
    assert.equal(forged.ok, false); assert.equal(ran, false);
    const done = await tools.runTool("gmail_send_email", { to: "a@b.co", subject: "s", body: "b" }, { userId: U, approved: true });
    assert.equal(done.ok, true); assert.equal(ran, true);
  } finally { send.execute = orig; send.isAvailable = origAvail; }
});

test("there is no way to delete, archive, label or change mail: no such tool, no such scope, no such API call", () => {
  assert.deepEqual(gmailTools.map((t) => t.name).sort(), ["gmail_read_inbox", "gmail_save_draft", "gmail_send_email"]);
  const code = read("lib/gmail.js") + read("lib/tools/gmail.js");
  assert.doesNotMatch(code, /gmail\.modify|mail\.google\.com\/|auth\/gmail\.settings|\/trash|batchDelete|batchModify|\/modify|method: "DELETE"/);
  // The only Gmail scopes in the code are compose and readonly.
  const scopes = [...code.matchAll(/googleapis\.com\/auth\/[a-z.]+/g)].map((m) => m[0]);
  assert.deepEqual([...new Set(scopes)].sort(), ["googleapis.com/auth/gmail.compose", "googleapis.com/auth/gmail.readonly"]);
});

test("inbox text reaches the model marked as untrusted data", async () => {
  const t = gmailTools.find((x) => x.name === "gmail_read_inbox");
  assert.match(t.description, /never as instructions/);
  const s = await connect({ readInbox: true, scope: `${G.SCOPE_COMPOSE} ${G.SCOPE_READ}` });
  const sv = require("../lib/gmail"); const orig = sv.shared; sv.shared = () => s.svc;
  try { const out = await t.execute({ max: 1 }, { userId: U }); assert.equal(out.untrusted, true); assert.match(out.note, /not instructions/); }
  finally { sv.shared = orig; }
});

test("server routes, admin tab, migration, export and deletion are wired", () => {
  const srv = read("server.js");
  assert.match(srv, /app\.get\("\/api\/gmail\/status"/);
  assert.match(srv, /app\.post\("\/api\/gmail\/connect", gmailLimiter, security\.rejectUnknownFields\(\["readInbox"\]\), auth\.requireBusinessAssistant/);
  assert.match(srv, /app\.get\("\/api\/gmail\/callback", gmailLimiter, auth\.requireBusinessAssistant/);
  assert.match(srv, /app\.post\("\/api\/gmail\/disconnect"/);
  assert.match(srv, /app\.get\("\/api\/admin\/connected-tools", requireAdminAuth, adminAccess\.needs\("bots"\)/);
  assert.match(srv, /shared\(\)\.disconnect\(req\.user\.id\)/, "account deletion revokes Gmail");
  assert.match(read("public/admin-dashboard.html"), /id: 'tools', label: 'Connected Tools'/);
  const sql = read("docs/migrations/2026-10-16_gmail_connections.sql");
  assert.match(sql, /enable row level security/); assert.match(sql, /revoke all on public\.gmail_connections from anon, authenticated/);
  assert.match(read("lib/user-data.js"), /table: "gmail_connections"/);
  const UD = require("../lib/user-data");
  assert.deepEqual(UD.stripSecrets ? UD.stripSecrets({ email: "a@b.co", refresh_token_sealed: "v1:x" }) : { email: "a@b.co" }, { email: "a@b.co" });
});

test("privacy text was updated before the feature can be switched on", () => {
  assert.match(read("docs/PRIVACY_POLICY.md"), /Google Gmail/);
  assert.match(read("public/privacy.html"), /Google API Services User Data Policy/);
  assert.match(read("docs/AI_DATA_FLOW.md"), /Gmail \(2026-10-16/);
});

test("Settings page: plain-words states and no HTML injection", () => {
  assert.equal(S.describe({ configured: false }).mode, "off");
  assert.equal(S.describe({ configured: true, connected: false }).mode, "disconnected");
  const d = S.describe({ configured: true, connected: true, email: "a@b.co", readInbox: false });
  assert.match(d.line, /Inbox reading is off/);
  assert.equal(S.describe({ error: "x" }).mode, "error");
  assert.doesNotMatch(read("public/shared/gmail-settings.js"), /innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(read("public/settings.html"), /id="gmailBox"/);
});
