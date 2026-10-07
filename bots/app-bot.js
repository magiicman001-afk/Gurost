const { callClaude } = require("../lib/claude-client");
const stageGate = require("../lib/stage-gate");
const imageBot = require("../image-bot");
const { modelForTier } = require("../lib/tier-router");
const { designPromptLines } = require("../lib/industry-design");
const { businessInfoPrompt } = require("../lib/business-info");
const { repairExternalImports } = require("../lib/app-imports");
const { parseFileBlocks, fileBlocksFormat, createRepeatDetector, completedFilePaths } = require("../lib/file-blocks");

// Streams a file-block stage: every chunk is progress (the server's
// no-progress watchdog), each newly finished file is reported (the live
// preview), and a model that starts rewriting a file it already wrote is
// stopped there - its answer was complete.
function streamedFileStage(stage, notify) {
  let text = "";
  let reported = 0;
  return {
    parse: parseFileBlocks,
    stopWhen: createRepeatDetector(),
    onStream: ({ content }) => {
      if (!content) { notify(stage, "progress", null); return; }
      text += content;
      if (!/END[ _]FILE/.test(text.slice(-content.length - 20))) { notify(stage, "progress", null); return; }
      const files = completedFilePaths(text);
      const unique = [...new Set(files)];
      if (unique.length > reported) {
        reported = unique.length;
        notify(stage, "progress", { files: unique });
      }
    }
  };
}

// Real, specialized model per stage - genuine, Perplexity-Computer-
// style choice, not one model doing everything. Schema design is
// genuinely structured, analytical reasoning (a real strength of
// Gemini right now); backend and frontend stay on this codebase's
// real, existing default model, since coding is genuinely its
// strength and what powers today's top real coding tools. Both are
// real, simple environment variables - easy to change later as the
// model landscape moves.
// Real, honest note: this used to default to Gemini, based on a
// first pass of research into "which model leads reasoning
// benchmarks." Deeper research changed that conclusion - Gemini's
// genuine, distinct strength is handling large, native documents
// (long PDFs, video, big datasets), not short, structured tasks like
// this one. A database schema comes from a short business
// description, not a large document - closer to Claude's real,
// consistently-confirmed strength (precise instruction-following,
// honoring structured output requirements). Reverted to the real,
// existing default rather than force a split that isn't well-founded.
const SCHEMA_AGENT_MODEL = process.env.SCHEMA_AGENT_MODEL || undefined;

// Real, honest step - App Builder's frontend is multiple real files
// (unlike variant-bot's single HTML document), so this searches every
// real file's content for each requested placeholder and replaces it
// with an actual, generated image. A failure on any single image is
// caught and logged - it doesn't fail the whole build.
// A placeholder nothing filled (generation failed, or the model used one
// it never listed) would make the browser fetch "<page url>/IMG_3" - a
// console error and a broken image. A transparent pixel instead.
const BLANK_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function sweepPlaceholders(files) {
  return files.map((f) => ({ ...f, content: String(f.content).replace(/\b(IMG|VID)_\d+\b/g, BLANK_PIXEL) }));
}

// A model sometimes writes the data-gurost-file attribute as a tag of its
// own - <data-gurost-file="App.jsx"> ... </data-gurost-file> - which is
// never valid JSX, so the whole app fails to compile (seen 2026-10-06,
// nemotron, src/App.jsx). Those stray tags are removed; the real
// attribute on elements is untouched.
function removeStrayFileTags(files) {
  return (files || []).map((f) => (/\.(jsx|tsx|js|ts)$/i.test(f.path || "")
    ? { ...f, content: String(f.content).replace(/^[ \t]*<data-gurost-file\s*=\s*(["'])[^"'\n]*\1\s*\/?>[ \t]*\r?\n?/gm, "").replace(/^[ \t]*<\/data-gurost-file>[ \t]*\r?\n?/gm, "") }
    : f));
}

async function fulfillImageRequestsMultiFile(files, imageRequests) {
  files = removeStrayFileTags(files);
  if (!imageRequests || !imageRequests.length) return sweepPlaceholders(files);

  // Real, same fix as variant-bot.js - generate every real image at
  // once rather than one at a time, since none of them depend on
  // each other finishing first.
  const settled = await Promise.allSettled(imageRequests.map((req) => imageBot.generateImageUrl(req.description)));
  const replacements = settled.map((result, i) => {
    if (result.status === "fulfilled") {
      return { placeholder: imageRequests[i].placeholder, dataUrl: result.value };
    }
    console.error(`[app-bot] Real image generation failed for "${imageRequests[i].placeholder}":`, result.reason.message);
    return { placeholder: imageRequests[i].placeholder, dataUrl: BLANK_PIXEL };
  });

  return sweepPlaceholders(files.map((f) => {
    let content = f.content;
    // \b so IMG_1 doesn't also rewrite the start of IMG_10.
    for (const r of replacements) content = content.replace(new RegExp(`\\b${r.placeholder}\\b`, "g"), () => r.dataUrl);
    return { ...f, content };
  }));
}

/**
 * Full-stack generation happens as three chained calls, not one. A single
 * response can't reliably hold a coherent schema + backend + frontend at
 * once — this sequences them so each stage sees the real output of the
 * one before it.
 *
 * buildAppStaged() below adds real pause/correct/resume on top of this
 * — real, but at the granularity that's actually possible: BETWEEN
 * these three stages, not mid-completion within one. An LLM completion
 * is atomic from the caller's side; there's no API (Anthropic's real
 * streaming included) that lets you halt a response mid-generation,
 * keep the partial output, splice in new instructions, and have the
 * model continue the SAME response. What's real and useful instead:
 * pausing before a stage starts, folding a correction into that
 * stage's own prompt, then continuing. See lib/stage-gate.js for the
 * actual pause mechanism (tested standalone before being wired in
 * here, not just assumed correct).
 */

const SCHEMA_SYSTEM = `You are a database architect. Given a business description, output ONLY JSON:
{"engine": "postgres"|"mongo", "schema": "<SQL DDL or Mongo schema definition>", "rationale": "one sentence"}
Infer entities from the business description. Keep the schema minimal — only what's actually needed.`;

const BACKEND_SYSTEM = `You are a backend engineer. Given a business description and a database schema, output the backend source files.
${fileBlocksFormat()}
Framework: FastAPI (Python) or Express (Node) - infer the better fit from the schema/business, default Express.
Generate only the endpoints the frontend will realistically need (CRUD on the core entities). Include basic input validation. No auth scaffolding unless the business obviously requires it (e.g. user accounts).
Structure it like a real project, every file complete with real content (no placeholders, no "TODO"): for Express, a package.json (main set to server.js, listing only real published packages with real version numbers), server.js (creates the app, enables JSON bodies, mounts every route file, listens), a routes/ folder with one file per entity (for example routes/orders.js, routes/products.js), and a README.md that documents every endpoint: method, path, request body, and response. Keep each file focused and short.
If using Express: always listen on process.env.PORT, falling back to 3000 if it isn't set (e.g. app.listen(process.env.PORT || 3000)). This is a hard requirement, not a style preference — the sandbox preview step needs a predictable port to expose, and a hardcoded or different port will make preview unreliable.`;

const ANTI_SLOP_RULES = `
AVOID THESE SPECIFIC, RECOGNIZABLE "AI SLOP" TELLS:
- A hero/landing section that is: centered heading, centered subheading, two centered buttons, generic blob/gradient behind it. This exact pattern is the single most common AI-generated layout — do not produce it.
- Every screen using identical padding, identical corner radius, and identical shadow — real design varies these deliberately to create rhythm.
- A features/dashboard grid that is a uniform repeat of {icon, heading, one sentence} with no variation in size or emphasis.
- Purple-to-blue or pink-to-orange gradient backgrounds used decoratively with no relationship to the brand.
- Placeholder copy that reads like a template ("Lorem ipsum," "Your Company," "Item One") — write real, specific, plausible copy and sample data for the actual business described.

REAL, SPECIFIC DISCIPLINE TO APPLY INSTEAD:
- Spacing: use a real, consistent scale — 4, 8, 12, 16, 24, 32, 48, 64, 96px — nothing arbitrary.
- Type scale: pick a real ratio (e.g. 1.25 or 1.333) and stick to it for every heading level.
- Asymmetry: at least one screen should break from a centered/symmetric layout.
- Real content specificity: sample data, labels, and copy should sound like they belong to THIS business, not generic placeholder text.
`;

// Used when the prompt matches no industry in lib/industry-design.js.
const DEFAULT_TYPOGRAPHY = `Typography: pair a distinctive display/heading font (Montserrat, Fraunces, or similar) with a clean, readable body font (Inter, Open Sans, or similar) via Google Fonts in index.html.`;
const DEFAULT_COLOR = `Color: curated palette built around #1A1A2E (dark navy) as primary text/ink, #FEB246 and #FF8C00 (gold/orange) as accents, #FFFFFF and #F8F9FA as backgrounds, #6B7280 as muted text.`;

// Industry palette + fonts for this prompt (or the defaults above).
function frontendSystemFor(prompt) {
  const design = designPromptLines(prompt);
  console.log(`[app-bot] Industry design: ${design ? design.industry : "none matched, using default palette"}`);
  return frontendSystem(design);
}

const frontendSystem = (design) => `You are a senior frontend engineer at a professional design agency. Given a business description and a list of backend API endpoints, output the frontend source files.
${fileBlocksFormat("imageRequests - a list with one entry per IMG_n token you used, each having placeholder (the token) and description (exactly what that image should show)")}
Build a React app (functional components, hooks) that calls the given endpoints. Structure it like a real project, every file complete with real content (no placeholders, no "TODO"), each one focused and short:
- index.html: the page shell with a div id="root", the Tailwind CDN script and the Google Fonts links in the head.
- src/App.jsx: the entry. It default-exports the root component and switches between the pages.
- src/components/: the reusable pieces this app actually uses (for example Header, Hero, FeatureGrid, ContactForm, Footer; name and choose them for this business).
- src/pages/: one file per page (for example Home, About, Contact, plus the pages this business needs, such as Order or Menu).
- src/styles/main.css: the shared styles.
- src/api/client.js: the one module that calls the backend endpoints.
- package.json: a real, correct package.json listing every real dependency actually used (this sandbox genuinely runs npm install before starting the app, so listed dependencies must be real, published packages with correct version numbers, not invented).
Files import each other with relative paths.

${ANTI_SLOP_RULES}

DESIGN STANDARDS — this must look like it was designed by a real agency, not generic AI output:

Components: hand-build every button, card, dialog, dropdown, tab and form control from plain elements styled with Tailwind classes - considered padding, soft shadows, deliberate corner radii, visible focus states - so they feel like a premium component library without importing one.

NO EXTERNAL PACKAGES - this is a hard requirement. The live preview can only load React and the app's own files. The only import from a package that you may write is react (and react-dom if you need it). Never import react-router-dom, Radix UI, axios, framer-motion, an icon library or anything else from npm. Instead: keep the current page in React state in App.jsx and mirror it in location.hash so the back button works; use fetch for the backend; use inline SVG or Material Symbols for icons; use Tailwind classes and src/styles/main.css for styling. The package.json lists only react and react-dom as dependencies. JavaScript files never import CSS; index.html links the stylesheet.

${design?.typography || DEFAULT_TYPOGRAPHY}

${design?.color || DEFAULT_COLOR}

Motion: real hover states (subtle scale, shadow, or color shift) and smooth transitions (0.2-0.3s ease) on every interactive element; a real loading skeleton or spinner for any async state, not a blank screen.

Layout: avoid generic centered-single-column layouts — use real, considered composition (bento-style grids, deliberate asymmetry) suited to the app's actual purpose.

Responsive: genuinely well-composed from 320px mobile through large desktop, not just "doesn't break."

Dark mode: implement Tailwind's real dark: variant with a working toggle that persists via localStorage. The page is previewed in a sandboxed frame where localStorage throws, so wrap every localStorage read and write in try/catch and carry on without it.

On each top-level rendered section within a component (the outermost divs/sections a component returns, not every nested element), add a real data-gurost-file="ComponentFileName.jsx" attribute (an attribute on that element, e.g. <section data-gurost-file="Hero.jsx"> - never a tag of its own) matching the actual file path that component lives in. This is real, load-bearing metadata — the live preview's Clickable Code Boxes feature reads this attribute directly to map a clicked section back to its real source file, so it needs to be accurate, not decorative. Don't add it to every element, just the top-level structural ones a user would reasonably click on.

Images: where the design genuinely calls for a real photo or illustration (a hero image, a product shot, an avatar), do NOT draw it with SVG and do NOT invent an external image URL. Instead, write a literal placeholder token directly into the JSX's src attribute — e.g. src="IMG_1" — and add a matching entry to imageRequests with a detailed, specific description of exactly what that image should show. Use as many as the design genuinely benefits from, typically 1-4. For anything NOT requested this way (icons, decorative shapes), build a real, self-contained visual using inline SVG, a CSS gradient, or a Material Symbols icon inside a colored shape — never invent an external image URL for those.`;

// The preview can load only React and the app's own files. If the frontend imports anything
// else, one targeted rewrite takes those imports out (see lib/app-imports.js).
async function keepSelfContained(files, plan) {
  const { files: out, remaining, repaired } = await repairExternalImports(files, async (system, user) => {
    const res = await callClaude({ system, messages: [{ role: "user", content: user }], maxTokens: 14000, model: modelForTier(plan, { complex: true }), parse: (text) => text });
    return res.parsed; // the raw reply; lib/app-imports.js parses the file blocks itself
  });
  if (repaired) console.log(`[app-bot] Removed external imports from ${repaired} file(s).`);
  if (remaining.length) console.warn("[app-bot] Still importing packages the preview cannot load:", remaining.map((r) => `${r.path}:${r.spec}`).join(", "));
  return out;
}

async function buildApp(prompt, { dbEngine = "postgres", onSchemaComplete, plan } = {}) {
  const schemaRes = await callClaude({
    system: SCHEMA_SYSTEM,
    messages: [{ role: "user", content: `Business: ${prompt}\nPreferred engine: ${dbEngine}` }],
    maxTokens: 2000,
    model: SCHEMA_AGENT_MODEL || modelForTier(plan, { complex: false })
  });

  // Real, optional checkpoint — exists specifically so a caller (the
  // credit system) can look at the real schema Claude just produced
  // and decide whether to actually continue into the expensive
  // backend+frontend generation, or stop here with real, honest cost
  // protection before the costly part ever runs. Throwing here is the
  // real, deliberate way to abort — the caller catches it.
  if (onSchemaComplete) {
    await onSchemaComplete(schemaRes.parsed.schema);
  }

  const backendRes = await callClaude({
    system: BACKEND_SYSTEM,
    messages: [{
      role: "user",
      content: `Business: ${prompt}\n\nDatabase schema:\n${schemaRes.parsed.schema}`
    }],
    maxTokens: 6000,
    model: modelForTier(plan, { complex: true }),
    parse: parseFileBlocks
  });

  const endpointList = backendRes.parsed.files.map((f) => f.path).join(", ");
  const frontendRes = await callClaude({
    system: frontendSystemFor(prompt),
    messages: [{
      role: "user",
      content: `Business: ${prompt}\n\nBackend files (for reference on what's available): ${endpointList}`
    }],
    maxTokens: 8000,
    model: modelForTier(plan, { complex: true }),
    parse: parseFileBlocks
  });

  const frontendFiles = await fulfillImageRequestsMultiFile(frontendRes.parsed.files, frontendRes.parsed.imageRequests);

  return {
    database: { engine: schemaRes.parsed.engine, schema: schemaRes.parsed.schema, rationale: schemaRes.parsed.rationale },
    backend: { files: backendRes.parsed.files, summary: backendRes.parsed.summary },
    frontend: { files: frontendFiles, summary: frontendRes.parsed.summary },
    usage: { schema: schemaRes.usage, backend: backendRes.usage, frontend: frontendRes.usage }
  };
}

/**
 * Staged version of buildApp — same three real Claude calls, same
 * real dependency chain (backend needs the schema, frontend needs the
 * backend's endpoint list), but now emits a real progress event after
 * EACH stage actually completes, and checks stageGate.awaitGate()
 * between stages so a pause takes effect at the next real boundary.
 *
 * `onStage(stageName, status, data)` fires with status "running" right
 * before a stage starts and "complete" right after — both are real
 * state transitions, not simulated timing.
 *
 * `getPendingCorrection()` is called right before each stage starts
 * (after the gate has cleared) — if it returns text, that text is
 * folded into THAT stage's own prompt as extra guidance. This is the
 * honest version of "correct the partial build": the correction
 * affects the stage about to run, not a stage already in flight (see
 * this file's module-level comment for why that's the real boundary,
 * not an in-progress completion).
 */
// businessInfo: the user's company details (lib/business-info), or null
// when skipped - the frontend then uses obvious placeholders.
async function buildAppStaged(projectId, prompt, { dbEngine = "postgres", onStage, getPendingCorrection, clearPendingCorrection, plan, businessInfo = null } = {}) {
  const notify = (stage, status, data) => onStage && onStage(stage, status, data);
  const foldCorrection = async (baseContent) => {
    await stageGate.awaitGate(projectId);
    const correction = getPendingCorrection ? await getPendingCorrection() : null;
    if (correction) {
      clearPendingCorrection && (await clearPendingCorrection());
      return `${baseContent}\n\nAdditional instruction from the user, given while this was being built: ${correction}`;
    }
    return baseContent;
  };

  notify("schema", "running", { model: "Claude" });
  const schemaContent = await foldCorrection(`Business: ${prompt}\nPreferred engine: ${dbEngine}`);
  const schemaRes = await callClaude({ system: SCHEMA_SYSTEM, messages: [{ role: "user", content: schemaContent }], maxTokens: 2000, model: SCHEMA_AGENT_MODEL || modelForTier(plan, { complex: false }) });
  notify("schema", "complete", { schema: schemaRes.parsed.schema, engine: schemaRes.parsed.engine });

  notify("backend", "running", { model: "Claude" });
  const backendContent = await foldCorrection(`Business: ${prompt}\n\nDatabase schema:\n${schemaRes.parsed.schema}`);
  const backendRes = await callClaude({ system: BACKEND_SYSTEM, messages: [{ role: "user", content: backendContent }], maxTokens: 6000, model: modelForTier(plan, { complex: true }), ...streamedFileStage("backend", notify) });
  notify("backend", "complete", { files: backendRes.parsed.files, summary: backendRes.parsed.summary });

  const endpointList = backendRes.parsed.files.map((f) => f.path).join(", ");
  notify("frontend", "running", { model: "Claude" });
  const frontendContent = await foldCorrection(`Business: ${prompt}\n\nBackend files (for reference on what's available): ${endpointList}\n\n${businessInfoPrompt(businessInfo)}`);
  const frontendRes = await callClaude({ system: frontendSystemFor(prompt), messages: [{ role: "user", content: frontendContent }], maxTokens: 14000, model: modelForTier(plan, { complex: true }), ...streamedFileStage("frontend", notify) });
  const withImages = await fulfillImageRequestsMultiFile(frontendRes.parsed.files, frontendRes.parsed.imageRequests);
  const frontendFiles = await keepSelfContained(withImages, plan);
  notify("frontend", "complete", { files: frontendFiles, summary: frontendRes.parsed.summary });

  notify("done", "complete");

  return {
    database: { engine: schemaRes.parsed.engine, schema: schemaRes.parsed.schema, rationale: schemaRes.parsed.rationale },
    backend: { files: backendRes.parsed.files, summary: backendRes.parsed.summary },
    frontend: { files: frontendFiles, summary: frontendRes.parsed.summary },
    usage: { schema: schemaRes.usage, backend: backendRes.usage, frontend: frontendRes.usage }
  };
}

module.exports = { buildApp, buildAppStaged };
// Exposed for tests only.
module.exports._internal = { keepSelfContained, fulfillImageRequestsMultiFile, frontendSystemFor, BACKEND_SYSTEM, removeStrayFileTags };
