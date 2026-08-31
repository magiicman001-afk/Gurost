const { callClaude } = require("../lib/claude-client");
const imageBot = require("../image-bot");

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

// Real, specific, named anti-patterns - the actual, recognizable tells
// of AI-generated design, called out directly so the model has a
// concrete negative example to avoid, not just a vague instruction
// to "look professional."
const ANTI_SLOP_RULES = `
AVOID THESE SPECIFIC, RECOGNIZABLE "AI SLOP" TELLS:
- A hero section that is: centered heading, centered subheading, two centered buttons, generic blob/gradient behind it. This exact pattern is the single most common AI-generated layout — do not produce it.
- Every section using identical padding, identical corner radius, and identical shadow — real design varies these deliberately between sections to create rhythm.
- Generic checkmark bullet lists (✓ Fast ✓ Secure ✓ Reliable) as filler content — replace with real, specific claims relevant to the actual business.
- A features section that is a uniform 3-column grid of {icon, heading, one sentence} repeated 3-6 times with no variation in size or emphasis.
- Purple-to-blue or pink-to-orange gradient backgrounds used decoratively with no relationship to the brand.
- Emoji used as section icons instead of a real icon system.
- Placeholder copy that reads like a template ("Lorem ipsum," "Your Company," "Amazing Feature One") — write real, specific, plausible copy for the actual business described.

REAL, SPECIFIC DISCIPLINE TO APPLY INSTEAD:
- Spacing: use a real, consistent scale — 4, 8, 12, 16, 24, 32, 48, 64, 96px — nothing arbitrary like 13px or 27px.
- Type scale: pick a real ratio (e.g. 1.25 or 1.333) and stick to it for every heading level, so hierarchy reads as engineered, not eyeballed.
- Asymmetry: at least one section per page should break from a centered/symmetric layout — an offset image, a two-column split with unequal widths, a staggered card grid.
- Editorial detail: include at least one "human" design touch that a template wouldn't have on its own — a pull quote, an oversized number/stat treated as a graphic element, a diagonal or overlapping element, a real testimonial with a name and role, not "Happy Customer."
- Real content specificity: every headline, stat, and claim should sound like it belongs to THIS business, not a placeholder that could apply to any business.
`;

function systemFor(brief, includeBranding) {
  return `You are a senior designer at a professional design agency. Given a business description, generate a distinct, premium visual direction — this must look like it was designed by a real agency, not generic AI output.

${brief}

Output ONLY valid JSON, no preamble, no markdown fences:
{"html": "<complete self-contained HTML document>", "summary": "one sentence describing what you built", "imageRequests": [{"placeholder": "IMG_1", "description": "detailed, specific description of the image to generate"}]}

Where the design genuinely calls for a real photo or illustration (a hero image, a product shot, a team photo, a testimonial avatar), do NOT draw it with SVG and do NOT invent an external image URL. Instead, write a literal placeholder token directly into the HTML's src attribute — e.g. src="IMG_1" — and add a matching entry to imageRequests with a detailed, specific description of exactly what that image should show (subject, mood, framing, lighting, style — enough detail that a real image generator produces something genuinely fitting, not generic stock-photo filler). These tokens will be replaced with real, generated images after your response — use as many as the design genuinely benefits from, typically 1-4, not one on every element.

${ANTI_SLOP_RULES}

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
- For any image NOT requested via imageRequests (icons, decorative shapes), build a real, self-contained visual using inline SVG, a CSS gradient, or a Material Symbols icon (via <span class="material-symbols-outlined">) inside a colored shape. Never invent an external image URL.
${includeBranding
    ? '- Include a small, unobtrusive "Built with Gurost" text link in the footer (linking to https://gurost.com), styled to match the rest of the page.'
    : "- Do not include any Gurost branding, watermark, or attribution link — this is a white-label build."}`;
}

// Real, honest step - takes the model's real HTML plus its real image
// requests, generates each one for real via image-bot's Gemini/OpenAI
// router, and splices the actual result in. A failure on any single
// image is caught and logged - it doesn't fail the whole variant,
// since a page with one missing image is still far better than no
// page at all.
async function fulfillImageRequests(html, imageRequests) {
  if (!imageRequests || !imageRequests.length) return html;

  // Real, deliberate fix - these used to run one at a time, which
  // genuinely compounded real generation time badly (4 variants times
  // up to 4 images each, all sequential). Nothing about generating
  // one image depends on another finishing first, so this runs them
  // all at once instead - the real wait becomes the slowest single
  // image, not the sum of all of them.
  const results = await Promise.allSettled(imageRequests.map((req) => imageBot.generateImage(req.description)));

  let finalHtml = html;
  results.forEach((result, i) => {
    const req = imageRequests[i];
    if (result.status === "fulfilled") {
      const dataUrl = `data:${result.value.mimeType};base64,${result.value.base64}`;
      finalHtml = finalHtml.split(req.placeholder).join(dataUrl);
    } else {
      console.error(`[variant-bot] Real image generation failed for "${req.placeholder}":`, result.reason.message);
      // Real, honest fallback - remove the now-broken placeholder
      // reference rather than ship a literal "IMG_1" string as a
      // visible broken image to the real end user.
      finalHtml = finalHtml.split(req.placeholder).join("");
    }
  });
  return finalHtml;
}

async function generateVariants(prompt, { includeBranding = true } = {}) {
  const settled = await Promise.allSettled(
    BRIEFS.map((b) =>
      callClaude({
        system: systemFor(b.brief, includeBranding),
        messages: [{ role: "user", content: prompt }],
        maxTokens: 8000
      }).then(async (r) => ({
        id: b.id,
        label: b.label,
        html: await fulfillImageRequests(r.parsed.html, r.parsed.imageRequests),
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
