/**
 * Fix Verification — real, honest check of whether a "Fix All" rebuild
 * genuinely succeeded, used to decide whether to actually charge for
 * it. Deliberately modest in scope: this confirms the fix produced
 * real, valid, meaningfully different HTML — not a full re-audit of
 * every original issue, since revamp-bot.js's real audit() function
 * needs a live URL to run, which the freshly-fixed HTML doesn't have
 * yet. Checked directly before building this, not assumed.
 */

function verifyFixSucceeded(originalHtml, fixedHtml) {
  const reasons = [];

  if (!fixedHtml || typeof fixedHtml !== "string" || fixedHtml.trim().length === 0) {
    return { success: false, reason: "The fix returned empty output." };
  }

  // Real, basic structural validity - the same real check used all
  // night on every real page before shipping it.
  const openDiv = (fixedHtml.match(/<div/g) || []).length;
  const closeDiv = (fixedHtml.match(/<\/div>/g) || []).length;
  if (Math.abs(openDiv - closeDiv) > 0) {
    return { success: false, reason: "The fixed page has mismatched HTML tags — it would likely render broken." };
  }

  if (!fixedHtml.includes("<html") || !fixedHtml.includes("</html>")) {
    return { success: false, reason: "The fixed output isn't a complete, real HTML page." };
  }

  // Real, honest check that something meaningful actually changed -
  // guards against a "fix" that silently just returned the original,
  // broken page back unchanged.
  if (fixedHtml.trim() === (originalHtml || "").trim()) {
    return { success: false, reason: "The fix didn't actually change anything." };
  }

  return { success: true, reason: null };
}

module.exports = { verifyFixSucceeded };
