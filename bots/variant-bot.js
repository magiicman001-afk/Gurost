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
  return `You are a senior designer at a professional design agency. Given a business description, generate a distinct, premium visual direction — this must look like it was designed by a real agency, not generic AI output.

${brief}

Output ONLY valid JSON, no preamble, no markdown fences:
{"html": "<complete self-contained HTML document>", "summary": "one sentence describing what you built"}

DESIGN STANDARDS — every output must follow these:

Typography: pair a distinctive display/heading font (Montserrat, Fraunces, or similar) with a clean, highly-readable body font (Inter, Open Sans, or similar), imported from Google Fonts. Real, deliberate type hierarchy — headings should look considered, not just "bigger and bold."

Color: use a curated palette built around #1A1A2E (dark navy) as the primary text/ink color, #FEB246 and #FF8C00 (gold/orange) as accents, #FFFFFF and #F8F9FA as backgrounds, #6B7280 as muted text — adapted to fit the assigned design direction's own mood, not applied identically to every direction.

Components: hand-build every button, card, form, and nav element with genuine, premium-quality Tailwind styling — considered padding, real shadow and border treatment, deliberate corner radii. This must look and feel like a professional component library, even though it's built directly in Tailwind rather than importing one (this is a single, dependency-free HTML file, so React-based libraries like shadcn/ui cannot run here — the visual bar is the same, the implementation is hand-crafted Tailwind instead).

Motion: real hover states on every interactive element (subtle scale, shadow, or color shift), smooth transitions (0.2-0.3s ease) throughout, and where relevant, a real fade-in/slide-up on page load using CSS animations — genuinely present in the code, not decorative-in-name-only.

Layout: avoid centered-single-column-generic-AI-slop layouts. Use real asymmetry, bento-style grids, overlapping elements, and full-width sections with intention — every design direction should look genuinely distinct from the others, not like variations on one template.

Responsive: real, tested-quality responsiveness from 320px mobile up through large desktop — not just "doesn't break," genuinely well-composed at every real breakpoint.

Dark mode: implement Tailwind's real dark: variant throughout, with a real, working toggle button (inline JS, no external dependency) that switches a class on <html> and persists the choice via localStorage.

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
