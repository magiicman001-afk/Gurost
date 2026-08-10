/**
 * Stripe billing. Free/Pro/Unlimited/Ultimate plans, plus a credit ledger
 * for the per-bug-fix and plan-mode features (bug-tracker.js, plan-mode.js).
 *
 * Note on Unlimited vs Ultimate: both have buildsPerMonth: Infinity —
 * Ultimate isn't "more builds," Unlimited already maxed that axis out.
 * Ultimate is differentiated by team seats, SSO, swarm execution, and
 * industry context — see swarmSlots/teamSeats/sso below. If you're
 * marketing these two side by side, the name overlap ("Unlimited" and
 * "Ultimate" both implying infinity) is worth revisiting before launch.
 *
 * You must create the Pro/Unlimited/Ultimate/top-up prices in your
 * Stripe dashboard yourself and put their price IDs in .env — there is
 * no way to hardcode a working price ID here, it's account-specific.
 *
 * SQL (run once):
 *   create table credit_balances (
 *     user_id text primary key,
 *     balance integer not null default 20,  -- free signup grant, adjust as you like
 *     updated_at timestamptz default now()
 *   );
 *   create table credit_events (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     amount integer not null,              -- positive = added, negative = spent
 *     reason text not null,                 -- 'bug_fix' | 'plan_mode' | 'topup' | 'grant'
 *     metadata jsonb default '{}',
 *     created_at timestamptz default now()
 *   );
 *   create index on credit_events (user_id, created_at desc);
 */

const Stripe = require("stripe");
const { supabase } = require("./db");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  free: { priceId: null, buildsPerMonth: 3, maxProjects: 1, swarmSlots: 1, teamSeats: 1, sso: false, industryContext: false, whiteLabel: false },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO, // £19.99/mo
    buildsPerMonth: 50, maxProjects: 10, swarmSlots: 1, teamSeats: 1, sso: false, industryContext: false, whiteLabel: false
  },
  unlimited: {
    priceId: process.env.STRIPE_PRICE_UNLIMITED, // £79.99/mo
    buildsPerMonth: Infinity, maxProjects: Infinity, swarmSlots: 2, teamSeats: 1, sso: false, industryContext: false, whiteLabel: false
  },
  ultimate: {
    priceId: process.env.STRIPE_PRICE_ULTIMATE, // £99/mo
    buildsPerMonth: Infinity,
    maxProjects: Infinity,
    swarmSlots: 4,          // parallel task-executor concurrency, see lib/swarm.js
    teamSeats: 20,
    sso: true,
    industryContext: true,
    whiteLabel: true,       // strips the "Powered by Gurost" badge — see note in web-bot.js/variant-bot.js
    priorityModel: true     // routes through CLAUDE_MODEL (Sonnet) instead of CLAUDE_MODEL_FAST even for light tasks
  }
};

// One-time purchases, not subscriptions — mode: "payment" below, not
// mode: "subscription" like the plan checkouts.
const TOPUPS = {
  topup_50: { priceId: process.env.STRIPE_PRICE_TOPUP_50, credits: 50, amountGBP: 5 },
  topup_100: { priceId: process.env.STRIPE_PRICE_TOPUP_100, credits: 100, amountGBP: 9 },
  topup_250: { priceId: process.env.STRIPE_PRICE_TOPUP_250, credits: 250, amountGBP: 20 }
};

const LOW_CREDIT_THRESHOLD = 5;

// Business Assistant — a genuinely different pricing shape from the four
// plans above: base fee + a variable per-seat ("bot") add-on, not a flat
// monthly price. Kept separate from PLANS above rather than shoehorned in,
// since those are single flat-price subscriptions and this isn't.
//
// NAMING COLLISION WORTH RESOLVING BEFORE LAUNCH, not silently ignored:
// "ultimate" above is ALSO £99/month. Shipping two different products
// both priced at £99/month under different names is a real source of
// customer confusion at checkout and in support conversations — worth
// a deliberate naming/pricing decision, not something this file can
// resolve on your behalf.
//
// Requires TWO Stripe Price objects created in your dashboard (same
// "you must create these yourself" note as PLANS above):
//   - STRIPE_PRICE_BUSINESS_ASSISTANT_BASE: recurring, £99/month, quantity always 1
//   - STRIPE_PRICE_BUSINESS_ASSISTANT_BOT: recurring, £4/month, PER UNIT —
//     this is a plain per-unit recurring price, NOT Stripe's usage_type:
//     "metered" (that API's old Usage Records mechanism was removed as of
//     API version 2025-03-31.basil, replaced by a new Meters API meant
//     for continuously-reported consumption). Bot count is a discrete,
//     admin/system-set quantity, not a metered stream — a normal
//     recurring price with a quantity your code updates via
//     stripe.subscriptionItems.update() is the correct, current,
//     fully-supported mechanism for this, not a legacy one.
const BUSINESS_ASSISTANT = {
  basePriceId: process.env.STRIPE_PRICE_BUSINESS_ASSISTANT_BASE,
  botPriceId: process.env.STRIPE_PRICE_BUSINESS_ASSISTANT_BOT,
  includedBots: 5,
  maxBots: 20,
  extraBotPriceGBP: 4
};

async function createBusinessAssistantSubscription(customerEmail, botCount, successUrl, cancelUrl) {
  const extraBots = Math.max(0, Math.min(botCount, BUSINESS_ASSISTANT.maxBots) - BUSINESS_ASSISTANT.includedBots);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail,
    line_items: [
      { price: BUSINESS_ASSISTANT.basePriceId, quantity: 1 },
      ...(extraBots > 0 ? [{ price: BUSINESS_ASSISTANT.botPriceId, quantity: extraBots }] : [])
    ],
    success_url: successUrl,
    cancel_url: cancelUrl
  });
  return session;
}

/**
 * Real, current Stripe API for changing a discrete seat count mid-cycle
 * — this is what actually replaces the spec's "POST /api/billing/pay
 * — process payment." There is no separate "process a payment" action
 * to build here: once a subscription exists, Stripe's own recurring
 * billing engine charges the card on file automatically every cycle.
 * The real action a bot-count change needs is updating the QUANTITY on
 * the existing subscription item, which Stripe then bills correctly
 * (prorated) on its own — reinventing charge-processing on top of an
 * active subscription would fight Stripe's own billing engine, not
 * complement it.
 */
async function updateBotSeatQuantity(stripeSubscriptionId, newBotCount) {
  const extraBots = Math.max(0, Math.min(newBotCount, BUSINESS_ASSISTANT.maxBots) - BUSINESS_ASSISTANT.includedBots);
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const botItem = subscription.items.data.find((item) => item.price.id === BUSINESS_ASSISTANT.botPriceId);

  if (extraBots === 0) {
    if (botItem) await stripe.subscriptionItems.del(botItem.id);
    return { extraBots: 0 };
  }

  if (botItem) {
    await stripe.subscriptionItems.update(botItem.id, { quantity: extraBots });
  } else {
    await stripe.subscriptionItems.create({ subscription: stripeSubscriptionId, price: BUSINESS_ASSISTANT.botPriceId, quantity: extraBots });
  }
  return { extraBots };
}

async function createCheckoutSession(plan, customerEmail, successUrl, cancelUrl) {
  if (plan === "free") throw new Error("Free plan doesn't require checkout.");
  const planConfig = PLANS[plan];
  if (!planConfig || !planConfig.priceId) {
    throw new Error(`Plan "${plan}" is not configured — set its Stripe price ID in .env.`);
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail,
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl
  });
  return session.url;
}

async function createTopUpCheckout(topupId, userId, customerEmail, successUrl, cancelUrl) {
  const topup = TOPUPS[topupId];
  if (!topup || !topup.priceId) {
    throw new Error(`Top-up "${topupId}" is not configured — set its Stripe price ID in .env.`);
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [{ price: topup.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // The webhook handler reads these back to know who to credit and how
    // much — Stripe doesn't otherwise tell you which user a payment was for.
    metadata: { userId, topupId, credits: String(topup.credits) }
  });
  return session.url;
}

// Call with the RAW request body (not JSON-parsed) — Stripe signature
// verification fails against a re-serialized body. See server.js for
// how the webhook route is wired with express.raw().
function verifyWebhook(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

// ---------------------------------------------------------------------------
// Credit ledger
// ---------------------------------------------------------------------------

async function getBalance(userId) {
  const { data, error } = await supabase.from("credit_balances").select("balance").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Failed to load credit balance: ${error.message}`);
  return data?.balance ?? 0;
}

async function addCredits(userId, amount, reason, metadata = {}) {
  if (amount <= 0) throw new Error("addCredits amount must be positive.");
  const current = await getBalance(userId);
  const newBalance = current + amount;
  const { error } = await supabase
    .from("credit_balances")
    .upsert({ user_id: userId, balance: newBalance, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to update balance: ${error.message}`);
  await supabase.from("credit_events").insert({ user_id: userId, amount, reason, metadata });
  return newBalance;
}

async function deductCredits(userId, amount, reason, metadata = {}) {
  if (amount <= 0) throw new Error("deductCredits amount must be positive.");
  const current = await getBalance(userId);
  if (current < amount) {
    const err = new Error(`Insufficient credits: have ${current}, need ${amount}.`);
    err.code = "INSUFFICIENT_CREDITS";
    throw err;
  }
  const newBalance = current - amount;
  const { error } = await supabase
    .from("credit_balances")
    .upsert({ user_id: userId, balance: newBalance, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to update balance: ${error.message}`);
  await supabase.from("credit_events").insert({ user_id: userId, amount: -amount, reason, metadata });
  return { newBalance, lowCredits: newBalance <= LOW_CREDIT_THRESHOLD };
}

module.exports = {
  createCheckoutSession,
  createTopUpCheckout,
  verifyWebhook,
  getBalance,
  addCredits,
  deductCredits,
  PLANS,
  TOPUPS,
  LOW_CREDIT_THRESHOLD,
  BUSINESS_ASSISTANT,
  createBusinessAssistantSubscription,
  updateBotSeatQuantity
};
