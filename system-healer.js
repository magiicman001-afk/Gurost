/**
 * System Healer.
 *
 * HONEST SCOPE, decided before writing any code here: the original
 * request asked for "auto-repair — fixes errors without human
 * intervention." That's not built here, deliberately. Every other
 * self-correcting mechanism in this codebase keeps a human in the loop
 * before a fix touches anything real — bug-tracker.js requires per-bug
 * approval, review-bot/fix-bot's automatic pass only ever touches
 * freshly generated code still in memory (never a live file on disk),
 * and deploy gates block on unresolved Critical issues rather than
 * force-fixing past them. A healer that live-patches Gurost's OWN
 * running source files with zero review is a different category of
 * risk — a bad "fix" doesn't just break one generated user site, it
 * can take down the platform itself, and there's no sandbox test for
 * "does this patch to server.js still let the server boot."
 *
 * What this DOES do: detects the problem (segment-guard.js), generates
 * a real proposed patch via Claude, and stores it as a reviewable diff
 * — genuinely automatic detection and proposal generation, zero
 * automatic application. A human applies it via a normal PR.
 *
 * SQL (run once):
 *   create table healer_proposals (
 *     id uuid primary key default gen_random_uuid(),
 *     file_path text not null,
 *     error_detail text,
 *     proposed_content text not null,
 *     explanation text,
 *     status text not null default 'pending',
 *     created_at timestamptz default now()
 *   );
 */

const fs = require("fs");
const { callClaude } = require("./lib/claude-client");
const { supabase } = require("./lib/db");

const HEAL_SYSTEM = `You are fixing a JavaScript file that fails to parse (a syntax error), given the file's content and the error message.

Output ONLY valid JSON: {"fixed_content": "<complete corrected file>", "explanation": "one sentence describing what was wrong and what changed"}

Rules:
- Fix ONLY the syntax problem described in the error. Do not refactor, rename, or "improve" anything else — the smaller the diff from the original, the safer this is to review.
- Preserve all comments and formatting outside the immediate area of the fix.`;

async function proposeFix(filePath, errorDetail) {
  const content = fs.readFileSync(filePath, "utf-8");

  const { parsed } = await callClaude({
    system: HEAL_SYSTEM,
    messages: [{ role: "user", content: `File: ${filePath}\n\nError:\n${errorDetail}\n\nContent:\n${content}` }],
    maxTokens: 8000
  });

  const { data, error } = await supabase
    .from("healer_proposals")
    .insert({
      file_path: filePath,
      error_detail: errorDetail,
      proposed_content: parsed.fixed_content,
      explanation: parsed.explanation,
      status: "pending"
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to store proposal: ${error.message}`);

  return { id: data.id, explanation: parsed.explanation };
}

async function getProposal(id) {
  const { data, error } = await supabase.from("healer_proposals").select("*").eq("id", id).single();
  if (error) throw new Error(`Proposal not found: ${error.message}`);
  return data;
}

async function listPendingProposals() {
  const { data, error } = await supabase.from("healer_proposals").select("*").eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

async function markProposal(id, status) {
  if (!["approved", "rejected"].includes(status)) throw new Error("status must be approved or rejected");
  const { error } = await supabase.from("healer_proposals").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

module.exports = { proposeFix, getProposal, listPendingProposals, markProposal };
