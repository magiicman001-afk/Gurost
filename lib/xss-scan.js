"use strict";
/**
 * Static XSS scanner (security spec 2.5, part 1).
 *
 * Rule: a value that is put into an HTML string must be escaped (escapeHtml / textContent) or be provably harmless
 * (a number, a literal, an already-escaped helper result). The scanner reads page scripts with a real JavaScript parser,
 * finds every template literal or string concatenation that builds HTML, and reports each interpolated expression it
 * cannot show to be safe.
 *
 * A reviewed exception is written on the same line (or the line above) as:   // xss-ok: why it is safe
 * so every exception carries its reason in the code.
 *
 * Pure: scanSource(code, file) -> [{ file, line, expr, why }]. The CLI/test walks the files.
 */
let acorn = null;
try { acorn = require("acorn"); } catch { /* the test skips when no parser is installed */ }

// Functions whose RESULT is safe to put in HTML: they escape, encode, or return a number / an HTML string that is
// itself built from escaped parts (those helpers are scanned like any other code).
const SAFE_CALLS = new Set([
  "escapeHtml", "escHtml", "esc", "escapeAttr", "escapeHTML", "sanitize", "encodeURIComponent", "encodeURI",
  "num", "money", "usd", "tile", "pill", "empty", "card", "cell", "balanceCard", "fmt", "fmtNum",
  "Number", "parseInt", "parseFloat", "Boolean",
  "escapeLogText", "escStage", "timeAgo", "stepHtml", "lineHtml", "fieldHtml", "escapeText", // page-local escapers / number-and-fixed-text formatters (reviewed 2026-10-12)
]);
const SAFE_METHODS = new Set(["toFixed", "toLocaleString", "toLocaleDateString", "toLocaleTimeString", "toISOString", "length", "round", "floor", "ceil", "min", "max", "abs", "toString:number"]);
const SAFE_PROPS = new Set(["length"]);
// Fields that hold numbers in every API this app has (counts, scores, durations). A property read ending in one of
// these is treated as a number. Reviewed 2026-10-12; a field that can ever carry text must not be added here.
const NUMERIC_PROPS = new Set(["total", "failed", "builds", "designs", "best_score", "seconds", "time_ms", "meanScore", "count", "index",
  "active", "revoked", "buildsToLearn", "minIndustryBuilds", "totalBuilds", "ms", "calls", "inputTokens", "outputTokens", "cost", "totalIssues"]);

const looksLikeHtml = (s) => /<\/?[a-zA-Z][^>]*/.test(s) || /<\/?[a-zA-Z]+$/.test(s);

function calleeName(c) {
  if (!c) return "";
  if (c.type === "Identifier") return c.name;
  if (c.type === "MemberExpression" && !c.computed && c.property.type === "Identifier") return c.property.name;
  return "";
}

/** Is this expression safe to put in HTML? Returns true or a short reason string. */
let SAFE_NAMES = new Set();
function judge(node, depth = 0) {
  if (!node || depth > 12) return "too deep to judge";
  switch (node.type) {
    case "Literal": return true;
    case "TemplateLiteral": {
      // A nested template that builds html is checked on its own by the walker; do not report it twice.
      if (node.quasis.some((q) => looksLikeHtml(q.value.raw))) return true;
      for (const e of node.expressions) { const r = judge(e, depth + 1); if (r !== true) return r; }
      return true;
    }
    case "UnaryExpression": return true; // !x, -x, typeof x: never carry text through
    case "UpdateExpression": return true;
    case "BinaryExpression": {
      if (["-", "*", "/", "%", "**", "<", ">", "<=", ">=", "==", "===", "!=", "!==", "&", "|", "^", "<<", ">>", "in", "instanceof"].includes(node.operator)) return true;
      const l = judge(node.left, depth + 1); if (l !== true) return l;
      return judge(node.right, depth + 1);
    }
    case "LogicalExpression": {
      const l = judge(node.left, depth + 1); if (l !== true) return l;
      return judge(node.right, depth + 1);
    }
    case "ConditionalExpression": {
      const a = judge(node.consequent, depth + 1); if (a !== true) return a;
      return judge(node.alternate, depth + 1);
    }
    case "MemberExpression":
      if (!node.computed && node.property.type === "Identifier" && (SAFE_PROPS.has(node.property.name) || NUMERIC_PROPS.has(node.property.name))) return true;
      return "a property read that is not escaped";
    case "CallExpression": {
      const name = calleeName(node.callee);
      if (SAFE_CALLS.has(name)) return true;
      if (node.callee.type === "MemberExpression" && !node.callee.computed) {
        const m = node.callee.property.name;
        if (SAFE_METHODS.has(m)) return true;
        if (m === "join") {
          // list.map((x) => html).join('') : safe when the map callback returns safe html
          const inner = node.callee.object;
          if (inner.type === "CallExpression" && calleeName(inner.callee) === "map" && inner.arguments[0]) return judgeFn(inner.arguments[0], depth + 1);
          return "a joined list that is not a .map() of safe html";
        }
        if (m === "map") return judgeFn(node.arguments[0], depth + 1);
        if (m === "slice" || m === "trim" || m === "toLowerCase" || m === "toUpperCase" || m === "replace") return `${m}() keeps the text unescaped`;
      }
      return `a call to ${name || "a function"}() that is not a known escaper`;
    }
    case "Identifier": return SAFE_NAMES.has(node.name) ? true : `variable "${node.name}" is not escaped`;
    case "AwaitExpression": return "an awaited value is not escaped";
    default: return `a ${node.type} that is not escaped`;
  }
}

function judgeFn(fn, depth) {
  if (fn && fn.type === "Identifier" && SAFE_CALLS.has(fn.name)) return true; // list.map(escapeHtml)
  if (!fn || !/Function/.test(fn.type)) return "a callback that is not a function";
  if (fn.body.type !== "BlockStatement") return judge(fn.body, depth);
  const returns = [];
  (function walk(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "ReturnStatement" && n.argument) returns.push(n.argument);
    if (/Function/.test(n.type) && n !== fn) return;
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v); }
  })(fn.body);
  for (const r of returns) { const j = judge(r, depth); if (j !== true) return j; }
  return true;
}

/**
 * Names that are safe to interpolate: every binding of the name in the file is a `const` whose value is itself safe
 * (a number, a literal, an escaped result). A name that is ever a parameter, a let/var, or a destructured value is not
 * safe, because its value comes from outside. Iterates because one safe name can make another safe.
 */
function safeNames(ast) {
  const decls = new Map(); // name -> [{ kind, init }]
  const add = (name, rec) => { if (!decls.has(name)) decls.set(name, []); decls.get(name).push(rec); };
  const patNames = (pat, out) => {
    if (!pat) return;
    if (pat.type === "Identifier") out.push(pat.name);
    else if (pat.type === "ObjectPattern") pat.properties.forEach((p) => patNames(p.value || p.argument, out));
    else if (pat.type === "ArrayPattern") pat.elements.forEach((e) => patNames(e, out));
    else if (pat.type === "AssignmentPattern") patNames(pat.left, out);
    else if (pat.type === "RestElement") patNames(pat.argument, out);
  };
  walk(ast, (n) => {
    if (n.type === "VariableDeclaration") n.declarations.forEach((d) => { d.parent_kind = n.kind; });
    if (n.type === "VariableDeclarator") {
      if (n.id.type === "Identifier" && n.parent_kind === "const") add(n.id.name, { init: n.init });
      else { const names = []; patNames(n.id, names); names.forEach((x) => add(x, { init: null })); }
    }
    if (/Function/.test(n.type)) {
      const names = [];
      (n.params || []).forEach((p) => patNames(p, names));
      names.forEach((x) => add(x, { init: null }));
      if (n.id && n.id.name) add(n.id.name, { init: null });
    }
    if (n.type === "CatchClause" && n.param) { const names = []; patNames(n.param, names); names.forEach((x) => add(x, { init: null })); }
    if (n.type === "ForOfStatement" || n.type === "ForInStatement") { const names = []; if (n.left.declarations) n.left.declarations.forEach((d) => patNames(d.id, names)); names.forEach((x) => add(x, { init: null })); }
  });
  let safe = new Set();
  for (let round = 0; round < 6; round++) {
    const next = new Set();
    SAFE_NAMES = safe;
    for (const [name, list] of decls) {
      if (list.every((d) => d.init && judge(d.init) === true)) next.add(name);
    }
    if (next.size === safe.size) { safe = next; break; }
    safe = next;
  }
  return safe;
}

function walk(node, visit, parent) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const k of Object.keys(node)) {
    if (k === "loc" || k === "start" || k === "end") continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit, node));
    else if (v && typeof v.type === "string") walk(v, visit, node);
  }
}

/** Scan one piece of JavaScript. `lineOffset` is added to reported lines (for scripts inside an HTML page). */
function scanSource(code, file = "", lineOffset = 0) {
  if (!acorn) throw new Error("acorn is not installed");
  const lines = code.split("\n");
  const ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "script", locations: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  SAFE_NAMES = safeNames(ast);
  const found = [];
  const excused = (line) => /xss-ok:/.test(lines[line - 1] || "") || /xss-ok:/.test(lines[line - 2] || "");
  const report = (node, why) => {
    const line = node.loc.start.line;
    if (excused(line)) return;
    found.push({ file, line: line + lineOffset, expr: code.slice(node.start, Math.min(node.end, node.start + 80)).replace(/\s+/g, " "), why });
  };

  walk(ast, (n) => {
    // 1. template literals that build html
    if (n.type === "TemplateLiteral" && n.expressions.length && n.quasis.some((q) => looksLikeHtml(q.value.raw))) {
      for (const e of n.expressions) { const r = judge(e); if (r !== true) report(e, r); }
    }
    // 2. string concatenation that builds html: '<b>' + x + '</b>'
    if (n.type === "BinaryExpression" && n.operator === "+") {
      const parts = [];
      (function flat(x) { if (x.type === "BinaryExpression" && x.operator === "+") { flat(x.left); flat(x.right); } else parts.push(x); })(n);
      if (parts.some((p) => p.type === "Literal" && typeof p.value === "string" && looksLikeHtml(p.value))) {
        for (const p of parts) { if (p.type === "Literal") continue; const r = judge(p); if (r !== true) report(p, r); }
      }
    }
  });
  // the walker visits nested binary + nodes more than once; keep unique
  const seen = new Set();
  return found.filter((f) => { const k = f.line + "|" + f.expr; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Scan an HTML page: every inline <script> block (no src). */
function scanHtml(html, file = "") {
  const out = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if (/type\s*=\s*["'](?!text\/javascript|module)/i.test(m[0].slice(0, m[0].indexOf(">")))) continue;
    const startLine = html.slice(0, m.index + m[0].indexOf(">") + 1).split("\n").length - 1;
    try { out.push(...scanSource(m[1], file, startLine)); } catch (e) { out.push({ file, line: startLine + 1, expr: "", why: `could not parse this script: ${e.message.slice(0, 80)}` }); }
  }
  return out;
}

module.exports = { scanSource, scanHtml, judge, SAFE_CALLS, hasParser: () => !!acorn };
