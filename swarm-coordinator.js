/**
 * Swarm Coordinator — runs all Segment Guards, aggregates results,
 * escalates failures to the System Healer, and logs agent-to-agent
 * "conversation" (swarm_messages table) so coordination is inspectable,
 * not a black box.
 *
 * SQL (run once):
 *   create table swarm_messages (
 *     id bigint generated always as identity primary key,
 *     from_agent text not null,
 *     to_agent text not null,
 *     message text not null,
 *     created_at timestamptz default now()
 *   );
 *   create table swarm_runs (
 *     id uuid primary key default gen_random_uuid(),
 *     segment_count integer,
 *     healthy_count integer,
 *     unhealthy_count integer,
 *     escalated_count integer,
 *     created_at timestamptz default now()
 *   );
 */

const { supabase } = require("./lib/db");
const segmentGuard = require("./segment-guard");
const systemHealer = require("./system-healer");

async function logMessage(fromAgent, toAgent, message) {
  try {
    await supabase.from("swarm_messages").insert({ from_agent: fromAgent, to_agent: toAgent, message });
  } catch (err) {
    console.warn("[swarm-coordinator] Failed to log message:", err.message);
  }
}

async function runCycle() {
  await logMessage("coordinator", "guards", "Starting health check across all segments.");
  const reports = await segmentGuard.checkAllSegments();

  const unhealthy = reports.filter((r) => !r.healthy);
  await logMessage("guards", "coordinator", `${reports.length} segment(s) checked, ${unhealthy.length} unhealthy.`);

  const escalations = [];
  for (const report of unhealthy) {
    await logMessage("coordinator", "healer", `Segment ${report.segmentId} failing syntax check on ${report.failures.length} file(s) — requesting a fix proposal.`);
    for (const failure of report.failures) {
      try {
        const proposal = await systemHealer.proposeFix(failure.path, failure.error);
        escalations.push({ segmentId: report.segmentId, file: failure.path, proposalId: proposal.id });
        await logMessage("healer", "coordinator", `Proposal ${proposal.id} ready for human review on ${failure.path}.`);
      } catch (err) {
        await logMessage("healer", "coordinator", `Failed to generate a proposal for ${failure.path}: ${err.message}`);
      }
    }
  }

  const { data: run } = await supabase
    .from("swarm_runs")
    .insert({
      segment_count: reports.length,
      healthy_count: reports.length - unhealthy.length,
      unhealthy_count: unhealthy.length,
      escalated_count: escalations.length
    })
    .select("id")
    .single();

  return { runId: run?.id, reports, escalations };
}

module.exports = { runCycle, logMessage };
