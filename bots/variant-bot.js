const { callClaude } = require("../lib/claude-client");

const BRIEFS = [
  {
    id: "minimal",
    label: "Minimal / Editorial",
    brief: "Design direction: minimal. Generous whitespace, restrained type scale, muted neutral palette with one accent color, content-first layout. No decorative gradients or drop shadows."
  },
  {
    id: "bold",
    label: "Bold / Maximalist",
    brief: "Design direction: bold. Large expressive type, high-contrast color palette, layered visual elements, confident use of scale and color."
  },
  {
    id: "corporate",
    label: "Corporate / Trustworthy",
    brief: "Design direction: corporate. Structured grid layout, conservative palette (navy/slate/white), clear hierarchy, trust signals like testimonials and stats prominent."
  },
  {
    id: "playful",
    label: "Playful / Startup",
    brief: "Design direction: playful. Rounded shapes, bright saturated accents, friendly informal copy tone, illustrative or emoji accents where appropriate."
  }
];

function systemFor(brief, includeBranding) {
  return `You are a designer. Given a business description, generate a distinct visual direction.

${brief}

Output ONLY valid JSON, no preamble, no markdown fences:
{"html": "<complete self-contained HTML document>", "summary": "one sentence describing what you built"}

Rules:
- Single HTML file, Tailwind via CDN, inline style/script only, mobile-responsive.
- Commit fully to the assigned direction — do not hedge toward a generic middle-ground design.
- Images: never invent, guess, or hallucinate an image URL (no made-up unsplash.com,
  pexels.com, or any other external links) — a fabricated URL will show as a
  broken image to the real end user. Where the design calls for a photo, build
  a real, self-contained visual instead using inline SVG, a CSS gradient, or a
  Material Symbols icon (via <span class="material-symbols-outlined">) inside a
  colored shape. This must render correctly with zero external image requests.
${includeBranding
    ? '- Include a small, unobtrusive "Built with Gurost" text link in the footer (linking to https://gurost.com), styled to match the rest of the page.'
    : "- Do not include any Gurost branding, watermark, or attribution link — this is a white-label build."}`;
}

async function generateVariants(prompt, { includeBranding = true } = {}) {
  const settled = await Promise.allSettled(
    BRIEFS.map((b) =>
      callClaude({
        system: systemFor(b.brief, includeBranding),
        messages: [{ role: "user", content: prompt }],
        maxTokens: 8000
      }).then((r) => ({
        id: b.id,
        label: b.label,
        html: r.parsed.html,
        summary: r.parsed.summary,
        usage: r.usage
      }))
    )
  );

  const variants = [];
  const failures = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") variants.push(r.value);
    else {
      console.error(`[variant-bot] "${BRIEFS[i].id}" failed:`, r.reason.message);
      failures.push({ variant: BRIEFS[i].id, error: r.reason.message });
    }
  });

  return { variants, failures };
}

module.exports = { generateVariants, BRIEFS };
