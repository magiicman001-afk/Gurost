"use strict";
/**
 * RESEARCH bot (4 of 8). One job: get the raw material for the page. The words (the one copywriter model call of the build,
 * cleaned in code) and the photos (one stock-photo lookup per distinct brief, with fallbacks). It writes no HTML.
 * (Named site-research-bot because bots/research-bot.js is the Business Assistant's research agent.)
 *
 * The split that makes the sites trustworthy: the MODEL writes words only. It is told never to write prices, ratings, years,
 * counts, people or reviews, and its output is cleaned here. Owner facts go in by code (builder bot), never from the model.
 */
const R = require("../lib/sections/render");
const { PALETTE_WORDS } = require("../lib/sections/fill-images");
const manifest = require("../lib/sections/manifest.json");

// ---------------------------------------------------------------- what the model is asked for
const sectionDef = (id) => manifest.sections.find((s) => s.id === id);

/** One line per slot the model may fill: name, kind, limit. Links, flags and photos are never the model's. */
function describeSlots(id) {
  const def = sectionDef(id);
  const lines = [];
  const one = (name, s, pad) => {
    if (s.type === "text") lines.push(`${pad}${name}: text, max ${s.max}${s.required ? "" : ", optional"}`);
    else if (s.type === "enum" && Array.isArray(s.values)) lines.push(`${pad}${name}: one of ${s.values.join("|")}`);
    else if (s.type === "image") return;
  };
  for (const [name, s] of Object.entries(def.slots)) {
    if (["tone", "cta1_href", "cta2_href", "trust_line", "cta_href"].includes(name)) continue;
    if (s.type === "list") {
      lines.push(`${name}: list of ${s.min || 1} to ${s.max || 6} items, each {`);
      for (const [n2, s2] of Object.entries(s.item)) one(n2, s2, "    ");
      lines.push("  }");
    } else one(name, s, "");
  }
  return lines.join("\n");
}

function systemPrompt(sectionIds) {
  return `You write the words for a small-business website. A designer lays them out; you never write HTML.

Reply with ONE JSON object only: {"brand": "<business name as given or clearly stated>", "description": "<meta description, max 150 chars>", "sections": { "<section id>": { ...slots } }}.

Write ONLY these sections, with exactly these slots:
${sectionIds.map((id) => `## ${id}\n${describeSlots(id)}`).join("\n\n")}

For photos give a short plain-English brief in "image_brief" (hero, about) or "brief" (each gallery image): what a stock photo should show, 3 to 8 words, no people's names.

HARD RULES (a lawyer reads this site):
- Never write prices, ratings, review quotes, awards, years in business, "since 19xx", customer or project counts, percentages, guarantees, named people, qualifications or certifications, unless the owner's text gives that exact fact.
- Never invent an address, phone number, email, opening hours or links. Those are added by the system.
- Write about what the business does, in a warm, specific, plain voice. No filler like "world-class" or "cutting-edge".
- Use the owner's language and spelling. Keep every text inside its max length. Do not use emoji.`;
}

// ---------------------------------------------------------------- cleaning the model's answer
const clip = (s, max) => R.truncate(String(s == null ? "" : s).replace(/\s+/g, " ").trim(), max || 200);

function cleanValue(spec, v) {
  if (spec.type === "text") return clip(v, spec.max);
  if (spec.type === "enum") return Array.isArray(spec.values) && spec.values.includes(v) ? v : spec.default;
  return undefined;
}

function cleanList(spec, arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, spec.max || 8).map((it) => {
    const o = {};
    for (const [n, s] of Object.entries(spec.item)) {
      const val = cleanValue(s, it && it[n]);
      if (val !== undefined && val !== "") o[n] = val;
    }
    return o;
  });
}

/** Keeps only known text/enum/list slots, trims to the limits, drops empty ones. */
function cleanSection(id, raw) {
  const def = sectionDef(id);
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [name, spec] of Object.entries(def.slots)) {
    if (spec.type === "list") {
      const items = cleanList(spec, src[name]).filter((it) => Object.values(it).some(Boolean));
      if (items.length) out[name] = items;
    } else {
      const val = cleanValue(spec, src[name]);
      if (val !== undefined && val !== "" && !["tone"].includes(name)) out[name] = val;
    }
  }
  return out;
}

// ---------------------------------------------------------------- the one model call
function defaultCallModel(plan) {
  const { callClaude } = require("../lib/claude-client");
  const { modelForTier } = require("../lib/tier-router");
  return async ({ system, content }) => {
    const { parsed } = await callClaude({ system, messages: [{ role: "user", content }], maxTokens: 6000, model: modelForTier(plan, { complex: false }), deadline: Date.now() + 150000 });
    return parsed;
  };
}

/**
 * Writes the words: ONE model call. Resolves the parsed JSON. Logged as the "copywriter" in the build log.
 * @param {{ prompt, wanted: string[], businessInfo, callModel?, subscription?, logger, industry }} a
 */
async function writeWords(a) {
  const { prompt, wanted, logger } = a;
  const callModel = a.callModel || defaultCallModel(a.subscription);
  const extra = require("../lib/business-info").businessInfoPrompt(a.businessInfo);
  const tCopy = Date.now();
  let modelOut;
  try {
    modelOut = await callModel({ system: systemPrompt(wanted), content: `${prompt}\n\n${extra || ""}`.trim() });
    logger.log({ bot: "copywriter", task: "write the words for the site", decision: `wrote ${Object.keys((modelOut && modelOut.sections) || {}).length} sections`, reason: null, time_ms: Date.now() - tCopy, result: "success", next_bot: null, details: { industry: a.industry, sections: wanted } });
  } catch (err) {
    logger.log({ bot: "copywriter", task: "write the words for the site", decision: "failed", reason: err.message, time_ms: Date.now() - tCopy, result: "fail", next_bot: null, details: { industry: a.industry } });
    throw err;
  }
  return modelOut;
}

// ---------------------------------------------------------------- photos
/**
 * One photo lookup per distinct brief across all directions, and the fallback chain (Bug SS): the model's brief, then the
 * person's own words ("animal sanctuary"), then the industry words. Every design uses the whole chain.
 * @returns {{ search: (q) => Promise, withFallback: (q) => Promise }}
 */
function makePhotoSearch({ search: given, logger, prompt, palette }) {
  const memo = new Map();
  const rawSearch = given || ((q) => require("../image-bot").searchImage(q));
  const search = async (q) => {
    if (!memo.has(q)) {
      const t0 = Date.now();
      memo.set(q, Promise.resolve().then(() => rawSearch(q)).catch(() => null).then((r) => {
        logger.log({ bot: "photographer", task: `find a photo: ${String(q).slice(0, 80)}`, decision: r ? "found one" : "nothing found", reason: r && r.credit ? `credit: ${r.credit}` : null, time_ms: Date.now() - t0, result: r ? "success" : "fail", next_bot: null, details: {} });
        return r;
      }));
    }
    return memo.get(q);
  };
  const promptWords = String(prompt || "").replace(/[^\p{L}\p{N}\s'-]/gu, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 4).join(" ");
  const withFallback = (q) => search(q)
    .then((r) => r || (promptWords && promptWords !== q ? search(promptWords) : null))
    .then((r) => r || search(`${PALETTE_WORDS[palette] || "business"} photo`));
  return { search, withFallback };
}

module.exports = { writeWords, makePhotoSearch, defaultCallModel, describeSlots, systemPrompt, cleanSection, cleanValue, cleanList, clip, sectionDef };
