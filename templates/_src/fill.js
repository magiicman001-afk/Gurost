"use strict";
/**
 * Fills a template's {{tokens}} with a business's own details. Pure and fast: no model, no network.
 * {{name}} is HTML-escaped; {{json:name}} is escaped for a JSON string (the structured data in the page head).
 * A token with no value becomes an empty string; the names that were missing are returned so the caller can decide
 * whether to fall back to the AI builder (spec: "If template fails to fill -> fall back to AI").
 */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const jsonText = (s) => JSON.stringify(String(s)).slice(1, -1).replace(/</g, "\\u003c");

function fillText(text, values, missing) {
  return String(text).replace(/\{\{(json:)?([a-z_0-9]+)\}\}/g, (_, j, name) => {
    const v = values[name];
    if (v == null || v === "") { if (missing) missing.add(name); return ""; }
    return j ? jsonText(v) : esc(v);
  });
}

/** files: { path: text } -> { files, missing: [names] } (only .html files are filled; css, js and fonts are copied as they are) */
function fillTemplate(files, values) {
  const missing = new Set(), out = {};
  for (const [p, body] of Object.entries(files)) out[p] = /\.html$/.test(p) ? fillText(body, values, missing) : body;
  return { files: out, missing: [...missing].sort() };
}

const DEMO = {
  business_name: "Maple & Rye", tagline: "Small-batch sourdough, butter pastries and good coffee, baked fresh every morning.", city: "Leeds",
  phone: "0113 496 0142", phone_href: "+441134960142", email: "hello@mapleandrye.example", address_line1: "14 Baker Street", address_line2: "Leeds LS1 4AB",
  hours_weekdays: "7am – 5pm", hours_saturday: "8am – 4pm", hours_sunday: "8am – 2pm", instagram_url: "https://instagram.com/", facebook_url: "https://facebook.com/",
  maps_url: "https://www.google.com/maps/search/?api=1&query=14+Baker+Street+Leeds", form_endpoint: "", year_founded: "2014", years_baking: "12", owner_name: "Anna Hale",
};

module.exports = { fillTemplate, fillText, DEMO };
