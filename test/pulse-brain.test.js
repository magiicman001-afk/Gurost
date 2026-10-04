// Run: node --test test/pulse-brain.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { analyzePage, sanitizeIssues, rulesFromFacts } = require("../bots/pulse-brain");

// Shaped like real inspector output (see shared/pulse-inspector.js).
const FACTS = {
  desktop: {
    mode: "desktop",
    contrast: { checked: 120, failing: 2, textOverImages: 3, worst: [
      { el: "p.text-amber-300", text: "Baking since 5am on Stokes Croft", ratio: 1.9, needs: 4.5, fg: "#fcd34d", bg: "#fef3c7", fontPx: 14 },
      { el: "a.nav-link", text: "Menu", ratio: 3.8, needs: 4.5, fg: "#b45309", bg: "#fef3c7", fontPx: 15 },
    ] },
    meta: { title: "Crumb & Co", description: null, viewport: "width=device-width, initial-scale=1", lang: "en", jsonLd: 0 },
    headings: { h1: 1, outline: ["h1: Bread baked the slow way."], skips: [] },
    forms: [{ el: "form#order", fields: 3, required: 0, emptySubmitAccepted: true, emailField: true, badEmailAccepted: false, novalidate: false, unlabeled: [] }],
    links: { total: 30, deadOrHash: 4, brokenAnchors: [], external: 2, externalSameTab: 2 },
    layout: { width: 942, scrollWidth: 942, horizontalOverflow: 0, overflowing: [] },
    images: { count: 6, missingAlt: 1, missingAltSamples: ["img.rounded"], knownBytes: 2400000, heavy: [{ el: "img.hero", natural: "4000x2250", shown: "900x506", oversize: 19.7, bytes: 1500000 }], upscaled: [] },
  },
  mobile: { mode: "mobile", layout: { width: 375, scrollWidth: 412, horizontalOverflow: 37, overflowing: [{ el: "div.grid", right: 412 }] }, mobile: { smallText: 3, smallTapTargets: 5, visibleNavLinks: 0, menuButton: true, h1FontPx: 40 } },
};
const HTML = "<!DOCTYPE html><html><head><title>Crumb</title></head><body><h1>Bread baked the slow way.</h1><form id=order><input name=email></form></body></html>";

test("rules built from measurements quote the real numbers", () => {
  const issues = rulesFromFacts(FACTS);
  const contrast = issues.find((i) => /Low contrast/.test(i.issue));
  assert.match(contrast.evidence, /#fcd34d on #fef3c7 is 1\.9:1 \(needs 4\.5:1\)/);
  assert.equal(contrast.severity, "high");
  assert.ok(issues.some((i) => i.issue === "No meta description"));
  assert.ok(issues.some((i) => /Form accepts empty/.test(i.issue) && /3 fields, 0 required/.test(i.evidence)));
  assert.ok(issues.some((i) => /sideways on phones/.test(i.issue) && /412px wide \(37px overflow\)/.test(i.evidence)));
  assert.ok(issues.some((i) => /Heavy image/.test(i.issue) && /4000x2250 source shown at 900x506, 1465KB/.test(i.evidence)));
  assert.ok(issues.every((i) => i.fix_prompt.length > 20 && /^p\d+$/.test(i.id)));
  assert.ok(issues.length <= 10);
});

test("sanitizeIssues drops malformed entries, clamps fields, caps at 10", () => {
  const raw = [{ issue: "x" }, null, { issue: "Low contrast in hero", fix_prompt: "Darken the hero text to #1f2937", severity: "CRITICAL", category: "nonsense", evidence: "e".repeat(999) }, ...Array(15).fill({ issue: "Some real issue", fix_prompt: "Change this thing" })];
  const out = sanitizeIssues(raw);
  assert.equal(out.length, 10);
  assert.equal(out[0].issue, "Low contrast in hero");
  assert.equal(out[0].severity, "medium");
  assert.equal(out[0].category, "ux");
  assert.equal(out[0].evidence.length, 300);
});

function stubAi(reply) {
  global.fetch = async () => ({ ok: true, status: 200, json: async () => reply, text: async () => JSON.stringify(reply) });
}

test("analyzePage: the AI's issues are used when they're well formed", async () => {
  const real = global.fetch;
  stubAi({ model: "m", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ summary: "I noticed a couple of things.", issues: [
    { issue: "Hero tagline barely readable", severity: "high", category: "accessibility", evidence: "p.text-amber-300 is 1.9:1", impact: "Unreadable outdoors", fix_prompt: "Change the hero tagline 'Baking since 5am on Stokes Croft' to #92400E." },
  ] }) } }] });
  try {
    const r = await analyzePage({ html: HTML, facts: FACTS, plan: "pro" });
    assert.equal(r.source, "ai");
    assert.equal(r.summary, "I noticed a couple of things.");
    assert.equal(r.issues[0].id, "p1");
    assert.match(r.issues[0].fix_prompt, /#92400E/);
  } finally { global.fetch = real; }
});

test("analyzePage: AI failure falls back to the measured rules", async () => {
  const real = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503, text: async () => "upstream down", json: async () => ({}) });
  try {
    const r = await analyzePage({ html: HTML, facts: FACTS, plan: "free" });
    assert.equal(r.source, "rules");
    assert.ok(r.issues.length >= 5);
    assert.match(r.summary, /I measured the page and found \d+ things worth fixing/);
  } finally { global.fetch = real; }
});

test("analyzePage: an AI reply that isn't valid JSON falls back to the measured rules", async () => {
  const real = global.fetch;
  stubAi({ model: "m", choices: [{ finish_reason: "stop", message: { content: "Sure! Here are some thoughts: the page looks great overall." } }] });
  try {
    const r = await analyzePage({ html: HTML, facts: FACTS, plan: "pro" });
    assert.equal(r.source, "rules");
    assert.ok(r.issues.some((i) => i.issue === "No meta description"));
  } finally { global.fetch = real; }
});

test("analyzePage: valid JSON with no usable issues also falls back", async () => {
  const real = global.fetch;
  stubAi({ model: "m", choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ summary: "All good", issues: [{ issue: "x" }] }) } }] });
  try {
    assert.equal((await analyzePage({ html: HTML, facts: FACTS, plan: "pro" })).source, "rules");
  } finally { global.fetch = real; }
});

test("previews carry the inspector when the page has loaded it", () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  const read = (f) => fs.readFileSync(path.join(__dirname, "../public/shared", f), "utf8");
  vm.runInContext(read("pulse-inspector.js") + "\n" + read("code-boxes.js") + "\nthis.inject = injectCodeBoxScript;", ctx);
  const out = ctx.inject("<!DOCTYPE html><html><head></head><body><p>x</p></body></html>");
  assert.match(out, /<script data-gurost-inspector>\(function inFrameInspector\(\)/);
  assert.match(out, /gurost-inspect-result/);
  assert.ok(out.trimEnd().endsWith("</script></body></html>"));
});
