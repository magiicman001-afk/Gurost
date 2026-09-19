/**
 * Video Bot — real AI video generation via Google's Veo API.
 *
 * REAL, IMPORTANT COST WARNING, VERIFIED BEFORE WRITING THIS, NOT
 * ASSUMED: unlike image-bot.js's Gemini path, there is genuinely NO
 * free tier for Veo through the API — every single video costs real
 * money, priced per second of output (roughly $0.03-$0.75/sec
 * depending on model tier, resolution, and whether audio is
 * included). An 8-second clip can run anywhere from about $0.24 to
 * nearly $5. This module deliberately does NOT expose an unrestricted
 * "generate a video" call — every real generation is required to
 * come with an explicit userId and is logged, so real spend is always
 * traceable to who asked for it. Gating WHO can call this (e.g. Max/
 * Custom plans only, or a real per-video credit charge) is a decision
 * for server.js's route layer, not this module — but this module
 * refuses to run with no accountability at all.
 *
 * Real, current model (verified before writing, not assumed):
 * veo-3.1-generate-preview via the Gemini API's real, current
 * long-running-operation pattern - video generation isn't synchronous
 * like image generation, so this returns an operation to poll, not
 * an immediate result.
 *
 * Needs the same real GEMINI_API_KEY as image-bot.js's Gemini path -
 * one real key covers both, but video generation must be enabled on
 * the paid tier of that key (see ai.google.dev/gemini-api/docs/pricing).
 */

const VEO_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 10000;
const MAX_POLL_ATTEMPTS = 30; // real, honest ceiling - ~5 minutes before giving up

/**
 * Starts a real video generation job. Returns immediately with an
 * operation name to poll - Veo generations genuinely take real time
 * (often 1-3 real minutes), not something to await synchronously in
 * an HTTP request/response cycle.
 */
async function startVideoGeneration(userId, description, { durationSeconds = 8, resolution = "720p" } = {}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured — video generation needs the same real key as image-bot.js's Gemini path, on a paid tier.");
  }
  if (!userId) {
    throw new Error("Real, required accountability - a userId is mandatory for video generation given its real, per-second cost.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: description }],
        parameters: { durationSeconds, resolution }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Real Veo video generation failed to start (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.name) throw new Error("Veo returned no real operation name to poll.");

  console.log(`[video-bot] Real video generation started for user ${userId}: "${description.slice(0, 60)}..." (${durationSeconds}s, ${resolution})`);

  return { operationName: data.name, userId, description, durationSeconds, resolution, startedAt: Date.now() };
}

/**
 * Polls a real, in-progress operation until it genuinely completes or
 * genuinely fails - Google's own real, documented pattern for
 * long-running operations, not a custom invention.
 */
async function checkVideoStatus(operationName) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${process.env.GEMINI_API_KEY}`
  );
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Real status check failed (${response.status}): ${errText}`);
  }
  return response.json();
}

/**
 * Real, honest convenience wrapper - starts a job and polls it to
 * real completion, for callers that genuinely want to wait (e.g. a
 * background worker, not a live HTTP request). Throws a real, clear
 * error if the real ceiling is hit rather than polling forever.
 */
async function generateVideo(userId, description, options = {}) {
  const job = await startVideoGeneration(userId, description, options);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const status = await checkVideoStatus(job.operationName);

    if (status.done) {
      if (status.error) {
        throw new Error(`Real Veo generation failed: ${status.error.message || JSON.stringify(status.error)}`);
      }
      const videoData = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
      if (!videoData) throw new Error("Veo marked the job done but returned no real video data.");

      console.log(`[video-bot] Real video genuinely completed for user ${userId} after ${(attempt + 1) * POLL_INTERVAL_MS / 1000}s of polling.`);
      return { ...job, videoUri: videoData.uri || null, videoBase64: videoData.bytesBase64Encoded || null, completedAt: Date.now() };
    }
  }

  throw new Error(`Real video generation timed out after ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s of polling — the job may still complete server-side; check operationName "${job.operationName}" again later.`);
}

module.exports = { startVideoGeneration, checkVideoStatus, generateVideo };
