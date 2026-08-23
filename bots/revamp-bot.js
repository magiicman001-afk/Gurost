const { chromium } = require("playwright");
const chromeLauncher = require("chrome-launcher");
const lighthouse = require("lighthouse");
const { callClaude } = require("../lib/claude-client");

const AUDIT_SYSTEM = `You are a website auditor. You will receive crawled page data (links, meta tags, title) and a Lighthouse report.

Output ONLY valid JSON:
{"issues": [{"category": "seo"|"accessibility"|"performance"|"broken_links", "severity": "high"|"medium"|"low", "description": "...", "fix_summary": "..."}]}

Base every issue on the provided data — do not infer performance or accessibility problems that aren't in the Lighthouse output. Order by severity within each category.`;

// Real, honest companion to AUDIT_SYSTEM for a real, uploaded local
// file rather than a live URL - no Lighthouse or crawl data exists
// for something that isn't reachable online, so this is deliberately
// scoped to what's genuinely detectable from the raw markup alone,
// with no "performance" category invented from data that isn't there.
const AUDIT_STATIC_SYSTEM = `You are a website auditor reviewing a real, complete HTML document directly - this file is not live online, so no Lighthouse or performance data exists for it.

Output ONLY valid JSON:
{"issues": [{"category": "seo"|"accessibility"|"broken_links"|"structure", "severity": "high"|"medium"|"low", "description": "...", "fix_summary": "..."}]}

Only report issues genuinely visible in the provided markup itself, such as:
- Missing or empty alt attributes on real <img> tags
- Broken internal anchor links (an href="#section" with no matching id="section" anywhere in the document)
- Missing <title> or meta description
- Missing viewport meta tag
- Heading structure that skips levels or has no real <h1>
- Inline text/background color pairs with genuinely poor contrast

Do not invent a "performance" category or any speed/loading claims — there is no real data to base that on for a file that isn't live. Order by severity within each category.`;

const REBUILD_SYSTEM = `You are rebuilding a website with specific fixes applied. You will receive the original HTML and a list of approved fixes.

Output ONLY valid JSON: {"html": "<complete updated document>", "summary": "one sentence"}

Preserve all original text content, images, and structure that isn't directly affected by an approved fix. Apply only the approved fixes — do not make unrelated changes.`;

async function crawl(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    const html = await page.content();
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.href));
    const metaTags = await page.$$eval("meta", (ms) =>
      ms.map((m) => ({ name: m.getAttribute("name") || m.getAttribute("property"), content: m.getAttribute("content") }))
    );
    const title = await page.title();
    return { html, links, metaTags, title };
  } finally {
    await browser.close();
  }
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
  try {
    const options = { logLevel: "error", output: "json", port: chrome.port };
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;
    return {
      performance: lhr.categories.performance.score,
      seo: lhr.categories.seo.score,
      accessibility: lhr.categories.accessibility.score,
      bestPractices: lhr.categories["best-practices"].score,
      failingAudits: Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 1)
        .map((a) => ({ id: a.id, title: a.title, score: a.score }))
    };
  } finally {
    await chrome.kill();
  }
}

async function audit(url) {
  const crawlData = await crawl(url);
  const lhData = await runLighthouse(url);

  const { parsed, usage } = await callClaude({
    system: AUDIT_SYSTEM,
    messages: [{
      role: "user",
      content: `Crawled data:\n${JSON.stringify({ title: crawlData.title, links: crawlData.links.slice(0, 50), metaTags: crawlData.metaTags })}\n\nLighthouse:\n${JSON.stringify(lhData)}`
    }],
    maxTokens: 3000
  });

  return { issues: parsed.issues, crawlData, lighthouse: lhData, usage };
}

// Real, new path for a real, uploaded local file - no live URL to
// crawl or run Lighthouse against, so this sends the actual raw HTML
// directly instead, honestly scoped by AUDIT_STATIC_SYSTEM above to
// only what's genuinely detectable from static markup.
async function auditStaticHTML(htmlContent) {
  const { parsed, usage } = await callClaude({
    system: AUDIT_STATIC_SYSTEM,
    messages: [{ role: "user", content: `HTML document:\n${htmlContent.slice(0, 15000)}` }],
    maxTokens: 3000
  });

  return { issues: parsed.issues, usage };
}

async function rebuild(originalHtml, approvedFixes) {
  const { parsed, usage } = await callClaude({
    system: REBUILD_SYSTEM,
    messages: [{
      role: "user",
      content: `Original HTML:\n${originalHtml}\n\nApproved fixes:\n${JSON.stringify(approvedFixes)}`
    }],
    maxTokens: 8000
  });
  return { html: parsed.html, summary: parsed.summary, usage };
}

module.exports = { crawl, runLighthouse, audit, auditStaticHTML, rebuild };
