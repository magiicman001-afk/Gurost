"use strict";
/**
 * REVIEW bot (7 of 8). One job: score a finished page. It measures the real page in a browser (when one is available) and
 * grades it against the premium rules. It does not edit anything; the premium loop uses the score to retry or swap the look.
 * (Named site-review-bot because bots/review-bot.js is the code reviewer for the App Builder.)
 */
const S = require("../lib/sections/premium-score");

/** The review function the premium loop calls: (built, look) -> score. */
function reviewer(getBrowser) {
  return async (b, look) => {
    const metrics = await S.measure(b.page.html, { browser: await getBrowser() });
    return S.score(b.page, { look, metrics, contrastFailed: b.gate.failures.some((f) => f.rule === "text-contrast") });
  };
}

/** Called after each review inside the loop: one log line, and a progress message for the person. */
function onReview(notify, dir) {
  return ({ attempt, look, score }) => {
    console.log(`[premium] ${look.id} score=${score.total} ${score.pass ? "pass" : "FAIL"} parts=${JSON.stringify(score.parts)} reasons=${score.reasons.map((x) => x.text).join("; ") || "none"} attempt=${attempt + 1}${score.partial ? " (no browser: partial)" : ""}`);
    notify("designing", "reviewing", { variantId: dir.id, label: look.label, score: score.total, pass: score.pass });
  };
}

module.exports = { reviewer, onReview };
