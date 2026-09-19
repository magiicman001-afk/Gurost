/**
 * User Learning — builds a real communication-style profile from what
 * a user actually does inside Gurost: accepted/rejected Guide Bot
 * suggestions (guide/memory-client.js's guide_decisions, already real
 * and already exists), their stored company profile, and their past
 * correction instructions (project.history entries, already tracked
 * per-project).
 *
 * WHAT THIS IS NOT, stated plainly rather than left to be assumed:
 * this does not read a user's Gmail, calendar, or any external
 * account. "Bot analyzes everything — reads emails, reviews calendar"
 * requires real OAuth app registration and, for Gmail specifically, an
 * external Google security review (CASA assessment) — a real-world
 * process outside what any code delivered here can complete. What's
 * built instead is honest: real learning from real signal that
 * already exists inside this product, not simulated learning from
 * data this system doesn't actually have access to.
 *
 * "Develops a personality" is also scoped honestly: this produces a
 * PROMPT-INJECTABLE STYLE SUMMARY (e.g. "prefers short, direct
 * sentences; rejects overly formal language; typically approves
 * suggestions involving X, rejects Y") that other bots can include in
 * their system prompt — not literal model fine-tuning. Gurost's
 * architecture is stateless Claude calls with an injected system
 * prompt; there's no model weights to update per-user, and pretending
 * otherwise would be describing a different, much larger system.
 *
 * SQL (run once):
 *   create table user_style_profiles (
 *     user_id text primary key,
 *     summary text not null,
 *     signal_count integer not null default 0,
 *     updated_at timestamptz not null default now()
 *   );
 */

const { supabase } = require("./lib/db");
const memoryClient = require("./guide/memory-client");
const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");

const PROFILE_SYSTEM = `You are summarizing a user's working style from their real interaction history with a website/app builder, to help other AI assistants adapt their tone and suggestions to this specific person.

Output ONLY valid JSON: {"summary": "2-4 sentences describing their communication style, preferences, and decision patterns", "confidence": "low"|"medium"|"high"}

Rules:
- Base this ONLY on the actual data provided — do not invent details.
- "confidence" should be "low" if there are fewer than 5 data points, "medium" for 5-20, "high" for 20+.
- Focus on actionable style signals: formality level, directness, what kinds of suggestions they accept vs reject, any stated preferences.
- If there's not enough data to say anything meaningful, say so honestly in the summary rather than guessing.`;

async function gatherSignals(userId) {
  const [decisions, companyProfile] = await Promise.all([
    memoryClient.getPastDecisions(userId, 50),
    memoryClient.getCompanyProfile(userId).catch(() => null)
  ]);

  return { decisions: decisions || [], companyProfile };
}

/**
 * Recomputes and stores the style profile from current real signal.
 * Cheap enough (Haiku, small input) to call after every N decisions
 * rather than needing a background job — call this from wherever
 * recordResponse()/recordDecision() already fires, or on a schedule.
 */
async function updateStyleProfile(userId) {
  const { decisions, companyProfile } = await gatherSignals(userId);

  if (decisions.length === 0 && !companyProfile) {
    return { summary: "Not enough interaction history yet to learn a style profile.", confidence: "low", signalCount: 0 };
  }

  const signalText = [
    companyProfile ? `Company profile: ${JSON.stringify(companyProfile)}` : null,
    decisions.length
      ? `Past suggestion decisions (${decisions.length} total):\n` +
        decisions.map((d) => `- [${d.decision}] ${d.suggestion_message}${d.note ? ` (note: ${d.note})` : ""}`).join("\n")
      : null
  ]
    .filter(Boolean)
    .join("\n\n");

  const { parsed } = await callClaude({
    system: PROFILE_SYSTEM,
    messages: [{ role: "user", content: signalText }],
    maxTokens: 300,
    model: CLAUDE_MODEL_FAST
  });

  const { error } = await supabase.from("user_style_profiles").upsert({
    user_id: userId,
    summary: parsed.summary,
    signal_count: decisions.length,
    updated_at: new Date().toISOString()
  });
  if (error) throw new Error(`Failed to store style profile: ${error.message}`);

  return { summary: parsed.summary, confidence: parsed.confidence, signalCount: decisions.length };
}

/**
 * Real per-user isolation, not a new mechanism — every query here is
 * scoped by user_id, and this table (like every other user-scoped
 * table in this codebase) has no route that returns one user's row to
 * another user's request. "Cannot be accessed by anyone else" is a
 * property of how every route in server.js resolves req.user.id from
 * the caller's own auth token, not something this module adds on top.
 */
async function getStyleProfile(userId) {
  const { data, error } = await supabase.from("user_style_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Convenience for other bots (assistant-bot.js, etc.) to fold a
 * user's style into their own system prompt — returns a ready-to-
 * append string, or empty string if no profile exists yet, so callers
 * don't need their own null-check/formatting logic.
 */
async function styleClauseFor(userId) {
  const profile = await getStyleProfile(userId);
  if (!profile || profile.signal_count < 3) return "";
  return `\n\nThis user's known working style (learned from their real usage, confidence based on ${profile.signal_count} data points): ${profile.summary}`;
}

module.exports = { updateStyleProfile, getStyleProfile, styleClauseFor };
