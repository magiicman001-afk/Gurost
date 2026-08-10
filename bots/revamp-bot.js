const { chromium } = require("playwright");
const chromeLauncher = require("chrome-launcher");
const lighthouse = require("lighthouse");
const { callClaude } = require("../lib/claude-client");

const AUDIT_SYSTEM = `You are a website auditor. You will receive crawled page data (links, meta tags, title) and a Lighthouse report.

Output ONLY valid JSON:
{"issues": [{"category": "seo"|"accessibility"|"performance"|"broken_links", "severity": "high"|"medium"|"low", "description": "...", "fix_summary": "..."}]}

Base every issue on the provided data — do not infer performance or accessibility problems that aren't in the Lighthouse output. Order by severity within each category.`;

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

module.exports = { crawl, runLighthouse, audit, rebuild };
