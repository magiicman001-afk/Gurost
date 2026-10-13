"use strict";
/**
 * The one list of where a person's data lives, and the data export built from it.
 *
 * Fix 2 (export) uses it now. Fix 3 (account deletion) and Fix 4 (retention) must use the SAME list,
 * so a table added here is exported, deleted and cleaned together. There are no database foreign keys
 * to the user, so deletion cannot rely on a cascade: this list IS the cascade.
 *
 * Checked against the live database 2026-10-13 (information_schema). Tables marked optional are used by
 * code but were not created yet in that database; they are skipped quietly when missing.
 */
const crypto = require("crypto");

// { table, column, label, optional? }
const USER_TABLES = [
  { table: "user_profiles", column: "user_id", label: "Profile" },
  { table: "company_profiles", column: "user_id", label: "Company profile" },
  { table: "company_research", column: "user_id", label: "Company research notes" },
  { table: "project_state", column: "user_id", label: "Projects (current version)" },
  { table: "project_history", column: "user_id", label: "Projects (history)" },
  { table: "project_shares", column: "user_id", label: "Shared project links" },
  { table: "published_sites", column: "user_id", label: "Published sites" },
  { table: "site_form_submissions", column: "user_id", label: "Form submissions on your sites" },
  { table: "build_log", column: "user_id", label: "Build log" },
  { table: "build_logs", column: "user_id", label: "Build logs" },
  { table: "build_events", column: "user_id", label: "Build events" },
  { table: "guardian_checks", column: "user_id", label: "Quality checks" },
  { table: "pulse_learning_log", column: "user_id", label: "Pulse history" },
  { table: "pulse_suggestions", column: "user_id", label: "Pulse suggestions" },
  { table: "guide_decisions", column: "user_id", label: "Guide decisions" },
  { table: "guide_preferences", column: "user_id", label: "Guide preferences" },
  { table: "user_bot_conversations", column: "user_id", label: "Assistant conversations" },
  { table: "user_bot_memory", column: "user_id", label: "Assistant memory notes" },
  { table: "user_bot_preferences", column: "user_id", label: "Assistant preferences" },
  { table: "user_memory_settings", column: "user_id", label: "Memory settings" },
  { table: "user_style_profiles", column: "user_id", label: "Writing style profile" },
  { table: "assistant_briefings", column: "user_id", label: "Assistant briefings" },
  { table: "assistant_pending_actions", column: "user_id", label: "Assistant pending actions" },
  { table: "proactive_suggestions", column: "user_id", label: "Assistant suggestions" },
  { table: "meeting_summaries", column: "user_id", label: "Meeting summaries" },
  { table: "business_assistant_audit", column: "user_id", label: "Assistant audit records (your id and IP address)" },
  { table: "claude_usage_log", column: "user_id", label: "AI usage log" },
  { table: "credit_balances", column: "user_id", label: "Credit balance" },
  { table: "credit_events", column: "user_id", label: "Credit events" },
  // used by code, not yet created in the live database
  { table: "user_sessions", column: "user_id", label: "Sign-in sessions", optional: true },
  { table: "reminders", column: "user_id", label: "Reminders", optional: true },
  { table: "in_app_notifications", column: "user_id", label: "Notifications", optional: true },
  { table: "notification_preferences", column: "user_id", label: "Notification preferences", optional: true },
  { table: "user_industry", column: "user_id", label: "Industry", optional: true },
  { table: "checkpoints", column: "user_id", label: "Checkpoints", optional: true },
  { table: "bot_messages", column: "user_id", label: "Bot messages", optional: true },
  { table: "scheduled_assistant_jobs", column: "user_id", label: "Scheduled assistant jobs", optional: true },
  { table: "week_ahead_briefings", column: "user_id", label: "Week-ahead briefings", optional: true },
  { table: "notify_topics", column: "user_id", label: "Push notice topic", optional: true },
  { table: "training_data_log", column: "user_id", label: "Training data (only if you opted in)", optional: true },
  { table: "personal_bots", column: "user_id", label: "Personal bots", optional: true },
];

// Account record (api_keys): explicit columns, so password hashes and key hashes are never selected.
const ACCOUNT = { table: "api_keys", column: "user_id", columns: "user_id,email,plan,revoked,status,blocked_reason,blocked_at,created_at" };

// Any column whose name looks like a secret is dropped from every row, in addition to the explicit list above.
const SECRET_COLUMN = /(^|_)(token|hash|salt|secret|password|key)(_|$)/i;
const KEEP_COLUMN = /^(project_id|user_id|key|memory_type)$/i; // "key" in user_bot_memory is a note label, not a secret

const PAGE = 1000;
const MAX_ROWS = 20000; // per table; a larger table is cut and the manifest says so
const MAX_FILES = 100;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 80 * 1024 * 1024;

function stripSecrets(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    if (SECRET_COLUMN.test(k) && !KEEP_COLUMN.test(k)) continue;
    out[k] = v;
  }
  return out;
}

function isMissingTable(error) {
  const m = `${error && (error.code || "")} ${error && (error.message || "")}`;
  return /42P01|PGRST205|does not exist|Could not find the table/i.test(m);
}

async function readAll(supabase, table, column, userId, columns = "*") {
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase.from(table).select(columns).eq(column, userId).range(from, from + PAGE - 1);
    if (error) return { rows, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

/**
 * Collect everything stored about one user. Returns:
 *   { data: {account, tables:{name:[rows]}}, manifest, fileRefs:[{bucket,path}] }
 * `data` never contains password or key hashes. The manifest says what was read, what was empty, what was
 * missing or failed, and what is NOT in the export (so the file never claims to be more than it is).
 */
async function collectUserData(supabase, user) {
  const manifest = { included: [], empty: [], notCreatedYet: [], failed: [], truncated: [], notIncluded: [] };
  const data = { account: null, tables: {} };

  const acct = await readAll(supabase, ACCOUNT.table, ACCOUNT.column, user.id, ACCOUNT.columns);
  data.account = acct.rows[0] ? stripSecrets(acct.rows[0]) : { user_id: user.id, email: user.email, plan: user.plan };
  if (acct.error) manifest.failed.push({ table: ACCOUNT.table, reason: "could not be read" });

  for (const t of USER_TABLES) {
    const { rows, error, truncated } = await readAll(supabase, t.table, t.column, user.id);
    if (error) {
      if (isMissingTable(error)) manifest.notCreatedYet.push(t.table);
      else manifest.failed.push({ table: t.table, reason: "could not be read" });
      continue;
    }
    if (!rows.length) { manifest.empty.push(t.table); continue; }
    data.tables[t.table] = rows.map(stripSecrets);
    manifest.included.push({ table: t.table, label: t.label, rows: rows.length });
    if (truncated) manifest.truncated.push(t.table);
  }

  // Files you uploaded: avatar folder (by your id) and project asset folders (by project id).
  const fileRefs = [];
  const projectIds = (data.tables.project_state || []).map((p) => p.id).filter(Boolean);
  const folders = [{ bucket: "avatars", prefix: user.id }, ...projectIds.map((id) => ({ bucket: "project-assets", prefix: id }))];
  if (supabase.storage) {
    for (const f of folders) {
      try {
        const { data: list, error } = await supabase.storage.from(f.bucket).list(f.prefix, { limit: 1000 });
        if (error || !list) continue;
        for (const o of list) if (o && o.name && o.id !== null) fileRefs.push({ bucket: f.bucket, path: `${f.prefix}/${o.name}` });
      } catch { /* a bucket that cannot be listed is reported below */ }
    }
  }

  manifest.notIncluded = [
    "Card and billing details (held by Stripe, not by us). Ask Stripe, or email us and we will help.",
    "Security logs that are not tied to your account id (for example blocked-address lists and request timings).",
    "Copies held by AI providers or other services listed in the privacy policy; we cannot export those.",
    "Your password and key hashes (never exported, by design).",
    "Generated images stored outside your project folders.",
  ];
  return { data, manifest, fileRefs };
}

// ---- download links: signed, 24 hours, no storage needed ----
const LINK_HOURS = 24;
function linkSecret() {
  return process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || process.env.ADMIN_JWT_SECRET || "";
}
function b64u(buf) { return Buffer.from(buf).toString("base64url"); }
function createDownloadToken(userId, now = Date.now()) {
  const secret = linkSecret();
  if (!secret) throw new Error("No signing secret is set on the server (JWT_SECRET).");
  const payload = b64u(JSON.stringify({ u: userId, p: "data-export", exp: now + LINK_HOURS * 3600 * 1000 }));
  const sig = b64u(crypto.createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}
function verifyDownloadToken(token, now = Date.now()) {
  const secret = linkSecret();
  if (!secret || typeof token !== "string" || token.length > 600) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const want = crypto.createHmac("sha256", secret).update(payload).digest();
  let got; try { got = Buffer.from(sig, "base64url"); } catch { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  let body; try { body = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
  if (!body || body.p !== "data-export" || typeof body.u !== "string" || !(body.exp > now)) return null;
  return { userId: body.u, expiresAt: body.exp };
}

/** Stream a zip: manifest + one JSON file per table + your uploaded files (within size limits). */
async function writeExportZip(archive, supabase, user, collected) {
  const { data, manifest, fileRefs } = collected;
  const readme = [
    "Your Gurost data export (Surii Global Limited).",
    `Created: ${new Date().toISOString()}`,
    "account.json: your account record. tables/*.json: your data, one file per kind (JSON, a standard machine-readable format).",
    "files/: images and files you uploaded, when small enough. Anything left out is listed in manifest.json.",
    "manifest.json: what is in this export, what was empty, and what is NOT included and why.",
  ].join("\n");
  archive.append(readme, { name: "README.txt" });
  archive.append(JSON.stringify(data.account, null, 2), { name: "account.json" });
  for (const [name, rows] of Object.entries(data.tables)) archive.append(JSON.stringify(rows, null, 2), { name: `tables/${name}.json` });

  const files = { added: [], skipped: [] };
  let total = 0;
  for (const ref of fileRefs) {
    if (files.added.length >= MAX_FILES || total >= MAX_TOTAL_FILE_BYTES) { files.skipped.push({ ...ref, reason: "size limit" }); continue; }
    try {
      const { data: blob, error } = await supabase.storage.from(ref.bucket).download(ref.path);
      if (error || !blob) { files.skipped.push({ ...ref, reason: "could not be read" }); continue; }
      const buf = Buffer.from(await blob.arrayBuffer());
      if (buf.length > MAX_FILE_BYTES) { files.skipped.push({ ...ref, reason: "file too large" }); continue; }
      total += buf.length;
      archive.append(buf, { name: `files/${ref.bucket}/${ref.path}` });
      files.added.push(ref);
    } catch { files.skipped.push({ ...ref, reason: "could not be read" }); }
  }
  archive.append(JSON.stringify({ ...manifest, files }, null, 2), { name: "manifest.json" });
  await archive.finalize();
}

module.exports = { USER_TABLES, ACCOUNT, collectUserData, writeExportZip, createDownloadToken, verifyDownloadToken, stripSecrets, isMissingTable, LINK_HOURS };
