/**
 * Personal bots — the genuinely new piece from "20 users, 1 account."
 * This is NOT a new AI engine per user; it's a thin identity/naming
 * layer over the already-built assistant-bot.js, so each workspace
 * member (see team-collaboration.js) gets a bot they can name and that
 * carries that identity through responses, rather than every member
 * sharing one undifferentiated assistant.
 *
 * SQL (run once):
 *   create table personal_bots (
 *     user_id text primary key,
 *     workspace_id uuid references workspaces(id) on delete cascade,
 *     bot_name text not null default 'Gurost',
 *     created_at timestamptz default now()
 *   );
 */

const { supabase } = require("./lib/db");
const assistantBot = require("./bots/assistant-bot");

async function nameBot(userId, workspaceId, botName) {
  const { error } = await supabase
    .from("personal_bots")
    .upsert({ user_id: userId, workspace_id: workspaceId || null, bot_name: botName });
  if (error) throw new Error(`Failed to name bot: ${error.message}`);
}

async function getBotIdentity(userId) {
  const { data } = await supabase.from("personal_bots").select("*").eq("user_id", userId).maybeSingle();
  return data || { user_id: userId, bot_name: "Gurost" };
}

/**
 * Functionally identical to calling assistantBot.handleTask directly,
 * but tags the response with the bot's name so a UI can show "Ava says:
 * ..." instead of a generic assistant voice when multiple named bots
 * exist in one workspace.
 */
async function runTask(userId, businessContext, task, options) {
  const identity = await getBotIdentity(userId);
  const result = await assistantBot.handleTask(businessContext, task, options);
  return { botName: identity.bot_name, ...result };
}

module.exports = { nameBot, getBotIdentity, runTask };
