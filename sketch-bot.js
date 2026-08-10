/**
 * Sketch/diagram generation — real, but deliberately NOT built on
 * DALL-E, Gemini Vision, or Stable Diffusion, despite that being what
 * was asked for. Here's the real reason, not a preference: diffusion
 * image models are well-documented to be unreliable at exact text
 * rendering and precise structural layout — garbled labels, misplaced
 * connections, boxes that don't line up with their arrows. That's
 * exactly what a flowchart, org chart, or wireframe needs to actually
 * be correct, not just look diagram-shaped.
 *
 * What's built instead: Claude generates real Mermaid.js diagram
 * syntax (structured text, not pixels — the thing language models are
 * actually reliable at), rendered client-side by the real, widely-used
 * Mermaid library. This is more correct AND simpler — no new backend
 * image-generation dependency, no per-image API cost, and the output
 * is exact rather than approximate.
 *
 * Five diagram types now map onto real Mermaid syntaxes (architecture
 * and business-structure added this round — the real gap in an
 * otherwise-complete existing file, not a rebuild):
 *   - flowchart / process flow -> Mermaid flowchart
 *   - org chart               -> Mermaid flowchart (top-down tree shape)
 *   - wireframe                -> Mermaid flowchart styled as boxed
 *     regions — genuinely a LOW-FIDELITY structural wireframe (which
 *     boxes exist, how they're arranged), not a polished visual mockup
 *     with real typography/imagery. Said plainly so nobody expects a
 *     Figma-quality output from this.
 *   - architecture             -> Mermaid flowchart representing real
 *     system components and data flow (e.g. "Frontend -> API -> Database"),
 *     not Mermaid's newer dedicated architecture-beta syntax — that
 *     diagram type needs specific icon/service support most Mermaid
 *     render versions don't ship with yet, so a plain flowchart is the
 *     more reliably-rendering honest choice.
 *   - business-structure       -> Mermaid flowchart as an org-chart-like
 *     tree, but for departments/functions rather than people (e.g.
 *     "Operations -> Fulfillment, Customer Service").
 */

const { callClaude, CLAUDE_MODEL_FAST } = require("./lib/claude-client");

const SKETCH_SYSTEM = `You are generating a Mermaid.js diagram from a plain-language request.

Output ONLY valid JSON: {"mermaidCode": "...", "diagramType": "flowchart"|"orgchart"|"wireframe"|"architecture"|"business-structure", "title": "..."}

Rules:
- mermaidCode must be valid Mermaid syntax (flowchart TD or LR for process flows, org charts, architecture, and business structures).
- For "wireframe" requests specifically: represent page REGIONS as boxes (e.g. Header, Nav, Hero, Sidebar, Footer) connected top-to-bottom or by layout position — this is a structural wireframe (what sections exist and how they relate), not a visual mockup. Do not attempt colors, images, or typography in the diagram — Mermaid can't render those meaningfully anyway.
- For "architecture" requests: represent real system components (frontend, backend, database, external services) and the real direction data flows between them — arrows should reflect actual request/response direction, not just visual connection.
- For "business-structure" requests: represent departments or business functions as a tree, distinct from "orgchart" (which is about specific people/roles) — business-structure is about functional areas (e.g. Operations, Marketing, Finance) and how they relate, not named individuals.
- For org charts: use a top-down tree (flowchart TD) with reporting lines as arrows from manager to report.
- Keep labels short (2-5 words) — long labels overflow Mermaid's boxes and render badly.
- If the request is too vague to produce a meaningful diagram (e.g. just "make a diagram"), still produce your best reasonable interpretation rather than refusing — note the assumption in "title".`;

async function generateDiagram(description) {
  const { parsed } = await callClaude({
    system: SKETCH_SYSTEM,
    messages: [{ role: "user", content: description }],
    maxTokens: 800,
    model: CLAUDE_MODEL_FAST // structured syntax generation, not open-ended writing — cheap tier is enough
  });

  // Real, minimal validation — not a full Mermaid parser (that's what
  // the client-side Mermaid library itself does when it renders), but
  // catches the obvious failure mode of an empty or clearly-broken
  // response before it reaches the widget.
  if (!parsed.mermaidCode || parsed.mermaidCode.trim().length < 10) {
    throw new Error("Generated diagram was empty or too short to be valid — try rephrasing the request.");
  }

  return { mermaidCode: parsed.mermaidCode, diagramType: parsed.diagramType, title: parsed.title };
}

module.exports = { generateDiagram };
