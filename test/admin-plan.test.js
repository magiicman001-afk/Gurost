// Run: node --test test/admin-plan.test.js
// An admin (email on ADMIN_EMAILS) is never stopped by a plan gate: the request carries the top plan.
process.env.ADMIN_EMAILS = "Boss@Example.com, other@example.com";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const auth = require("../auth");

test("an admin on the Free plan is upgraded for the request, with the stored plan kept", () => {
  const u = auth.applyAdminTier({ id: "1", email: "boss@example.com", plan: "free" });
  assert.equal(u.plan, "ultimate");
  assert.equal(u.realPlan, "free");
  assert.equal(u.isAdmin, true);
});

test("the email match ignores case; anyone else keeps their own plan, untouched", () => {
  assert.equal(auth.applyAdminTier({ email: "OTHER@example.com", plan: "free" }).plan, "ultimate");
  const customer = { id: "2", email: "someone@example.com", plan: "pro" };
  assert.equal(auth.applyAdminTier(customer), customer);
  const noEmail = { id: "3", plan: "free" };
  assert.equal(auth.applyAdminTier(noEmail), noEmail);
  assert.equal(auth.applyAdminTier(null), null);
});

test("the input is not changed (nothing is written back to the account)", () => {
  const u = { id: "1", email: "boss@example.com", plan: "free" };
  auth.applyAdminTier(u);
  assert.equal(u.plan, "free");
});

test("requireAuth applies it to every credential type", () => {
  const src = fs.readFileSync(path.join(__dirname, "../auth.js"), "utf8");
  assert.match(src, /req\.user = applyAdminTier\(user\);/);
});
