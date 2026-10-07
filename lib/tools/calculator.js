/**
 * Calculator tool. Evaluates arithmetic with its own small parser - never
 * eval() or Function() - so nothing a model or user writes can run code.
 * Supports + - * / ^ ( ), unary minus, pi, and sqrt abs round floor ceil min max.
 */
const MAX_LENGTH = 200;
const FUNCTIONS = {
  sqrt: { min: 1, max: 1, fn: (a) => { if (a < 0) throw new Error("Cannot take the square root of a negative number."); return Math.sqrt(a); } },
  abs: { min: 1, max: 1, fn: Math.abs },
  floor: { min: 1, max: 1, fn: Math.floor },
  ceil: { min: 1, max: 1, fn: Math.ceil },
  round: { min: 1, max: 2, fn: (a, dp = 0) => { const f = 10 ** Math.min(10, Math.max(0, Math.trunc(dp))); return Math.round((a + Number.EPSILON) * f) / f; } },
  min: { min: 1, max: 20, fn: Math.min },
  max: { min: 1, max: 20, fn: Math.max }
};

function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:(\d+\.?\d*|\.\d+)|([a-z]+)|(.))/giy;
  let m;
  while (re.lastIndex < src.length && (m = re.exec(src))) {
    if (m[1] !== undefined) tokens.push({ t: "num", v: parseFloat(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: "id", v: m[2].toLowerCase() });
    else if (m[3] !== undefined && /[+\-*/^(),]/.test(m[3])) tokens.push({ t: "op", v: m[3] });
    else if (m[3] !== undefined && !/\s/.test(m[3])) throw new Error(`I can't use "${m[3]}" in a sum.`);
  }
  return tokens;
}

function evaluate(expression) {
  const src = String(expression || "").replace(/,(?=\d{3}\b)/g, ""); // 1,200 -> 1200
  if (!src.trim()) throw new Error("There is nothing to calculate.");
  if (src.length > MAX_LENGTH) throw new Error("That sum is too long.");
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (v) => { const t = tokens[pos]; if (t && t.t === "op" && t.v === v) { pos++; return true; } return false; };
  let depth = 0;

  function expr() { let v = term(); for (;;) { if (eat("+")) v += term(); else if (eat("-")) v -= term(); else return v; } }
  function term() {
    let v = unary();
    for (;;) {
      if (eat("*")) v *= unary();
      else if (eat("/")) { const d = unary(); if (d === 0) throw new Error("Cannot divide by zero."); v /= d; }
      else return v;
    }
  }
  function unary() { if (eat("-")) return -unary(); if (eat("+")) return unary(); return power(); }
  function power() { const base = primary(); if (eat("^")) return base ** unary(); return base; }
  function primary() {
    if (++depth > 50) throw new Error("That sum is nested too deeply.");
    try {
      const t = peek();
      if (!t) throw new Error("The sum ends too soon.");
      if (t.t === "num") { pos++; return t.v; }
      if (t.t === "id") {
        pos++;
        if (t.v === "pi") return Math.PI;
        const f = FUNCTIONS[t.v];
        if (!f) throw new Error(`I don't know "${t.v}".`);
        if (!eat("(")) throw new Error(`${t.v} needs brackets, like ${t.v}(4).`);
        const args = [expr()];
        while (eat(",")) args.push(expr());
        if (!eat(")")) throw new Error("A bracket is not closed.");
        if (args.length < f.min || args.length > f.max) throw new Error(`${t.v} got the wrong number of values.`);
        return f.fn(...args);
      }
      if (eat("(")) { const v = expr(); if (!eat(")")) throw new Error("A bracket is not closed."); return v; }
      throw new Error(`Unexpected "${t.v}".`);
    } finally { depth--; }
  }

  const value = expr();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos].v}".`);
  if (!Number.isFinite(value)) throw new Error("That result is too large to show.");
  return Number(value.toPrecision(12));
}

module.exports = {
  name: "calculator",
  description: "Do arithmetic exactly. Use it for any sum, total, percentage, VAT or average instead of working it out yourself. Percentages: write 20% of 150 as 150*0.2.",
  parameters: { type: "object", properties: { expression: { type: "string", description: "e.g. (120*3 + 45.5) * 1.2" } }, required: ["expression"] },
  needsApproval: false,
  evaluate,
  async execute({ expression }) {
    return { expression: String(expression).trim(), result: evaluate(expression) };
  }
};
