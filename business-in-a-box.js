/**
 * Business-in-a-Box — a real orchestrator over pieces that are already
 * real, not a new content-generation system. App/website generation is
 * whatever the project already has (app-bot.js/web-bot.js, unchanged).
 * Marketing copy and email drip reuse marketing-package.js exactly —
 * building a second, different email-generation prompt here would
 * mean two competing versions of the same real feature drifting apart
 * over time, the same class of problem avoided everywhere else in
 * this codebase. Pricing strategy, support ticket templates, and a
 * growth playbook are the three genuinely new pieces this file adds.
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");
const marketingPackage = require("./marketing-package");

const PRICING_SYSTEM = `You are recommending a real, specific pricing strategy for a new product, given its description.

Output ONLY valid JSON: {"model": "one-time"|"subscription"|"freemium"|"usage-based", "suggestedPriceRange": "a real range with currency", "reasoning": "2-3 sentences on why this model and range fit this specific product", "tiers": [{"name": "...", "price": "...", "whatItIncludes": "..."}]}

Rules:
- Base the recommendation on the actual product described, not generic advice — reference something specific about it.
- Keep tiers to 1-3, and only include multiple tiers if the product genuinely benefits from tiering (a simple one-time-purchase item usually doesn't).
- Be honest if there isn't enough information to recommend a specific number — say so and give a reasoned range instead of inventing false precision.`;

const SUPPORT_TEMPLATES_SYSTEM = `You are writing a small set of support ticket response templates for a new product, given its description.

Output ONLY valid JSON: {"templates": [{"scenario": "e.g. refund request", "response": "the template text"}]}

Rules:
- Cover 4-5 realistic, common scenarios for THIS specific kind of product (a SaaS tool and a physical product have different common complaints).
- Each template should have a placeholder like [customer name] or [order number] where real per-ticket detail belongs — don't fabricate specifics.
- Keep tone warm but efficient — a support template that's too long defeats its own purpose.`;

const GROWTH_PLAYBOOK_SYSTEM = `You are writing a realistic, honest 90-day growth playbook for a new product, given its description.

Output ONLY valid JSON: {"phases": [{"days": "1-30", "focus": "...", "actions": ["3-5 concrete actions"]}, {"days": "31-60", ...}, {"days": "61-90", ...}]}

Rules:
- Be realistic and specific to this product — not generic "post on social media" advice that could apply to anything.
- Each action should be something the founder could actually start on Monday, not an abstract goal.
- If the product genuinely doesn't have enough detail to give specific channel recommendations, say so honestly in that phase's focus rather than inventing tactics that don't fit.`;

async function generatePricingStrategy(productDescription) {
  const { parsed } = await callClaude({ system: PRICING_SYSTEM, messages: [{ role: "user", content: productDescription }], maxTokens: 700, model: CLAUDE_MODEL_FAST });
  return parsed;
}

async function generateSupportTemplates(productDescription) {
  const { parsed } = await callClaude({ system: SUPPORT_TEMPLATES_SYSTEM, messages: [{ role: "user", content: productDescription }], maxTokens: 900, model: CLAUDE_MODEL_FAST });
  return parsed;
}

async function generateGrowthPlaybook(productDescription) {
  const { parsed } = await callClaude({ system: GROWTH_PLAYBOOK_SYSTEM, messages: [{ role: "user", content: productDescription }], maxTokens: 900, model: CLAUDE_MODEL_FAST });
  return parsed;
}

/**
 * The real "one click" — but honestly, seven real Claude calls run in
 * parallel, not one. Worth knowing the actual cost/latency shape
 * before calling this "one click" to a user without qualification.
 */
async function generateBusinessInABox(project, stripeOptions) {
  if (!project.prompt) throw new Error("This project has no description to build a business plan from.");

  const [marketing, pricing, supportTemplates, growthPlaybook] = await Promise.all([
    marketingPackage.generateFullPackage(project.prompt, stripeOptions),
    generatePricingStrategy(project.prompt),
    generateSupportTemplates(project.prompt),
    generateGrowthPlaybook(project.prompt)
  ]);

  return {
    app: {
      built: project.type === "app" ? !!project.appFiles : project.type === "website" ? !!project.currentHtml : false,
      type: project.type,
      deployUrl: project.deployUrl || null
    },
    salesCopy: marketing.salesCopy,
    emailDrip: marketing.emailDrip,
    refundPolicy: marketing.refundPolicy,
    checkout: marketing.checkout,
    checkoutError: marketing.checkoutError,
    pricingStrategy: pricing,
    supportTemplates,
    growthPlaybook,
    generatedAt: new Date().toISOString()
  };
}

module.exports = { generatePricingStrategy, generateSupportTemplates, generateGrowthPlaybook, generateBusinessInABox };
