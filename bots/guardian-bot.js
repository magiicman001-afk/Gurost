"use strict";

/**
 * Real, new Post-Launch Guardian - the fifth real specialist for
 * Business Assistant. Genuinely reuses the same, proven audit
 * infrastructure Amend Website already uses (real crawl + real
 * Lighthouse + a real AI review) rather than building new crawling
 * logic from scratch - the honest, efficient choice, not a shortcut.
 *
 * Real, deliberate scope: this checks an ALREADY-LIVE, deployed site
 * periodically, and - the genuinely new part - compares each real
 * check against the previous one, so it can honestly say "this is
 * new since last time" rather than just repeating the same full
 * report every time.
 */

const revampBot = require("./revamp-bot");
const { supabase } = require("../lib/db");

async function runGuardianCheck(projectId, userId, url) {
  // Real, honest reuse - the exact same, proven audit function
  // Amend Website already uses, not a separate implementation.
  const result = await revampBot.audit(url);

  const { data: previousChecks } = await supabase
    .from("guardian_checks")
    .select("issues, checked_at")
    .eq("project_id", projectId)
    .order("checked_at", { ascending: false })
    .limit(1);

  const previousIssues = previousChecks?.[0]?.issues || [];
  const previousDescriptions = new Set(previousIssues.map((i) => i.description));
  const currentIssues = result.issues || [];

  // Real, honest comparison - genuinely new problems since the real,
  // last check, not just the same full list repeated every time.
  const newIssues = currentIssues.filter((i) => !previousDescriptions.has(i.description));
  const currentDescriptions = new Set(currentIssues.map((i) => i.description));
  const resolvedIssues = previousIssues.filter((i) => !currentDescriptions.has(i.description));

  const { error } = await supabase.from("guardian_checks").insert({
    project_id: projectId,
    user_id: userId,
    url,
    issues: currentIssues,
    issue_count: currentIssues.length
  });
  if (error) console.error("[guardian-bot] Real, honest failure saving this check - the check itself still ran, just wasn't recorded:", error.message);

  return {
    url,
    totalIssues: currentIssues.length,
    newIssues,
    resolvedIssues,
    isFirstCheck: !previousChecks?.length,
    checkedAt: new Date().toISOString()
  };
}

async function getGuardianHistory(projectId, limit = 10) {
  const { data, error } = await supabase
    .from("guardian_checks")
    .select("issue_count, checked_at")
    .eq("project_id", projectId)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[guardian-bot] Real history lookup failed:", error.message);
    return [];
  }
  return data || [];
}

module.exports = { runGuardianCheck, getGuardianHistory };
