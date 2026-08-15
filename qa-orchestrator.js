/**
 * QA Orchestrator — runs both bots, merges results into one report:
 * a short plain-English summary up top, full raw data from both
 * underneath. One thing to send back, not two.
 */

const bot1 = require("./qa-bot1-click-tester");
const bot2 = require("./qa-bot2-visual-checker");

// Real, deliberately trimmed to the pages that matter most right now
// (the "No skin" pages you flagged, plus the landing page as a real
// baseline for comparison) — cut down after a real out-of-memory
// crash on Render's free tier. Full-page screenshots and pixel-diffing
// are genuinely heavy per page; widen this list once the core flow is
// confirmed stable, not before.
const VISUAL_CHECK_PAGES = ["/index.html", "/builder.html", "/app-builder.html", "/amend_website.html"];

function summarize(clickReport, visualReport) {
  const summary = {
    pagesDiscovered: clickReport.pagesDiscovered,
    pagesUnreachable: clickReport.pagesUnreachable.length,
    loginSucceeded: clickReport.loginSucceeded,
    brokenElements: [],
    skippedForSafety: 0,
    costsMoneyPerRun: [],
    visualRegressions: [],
    newBaselines: [],
  };

  for (const page of clickReport.results) {
    if (!page.loaded) {
      summary.brokenElements.push({ page: page.page, issue: `Page failed to load: ${page.loadError || "unknown error"}` });
      continue;
    }
    for (const el of page.elements) {
      if (el.classification === "denied") { summary.skippedForSafety++; continue; }
      if (el.classification === "costs_money" && el.tested) {
        summary.costsMoneyPerRun.push({ page: page.page, element: el.text });
      }
      if (el.tested === false && el.reason) {
        summary.brokenElements.push({ page: page.page, element: el.text, issue: `Could not click: ${el.reason}` });
      } else if (el.tested && el.newConsoleErrors?.length) {
        summary.brokenElements.push({ page: page.page, element: el.text, issue: `Threw ${el.newConsoleErrors.length} console error(s)` });
      } else if (el.tested && el.newNetworkErrors?.length) {
        summary.brokenElements.push({ page: page.page, element: el.text, issue: `Triggered ${el.newNetworkErrors.length} failed network call(s)` });
      } else if (el.tag === "a" && el.wentToRightPlace === false) {
        summary.brokenElements.push({ page: page.page, element: el.text, issue: `Link goes to ${el.actualDestination}, expected ${el.expectedDestination}` });
      }
    }
  }

  for (const page of visualReport.results) {
    if (page.status === "regression_flagged") {
      summary.visualRegressions.push({ page: page.page, diffPercent: page.diffPercent });
    } else if (page.status === "baseline_captured" || page.status === "baseline_updated") {
      summary.newBaselines.push(page.page);
    } else if (page.status === "size_changed") {
      summary.visualRegressions.push({ page: page.page, issue: page.note });
    }
  }

  return summary;
}

async function runFullQA(baseUrl, { updateVisualBaseline = false } = {}) {
  const { chromium } = require("playwright");

  // Real, deliberately SEQUENTIAL — not the two-at-once version this
  // started as. Running both bots simultaneously means two full
  // Chromium browsers open in memory at the same time, which is
  // genuinely too heavy for a small hosting plan and caused a real,
  // silent out-of-memory crash and restart during testing. One bot
  // fully finishes and closes its browser before the next one opens
  // its own — slower wall-clock time, but real, honest memory safety
  // on modest hosting rather than a crash mid-run.
  const clickReport = await bot1.runClickAudit(baseUrl);

  const visualReport = await (async () => {
    const browser = await chromium.launch();
    try {
      let storageState = null;
      try {
        storageState = await bot1.login(baseUrl, browser);
      } catch (err) {
        console.warn("[qa-bot2] Login failed, continuing without it:", err.message);
      }
      return await bot2.runVisualCheck(baseUrl, VISUAL_CHECK_PAGES, { storageState, updateBaseline: updateVisualBaseline });
    } finally {
      await browser.close();
    }
  })();

  return {
    generatedAt: new Date().toISOString(),
    summary: summarize(clickReport, visualReport),
    clickAndLinkReport: clickReport,
    visualCheckReport: visualReport,
  };

}

module.exports = { runFullQA };
