/**
 * Tool registry for the Business Assistant. A tool is
 *   { name, description, parameters (JSON schema), needsApproval, execute(args, ctx) }.
 * runTool() is the only way tools are called: it checks the arguments, never
 * lets a tool that needs approval run on its own (that gate is built in a later
 * part), catches every failure into a plain result, and logs the call.
 */
const registry = new Map();
const RECENT = [];
const MAX_RECENT = 200;

function register(tool) {
  if (!tool || !tool.name || typeof tool.execute !== "function") throw new Error("A tool needs a name and an execute function.");
  registry.set(tool.name, tool);
  return tool;
}

const list = () => [...registry.values()];

/** Check args against the tool's schema: required present, types right, nothing extra. */
function validateArgs(tool, args) {
  const schema = tool.parameters || { properties: {} };
  const props = schema.properties || {};
  if (!args || typeof args !== "object" || Array.isArray(args)) return "The arguments must be an object.";
  for (const k of Object.keys(args)) if (!props[k]) return `Unknown argument "${k}".`;
  for (const k of schema.required || []) if (args[k] === undefined || args[k] === null || args[k] === "") return `Missing argument "${k}".`;
  for (const [k, v] of Object.entries(args)) {
    const spec = props[k];
    if (spec.type && typeof v !== spec.type) return `"${k}" must be a ${spec.type}.`;
    if (spec.enum && !spec.enum.includes(v)) return `"${k}" must be one of: ${spec.enum.join(", ")}.`;
    if (typeof v === "string" && v.length > 2000) return `"${k}" is too long.`;
  }
  return null;
}

function log(entry) {
  RECENT.push(entry);
  if (RECENT.length > MAX_RECENT) RECENT.shift();
  console.log(`[tools] tool=${entry.tool} ok=${entry.ok}${entry.userId ? " user=" + entry.userId : ""}`);
}

/** Run one tool by name. Always resolves to { ok, result } or { ok:false, error }. */
async function runTool(name, args, ctx = {}) {
  const tool = registry.get(name);
  const base = { at: new Date().toISOString(), tool: name, userId: ctx.userId, input: JSON.stringify(args === undefined ? null : args).slice(0, 300) };
  if (!tool) { log({ ...base, ok: false }); return { ok: false, error: `There is no tool called "${name}".` }; }
  const problem = validateArgs(tool, args);
  if (problem) { log({ ...base, ok: false }); return { ok: false, error: problem }; }
  if (tool.needsApproval && !ctx.approved) {
    log({ ...base, ok: false });
    return { ok: false, needsApproval: true, error: `${name} needs the user's approval first.` };
  }
  try {
    const result = await tool.execute(args, ctx);
    log({ ...base, ok: true });
    return { ok: true, result };
  } catch (err) {
    log({ ...base, ok: false });
    return { ok: false, error: String(err.message || err).slice(0, 300) };
  }
}

/** The text a model is shown so it knows what it can call. */
function describeTools(tools = list()) {
  return tools.map((t) => {
    const p = t.parameters || {};
    const args = Object.entries(p.properties || {}).map(([k, v]) => `${k}${(p.required || []).includes(k) ? "" : "?"}: ${v.type}${v.enum ? " (" + v.enum.join("|") + ")" : ""}`).join(", ");
    return `- ${t.name}(${args}): ${t.description}`;
  }).join("\n");
}

const recentCalls = () => RECENT.slice(-50);

register(require("./calculator"));
register(require("./time-date"));

module.exports = { register, list, runTool, describeTools, validateArgs, recentCalls };
