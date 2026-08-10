/**
 * Guardian Agent — real, thin dispatcher over the 3 existing quality
 * bots. Same reasoning as builder-agent.js: nothing underneath is
 * touched, this is purely a clean import point on top of what's real.
 */

const reviewBot = require("../bots/review-bot");
const fixBot = require("../bots/fix-bot");
const correctionBot = require("../bots/correction-bot");

module.exports = {
  // Review (bots/review-bot.js — unchanged)
  reviewFile: reviewBot.reviewFile,
  reviewFiles: reviewBot.reviewFiles,

  // Fix (bots/fix-bot.js — unchanged)
  fixFile: fixBot.fixFile,
  fixFiles: fixBot.fixFiles,
  fixSingleIssue: fixBot.fixSingleIssue,

  // Correction (bots/correction-bot.js — unchanged; website-mode
  // single-document corrections only, does not handle multi-file
  // app-mode — same real limitation as before this wrapper existed)
  applyCorrection: correctionBot.applyCorrection
};
