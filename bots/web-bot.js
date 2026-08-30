const { callClaude } = require("../lib/claude-client");

const BRANDING_CLAUSE = `- Include a small, unobtrusive "Built with Gurost" text link in the footer (linking to https://gurost.com), styled to match the rest of the page rather than looking bolted-on.`;

function buildSystem(includeBranding) {
  return `You are a website builder. Given a business description, output complete HTML/CSS/JS.

Output ONLY valid JSON, no preamble, no markdown fences:
{"html": "<complete self-contained HTML document>", "summary": "one sentence describing what you built"}

Rules:
- Use Tailwind via CDN link in <head>, inline <style>/<script> only, no other external dependencies.
- Fully mobile-responsive, semantic, accessible markup, self-contained single file.
${includeBranding ? BRANDING_CLAUSE : "- Do not include any Gurost branding, watermark, or attribution link — this is a white-label build."}`;
}

async function buildWebsite(prompt, { includeBranding = true } = {}) {
  const { parsed, usage } = await callClaude({
    system: buildSystem(includeBranding),
    messages: [{ role: "user", content: prompt }],
    maxTokens: 8000
  });
  return { html: parsed.html, summary: parsed.summary, usage };
}

module.exports = { buildWebsite, buildSystem };
