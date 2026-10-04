/**
 * A page's content without markup noise, for AI reviews of a finished
 * site (Guide Bot's credibility check, Pulse's analysis).
 * Full sites are 40-55KB; scripts, styles, SVG, class/style/data
 * attributes and inline image data carry no content - dropping them keeps
 * a whole page at ~12KB, so the review sees the footer and contact
 * section instead of being cut off after the first 12KB.
 */
function condenseForReview(html) {
  return String(html)
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/\s(class|style)=("[^"]*"|'[^']*')/gi, "")
    .replace(/\s(aria-[\w-]+|data-[\w-]+|loading|decoding)=("[^"]*"|'[^']*')/gi, "")
    .replace(/src="data:[^"]*"/gi, 'src="(inline image)"')
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

module.exports = { condenseForReview };
