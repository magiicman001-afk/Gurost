// Run: node --test test/password-reset-honesty.test.js
// Bug CC: password reset must never say it sent an email it could not send.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// stand-ins so no network or package is needed
const dbPath = require.resolve("../lib/db");
const calls = { selects: 0, inserts: 0 };
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { supabase: { from: () => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => (calls.selects++, { data: { user_id: "u1" } }) }) }),
  insert: async () => (calls.inserts++, { error: null }),
}) } } };
const sent = [];
const Module = require("module");
const realLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "postmark") return { ServerClient: class { async sendEmail(m) { sent.push(m); } } };
  return realLoad.call(this, request, ...rest);
};

const email = require("../email");
const auth = require("../user-auth");
Module._load = realLoad;
const KEYS = ["POSTMARK_SERVER_TOKEN", "POSTMARK_API_KEY", "POSTMARK_FROM_EMAIL", "FRONTEND_BASE_URL", "PUBLIC_URL"];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const clear = () => KEYS.forEach((k) => delete process.env[k]);
test.afterEach(() => { clear(); calls.selects = calls.inserts = 0; sent.length = 0; });
test.after(() => KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

test("isConfigured: needs a token (either name) AND a sender address", () => {
  assert.equal(email.isConfigured({}), false);
  assert.equal(email.isConfigured({ POSTMARK_SERVER_TOKEN: "t" }), false);
  assert.equal(email.isConfigured({ POSTMARK_FROM_EMAIL: "a@b.co" }), false);
  assert.equal(email.isConfigured({ POSTMARK_SERVER_TOKEN: "t", POSTMARK_FROM_EMAIL: "a@b.co" }), true);
  assert.equal(email.isConfigured({ POSTMARK_API_KEY: "t", POSTMARK_FROM_EMAIL: "a@b.co" }), true, "POSTMARK_API_KEY works too");
  assert.equal(email.isConfigured({ POSTMARK_SERVER_TOKEN: "  ", POSTMARK_FROM_EMAIL: "a@b.co" }), false);
});

test("no email service: reset says sent:false for everyone, looks nobody up, creates no token", async () => {
  clear();
  assert.deepEqual(await auth.requestPasswordReset("irfank3971@gmail.com"), { sent: false, configured: false });
  assert.deepEqual(await auth.requestPasswordReset("nobody@example.com"), { sent: false, configured: false });
  assert.equal(calls.selects + calls.inserts, 0);
  assert.equal(sent.length, 0);
});

test("email service set: the link is sent, and it never points at localhost", async () => {
  process.env.POSTMARK_API_KEY = "tok";
  process.env.POSTMARK_FROM_EMAIL = "hello@gurost.test";
  const r = await auth.requestPasswordReset("irfank3971@gmail.com");
  assert.deepEqual(r, { sent: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].To, "irfank3971@gmail.com");
  assert.match(sent[0].HtmlBody, /https:\/\/gurost\.onrender\.com\/reset-password\.html\?token=[0-9a-f]{64}/);
  assert.doesNotMatch(sent[0].HtmlBody, /localhost/);
});

test("the page tells the truth when nothing was sent", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "reset-password.html"), "utf8");
  assert.match(html, /result\.sent === false/);
  assert.match(html, /Password reset email is not connected yet, so no link was sent\. Please contact support\./);
});
