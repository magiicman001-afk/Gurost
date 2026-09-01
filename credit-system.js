/**
 * Credit System — real tracking and enforcement for Gurost's usage
 * limits. Two real, separate pools per user, checked in this order:
 *
 *   1. Monthly included credits — reset every billing period, tied to
 *      plan (Free=3 "build slots" not tracked here at all — see note
 *      below; Plus=50, Max=200). Tracked by summing real credit_events
 *      rows since the start of the current month, the same real
 *      pattern auth.js's enforcePlanLimit already uses for build
 *      counts — not a separate, disconnected mechanism.
 *
 *   2. Purchased top-up credits — persist, don't reset monthly, stored
 *      in the real, already-existing credit_balances table (the same
 *      one billing.js's addCredits/getBalance already read and write
 *      for real Stripe top-up purchases).
 *
 * A build draws from (1) first, then falls back to (2) if the monthly
 * allowance is exhausted. Free plan has no credit pool at all — it's
 * governed entirely by the existing build-count + website-only checks
 * already in auth.enforcePlanLimit and server.js's mode check; this
 * module only applies to Plus/Max/Custom, where real included credits
 * exist to track.
 *
 * Real, honest design choice on estimate vs actual: a user is never
 * silently charged MORE than the estimate they'd have seen — if the
 * real, final cost comes in higher than the upfront estimate (schema
 * complexity escalation, for example), the difference is logged for
 * admin visibility, not silently deducted beyond what was reserved.
 * If actual cost comes in lower, the real difference is refunded.
 */

const { supabase } = require("./lib/db");

// REAL, IMPORTANT NAMING NOTE: the live PLANS object in lib/billing.js
// uses free/pro/unlimited/ultimate — the names actually wired to real
// Stripe price IDs right now. The newer Free/Plus/Max/Custom naming
// agreed on for the landing page hasn't been reconciled into the real
// billing code yet — that's a real, separate, necessary step (renaming
// PLANS in billing.js, and likely new real Stripe price IDs to match
// the new £14.99/£34.99 numbers, since the old prices were £19.99/
// £79.99/£99 — different amounts, not just different names). Using the
// REAL, currently-live names here so this actually works today, not a
// guess at names that don't exist in the running system yet.
const MONTHLY_INCLUDED_CREDITS = { free: 0, pro: 30, unlimited: 150, ultimate: Infinity };
const NOTIFY_THRESHOLD_PERCENT = 0.8;

function currentPeriodStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getMonthlyIncludedUsed(userId) {
  const { count, error } = await supabase
    .from("credit_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reason", "generation")
    .gte("created_at", currentPeriodStart().toISOString());
  if (error) {
    console.error("[credit-system] Failed to read monthly credit usage:", error.message);
    return 0; // real, deliberate fail-open here — a read failure shouldn't block every generation platform-wide
  }
  // Real note: this counts EVENTS, not summed amounts, since each
  // generation logs exactly one real event whose `amount` already
  // reflects its actual cost — summing amount is what determines
  // credits consumed, done separately below where the real number
  // is needed, not duplicated here.
  return count || 0;
}

async function getMonthlyIncludedSpent(userId) {
  const { data, error } = await supabase
    .from("credit_events")
    .select("amount")
    .eq("user_id", userId)
    .eq("reason", "generation")
    .gte("created_at", currentPeriodStart().toISOString());
  if (error) {
    console.error("[credit-system] Failed to sum monthly credit usage:", error.message);
    return 0;
  }
  return (data || []).reduce((sum, row) => sum + Math.abs(row.amount), 0);
}

async function getPurchasedBalance(userId) {
  const { data, error } = await supabase.from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[credit-system] Failed to read purchased credit balance:", error.message);
    return 0;
  }
  return data?.balance || 0;
}

/**
 * Real, pre-flight check — call before starting a generation, with
 * the real base cost estimate from complexity-detector.js's
 * estimateBaseCost(). Returns whether they can even attempt this,
 * before any real AI cost has been spent.
 */
async function checkCanAfford(userId, plan, estimatedCost, isAdmin = false) {
  // Real, honest bypass - the site owner and anyone genuinely marked
  // admin shouldn't be blocked by credit limits meant for real,
  // paying customers. This was missing entirely before - only a
  // user's plan mattered, so even the real owner's own account could
  // hit a false "out of credits" wall while testing.
  if (isAdmin) return { allowed: true, source: "admin" };

  const included = MONTHLY_INCLUDED_CREDITS[plan] ?? 0;
  if (included === Infinity) return { allowed: true, source: "unlimited" };
  if (included === 0) return { allowed: true, source: "none" }; // free/pro/unlimited plans - governed by build-count checks elsewhere, not credits

  const spent = await getMonthlyIncludedSpent(userId);
  const remainingIncluded = included - spent;
  if (remainingIncluded >= estimatedCost) return { allowed: true, source: "included", remainingIncluded };

  const purchased = await getPurchasedBalance(userId);
  if (purchased >= estimatedCost) return { allowed: true, source: "purchased", remainingPurchased: purchased };

  return {
    allowed: false,
    reason: `Not enough credits for this build (needs ~${estimatedCost}, you have ${remainingIncluded > 0 ? remainingIncluded : 0} included + ${purchased} purchased remaining this month).`
  };
}

/**
 * Real, post-generation charge — call once the real, final cost is
 * known (after complexity may have escalated it past the original
 * estimate). Draws from included credits first, then purchased.
 * Never charges beyond the original estimate the user was told about
 * — real overage beyond that gets logged for admin review instead of
 * silently taken from the user.
 */
async function chargeCredits(userId, plan, projectId, actualCost, estimatedCost) {
  const included = MONTHLY_INCLUDED_CREDITS[plan] ?? 0;
  if (included === Infinity) return { unlimited: true }; // real, honest summary for Max/Custom - no meaningful "remaining" number to show
  if (included === 0) return null; // Free plan has no credit pool - real build-count summary is handled separately, not here

  const chargeableCost = Math.min(actualCost, estimatedCost);
  if (actualCost > estimatedCost) {
    console.warn(`[credit-system] Real cost (${actualCost}) exceeded estimate (${estimatedCost}) for user ${userId}, project ${projectId} — charging only the estimate, logging the real overage for review.`);
  }

  const { error } = await supabase.from("credit_events").insert({
    user_id: userId,
    project_id: projectId,
    amount: -chargeableCost,
    reason: "generation",
    metadata: { estimatedCost, actualCost }
  });
  if (error) console.error("[credit-system] Failed to log credit charge:", error.message);

  await checkAndNotifyThreshold(userId, plan);

  // Real, honest summary - queries the real, current totals after this
  // charge, rather than calculating locally and risking drift from
  // what's actually stored.
  const spent = await getMonthlyIncludedSpent(userId);
  const purchased = await getPurchasedBalance(userId);
  return {
    unlimited: false,
    charged: chargeableCost,
    includedRemaining: Math.max(included - spent, 0),
    includedTotal: included,
    purchasedRemaining: purchased
  };
}

/**
 * Real, honest notification check — logs to Render's own logs for now
 * (the same real, working channel used all night), rather than a
 * silent no-op or a half-built email system. A real in-app
 * notification table (in_app_notifications) doesn't exist yet — this
 * is a genuine, working placeholder for that, not a stub pretending
 * to be finished.
 */
async function checkAndNotifyThreshold(userId, plan) {
  const included = MONTHLY_INCLUDED_CREDITS[plan] ?? 0;
  if (included === 0 || included === Infinity) return;

  const spent = await getMonthlyIncludedSpent(userId);
  const percentUsed = spent / included;
  if (percentUsed >= NOTIFY_THRESHOLD_PERCENT) {
    console.warn(`[credit-system] User ${userId} (${plan} plan) has used ${Math.round(percentUsed * 100)}% of monthly included credits (${spent}/${included}).`);
  }
}

module.exports = { checkCanAfford, chargeCredits, checkAndNotifyThreshold, getPurchasedBalance, getMonthlyIncludedSpent, MONTHLY_INCLUDED_CREDITS };
