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
 * SQL (run once):
 *   create table bot_handoffs (
 *     id bigint generated always as identity primary key,
 *     context_id text not null,
 *     from_bot text not null,
 *     to_bot text not null,
 *     summary text,
 *     created_at timestamptz default now()
 *   );
 *   create index on bot_handoffs (context_id, created_at);
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
  "plan-mode": { job: "Pre-build planning, no code changes.", input: "task", output: "plan" }
};

async function recordHandoff(contextId, fromBot, toBot, summary) {
  if (!BOT_ROLES[fromBot] || !BOT_ROLES[toBot]) {
    console.warn(`[bot-orchestrator] Unregistered bot in handoff: ${fromBot} -> ${toBot}. Add it to BOT_ROLES.`);
  }
  const { error } = await supabase.from("bot_handoffs").insert({ context_id: contextId, from_bot: fromBot, to_bot: toBot, summary });
  if (error) console.warn("[bot-orchestrator] Failed to log handoff:", error.message);
}

async function getHandoffTrail(contextId) {
  const { data, error } = await supabase
    .from("bot_handoffs")
    .select("*")
    .eq("context_id", contextId)
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
