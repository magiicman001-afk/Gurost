/**
 * Builder Agent — a real, thin dispatcher over the 5 existing builder
 * bots, not a merge or a rewrite. This is the safer alternative that
 * was explicitly chosen over deprecating and combining the 13 real
 * bots into 3: every function below just delegates directly to the
 * real, unchanged, already-tested bot it wraps. Nothing underneath
 * this file was touched, renamed, or deleted — existing code that
 * already imports `bots/web-bot.js` etc. directly keeps working
 * completely unchanged. This file is purely additive: a single,
 * clean import point for new code, sitting on top of what already works.
 *
 * Deliberately NOT a self-classifying "figure out what the caller
 * wants" dispatcher — an auto-router adds a new place for things to
 * go wrong (misrouting a build request) in a build that specifically
 * asked for lower risk. Each real capability is exposed under a
 * clear, direct name instead.
 */

const webBot = require("../bots/web-bot");
const appBot = require("../bots/app-bot");
const revampBot = require("../bots/revamp-bot");
const variantBot = require("../bots/variant-bot");
const sketchBot = require("../sketch-bot");

module.exports = {
  // Website generation (bots/web-bot.js, bots/variant-bot.js — unchanged)
  buildWebsite: webBot.buildWebsite,
  generateWebsiteVariants: variantBot.generateVariants,
  websiteBriefs: variantBot.BRIEFS,

  // App generation (bots/app-bot.js — unchanged)
  buildApp: appBot.buildApp,
  buildAppStaged: appBot.buildAppStaged,

  // Revamp/audit (bots/revamp-bot.js — unchanged)
  crawlWebsite: revampBot.crawl,
  runLighthouseAudit: revampBot.runLighthouse,
  auditWebsite: revampBot.audit,
  rebuildWebsite: revampBot.rebuild,

  // Diagrams (sketch-bot.js — unchanged)
  generateDiagram: sketchBot.generateDiagram
};
