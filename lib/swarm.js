/**
 * Swarm execution: runs N variations of a task in parallel via Claude,
 * scores the results, and returns the best one plus the full set for
 * inspection. This is a generalization of the pattern variant-bot.js
 * already uses for 4 parallel design directions — applied to any task,
 * not just website design.
 *
 * What this is NOT: the "execute → score → classify failure → adjust →
 * persist signal" continuous-learning loop described in the request.
 * That's a real, substantial system (something closer to an RL training
 * loop with a persistent policy) — this is a single-shot parallel
 * fan-out with scoring, run fresh each time it's called. It does not
 * get smarter across calls on its own. If you want the persistence
 * half of that loop, feed scored outcomes into
 * lib/vector-memory.js (already built) so future swarm runs can at
 * least retrieve similar past attempts as context — that's the
 * realistic bridge between what's here and what was described, not
 * something built automatically by this module.
 */

const { callClaude } = require("./claude-client");

const SCORE_SYSTEM = `You are scoring candidate outputs for the same task. Given the task and
several candidate results, score each 0-100 on how well it satisfies the
task, and give a one-sentence reason.

Output ONLY valid JSON: {"scores": [{"index": 0, "score": 0, "reason": "..."}]}`;

/**
 * @param {string} task - the task description sent to every swarm member
 * @param {string} system - system prompt for the generation calls
 * @param {number} slots - how many parallel attempts to run (from plan.swarmSlots)
 * @param {number} maxTokens - per-attempt token budget
 */
async function runSwarm(task, system, slots, maxTokens = 4000) {
  if (slots < 1) throw new Error("slots must be at least 1");

  const attempts = await Promise.allSettled(
    Array.from({ length: slots }, () =>
      callClaude({ system, messages: [{ role: "user", content: task }], maxTokens })
    )
  );

  const results = [];
  const failures = [];
  attempts.forEach((a, i) => {
    if (a.status === "fulfilled") results.push({ index: i, output: a.value.parsed, usage: a.value.usage });
    else failures.push({ index: i, error: a.reason.message });
  });

  if (results.length === 0) {
    throw new Error("All swarm attempts failed.");
  }
  if (results.length === 1) {
    return { best: results[0], all: results, failures, scores: null };
  }

  // Score and pick the best — a single extra Claude call, not one per pair.
  const { parsed: scoring } = await callClaude({
    system: SCORE_SYSTEM,
    messages: [{
      role: "user",
      content: JSON.stringify({ task, candidates: results.map((r) => ({ index: r.index, output: r.output })) })
    }],
    maxTokens: 800
  });

  const scored = results.map((r) => ({
    ...r,
    score: scoring.scores.find((s) => s.index === r.index)?.score ?? 0,
    reason: scoring.scores.find((s) => s.index === r.index)?.reason ?? null
  }));
  scored.sort((a, b) => b.score - a.score);

  return { best: scored[0], all: scored, failures, scores: scoring.scores };
}

module.exports = { runSwarm };
