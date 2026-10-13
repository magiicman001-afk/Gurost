"use strict";
/**
 * Premium looks: the curated section orders + variant sets the Website Builder offers by default (premium.json).
 * Pure data access, no network. A "look" is not a design the model invents: it is a fixed order of library sections with
 * one A/B/C variant chosen for each, per industry palette.
 *
 * On by default (Irfan, 2026-10-13); PREMIUM_PIPELINE=0 switches it off. Needs the section library (SECTION_LIBRARY).
 */
const data = require("./premium.json");

/** The feature flag. On unless PREMIUM_PIPELINE is exactly "0". */
function enabled(env = process.env) {
  return String(env.PREMIUM_PIPELINE ?? "1").trim() !== "0";
}

const config = () => ({ threshold: data.threshold, maxLoops: data.maxLoops, weights: data.weights });

/** The palette's entry; an unknown palette falls back to "tech" (the same fallback the palette matcher uses). */
function forPalette(palette) {
  return data.palettes[palette] || data.palettes.tech;
}
const looksFor = (palette) => forPalette(palette).looks;
const copyFor = (palette) => forPalette(palette).copy;
const recipeIdFor = (palette) => forPalette(palette).recipe;
const allLooks = () => Object.entries(data.palettes).flatMap(([palette, p]) => p.looks.map((look) => ({ palette, ...look })));

/** The inline recipe assemble() takes for a look: its order, with navbar/hero/footer always required. */
function recipeFor(look, available) {
  const have = (id) => id === "navbar" || id === "hero" || id === "footer" || !available || available.has(id);
  return { id: look.id, order: look.order.filter(have), required: ["navbar", "hero", "footer"] };
}

/** Sections that give a page its content (everything between navbar+hero and footer). */
const contentIds = (ids) => ids.filter((id) => !["navbar", "hero", "footer"].includes(id));

module.exports = { enabled, config, forPalette, looksFor, copyFor, recipeIdFor, allLooks, recipeFor, contentIds };
