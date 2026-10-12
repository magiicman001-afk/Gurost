"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const T = require("../lib/admin-team");
const D = require("../lib/admin-data");

const hashSecret = (secret, salt) => { const s = salt || crypto.randomBytes(8).toString("hex"); return { hash: crypto.scryptSync(secret, s, 16).toString("hex"), salt: s }; };

/** A tiny in-memory Supabase: just what admin-team uses. */
function fakeDb(seed = {}) {
  const tables = { admin_accounts: [...(seed.admin_accounts || [])], admin_audit: [] };
  let n = 100;
  const from = (name) => {
    const st = { filters: [], op: "select", payload: null, cols: null };
    const rows = () => tables[name].filter((r) => st.filters.every(([k, v]) => r[k] === v));
    const run = () => {
      if (st.op === "insert") { const row = { id: `id${++n}`, created_at: new Date().toISOString(), ...st.payload }; tables[name].push(row); return { data: row, error: null }; }
      if (st.op === "update") { rows().forEach((r) => Object.assign(r, st.payload)); return { data: null, error: null }; }
      return { data: rows(), error: null };
    };
    const api = {
      select: (cols) => { if (st.op === "select") st.cols = cols; return api; },
      insert: (p) => { st.op = "insert"; st.payload = p; return api; },
      update: (p) => { st.op = "update"; st.payload = p; return api; },
      eq: (k, v) => { st.filters.push([k, v]); return api; },
      order: () => api, limit: () => api,
      single: () => Promise.resolve(run()),
      maybeSingle: () => Promise.resolve({ data: rows()[0] ? { ...rows()[0] } : null, error: null }),
      then: (res, rej) => Promise.resolve(run()).then(res, rej),
    };
    return api;
  };
  return { from, tables };
}
const OWNER = { adminId: "o1", name: "Irfan", role: "owner" };
const ADMIN = { adminId: "a1", name: "Ann", role: "admin" };
const seed = () => fakeDb({ admin_accounts: [
  { id: "o1", name: "Irfan", role: "owner", active: true },
  { id: "a1", name: "Ann", role: "admin", active: true },
  { id: "e1", name: "Eve", role: "engineer", active: true },
  { id: "v1", name: "Vic", role: "viewer", active: true },
] });

test("role rules: strictly below your own, nobody assigns owner, unknown roles are refused", () => {
  assert.deepEqual(T.assignableRoles("owner"), ["admin", "team_lead", "engineer", "viewer"]);
  assert.deepEqual(T.assignableRoles("admin"), ["team_lead", "engineer", "viewer"]);
  assert.deepEqual(T.assignableRoles("viewer"), []);
  assert.deepEqual(T.assignableRoles("nobody"), []);
  assert.equal(T.canAssign("admin", "admin"), false);
  assert.equal(T.canAssign("owner", "owner"), false);
  assert.equal(T.canManage("admin", "owner"), false, "the owner can never be touched by an admin");
  assert.equal(T.canManage("owner", "owner"), false);
  assert.equal(T.canManage("owner", "admin"), true);
  assert.equal(T.canManage("engineer", "weird"), false);
});

test("create: credentials are random, shown once, stored only as hashes; audited", async () => {
  const db = seed();
  const r = await T.createMember(db, OWNER, { name: "Sam", role: "engineer", reason: "new hire" }, hashSecret);
  assert.equal(r.accessCode.length, 32);
  assert.ok(r.password.length >= 16);
  const row = db.tables.admin_accounts.find((x) => x.id === r.id);
  assert.equal(row.role, "engineer");
  assert.ok(!JSON.stringify(row).includes(r.accessCode) && !JSON.stringify(row).includes(r.password), "no plain secret stored");
  assert.equal(hashSecret(r.accessCode, row.access_code_salt).hash, row.access_code_hash, "the shown code verifies against the stored hash");
  assert.equal(db.tables.admin_audit[0].action, "team.create");
  assert.ok(!JSON.stringify(db.tables.admin_audit).includes(r.accessCode), "the audit never holds a secret");
  const r2 = await T.createMember(db, OWNER, { name: "Tom", role: "engineer", reason: "x y z" }, hashSecret);
  assert.notEqual(r.accessCode, r2.accessCode);
});

test("create: refused above or at your own role, without a reason, or with a bad name", async () => {
  const db = seed();
  await assert.rejects(T.createMember(db, ADMIN, { name: "Boss", role: "admin", reason: "because" }, hashSecret), /below your own/);
  await assert.rejects(T.createMember(db, ADMIN, { name: "Boss", role: "owner", reason: "because" }, hashSecret), /below your own/);
  await assert.rejects(T.createMember(db, OWNER, { name: "Another", role: "owner", reason: "because" }, hashSecret), /below your own/);
  await assert.rejects(T.createMember(db, OWNER, { name: "Sam", role: "viewer", reason: "" }, hashSecret), /reason/);
  await assert.rejects(T.createMember(db, OWNER, { name: "S", role: "viewer", reason: "okay" }, hashSecret), /Name/);
  assert.equal(db.tables.admin_accounts.length, 4);
});

test("lockout protection: an admin cannot demote, revoke or regenerate the owner; nobody acts on themselves", async () => {
  const db = seed();
  await assert.rejects(T.changeRole(db, ADMIN, "o1", "viewer", "demote him"), /below your own/);
  await assert.rejects(T.setActive(db, ADMIN, "o1", false, "revoke him"), /below your own/);
  await assert.rejects(T.regenerate(db, ADMIN, "o1", "reset him", hashSecret), /below your own/);
  await assert.rejects(T.setActive(db, OWNER, "o1", false, "revoke myself"), /yourself/);
  await assert.rejects(T.changeRole(db, OWNER, "o1", "viewer", "demote myself"), /own role/);
  await assert.rejects(T.regenerate(db, OWNER, "o1", "reset myself", hashSecret), /your own/);
  assert.equal(db.tables.admin_accounts[0].role, "owner");
  assert.equal(db.tables.admin_accounts[0].active, true);
  assert.equal(db.tables.admin_audit.length, 0, "refused actions change and record nothing");
});

test("role change, revoke, restore: applied, audited, and the role cache is told", async () => {
  const db = seed();
  const forgotten = [];
  await T.changeRole(db, ADMIN, "e1", "team_lead", "promoted", (id) => forgotten.push(id));
  assert.equal(db.tables.admin_accounts.find((x) => x.id === "e1").role, "team_lead");
  await assert.rejects(T.changeRole(db, ADMIN, "e1", "admin", "too high"), /below your own/);
  await T.setActive(db, ADMIN, "v1", false, "left the team", (id) => forgotten.push(id));
  assert.equal(db.tables.admin_accounts.find((x) => x.id === "v1").active, false);
  await T.setActive(db, ADMIN, "v1", true, "came back", (id) => forgotten.push(id));
  assert.equal(db.tables.admin_accounts.find((x) => x.id === "v1").active, true);
  assert.deepEqual(forgotten, ["e1", "v1", "v1"]);
  assert.deepEqual(db.tables.admin_audit.map((a) => a.action), ["team.role", "team.revoke", "team.restore"]);
  assert.deepEqual(db.tables.admin_audit[0].details, { from: "engineer", to: "team_lead" });
  await assert.rejects(T.setActive(db, ADMIN, "nope", false, "missing one"), /No such/);
});

test("regenerate: the old credentials stop working, the new ones are shown once", async () => {
  const db = seed();
  db.tables.admin_accounts.find((x) => x.id === "e1").access_code_hash = "old";
  const r = await T.regenerate(db, OWNER, "e1", "lost them", hashSecret);
  const row = db.tables.admin_accounts.find((x) => x.id === "e1");
  assert.notEqual(row.access_code_hash, "old");
  assert.equal(hashSecret(r.password, row.password_salt).hash, row.password_hash);
  assert.equal(db.tables.admin_audit[0].action, "team.regenerate");
});

test("a failing audit insert never blocks the action", async () => {
  const db = seed();
  const real = db.from;
  db.from = (name) => (name === "admin_audit" ? { insert: () => { throw new Error("audit down"); } } : real(name));
  const w = console.warn; console.warn = () => {};
  try { await T.setActive(db, ADMIN, "v1", false, "still works"); } finally { console.warn = w; }
  assert.equal(db.tables.admin_accounts.find((x) => x.id === "v1").active, false);
});

test("listMembers never selects hashes or salts", async () => {
  let asked = null;
  const db = { from: () => ({ select: (c) => { asked = c; return { order: () => Promise.resolve({ data: [], error: null }) }; } }) };
  await T.listMembers(db);
  assert.doesNotMatch(asked, /hash|salt/);
});

test("securityStatus is honest: unbuilt layers say so, CSP mode follows the flag, accounts are counted", async () => {
  const members = [{ name: "I", role: "owner", active: true, last_login_at: "x" }, { name: "E", role: "engineer", active: true, last_login_at: null }, { name: "V", role: "viewer", active: false }];
  const off = await D.securityStatus(null, {}, members);
  const on = await D.securityStatus(null, { CSP_ENFORCE: "1" }, members);
  assert.match(off.layers.find((l) => l.name.startsWith("Content")).state, /report-only/);
  assert.equal(on.layers.find((l) => l.name.startsWith("Content")).state, "enforced");
  assert.match(off.layers.find((l) => l.name.startsWith("Two-factor")).state, /not built/);
  assert.deepEqual(off.accounts, { active: 2, revoked: 1, byRole: { owner: 1, engineer: 1 } });
  assert.deepEqual(off.neverLoggedIn, ["E"]);
});

test("server wiring: team routes guarded by the team section, security by security, cache cleared on change", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  for (const r of ['app.get("/api/admin/team"', 'app.post("/api/admin/team"', 'app.post("/api/admin/team/:id/role"', 'app.post("/api/admin/team/:id/active"', 'app.post("/api/admin/team/:id/regenerate"']) {
    assert.ok(src.includes(`${r}, requireAdminAuth, adminAccess.needs("team")`), r);
  }
  assert.ok(src.includes('app.get("/api/admin/security", requireAdminAuth, adminAccess.needs("security")'));
  assert.match(src, /const forgetAdminRole = \(id\) => adminRoleCache\.delete\(id\)/);
});
