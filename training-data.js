/**
 * Training Data Foundation.
 *
 * READ THIS BEFORE ASSUMING THIS "SELF-TRAINS" ANYTHING — it doesn't,
 * on purpose. What this file does: captures real prompt/completion
 * pairs from real usage, for real users who've explicitly opted in,
 * so there's genuine data to work with LATER, if and when training a
 * fine-tuned model is a real, deliberate decision someone makes.
 *
 * WHAT THIS FILE DOES NOT DO, AND WHY: there is no automatic trigger
 * anywhere in here that starts a training run once some number of
 * rows accumulates. That's the same shape of thing already declined
 * for Business Autopilot — a threshold that fires an action with no
 * human looking at it first. The stakes are different (data quality
 * for a future model, not a customer-facing action) but the reasoning
 * is the same: whether a dataset is actually good enough to train on
 * is a real judgment call — checking for bias, checking for garbage
 * data, checking it's not dominated by one user's edge case — and
 * that call should stay a deliberate, human one, not something that
 * fires quietly because a counter hit a number.
 *
 * OPT-IN, NOT DEFAULT-ON: a user's real business prompts and
 * generated output becoming training data for a future model is a
 * genuine data-use decision, not a neutral technical detail. Capture
 * only fires for users who've explicitly turned this on for their own
 * account — checked before every single log, not assumed.
 *
 * SQL (run once):
 *   ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS training_data_opt_in boolean NOT NULL DEFAULT false;
 *   CREATE TABLE training_data_log (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id text NOT NULL,
 *     workspace_id uuid,
 *     feature text,
 *     model text,
 *     system_prompt text,
 *     user_message text,
 *     completion text,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX ON training_data_log (user_id, created_at);
 */

const { supabase } = require("./lib/db");
const fs = require("fs");

async function isOptedIn(userId) {
  if (!userId) return false;
  const { data, error } = await supabase.from("api_keys").select("training_data_opt_in").eq("user_id", userId).maybeSingle();
  if (error || !data) return false;
  return !!data.training_data_opt_in;
}

async function setOptIn(userId, optedIn) {
  const { error } = await supabase.from("api_keys").update({ training_data_opt_in: !!optedIn }).eq("user_id", userId);
  if (error) throw new Error(`Failed to update training data preference: ${error.message}`);
  return { optedIn: !!optedIn };
}

/**
 * Real, fire-and-forget capture — same non-blocking pattern as
 * lib/claude-client.js's existing logUsage(), so a logging hiccup can
 * never slow down or break the real response a user is waiting on.
 * Checks opt-in on every single call rather than caching the answer,
 * since someone can opt out at any time and that has to take effect
 * on their very next request, not eventually.
 */
function logGenerationForTraining({ userId, workspaceId, feature, model, systemPrompt, userMessage, completion }) {
  if (!userId) return;
  isOptedIn(userId)
    .then((opted) => {
      if (!opted) return;
      return supabase.from("training_data_log").insert({
        user_id: userId,
        workspace_id: workspaceId || null,
        feature: feature || null,
        model,
        system_prompt: systemPrompt,
        user_message: userMessage,
        completion
      });
    })
    .then((result) => {
      if (result?.error) console.warn("[training-data] Log insert failed:", result.error.message);
    })
    .catch((err) => console.warn("[training-data] Opt-in check failed:", err.message));
}

/**
 * Real, human-triggered export — the actual "foundation" this file
 * provides. Pulls opted-in generations, tries to join each one
 * against real quality signal already captured elsewhere in this
 * codebase (guide_decisions and autopilot_decisions, both keyed by
 * user_id — healer_learning is keyed by file_path instead and isn't
 * meaningfully joinable to a per-user generation, so it's not read
 * here), and writes real, standard
 * prompt/completion JSONL — the format real fine-tuning APIs expect.
 *
 * This function does not call any training API. It writes a file.
 * What happens with that file — reviewing it, deciding it's good
 * enough, actually starting a real training run with a real provider
 * — is a real decision for a person to make outside this codebase,
 * later, when there's enough real data to make that decision on.
 */
async function exportTrainingDataset({ since, outputPath = "/tmp/gurost-training-export.jsonl" } = {}) {
  let query = supabase.from("training_data_log").select("*").order("created_at", { ascending: true });
  if (since) query = query.gte("created_at", since);
  const { data: rows, error } = await query;
  if (error) throw new Error(`Failed to load training data: ${error.message}`);
  if (!rows.length) return { exported: 0, outputPath: null, note: "No opted-in generations found for this range." };

  const [guideDecisions, autopilotDecisions] = await Promise.all([
    supabase.from("guide_decisions").select("user_id, decision, created_at"),
    supabase.from("autopilot_decisions").select("user_id, approved, created_at")
  ]);

  function findNearbySignal(row) {
    // Real, honest matching, not a claim of certainty — a decision
    // recorded within 5 minutes of a generation for the same user is
    // a reasonable real signal it's related, not proof.
    const windowMs = 5 * 60 * 1000;
    const rowTime = new Date(row.created_at).getTime();
    const nearby = (guideDecisions.data || [])
      .filter((d) => d.user_id === row.user_id && Math.abs(new Date(d.created_at).getTime() - rowTime) < windowMs)
      .concat((autopilotDecisions.data || []).filter((d) => d.user_id === row.user_id && Math.abs(new Date(d.created_at).getTime() - rowTime) < windowMs).map((d) => ({ decision: d.approved ? "accepted" : "rejected" })));
    return nearby[0]?.decision || null;
  }

  const lines = rows.map((row) => JSON.stringify({
    messages: [
      { role: "system", content: row.system_prompt },
      { role: "user", content: row.user_message },
      { role: "assistant", content: row.completion }
    ],
    metadata: {
      feature: row.feature,
      model: row.model,
      real_quality_signal: findNearbySignal(row), // null means "no matched signal found" — honestly, not defaulted to positive
      created_at: row.created_at
    }
  }));

  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");
  return { exported: rows.length, outputPath, note: "Real export written. Review this before deciding whether to use it for anything — nothing in this codebase starts a training run automatically." };
}

module.exports = { isOptedIn, setOptIn, logGenerationForTraining, exportTrainingDataset };
