/**
 * Bot-to-bot communication for Gurost.
 *
 * SCOPE NOTE, read before assuming bots run a persistent background
 * conversation with each other: they don't, and building that would be
 * the wrong architecture for this codebase. Every bot in Gurost is a
 * stateless function called from an Express route — there's no
 * always-running bot process that could "talk in the background."
 * What this module actually does, and what "bot-to-bot communication"
 * concretely means here:
 *
 *  1. A ROLE REGISTRY — each bot's job, input, and output are declared
 *     in one place (BOT_ROLES below), so "no confusion, clear roles"
 *     is enforced by a lookup table, not by convention scattered across
 *     ten files.
 *  2. A HANDOFF LOG — every time one bot's output becomes another
 *     bot's input (which already happens today — app-bot → review-bot
 *     → fix-bot → sandbox in /api/generate, for example), that handoff
 *     gets recorded here: who handed off to whom, with what, and when.
 *     This is genuinely new — those chains existed before but weren't
 *     logged anywhere, so debugging "why did fix-bot get called" meant
 *     reading code, not reading a trail.
 *
 * This module doesn't call bots itself — server.js still calls each
 * bot directly in its route handlers (changing that would mean
 * rewriting every route in this codebase for no functional gain). What
 * changed: route handlers now call `recordHandoff()` at each real
 * handoff point, and `getHandoffTrail()` lets you see the full
 * coordination history for a given project/session.
 *
 * The table is created by docs/migrations/2026-10-14_bot_handoffs.sql (id, from_bot, to_bot, project_id, payload jsonb,
 * created_at; RLS on). The eight website-builder bots (bots/planner-bot.js ... bots/launch-bot.js) log through
 * lib/bot-handoff.js; `recordHandoff` below writes the same table for the App Builder chain, with the summary in `payload`.
 */

const { supabase } = require("./lib/db");

// The registry itself — "no confusion, clear roles" as a lookup, not a
// wiki page nobody reads. Update this if you add or rename a bot.
const BOT_ROLES = {
  "web-bot": { job: "Generates a single-file website from a prompt.", input: "business description", output: "HTML" },
  "variant-bot": { job: "Generates 4 parallel design directions.", input: "business description", output: "4x HTML" },
  "app-bot": { job: "Generates schema + backend + frontend for a full app.", input: "business description", output: "files" },
  "revamp-bot": { job: "Audits and rebuilds an existing live site.", input: "URL + approved fixes", output: "HTML" },
  "review-bot": { job: "Reviews generated code for issues by severity.", input: "files", output: "issue list" },
  "fix-bot": { job: "Fixes flagged issues in generated code.", input: "files + issues", output: "fixed files" },
  "bug-tracker": { job: "Per-bug credit-gated fix approval flow.", input: "files", output: "approved fixes" },
  "sandbox": { job: "Runs generated backend code, catches startup crashes.", input: "files", output: "pass/fail" },
  "guide-bot": { job: "Proactive in-builder suggestions.", input: "project state", output: "suggestions" },
  "assistant-bot": { job: "Business content generation and suggestions.", input: "business context + task", output: "content" },
  "transformer-bot": { job: "Manufacturing/engineering business analysis and suggestions.", input: "company profile", output: "analysis/suggestions" },
  "image-bot": { job: "Sources and inserts stock imagery into generated pages.", input: "page HTML + style intent", output: "HTML with images" },
  "meeting-bot": { job: "Meeting consent, transcription evaluation, tailored summaries.", input: "audio transcript", output: "summary" },
  "plan-mode": { job: "Pre-build planning, no code changes.", input: "task", output: "plan" },
  // The eight Website Builder bots, in the order the work passes through them (bots/library-bot.js is the orchestrator).
  "planner": { job: "Reads the request and decides what to build: which designs, premium or plain, which sections get words.", input: "prompt + options", output: "brief", file: "bots/planner-bot.js" },
  "industry": { job: "Matches the request to an industry, its palette and page recipe.", input: "prompt + business name", output: "palette + recipe", file: "bots/industry-bot.js" },
  "designer": { job: "Chooses the look: direction, curated premium look, learned best look.", input: "palette + slot", output: "look", file: "bots/designer-bot.js" },
  "research": { job: "Gets the raw material: the words (the one copywriter model call) and the photos.", input: "brief + sections", output: "words + photos", file: "bots/site-research-bot.js" },
  "builder": { job: "Puts the page together from the words, the owner's facts and the look; runs the quality gate.", input: "content + look", output: "page", file: "bots/builder-bot.js" },
  "pulse": { job: "Watches the build: live preview, swaps, and what the quality gate saw (errors, contrast, layout).", input: "build events", output: "preview + findings", file: "bots/pulse-bot.js" },
  "review": { job: "Scores a finished page against the premium rules.", input: "page", output: "score", file: "bots/site-review-bot.js" },
  "launch": { job: "Delivers the finished design for the person to pick. Does not publish.", input: "page + score", output: "variant", file: "bots/launch-bot.js" }
};

async function recordHandoff(contextId, fromBot, toBot, summary) {
  if (!BOT_ROLES[fromBot] || !BOT_ROLES[toBot]) {
    console.warn(`[bot-orchestrator] Unregistered bot in handoff: ${fromBot} -> ${toBot}. Add it to BOT_ROLES.`);
  }
  const { error } = await supabase.from("bot_handoffs").insert({ project_id: contextId == null ? null : String(contextId), from_bot: fromBot, to_bot: toBot, payload: { summary: summary == null ? null : String(summary).slice(0, 300) } });
  if (error) console.warn("[bot-orchestrator] Failed to log handoff:", error.message);
}

async function getHandoffTrail(contextId) {
  const { data, error } = await supabase
    .from("bot_handoffs")
    .select("*")
    .eq("project_id", String(contextId))
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load handoff trail: ${error.message}`);
  return data;
}

function getRole(botName) {
  return BOT_ROLES[botName] || null;
}

function listRoles() {
  return BOT_ROLES;
}

module.exports = { recordHandoff, getHandoffTrail, getRole, listRoles, BOT_ROLES };
