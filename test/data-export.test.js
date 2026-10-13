"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { PassThrough } = require("node:stream");
const ud = require("../lib/user-data");

process.env.JWT_SECRET = "test-signing-secret"; // secret-scan-ok: fake test value

// A tiny fake of the Supabase calls we use: from(t).select(cols).eq(col,id).range(a,b), storage list/download.
function fakeDb(tables, files = {}) {
  return {
    from(table) {
      return {
        select() { return this; },
        eq(col, id) { this._f = { col, id }; return this; },
        range(a, b) {
          if (!(table in tables)) return Promise.resolve({ data: null, error: { code: "42P01", message: `relation "${table}" does not exist` } });
          if (tables[table] === "boom") return Promise.resolve({ data: null, error: { code: "XX000", message: "internal" } });
          const rows = tables[table].filter((r) => r[this._f.col] === this._f.id);
          return Promise.resolve({ data: rows.slice(a, b + 1), error: null });
        },
      };
    },
    storage: {
      from(bucket) {
        return {
          list: async (prefix) => ({ data: Object.keys(files).filter((k) => k.startsWith(`${bucket}/${prefix}/`)).map((k) => ({ id: "x", name: k.split("/").pop() })), error: null }),
          download: async (path) => ({ data: { arrayBuffer: async () => Buffer.from(files[`${bucket}/${path}`]) }, error: null }),
        };
      },
    },
  };
}

test("every registered table is exported, secrets are stripped, missing and failed tables are reported", async () => {
  const db = fakeDb({
    api_keys: [{ user_id: "u1", email: "a@b.c", plan: "pro", key_hash: "SECRET", password_hash: "SECRET", password_salt: "SECRET", created_at: "t" }],
    user_profiles: [{ user_id: "u1", display_name: "Ann", stripe_customer_id: "cus_1" }],
    project_state: [{ id: "p1", user_id: "u1", name: "Cafe", context: { html: "<p>x</p>" } }, { id: "p2", user_id: "u2", name: "Other" }],
    pulse_learning_log: [{ user_id: "u1", prompt: "make it blue" }],
    user_bot_memory: [{ user_id: "u1", key: "company", value: "Cafe Ltd" }],
    user_bot_conversations: [{ user_id: "u1", role: "user", content: "hi" }],
    site_form_submissions: [{ user_id: "u1", fields: { name: "Visitor" } }],
    credit_events: "boom",
  });
  const { data, manifest } = await ud.collectUserData(db, { id: "u1", email: "a@b.c", plan: "pro" });
  const text = JSON.stringify(data);
  assert.ok(!text.includes("SECRET"), "no password or key hashes");
  assert.deepStrictEqual(Object.keys(data.account).sort(), ["created_at", "email", "plan", "user_id"]);
  for (const t of ["user_profiles", "project_state", "pulse_learning_log", "user_bot_memory", "user_bot_conversations", "site_form_submissions"]) assert.ok(data.tables[t], `${t} exported`);
  assert.strictEqual(data.tables.project_state.length, 1, "only this user's projects");
  assert.strictEqual(data.tables.user_bot_memory[0].key, "company", "the note label column 'key' is kept");
  assert.ok(manifest.failed.some((f) => f.table === "credit_events"), "a failing table is reported, not hidden");
  assert.ok(manifest.notCreatedYet.includes("user_sessions"), "a missing table is reported");
  assert.ok(manifest.notIncluded.length > 0, "the manifest says what is not included");
});

test("every table in the list exists in the manifest paths exactly once and names are unique", () => {
  const names = ud.USER_TABLES.map((t) => t.table);
  assert.strictEqual(new Set(names).size, names.length);
  assert.ok(names.includes("user_bot_conversations") && names.includes("pulse_learning_log") && names.includes("project_state") && names.includes("site_form_submissions"));
});

let archiver = null;
try { archiver = require("archiver"); } catch { /* not installed in the Web Claude sandbox; GitHub CI has it */ }

test("export entries: account, one file per table, uploaded files and a manifest (no zip library needed)", async () => {
  const db = fakeDb(
    { user_profiles: [{ user_id: "u1", display_name: "Ann" }], project_state: [{ id: "p1", user_id: "u1", name: "Cafe" }] },
    { "project-assets/p1/logo.png": "PNGDATA", "avatars/u1/me.png": "AVATAR" }
  );
  const user = { id: "u1", email: "a@b.c", plan: "pro" };
  const names = [];
  const fake = { append: (_c, o) => names.push(o.name), finalize: async () => {} };
  await ud.writeExportZip(fake, db, user, await ud.collectUserData(db, user));
  for (const n of ["README.txt", "account.json", "tables/user_profiles.json", "tables/project_state.json", "files/project-assets/p1/logo.png", "files/avatars/u1/me.png", "manifest.json"]) assert.ok(names.includes(n), `has ${n}`);
});

test("a real zip is produced", { skip: !archiver }, async () => {
  const db = fakeDb(
    { user_profiles: [{ user_id: "u1", display_name: "Ann" }], project_state: [{ id: "p1", user_id: "u1", name: "Cafe" }] },
    { "project-assets/p1/logo.png": "PNGDATA", "avatars/u1/me.png": "AVATAR" }
  );
  const user = { id: "u1", email: "a@b.c", plan: "pro" };
  const collected = await ud.collectUserData(db, user);
  const chunks = [];
  const sink = new PassThrough();
  sink.on("data", (c) => chunks.push(c));
  const archive = archiver("zip");
  // Listen for the end BEFORE writing: archiver can finish (and the sink emit "end") while
  // writeExportZip is still awaiting finalize(), and a listener added afterwards never fires,
  // which left this promise pending and took the next two tests down with it on CI.
  const ended = new Promise((resolve, reject) => { sink.on("end", resolve); sink.on("error", reject); archive.on("error", reject); });
  archive.pipe(sink);
  await Promise.all([ud.writeExportZip(archive, db, user, collected), ended]);
  const zip = Buffer.concat(chunks);
  assert.strictEqual(zip.slice(0, 2).toString(), "PK");
  const raw = zip.toString("latin1"); // file names sit uncompressed in zip headers
  for (const n of ["README.txt", "account.json", "tables/user_profiles.json", "tables/project_state.json", "files/project-assets/p1/logo.png", "files/avatars/u1/me.png", "manifest.json"]) assert.ok(raw.includes(n), `zip has ${n}`);
});

test("download links: valid, tampered, wrong-secret and expired", () => {
  const now = Date.now();
  const tok = ud.createDownloadToken("u1", now);
  assert.strictEqual(ud.verifyDownloadToken(tok, now + 1000).userId, "u1");
  assert.strictEqual(ud.verifyDownloadToken(tok, now + 23 * 3600 * 1000).userId, "u1", "still valid at 23 hours");
  assert.strictEqual(ud.verifyDownloadToken(tok, now + 25 * 3600 * 1000), null, "expired after 24 hours");
  const [p, s] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ u: "u2", p: "data-export", exp: now + 1e9 })).toString("base64url");
  assert.strictEqual(ud.verifyDownloadToken(`${forged}.${s}`, now), null, "changed payload is rejected");
  assert.strictEqual(ud.verifyDownloadToken(`${p}.AAAA`, now), null);
  assert.strictEqual(ud.verifyDownloadToken("", now), null);
  assert.strictEqual(ud.verifyDownloadToken(undefined, now), null);
  const old = process.env.JWT_SECRET; process.env.JWT_SECRET = "other"; // secret-scan-ok: fake test value
  assert.strictEqual(ud.verifyDownloadToken(tok, now), null, "a token signed with another secret is rejected");
  process.env.JWT_SECRET = old;
});

test("server wiring: download route sits above the auth line and the old 'complete export' wording is gone", () => {
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "server.js"), "utf8");
  assert.ok(src.indexOf('app.get("/api/me/export/download"') < src.indexOf('app.use("/api", auth.requireAuth);'));
  assert.ok(!/real, complete export/.test(src));
});
