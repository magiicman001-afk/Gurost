/**
 * Keeps generated apps self-contained. The live preview (and the downloaded preview.html) can
 * load only React and the app's own files, so an app that imports react-router-dom, a UI
 * library, axios and so on cannot render. The prompt forbids it, but a model sometimes does it
 * anyway, so this checks the result and gets the offending files rewritten once. Nothing here
 * throws on a failed repair: the build carries on and the preview shows its own clear message.
 */
const { parseFileBlocks } = require("./file-blocks");

const CODE_FILE = /\.(jsx|tsx|js|ts|mjs)$/i;
// Packages the preview provides.
const ALLOWED = new Set(["react", "react-dom", "react-dom/client", "react/jsx-runtime"]);

function isAllowed(spec) {
  return spec.startsWith(".") || spec.startsWith("/") || ALLOWED.has(spec);
}

// [{ path, spec }] for every import of a package the preview cannot load.
function externalImports(files) {
  const out = [];
  for (const f of files || []) {
    if (!CODE_FILE.test(f.path || "")) continue;
    const src = String(f.content || "");
    const specs = new Set();
    for (const m of src.matchAll(/\bimport\s+(?:[\w*{}\s,$]+\s+from\s+)?["']([^"']+)["']/g)) specs.add(m[1]);
    for (const m of src.matchAll(/\b(?:require|import)\(\s*["']([^"']+)["']\s*\)/g)) specs.add(m[1]);
    for (const spec of specs) if (!isAllowed(spec)) out.push({ path: f.path, spec });
  }
  return out;
}

// package.json lists only what the preview provides, so a leftover entry cannot mislead a
// person who runs the downloaded app.
function cleanPackageJson(files) {
  return (files || []).map((f) => {
    if (!/(^|\/)package\.json$/i.test(f.path || "") || /backend\//i.test(f.path)) return f;
    try {
      const pkg = JSON.parse(f.content);
      if (!pkg.dependencies) return f;
      const kept = {};
      for (const [k, v] of Object.entries(pkg.dependencies)) if (k === "react" || k === "react-dom") kept[k] = v;
      return { ...f, content: JSON.stringify({ ...pkg, dependencies: kept }, null, 2) + "\n" };
    } catch { return f; }
  });
}

const REPAIR_SYSTEM = `You fix React source files so they use NO external packages. The app runs in a preview that can load only React and the app's own files.
Rules: the only package import allowed is react (and react-dom). Remove every other package import and replace what it did with plain code: keep the current page in React state and mirror it in location.hash instead of react-router; build dialogs, tabs, dropdowns and buttons from plain elements styled with Tailwind classes instead of a UI library; use fetch instead of axios; use inline SVG instead of an icon library; use CSS transitions instead of an animation library.
Keep everything else exactly as it is: same component names, same exports, same props, same text and styling.
Output every file you were given, complete, in this format (plain text, no markdown fences):
<<<META>>>
{"summary": "what you changed"}
<<<END META>>>
<<<FILE path/of/the/file>>>
the complete file
<<<END FILE>>>`;

/**
 * files: the generated frontend files. call(system, user): returns the model's text.
 * Returns { files, remaining: [{path, spec}], repaired: n }.
 */
async function repairExternalImports(files, call) {
  const found = externalImports(files);
  if (!found.length) return { files: cleanPackageJson(files), remaining: [], repaired: 0 };
  const paths = new Set(found.map((x) => x.path));
  const list = found.map((x) => `- ${x.path} imports "${x.spec}"`).join("\n");
  const body = files.filter((f) => paths.has(f.path)).map((f) => `<<<FILE ${f.path}>>>\n${f.content}\n<<<END FILE>>>`).join("\n");
  let rewritten = [];
  try {
    const text = await call(REPAIR_SYSTEM, `These imports cannot load in the preview:\n${list}\n\nFiles to fix:\n${body}`);
    rewritten = parseFileBlocks(text).files.filter((f) => paths.has(f.path));
  } catch (err) {
    console.warn("[app-imports] Repair failed, keeping the files as generated:", err.message);
  }
  const byPath = new Map(rewritten.map((f) => [f.path, f]));
  const merged = files.map((f) => byPath.get(f.path) || f);
  const remaining = externalImports(merged);
  return { files: cleanPackageJson(merged), remaining, repaired: rewritten.length };
}

module.exports = { externalImports, cleanPackageJson, repairExternalImports };
