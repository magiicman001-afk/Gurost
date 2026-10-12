"use strict";
/**
 * Server-side input validation (security spec 1.4). Client checks never count.
 *
 *   app.post("/x/:id", validate({ params: { id: "uuid" }, body: { name: { type: "string", max: 80, required: true } } }), handler)
 *
 * Rules: "uuid" | "string" | "int" | "bool" | "email" | "enum", written as a bare type name or an object
 * { type, required, min, max, values, pattern, multiline }. Unknown fields are not this module's job (use
 * security.rejectUnknownFields). On failure: 400 { error } naming the field, nothing reaches the handler.
 * On success clean values (trimmed strings, real numbers and booleans) are written back to req.body / req.query /
 * req.params, so handlers see the validated form.
 *
 * Strings reject control characters (a newline and tab are allowed only with multiline: true) and anything over max
 * (default max 500, so a missing limit is never "unlimited").
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const DEFAULT_MAX = 500;

const rule = (r) => (typeof r === "string" ? { type: r } : r);
const fail = (field, why) => ({ ok: false, error: `${field}: ${why}` });

/** Validate one value against one rule. Returns { ok, value } or { ok: false, error }. */
function check(field, raw, spec) {
  const r = rule(spec);
  const missing = raw === undefined || raw === null || raw === "";
  if (missing) return r.required ? fail(field, "is required") : { ok: true, value: undefined };
  switch (r.type) {
    case "uuid":
      return typeof raw === "string" && UUID.test(raw) ? { ok: true, value: raw.toLowerCase() } : fail(field, "is not a valid id");
    case "int": {
      const n = typeof raw === "number" ? raw : typeof raw === "string" && /^-?\d{1,15}$/.test(raw.trim()) ? Number(raw) : NaN;
      if (!Number.isInteger(n)) return fail(field, "must be a whole number");
      if (r.min != null && n < r.min) return fail(field, `must be at least ${r.min}`);
      if (r.max != null && n > r.max) return fail(field, `must be at most ${r.max}`);
      return { ok: true, value: n };
    }
    case "bool":
      if (raw === true || raw === "true") return { ok: true, value: true };
      if (raw === false || raw === "false") return { ok: true, value: false };
      return fail(field, "must be true or false");
    case "email":
    case "string":
    case "enum": {
      if (typeof raw !== "string") return fail(field, "must be text");
      const max = r.max || DEFAULT_MAX;
      const text = raw.trim();
      if (text.length > max) return fail(field, `is too long (max ${max})`);
      if (r.min && text.length < r.min) return fail(field, `is too short (min ${r.min})`);
      const bad = r.multiline ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/ : /[\x00-\x1F\x7F]/;
      if (bad.test(text)) return fail(field, "contains characters that are not allowed");
      if (r.type === "email" && !EMAIL.test(text)) return fail(field, "is not a valid email");
      if (r.type === "enum" && !(r.values || []).includes(text)) return fail(field, `must be one of: ${(r.values || []).join(", ")}`);
      if (r.pattern && !r.pattern.test(text)) return fail(field, "is not in the expected format");
      return { ok: true, value: text };
    }
    default:
      return fail(field, "has an unknown rule");
  }
}

/** Validate an object against { field: rule }. Returns { ok, value } or { ok: false, error }. Fields not in the schema are left as they are. */
function checkObject(obj, schema, where) {
  const source = obj && typeof obj === "object" ? obj : {};
  const out = { ...source };
  for (const [field, spec] of Object.entries(schema || {})) {
    const r = check(`${where}.${field}`, source[field], spec);
    if (!r.ok) return r;
    if (r.value === undefined) delete out[field]; else out[field] = r.value;
  }
  return { ok: true, value: out };
}

function validate(schemas) {
  return (req, res, next) => {
    for (const where of ["params", "query", "body"]) {
      if (!schemas[where]) continue;
      const r = checkObject(req[where], schemas[where], where);
      if (!r.ok) return res.status(400).json({ error: r.error });
      req[where] = r.value;
    }
    next();
  };
}

module.exports = { validate, check, checkObject, UUID, EMAIL };
