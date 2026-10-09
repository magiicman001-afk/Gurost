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
 * Model slugs and prices re-checked against OpenRouter's /models on
 * 2026-09-30:
 *   - z-ai/glm-5.2              $0.52/M in,  $3.99/M out
 *   - anthropic/claude-sonnet-5 $2/M in,    $10/M out
 *   - anthropic/claude-opus-5   $5/M in,    $25/M out
 *   - free tier: a fallback list of $0 :free models (see TIER_FREE_MODEL)
 * Check `GET {OPENROUTER_BASE_URL}/models` if any of these stop
 * resolving — same discipline smart-router.js's header already asks for.
 *
 * A comma-separated value is sent by openrouter-client.js as OpenRouter's
 * `models` fallback array (max 3 entries): if one model is down or
 * rate-limited, OpenRouter serves the request from the next.
 *
 * openai/gpt-oss-20b is no longer used anywhere: live builds showed it
 * routinely spending the whole 8000-token budget on reasoning and
 * returning no HTML (finish_reason "length"), dropping 1-3 of every 4
 * designs, on both the free tier and Pro (where it was the default).
 *
 * Free tier (2026-10-05): every free text model on OpenRouter is now a
 * reasoning model, and left to itself it spends the whole token budget
 * thinking (qwen3.8:free: 5379 of 6000 tokens, empty or cut-off reply).
 * A chain that starts with a :free model is sent with reasoning switched
 * off (lib/openrouter-client.js) - measured: 0 reasoning tokens, complete
 * files, ~30s. qwen3.8:free stopped being free (404) the same day.
 * Order: nemotron-3-super:free, gemma-4-31b:free (often rate-limited),
 * then qwen3-coder - paid, non-reasoning, ~$0.007 per stage - so a free
 * build still completes when both free models fail. Override with
 * TIER_FREE_MODEL to go back to free-only.
 *
 * Pro: glm-5.2 (~$0.13 per 4-design build) with a :free model as the
 * fallback when glm-5.2 is unavailable. Unlimited/Ultimate escalate
 * complex tasks to Sonnet 5. Ultimate additionally allows a rare Opus 5
 * escalation on top of that.
 */

const TIER_PRO_PRIMARY = process.env.TIER_PRO_MODEL || "z-ai/glm-5.2,google/gemma-4-31b-it:free";
const TIER_PRO_FALLBACK = process.env.TIER_PRO_FALLBACK_MODEL || "google/gemma-4-31b-it:free";
const TIER_MID_MODEL = process.env.TIER_MID_MODEL || "z-ai/glm-5.2"; // unlimited/ultimate's non-complex default
const TIER_COMPLEX_MODEL = process.env.TIER_COMPLEX_MODEL || "anthropic/claude-sonnet-5";
const TIER_OPUS_MODEL = process.env.TIER_OPUS_MODEL || "anthropic/claude-opus-5";
// 2026-10-07: Nemotron 3 Ultra first (the largest free model), then Super,
// then Gemma; qwen3-coder (paid, ~$0.007/stage) stays the last resort -
// there is no free qwen3-coder on OpenRouter. The client walks this chain
// 3 models at a time and skips any model that just rate-limited.
const TIER_FREE_MODEL = process.env.TIER_FREE_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free,nvidia/nemotron-3-super-120b-a12b:free,google/gemma-4-31b-it:free,qwen/qwen3-coder";

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

// App Builder code (backend, frontend and Pulse edits): Kimi K2.6 first (2026-10-08, slug checked
// against OpenRouter). Paid plans fall back Kimi -> Sonnet -> GLM -> Nemotron (the client sends 3 at a
// time and walks the rest); Free goes Kimi -> Nemotron only, and with no OpenRouter credit the client
// drops straight to the :free entries, so a Free build still completes. Set APP_CODE_MODEL to another
// slug to swap the first model, or to "off" to go back to the ordinary tier model, without a code change.
const APP_CODE_PRIMARY = process.env.APP_CODE_MODEL || "moonshotai/kimi-k2.6";
const NEMOTRON_ULTRA = "nvidia/nemotron-3-ultra-550b-a55b:free";
const NEMOTRON_SUPER = "nvidia/nemotron-3-super-120b-a12b:free";

function modelForAppCode(plan) {
  if (APP_CODE_PRIMARY === "off") return modelForTier(plan, { complex: true });
  if (plan === "pro" || plan === "unlimited" || plan === "ultimate") return [APP_CODE_PRIMARY, TIER_COMPLEX_MODEL, TIER_MID_MODEL, NEMOTRON_SUPER].join(",");
  return [APP_CODE_PRIMARY, NEMOTRON_ULTRA, NEMOTRON_SUPER].join(",");
}

// App Builder FRONTEND stage: GLM-5.2 first (2026-10-08). Measured in our own logs, Kimi K2.6 streams at
// about 27-30 tokens/s (a 14,000-token frontend took 8.7 min) and GLM-5.2 at about 130 tokens/s (19 files,
// 42,500 chars, 79 s). Kimi stays first for the backend; here it is the first fallback. Set
// APP_FRONTEND_MODEL to another slug to swap the first model, or "off" to use the ordinary App Builder chain.
const APP_FRONTEND_PRIMARY = process.env.APP_FRONTEND_MODEL || "z-ai/glm-5.2";

function modelForAppFrontend(plan) {
  if (APP_FRONTEND_PRIMARY === "off") return modelForAppCode(plan);
  const rest = modelForAppCode(plan).split(",").filter((m) => m && m !== APP_FRONTEND_PRIMARY);
  return [APP_FRONTEND_PRIMARY, ...rest].join(",");
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

// The $0 models of the Free tier, for a paid chain that runs out of credit (openrouter-client's 402 rescue).
const FREE_RESCUE_MODELS = TIER_FREE_MODEL.split(",").map((m) => m.trim()).filter((m) => /:free$/.test(m));

module.exports = { modelForTier, fallbackModelForTier, modelForAppCode, modelForAppFrontend, FREE_RESCUE_MODELS };
