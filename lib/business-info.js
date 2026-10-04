/**
 * The user's own company details (asked before a build), cleaned for
 * use in a generation prompt and on the generated site.
 *
 * Only known fields survive; each is plain text (no markup characters),
 * length-capped; an email must look like one and links must be http(s).
 * Social fields take a profile URL or a bare @handle, which becomes the
 * profile URL. Anything that fails is dropped, never "fixed" into
 * something else.
 */

const FIELDS = {
  name: 80,
  tagline: 120,
  phone: 40,
  email: 120,
  address: 200,
  website: 200,
  instagram: 200,
  tiktok: 200,
  youtube: 200,
  x: 200,
  facebook: 200
};

// Where a bare handle points. YouTube handles are @name; the others take
// the name on its own (TikTok keeps the @ in its URLs).
const SOCIAL_PROFILE = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`
};
const SOCIAL_FIELDS = Object.keys(SOCIAL_PROFILE);
const LINK_FIELDS = new Set(["website", ...SOCIAL_FIELDS]);
const HANDLE = /^@?([A-Za-z0-9._-]{1,50})$/;

function clean(value, max) {
  return String(value ?? "")
    .replace(/[\x00-\x1F\x7F<>]/g, " ") // no control chars, no markup
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function toLink(field, v) {
  // "@crumbandco", "crumbandco" or "crumb.and.co" for a social field is a
  // handle; a profile link always has a path ("instagram.com/crumbandco").
  const handle = SOCIAL_PROFILE[field] && !/[/:]/.test(v) && !/(instagram|tiktok|youtube|twitter|x|facebook)\.com$/i.test(v) && HANDLE.exec(v);
  if (handle) return SOCIAL_PROFILE[field](handle[1]);
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    if (SOCIAL_PROFILE[field] && u.pathname.length < 2) return null; // a profile link names the profile
    return u.href;
  } catch {
    return null; // not a URL - dropped
  }
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
      const link = toLink(field, v);
      if (link) out[field] = link;
      continue;
    }
    out[field] = v;
  }
  return Object.keys(out).length ? out : null;
}

const LABELS = {
  name: "Business name", tagline: "Tagline", phone: "Phone", email: "Email", address: "Address", website: "Website",
  instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X (Twitter)", facebook: "Facebook"
};

// Short list for the conversation: "Crumb & Co, phone, email, Instagram, TikTok".
function describeBusinessInfo(info) {
  if (!info) return "";
  return Object.keys(info).map((k) => (k === "name" ? info.name : k === "tagline" ? "tagline" : ["phone", "email", "address", "website"].includes(k) ? k : LABELS[k])).join(", ");
}

// The instruction appended to the user's request for the design model.
function businessInfoPrompt(info) {
  if (!info) {
    return "BUSINESS DETAILS: none given. Where the site shows contact details, use obvious placeholders the owner will replace (e.g. \"Your phone number\", \"hello@yourbusiness.com\", \"Your street address\") - never realistic-looking invented phone numbers, emails or addresses.";
  }
  const lines = Object.entries(info).map(([k, v]) => `- ${LABELS[k]}: ${v}`).join("\n");
  const socials = SOCIAL_FIELDS.filter((k) => info[k]);
  return `BUSINESS DETAILS (real - use them exactly, everywhere the site shows contact details: header, contact section, footer; link the phone with tel:, the email with mailto:, social links to the given URLs; never invent other contact details):
${lines}
${info.name ? "Use the business name as the brand in the header and footer. " : ""}${info.tagline ? "Use the tagline as written (hero or footer). " : ""}${socials.length ? `Show a social icon (inline SVG) for exactly these profiles - ${socials.map((k) => LABELS[k]).join(", ")} - in the footer, each linking to its URL; no other social icons. ` : "Show no social icons (none were given). "}
Also add a <script type="application/ld+json"> block with schema.org data for this business (LocalBusiness, or the closest more specific type) built from these details only, with every social profile URL in "sameAs"${info.website ? "" : '; no "url" field and no website link anywhere - no website was given, so never invent a domain'}.`;
}

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const digits = (s) => String(s).replace(/\D/g, "");

/**
 * Details changed after the build ("update my phone number"): every
 * occurrence of an old value on the page becomes the new one - text,
 * tel:/mailto: links, social links, schema. A phone's tel: link is
 * matched by its digits, whatever its formatting. No AI involved.
 * Returns { html, replaced } (number of replacements made).
 */
function applyBusinessInfoUpdate(html, oldInfo, newInfo) {
  let page = String(html);
  let replaced = 0;
  const swap = (re, to) => { page = page.replace(re, () => { replaced++; return to; }); };
  // Longest values first, so "Crumb & Co Bakery" isn't half-replaced by "Crumb & Co".
  const fields = Object.keys(FIELDS).sort((a, b) => String(oldInfo?.[b] || "").length - String(oldInfo?.[a] || "").length);
  for (const field of fields) {
    const from = oldInfo?.[field];
    const to = newInfo?.[field];
    if (!from || !to || from === to) continue;
    if (field === "phone") {
      // tel: links by digits - "tel:+441174960123" is "0117 496 0123"
      // (national number without its leading 0, after a country code).
      const national = digits(from).replace(/^0+/, "");
      const tel = `tel:${to.replace(/[^\d+]/g, "")}`;
      page = page.replace(/tel:[+\d\s().-]+/gi, (m) => (national.length >= 6 && digits(m).endsWith(national) ? (replaced++, tel) : m));
    }
    for (const variant of new Set([from, escapeHtml(from)])) {
      swap(new RegExp(escapeRe(variant), "g"), variant === from ? to : escapeHtml(to));
    }
  }
  return { html: page, replaced };
}

module.exports = { normalizeBusinessInfo, businessInfoPrompt, describeBusinessInfo, applyBusinessInfoUpdate, FIELDS, SOCIAL_FIELDS, LABELS };
