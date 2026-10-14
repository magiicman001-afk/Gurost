"use strict";
/**
 * LAUNCH bot (8 of 8). One job: deliver. It turns a finished build into the design the person can pick (the variant object
 * the builder page and the project store expect), refuses an empty page, tells the person if a design has a plain hero, and
 * reports each design and the final result.
 * It does not publish: publishing happens after the person picks a design (POST /api/project/:id/publish).
 */
const crypto = require("crypto");

/** @returns the variant object. Throws when the page came out empty. */
function makeVariant({ dir, built, label, sitePalette, setUsed, premiumInfo, composed, modelOut, logger }) {
  if ((built.page.unfilledRoles || []).includes("hero")) {
    // Never silent: the person is told, in plain words, that this design has a plain hero and what to do about it.
    logger.log({ bot: "photographer", task: `hero photo for the ${label} design`, decision: "no photo found, plain hero used", reason: "I couldn't find a photo for the top of this design just now, so it has a plain hero instead. Ask Pulse to \"add a photo\" to the hero, or tell me what the photo should show.", result: "fail", next_bot: null, details: { slot: dir.id } });
  }
  const html = built.page.html;
  if (!/<h1\b/i.test(html) || html.length < 2000) throw new Error("the page came out empty");
  return {
    id: dir.id,
    label,
    html,
    summary: `${label}: ${built.page.sections.length} sections, ${sitePalette} palette${premiumInfo && premiumInfo.note ? `. ${premiumInfo.note}` : ""}`,
    usage: null,
    verified: true,
    credits: built.page.credits || [],
    site: { engine: "section-library", palette: sitePalette, recipe: composed.recipe, content: composed.content, variants: setUsed, meta: composed.meta, direction: dir.id, look: premiumInfo ? premiumInfo.look : undefined, copy: modelOut, photos: built.page.photos || {}, baseHash: crypto.createHash("sha1").update(html).digest("hex") },
    gate: { ok: built.gate.ok, warnings: built.gate.warnings.length, degraded: built.degraded },
    premium: premiumInfo || undefined,
  };
}

/** A finished design is pickable: stop the growing preview and tell the page. */
function deliver({ notify, state, variant, label, dir }) {
  state.stop = true;
  notify("designing", "variant-complete", { variantId: dir.id, label, summary: variant.summary, variant });
}

function failed({ notify, logger, failures, dir, err }) {
  console.error(`[library-bot] "${dir.id}" failed:`, err.message);
  logger.log({ bot: "builder", task: `build the ${dir.label} design`, decision: "failed", reason: err.message, time_ms: null, result: "fail", next_bot: null, details: { slot: dir.id } });
  failures.push({ variant: dir.id, error: err.message });
  notify("designing", "variant-failed", { variantId: dir.id, label: dir.label, error: err.message });
}

function finish({ notify, variants, failures }) {
  notify("designing", "complete", { count: variants.length });
  notify("done", "complete", { variants, failures });
}

module.exports = { makeVariant, deliver, failed, finish };
