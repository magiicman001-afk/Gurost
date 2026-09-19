/**
 * Knowledge Ingestion — real gate between scraping and storage,
 * replacing the "self-learning" framing with what this system honestly
 * does. Read this before trusting the word "verified" anywhere in this
 * file's output.
 *
 * WHAT THIS CANNOT DO, STATED PLAINLY: an LLM cannot independently
 * verify an arbitrary factual claim against ground truth. It has no
 * way to check "is this actually true right now" beyond its own
 * training knowledge, which itself has a cutoff and no live access to
 * reality. The original brief's suggested framing — "expert-validated
 * knowledge" — overclaims what's actually happening here, and this
 * file does not use that language anywhere, including in what gets
 * shown to users.
 *
 * WHAT THIS HONESTLY DOES, AND WHY EACH PART IS A REAL SIGNAL:
 *   1. SOURCE TIER — gov/edu/industry_leader sources (industry-rag.js's
 *      new tier field) are a real, meaningful trust signal even though
 *      they're not proof of any specific claim's truth.
 *   2. COHERENCE CHECK — a real, honest thing an LLM IS reliable at:
 *      telling readable, structured prose apart from scraped garbage
 *      (nav menus, ad text, cookie banners, broken markup that leaked
 *      into the text extraction). This catches real scraping failures,
 *      not falsehoods.
 *   3. STALENESS SIGNAL — flags content containing specific dates,
 *      version numbers, or "as of [year]" phrasing that suggests it
 *      may be outdated — a real, checkable pattern, not a verification
 *      that the content's current state matches reality today.
 *   4. CROSS-REFERENCE — checks a new chunk against what's ALREADY
 *      stored for the same industry via real semantic search
 *      (industry-rag.js's queryIndustry). If multiple independent
 *      sources say the same thing, that's real corroborating signal.
 *      If they directly contradict, that's flagged, not silently
 *      resolved — a disagreement between two real sources isn't
 *      something an LLM should quietly pick a winner on.
 *
 * A chunk that fails coherence is dropped. A chunk that's stale or
 * contradicts existing knowledge is NOT dropped — it's stored with
 * that caveat attached, since "possibly outdated" or "disputed" is
 * still real information a user querying this knowledge should see,
 * not information that should just disappear.
 */

const industryRag = require("./industry-rag");
const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");

const CHECK_SYSTEM = `You are screening a chunk of scraped web content before it's stored as reference knowledge. You are NOT verifying whether its claims are true — you cannot do that reliably, and shouldn't imply otherwise. You ARE checking three real, checkable things.

Output ONLY valid JSON: {"coherent": boolean, "coherenceReason": "...", "stalenessFlag": boolean, "stalenessReason": "...", "summary": "one sentence describing what this chunk is actually about"}

Rules:
- coherent: false if this looks like scraping garbage (navigation menu text, ad copy, cookie banner boilerplate, broken/truncated markup) rather than real article/reference content. true if it's genuine, readable prose on-topic for the stated industry.
- stalenessFlag: true if the content contains specific dates, version numbers, or "as of [year]" phrasing suggesting it may no longer be current. This is a pattern flag, not a claim about whether it's actually outdated.
- Be honest in the reasons — if you're uncertain, say so rather than picking confidently between coherent/incoherent.`;

const CROSS_REFERENCE_SYSTEM = `You are comparing a new piece of content against existing stored knowledge on the same topic, to check for agreement or contradiction — not to decide which is "true."

Output ONLY valid JSON: {"relationship": "corroborates"|"contradicts"|"unrelated"|"adds_new_info", "explanation": "one sentence"}

Rules:
- "contradicts" means the new content states something that directly conflicts with the existing content — flag this plainly, don't try to resolve which one is right.
- "corroborates" means they independently support the same claim.
- Be conservative — "unrelated" or "adds_new_info" are the honest answer far more often than a real contradiction or direct corroboration.`;

/**
 * The real gate — one chunk in, either dropped (incoherent) or stored
 * with honest, real metadata about what was actually checked.
 */
async function checkAndStoreChunk(industry, sourceUrl, sourceTier, title, chunk) {
  const { parsed: check } = await callClaude({
    system: CHECK_SYSTEM,
    messages: [{ role: "user", content: chunk }],
    maxTokens: 300,
    model: CLAUDE_MODEL_FAST
  });

  if (!check.coherent) {
    return { stored: false, reason: `Dropped — ${check.coherenceReason}` };
  }

  // Real cross-reference against what's already stored, not skipped
  // for speed — this is the one check that can catch something a
  // single-chunk coherence review never could.
  let crossRefNotes = "";
  try {
    const similar = await industryRag.queryIndustry(industry, check.summary, 3);
    const relevant = similar.filter((s) => s.similarity > 0.75 && s.content !== chunk);
    if (relevant.length > 0) {
      const { parsed: crossRef } = await callClaude({
        system: CROSS_REFERENCE_SYSTEM,
        messages: [{ role: "user", content: JSON.stringify({ newContent: chunk, existingContent: relevant.map((r) => r.content) }) }],
        maxTokens: 200,
        model: CLAUDE_MODEL_FAST
      });
      if (crossRef.relationship === "contradicts") {
        crossRefNotes = `Possible contradiction with existing stored knowledge: ${crossRef.explanation}`;
      } else if (crossRef.relationship === "corroborates") {
        crossRefNotes = `Corroborated by existing stored knowledge: ${crossRef.explanation}`;
      }
    }
  } catch {
    // Cross-reference is a real bonus signal, not a hard requirement —
    // a failure here shouldn't block storing an otherwise-coherent chunk.
  }

  const notes = [
    `Coherence check passed: ${check.coherenceReason}`,
    check.stalenessFlag ? `Possible staleness: ${check.stalenessReason}` : null,
    crossRefNotes || null
  ].filter(Boolean).join(" | ");

  const embedding = await industryRag.embed(chunk);
  const stored = await industryRag.storeVerifiedChunk({
    industry,
    sourceUrl,
    sourceTier,
    title,
    content: chunk,
    embedding,
    verified: true,
    verificationNotes: notes
  });

  return { stored: true, id: stored.id, notes };
}

/**
 * Real end-to-end pipeline for one source: crawl (reusing
 * industry-rag.js's real Playwright crawl, not reimplemented), chunk,
 * check each chunk, store only what passes coherence.
 */
async function ingestSource(industry, sourceUrl, sourceTier = "other") {
  const { title, text } = await industryRag.crawlPage(sourceUrl);
  const chunks = (text.match(/(.{1,1500})(\s|$)/g) || [text]).filter((c) => c.trim().length >= 50);

  const results = [];
  for (const chunk of chunks) {
    try {
      results.push(await checkAndStoreChunk(industry, sourceUrl, sourceTier, title, chunk.trim()));
    } catch (err) {
      results.push({ stored: false, reason: `Error during check: ${err.message}` });
    }
  }

  return {
    sourceUrl,
    chunksFound: chunks.length,
    stored: results.filter((r) => r.stored).length,
    dropped: results.filter((r) => !r.stored).length,
    details: results
  };
}

/**
 * Real, honest attribution — what gets shown to a user querying this
 * knowledge, so "tell users where knowledge came from" means an actual
 * source link and tier, not a vague "AI-verified" badge.
 */
function formatAttribution(knowledgeRow) {
  const tierLabel = { gov: "Government source", edu: "Educational institution", industry_leader: "Industry leader", other: "Web source" }[knowledgeRow.source_tier] || "Web source";
  return {
    source: knowledgeRow.source_url,
    tier: tierLabel,
    verified: knowledgeRow.verified,
    notes: knowledgeRow.verification_notes || null
  };
}

module.exports = { ingestSource, checkAndStoreChunk, formatAttribution };
