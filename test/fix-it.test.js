// Run: node --test test/fix-it.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const f = require("../lib/fix-it");
const { runChecklist } = require("../lib/industry-checklists");

const profile = { name: "Crumb & Co", website: "https://crumb.co.uk", industry: "bakery_cafe", type: "b2c", target: "Locals", socials: { tiktok: "crumbco" } };
const item = (o) => ({ id: "x", title: "Opening hours are easy to find", impact: 5, area: "website", quickWin: true, fix: "Add opening hours.", status: "fail", ...o });

test("each kind of finding goes where the brief says", () => {
  assert.equal(f.actionFor(item({ area: "social" })).kind, "social_draft");
  assert.equal(f.actionFor(item({ area: "website", quickWin: true })).kind, "amend_now");
  assert.equal(f.actionFor(item({ area: "website", quickWin: false })).kind, "amend");
  assert.equal(f.actionFor(item({ area: "content", quickWin: false })).kind, "amend");
  assert.equal(f.actionFor(item({ area: "content", quickWin: true })).kind, "amend_now");
  assert.equal(f.actionFor(item({ status: "pass" })).kind, "none");
  assert.equal(f.actionFor(item({ status: "unchecked" })).kind !== "none", true);
  assert.equal(f.actionFor(null).kind, "none");
  assert.equal(f.actionFor(item({ area: "mystery" })).kind, "none");
});

test("amend handoff carries the site, the fix and whether to apply it at once", () => {
  const now = f.amendHandoff(item(), profile);
  assert.deepEqual(now, { url: "https://crumb.co.uk", fix: { title: "Opening hours are easy to find", text: "Add opening hours.", severity: "high", auto: true } });
  const later = f.amendHandoff(item({ quickWin: false, impact: 2 }), profile);
  assert.equal(later.fix.auto, false);
  assert.equal(later.fix.severity, "medium");
  assert.equal(f.amendHandoff(item({ area: "social" }), profile), null);
  assert.equal(f.amendHandoff(item(), { ...profile, website: "" }), null);
  assert.equal(f.amendHandoff(item({ fix: "   " }), profile), null);
  assert.equal(f.AMEND_KEY, "gurost_pending_amend");
});

test("handoff text is cleaned and capped", () => {
  const h = f.amendHandoff(item({ fix: "<script>alert(1)</script>" + "a".repeat(2000) }), profile);
  assert.ok(!/[<>]/.test(h.fix.text));
  assert.equal(h.fix.text.length, 600);
});

test("real checklist output feeds straight into the flow", () => {
  const r = runChecklist("bakery_cafe", { text: "Welcome", html: "<p>Welcome</p>" });
  const fails = r.items.filter((i) => i.status === "fail");
  assert.ok(fails.length >= 4);
  for (const i of fails) {
    const a = f.actionFor(i);
    assert.ok(["amend", "amend_now", "social_draft"].includes(a.kind), i.id);
    if (a.kind !== "social_draft") assert.ok(f.amendHandoff(i, profile).fix.text.length > 10, i.id);
  }
  assert.equal(f.actionFor(r.items.find((i) => i.id === "instagram_link")).kind, "social_draft");
});

test("social prompt: uses only the profile's facts, names the platform, keeps the draft markers", () => {
  const p = f.buildSocialPrompt(item({ area: "social", title: "Post more on TikTok", fix: "Share a behind-the-scenes bake." }), profile);
  assert.equal(p.platform, "tiktok"); // first platform with a handle
  assert.match(p.system, /TikTok/);
  assert.match(p.system, /--- DRAFT ---/);
  assert.match(p.system, /Never invent prices/);
  assert.match(p.user, /Crumb & Co/);
  assert.match(p.user, /bakery or cafe/);
  assert.match(p.user, /@crumbco/);
  assert.match(p.user, /behind-the-scenes/);
  assert.equal(f.pickPlatform({ platform: "youtube" }, profile), "youtube");
  assert.equal(f.pickPlatform({ platform: "myspace" }, { socials: {} }), "instagram");
});

test("a social reply splits into note and sendable draft", () => {
  const r = f.parseSocialReply("Here you go.\n--- DRAFT ---\nFresh bread, every morning. #bakery\n--- END DRAFT ---");
  assert.equal(r.draft, "Fresh bread, every morning. #bakery");
  assert.equal(r.reply, "Here you go.");
});

test("presentFindings: failing items only, biggest first, each with button and handoff", () => {
  const research = { findings: runChecklist("bakery_cafe", { text: "Fresh from the oven today. Open daily 8am - 4pm", html: "<p>hi</p>" }).items };
  const out = f.presentFindings(research, profile);
  assert.equal(out.researched, true);
  assert.ok(out.passed >= 2 && out.findings.length >= 1);
  for (let k = 1; k < out.findings.length; k++) assert.ok(out.findings[k - 1].impact >= out.findings[k].impact);
  for (const x of out.findings) { assert.ok(x.title && x.action.label); if (x.action.kind.startsWith("amend")) assert.equal(x.handoff.url, "https://crumb.co.uk"); else assert.equal(x.handoff, null); }
  assert.ok(!out.findings.some((x) => x.id === "daily_menu" || x.id === "opening_hours"));
});

test("presentFindings: no research or junk is 'not researched', not an error", () => {
  for (const r of [null, undefined, {}, { findings: "x" }, { findings: [null, 3] }]) assert.deepEqual(f.presentFindings(r, profile), { researched: false, findings: [], passed: 0 });
  const unchecked = runChecklist("restaurant", {}).items; // nothing was fetched: nothing is claimed missing
  const o = f.presentFindings({ findings: unchecked }, profile);
  assert.equal(o.findings.length, 0);
});
