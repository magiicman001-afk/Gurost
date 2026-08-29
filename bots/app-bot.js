const { callClaude } = require("../lib/claude-client");
const stageGate = require("../lib/stage-gate");

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

const BACKEND_SYSTEM = `You are a backend engineer. Given a business description and a database schema, output ONLY JSON:
{"files": [{"path": "...", "content": "..."}], "summary": "one sentence"}
Framework: FastAPI (Python) or Express (Node) — infer the better fit from the schema/business, default Express.
Generate only the endpoints the frontend will realistically need (CRUD on the core entities). Include basic input validation. No auth scaffolding unless the business obviously requires it (e.g. user accounts).
If using Express: always listen on process.env.PORT, falling back to 3000 if it isn't set (e.g. app.listen(process.env.PORT || 3000)). This is a hard requirement, not a style preference — the sandbox preview step needs a predictable port to expose, and a hardcoded or different port will make preview unreliable.`;

const FRONTEND_SYSTEM = `You are a senior frontend engineer at a professional design agency. Given a business description and a list of backend API endpoints, output ONLY JSON:
{"files": [{"path": "...", "content": "..."}], "summary": "one sentence"}
Build a React app (functional components, hooks) that calls the given endpoints. Keep it to the minimum set of files needed for a working prototype (App.jsx, a couple of page/component files, an api client module) — plus a real, correct package.json listing every real dependency actually used (this sandbox genuinely runs npm install before starting the app, so listed dependencies must be real, published packages with correct version numbers, not invented).

DESIGN STANDARDS — this must look like it was designed by a real agency, not generic AI output:

Components: use Radix UI primitives (@radix-ui/react-*) styled with Tailwind to match the shadcn/ui visual language — genuine, accessible, premium-feeling buttons, dialogs, dropdowns, tabs, and form controls, not bare unstyled HTML elements. Include the real Radix packages you use in package.json.

Typography: pair a distinctive display/heading font (Montserrat, Fraunces, or similar) with a clean, readable body font (Inter, Open Sans, or similar) via Google Fonts in index.html.

Color: curated palette built around #1A1A2E (dark navy) as primary text/ink, #FEB246 and #FF8C00 (gold/orange) as accents, #FFFFFF and #F8F9FA as backgrounds, #6B7280 as muted text.

Motion: real hover states (subtle scale, shadow, or color shift) and smooth transitions (0.2-0.3s ease) on every interactive element; a real loading skeleton or spinner for any async state, not a blank screen.

Layout: avoid generic centered-single-column layouts — use real, considered composition (bento-style grids, deliberate asymmetry) suited to the app's actual purpose.

Responsive: genuinely well-composed from 320px mobile through large desktop, not just "doesn't break."

Dark mode: implement Tailwind's real dark: variant with a working toggle that persists via localStorage.

On each top-level rendered section within a component (the outermost divs/sections a component returns, not every nested element), add a real data-gurost-file="ComponentFileName.jsx" attribute matching the actual file path that component lives in. This is real, load-bearing metadata — the live preview's Clickable Code Boxes feature reads this attribute directly to map a clicked section back to its real source file, so it needs to be accurate, not decorative. Don't add it to every element, just the top-level structural ones a user would reasonably click on.

Images: never invent, guess, or hallucinate an image URL (no made-up unsplash.com, pexels.com, or any other external links) — a fabricated URL will show as a broken image to the real end user. Where the design calls for a photo, build a real, self-contained visual instead using inline SVG, a CSS gradient, or a Material Symbols icon inside a colored shape. This must render correctly with zero external image requests.`;

async function buildApp(prompt, { dbEngine = "postgres", onSchemaComplete } = {}) {
  const schemaRes = await callClaude({
    system: SCHEMA_SYSTEM,
    messages: [{ role: "user", content: `Business: ${prompt}\nPreferred engine: ${dbEngine}` }],
    maxTokens: 2000
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
    maxTokens: 6000
  });

  const endpointList = backendRes.parsed.files.map((f) => f.path).join(", ");
  const frontendRes = await callClaude({
    system: FRONTEND_SYSTEM,
    messages: [{
      role: "user",
      content: `Business: ${prompt}\n\nBackend files (for reference on what's available): ${endpointList}`
    }],
    maxTokens: 8000
  });

  return {
    database: { engine: schemaRes.parsed.engine, schema: schemaRes.parsed.schema, rationale: schemaRes.parsed.rationale },
    backend: { files: backendRes.parsed.files, summary: backendRes.parsed.summary },
    frontend: { files: frontendRes.parsed.files, summary: frontendRes.parsed.summary },
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
async function buildAppStaged(projectId, prompt, { dbEngine = "postgres", onStage, getPendingCorrection, clearPendingCorrection } = {}) {
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

  notify("schema", "running");
  const schemaContent = await foldCorrection(`Business: ${prompt}\nPreferred engine: ${dbEngine}`);
  const schemaRes = await callClaude({ system: SCHEMA_SYSTEM, messages: [{ role: "user", content: schemaContent }], maxTokens: 2000 });
  notify("schema", "complete", { schema: schemaRes.parsed.schema, engine: schemaRes.parsed.engine });

  notify("backend", "running");
  const backendContent = await foldCorrection(`Business: ${prompt}\n\nDatabase schema:\n${schemaRes.parsed.schema}`);
  const backendRes = await callClaude({ system: BACKEND_SYSTEM, messages: [{ role: "user", content: backendContent }], maxTokens: 6000 });
  notify("backend", "complete", { files: backendRes.parsed.files, summary: backendRes.parsed.summary });

  const endpointList = backendRes.parsed.files.map((f) => f.path).join(", ");
  notify("frontend", "running");
  const frontendContent = await foldCorrection(`Business: ${prompt}\n\nBackend files (for reference on what's available): ${endpointList}`);
  const frontendRes = await callClaude({ system: FRONTEND_SYSTEM, messages: [{ role: "user", content: frontendContent }], maxTokens: 8000 });
  notify("frontend", "complete", { files: frontendRes.parsed.files, summary: frontendRes.parsed.summary });

  notify("done", "complete");

  return {
    database: { engine: schemaRes.parsed.engine, schema: schemaRes.parsed.schema, rationale: schemaRes.parsed.rationale },
    backend: { files: backendRes.parsed.files, summary: backendRes.parsed.summary },
    frontend: { files: frontendRes.parsed.files, summary: frontendRes.parsed.summary },
    usage: { schema: schemaRes.usage, backend: backendRes.usage, frontend: frontendRes.usage }
  };
}

module.exports = { buildApp, buildAppStaged };
