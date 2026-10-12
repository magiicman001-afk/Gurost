"use strict";
/**
 * The premium review loop for one design slot (docs/PREMIUM_PIPELINE_SPEC.md section 5).
 *
 *   build the slot's look -> review (measure + score) -> pass? done : change the look by the reasons (code, no model) and repeat
 *
 * At most `maxLoops` loops. If nothing passes, the best attempt is kept with a one-line note, so the owner is never shown a
 * failing design silently and never shown nothing. Pure orchestration: the caller injects `buildOne` and `review`.
 */
const P = require("./premium");

const ADD_ORDER = ["services", "about", "process", "faq", "cta", "features", "gallery"]; // what to add when a page is thin
const DROP_ORDER = ["faq", "features", "process", "cta", "about", "gallery", "services"]; // what to drop when it is bloated

const has = (look, need) => (look.needs || []).includes(need);

/** A copy of the look with one section added (before booking/location/footer) or dropped. */
function adjust(look, { add, drop }) {
  const order = [...look.order];
  if (drop) return { ...look, order: order.filter((id) => id !== drop), adjusted: true };
  const at = order.findIndex((id) => ["booking", "location", "footer"].includes(id));
  order.splice(at < 0 ? order.length : at, 0, add);
  return { ...look, order, variants: { ...look.variants, [add]: look.variants[add] || "a" }, adjusted: true };
}

/**
 * What to try next, from why the last attempt failed. Returns { look, fallbackSearch, why } or null (nothing left to try).
 * @param {{ palette: string, look: object, result: object, used: Set<string>, available: Set<string>, triedFallback: boolean }} o
 */
function pickNext(o) {
  const codes = new Set(o.result.reasons.map((r) => r.code));
  const unused = P.looksFor(o.palette).filter((l) => !o.used.has(l.id));
  const nextUnused = (pred) => unused.find(pred) || null;
  const why = (code) => (o.result.reasons.find((r) => r.code === code) || {}).text || code;
  const present = (id) => o.look.order.includes(id);

  if (codes.has("no-hero-image")) {
    const typeLed = nextUnused((l) => !has(l, "hero-image"));
    if (typeLed) return { look: typeLed, why: why("no-hero-image") };
    if (!o.triedFallback) return { look: o.look, fallbackSearch: true, why: why("no-hero-image") };
  }
  if (codes.has("no-gallery")) {
    const l = nextUnused((x) => !has(x, "gallery-3"));
    if (l) return { look: l, why: why("no-gallery") };
  }
  if (codes.has("few-sections")) {
    const add = ADD_ORDER.find((id) => o.available.has(id) && !present(id));
    if (add) return { look: adjust(o.look, { add }), why: why("few-sections") };
  }
  if (codes.has("many-sections")) {
    const drop = DROP_ORDER.find((id) => present(id));
    if (drop) return { look: adjust(o.look, { drop }), why: why("many-sections") };
  }
  const l = nextUnused(() => true);
  return l ? { look: l, why: (o.result.reasons[0] && o.result.reasons[0].text) || "quality check" } : null;
}

/**
 * @param {object} o {
 *   palette, startLook, available:Set (section ids the copy supports), used:Set (looks claimed by any slot), cfg: {maxLoops},
 *   buildOne(look, {fallbackSearch}) -> built      (throws when the look cannot be built at all)
 *   review(built, look) -> score result            (premium-score.score output)
 *   onReview({attempt, look, score}), onSwap({from, to, why})   (optional, for the activity log)
 * }
 * @returns {{ best: {look, built, score}, attempts: [], passed: boolean, note: string }}
 */
async function runSlot(o) {
  const max = o.cfg.maxLoops;
  const attempts = [];
  let look = o.startLook;
  let fallback = false;
  let triedFallback = false;
  let lastError = null;
  for (let i = 0; i <= max; i++) {
    o.used.add(look.id);
    let attempt = null;
    try {
      const built = await o.buildOne(look, { fallbackSearch: fallback });
      const score = await o.review(built, look);
      attempt = { look, built, score };
      attempts.push(attempt);
      if (o.onReview) o.onReview({ attempt: i, look, score });
      if (score.pass) break;
    } catch (err) {
      lastError = err; // this look could not be built at all: count the loop and try another
      attempt = { look, built: null, score: { total: 0, pass: false, reasons: [{ code: "build-failed", text: err.message }], parts: {} } };
    }
    if (i === max) break;
    const next = pickNext({ palette: o.palette, look, result: attempt.score, used: o.used, available: o.available, triedFallback });
    if (!next) break;
    if (next.fallbackSearch) triedFallback = true;
    fallback = !!next.fallbackSearch;
    if (o.onSwap) o.onSwap({ from: look, to: next.look, why: next.why });
    look = next.look;
  }
  if (!attempts.length) throw lastError || new Error("no premium look could be built");
  const best = attempts.slice().sort((a, b) => (b.score.pass - a.score.pass) || (b.score.total - a.score.total))[0];
  const note = best.score.pass ? "" : `Quality check ${best.score.total}/100: ${(best.score.reasons[0] && best.score.reasons[0].text) || "below the premium mark"}`;
  return { best, attempts, passed: best.score.pass, note };
}

module.exports = { runSlot, pickNext, adjust, ADD_ORDER, DROP_ORDER };
