"use strict";
/**
 * Website Builder V2: designs made from the section library instead of free-written HTML. THE ORCHESTRATOR.
 *
 * This file does no design work itself. It calls eight small bots, one job each, in this order, and every time one passes
 * its work to the next the handoff is written to `bot_handoffs` (lib/bot-handoff.js):
 *
 *   planner  -> industry -> designer -> research -> builder -> pulse -> review -> launch
 *   (brief)    (palette)   (look)       (words +    (page +    (live     (score)    (deliver)
 *                                        photos)     gate)      preview)
 *
 * One honest difference from the order in the brief: RESEARCH runs before BUILDER, not after, because the builder cannot
 * assemble a page without the words and the photos. Pulse's live preview runs while the builder works; in premium mode the
 * builder/review loop is one loop (a page is built, scored, and rebuilt until it passes), so those handoffs are logged
 * per finished design.
 *
 * The split that makes the sites trustworthy: the MODEL writes words only (one call per build, JSON out), the OWNER's
 * facts go in by code, and sections that would need invented facts are simply not on the page.
 *
 * Behind SECTION_LIBRARY (see `enabled()`). The caller falls back to the old generator on any error or zero designs.
 * The model call and the photo search are injected, so tests need no network. Cost: no model call beyond the copywriter's.
 */
const A = require("../lib/sections/assemble");
const P = require("../lib/sections/premium");
const { runSlot } = require("../lib/sections/premium-loop");
const { runEscalation } = require("../lib/sections/escalation");
const BL = require("../lib/build-log");
const H = require("../lib/bot-handoff");
const planner = require("./planner-bot");
const industryBot = require("./industry-bot");
const designer = require("./designer-bot");
const research = require("./site-research-bot");
const builder = require("./builder-bot");
const pulse = require("./pulse-bot");
const reviewBot = require("./site-review-bot");
const launch = require("./launch-bot");

const { COPY_SECTIONS, FIRST_IDS, MORE_IDS } = planner;
const { DIRECTIONS } = designer;
const { composeContent, fitLinks } = builder;
const { cleanSection, systemPrompt, describeSlots } = research;

/**
 * Makes the designs for a project. Same shape as variantBot.generateVariantsStaged: resolves { variants, failures }
 * and reports progress through onStage(stage, status, data).
 *
 * @param {string} prompt
 * @param {object} o { businessInfo, plan, includeBranding, onStage, directionIds, callModel, search, siteCopy, browserChecks, premium }
 *   premium: true/false overrides the PREMIUM_PIPELINE flag (tests); bestLook(industry) -> { look } | null is the Design Memory lookup (tests)
 *   callModel({ system, content }) -> parsed JSON       (default: Claude via the tier router)
 *   search(query) -> { url, credit } | null              (default: the stock-photo step)
 *   siteCopy: words saved on an earlier call (used by "Show 2 more" so no second model call is made)
 *   handoffs: a handoff log (lib/bot-handoff.js) to use instead of the one built from the logger (tests)
 */
async function generateLibraryVariants(prompt, o = {}) {
  const notify = (stage, status, data) => o.onStage && o.onStage(stage, status, data);
  const logger = o.logger || BL.nullLogger; // build log (lib/build-log.js): every bot action is recorded
  const trail = o.handoffs || H.forLogger(logger); // handoff log: every bot-to-bot pass is recorded
  const failures = [];
  const variants = [];

  // 1. PLANNER: what will be built
  const brief = planner.plan(prompt, o);
  const dirs = designer.directionsFor(brief.ids);
  const premium = brief.premium;
  notify("understanding", "running");
  notify("understanding", "complete", { prompt });
  trail.handoff("planner", "industry", { directions: brief.ids, premium, escalation: brief.escalate, reusesWords: brief.reusesWords });

  // 2. INDUSTRY: palette and recipe
  const industry = industryBot.match(prompt, o.businessInfo);
  const palette = industry.palette;
  notify("designing", "running", { industry: palette });
  trail.handoff("industry", "designer", { palette, recipe: industry.recipe });

  // 3. DESIGNER: the look the live preview starts with (a slot's own look is chosen again below, after the words exist)
  const lead = dirs[0];
  const state = { stop: false };
  let modelOut = o.siteCopy || null;
  if (!modelOut) {
    // Paint something real now, instead of a blank panel for the 20-30 seconds the words take.
    try {
      pulse.paintShell({ notify, lead, shellLook: designer.lookFor(palette, lead, premium), palette, businessInfo: o.businessInfo });
    } catch (err) {
      console.warn("[library-bot] preview shell skipped:", err.message);
    }
  }
  const wanted = modelOut ? [] : planner.sectionsToWrite(industry, premium);
  trail.handoff("designer", "research", { palette, lead: lead ? lead.id : null, wordsToWrite: wanted.length });

  // 4. RESEARCH: the words (the one model call) and, later, the photos
  if (!modelOut) modelOut = await research.writeWords({ prompt, wanted, businessInfo: o.businessInfo, callModel: o.callModel, subscription: o.plan, logger, industry: palette });
  const composed = composeContent({ prompt, businessInfo: o.businessInfo, modelOut, copy: planner.copyExtras(palette, premium) });
  trail.handoff("research", "builder", { wordSections: Object.keys((modelOut && modelOut.sections) || {}).length, reusedWords: !!o.siteCopy, sections: Object.keys(composed.content).length });

  // Pulse's preview runs alongside the real build (photos, quality checks), which takes longer, so it adds no waiting.
  // In premium mode the preview grows the lead slot's own look, so what is painted matches what arrives.
  const leadLook = designer.lookFor(composed.palette, lead, premium);
  const growing = lead ? pulse.growPreview({ dir: leadLook ? { ...lead, label: leadLook.label, set: leadLook.variants } : lead, composed, notify, state, stepMs: brief.stepMs, order: leadLook ? leadLook.order : undefined }) : Promise.resolve();

  const { search, withFallback } = research.makePhotoSearch({ search: o.search, logger, prompt, palette: composed.palette });
  const factsAllow = [prompt, JSON.stringify(o.businessInfo || {})];
  const browser = builder.sharedBrowser(o);
  const used = new Set(); // premium looks already claimed by a slot, so two slots never show the same look
  const learned = await designer.learnedLook(composed.palette, premium, o.bestLook);
  const available = new Set(Object.keys(composed.content));
  const cfg = P.config();
  const includeBranding = o.includeBranding !== false;

  await Promise.all(
    dirs.map(async (dir) => {
      try {
        let built;
        let label = dir.label;
        let setUsed = dir.set;
        let premiumInfo = null;
        let sitePalette = composed.palette;
        let score = null;
        if (premium) {
          // Design Memory (DESIGN_MEMORY=1): the first slot leads with what has scored and survived best for this industry.
          const startLook = designer.startLookFor(composed.palette, dir, learned);
          const run = brief.escalate ? runEscalation : runSlot; // ESCALATION_HIERARCHY=0 returns to the plain premium loop
          const r = await run({
            palette: composed.palette, startLook, available, used, cfg, logger, slot: dir.id, content: composed.content, seniorEnabled: BL.seniorOn(),
            buildOne: builder.makeBuildOne({ dir, composed, search, withFallback, includeBranding, factsAllow, browserChecks: o.browserChecks, available, getBrowser: browser.get }),
            review: reviewBot.reviewer(browser.get),
            onReview: reviewBot.onReview(notify, dir),
            onSwap: pulse.onSwap(notify, dir),
            onLevel: pulse.onLevel(notify, dir),
          });
          sitePalette = r.palette || composed.palette;
          built = r.best.built;
          label = r.best.look.label;
          setUsed = r.best.look.variants;
          score = r.best.score;
          premiumInfo = { look: r.best.look.id, sections: built.page.sections.map((x) => ({ id: x.id, variant: x.variant })), score: r.best.score.total, parts: r.best.score.parts, reasons: r.best.score.reasons.map((x) => x.text), attempts: r.attempts.length, passed: r.passed, note: r.note, levels: r.chain || undefined, report: r.report || undefined, flagged: r.flagged || undefined };
        } else {
          // 5. BUILDER (plain mode: one build, no scoring loop)
          const tB = Date.now();
          built = await builder.buildDirection(dir, composed, { search: withFallback, includeBranding, factsAllow, browserChecks: o.browserChecks });
          logger.log({ bot: "builder", task: `build the ${dir.label} design`, decision: `${built.page.sections.length} sections, ${composed.palette} palette`, reason: built.degraded ? "the quality gate repaired the page" : null, time_ms: Date.now() - tB, result: "success", next_bot: null, details: { slot: dir.id, gateOk: built.gate.ok, steps: built.steps } });
        }
        trail.handoff("builder", "pulse", { slot: dir.id, sections: built.page.sections.length, palette: sitePalette, attempts: premiumInfo ? premiumInfo.attempts : 1 });
        // 6. PULSE: what the quality gate saw on the finished page
        const seen = pulse.watch(built);
        trail.handoff("pulse", "review", { slot: dir.id, ...seen });
        // 7. REVIEW: the score (premium builds are scored inside the loop; a plain build is not scored)
        trail.handoff("review", "launch", { slot: dir.id, scored: !!score, score: score ? score.total : null, pass: score ? !!score.pass : null });
        // 8. LAUNCH: the design the person can pick
        const variant = launch.makeVariant({ dir, built, label, sitePalette, setUsed, premiumInfo, composed, modelOut, logger });
        variants.push(variant);
        launch.deliver({ notify, state, variant, label, dir });
        trail.handoff("launch", "user", { slot: dir.id, label, gateOk: variant.gate.ok });
      } catch (err) {
        launch.failed({ notify, logger, failures, dir, err });
        trail.handoff("launch", "user", { slot: dir.id, failed: true, error: err.message });
      }
    })
  );
  state.stop = true;
  await growing;
  await browser.close();
  launch.finish({ notify, variants, failures });
  trail.flush(); // inserts are already under way; a database problem never delays or breaks a build
  return { variants, failures, copy: modelOut };
}

module.exports = { generateLibraryVariants, fitLinks, composeContent, cleanSection, systemPrompt, describeSlots, DIRECTIONS, FIRST_IDS, MORE_IDS, COPY_SECTIONS, enabled: A.enabled };
