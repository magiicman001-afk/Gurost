/**
 * Tier Router — maps a user's billing plan (lib/billing.js's PLANS keys:
 * free/pro/unlimited/ultimate) to the OpenRouter model used for text
 * generation, so cost per build stays roughly proportional to what
 * that tier actually pays.
 *
 * Deliberately separate from smart-router.js (which routes by TASK
 * complexity across providers, not by who's paying) and from the
 * per-feature model choices that already exist elsewhere in this
 * codebase — App Builder's SCHEMA_AGENT_MODEL, Amend Website's
 * size-based LARGE_DOCUMENT_MODEL, and Business Assistant's Research
 * agent (kept on Gemini for long-document reasoning, deliberately NOT
 * tier-routed — see bots/assistant-bot.js). Those keep making their
 * own specialized choice; this module only supplies the tier-default
 * model for the call sites that don't have one of those overrides.
 *
 * Model slugs below were confirmed against OpenRouter's own listings
 * on 2026-09-19 (search date, not assumed):
 *   - openai/gpt-oss-20b        $0.02/M in,  $0.10/M out
 *   - z-ai/glm-5.2              $0.49/M in,  $1.53/M out
 *   - anthropic/claude-sonnet-5 $2/M in,    $10/M out
 *   - anthropic/claude-opus-5   $5/M in,    $25/M out
 *   - free tier: a fallback list of $0 :free models (see TIER_FREE_MODEL)
 * Check `GET {OPENROUTER_BASE_URL}/models` if any of these stop
 * resolving — same discipline smart-router.js's header already asks for.
 *
 * Free tier, re-checked 2026-09-22: minimax/minimax-m2:free was removed
 * from OpenRouter (404 "unavailable for free"), which failed every free
 * build. :free models also get rate-limited upstream routinely, so the
 * free tier is a comma-separated list that openrouter-client.js sends as
 * OpenRouter's `models` fallback array (max 3 entries). Two :free models
 * first; the last entry is openai/gpt-oss-20b ($0.02/M in, $0.09/M out,
 * roughly a tenth of a cent per 4-variant build) so a free build still
 * completes when every free provider is rate-limited or overloaded, which
 * live testing showed happens often. Override with TIER_FREE_MODEL to go
 * back to free-only.
 *
 * Pro tier has no complexity split — it's one cheap primary model with
 * a same-cost-class fallback for when the primary errors, not a
 * quality upgrade. Unlimited/Ultimate escalate complex tasks to
 * Sonnet 5. Ultimate additionally allows a rare Opus 5 escalation on
 * top of that.
 */

const TIER_PRO_PRIMARY = process.env.TIER_PRO_MODEL || "openai/gpt-oss-20b";
const TIER_PRO_FALLBACK = process.env.TIER_PRO_FALLBACK_MODEL || "z-ai/glm-5.2";
const TIER_MID_MODEL = process.env.TIER_MID_MODEL || "z-ai/glm-5.2"; // unlimited/ultimate's non-complex default
const TIER_COMPLEX_MODEL = process.env.TIER_COMPLEX_MODEL || "anthropic/claude-sonnet-5";
const TIER_OPUS_MODEL = process.env.TIER_OPUS_MODEL || "anthropic/claude-opus-5";
const TIER_FREE_MODEL = process.env.TIER_FREE_MODEL || "google/gemma-4-31b-it:free,qwen/qwen3.8-27b:free,openai/gpt-oss-20b";

// APPROXIMATION, not real usage tracking: this caps Opus at roughly 5%
// of Ultimate's COMPLEX calls via a random roll on each call, not 5%
// of actual token/dollar spend measured over time. Good enough until
// real per-user usage tracking (a separate, already-planned follow-up)
// can enforce the cap against real counted usage instead of a coin flip.
const ULTIMATE_OPUS_ROLL_CHANCE = 0.05;

/**
 * Resolves the tier-default model for a plan. `complex` is a signal
 * the caller provides (a heuristic, a task-length check, whatever
 * that call site already uses) — this function doesn't infer it.
 *
 * Free and Pro ignore `complex` entirely: free always gets the free
 * model, Pro's cost model is flat regardless of task shape.
 */
function modelForTier(plan, { complex = false } = {}) {
  switch (plan) {
    case "unlimited":
      return complex ? TIER_COMPLEX_MODEL : TIER_MID_MODEL;
    case "ultimate":
      if (complex) {
        return Math.random() < ULTIMATE_OPUS_ROLL_CHANCE ? TIER_OPUS_MODEL : TIER_COMPLEX_MODEL;
      }
      return TIER_MID_MODEL;
    case "pro":
      return TIER_PRO_PRIMARY;
    case "free":
    default:
      return TIER_FREE_MODEL;
  }
}

/**
 * Pro's fallback model — only meaningful for Pro, since that's the
 * only tier with a primary/fallback pair rather than a single tier
 * default. Callers only need this if they want to retry a failed
 * Pro-tier call on the fallback model themselves (e.g. correction-bot.js's
 * existing primary/fallback pattern); it's not invoked automatically
 * by modelForTier above.
 */
function fallbackModelForTier(plan) {
  return plan === "pro" ? TIER_PRO_FALLBACK : null;
}

module.exports = { modelForTier, fallbackModelForTier };
