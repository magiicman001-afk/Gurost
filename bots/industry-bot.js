"use strict";
/**
 * INDUSTRY bot (2 of 8). One job: match the request to an industry, and with it the palette and the page recipe.
 * Pure: no network, no model. The matching itself lives in lib/sections/assemble.js (and lib/industry-design.js).
 */
const A = require("../lib/sections/assemble");

/** @returns {{ palette: string, recipe: string, recipeOrder: string[] }} */
function match(prompt, businessInfo) {
  const palette = A.paletteForIndustry(`${prompt || ""} ${(businessInfo && businessInfo.name) || ""}`);
  const recipe = A.pickRecipe(palette);
  return { palette, recipe, recipeOrder: A.recipes[recipe].order };
}

module.exports = { match };
