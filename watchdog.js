/**
 * Watchdog — watches the healer, not the codebase directly. Two things:
 *  1. Heartbeat: has the swarm actually run recently?
 *  2. Proposal-failure rate: if the healer is generating a lot of
 *     proposals in a short window, something is repeatedly breaking.
 */

const { supabase } = require("./lib/db");
const { notify } = require("./integrations");

const HEARTBEAT_STALE_MINUTES = Number(process.env.SWARM_HEARTBEAT_STALE_MINUTES) || 90;
const PROPOSAL_SPIKE_THRESHOLD = Number(process.env.SWARM_PROPOSAL_SPIKE_THRESHOLD) || 5;

async function checkHeartbeat() {
  const { data } = await supabase.from("swarm_runs").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return { stale: true, reason: "Swarm has never run." };

  const minutesSince = (Date.now() - new Date(data.created_at).getTime()) / 60000;
  return { stale: minutesSince > HEARTBEAT_STALE_MINUTES, minutesSince: Math.round(minutesSince) };
}

async function checkProposalRate() {
  const since = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase.from("healer_proposals").select("*", { count: "exact", head: true }).gte("created_at", since);
  return { count: count || 0, spike: (count || 0) >= PROPOSAL_SPIKE_THRESHOLD };
}

async function watch(adminUserId) {
  const [heartbeat, proposalRate] = await Promise.all([checkHeartbeat(), checkProposalRate()]);

  if (adminUserId && heartbeat.stale) {
    await notify
      .notify(adminUserId, `Nanobot swarm hasn't run in ${heartbeat.minutesSince || "a long"} min — check the cron/scheduler.`, { title: "Swarm heartbeat stale", tags: "warning" })
      .catch((err) => console.warn("[watchdog] Heartbeat alert failed:", err.message));
  }
  if (adminUserId && proposalRate.spike) {
    await notify
      .notify(adminUserId, `System Healer generated ${proposalRate.count} fix proposals in the last hour — something is repeatedly breaking.`, { title: "Healer proposal spike", tags: "rotating_light" })
      .catch((err) => console.warn("[watchdog] Proposal-spike alert failed:", err.message));
  }

  return { heartbeat, proposalRate };
}

module.exports = { watch, checkHeartbeat, checkProposalRate };
