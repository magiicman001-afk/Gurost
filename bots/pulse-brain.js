/**
 * Pulse brain - turns what the in-browser inspector MEASURED on a page
 * (shared/pulse-inspector.js: contrast ratios, image weights, forms,
 * headings, mobile layout...) plus the page itself into a short,
 * prioritised list of real issues, each with a precise fix instruction
 * the correction pipeline can apply.
 *
 * The AI ranks and words the issues; the evidence has to come from the
 * facts. If the AI call fails or returns nothing usable, the issues are
 * built straight from the measurements (rulesFromFacts), so Analyze
 * always answers with something real.
 */

const { callClaude } = require("../lib/claude-client");
const { modelForTier } = require("../lib/tier-router");
const { condenseForReview } = require("../lib/page-condense");

const MAX_ISSUES = 10;
const SEVERITIES = new Set(["high", "medium", "low"]);
const CATEGORIES = new Set(["accessibility", "ux", "seo", "visual", "performance"]);

const BRAIN_SYSTEM = `You are Pulse, a senior web designer reviewing a website before it launches. You get facts MEASURED on the rendered page (desktop, and a 375px phone copy) and the page's content.

Reply with JSON only:
{"summary": "one or two sentences in your own voice - confident, kind, specific", "issues": [{"issue": "short title", "severity": "high|medium|low", "category": "accessibility|ux|seo|visual|performance", "evidence": "the measured numbers or exact element that prove it", "impact": "what a real visitor or search engine experiences", "fix_prompt": "a precise instruction for the page editor that changes only what is needed"}]}

Rules:
- At most 10 issues, most important first. Fewer is fine - never pad.
- Every issue must be backed by the facts or plainly visible in the content. No generic advice.
- Evidence quotes the real numbers (contrast ratios, pixel sizes, byte sizes, counts) or the element.
- fix_prompt names the element (heading text, section, selector) and the exact change, e.g. colours that pass, the text to add.
- Text measured over a background image could not be checked from colours; only mention it if the content makes a problem obvious.
- Text samples in the facts are shortened by the measuring tool; a trailing "…" is not a problem on the page.`;

const clip = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// Keeps only well-formed issues, trimmed to sane lengths.
function sanitizeIssues(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((i) => i && typeof i === "object" && clip(i.issue, 10) && clip(i.fix_prompt, 10))
    .slice(0, MAX_ISSUES)
    .map((i, k) => ({
      id: `p${k + 1}`,
      issue: clip(i.issue, 140),
      severity: SEVERITIES.has(String(i.severity).toLowerCase()) ? String(i.severity).toLowerCase() : "medium",
      category: CATEGORIES.has(String(i.category).toLowerCase()) ? String(i.category).toLowerCase() : "ux",
      evidence: clip(i.evidence, 300),
      impact: clip(i.impact, 240),
      fix_prompt: clip(i.fix_prompt, 600)
    }));
}

const kb = (n) => `${Math.round(n / 1024)}KB`;

// Issues read straight off the measurements - used when the AI can't answer.
function rulesFromFacts(facts) {
  const d = facts?.desktop || {};
  const m = facts?.mobile || {};
  const out = [];
  const add = (issue) => out.push(issue);

  for (const c of (d.contrast?.worst || []).slice(0, 3)) {
    add({ issue: `Low contrast: "${c.text}"`, severity: c.ratio < 3 ? "high" : "medium", category: "accessibility",
      evidence: `${c.el}: ${c.fg} on ${c.bg} is ${c.ratio}:1 (needs ${c.needs}:1)`,
      impact: "Hard to read, especially on phones outdoors; fails WCAG AA.",
      fix_prompt: `Change the text colour of the element ${c.el} containing "${c.text}" so it reaches at least ${c.needs}:1 contrast against ${c.bg} (keep the brand palette, e.g. a darker shade), without changing anything else.` });
  }
  if (d.meta && !d.meta.description) {
    add({ issue: "No meta description", severity: "medium", category: "seo", evidence: "<meta name=\"description\"> is missing",
      impact: "Search results show a random snippet instead of your pitch.",
      fix_prompt: "Add a <meta name=\"description\"> in the <head>: one 140-160 character sentence describing this business, what it offers and where." });
  }
  if (d.images?.missingAlt) {
    add({ issue: `${d.images.missingAlt} image(s) without alt text`, severity: "medium", category: "accessibility", evidence: `Missing alt: ${(d.images.missingAltSamples || []).join(", ")}`,
      impact: "Screen readers announce nothing useful; search engines can't read the images.",
      fix_prompt: "Add a short, literal alt attribute to every <img> that lacks one, describing what the photo shows." });
  }
  for (const f of (d.forms || []).filter((x) => x.emptySubmitAccepted || x.badEmailAccepted)) {
    add({ issue: "Form accepts empty or invalid input", severity: "high", category: "ux",
      evidence: `${f.el}: ${f.fields} fields, ${f.required} required${f.badEmailAccepted ? ", 'not-an-email' accepted as an email" : ""}`,
      impact: "Visitors can send blank or broken enquiries; you lose real leads.",
      fix_prompt: `In the form ${f.el}, mark the name, email and message fields as required, use type="email" for the email field, and show a clear inline error next to any invalid field before submitting.` });
  }
  if (m.layout?.horizontalOverflow > 4) {
    add({ issue: "Page scrolls sideways on phones", severity: "high", category: "visual",
      evidence: `At 375px the page is ${m.layout.scrollWidth}px wide (${m.layout.horizontalOverflow}px overflow); widest: ${(m.layout.overflowing || []).map((o) => o.el).join(", ")}`,
      impact: "The layout wobbles sideways on every phone.",
      fix_prompt: `Fix the horizontal overflow on mobile: make ${(m.layout.overflowing || []).map((o) => o.el).join(", ") || "the widest elements"} fit within the screen width at 375px (max-width:100%, wrapping, smaller fixed widths).` });
  }
  // A phone sees no navigation at all: no visible links and no menu button.
  if (m.layout && m.mobile && m.mobile.visibleNavLinks === 0 && !m.mobile.menuButton && (d.links?.total ?? 0) > 1) {
    add({ issue: "Navigation disappears on phones", severity: "high", category: "ux",
      evidence: "At 375px no navigation link is visible and there is no menu button",
      impact: "Visitors on phones can't get to the other sections - most of your traffic.",
      fix_prompt: "Add a mobile menu: a hamburger button visible below 768px that opens the same navigation links (with aria-expanded on the button and the menu closing after a link is tapped)." });
  }
  for (const img of (d.images?.heavy || []).slice(0, 2)) {
    add({ issue: "Heavy image", severity: "low", category: "performance",
      evidence: `${img.el}: ${img.natural} source shown at ${img.shown}${img.bytes ? `, ${kb(img.bytes)}` : ""}`,
      impact: "Slower first load, especially on mobile data.",
      fix_prompt: `Add loading="lazy" and decoding="async" to the image ${img.el} (keep the hero image eager) and give it width/height attributes matching its displayed size.` });
  }
  if ((d.headings?.h1 ?? 1) !== 1) {
    add({ issue: d.headings.h1 ? `${d.headings.h1} H1 headings` : "No H1 heading", severity: "low", category: "seo", evidence: `h1 count: ${d.headings.h1}`,
      impact: "Search engines can't tell what the page is mainly about.",
      fix_prompt: "Make sure the page has exactly one <h1> - the main hero headline - and turn any other <h1> into <h2>." });
  }
  return sanitizeIssues(out);
}

/**
 * facts: { desktop, mobile } from GurostInspector.inspectPage.
 * Returns { summary, issues, source: "ai" | "rules" }.
 */
async function analyzePage({ html, facts, plan }) {
  const content = `MEASURED FACTS:\n${JSON.stringify(facts).slice(0, 24000)}\n\nPAGE CONTENT (condensed):\n${condenseForReview(html || "").slice(0, 20000)}`;
  try {
    const { parsed } = await callClaude({
      system: BRAIN_SYSTEM,
      messages: [{ role: "user", content }],
      maxTokens: 3000,
      model: modelForTier(plan)
    });
    const issues = sanitizeIssues(parsed?.issues);
    if (issues.length) return { summary: clip(parsed.summary, 400), issues, source: "ai" };
    console.warn("[pulse-brain] AI returned no usable issues; using measured rules.");
  } catch (err) {
    console.error("[pulse-brain] AI analysis failed, using measured rules:", err.message);
  }
  const issues = rulesFromFacts(facts);
  return {
    summary: issues.length ? `I measured the page and found ${issues.length} thing${issues.length === 1 ? "" : "s"} worth fixing.` : "I measured the page and nothing stands out - nice work.",
    issues,
    source: "rules"
  };
}

module.exports = { analyzePage, sanitizeIssues, rulesFromFacts, BRAIN_SYSTEM };
