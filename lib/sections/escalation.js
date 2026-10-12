"use strict";
/**
 * The escalation chain for one design slot (docs/ESCALATION_HIERARCHY_SPEC.md):
 *
 *   builder -> fixer -> manager -> senior
 *
 * Each level gets one attempt. A pass at any level ends the chain. Every action is logged (build-log.js). All four levels are
 * code, no model call. The caller injects buildOne / review exactly as for premium-loop.runSlot, and gets the same result
 * shape ({ best, attempts, passed, note }) plus { chain, report, flagged }.
 */
const P = require("./premium");
const { adjust, ADD_ORDER, DROP_ORDER } = require("./premium-loop");
const senior = require("./senior");
const { nullLogger } = require("../build-log");

const has = (look, need) => (look.needs || []).includes(need);
const NEUTRAL_PALETTES = ["tech", "law"]; // the manager may borrow a look from these; never from a clashing industry palette

// Which sections a failed rule points at, in the order to try. The fixer swaps the A/B/C variant of the first one on the page.
const SWAP_TARGETS = {
  contrast: ["hero", "cta"],
  "off-palette": ["hero", "cta"],
  cramped: ["services", "about", "features", "faq"],
  "short-section": ["services", "about", "features"],
  "weak-hierarchy": ["hero"],
  h1: ["hero"],
  "long-headline": ["hero"],
  "line-length": ["about"],
  "small-body": ["about"],
  "same-kind": ["faq", "process", "features", "services"],
  "few-images": ["gallery", "about"],
};
const NEXT_VARIANT = { a: "b", b: "c", c: "a" };

/** Level 2. A targeted repair of the SAME look from the reasons it failed. Returns a plan or null (nothing specific to fix). */
function fixerPlan({ look, score, available, triedFallback }) {
  const reasons = score.reasons || [];
  const codes = reasons.map((r) => r.code);
  const text = (c) => (reasons.find((r) => r.code === c) || {}).text || c;
  const present = (id) => look.order.includes(id);
  if (codes.includes("build-failed")) return null;
  if (!triedFallback && (codes.includes("no-hero-image") || codes.includes("broken-image") || codes.includes("few-images"))) {
    const c = ["no-hero-image", "broken-image", "few-images"].find((x) => codes.includes(x));
    return { look, fallbackSearch: true, task: "retry the photo search with the palette's own words", decision: "same look, new photo search", reason: text(c) };
  }
  if (codes.includes("few-sections")) {
    const add = ADD_ORDER.find((id) => available.has(id) && !present(id));
    if (add) return { look: adjust(look, { add }), task: `add a ${add} section`, decision: `add ${add}`, reason: text("few-sections") };
  }
  if (codes.includes("many-sections")) {
    const drop = DROP_ORDER.find((id) => present(id));
    if (drop) return { look: adjust(look, { drop }), task: `drop the ${drop} section`, decision: `drop ${drop}`, reason: text("many-sections") };
  }
  for (const code of codes) {
    const targets = SWAP_TARGETS[code];
    if (!targets) continue;
    const id = targets.find((t) => present(t) && look.variants[t]);
    if (!id) continue;
    const from = look.variants[id];
    const to = NEXT_VARIANT[from] || "a";
    return { look: { ...look, variants: { ...look.variants, [id]: to }, adjusted: true }, task: `swap the ${id} section from variant ${from} to ${to}`, decision: `${id}: ${from} -> ${to}`, reason: text(code) };
  }
  if (codes.includes("no-proof")) {
    const add = ["about", "features", "faq"].find((id) => available.has(id) && !present(id));
    if (add) return { look: adjust(look, { add }), task: `add a ${add} section for credibility`, decision: `add ${add}`, reason: text("no-proof") };
  }
  return null;
}

/** Level 3. Replan the whole mix: a different look; if this industry's own looks are used up, a look from a neutral palette. */
function managerPick({ palette, attempts, used, triedFallback }) {
  const codes = new Set(attempts.flatMap((a) => (a.score.reasons || []).map((r) => r.code)));
  const pred = (l) => !(codes.has("no-hero-image") && triedFallback && has(l, "hero-image")) && !(codes.has("no-gallery") && has(l, "gallery-3"));
  const unusedOwn = P.looksFor(palette).filter((l) => !used.has(l.id));
  const own = unusedOwn.find(pred) || unusedOwn[0];
  if (own) return { look: own, palette };
  for (const pal of NEUTRAL_PALETTES.filter((x) => x !== palette)) {
    const list = P.looksFor(pal).filter((l) => !used.has(l.id));
    const l = list.find(pred) || list[0];
    if (l) return { look: l, palette: pal, paletteChanged: true };
  }
  return null;
}

const failScore = (err) => ({ total: 0, pass: false, reasons: [{ code: "build-failed", text: err.message }], parts: {} });
const summary = (score) => ({ total: score.total, pass: !!score.pass, parts: score.parts, reasons: (score.reasons || []).map((r) => r.text), partial: !!score.partial });

/**
 * @param {object} o {
 *   palette, startLook, available:Set, used:Set, cfg:{threshold}, logger, slot (label), content (for the schema check),
 *   seniorEnabled (default true),
 *   buildOne(look, {fallbackSearch, palette}) -> built, review(built, look) -> score,
 *   onReview({attempt, look, score, bot}), onSwap({from, to, why}), onLevel({bot, look, why})
 * }
 */
async function runEscalation(o) {
  const L = o.logger || nullLogger;
  const slot = o.slot || null;
  const attempts = [];
  const chain = [];
  let triedFallback = false;
  let lastError = null;
  let palette = o.palette;
  const seniorEnabled = o.seniorEnabled !== false;
  const base = (extra) => ({ slot, ...extra });

  // One attempt by one bot: build, review, log both. Never throws (a look that cannot be built is a failed attempt).
  async function attempt(bot, look, opt, task, decision, reason, nextBot) {
    o.used.add(look.id);
    if (o.onLevel && bot !== "builder") o.onLevel({ bot, look, why: reason });
    const t0 = Date.now();
    let a;
    try {
      const built = await o.buildOne(look, { fallbackSearch: !!opt.fallbackSearch, palette: opt.palette || palette });
      const t1 = Date.now();
      const score = await o.review(built, look);
      a = { bot, look, built, score, palette: opt.palette || palette };
      attempts.push(a);
      if (o.onReview) o.onReview({ attempt: attempts.length - 1, look, score, bot });
      L.log({ bot: "reviewer", task: `score the ${look.label} look`, decision: `${score.total}/100 ${score.pass ? "pass" : "below the mark"}`, reason: (score.reasons || []).map((r) => r.text).slice(0, 3).join("; ") || null, time_ms: Date.now() - t1, result: score.pass ? "success" : "fail", next_bot: null, details: base({ look: look.id, parts: score.parts, partial: !!score.partial }) });
      L.log({ bot, task, decision, reason, time_ms: t1 - t0, result: score.pass ? "success" : "escalate", next_bot: score.pass ? null : nextBot, details: base({ look: look.id, score: score.total, sections: (built.page.sections || []).map((s) => `${s.id}:${s.variant}`) }) });
    } catch (err) {
      lastError = err;
      a = { bot, look, built: null, score: failScore(err), palette: opt.palette || palette, error: err.message };
      L.log({ bot, task, decision: "could not build this look", reason: err.message, time_ms: Date.now() - t0, result: "fail", next_bot: nextBot, details: base({ look: look.id }) });
    }
    chain.push({ bot, look: look.id, score: a.score.total, pass: !!a.score.pass, built: !!a.built });
    return a;
  }

  const done = () => attempts.some((a) => a.score.pass);

  // ---- Level 1: builder
  let last = await attempt("builder", o.startLook, {}, `build the ${o.startLook.label} look`, "start with the planned look", "first attempt", "fixer");

  // ---- Level 2: fixer
  if (!last.score.pass) {
    const plan = fixerPlan({ look: last.look, score: last.score, available: o.available, triedFallback });
    if (plan) {
      if (plan.fallbackSearch) triedFallback = true;
      if (o.onSwap && plan.look !== last.look) o.onSwap({ from: last.look, to: plan.look, why: plan.reason });
      last = await attempt("fixer", plan.look, { fallbackSearch: plan.fallbackSearch, palette: last.palette }, plan.task, plan.decision, plan.reason, "manager");
    } else {
      L.log({ bot: "fixer", task: "look for a targeted repair", decision: "none found", reason: ((last.score.reasons || [])[0] || {}).text || "no specific, safe repair for this failure", time_ms: 0, result: "escalate", next_bot: "manager", details: base({ look: last.look.id }) });
      chain.push({ bot: "fixer", look: last.look.id, score: null, pass: false, built: false });
    }
  }

  // ---- Level 3: manager
  if (!done()) {
    const pick = managerPick({ palette: o.palette, attempts: attempts.length ? attempts : [last], used: o.used, triedFallback });
    if (pick) {
      const why = `replanning after ${chain.length} attempt(s): ${(((last.score.reasons || [])[0]) || {}).text || "below the mark"}`;
      if (o.onSwap) o.onSwap({ from: last.look, to: pick.look, why });
      if (pick.paletteChanged) palette = pick.palette;
      last = await attempt("manager", pick.look, { palette: pick.palette }, `rebuild with the ${pick.look.label} look${pick.paletteChanged ? ` (${pick.palette} palette)` : ""}`, pick.paletteChanged ? "own looks used up: borrow a neutral palette" : "different section mix and variants", why, "senior");
    } else {
      L.log({ bot: "manager", task: "replan the section mix", decision: "no unused look left", reason: "every look for this industry has been tried", time_ms: 0, result: "escalate", next_bot: "senior", details: base({}) });
    }
  }

  // ---- Level 4: senior engineer
  let report = null;
  let flagged = false;
  if (!done() && attempts.length) {
    const best = pickBest(attempts);
    if (!seniorEnabled) {
      L.log({ bot: "senior", task: "deep dive", decision: "skipped", reason: "the senior engineer is switched off (SENIOR_BOT_ENABLED=0)", time_ms: 0, result: "fail", next_bot: null, details: base({ look: best.look.id }) });
    } else {
      const t0 = Date.now();
      let verdict;
      try {
        verdict = senior.inspect({ best, attempts, content: o.content, palette: o.palette });
      } catch (err) {
        L.log({ bot: "senior", task: "deep dive", decision: "could not inspect", reason: err.message, time_ms: Date.now() - t0, result: "fail", next_bot: null, details: base({ flagged: true }) });
        verdict = null;
        flagged = true;
        report = `The senior engineer could not inspect this build (${err.message}). It needs a person to look at it.`;
      }
      if (verdict) {
        const applied = verdict.fix ? senior.applyFix(best.look, verdict.fix) : null;
        const changes = applied && (applied.fallbackSearch || JSON.stringify(applied.look.order) !== JSON.stringify(best.look.order) || JSON.stringify(applied.look.variants) !== JSON.stringify(best.look.variants));
        L.log({ bot: "senior", task: "deep dive: read the logs, inspect the page, run the checks, compare with the 24 looks", decision: changes ? verdict.fix.why : "no safe specific fix", reason: verdict.failed.length ? verdict.failed.map((c) => `${c.check}: ${c.detail}`).join(" | ").slice(0, 480) : "no defect found; below the quality mark", time_ms: Date.now() - t0, result: changes ? "escalate" : "fail", next_bot: changes ? "builder" : null, details: base({ checks: verdict.checks, closest: verdict.closest, nearest: verdict.ranked, salvageable: !!changes, flagged: !changes, attempts: chain }) });
        if (changes) {
          const before = best.score.total;
          const a = await attempt("senior", applied.look, { fallbackSearch: applied.fallbackSearch, palette: best.palette }, `apply the fix and rebuild: ${verdict.fix.why}`, "one specific edit", `score was ${before}/100`, null);
          if (!a.score.pass && a.score.total <= before) {
            flagged = true;
            report = verdict.report + `\nThe fix did not improve the score (${before} -> ${a.score.total}).`;
            L.log({ bot: "senior", task: "report for a person", decision: "fix did not help; flagged for review", reason: report.slice(0, 480), time_ms: 0, result: "fail", next_bot: null, details: base({ flagged: true, report }) });
          } else if (!a.score.pass) {
            report = verdict.report + `\nThe fix improved the score (${before} -> ${a.score.total}) but it is still below the mark.`;
          }
        } else {
          flagged = true;
          report = verdict.report;
          L.log({ bot: "senior", task: "report for a person", decision: "not salvageable automatically; flagged in the admin", reason: report.slice(0, 480), time_ms: 0, result: "fail", next_bot: null, details: base({ flagged: true, report }) });
        }
      }
    }
  }

  if (!attempts.length) throw lastError || new Error("no premium look could be built");
  const best = pickBest(attempts);
  const note = best.score.pass ? "" : `Quality check ${best.score.total}/100: ${(best.score.reasons[0] && best.score.reasons[0].text) || "below the premium mark"}`;
  L.log({ bot: "builder", task: "choose what to show", decision: `${best.look.label} (${best.bot})`, reason: best.score.pass ? "passed the quality check" : note, time_ms: 0, result: best.score.pass ? "success" : "fail", next_bot: null, details: base({ look: best.look.id, score: best.score.total, levels: chain }) });
  return { best, attempts, passed: !!best.score.pass, note, chain, report, flagged, palette: best.palette };
}

function pickBest(attempts) {
  return attempts.slice().sort((a, b) => (b.score.pass - a.score.pass) || (b.score.total - a.score.total))[0];
}

module.exports = { runEscalation, fixerPlan, managerPick, SWAP_TARGETS };
