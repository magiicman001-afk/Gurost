"use strict";
/**
 * Template sites: the premium template library (templates/<industry>/<style>/) as something a customer can pick, fill with
 * their own words and see in the builder. Pure and fast: no model, no network, no cost.
 *
 *   catalog()                      -> { industries: [{ id, label, styles: [{ id, name, kind }] }], fields: { <industry>: [field] } }
 *   cleanValues(pack, input)       -> { ok, values } | { ok: false, errors: { field: message } }
 *   fillValues(pack, values, opts) -> the full token map (derived links, the form address, example text for blanks)
 *   respond(site, rel, opts)       -> { status, type, body } | { status, file, type } for one page or file of a filled site
 *   respondDemo(pack, style, rel)  -> the same, filled with the pack's example details (for the picker's live preview)
 *
 * A project keeps only { pack, style, values } (project.templateSite). The pages are rebuilt on every request from the
 * committed template files, so nothing large is stored and a template fix reaches existing drafts.
 * Anything a customer types is escaped by fillTemplate; links are accepted only as http(s) so no "javascript:" can get in.
 */
const fs = require("fs");
const path = require("path");
const { fillTemplate } = require("../templates/_src/fill");

const ROOT = path.join(__dirname, "..", "templates");
const ID = /^[a-z][a-z0-9-]{1,30}$/;

const GENERIC = ["atelier", "gallery", "motion", "studio", "daylight"];
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8" };

// The details a customer can type, in the order they are asked. Anything else a pack uses becomes a plain text field.
const FIELD_INFO = {
  business_name: { label: "Business name", max: 80, required: true },
  tagline: { label: "One line about what you do", max: 180, hint: "Shown big near the top of the home page." },
  owner_name: { label: "Your name", max: 60 },
  city: { label: "Town or city", max: 60 },
  phone: { label: "Phone number", max: 30, type: "phone" },
  email: { label: "Email address", max: 120, type: "email" },
  address_line1: { label: "Street address", max: 100 },
  address_line2: { label: "Town and postcode", max: 100 },
  hours_weekdays: { label: "Opening hours, Monday to Friday", max: 40 },
  hours_saturday: { label: "Opening hours, Saturday", max: 40 },
  hours_sunday: { label: "Opening hours, Sunday", max: 40 },
  year_founded: { label: "Year you started", max: 4, type: "year" },
  years_baking: { label: "Years of experience", max: 3, type: "count" },
  years_open: { label: "Years open", max: 3, type: "count" },
  clients_served: { label: "Customers served", max: 7, type: "count" },
  team_size: { label: "People in your team", max: 4, type: "count" },
  animals_in_care: { label: "Animals in your care", max: 6, type: "count" },
  animals_rehomed: { label: "Animals rehomed", max: 6, type: "count" },
  instagram_url: { label: "Instagram link", max: 200, type: "url" },
  facebook_url: { label: "Facebook link", max: 200, type: "url" },
  booking_url: { label: "Booking link", max: 200, type: "url" },
  donate_url: { label: "Donation link", max: 200, type: "url" },
};
const ORDER = Object.keys(FIELD_INFO);
// Filled from the other details or by the server, never typed.
const DERIVED = new Set(["phone_href", "maps_url", "form_endpoint"]);

let CACHE = null;
const fileCache = new Map();

const readText = (file) => { if (!fileCache.has(file)) fileCache.set(file, fs.readFileSync(file, "utf8")); return fileCache.get(file); };

function titleCase(id) { return id.charAt(0).toUpperCase() + id.slice(1); }

function tokensOf(dir) {
  const found = new Set();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    for (const m of readText(path.join(dir, f)).matchAll(/\{\{(?:json:)?([a-z_0-9]+)\}\}/g)) found.add(m[1]);
  }
  return found;
}

function load() {
  if (CACHE) return CACHE;
  const industries = [], fields = {}, packs = {};
  const dirs = fs.readdirSync(ROOT).filter((d) => ID.test(d) && fs.existsSync(path.join(ROOT, "_src", "packs", d + ".js")));
  for (const id of dirs.sort()) {
    const pack = require(path.join(ROOT, "_src", "packs", id + ".js"));
    const styles = (pack.styles || []).filter((s) => ID.test(s) && fs.existsSync(path.join(ROOT, id, s, "index.html")));
    if (!styles.length) continue;
    const tokens = new Set();
    for (const s of styles) for (const t of tokensOf(path.join(ROOT, id, s))) tokens.add(t);
    const names = [...tokens].filter((t) => !DERIVED.has(t));
    const ordered = [...ORDER.filter((t) => names.includes(t)), ...names.filter((t) => !ORDER.includes(t)).sort()];
    fields[id] = ordered.map((name) => {
      const info = FIELD_INFO[name] || { label: titleCase(name.replace(/_/g, " ")), max: 80 };
      return { name, label: info.label, max: info.max, type: info.type || "text", required: !!info.required, hint: info.hint || "", example: String((pack.demo || {})[name] || "") };
    });
    packs[id] = { demo: pack.demo || {}, styles };
    industries.push({ id, label: pack.label || titleCase(id), styles: styles.map((s) => ({ id: s, name: titleCase(s), kind: GENERIC.includes(s) ? "general" : "special" })) });
  }
  CACHE = { industries, fields, packs };
  return CACHE;
}

/** What the picker needs: industries, their styles, and the details each one asks for. */
function catalog() { const { industries, fields } = load(); return { industries, fields }; }

function has(pack, style) {
  const c = load();
  return !!(c.packs[pack] && (style === undefined || c.packs[pack].styles.includes(style)));
}

// ---------------------------------------------------------------- cleaning what a customer typed
const CONTROL = new RegExp('[\\u0000-\\u001F\\u007F\\u2028\\u2029]');

function cleanUrl(raw) {
  let v = String(raw).trim();
  if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v.replace(/^\/+/, "");
  if (!/^https?:\/\/[^\s"'<>\\]{3,300}$/i.test(v)) return null;
  try { const u = new URL(v); return u.hostname.includes(".") ? u.href : null; } catch { return null; }
}

/** Validates the typed details for one industry. Unknown names are ignored; blanks are allowed (they show example text). */
function cleanValues(pack, input) {
  const c = load();
  if (!c.packs[pack]) return { ok: false, errors: { pack: "Unknown industry." } };
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = {}, errors = {};
  for (const f of c.fields[pack]) {
    const raw = src[f.name];
    if (raw === undefined || raw === null) { if (f.required) errors[f.name] = `${f.label} is needed.`; continue; }
    if (typeof raw !== "string" && typeof raw !== "number") { errors[f.name] = `${f.label} must be text.`; continue; }
    let v = String(raw).trim();
    if (!v) { if (f.required) errors[f.name] = `${f.label} is needed.`; continue; }
    if (CONTROL.test(v)) { errors[f.name] = `${f.label} has characters that are not allowed.`; continue; }
    if (v.length > f.max) { errors[f.name] = `${f.label} is too long (most ${f.max} characters).`; continue; }
    if (f.type === "email" && !/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[^\s@<>"']{2,}$/.test(v)) { errors[f.name] = "That email address does not look right."; continue; }
    if (f.type === "phone" && !/^[0-9 +()\-.]{6,30}$/.test(v)) { errors[f.name] = "Use digits, spaces and + ( ) - only."; continue; }
    if (f.type === "year" && !/^(19|20)\d{2}$/.test(v)) { errors[f.name] = "Use a four-digit year, like 2016."; continue; }
    if (f.type === "count" && !/^\d{1,7}$/.test(v)) { errors[f.name] = "Use a whole number."; continue; }
    if (f.type === "url") { const u = cleanUrl(v); if (u === null) { errors[f.name] = "That link does not look right. Start it with https://"; continue; } v = u; }
    values[f.name] = v;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

// ---------------------------------------------------------------- filling
function phoneHref(phone) {
  const digits = String(phone || "").replace(/[^0-9+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  return digits.startsWith("0") ? "+44" + digits.slice(1) : "+" + digits;
}

/**
 * The full token map: the customer's details first, example text for anything left blank (so no page has a hole in it),
 * and the derived links. `sample` lists the fields that are still example text.
 */
function fillValues(pack, values, { formEndpoint = "" } = {}) {
  const c = load();
  const demo = c.packs[pack].demo;
  const out = { ...demo }, sample = [];
  for (const f of c.fields[pack]) {
    if (values && values[f.name]) out[f.name] = values[f.name];
    else sample.push(f.name);
  }
  out.phone_href = phoneHref(out.phone) || demo.phone_href || "";
  const where = [out.address_line1, out.address_line2 || out.city].filter(Boolean).join(" ");
  out.maps_url = values && (values.address_line1 || values.address_line2 || values.city)
    ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(where)
    : demo.maps_url || "";
  out.form_endpoint = formEndpoint;
  return { values: out, sample };
}

// ---------------------------------------------------------------- serving
const safeRel = (rel) => {
  const clean = String(rel || "/").split("?")[0].split("#")[0].replace(/^\/+/, "") || "index.html";
  if (clean.includes("\0") || clean.split("/").some((p) => p === ".." || p === "." || p.startsWith("."))) return null;
  return clean;
};

function serveFrom(pack, style, rel, values) {
  const c = load();
  if (!c.packs[pack] || !c.packs[pack].styles.includes(style)) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>Template not found.</p>" };
  const clean = safeRel(rel);
  if (!clean) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>Page not found.</p>" };
  const dir = path.join(ROOT, pack, style);
  let file = path.join(dir, clean);
  if (!file.startsWith(dir + path.sep)) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>Page not found.</p>" };
  if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>Page not found.</p>" };
  const ext = path.extname(file).toLowerCase();
  if (ext === ".html") {
    const r = fillTemplate({ [clean]: readText(file) }, values);
    return { status: 200, type: TYPES[".html"], body: Object.values(r.files)[0] };
  }
  // Fonts, pictures, videos, css and script go out untouched; the caller sends the file itself (so video can seek).
  return { status: 200, type: TYPES[ext] || undefined, file, root: dir, rel: path.relative(dir, file), asset: true, font: /\.(woff2?|ttf|otf)$/i.test(file) };
}

/** One page or file of a customer's filled site. */
function respond(site, rel, { formEndpoint = "" } = {}) {
  if (!site || !has(site.pack, site.style)) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>This template is no longer available.</p>" };
  return serveFrom(site.pack, site.style, rel, fillValues(site.pack, site.values || {}, { formEndpoint }).values);
}

/** A page of the template filled with the pack's example details (the picker's live preview; no customer data involved). */
function respondDemo(pack, style, rel) {
  if (!has(pack, style)) return { status: 404, type: TYPES[".html"], body: "<!doctype html><title>Not found</title><p>Template not found.</p>" };
  return serveFrom(pack, style, rel, fillValues(pack, {}, {}).values);
}

/** The record kept on a project. */
function makeSite(pack, style, values) {
  return { engine: "template-library", pack, style, values: { ...values }, createdAt: new Date().toISOString() };
}

module.exports = { catalog, has, cleanValues, fillValues, respond, respondDemo, makeSite, phoneHref, cleanUrl, GENERIC };
