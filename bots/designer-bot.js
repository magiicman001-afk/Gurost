"use strict";
/**
 * DESIGNER bot (3 of 8). One job: choose the look. Which of the four directions a slot is, which curated premium look it
 * starts with, and which look Design Memory says has scored best for this industry. No network of its own.
 */
const P = require("../lib/sections/premium");

// Same ids and labels as the old four directions, so the picker and the stored designs need no change.
// Heroes (Bug UU, 2026-10-13): photo-led by default. "minimal" = split (text beside a photo, hero a), "bold" = full-bleed photo (hero b),
// "corporate" = the palette's own default (split), "playful" = full-bleed. The text-only hero (c, with a plain shape) is NOT a default for any
// direction: it is only what a photo hero falls back to when no photo could be found (assemble swaps it, and the build log says so).
const DIRECTIONS = [
  { id: "minimal", label: "Minimal / Editorial", set: { navbar: "a", hero: "a", services: "a", features: "a", about: "c", gallery: "a", process: "a", faq: "a", cta: "a", booking: "a", location: "a", footer: "a" } },
  { id: "bold", label: "Bold / Maximalist", set: { navbar: "b", hero: "b", services: "b", features: "b", about: "b", gallery: "b", process: "b", faq: "b", cta: "b", booking: "b", location: "b", footer: "b" } },
  { id: "corporate", label: "Corporate / Professional", set: {} }, // the palette's own defaults
  { id: "playful", label: "Playful / Friendly", set: { navbar: "c", hero: "b", services: "c", features: "c", about: "b", gallery: "c", process: "c", faq: "c", cta: "c", booking: "c", location: "c", footer: "c" } },
];

const directionsFor = (ids) => DIRECTIONS.filter((d) => ids.includes(d.id));
const slotIndex = (dir) => DIRECTIONS.findIndex((d) => d.id === dir.id);

/** The premium look a slot starts with (the slot's own place in the palette's list of looks), or null when premium is off. */
function lookFor(palette, dir, premium) {
  if (!premium || !dir) return null;
  const looks = P.looksFor(palette);
  return looks[slotIndex(dir) % looks.length];
}

/** Design Memory (DESIGN_MEMORY=1): what has scored and survived best for this industry, or null. */
async function learnedLook(palette, premium, bestLook) {
  if (!(premium && (bestLook || require("../lib/design-memory").enabled()))) return null;
  return Promise.resolve((bestLook || ((ind) => require("../lib/design-memory").bestLook(ind)))(palette)).catch(() => null);
}

/** Where a slot starts: the first slot leads with the learned look; the others take their own place in the list. */
function startLookFor(palette, dir, learned) {
  const looks = P.looksFor(palette);
  const i = slotIndex(dir);
  return i === 0 && learned ? learned.look : looks[i % looks.length];
}

module.exports = { DIRECTIONS, directionsFor, lookFor, learnedLook, startLookFor, slotIndex };
