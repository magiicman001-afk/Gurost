/**
 * Audit trail for the Business Assistant. record() NEVER throws and never
 * waits for anything the user is waiting on: a logging problem must not break
 * a chat, a tool call or an approval.
 *
 * What is kept: who, which bot, what happened (chat, tool call, approval,
 * memory change, error), a trimmed input and output, which model was asked for
 * and which one answered (when OpenRouter says), the approval decision, time
 * and IP. What is not: passwords, keys, card numbers and similar secrets are
 * masked; message bodies are replaced by their length; chat text is not kept.
 */
const TABLE = "business_assistant_audit";
const EVENTS = ["chat", "tool_call", "approval", "memory", "error"];
const MAX_FIELD = 300;

// Same kinds of secret the memory filter refuses (lib/memory-extract.js), plus key-shaped strings.
const SECRET_WORDS = /\b(password|passcode|passwd|secret|api[ _-]?key|token|authorization|sort[ -]?code|iban|account number|national insurance|ssn|pin)(["'\s:=]+)([^\s,;"'}]+)/gi;
const CARD = /(?:\d[ -]?){13,19}/g;
const KEYLIKE = /\b(?:sk|pk|rk|gh[pousr]|xox[abp]|eyJ)[A-Za-z0-9_\-.]{16,}\b|\b[A-Za-z0-9+/_-]{40,}\b/g;
const BODY_FIELDS = /^(body|text|content|message|description|notes|html)$/i;

function redact(text) {
  return String(text == null ? "" : text)
    .replace(/\bBearer\s+\S+/gi, "Bearer [hidden]")
    .replace(SECRET_WORDS, (_m, word, sep) => `${word}${sep}[hidden]`)
    .replace(CARD, "[number hidden]")
    .replace(KEYLIKE, "[key hidden]");
}

const trim = (s, n = MAX_FIELD) => { const t = redact(s); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

/** Tool arguments as a short, safe line: long free-text fields become "[N chars]". */
function summarizeArgs(args) {
  if (args === undefined || args === null) return "";
  if (typeof args !== "object") return trim(args);
  const safe = {};
  for (const [k, v] of Object.entries(args)) {
    safe[k] = BODY_FIELDS.test(k) && typeof v === "string" ? `[${v.length} chars]` : typeof v === "string" ? v.slice(0, 120) : v;
  }
  let json; try { json = JSON.stringify(safe); } catch (e) { json = "[unreadable]"; }
  return trim(json);
}

/** A tool result as a short, safe line. Drafts (email, event) are only named, never copied. */
function summarizeResult(result) {
  if (result === undefined || result === null) return "";
  if (typeof result === "object" && result.type) return `${result.type} prepared`;
  if (typeof result === "object") return summarizeArgs(result);
  return trim(result);
}

const asList = (m) => (Array.isArray(m) ? m.join(",") : m == null ? null : String(m));

/** Build the row (pure, so it can be tested without a database). */
function toRow(ev) {
  return {
    user_id: String(ev.userId),
    bot_type: ev.botType ? String(ev.botType).slice(0, 40) : null,
    event: EVENTS.includes(ev.event) ? ev.event : "error",
    tool_used: ev.tool ? String(ev.tool).slice(0, 60) : null,
    ok: typeof ev.ok === "boolean" ? ev.ok : null,
    input: ev.input == null ? null : typeof ev.input === "object" ? summarizeArgs(ev.input) : trim(ev.input),
    output: ev.output == null ? null : typeof ev.output === "object" ? summarizeResult(ev.output) : trim(ev.output),
    model_requested: ev.modelRequested ? String(asList(ev.modelRequested)).slice(0, 300) : null,
    model_used: ev.modelUsed ? String(ev.modelUsed).slice(0, 120) : null,
    approved_by_user: typeof ev.approved === "boolean" ? ev.approved : null,
    approved_at: typeof ev.approved === "boolean" ? new Date().toISOString() : null,
    ip_address: ev.ip ? String(ev.ip).slice(0, 64) : null
  };
}

async function record(db, ev) {
  try {
    if (!db || !ev || !ev.userId) return false;
    const { error } = await db.from(TABLE).insert(toRow(ev));
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("[audit] could not record:", err.message);
    return false;
  }
}

/** Newest first. Filters are all optional. */
async function list(db, { userId, botType, event, limit = 50, before } = {}) {
  let q = db.from(TABLE).select("id, user_id, bot_type, event, tool_used, ok, input, output, model_requested, model_used, approved_by_user, approved_at, created_at, ip_address");
  if (userId) q = q.eq("user_id", String(userId));
  if (botType) q = q.eq("bot_type", String(botType));
  if (event && EVENTS.includes(event)) q = q.eq("event", event);
  if (before) q = q.lt("created_at", String(before));
  q = q.order("created_at", { ascending: false }).limit(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = { TABLE, EVENTS, redact, summarizeArgs, summarizeResult, toRow, record, list };
