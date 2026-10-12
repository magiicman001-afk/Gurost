// Run: node --test test/user-sessions-migration.test.js
// S3b: the user_sessions table behind cookie login. Checked once on a real
// Postgres (PGlite 0.5.9, 2026-10-12): runs twice cleanly, anon gets
// "permission denied", expires_at is required, the rollback drops it.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const sql = fs.readFileSync(path.join(__dirname, "..", "docs", "migrations", "2026-10-12_user_sessions.sql"), "utf8");
const body = sql.split("-- ROLLBACK")[0];
const table = body.slice(body.indexOf("create table"), body.indexOf(");") + 2);

test("has every column the session code needs", () => {
  for (const col of ["id uuid primary key", "user_id text not null", "refresh_token text not null", "token_version integer not null default 1",
    "created_at timestamptz not null", "expires_at timestamptz not null", "last_used_at timestamptz not null", "revoked boolean not null default false"]) {
    assert.ok(table.replace(/\s+/g, " ").includes(col), col);
  }
});

test("server only: RLS on, no policies, browser roles have no grants", () => {
  assert.match(body, /alter table public\.user_sessions enable row level security;/);
  assert.match(body, /revoke all on public\.user_sessions from anon, authenticated;/);
  assert.doesNotMatch(body, /create policy|grant /i);
});

test("safe to re-run, additive only, with a written rollback", () => {
  assert.match(body, /create table if not exists/);
  assert.doesNotMatch(body, /drop table|drop column|delete from|truncate|alter table public\.(?!user_sessions)/i);
  assert.match(sql, /-- ROLLBACK: drop table public\.user_sessions;/);
});

test("the refresh token column holds a hash, never the cookie (says so where people will look)", () => {
  assert.match(table, /refresh_token text not null,\s*-- sha256 hex/);
});
