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
Generate only the endpoints the frontend will realistically need (CRUD on the core entities). Include basic input validation. No auth scaffolding unless the business obviously requires it (e.g. user accounts).`;

const FRONTEND_SYSTEM = `You are a React frontend engineer. Given a business description and a list of backend API endpoints, output ONLY JSON:
{"files": [{"path": "...", "content": "..."}], "summary": "one sentence"}
Build a React app (functional components, hooks) that calls the given endpoints. Tailwind for styling. Keep it to the minimum set of files needed for a working prototype (App.jsx, a couple of page/component files, an api client module).

On each top-level rendered section within a component (the outermost divs/sections a component returns, not every nested element), add a real data-gurost-file="ComponentFileName.jsx" attribute matching the actual file path that component lives in. This is real, load-bearing metadata — the live preview's Clickable Code Boxes feature reads this attribute directly to map a clicked section back to its real source file, so it needs to be accurate, not decorative. Don't add it to every element, just the top-level structural ones a user would reasonably click on.`;

async function buildApp(prompt, { dbEngine = "postgres" } = {}) {
  const schemaRes = await callClaude({
    system: SCHEMA_SYSTEM,
    messages: [{ role: "user", content: `Business: ${prompt}\nPreferred engine: ${dbEngine}` }],
    maxTokens: 2000
  });

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
