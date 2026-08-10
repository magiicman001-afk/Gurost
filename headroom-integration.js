/**
 * Headroom (headroomlabs-ai/headroom) — genuinely different from
 * Graphify/Ruflo/Token Reducer/ClaudeSlim/gstack/github-slim, which are
 * all Claude Code CLI dev-tooling with no runtime API. Headroom ships a
 * real proxy mode: "any OpenAI/Anthropic-compatible client works via
 * headroom proxy, zero code changes." That's a legitimate integration
 * path for a backend that already calls api.anthropic.com over HTTP.
 *
 * Integration approach: proxy, not the TypeScript library. Headroom's
 * npm package (`headroom-ai`) is explicitly documented as "TypeScript
 * SDK only — no `headroom` CLI," and its heavier compression algorithms
 * (Kompress-base is a HuggingFace model) are Python-side. Rather than
 * guess at what the JS SDK does or doesn't reimplement natively, this
 * routes Claude API calls through a `headroom proxy` instance instead —
 * that's the one mode explicitly designed to be a transparent drop-in,
 * regardless of what language is calling it.
 *
 * REAL OPERATIONAL REQUIREMENT, not zero-config: `headroom proxy` has
 * to actually run somewhere as an always-on process — a sidecar
 * container next to this Express app, or a separate small service. It
 * is not something `npm install` alone makes appear; installing the
 * `headroom-ai` Python/CLI package and running `headroom proxy --port
 * 8787` is a real deployment step, same category as the E2B Android
 * template or the Render backend deploy — infra you set up once, not
 * code that provisions itself.
 *
 * Not verified against a live proxy instance from here — same standing
 * caveat as every other integration in this build.
 */

function isEnabled() {
  return !!process.env.HEADROOM_PROXY_URL;
}

// lib/claude-client.js calls this to get the base URL for the Claude
// API request — either Headroom's proxy (which forwards to Anthropic
// after compressing the request) or Anthropic directly.
function getClaudeEndpoint() {
  if (isEnabled()) {
    // Headroom's proxy mode exposes an Anthropic-compatible endpoint at
    // this path — confirm against your running proxy's actual routing
    // if it doesn't match; proxy configurations vary by version.
    return `${process.env.HEADROOM_PROXY_URL.replace(/\/$/, "")}/v1/messages`;
  }
  return "https://api.anthropic.com/v1/messages";
}

module.exports = { isEnabled, getClaudeEndpoint };
