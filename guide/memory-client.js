/**
 * "MCP memory server" swapped for a Supabase table here, on purpose.
 * MCP (Model Context Protocol) is built for LLM-client/tool discovery —
 * how Claude Desktop or Claude Code talks to local tool servers — not
 * as a general network database API for a backend service to call on
 * every request. Adding an MCP hop here would mean your own server
 * depends on a second protocol and a second running process to answer
 * "what does this user like," for no benefit over calling Supabase
 * directly, which you already have configured. Same durable-memory
 * outcome, one less moving part.
 *
 * Run this SQL in Supabase before using this module:
 *
 *   create table guide_preferences (
 *     user_id text primary key,
 *     preferences jsonb not null default '{}',
 *     updated_at timestamptz not null default now()
 *   );
 *
 *   create table guide_decisions (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     suggestion_message text not null,
 *     suggestion_type text,
 *     decision text not null check (decision in ('accepted','rejected')),
 *     note text,
 *     created_at timestamptz not null default now()
 *   );
 *   create index on guide_decisions (user_id, created_at desc);
 *
 *   -- Business Transformer additions:
 *   create table company_profiles (
 *     user_id text primary key,
 *     business_summary text not null,
 *     industry text,
 *     processes jsonb not null default '[]',
 *     structure jsonb not null default '{}',
 *     goals jsonb not null default '[]',
 *     kpis jsonb not null default '[]',
 *     updated_at timestamptz not null default now()
 *   );
 *
 *   create table transformer_suggestions (
 *     id uuid primary key default gen_random_uuid(),
 *     user_id text not null,
 *     category text,
 *     suggestion text not null,
 *     rationale text,
 *     basis text,
 *     requires_expert_review boolean not null default false,
 *     feedback text check (feedback in ('helpful','not_helpful','implemented')),
 *     feedback_note text,
 *     created_at timestamptz not null default now()
 *   );
 *   create index on transformer_suggestions (user_id, created_at desc);
 */

const { supabase } = require("../lib/db");

async function getPreferences(userId) {
  const { data, error } = await supabase
    .from("guide_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load preferences: ${error.message}`);
  return data?.preferences || {};
}

async function setPreference(userId, key, value) {
  const current = await getPreferences(userId);
  const updated = { ...current, [key]: value };
  const { error } = await supabase
    .from("guide_preferences")
    .upsert({ user_id: userId, preferences: updated, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save preference: ${error.message}`);
  return updated;
}

async function recordDecision(userId, suggestion, decision, note) {
  const { error } = await supabase.from("guide_decisions").insert({
    user_id: userId,
    suggestion_message: suggestion.message,
    suggestion_type: suggestion.type || null,
    decision,
    note: note || null
  });
  if (error) throw new Error(`Failed to record decision: ${error.message}`);
}

async function getPastDecisions(userId, limit = 20) {
  const { data, error } = await supabase
    .from("guide_decisions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load decisions: ${error.message}`);
  return data || [];
}

// ---- Business Transformer: company profile ----

async function getCompanyProfile(userId) {
  const { data, error } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load company profile: ${error.message}`);
  return data || null;
}

async function upsertCompanyProfile(userId, profile) {
  const { error } = await supabase.from("company_profiles").upsert({
    user_id: userId,
    business_summary: profile.summary,
    industry: profile.industry || null,
    processes: profile.processes || [],
    structure: profile.structure || {},
    goals: profile.goals || [],
    kpis: profile.kpis || [],
    updated_at: new Date().toISOString()
  });
  if (error) throw new Error(`Failed to save company profile: ${error.message}`);
}

// ---- Business Transformer: suggestion feedback (the actual self-learning signal) ----

async function recordTransformerSuggestion(userId, suggestion) {
  const { data, error } = await supabase
    .from("transformer_suggestions")
    .insert({
      user_id: userId,
      category: suggestion.category || null,
      suggestion: suggestion.suggestion,
      rationale: suggestion.rationale || null,
      basis: suggestion.basis || null,
      requires_expert_review: !!suggestion.requires_expert_review
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to record suggestion: ${error.message}`);
  return data.id;
}

async function getSuggestionById(suggestionId) {
  const { data, error } = await supabase
    .from("transformer_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load suggestion: ${error.message}`);
  return data;
}

async function recordTransformerFeedback(suggestionId, feedback, note) {
  const { error } = await supabase
    .from("transformer_suggestions")
    .update({ feedback, feedback_note: note || null })
    .eq("id", suggestionId);
  if (error) throw new Error(`Failed to record feedback: ${error.message}`);
}

async function getTransformerHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from("transformer_suggestions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load suggestion history: ${error.message}`);
  return data || [];
}

module.exports = {
  getPreferences,
  setPreference,
  recordDecision,
  getPastDecisions,
  getCompanyProfile,
  upsertCompanyProfile,
  recordTransformerSuggestion,
  recordTransformerFeedback,
  getTransformerHistory,
  getSuggestionById
};
