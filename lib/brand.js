/**
 * Server side of the AI brand: keeps AI model and provider names out of everything sent to a
 * browser. The name is set in public/shared/brand-config.js; the wording is in ai-brand.js.
 *
 * publicPayload(obj): a copy of obj with
 *   - the keys modelUsed / modelsUsed / model removed from the top two levels (we do not tell people which model ran), and
 *   - any "error" / "reason" text that names a model turned into a friendly line.
 * Nothing else is touched, so a user's own text (a business called "Claude's Bakery") passes
 * through. The original object is never changed. wsJson() does the same for WebSocket sends.
 */
const aiBrand = require("../public/shared/ai-brand");

const DROP_KEYS = new Set(["modelUsed", "modelsUsed", "model"]);
const TEXT_KEYS = new Set(["error", "reason"]);

function clean(value, depth) {
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (typeof value.toJSON === "function") return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 2)); // rows in a list are data, not the envelope
  const out = {};
  for (const k of Object.keys(value)) {
    if (depth <= 1 && DROP_KEYS.has(k)) continue; // only the envelope: deeper "model" keys can be the user's own data (a cars table)
    const v = value[k];
    out[k] = TEXT_KEYS.has(k) && typeof v === "string" ? aiBrand.publicText(v) : clean(v, depth + 1);
  }
  return out;
}

function publicPayload(obj) {
  return clean(obj, 0);
}

function wsJson(obj) {
  return JSON.stringify(publicPayload(obj));
}

module.exports = { publicPayload, wsJson };
