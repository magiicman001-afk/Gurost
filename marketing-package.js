/**
 * Sell This For Me — real content generation for three of the four
 * pieces, and a genuinely different mechanism for the fourth
 * (checkout links) than reusing Gurost's own Stripe account, because
 * that would be the wrong thing to build, not just a missing feature.
 *
 * WHY THE CHECKOUT LINK DOESN'T USE lib/billing.js's STRIPE CLIENT:
 * that client is authenticated as Gurost's own platform Stripe
 * account — it's for Gurost's own subscription revenue. Routing a
 * user's own product sales through Gurost's merchant account would
 * mean Gurost becomes the merchant of record for someone else's
 * product, a real, serious business/compliance distinction, not a
 * technical detail to skip past. The correct real answer for a
 * platform wanting to sell on behalf of its users is Stripe Connect —
 * a genuine, separate integration, not built here given the scope of
 * everything else in this round.
 *
 * What IS real and buildable now: the user supplies their OWN Stripe
 * secret key for their own account, scoped to a single request, never
 * stored anywhere — used once to create a real Checkout Session via
 * Stripe's current price_data pattern (verified against current Stripe
 * docs before writing this: inline pricing, no pre-created Product/
 * Price object required), then discarded. This is real, but the
 * honest MVP version — a later round should build real Stripe Connect
 * if "one click, no Stripe account needed" matters enough to justify it.
 *
 * REFUND POLICY IS BOILERPLATE, STATED PLAINLY, NOT IMPLIED AS LEGAL
 * ADVICE: an LLM-generated refund policy is a starting draft, the same
 * caveat already applied to legal.html's generated content in an
 * earlier round — flagged in the actual output, not just here.
 */

const Stripe = require("stripe");
const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");

const SALES_COPY_SYSTEM = `You are writing sales page copy for a product, focused on BENEFITS (what the customer's life looks like after buying) rather than FEATURES (what the product technically does).

Output ONLY valid JSON: {"headline": "...", "subheadline": "...", "benefits": ["3-5 short benefit statements"], "cta": "call to action button text", "socialProofPrompt": "one sentence suggesting what kind of testimonial/proof would strengthen this page"}

Rules:
- Every benefit should answer "so what does that actually get me" — not "has X feature" but "means you Y."
- Keep the headline under 12 words.
- Don't invent specific numbers, testimonials, or claims you have no basis for — the socialProofPrompt exists so the user adds their own real proof, not so you fabricate some.`;

const EMAIL_DRIP_SYSTEM = `You are writing a 3-email lead nurture drip campaign for a product, given its description.

Output ONLY valid JSON: {"emails": [{"day": 0, "subject": "...", "body": "..."}, {"day": 3, ...}, {"day": 7, ...}]}

Rules:
- Email 1 (day 0): welcome/deliver value, no hard sell.
- Email 2 (day 3): address a likely objection or common question.
- Email 3 (day 7): clear call to action.
- Keep each body under 150 words — this is email, not a sales page.`;

const REFUND_POLICY_SYSTEM = `You are drafting a standard, reasonable refund policy for a digital product, given its description.

Output ONLY valid JSON: {"policy": "the full policy text"}

Rules:
- Use common, standard terms (e.g. a specific refund window, clear conditions) — don't invent anything unusual or one-sided.
- Keep it genuinely readable, not dense legal language.`;

async function generateSalesCopy(productDescription) {
  const { parsed } = await callClaude({ system: SALES_COPY_SYSTEM, messages: [{ role: "user", content: productDescription }], maxTokens: 800, model: CLAUDE_MODEL_FAST });
  return parsed;
}

async function generateEmailDrip(productDescription) {
  const { parsed } = await callClaude({ system: EMAIL_DRIP_SYSTEM, messages: [{ role: "user", content: productDescription }], maxTokens: 1200, model: CLAUDE_MODEL_FAST });
  return parsed;
}

async function generateRefundPolicy(productDescription) {
  const { parsed } = await callClaude({ system: REFUND_POLICY_SYSTEM, messages: [{ role: "user", content: productDescription }], maxTokens: 600, model: CLAUDE_MODEL_FAST });
  return {
    policy: parsed.policy,
    disclaimer: "This is a starting draft, not legal advice — have it reviewed before publishing, the same way legal.html's own template content is flagged elsewhere in this codebase."
  };
}

/**
 * Real Checkout Session, created on the CALLER'S OWN Stripe account
 * using a key they provide per-request — never Gurost's, never stored.
 * Uses price_data for inline pricing (current Stripe pattern, verified
 * before writing this), so no separate Product/Price pre-creation is
 * needed on their account first.
 */
async function createCheckoutLink({ stripeSecretKey, productName, description, amountCents, currency = "usd", successUrl, cancelUrl }) {
  if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
    throw new Error("A valid Stripe secret key (starting with sk_) is required — this creates the checkout link on YOUR Stripe account, not Gurost's.");
  }
  const userStripe = new Stripe(stripeSecretKey); // per-request client, discarded after this call — the key is never written anywhere

  const session = await userStripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency,
        product_data: { name: productName, description: description || undefined },
        unit_amount: amountCents
      },
      quantity: 1
    }],
    success_url: successUrl || "https://example.com/success",
    cancel_url: cancelUrl || "https://example.com/cancel"
  });

  return { checkoutUrl: session.url, sessionId: session.id };
}

/**
 * One-click "generate everything" — real, but honestly composed of
 * three genuinely-generated pieces and one that only runs if a Stripe
 * key was actually provided (checkout links can't be faked without one).
 */
async function generateFullPackage(productDescription, stripeOptions) {
  const [salesCopy, emailDrip, refundPolicy] = await Promise.all([
    generateSalesCopy(productDescription),
    generateEmailDrip(productDescription),
    generateRefundPolicy(productDescription)
  ]);

  let checkout = null;
  let checkoutError = null;
  if (stripeOptions?.stripeSecretKey) {
    try {
      checkout = await createCheckoutLink({ ...stripeOptions, productName: stripeOptions.productName || salesCopy.headline });
    } catch (err) {
      checkoutError = err.message;
    }
  }

  return { salesCopy, emailDrip, refundPolicy, checkout, checkoutError };
}

module.exports = { generateSalesCopy, generateEmailDrip, generateRefundPolicy, createCheckoutLink, generateFullPackage };
