"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const A = require("../lib/admin-access");
const D = require("../lib/admin-data");

const root = path.join(__dirname, "..");

test("owner can do everything listed; unknown role, unknown section and missing role get nothing", () => {
  for (const s of Object.keys(A.MATRIX)) assert.ok(A.can("owner", s), s);
  assert.equal(A.can("intruder", "dashboard"), false);
  assert.equal(A.can(undefined, "dashboard"), false);
  assert.equal(A.can(null, "dashboard"), false);
  assert.equal(A.can("owner", "no-such-section"), false);
});

test("spec matrix: money, user data, ops and team follow the rules", () => {
  assert.equal(A.can("admin", "revenue"), false, "revenue hidden from Admin");
  assert.equal(A.can("viewer", "users"), false);
  assert.equal(A.can("engineer", "users"), false);
  assert.equal(A.can("team_lead", "users"), false);
  assert.equal(A.can("admin", "ops"), false);
  assert.equal(A.can("viewer", "ops"), false);
  assert.equal(A.can("viewer", "projects"), false);
  assert.equal(A.can("engineer", "models"), false);
  assert.equal(A.can("admin", "team", true), true);
  assert.equal(A.can("engineer", "team"), false);
  assert.equal(A.can("viewer", "dashboard"), true);
  assert.equal(A.can("viewer", "docs"), true);
});

test("writes need rw: read-only roles cannot change anything", () => {
  assert.equal(A.can("admin", "models", true), false);
  assert.equal(A.can("engineer", "projects", true), false);
  assert.equal(A.can("owner", "builds", true), false, "builds log is read-only for everyone");
  assert.equal(A.can("admin", "projects", true), true);
});

test("needs() middleware: 403 for no access, GET needs read, POST needs write", () => {
  const run = (role, section, method) => {
    let code = null, nexted = false;
    const res = { status(c) { code = c; return this; }, json() { return this; } };
    A.needs(section)({ admin: role ? { role } : undefined, method }, res, () => { nexted = true; });
    return { code, nexted };
  };
  assert.deepEqual(run("owner", "ops", "POST"), { code: null, nexted: true });
  assert.equal(run("admin", "ops", "GET").code, 403);
  assert.equal(run("engineer", "projects", "GET").nexted, true);
  assert.equal(run("engineer", "projects", "POST").code, 403);
  assert.equal(run(null, "dashboard", "GET").code, 403, "no role at all is denied");
});

test("dashboardFor: owner sees all, admin no revenue, engineer no money, viewer headline counts only", () => {
  const data = { buildsWeek: { value: 5 }, failedWeek: { value: 1 }, activeUsers: { value: 3 }, errorsHour: { value: 0 }, spend: { value: 2 }, revenue: { value: null } };
  assert.deepEqual(Object.keys(A.dashboardFor("owner", data)).sort(), Object.keys(data).sort());
  assert.ok(!("revenue" in A.dashboardFor("admin", data)));
  assert.ok("spend" in A.dashboardFor("admin", data));
  const eng = A.dashboardFor("engineer", data);
  assert.ok(!("spend" in eng) && !("revenue" in eng) && !("activeUsers" in eng));
  const viewer = A.dashboardFor("viewer", data);
  assert.deepEqual(Object.keys(viewer).sort(), ["activeUsers", "buildsWeek"]);
  assert.deepEqual(A.dashboardFor("nobody", data), {});
});

test("server: every /api/admin route uses requireAdminAuth plus a section guard (except /me)", () => {
  const src = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const lines = src.split("\n").filter((l) => /app\.(get|post|put|delete)\("\/api\/admin\//.test(l) && l.includes("requireAdminAuth"));
  assert.ok(lines.length >= 15);
  for (const l of lines) {
    if (l.includes('"/api/admin/me"')) continue;
    assert.ok(l.includes("adminAccess.needs("), "unguarded admin route: " + l.trim());
  }
});

test("server: login never turns a missing role into owner; the role is re-read from the database", () => {
  const src = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(src, /adminAccess\.ROLES\.includes\(matched\.role\) \? matched\.role : "viewer"/);
  assert.match(src, /from\("admin_accounts"\)\.select\("role,active"\)/);
});

test("migration: existing admins become owner, new rows default to viewer, nothing dropped", () => {
  const sql = fs.readFileSync(path.join(root, "docs/migrations/2026-10-12_admin_roles.sql"), "utf8");
  assert.match(sql, /update public\.admin_accounts set role = 'owner' where role is null/);
  assert.match(sql, /set default 'viewer'/);
  assert.doesNotMatch(sql.split("-- ROLLBACK")[0], /drop table|drop column|delete from|truncate/i);
});

test("modelsStatus shows set / not set only, never a key value", () => {
  const env = { OPENROUTER_API_KEY: "sk-secret-123", FAL_KEY: "fal-secret", SUPABASE_URL: "https://x", SUPABASE_SERVICE_KEY: "svc-secret" };
  const out = D.modelsStatus(env, "owner");
  const text = JSON.stringify(out);
  for (const v of Object.values(env)) assert.ok(!text.includes(v), "leaked " + v);
  const by = Object.fromEntries(out.providers.map((p) => [p.name.split(" ")[0], p.configured]));
  assert.equal(by.OpenRouter, true);
  assert.equal(by["fal.ai"], true);
  assert.equal(by.Gemini, false);
  assert.equal(by.Supabase, true);
  assert.equal(by.LiveKit, false);
  assert.ok(out.providers.every((p) => p.balance === "Not connected"));
});

test("inventory reports flags and the Render commit", () => {
  const inv = D.inventory({ RENDER_GIT_COMMIT: "abcdef1234567", PREMIUM_PIPELINE: "1" }, 0);
  assert.equal(inv.version, "abcdef1");
  const wb = inv.products.find((p) => p.name === "Website Builder");
  assert.deepEqual(wb.flags.map((f) => [f.name, f.on]), [["SECTION_LIBRARY", false], ["PREMIUM_PIPELINE", true], ["DESIGN_MEMORY", false]]);
  assert.equal(D.inventory({}, 0).version, "unknown");
});

function fakeDb(tables = {}) {
  const inserted = [];
  const q = (name) => {
    const st = { rows: tables[name] || [], gte: null, eq: [] };
    const api = {
      select: () => api,
      order: () => api,
      limit: () => api,
      gte: () => api,
      eq: () => api,
      insert: (row) => { inserted.push([name, row]); return Promise.resolve({ error: null }); },
      then: (res, rej) => Promise.resolve({ data: st.rows, error: tables[name + ":error"] || null }).then(res, rej),
    };
    return api;
  };
  return { from: q, inserted };
}

test("recordBuildLog saves a compact row and never throws", () => {
  const db = fakeDb();
  D.recordBuildLog(db, { projectId: "p1", userId: 7, status: "ok", variants: [{ premium: { score: 91 } }, { premium: { score: 78 } }, {}], seconds: 41.234 });
  assert.deepEqual(db.inserted[0][1], { project_id: "p1", user_id: "7", kind: "website", status: "ok", error: null, designs: 3, best_score: 91, seconds: 41.2 });
  D.recordBuildLog(db, { projectId: "p2", status: "failed", error: "x".repeat(900) });
  assert.equal(db.inserted[1][1].error.length, 500);
  assert.doesNotThrow(() => D.recordBuildLog(null, { status: "ok" }));
  assert.doesNotThrow(() => D.recordBuildLog({ from() { throw new Error("boom"); } }, { status: "ok" }));
});

test("dashboardData: counts from the log; revenue says Not connected; a failed source says Not available, not zero", async () => {
  const now = new Date().toISOString();
  const db = fakeDb({
    build_log: [{ status: "ok", user_id: "a" }, { status: "failed", user_id: "a" }, { status: "ok", user_id: "b" }],
    request_timings: [{ status_code: 500 }, { status_code: 200 }],
    claude_usage_log: [{ cost: "1.5" }, { cost: "0.25" }],
  });
  const d = await D.dashboardData(db);
  assert.equal(d.buildsWeek.value, 3);
  assert.equal(d.failedWeek.value, 1);
  assert.equal(d.activeUsers.value, 2);
  assert.equal(d.errorsHour.value, 1);
  assert.equal(d.spend.value, 1.75);
  assert.equal(d.revenue.value, null);
  assert.match(d.revenue.note, /Not connected/);
  const bad = await D.dashboardData(fakeDb({ "claude_usage_log:error": { message: "down" }, build_log: [], request_timings: [] }));
  assert.equal(bad.spend.value, null);
  assert.match(bad.spend.note, /Not available/);
});

test("buildsLog summarises the week", async () => {
  const recent = new Date().toISOString();
  const old = new Date(Date.now() - 30 * 86400000).toISOString();
  const db = fakeDb({ build_log: [{ status: "ok", created_at: recent }, { status: "failed", created_at: recent }, { status: "ok", created_at: old }] });
  const out = await D.buildsLog(db);
  assert.deepEqual(out.week, { total: 2, failed: 1 });
  assert.equal(out.builds.length, 3);
});

test("admin page escapes values and builds tabs from the server's section list", () => {
  const html = fs.readFileSync(path.join(root, "public/admin-dashboard.html"), "utf8");
  assert.match(html, /me\.sections\.includes\(t\.section\)/);
  assert.match(html, /escapeHtml\(p\.name \|\| p\.id\)/);
});

test("Phase 1.5: no /api/admin route uses the old user-login admin check; moved routes carry the right sections", () => {
  const src = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.doesNotMatch(src, /app\.(get|post|put|delete)\("\/api\/admin\/[^"]*", auth\.requireAdmin/);
  const want = [
    ["get", "/api/admin/snapshot", "revenue"], ["get", "/api/admin/workspaces", "users"], ["get", "/api/admin/workspaces/:id", "users"],
    ["get", "/api/admin/company/:id/usage", "users"], ["post", "/api/admin/developers", "team"], ["get", "/api/admin/developers", "team"],
    ["put", "/api/admin/developers/:id", "team"], ["post", "/api/admin/users/:userId/deactivate", "users"], ["post", "/api/admin/users/:userId/reactivate", "users"],
  ];
  for (const [m, p, sec] of want) assert.ok(src.includes(`app.${m}("${p}", requireAdminAuth, adminAccess.needs("${sec}")`), `${m} ${p} -> ${sec}`);
  // the admin block (admin-token routes) must come before the user login wall, or the admin token would be refused
  assert.ok(src.indexOf('app.get("/api/admin/snapshot"') < src.indexOf('\napp.use("/api", auth.requireAuth);'));
  assert.doesNotMatch(src, /req\.user\.id[^\n]*addDeveloper|addDeveloper\([^)]*req\.user/);
});
