"use strict";
/**
 * Admin team management (docs/ADMIN_AREA_SPEC.md section 5), on the CURRENT credential scheme (access code + password,
 * 8-hour token). The email + key flow and cookie sessions wait for the security S3 work; nothing here blocks that.
 *
 * Rules (spec section 1): a person can only create, change or revoke roles strictly BELOW their own; nobody can assign
 * "owner" through this API, and an owner row can never be touched by anyone else, so the Owner cannot be locked out.
 * Credentials are random, stored only as salted hashes and shown ONCE. Every write is audited.
 */
const crypto = require("crypto");
const { ROLES } = require("./admin-access");

const RANK = { viewer: 0, engineer: 1, team_lead: 2, admin: 3, owner: 4 };
const rank = (r) => (r in RANK ? RANK[r] : -1);

const canAssign = (actorRole, role) => role !== "owner" && rank(actorRole) > rank(role) && rank(role) >= 0;
const canManage = (actorRole, targetRole) => rank(actorRole) >= 0 && rank(actorRole) > rank(targetRole) && rank(targetRole) >= 0;
const assignableRoles = (actorRole) => ROLES.filter((r) => canAssign(actorRole, r));

const fail = (status, message) => Object.assign(new Error(message), { status });
const needReason = (reason) => {
  const r = String(reason || "").trim();
  if (r.length < 3) throw fail(400, "A short reason is required (at least 3 characters).");
  return r.slice(0, 300);
};

const newSecrets = (hashSecret) => {
  const accessCode = crypto.randomBytes(24).toString("base64url"); // 32 characters
  const password = crypto.randomBytes(12).toString("base64url"); // 16 characters
  const a = hashSecret(accessCode);
  const p = hashSecret(password);
  return { accessCode, password, cols: { access_code_hash: a.hash, access_code_salt: a.salt, password_hash: p.hash, password_salt: p.salt } };
};

/** Never selects a hash or salt. */
async function listMembers(db) {
  const { data, error } = await db.from("admin_accounts").select("id,name,role,active,created_at,last_login_at").order("created_at", { ascending: true });
  if (error) throw fail(500, error.message);
  return data || [];
}

async function getMember(db, id) {
  const { data, error } = await db.from("admin_accounts").select("id,name,role,active").eq("id", id).maybeSingle();
  if (error) throw fail(500, error.message);
  if (!data) throw fail(404, "No such team member.");
  return data;
}

async function audit(db, actor, action, target, reason, details) {
  try {
    const { error } = await db.from("admin_audit").insert({ admin_id: actor.adminId, admin_name: actor.name, role: actor.role, action, target: target || null, reason: reason || null, details: details || {} });
    if (error) console.warn("[admin-audit] insert failed:", error.message);
  } catch (err) {
    console.warn("[admin-audit] insert failed:", err.message);
  }
}

/** Create a member. Returns the credentials ONCE; only hashes are stored. */
async function createMember(db, actor, { name, role, reason }, hashSecret) {
  const why = needReason(reason);
  const n = String(name || "").trim();
  if (n.length < 2 || n.length > 60) throw fail(400, "Name must be 2 to 60 characters.");
  if (!canAssign(actor.role, role)) throw fail(403, "You can only create roles below your own.");
  const { accessCode, password, cols } = newSecrets(hashSecret);
  const { data, error } = await db.from("admin_accounts").insert({ name: n, role, active: true, ...cols }).select("id").single();
  if (error) throw fail(500, error.message);
  await audit(db, actor, "team.create", data.id, why, { name: n, role });
  return { id: data.id, name: n, role, accessCode, password, note: "Shown once. Send both by a private channel; the person should change the password after first login." };
}

async function changeRole(db, actor, id, role, reason, onChange) {
  const why = needReason(reason);
  if (id === actor.adminId) throw fail(403, "You cannot change your own role.");
  const target = await getMember(db, id);
  if (!canManage(actor.role, target.role)) throw fail(403, "You can only change roles below your own.");
  if (!canAssign(actor.role, role)) throw fail(403, "You can only assign roles below your own.");
  const { error } = await db.from("admin_accounts").update({ role }).eq("id", id);
  if (error) throw fail(500, error.message);
  if (onChange) onChange(id);
  await audit(db, actor, "team.role", id, why, { from: target.role, to: role });
  return { id, role };
}

async function setActive(db, actor, id, active, reason, onChange) {
  const why = needReason(reason);
  if (id === actor.adminId) throw fail(403, "You cannot revoke yourself.");
  const target = await getMember(db, id);
  if (!canManage(actor.role, target.role)) throw fail(403, "You can only revoke or restore roles below your own.");
  const { error } = await db.from("admin_accounts").update({ active: !!active }).eq("id", id);
  if (error) throw fail(500, error.message);
  if (onChange) onChange(id);
  await audit(db, actor, active ? "team.restore" : "team.revoke", id, why, { name: target.name, role: target.role });
  return { id, active: !!active };
}

/** New credentials; the old ones stop working at once. Shown once. */
async function regenerate(db, actor, id, reason, hashSecret, onChange) {
  const why = needReason(reason);
  if (id === actor.adminId) throw fail(403, "You cannot regenerate your own credentials.");
  const target = await getMember(db, id);
  if (!canManage(actor.role, target.role)) throw fail(403, "You can only regenerate credentials for roles below your own.");
  const { accessCode, password, cols } = newSecrets(hashSecret);
  const { error } = await db.from("admin_accounts").update(cols).eq("id", id);
  if (error) throw fail(500, error.message);
  if (onChange) onChange(id);
  await audit(db, actor, "team.regenerate", id, why, { name: target.name });
  return { id, name: target.name, accessCode, password, note: "Shown once. The old access code and password no longer work." };
}

async function recentAudit(db, limit = 50) {
  const { data, error } = await db.from("admin_audit").select("*").order("created_at", { ascending: false }).limit(Math.min(limit, 200));
  if (error) throw fail(500, error.message);
  return data || [];
}

module.exports = { RANK, canAssign, canManage, assignableRoles, listMembers, createMember, changeRole, setActive, regenerate, recentAudit, audit, needReason };
