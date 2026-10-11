// Run: node --test test/login-input.test.js
// Bug CC2: a correct password must not be refused because a phone capitalised the email or a paste added a space.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const Module = require("module");

const PW = "htucz-vntqx-2964";
const salt = "f43c3f0b8aac26add381b4d3924a1070";
const ROW = { user_id: "u1", email: "irfank3971@gmail.com", password_hash: crypto.scryptSync(PW, salt, 64).toString("hex"), password_salt: salt, plan: "free", revoked: false };
const asked = [];
const real = Module._load;
Module._load = function (r, ...a) {
  if (r === "./lib/db") return { supabase: { from: () => ({ select: () => ({ eq: (c, v) => ({ maybeSingle: async () => (asked.push(v), { data: v === ROW.email ? ROW : null }) }) }) }) } };
  if (r === "./email") return { isConfigured: () => false };
  if (r === "jsonwebtoken") return { sign: () => "jwt" };
  return real.call(this, r, ...a);
};
process.env.JWT_SECRET = "x";
const auth = require("../user-auth");
Module._load = real;

test("normalizeEmail: trimmed and lower-cased", () => {
  assert.equal(auth.normalizeEmail("  Irfank3971@Gmail.COM "), "irfank3971@gmail.com");
  assert.equal(auth.normalizeEmail(null), "");
});

test("login works with a phone-capitalised email, spaces around the email, and the right password", async () => {
  for (const e of ["irfank3971@gmail.com", "Irfank3971@gmail.com", " IRFANK3971@GMAIL.COM ", "irfank3971@gmail.com\n"]) {
    const r = await auth.login(e, PW);
    assert.equal(r.userId, "u1", JSON.stringify(e));
  }
  assert.ok(asked.every((v) => v === "irfank3971@gmail.com"), "the lookup always uses the normal form");
});

test("a space added by copy and paste around the password is forgiven; any other difference is not", async () => {
  assert.equal((await auth.login("irfank3971@gmail.com", PW + " ")).userId, "u1");
  assert.equal((await auth.login("irfank3971@gmail.com", " " + PW)).userId, "u1");
  for (const bad of ["Htucz-vntqx-2964", "htucz-vntqx-2965", "htuczvntqx2964", "", null, undefined]) {
    await assert.rejects(auth.login("irfank3971@gmail.com", bad), /Invalid email or password/, String(bad));
  }
  await assert.rejects(auth.login("someone@else.com", PW), /Invalid email or password/);
});
