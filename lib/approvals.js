/**
 * Approval gates. A tool marked needsApproval never runs when the model asks:
 * the request is parked here, shown to the user as [Approve] [Edit] [Cancel],
 * and runs only when the user decides, through an authenticated route. The
 * model cannot approve anything itself (tool arguments cannot carry the flag).
 *
 * Every function takes the Supabase client first so tests can pass a stub.
 * Approving claims the action atomically (pending -> approved), so a double
 * click or a second device can never run it twice.
 */
const crypto = require("crypto");

const TTL_MS = 30 * 60 * 1000;
const MAX_PENDING_PER_USER = 20;
const TABLE = "assistant_pending_actions";

const cut = (s, n) => String(s == null ? "" : s).slice(0, n);

/** The fields the card shows (and lets the user edit), taken from the tool's own schema. */
function fieldsFor(tool, args) {
  const props = (tool.parameters && tool.parameters.properties) || {};
  return Object.entries(props).map(([name, spec]) => {
    const value = args[name] === undefined ? "" : args[name];
    return { name, type: spec.type || "string", description: cut(spec.description, 200), long: spec.type === "string" && (String(value).length > 80 || /body|text|message|description|notes/i.test(name)), value };
  });
}

function summaryFor(tool, args) {
  try { if (typeof tool.describe === "function") return cut(tool.describe(args), 200); } catch (e) { /* fall through */ }
  return `Run ${tool.name.replace(/_/g, " ")}`;
}

/** What the page needs to draw one card. */
function toCard(row, tool) {
  return { id: row.id, tool: row.tool, bot: row.bot_type, summary: row.summary, fields: tool ? fieldsFor(tool, row.args || {}) : [], expiresAt: row.expires_at };
}

async function pendingRows(db, userId, botType) {
  let q = db.from(TABLE).select("id, bot_type, tool, args, summary, status, expires_at").eq("user_id", userId).eq("status", "pending");
  if (botType) q = q.eq("bot_type", botType);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).filter((r) => new Date(r.expires_at).getTime() > Date.now());
}

/** Park a request and return the card for it. */
async function create(db, { userId, botType, tool, args, now = Date.now }) {
  if ((await pendingRows(db, userId)).length >= MAX_PENDING_PER_USER) throw new Error("There are too many actions waiting. Approve or cancel some first.");
  const row = { id: crypto.randomUUID(), user_id: userId, bot_type: botType, tool: tool.name, args, summary: summaryFor(tool, args), status: "pending", expires_at: new Date(now() + TTL_MS).toISOString() };
  const { error } = await db.from(TABLE).insert(row);
  if (error) throw new Error(error.message);
  return toCard(row, tool);
}

async function list(db, userId, botType, findTool) {
  return (await pendingRows(db, userId, botType)).map((r) => toCard(r, findTool(r.tool)));
}

async function load(db, userId, id) {
  const { data, error } = await db.from(TABLE).select("id, bot_type, tool, args, summary, status, expires_at").eq("user_id", userId).eq("id", id);
  if (error) throw new Error(error.message);
  return data && data[0];
}

/**
 * Approve (optionally with the user's edited arguments) and run. Returns { status, body }.
 * `run(toolName, args)` is the tool runner, already holding the user's context and approved flag.
 */
async function approve(db, userId, id, { editedArgs, run }) {
  const row = await load(db, userId, id);
  if (!row) return { status: 404, body: { error: "That action was not found." } };
  if (row.status !== "pending") return { status: 409, body: { error: "That action has already been decided." } };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.from(TABLE).update({ status: "expired", decided_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).eq("status", "pending");
    return { status: 410, body: { error: "That action has expired. Ask again if you still want it." } };
  }
  const args = editedArgs && typeof editedArgs === "object" && !Array.isArray(editedArgs) ? editedArgs : row.args;

  // Claim it first: only one caller can move pending -> approved.
  const { data: claimed, error } = await db.from(TABLE).update({ status: "approved", args, decided_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).eq("status", "pending").select("id");
  if (error) throw new Error(error.message);
  if (!claimed || !claimed.length) return { status: 409, body: { error: "That action has already been decided." } };

  const meta = { tool: row.tool, botType: row.bot_type };
  const outcome = await run(row.tool, args, row);
  await db.from(TABLE).update({ status: outcome.ok ? "done" : "failed", result: outcome.ok ? outcome.result : { error: outcome.error } }).eq("id", id).eq("user_id", userId);
  return outcome.ok ? { status: 200, body: { ok: true, result: outcome.result }, meta, args } : { status: 422, body: { ok: false, error: outcome.error }, meta, args };
}

async function cancel(db, userId, id) {
  const row = await load(db, userId, id);
  if (!row) return { status: 404, body: { error: "That action was not found." } };
  const { data, error } = await db.from(TABLE).update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId).eq("status", "pending").select("id");
  if (error) throw new Error(error.message);
  if (!data || !data.length) return { status: 409, body: { error: "That action has already been decided." } };
  return { status: 200, body: { ok: true }, meta: { tool: row.tool, botType: row.bot_type } };
}

module.exports = { TTL_MS, MAX_PENDING_PER_USER, fieldsFor, summaryFor, create, list, approve, cancel };
