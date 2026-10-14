"use strict";
/**
 * PLANNER bot (1 of 8). One job: read the request and decide what will be built.
 * Which designs to make, whether the premium loop runs, and which sections the copywriter must write words for.
 * Pure: no network, no model. Hands its brief to the industry bot.
 */
const P = require("../lib/sections/premium");
const BL = require("../lib/build-log");

// Sections the model may write the words for. Everything else is facts (code) or left off the page.
const COPY_SECTIONS = ["hero", "services", "features", "about", "process", "faq", "cta", "gallery"];

// Which two designs come first, and which two "Show 2 more" adds (ids are defined by the designer bot).
const FIRST_IDS = ["minimal", "bold"];
const MORE_IDS = ["corporate", "playful"];

/** The brief: which design slots, premium or plain, and how fast the live preview grows. */
function plan(prompt, o = {}) {
  const ids = o.directionIds || FIRST_IDS;
  // Premium Pipeline (PREMIUM_PIPELINE=1): each slot builds a curated look, is scored, and loops until it passes.
  const premium = o.premium === undefined ? P.enabled() : !!o.premium;
  const escalate = premium && BL.escalationOn();
  const stepMs = o.previewStepMs == null ? 250 : o.previewStepMs;
  return { prompt, ids, premium, escalate, stepMs, reusesWords: !!o.siteCopy };
}

/** The sections the model writes words for. Premium looks use more sections than the plain recipe (e.g. an "about" on a landing page). */
function sectionsToWrite(industryPlan, premium) {
  return premium
    ? ["hero", ...P.copyFor(industryPlan.palette)].filter((id, i, a) => COPY_SECTIONS.includes(id) && a.indexOf(id) === i)
    : industryPlan.recipeOrder.filter((id) => COPY_SECTIONS.includes(id));
}

/** The extra sections premium looks need words for, beyond the recipe's own order (none for the plain build). */
const copyExtras = (palette, premium) => (premium ? P.copyFor(palette) : undefined);

module.exports = { plan, sectionsToWrite, copyExtras, COPY_SECTIONS, FIRST_IDS, MORE_IDS };
