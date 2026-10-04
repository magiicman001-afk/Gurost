const { callClaude } = require("../lib/claude-client");
const imageBot = require("../image-bot");
const { repairInlineScripts } = require("../lib/script-repair");
const { condenseForReview } = require("../lib/page-condense");
const { businessInfoPrompt } = require("../lib/business-info");
const { modelForTier } = require("../lib/tier-router");
const { designPromptLines } = require("../lib/industry-design");
const { parseVariantResponse, VariantParseError } = require("../lib/variant-response");
const { createStreamPreview } = require("../lib/stream-preview");
const security = require("../security");

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

// Used when the prompt matches no industry in lib/industry-design.js.
const DEFAULT_TYPOGRAPHY = `Typography: pair a distinctive display/heading font (Montserrat, Fraunces, or similar) with a clean, highly-readable body font (Inter, Open Sans, or similar), imported from Google Fonts. Real, deliberate type hierarchy — headings should look considered, not just "bigger and bold."`;
const DEFAULT_COLOR = `Color: use a curated palette built around #1A1A2E (dark navy) as the primary text/ink color, #FEB246 and #FF8C00 (gold/orange) as accents, #FFFFFF and #F8F9FA as backgrounds, #6B7280 as muted text — adapted to fit the assigned design direction's own mood, not applied identically to every direction.`;

// Industry palette + fonts for this prompt, or null for the defaults.
// Matched on the user's own prompt only, never the memory-augmented
// one, so an earlier project's industry can't leak into this build.
function industryDesignFor(prompt) {
  const design = designPromptLines(prompt);
  console.log(`[variant-bot] Industry design: ${design ? design.industry : "none matched, using default palette"}`);
  return design;
}

function systemFor(brief, includeBranding, design) {
  return `You are a senior designer at a professional design agency. Given a business description, generate a distinct, premium visual direction — this must look like it was designed by a real agency, not generic AI output.

${brief}

OUTPUT FORMAT: reply with the complete HTML document and nothing else - start at <!DOCTYPE html>, end at </html>. No JSON, no markdown fences, no commentary before or after. Inside <head>, add <meta name="gurost:summary" content="..."> holding one sentence that describes what you built.

Where the design genuinely calls for a real photo or illustration (a hero image, a product shot, a team photo, a testimonial avatar), do NOT draw it with SVG and do NOT invent an external image URL. Instead use an <img> whose src is a placeholder token (IMG_1, IMG_2, ...), and give that tag two extra attributes: data-gurost-image holding the image brief, and data-gurost-image-role holding its importance. The brief must say exactly what the image should show (subject, mood, framing, lighting, style — enough detail that a real image generator produces something genuinely fitting, not generic stock-photo filler). The importance is one of: hero (the single main visual), featured (at most two key product or work shots), secondary (supporting photos), decorative (textures, backgrounds, avatars). Write alt as a short literal description of the photo (e.g. "sourdough loaf on a wooden board") - it is also used to search stock photos. Placeholders only work in an <img> src, not in CSS. They are replaced with real images after your response — use as many as the design genuinely benefits from, typically 2-6, not one on every element.

Where moving footage genuinely lifts the design (a full-bleed hero background loop, an atmosphere band between sections, a behind-the-scenes or process clip), use a video placeholder: a <video> element whose own src attribute is a token (VID_1, VID_2, ...), with a data-gurost-video attribute holding 2-5 plain words to search stock footage with (e.g. "baker kneading dough", "city skyline night"). It is replaced with a real stock clip and poster frame after your response. Background and decorative videos must be autoplay, muted, loop and playsinline with no controls, sit behind a dark or brand-coloured overlay so text on top stays readable, and live inside a container that already has a fitting background colour (if no clip is found the video is removed and that colour remains). A clip people should watch gets controls and is not autoplayed. Use 1-3 videos when the user asks for video or motion, otherwise 0-2; never put essential content only inside a video.

${ANTI_SLOP_RULES}

DESIGN STANDARDS — every output must follow these:

${design?.typography || DEFAULT_TYPOGRAPHY}

${design?.color || DEFAULT_COLOR}

Components: hand-build every button, card, form, and nav element with genuine, premium-quality Tailwind styling — considered padding, real shadow and border treatment, deliberate corner radii. This must look and feel like a professional component library, even though it's built directly in Tailwind rather than importing one (this is a single, dependency-free HTML file, so React-based libraries like shadcn/ui cannot run here — the visual bar is the same, the implementation is hand-crafted Tailwind instead).

Motion: real hover states on every interactive element (subtle scale, shadow, or color shift), smooth transitions (0.2-0.3s ease) throughout, and where relevant, a real fade-in/slide-up on page load using CSS animations — genuinely present in the code, not decorative-in-name-only.

Layout: avoid centered-single-column-generic-AI-slop layouts. Use real asymmetry, bento-style grids, overlapping elements, and full-width sections with intention — every design direction should look genuinely distinct from the others, not like variations on one template.
${design?.layout ? `\n${design.layout}\n` : ""}
Responsive: real, tested-quality responsiveness from 320px mobile up through large desktop — not just "doesn't break," genuinely well-composed at every real breakpoint.

Dark mode: implement Tailwind's real dark: variant throughout, with a real, working toggle button (inline JS, no external dependency) that switches a class on <html> and persists the choice via localStorage. Wrap every localStorage read/write in try/catch - the page is previewed in a sandboxed frame where localStorage throws.

COMPLETE WEBSITE - this must be a finished, launch-ready site, never a hero-only mockup:
- Sticky header navigation linking to every section by in-page anchor (smooth scroll), with a working mobile menu toggle.
- These sections, each with real, specific content for this business: a hero with a primary and a secondary call to action; services or features; about / our story; the core offering (menu, products, pricing, practice areas - whatever fits the business); testimonials or other social proof; a contact section; a footer.
- Contact form with labelled name, email and message fields, required-field validation, and an inline success message shown by JS on submit without a page reload. Add address, opening hours and phone where they fit the business.
- Footer with section links, contact details, social links and a copyright line.
- Every button and link must do something real: scroll to a section, focus the form, or submit it. No dead "#" links.
${design?.mustHaves ? `- Industry must-haves for this business: ${design.mustHaves}\n` : ""}
Technical checklist: load Tailwind from its CDN script tag, and load the Google Fonts and Material Symbols stylesheets you use, all in <head> - icons and styling break without them.

Rules:
- Single HTML file, Tailwind via CDN, inline style/script only, mobile-responsive.
- Commit fully to the assigned direction — do not hedge toward a generic middle-ground design.
- For any image NOT requested via imageRequests (icons, decorative shapes), build a real, self-contained visual using inline SVG, a CSS gradient, or a Material Symbols icon (via <span class="material-symbols-outlined">) inside a colored shape. Never invent an external image URL.
${includeBranding
    ? '- Include a small, unobtrusive "Built with Gurost" text link in the footer (linking to https://gurost.com), styled to match the rest of the page.'
    : "- Do not include any Gurost branding, watermark, or attribution link — this is a white-label build."}`;
}

// Full raw reply to the logs, chunked so long pages survive log-line limits.
function logRawReply(variantId, err) {
  const raw = String(err.raw ?? "");
  const CHUNK = 4000;
  const parts = Math.max(1, Math.ceil(raw.length / CHUNK));
  console.error(`[variant-bot] "${variantId}" reply unusable: ${err.reason} (${raw.length} chars, raw reply follows in ${parts} part(s))`);
  for (let i = 0; i < parts; i++) console.error(`[variant-bot raw ${variantId} ${i + 1}/${parts}] ${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`);
}

// One design call, parsed by lib/variant-response.js. An unusable reply
// is logged in full and retried once with the specific problem named;
// any other error (network, credits, leak check) is not retried here.
// Retries stream into nothing: the live preview already holds the first
// attempt's partial page, and streaming keeps the inactivity timeout on.
const DISCARD_STREAM = () => {};

async function generateDesign({ system, content, plan, variantId, onStream, onRetry }) {
  const call = (userContent, stream) => callClaude({
    system,
    parse: parseVariantResponse,
    messages: [{ role: "user", content: userContent }],
    maxTokens: 32000,
    model: modelForTier(plan, { complex: true }),
    onStream: stream
  });
  try {
    return await call(content, onStream); // only the first attempt streams to the live preview
  } catch (err) {
    if (err.idleTimeout) {
      // Stalled (no output for 90s): one fresh attempt. If that stalls or
      // fails too, the error reaches the caller and the build finishes
      // with the other designs.
      console.warn(`[variant-bot] "${variantId}" stalled, retrying:`, err.message);
      if (onRetry) onRetry(err);
      return await call(content, DISCARD_STREAM);
    }
    if (!(err instanceof VariantParseError)) throw err;
    logRawReply(variantId, err);
    try {
      return await call(`${content}\n\n(Your previous reply for this design could not be used: ${err.reason} Reply again with ONLY the complete HTML document, from <!DOCTYPE html> to </html>, with nothing before or after it.)`);
    } catch (retryErr) {
      if (retryErr instanceof VariantParseError) logRawReply(`${variantId} retry`, retryErr);
      throw retryErr;
    }
  }
}

// Live preview coordination for one staged build. All four designs
// stream, but the white panel shows one: the first to finish a section
// becomes the "lead", and only its checkpoints are broadcast (as
// "designing"/"partial" with the page so far and the new sections'
// labels). If the lead fails, the next design to finish a section takes
// over. Streamed text is shown before callClaude's own leak check runs,
// so every checkpoint is leak-checked first; a design that trips it
// stops streaming.
// The white panel updates at most this often: one clean swap per update
// instead of a redraw per finished section (that flickered). The first
// section still shows as soon as it exists.
const LIVE_PREVIEW_INTERVAL_MS = Number(process.env.LIVE_PREVIEW_INTERVAL_MS) || 10000;
// A finished site is typically 40-55KB; streamed size against this gives
// the "% complete" shown while building (held at 95 until it's done).
const TYPICAL_SITE_CHARS = 48000;

function createLivePreview(notify, { minIntervalMs = LIVE_PREVIEW_INTERVAL_MS, now = Date.now } = {}) {
  let leadId = null;
  let thinkingAnnounced = false;
  const stopped = new Set();
  const previews = new Map();
  return {
    streamFor(brief, system) {
      const guarded = security.withGuardrail(system);
      const preview = createStreamPreview({
        minIntervalMs,
        now,
        onCheckpoint: ({ html, blocks, newBlocks, text, final }) => {
          if (stopped.has(brief.id)) return;
          if (security.detectPromptLeak(text, guarded)) { stopped.add(brief.id); if (leadId === brief.id) leadId = null; return; }
          if (leadId === null) leadId = brief.id;
          if (leadId !== brief.id) return;
          notify("designing", "partial", {
            variantId: brief.id,
            label: brief.label,
            html,
            sections: newBlocks.map((s) => s.label),
            sectionCount: blocks.length,
            progress: final ? 100 : Math.min(95, Math.round((text.length / TYPICAL_SITE_CHARS) * 100))
          });
        }
      });
      previews.set(brief.id, preview);
      return ({ content, reasoning }) => {
        if (reasoning && !thinkingAnnounced && leadId === null) {
          thinkingAnnounced = true;
          notify("designing", "thinking", { variantId: brief.id, label: brief.label });
        }
        preview.append(content);
      };
    },
    release(variantId) {
      if (leadId === variantId) leadId = null;
      previews.delete(variantId);
    },
    // The design's stream is complete: its last sections show now.
    finish(variantId) {
      previews.get(variantId)?.flush();
      previews.delete(variantId);
    }
  };
}

// Models sometimes write more src="IMG_n" slots than they list in
// imageRequests; nothing fills those, so drop the <img> rather than ship
// a broken image.
function stripUnfilledImages(html) {
  return html.replace(/<img\b[^>]*\bsrc=["']IMG_\d+["'][^>]*>/g, "");
}

// Last pass over a finished page: no IMG_n / VID_n may survive anywhere -
// the browser would request "<page url>/IMG_1" (a console error and a
// broken image). Covers <img> slots, a video poster="IMG_1" (seen when
// its image failed), srcset/data-src, CSS url(IMG_1) and stray text.
function stripLeftoverPlaceholders(html) {
  return stripUnfilledImages(html)
    .replace(/\s(?:poster|src|srcset|data-src|data-bg|href)=(["'])[^"']*\b(?:IMG|VID)_\d+\b[^"']*\1/g, "")
    .replace(/url\(\s*(["']?)(?:IMG|VID)_\d+\1\s*\)/g, "none")
    .replace(/\b(?:IMG|VID)_\d+\b/g, "");
}

// Image routing, cheapest first (per image, in this order):
//   1. Pixabay stock photo - free (image-bot.searchImage; stored in
//      project-assets, never hotlinked).
//   2. FLUX.2 Klein via OpenRouter - ~$0.015, for anything Pixabay has no
//      match for (image-bot.generateFluxImageUrl).
//   3. Gemini - ~$0.039, only when FLUX fails, and not while paused.
// Generated images (FLUX + Gemini) are capped per design; images past
// the cap, or that no source could supply, are dropped rather than left
// broken - and reported. Each design reports which source made each
// image and what it cost against an all-Gemini build.
const GENERATED_MAX_PER_DESIGN = 4;
const COST_USD = { pixabay: 0, flux: 0.015, gemini: 0.039 };
// After a payment or quota failure (402 / quota / billing), Gemini is not
// called again for a while: every design skips straight past it instead
// of each waiting for the same 402.
const GEMINI_PAUSE_MS = 10 * 60 * 1000;
let geminiPausedUntil = 0;
const isGeminiOutOfCredit = (err) => /\b402\b|quota|billing|payment|RESOURCE_EXHAUSTED|No real image generation provider/i.test(String(err?.message || err));

async function geminiImage(description) {
  if (Date.now() < geminiPausedUntil) throw new Error("Gemini paused after a payment/quota error");
  try {
    return await imageBot.generateImageUrl(description);
  } catch (err) {
    if (isGeminiOutOfCredit(err)) geminiPausedUntil = Date.now() + GEMINI_PAUSE_MS;
    throw err;
  }
}
const ROLE_ORDER = { hero: 0, featured: 1, secondary: 2, decorative: 3 };
// FLUX frames wide shots for heroes and backgrounds, 4:3 for the rest.
const fluxAspect = (role) => (role === "hero" || role === "decorative" ? "16:9" : "4:3");

// Short stock-photo search query: the alt text when it says something,
// else the start of the image brief.
function stockQuery(req) {
  const words = (s) => String(s || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter(Boolean);
  const alt = words(req.alt);
  return (alt.length >= 2 ? alt : words(req.description)).slice(0, 6).join(" ");
}

function replacePlaceholder(html, placeholder, url) {
  return html.replace(new RegExp(`\\b${placeholder}\\b`, "g"), url); // \b: IMG_1 must not hit IMG_10
}

// Stock photo terms ask for credit; one small line at the end of the footer.
function addPhotoCredits(html, credits) {
  if (!credits.length) return html;
  const label = credits.some((c) => /^Video /.test(c)) ? "Photos & video" : "Photos";
  const line = `<p style="font-size:12px;opacity:.7;margin-top:12px">${label}: ${[...new Set(credits)].join(" · ")}</p>`;
  const at = html.toLowerCase().lastIndexOf("</footer>");
  if (at !== -1) return html.slice(0, at) + line + html.slice(at);
  return html.replace(/<\/body>/i, `${line}</body>`);
}

// Stock videos (Pixabay) for VID_n placeholders. A found clip gets its
// poster frame and preload="metadata"; a <video> with no clip is
// removed whole, so the page never shows a broken player.
const MAX_VIDEOS_PER_DESIGN = 3;

function removeVideoElement(html, placeholder) {
  const at = html.search(new RegExp(`\\b${placeholder}\\b`));
  if (at === -1) return html;
  const start = html.toLowerCase().lastIndexOf("<video", at);
  const close = html.toLowerCase().indexOf("</video>", at);
  if (start === -1 || close === -1) return html;
  return html.slice(0, start) + html.slice(close + "</video>".length);
}

async function fulfillVideoRequests(html, videoRequests) {
  let out = html;
  const credits = [];
  const wanted = (videoRequests || []).slice(0, MAX_VIDEOS_PER_DESIGN);
  const results = await Promise.allSettled(wanted.map((r) => imageBot.searchVideo(r.query)));
  wanted.forEach((req, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value?.url) {
      // poster="IMG_n" counts as no poster - the image behind it may fail.
      out = out.replace(new RegExp(`<video\\b[^>]*\\b${req.placeholder}\\b[^>]*>`), (tag) => tag.replace(/\s+poster=(["'])(?:IMG|VID)_\d+\1/, ""));
      out = out.replace(new RegExp(`(<video\\b[^>]*?)\\bsrc=(["'])${req.placeholder}\\2`), (m, open) =>
        `${open}src="${r.value.url}"${r.value.poster && !/\bposter=/.test(open) ? ` poster="${r.value.poster}"` : ""} preload="metadata"`);
      out = replacePlaceholder(out, req.placeholder, r.value.url); // a <source src="VID_n"> inside the video
      credits.push(r.value.credit);
    } else {
      if (r.status === "rejected") console.error(`[variant-bot] Stock video search failed for "${req.query}":`, r.reason.message);
      out = removeVideoElement(out, req.placeholder);
    }
  });
  // Placeholders past the cap, or never listed: no clip, no element.
  for (const m of out.match(/\bVID_\d+\b/g) || []) out = removeVideoElement(out, m);
  return { html: out, credits, found: credits.length };
}

// onImageStart({ gemini, stock }) reports the plan before work starts
// (every image starts on Pixabay now, so gemini is 0).
// onNote({ kind, ... }) reports what happened:
//   "image-sources" { pixabay, flux, gemini, dropped, cost, allGeminiCost }
//   "image-dropped" { count, reason } - hero/featured images nobody could supply.
async function fulfillImageRequests(html, imageRequests, onImageStart, extraCredits = [], onNote = () => {}) {
  if (!imageRequests || !imageRequests.length) {
    if (onImageStart) onImageStart({ gemini: 0, stock: 0 });
    return addPhotoCredits(stripLeftoverPlaceholders(html), extraCredits);
  }

  const ordered = [...imageRequests].sort((a, b) => (ROLE_ORDER[a.role] ?? 2) - (ROLE_ORDER[b.role] ?? 2));
  if (onImageStart) onImageStart({ gemini: 0, stock: ordered.length });

  let finalHtml = html;
  const credits = [...extraCredits];
  const tally = { pixabay: 0, flux: 0, gemini: 0, dropped: 0, cost: 0 };

  // 1. Pixabay for every image, in parallel.
  const stock = await Promise.allSettled(ordered.map((r) => imageBot.searchImage(stockQuery(r))));
  const missing = [];
  ordered.forEach((req, i) => {
    const r = stock[i];
    if (r.status === "fulfilled" && r.value?.url) {
      finalHtml = replacePlaceholder(finalHtml, req.placeholder, r.value.url);
      if (r.value.credit) credits.push(r.value.credit);
      tally.pixabay++;
    } else missing.push(req);
  });

  // 2. FLUX for what Pixabay couldn't supply (most important first, capped).
  const toGenerate = missing.slice(0, GENERATED_MAX_PER_DESIGN);
  const overCap = missing.slice(GENERATED_MAX_PER_DESIGN);
  const flux = await Promise.allSettled(toGenerate.map((r) => imageBot.generateFluxImageUrl(r.description, { aspectRatio: fluxAspect(r.role) })));
  const fluxFailed = [];
  toGenerate.forEach((req, i) => {
    const r = flux[i];
    if (r.status === "fulfilled" && r.value?.url) {
      finalHtml = replacePlaceholder(finalHtml, req.placeholder, r.value.url);
      tally.flux++;
      tally.cost += r.value.cost || COST_USD.flux;
    } else {
      console.error(`[variant-bot] FLUX image failed for "${req.placeholder}":`, r.reason?.message);
      fluxFailed.push(req);
    }
  });

  // 3. Gemini, last resort (skipped while paused after a 402).
  const gemini = await Promise.allSettled(fluxFailed.map((r) => geminiImage(r.description)));
  const unfilled = [...overCap];
  fluxFailed.forEach((req, i) => {
    const r = gemini[i];
    if (r.status === "fulfilled") {
      finalHtml = replacePlaceholder(finalHtml, req.placeholder, r.value);
      tally.gemini++;
      tally.cost += COST_USD.gemini;
    } else {
      console.error(`[variant-bot] Gemini image failed for "${req.placeholder}":`, r.reason.message);
      unfilled.push(req);
    }
  });

  tally.dropped = unfilled.length;
  tally.cost = Math.round(tally.cost * 1000) / 1000;
  onNote({ kind: "image-sources", ...tally, allGeminiCost: Math.round(ordered.length * COST_USD.gemini * 1000) / 1000 });
  const droppedKey = unfilled.filter((r) => r.role === "hero" || r.role === "featured").length;
  if (droppedKey) onNote({ kind: "image-dropped", count: droppedKey, reason: "no Pixabay match and image generation failed" });

  return addPhotoCredits(stripLeftoverPlaceholders(finalHtml), credits);
}

// Videos and images for one parsed design. onStart({ gemini, stock, videos });
// onNote - see fulfillImageRequests.
async function fulfillMedia(parsed, onStart, onNote) {
  const videos = (parsed.videoRequests || []).slice(0, MAX_VIDEOS_PER_DESIGN).length;
  const v = await fulfillVideoRequests(parsed.html, parsed.videoRequests);
  const html = await fulfillImageRequests(v.html, parsed.imageRequests, onStart && ((plan) => onStart({ ...plan, videos })), v.credits, onNote);
  // An apostrophe in a single-quoted JS string ("Couldn't...") breaks a
  // site's whole script - its form and menu stop working.
  const scripts = repairInlineScripts(html);
  if (scripts.repaired || scripts.broken) console.warn(`[variant-bot] Inline scripts: ${scripts.repaired} repaired, ${scripts.broken} still invalid`);
  return scripts.html;
}

async function generateVariants(prompt, { includeBranding = true, plan } = {}) {
  const design = industryDesignFor(prompt);
  const settled = await Promise.allSettled(
    BRIEFS.map((b) =>
      generateDesign({ system: systemFor(b.brief, includeBranding, design), content: prompt, plan, variantId: b.id }).then(async (r) => ({
        id: b.id,
        label: b.label,
        html: await fulfillMedia(r.parsed),
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

/**
 * Real, staged version of generateVariants - same real, parallel
 * Claude calls underneath, but genuinely reports progress as each one
 * actually finishes, rather than waiting silently for all four before
 * saying anything. `onStage(stage, status, data)` fires "running"
 * once at the very start, then "complete" for each real variant the
 * moment it's genuinely done (not simulated - these resolve in
 * whatever real order the actual API calls finish in).
 */
// Real, genuine verification - the actual start of "Done means
// Done" across Gurost. This used to mark a variant complete purely
// because the AI call itself didn't throw - a real HTML document
// that's empty, truncated, or missing its closing tags would still
// have been called "done." This actually checks the real result
// before ever claiming success.
function verifyRealHtml(html) {
  if (!html || typeof html !== "string") return { ok: false, reason: "No real HTML was returned at all." };
  const trimmed = html.trim();
  if (trimmed.length < 200) return { ok: false, reason: "The real output is too short to be a genuine webpage." };
  if (!/<html[\s>]/i.test(trimmed)) return { ok: false, reason: "Missing a real <html> tag - not a complete document." };
  if (!/<\/html>\s*$/i.test(trimmed)) return { ok: false, reason: "The real document appears to be cut off - no closing </html> tag." };
  if (!/<body[\s>]/i.test(trimmed)) return { ok: false, reason: "Missing a real <body> tag." };
  return { ok: true };
}

// businessInfo: normalized by lib/business-info (null = the user skipped -
// placeholders, not invented details).
async function generateVariantsStaged(prompt, { includeBranding = true, onStage, userId, plan, businessInfo = null } = {}) {
  const notify = (stage, status, data) => onStage && onStage(stage, status, data);

  notify("understanding", "running");

  // Real, genuine "memory-first" - this used to only exist in
  // Business Assistant. A returning user's actual, real, recent
  // activity across Gurost is now folded in here too, so the builder
  // isn't a genuine blank page for someone who's used Gurost before.
  // Real, honest, additive-only - if this fails or userId isn't
  // given (a brand-new user has no real history yet, which is fine),
  // generation continues exactly as before.
  let effectivePrompt = prompt;
  if (userId) {
    try {
      const { data: recentHistory } = await require("../lib/db").supabase
        .from("pulse_learning_log")
        .select("action_type, prompt")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (recentHistory && recentHistory.length) {
        effectivePrompt = `${prompt}\n\n(This user's real, recent activity on Gurost, for genuine context - only use this if it's actually relevant to the current request, don't force it in: ${recentHistory.map((h) => h.prompt.slice(0, 100)).join("; ")})`;
      }
    } catch (err) {
      console.error("[variant-bot] Real memory lookup failed, continuing without it:", err.message);
    }
  }

  notify("understanding", "complete", { prompt });

  const design = industryDesignFor(prompt);
  notify("designing", "running", design ? { industry: design.industry, fonts: design.fonts, palette: design.palette } : undefined);
  const variants = [];
  const failures = [];
  const live = createLivePreview(notify);
  // Image sources across the whole build, for the cost summary at the end.
  const media = { pixabay: 0, flux: 0, gemini: 0, dropped: 0, cost: 0, allGeminiCost: 0 };

  const promises = BRIEFS.map((b) => {
    const system = systemFor(b.brief, includeBranding, design);
    const onRetry = () => {
      live.release(b.id); // its half-built page stops leading the preview
      notify("designing", "variant-retrying", { variantId: b.id, label: b.label, reason: "no response for 90s" });
    };
    const content = `${effectivePrompt}\n\n${businessInfoPrompt(businessInfo)}`;
    return generateDesign({ system, content, plan, variantId: b.id, onStream: live.streamFor(b, system), onRetry })
      .then(async (r) => {
        live.finish(b.id);
        const html = await fulfillMedia(r.parsed, ({ gemini, stock, videos }) => {
          notify("designing", "images-running", { variantId: b.id, label: b.label, count: gemini + stock, gemini, stock, videos });
        }, (note) => {
          if (note.kind === "image-sources") for (const k of Object.keys(media)) media[k] += note[k] || 0;
          notify("designing", "images-note", { variantId: b.id, label: b.label, ...note });
        });

        // Real, genuine check - a variant only counts as real success
        // if this actually passes, not just because nothing crashed.
        const verification = verifyRealHtml(html);
        if (!verification.ok) {
          throw new Error(`Real verification failed: ${verification.reason}`);
        }

        const variant = { id: b.id, label: b.label, html, summary: r.parsed.summary, usage: r.usage, verified: true };
        variants.push(variant);
        // Real, genuine progress - this fires the exact moment THIS
        // specific variant actually finishes AND is genuinely
        // verified, not on a fixed timer, not on hope.
        notify("designing", "variant-complete", { variantId: b.id, label: b.label, summary: r.parsed.summary, variant });
        return variant;
      })
      .catch((err) => {
        console.error(`[variant-bot] "${b.id}" failed:`, err.message);
        failures.push({ variant: b.id, error: err.message });
        live.release(b.id); // another design takes over the live preview
        notify("designing", "variant-failed", { variantId: b.id, label: b.label, error: err.message });
      });
  });

  await Promise.allSettled(promises);
  const round = (n) => Math.round(n * 1000) / 1000;
  const summary = { ...media, cost: round(media.cost), allGeminiCost: round(media.allGeminiCost) };
  summary.savedPct = summary.allGeminiCost ? Math.round((1 - summary.cost / summary.allGeminiCost) * 100) : 0;
  console.log("[variant-bot] Image sources this build:", JSON.stringify(summary));
  notify("designing", "media-summary", summary);
  notify("designing", "complete", { count: variants.length });

  notify("done", "complete", { variants, failures });
  return { variants, failures };
}

module.exports = { generateVariants, generateVariantsStaged, verifyRealHtml, checkCredibility, BRIEFS };
// Exposed for tests only.
module.exports._internal = { generateDesign, stripLeftoverPlaceholders, resetGeminiPause: () => { geminiPausedUntil = 0; }, fulfillImageRequests, fulfillVideoRequests, fulfillMedia, stockQuery, createLivePreview, systemFor, condenseForReview };

// Real, genuine Credibility Engine - honestly flags what a completed
// page might genuinely be missing for real trust (testimonials, a
// clear privacy policy link, real contact information, a clear value
// proposition) - a real, specific, contextual review, not a generic
// checklist applied blindly. Runs once, on the actual, final selected
// design, not on all four variants during generation, since most of
// those get discarded anyway and this is a real, additional cost.
const CREDIBILITY_SYSTEM = `You are reviewing a completed website for real, honest trust and credibility gaps - the kind a real design consultant would flag, not generic advice.

Output ONLY valid JSON: {"missing": ["specific, real gap 1", "specific, real gap 2"], "strengths": ["one real thing already done well"]}

Rules:
- Every real gap must be genuinely specific to what's actually in this real page - not generic advice like "add more content."
- Real, common things worth checking: a genuine privacy policy or terms link, real contact information beyond just a form, a clear value proposition in the first screen, real social proof (testimonials, real client names, a case study), clear next steps (a real, obvious call to action).
- List at most 5 real, genuine gaps - only ones that actually apply, not a maximum-length checklist.
- If the page genuinely has no real gaps worth mentioning, return an empty missing array - don't invent one to seem thorough.`;

async function checkCredibility(html) {
  try {
    const { parsed } = await callClaude({
      system: CREDIBILITY_SYSTEM,
      messages: [{ role: "user", content: `Real, completed page:\n${condenseForReview(html).slice(0, 30000)}` }],
      maxTokens: 500
    });
    return { missing: parsed.missing || [], strengths: parsed.strengths || [] };
  } catch (err) {
    // Real, honest fallback - this is genuinely a nice-to-have on top
    // of an already-complete page, never something that should block
    // or fail the real build itself if it can't run.
    console.error("[variant-bot] Real credibility check failed, continuing without it:", err.message);
    return { missing: [], strengths: [] };
  }
}
