/**
 * Nanobot Swarm — top-level entry point. Runs Segment Guards ->
 * Coordinator -> Healer (propose, never auto-apply) -> Watchdog on a
 * schedule, same node-cron mechanism lib/scheduler.js already uses for
 * the nightly Business Assistant.
 */

const cron = require("node-cron");
const coordinator = require("./swarm-coordinator");
const watchdog = require("./watchdog");

function startSwarm({ cronExpression = "*/30 * * * *", adminUserId } = {}) {
  cron.schedule(cronExpression, async () => {
    try {
      const result = await coordinator.runCycle();
      await watchdog.watch(adminUserId);
      console.log(`[nanobot-swarm] Cycle complete: ${result.reports.length} segments, ${result.escalations.length} escalation(s).`);
    } catch (err) {
      console.error("[nanobot-swarm] Cycle failed:", err.message);
    }
  });
  console.log(`[nanobot-swarm] Scheduled: "${cronExpression}" (server-local time)`);
}

async function runOnce(adminUserId) {
  const result = await coordinator.runCycle();
  const watchdogResult = await watchdog.watch(adminUserId);
  return { ...result, watchdog: watchdogResult };
}

module.exports = { startSwarm, runOnce };
