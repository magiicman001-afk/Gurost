/**
 * Gurost Business Transformer — analysis, suggestions, sketches, and
 * structuring for manufacturing/engineering businesses.
 *
 * Two things this module deliberately refuses to do, baked into the
 * system prompts themselves rather than left as a docs-only caveat:
 *
 * 1. It will not invent quantified claims ("20% faster") without the
 *    user's own numbers behind them. An LLM reasoning over a one-line
 *    business description has no basis for a specific percentage —
 *    outputting one anyway would be a confident-sounding fabrication
 *    dressed as an engineering estimate. The suggestion prompt requires
 *    a `basis` field distinguishing "the user told me this" from
 *    "general industry practice," and forbids numeric outcome claims
 *    unless real numbers were supplied.
 *
 * 2. Generated "engineering sketches" are illustrative concept art, not
 *    dimensioned technical drawings. Image models render plausible-
 *    looking machinery with physically nonsensical details — mislabeled
 *    parts, impossible mechanisms. Every sketch response carries an
 *    explicit disclaimer field; nothing here should be treated as
 *    fabrication-ready documentation.
 *
 * Self-learning, same honest framing as the Guide Bot: every suggestion
 * and its accept/reject/implemented feedback is stored in Supabase and
 * fed back into the next suggestion prompt. That's retrieval, not the
 * model's weights changing.
 */

const { callClaude } = require("../lib/claude-client");
const memory = require("../guide/memory-client");
const vectorMemory = require("../lib/vector-memory");

const ANALYSIS_SYSTEM = `You are the Gurost Business Transformer, analyzing a manufacturing or engineering business from what its owner tells you.

Output ONLY valid JSON, no preamble, no markdown fences:
{"summary": "...", "industry": "...", "processes": [{"name": "...", "description": "..."}], "structure": {"roles": [{"title": "...", "responsibility": "..."}]}, "goals": ["..."], "kpis": [{"name": "...", "description": "..."}], "clarifying_questions": ["..."]}

Rules:
- Base this strictly on what the user actually told you. Do not invent specific operational details (equipment models, cycle times, headcount, revenue) they didn't mention.
- Where you don't have enough information to say something concrete, put a question in clarifying_questions instead of guessing.
- Keep it at business/organizational level — this is not an engineering audit.`;

const SUGGESTION_SYSTEM = `You are the Gurost Business Transformer, proactively suggesting improvements for a manufacturing or engineering business.

You will receive the company profile and a history of past suggestions with the user's feedback on them.

Output ONLY valid JSON:
{"suggestions": [{"category": "process"|"structure"|"kpi"|"safety", "suggestion": "...", "rationale": "...", "basis": "...", "requires_expert_review": true|false}]}

Rules:
- "basis" must state plainly whether this is grounded in something the user specifically told you, or is general industry practice you're applying — never blur the two together.
- NEVER state a specific quantified outcome ("this will cut cycle time by 20%", "this saves $X/month") unless the user has given you the real numbers behind it. Without real data, describe the *direction* of improvement, or say what number you'd need from the user to estimate it — do not invent a percentage to sound more useful.
- Any suggestion touching a safety-critical process (heat, pressure, moving machinery, casting, structural load, electrical) MUST set requires_expert_review: true and MUST be phrased as something to discuss with a qualified engineer or safety officer — never as a ready-to-implement instruction.
- Learn from past feedback: don't repeat a suggestion the user marked not_helpful in a similar form. Weight categories they marked helpful/implemented more.
- At most 2 suggestions per call. Don't pad the list to look busy.`;

const STRUCTURE_SYSTEM = `You are the Gurost Business Transformer, helping structure a manufacturing/engineering business's workflows, roles, goals, and KPIs.

Output ONLY valid JSON:
{"workflows": [{"name": "...", "steps": ["..."]}], "roles": [{"title": "...", "responsibility": "..."}], "goals": ["..."], "kpis": [{"name": "...", "target": "...", "how_to_measure": "..."}]}

Rules:
- This is advisory business-structuring content, not a certified organizational or safety audit. Say so implicitly by staying at the level of "here's a reasonable structure to consider," not issuing directives.
- Ground suggestions in the company profile you're given; don't invent a company size or team you weren't told about.`;

async function analyzeCompany(userId, businessDescription) {
  const { parsed, usage } = await callClaude({
    system: ANALYSIS_SYSTEM,
    messages: [{ role: "user", content: businessDescription }],
    maxTokens: 2000
  });
  await memory.upsertCompanyProfile(userId, parsed);
  return { profile: parsed, usage };
}

async function suggestImprovements(userId) {
  const profile = await memory.getCompanyProfile(userId);
  if (!profile) {
    return { suggestions: [], error: "No company profile yet — call analyzeCompany first." };
  }
  const history = await memory.getTransformerHistory(userId, 15);

  let semanticMatches = [];
  try {
    semanticMatches = await vectorMemory.searchMemory(userId, profile.summary, 5);
  } catch (err) {
    // Semantic recall is an enhancement, not a requirement — proceed on
    // the recency-based history alone if pgvector/embeddings aren't
    // configured or a lookup fails.
    console.warn("[transformer-bot] Semantic memory search failed:", err.message);
  }

  const { parsed, usage } = await callClaude({
    system: SUGGESTION_SYSTEM,
    messages: [{
      role: "user",
      content: JSON.stringify({
        profile,
        pastFeedback: history.map((h) => ({ suggestion: h.suggestion, feedback: h.feedback })),
        semanticallySimilarPastFeedback: semanticMatches.map((m) => m.content)
      })
    }],
    maxTokens: 1500
  });

  const suggestions = [];
  for (const s of parsed.suggestions || []) {
    const id = await memory.recordTransformerSuggestion(userId, s);
    suggestions.push({ id, ...s });
  }

  return { suggestions, usage };
}

async function structureBusiness(userId, focusArea) {
  const profile = await memory.getCompanyProfile(userId);
  if (!profile) {
    return { error: "No company profile yet — call analyzeCompany first." };
  }
  const { parsed, usage } = await callClaude({
    system: STRUCTURE_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify({ profile, focusArea: focusArea || "general" }) }],
    maxTokens: 2000
  });
  return { structure: parsed, usage };
}

/**
 * Generates an illustrative concept sketch via OpenAI's image API.
 * Requires OPENAI_API_KEY — separate from ANTHROPIC_API_KEY, this is a
 * different provider entirely. The disclaimer in the response is not
 * decorative; treat it as load-bearing if you build a UI around this.
 */
async function generateSketch(description) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured — image generation uses OpenAI's API, separate from Claude.");

  const prompt = `Technical concept illustration, clean line-art diagram style, for internal business discussion only: ${description}. Style: schematic sketch, labeled major components, NOT a dimensioned engineering drawing.`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-image-2", prompt, size: "1024x1024" })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Image generation failed: ${JSON.stringify(data).slice(0, 300)}`);

  return {
    imageBase64: data.data[0].b64_json,
    disclaimer:
      "This is an illustrative concept sketch generated by an AI image model. It is NOT a dimensioned, engineering-accurate, or fabrication-ready drawing. Do not use it as manufacturing documentation — have a qualified engineer produce or review real technical drawings before building anything from this."
  };
}

async function recordFeedback(suggestionId, feedback, note) {
  if (!["helpful", "not_helpful", "implemented"].includes(feedback)) {
    throw new Error("feedback must be one of: helpful, not_helpful, implemented");
  }
  await memory.recordTransformerFeedback(suggestionId, feedback, note);

  // Also store in semantic memory so future suggestion generation can
  // recall similar-in-meaning past feedback, not just the most recent N
  // by timestamp — this is the actual self-learning improvement vector
  // search adds over the plain recency-based history.
  try {
    const s = await memory.getSuggestionById(suggestionId);
    if (s) {
      await vectorMemory.storeMemory(
        s.user_id,
        `Suggestion: ${s.suggestion}\nFeedback: ${feedback}${note ? ` — ${note}` : ""}`,
        { category: s.category, feedback }
      );
    }
  } catch (err) {
    // Vector memory is an enhancement on top of the Supabase record,
    // which already succeeded above — don't fail the whole feedback
    // call over an embedding/pgvector hiccup.
    console.warn("[transformer-bot] Semantic memory store failed:", err.message);
  }
}

function classifyVoiceResponse(transcript) {
  const t = (transcript || "").trim().toLowerCase();
  if (/^(yes|yeah|yep|sure|helpful|good|do it|ok|okay)\b/.test(t)) return { intent: "helpful" };
  if (/^(no|nope|not helpful|skip|not now)\b/.test(t)) return { intent: "not_helpful" };
  if (/^(done|implemented|did it|finished)\b/.test(t)) return { intent: "implemented" };
  return { intent: "custom", instruction: (transcript || "").trim() };
}

module.exports = {
  analyzeCompany,
  suggestImprovements,
  structureBusiness,
  generateSketch,
  recordFeedback,
  classifyVoiceResponse
};
