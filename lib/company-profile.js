/**
 * Company profile for the Business Assistant: who the business is, so the
 * research and analysis that come later have something to work from.
 *
 * Pure functions only: the lists the form offers, and the cleaner that turns
 * a raw form into the object that is stored. Nothing here touches a database
 * or the network. The website address is checked hard because a later step
 * fetches it from the server: only a plain public http(s) address passes.
 */

const INDUSTRIES = [
  { id: "restaurant", label: "Restaurant" },
  { id: "bakery_cafe", label: "Bakery / Cafe" },
  { id: "law_firm", label: "Law firm" },
  { id: "ecommerce", label: "Ecommerce / online shop" },
  { id: "retail", label: "Retail (physical shop)" },
  { id: "health_wellness", label: "Health and wellness" },
  { id: "beauty", label: "Beauty / salon" },
  { id: "fitness", label: "Fitness / gym" },
  { id: "real_estate", label: "Real estate" },
  { id: "trades", label: "Trades / construction" },
  { id: "education", label: "Education / training" },
  { id: "tech_saas", label: "Technology / software" },
  { id: "agency", label: "Agency / consulting" },
  { id: "other", label: "Other" }
];

const BUSINESS_TYPES = [
  { id: "b2b", label: "B2B (sells to businesses)" },
  { id: "b2c", label: "B2C (sells to consumers)" },
  { id: "both", label: "Both" }
];

const SOCIAL_FIELDS = ["instagram", "tiktok", "youtube", "x", "facebook"];
const SOCIAL_LABELS = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", facebook: "Facebook" };

const strip = (v, max, { multiline = false } = {}) =>
  String(v ?? "")
    .replace(multiline ? /[\x00-\x09\x0B-\x1F\x7F<>]/g : /[\x00-\x1F\x7F<>]/g, " ")
    .replace(multiline ? /[ \t]+/g : /\s+/g, " ")
    .trim()
    .slice(0, max);

// A public web address, or null. Adds https:// when the visitor left it off.
// Rejects other schemes, logins in the address, "localhost", private or
// numeric hosts and anything without a dot, so the server never fetches
// something inside its own network.
function normalizeWebsite(raw) {
  let s = String(raw ?? "").trim();
  if (!s || s.length > 300 || /[\s<>"']/.test(s)) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || host.length > 253) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || /^\[/.test(host)) return null; // IP addresses
  if (/^\d+$/.test(host.split(".").pop())) return null; // numeric top level, e.g. 127.1
  if (/(^|\.)(localhost|local|internal|localdomain|lan|home|corp|intranet)$/.test(host)) return null;
  if (!/^[a-z0-9.\-¡-￿]+$/.test(host)) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  u.hash = "";
  const path = u.pathname === "/" ? "" : u.pathname;
  return `${u.protocol}//${host}${path}${u.search}`.slice(0, 300);
}

// "@bakery", "bakery", "https://instagram.com/bakery/" -> "bakery".
// Returns "" for empty input and null for something that is not a handle.
function normalizeHandle(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(s)) {
    try {
      const u = new URL(/^https?:/i.test(s) ? s : `https://${s}`);
      const parts = u.pathname.split("/").filter(Boolean);
      s = parts[parts.length - 1] || "";
    } catch { return null; }
  }
  s = s.replace(/^@+/, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(s) ? s : null;
}

// Raw form -> { profile, problems }. A field that fails is dropped from the
// profile and named in problems; it is never quietly "fixed" into something else.
function normalizeProfile(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const problems = [];
  const profile = {
    name: strip(r.name, 120),
    website: "",
    industry: "",
    socials: {},
    type: "",
    target: strip(r.target, 500, { multiline: true })
  };

  if (!profile.name) problems.push("Enter your company name.");

  const siteRaw = String(r.website ?? "").trim();
  if (!siteRaw) problems.push("Enter your website address.");
  else {
    const site = normalizeWebsite(siteRaw);
    if (site) profile.website = site;
    else problems.push("That website address does not look right. Use something like www.yourbusiness.com.");
  }

  if (r.industry) {
    if (INDUSTRIES.some((i) => i.id === r.industry)) profile.industry = r.industry;
    else problems.push("Pick an industry from the list.");
  } else problems.push("Pick your industry.");

  if (r.type) {
    if (BUSINESS_TYPES.some((t) => t.id === r.type)) profile.type = r.type;
    else problems.push("Pick a business type from the list.");
  } else problems.push("Say whether you sell to businesses, consumers or both.");

  const socials = r.socials && typeof r.socials === "object" ? r.socials : {};
  for (const k of SOCIAL_FIELDS) {
    const h = normalizeHandle(socials[k]);
    if (h === null) problems.push(`The ${SOCIAL_LABELS[k]} handle does not look right. Use just the name, like mybakery.`);
    else if (h) profile.socials[k] = h;
  }

  return { profile, problems };
}

module.exports = { INDUSTRIES, BUSINESS_TYPES, SOCIAL_FIELDS, normalizeProfile, normalizeWebsite, normalizeHandle };
