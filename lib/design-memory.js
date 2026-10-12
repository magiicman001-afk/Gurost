"use strict";
/**
 * Design Memory (docs/DESIGN_MEMORY_SPEC.md): every scored design is saved to `build_memory`; what the owner does with it
 * (kept / edited / deleted) is added later; after enough builds in an industry the best combination becomes the lead design.
 *
 * Only structure is stored (industry, section ids + variants, palette, score, action): never names, copy, prompts or images.
 * Every write is fire-and-forget: a missing table or a database outage must never slow or break a build.
 * The database client is injected (`client`), so the tests need no network.
 */
const TABLE = "build_memory";
const KEPT_AFTER_MS = 24 * 60 * 60 * 1000; // "kept" = still in use a day after it was picked
const MIN_INDUSTRY_BUILDS = 50; // below this the fixed premium looks are used unchanged
const MIN_COMBO_BUILDS = 5; // a combination needs this many builds before it is trusted
const EXPLORE = 0.2; // 1 build in 5 still uses a fixed look, so new combinations get tried
const W_KEPT = 8;
const W_DELETED = 12;
const FACT_SECTIONS = ["booking", "location"]; // they depend on the owner's details, not on the design

/** Env flag, off unless DESIGN_MEMORY is exactly "1". */
const enabled = (env = process.env) => String(env.DESIGN_MEMORY || "") === "1";

const defaultClient = () => require("./db").supabase;

/** The design's sections without the facts-driven ones, as [{id, variant}]. */
function normalizeSections(list) {
  return (Array.isArray(list) ? list : []).filter((s) => s && s.id && !FACT_SECTIONS.includes(s.id)).map((s) => ({ id: String(s.id), variant: String(s.variant || "a") }));
}
const comboKey = (sections, palette) => `${palette}|${normalizeSections(sections).map((s) => `${s.id}.${s.variant}`).join(",")}`;

// ---------------------------------------------------------------- writes
/** Saves each scored design of a finished build. `variants` are the library bot's variants (they carry `premium`). */
async function recordBuild(projectId, variants, { client } = {}) {
  try {
    const rows = (variants || [])
      .filter((v) => v && v.premium && Array.isArray(v.premium.sections) && v.site && v.site.palette && Number.isFinite(v.premium.score))
      .map((v) => ({ industry: v.site.palette, sections: v.premium.sections, palette: v.site.palette, premium_score: Math.max(0, Math.min(100, Math.round(v.premium.score))), project_id: String(projectId), variant_id: String(v.id) }));
    if (!rows.length) return { saved: 0 };
    const { error } = await (client || defaultClient()).from(TABLE).upsert(rows, { onConflict: "project_id,variant_id" });
    if (error) throw new Error(error.message);
    return { saved: rows.length };
  } catch (err) {
    console.warn("[design-memory] record failed:", err.message);
    return { saved: 0, error: err.message };
  }
}

/** The owner picked this design. "kept" is decided a day later (settleKept). */
async function markPicked(projectId, variantId, { client, now = new Date() } = {}) {
  try {
    const { error } = await (client || defaultClient()).from(TABLE).update({ picked_at: now.toISOString() }).eq("project_id", String(projectId)).eq("variant_id", String(variantId)).is("picked_at", null);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn("[design-memory] pick failed:", err.message);
  }
}

/** The first edit of a picked design marks it "edited" (later edits change nothing). */
async function markEdited(projectId, { client, now = new Date() } = {}) {
  try {
    const { error } = await (client || defaultClient()).from(TABLE).update({ user_action: "edited", user_action_at: now.toISOString() }).eq("project_id", String(projectId)).not("picked_at", "is", null).is("user_action", null);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn("[design-memory] edit failed:", err.message);
  }
}

/** A deleted project marks its picked design "deleted". A design that was never picked says nothing, so it is left alone. */
async function markDeleted(projectId, { client, now = new Date() } = {}) {
  try {
    const { error } = await (client || defaultClient()).from(TABLE).update({ user_action: "deleted", user_action_at: now.toISOString() }).eq("project_id", String(projectId)).not("picked_at", "is", null);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn("[design-memory] delete failed:", err.message);
  }
}

/** Picked a day ago or more, not edited or deleted since: that is "kept". */
async function settleKept({ client, now = new Date() } = {}) {
  try {
    const cutoff = new Date(now.getTime() - KEPT_AFTER_MS).toISOString();
    const { error } = await (client || defaultClient()).from(TABLE).update({ user_action: "kept", user_action_at: now.toISOString() }).lt("picked_at", cutoff).is("user_action", null);
    if (error) throw new Error(error.message);
  } catch (err) {
    console.warn("[design-memory] settle failed:", err.message);
  }
}

// ---------------------------------------------------------------- learning (pure)
/** Groups rows by combination: builds, mean score, kept and deleted rates, and the value that ranks them. */
function rank(rows) {
  const groups = new Map();
  for (const r of rows || []) {
    const key = comboKey(r.sections, r.palette);
    const g = groups.get(key) || { key, palette: r.palette, sections: normalizeSections(r.sections), builds: 0, scoreSum: 0, kept: 0, deleted: 0, picked: 0 };
    g.builds++;
    g.scoreSum += Number(r.premium_score) || 0;
    if (r.user_action === "kept") g.kept++;
    if (r.user_action === "deleted") g.deleted++;
    if (r.picked_at) g.picked++;
    groups.set(key, g);
  }
  return [...groups.values()]
    .map((g) => {
      const keptRate = g.picked ? g.kept / g.picked : 0;
      const deletedRate = g.picked ? g.deleted / g.picked : 0;
      const meanScore = g.scoreSum / g.builds;
      return { key: g.key, palette: g.palette, sections: g.sections, builds: g.builds, picked: g.picked, meanScore: Math.round(meanScore * 10) / 10, keptRate: Math.round(keptRate * 100) / 100, deletedRate: Math.round(deletedRate * 100) / 100, value: Math.round((meanScore + W_KEPT * keptRate - W_DELETED * deletedRate) * 10) / 10 };
    })
    .sort((a, b) => b.value - a.value || b.builds - a.builds);
}

/** The combination to lead with, or null (not enough data yet, or this build is an exploration build). */
function chooseBest(rows, { rng = Math.random, minIndustry = MIN_INDUSTRY_BUILDS, minCombo = MIN_COMBO_BUILDS, explore = EXPLORE } = {}) {
  if ((rows || []).length < minIndustry) return null;
  if (rng() < explore) return null;
  return rank(rows).find((c) => c.builds >= minCombo) || null;
}

/** A premium "look" (the shape the library bot builds) from a learned combination. */
function lookFromCombo(combo, label = "Proven for your industry") {
  const content = combo.sections.filter((s) => !["navbar", "hero", "footer"].includes(s.id)).map((s) => s.id);
  const order = ["navbar", "hero", ...content, ...FACT_SECTIONS, "footer"];
  const variants = Object.fromEntries(combo.sections.map((s) => [s.id, s.variant]));
  for (const id of FACT_SECTIONS) variants[id] = variants[id] || "a";
  const needs = [];
  if (variants.hero && variants.hero !== "c") needs.push("hero-image");
  if (content.includes("gallery")) needs.push("gallery-3");
  return { id: `learned-${combo.palette}`, label, variants, order, needs, learned: true };
}

// ---------------------------------------------------------------- reads
async function rowsFor(industry, client) {
  const { data, error } = await client.from(TABLE).select("sections,palette,premium_score,user_action,picked_at").eq("industry", industry).order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return data || [];
}

/** The learned look for an industry, or null. Never throws: a database problem means "no learned look". */
async function bestLook(industry, { client, rng, now } = {}) {
  try {
    const c = client || defaultClient();
    await settleKept({ client: c, now });
    const combo = chooseBest(await rowsFor(industry, c), { rng });
    return combo ? { look: lookFromCombo(combo), combo } : null;
  } catch (err) {
    console.warn("[design-memory] best failed:", err.message);
    return null;
  }
}

/** For the admin view: per industry, the top combinations, which section variants win most, and the palette's mean score. */
async function adminSummary({ client, now } = {}) {
  const c = client || defaultClient();
  await settleKept({ client: c, now });
  const { data, error } = await c.from(TABLE).select("industry,sections,palette,premium_score,user_action,picked_at").order("created_at", { ascending: false }).limit(20000);
  if (error) throw new Error(error.message);
  const byIndustry = {};
  for (const r of data || []) (byIndustry[r.industry] = byIndustry[r.industry] || []).push(r);
  const industries = {};
  for (const [ind, rows] of Object.entries(byIndustry)) {
    const ranked = rank(rows);
    const wins = {};
    for (const combo of ranked.filter((x) => x.builds >= 1).slice(0, 10)) for (const s of combo.sections) { const k = `${s.id}.${s.variant}`; wins[k] = (wins[k] || 0) + 1; }
    industries[ind] = {
      builds: rows.length,
      meanScore: Math.round((rows.reduce((a, r) => a + (Number(r.premium_score) || 0), 0) / rows.length) * 10) / 10,
      learning: rows.length >= MIN_INDUSTRY_BUILDS,
      buildsToLearn: Math.max(0, MIN_INDUSTRY_BUILDS - rows.length),
      topCombos: ranked.slice(0, 5),
      sectionWins: Object.entries(wins).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([section, count]) => ({ section, count })),
    };
  }
  return { totalBuilds: (data || []).length, minIndustryBuilds: MIN_INDUSTRY_BUILDS, industries };
}

module.exports = { enabled, recordBuild, markPicked, markEdited, markDeleted, settleKept, rank, chooseBest, lookFromCombo, bestLook, adminSummary, normalizeSections, comboKey, MIN_INDUSTRY_BUILDS, MIN_COMBO_BUILDS, EXPLORE, KEPT_AFTER_MS };
