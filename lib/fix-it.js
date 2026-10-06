/**
 * "Fix this" flow for company findings: decides what a finding's button does
 * and builds what that button hands over. Pure functions, no network.
 *
 * A finding is { id, title|label, why, impact, area ("website"|"content"|"social"),
 * quickWin, fix, status, platform? } (the shape runChecklist() returns, and the
 * shape the AI analysis is mapped into).
 *
 *   social                     -> "social_draft": write a ready-to-post caption
 *   website/content + quick win -> "amend_now":    open Amend Website and apply it straight away
 *   website/content            -> "amend":         open Amend Website with the fix queued as the first item
 *
 * Amend Website is also where content changes are made: it rebuilds the page
 * from a plain-words instruction, so there is no separate page editor.
 */

const { parseReply } = require("./department-bots");
const { SOCIAL_FIELDS } = require("./company-profile");

const AMEND_KEY = "gurost_pending_amend"; // read by amend_website.html

const clip = (s, n) => String(s ?? "").replace(/[\x00-\x08\x0B-\x1F\x7F<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

function actionFor(finding) {
  if (!finding || finding.status === "pass") return { kind: "none", label: "" };
  if (finding.area === "social") return { kind: "social_draft", label: "Write a post" };
  if (finding.area === "website" || finding.area === "content") {
    return finding.quickWin ? { kind: "amend_now", label: "Fix now" } : { kind: "amend", label: "Fix this" };
  }
  return { kind: "none", label: "" };
}

// What the browser stores under AMEND_KEY before opening Amend Website, or null
// when this finding does not go there. The page audits the URL and puts the fix
// first in its list; with auto set it applies the fix once the audit is done.
function amendHandoff(finding, profile) {
  const action = actionFor(finding);
  if (action.kind !== "amend" && action.kind !== "amend_now") return null;
  if (!profile || !profile.website) return null;
  const text = clip(finding.fix, 600);
  if (!text) return null;
  return {
    url: profile.website,
    fix: {
      title: clip(finding.title || finding.label, 120),
      text,
      severity: finding.impact >= 4 ? "high" : "medium",
      auto: action.kind === "amend_now"
    }
  };
}

// Which network to write for: the finding's own, else the first one the user
// gave a handle for, else Instagram.
function pickPlatform(finding, profile) {
  const want = String(finding?.platform || "").toLowerCase();
  if (SOCIAL_FIELDS.includes(want)) return want;
  const socials = profile?.socials || {};
  return SOCIAL_FIELDS.find((k) => socials[k]) || "instagram";
}

const PLATFORM_NAMES = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", x: "X", facebook: "Facebook" };
const INDUSTRY_NAMES = { restaurant: "restaurant", bakery_cafe: "bakery or cafe", law_firm: "law firm", ecommerce: "online shop", retail: "shop", health_wellness: "health and wellness business", beauty: "beauty business", fitness: "fitness business", real_estate: "real estate business", trades: "trades business", education: "education business", tech_saas: "software business", agency: "agency", other: "business" };

// Prompt for the social post. It may use only what the profile says; no invented
// offers, prices, awards or dates. The draft goes between the usual markers.
function buildSocialPrompt(finding, profile) {
  const platform = pickPlatform(finding, profile);
  const handle = profile?.socials?.[platform];
  const system = [
    `You write social media posts for a small business. You write ONE post for ${PLATFORM_NAMES[platform]}, ready to copy and paste.`,
    "Use only the facts given about the business. Never invent prices, offers, awards, dates, opening times or customer quotes. If the post needs a fact you do not have, put it in square brackets for the owner to fill in, like [today's special].",
    "Keep it short, warm and specific. For Instagram, TikTok, Facebook and X: a hook in the first line, one call to action, and up to 5 relevant hashtags at the end. For YouTube: a title and a short description instead.",
    "Put ONLY the post between a line reading --- DRAFT --- and a line reading --- END DRAFT ---. Put any note to the owner before it, in one sentence at most."
  ].join("\n");
  const facts = [
    `Business: ${clip(profile?.name, 120) || "the business"} (${INDUSTRY_NAMES[profile?.industry] || "business"})`,
    profile?.website ? `Website: ${clip(profile.website, 200)}` : "",
    profile?.type ? `Sells to: ${{ b2b: "businesses", b2c: "consumers", both: "businesses and consumers" }[profile.type] || ""}` : "",
    profile?.target ? `Target customer: ${clip(profile.target, 500)}` : "",
    handle ? `${PLATFORM_NAMES[platform]} handle: @${clip(handle, 60)}` : ""
  ].filter(Boolean).join("\n");
  const user = `${facts}\n\nWhat the post should help with: ${clip(finding?.title || finding?.label, 120)}. ${clip(finding?.fix, 400)}`.trim();
  return { system, user, platform };
}

// What the findings route returns: the failing findings (biggest impact first), each
// with its button and handoff, plus how many checks passed. researchData is the
// stored research_data (or null).
function presentFindings(researchData, profile) {
  const all = Array.isArray(researchData?.findings) ? researchData.findings.filter((f) => f && typeof f === "object") : [];
  const findings = all
    .filter((f) => f.status === "fail")
    .map((f) => ({ id: f.id, title: f.title || f.label, why: f.why || "", impact: f.impact, area: f.area, quickWin: Boolean(f.quickWin), evidence: f.evidence || "", action: actionFor(f), handoff: amendHandoff(f, profile) }))
    .sort((a, b) => (b.impact || 0) - (a.impact || 0));
  return { researched: all.length > 0, findings, passed: all.filter((f) => f.status === "pass").length };
}

module.exports = { AMEND_KEY, presentFindings, actionFor, amendHandoff, pickPlatform, buildSocialPrompt, parseSocialReply: parseReply };
