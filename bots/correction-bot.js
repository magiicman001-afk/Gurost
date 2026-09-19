const DiffMatchPatch = require("diff-match-patch");
const { callClaude } = require("../lib/claude-client");

const dmp = new DiffMatchPatch();

const PATCH_SYSTEM = `You are a code patcher. Given current code and an instruction, return only what changed.

Output ONLY valid JSON: {"patch": {"find": "<exact snippet from current code>", "replace": "<replacement snippet>"}, "summary": "one sentence"}

"find" must match the current code exactly, character for character, including whitespace.`;

// Fallback used when the model's "find" string doesn't match exactly —
// asking an LLM to hand-author an exact substring reliably is a losing
// bet at scale. Rather than fail the correction outright, fall back to
// a full-file edit and compute the diff ourselves.
const FULL_EDIT_SYSTEM = `You are editing existing code. Return the complete corrected file.

Output ONLY valid JSON: {"html": "<complete updated document>", "summary": "one sentence"}`;

async function applyCorrection(currentCode, instruction) {
  const primary = await callClaude({
    system: PATCH_SYSTEM,
    messages: [{ role: "user", content: `Current code:\n${currentCode}\n\nInstruction: ${instruction}` }],
    maxTokens: 2000
  });

  const { find, replace } = primary.parsed.patch;

  if (currentCode.includes(find)) {
    const newCode = currentCode.replace(find, replace);
    const patches = dmp.patch_make(currentCode, newCode);
    return {
      html: newCode,
      summary: primary.parsed.summary,
      method: "patch",
      patch: dmp.patch_toText(patches),
      usage: primary.usage
    };
  }

  // Patch didn't match — fall back to a full regeneration.
  const fallback = await callClaude({
    system: FULL_EDIT_SYSTEM,
    messages: [{ role: "user", content: `Current code:\n${currentCode}\n\nInstruction: ${instruction}` }],
    maxTokens: 8000
  });
  const newCode = fallback.parsed.html;
  const patches = dmp.patch_make(currentCode, newCode);

  return {
    html: newCode,
    summary: fallback.parsed.summary,
    method: "full-regen-fallback",
    patch: dmp.patch_toText(patches),
    usage: { primary: primary.usage, fallback: fallback.usage }
  };
}

module.exports = { applyCorrection };
