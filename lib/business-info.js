/**
 * The user's own business details (asked before a build), cleaned for
 * use in a generation prompt and on the generated site.
 *
 * Only known fields survive; each is plain text (no markup characters),
 * length-capped; an email must look like one and links must be http(s).
 * Anything that fails is dropped, never "fixed" into something else.
 */

const FIELDS = {
  name: 80,
  phone: 40,
  email: 120,
  address: 200,
  website: 200,
  instagram: 200,
  facebook: 200
};
const LINK_FIELDS = new Set(["website", "instagram", "facebook"]);

function clean(value, max) {
  return String(value ?? "")
    .replace(/[\x00-\x1F\x7F<>]/g, " ") // no control chars, no markup
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Returns a clean object with only valid fields, or null when nothing usable is left.
function normalizeBusinessInfo(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [field, max] of Object.entries(FIELDS)) {
    const v = clean(raw[field], max);
    if (!v) continue;
    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) continue;
    if (field === "phone" && !/\d{3}/.test(v)) continue;
    if (LINK_FIELDS.has(field)) {
      const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
      try {
        const u = new URL(url);
        if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) continue;
        out[field] = u.href;
      } catch { /* not a URL - dropped */ }
      continue;
    }
    out[field] = v;
  }
  return Object.keys(out).length ? out : null;
}

const LABELS = { name: "Business name", phone: "Phone", email: "Email", address: "Address", website: "Website", instagram: "Instagram", facebook: "Facebook" };

// The instruction appended to the user's request for the design model.
function businessInfoPrompt(info) {
  if (!info) {
    return "BUSINESS DETAILS: none given. Where the site shows contact details, use obvious placeholders the owner will replace (e.g. \"Your phone number\", \"hello@yourbusiness.com\", \"Your street address\") - never realistic-looking invented phone numbers, emails or addresses.";
  }
  const lines = Object.entries(info).map(([k, v]) => `- ${LABELS[k]}: ${v}`).join("\n");
  return `BUSINESS DETAILS (real - use them exactly, everywhere the site shows contact details: header, contact section, footer; link the phone with tel:, the email with mailto:, social links to the given URLs; never invent other contact details):
${lines}
Also add a <script type="application/ld+json"> block with schema.org data for this business (LocalBusiness, or the closest more specific type) built from these details only.`;
}

module.exports = { normalizeBusinessInfo, businessInfoPrompt, FIELDS };
