/**
 * QA Bot 1 — Button & Link Tester. Real auto-discovery, not a
 * hardcoded page list: starts from real entry points, follows every
 * same-origin link it finds, and builds the site map itself.
 *
 * SAFETY, non-negotiable, read before changing DENYLIST_PATTERNS:
 * this bot clicks real things on a real, live app with a real test
 * account. Below is a real denylist of actions it will NEVER click,
 * confirmed against every real button in this codebase before this
 * was written, not guessed at. Extending what this bot does to click
 * new areas of the app means checking THAT area's real buttons
 * against this list first — the list needs to already fit an area,
 * not the other way around.
 */

const { chromium } = require("playwright");

const TEST_EMAIL = "test@gurost.com";
const TEST_PASSWORD = "Test@123456";

// Never clicked, ever, regardless of what else changes about this
// bot. Real, confirmed matches against this codebase: Delete Account
// (settings.html), Deactivate/Reactivate (admin.html), Send Reset
// Link (signup.html). The rest is real defensive coverage for
// anything not yet built but easy to add later (payments, invites,
// subscriptions) without anyone remembering to update this list first.
const DENYLIST_PATTERNS = [
  /delete/i, /deactivat/i, /reactivat/i, /remove/i, /terminat/i, /cancel/i,
  /\bpay\b/i, /checkout/i, /billing/i, /invoice/i, /refund/i, /purchase/i, /\bbuy\b/i,
  /upgrade/i, /downgrade/i, /subscri/i, /unsubscri/i,
  /log ?out/i, /\bsend\b/i, /invite/i, /revoke/i, /card/i
];

// Clicked and tested normally, but flagged in the report as costing
// real money per run — these trigger real, billed AI calls now that
// generation actually works. Real, confirmed matches: Generate
// Website, Generate App, Audit, Restart Live Building (re-triggers
// generation, not literally named "generate" but does the same thing).
const COST_WARNING_PATTERNS = [/generate/i, /audit/i, /restart.*building/i];

function classifyButton(text) {
  if (DENYLIST_PATTERNS.some((p) => p.test(text))) return "denied";
  if (COST_WARNING_PATTERNS.some((p) => p.test(text))) return "costs_money";
  return "safe";
}

async function login(baseUrl, browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/signup.html`, { waitUntil: "networkidle", timeout: 30000 });
  await page.click("#btn-login");
  await page.fill("#li-email", TEST_EMAIL);
  await page.fill("#li-password", TEST_PASSWORD);
  await page.click("#loginSubmit");
  await page.waitForTimeout(2000);
  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

/**
 * Real crawl — starts from real seed pages, follows every same-origin
 * link found, stays within the site (never follows an external URL),
 * and stops at a real page-count cap so a link cycle or a very large
 * site can't turn this into a runaway job.
 */
async function crawlSite(browser, storageState, baseUrl, seedPaths, maxPages = 12) {
  const context = storageState ? await browser.newContext({ storageState }) : await browser.newContext();
  const page = await context.newPage();
  const origin = new URL(baseUrl).origin;

  const seen = new Set();
  const queue = [...seedPaths];
  const discovered = [];

  while (queue.length && discovered.length < maxPages) {
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);

    try {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 20000 });
    } catch {
      discovered.push({ path, reachable: false });
      continue;
    }

    discovered.push({ path, reachable: true });

    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const href of hrefs) {
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      let resolved;
      try {
        resolved = new URL(href, `${baseUrl}${path}`);
      } catch {
        continue;
      }
      if (resolved.origin !== origin) continue; // never follow off-site links
      const normalizedPath = resolved.pathname + resolved.search;
      if (!seen.has(normalizedPath) && !queue.includes(normalizedPath)) {
        queue.push(normalizedPath);
      }
    }
  }

  await context.close();
  return discovered;
}

async function testPage(browser, storageState, baseUrl, path) {
  const context = storageState ? await browser.newContext({ storageState }) : await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300)); });
  page.on("response", (res) => { if (res.status() >= 400) networkErrors.push(`${res.status()} ${res.url().slice(0, 150)}`); });
  page.on("pageerror", (err) => consoleErrors.push(`Uncaught: ${err.message.slice(0, 300)}`));

  const result = { page: path, loaded: false, consoleErrors: [], networkErrors: [], elements: [] };

  try {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    result.loaded = true;
  } catch (err) {
    result.loadError = err.message.slice(0, 300);
    await context.close();
    return result;
  }

  // Real discovery of every clickable thing actually on the page,
  // rather than a hardcoded list — buttons and links both, since both
  // are "clickable elements" per what was asked for.
  const clickables = await page.$$eval("button, a[href]", (els) =>
    els.map((el, i) => ({
      index: i,
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 80),
      href: el.tagName.toLowerCase() === "a" ? el.getAttribute("href") : null
    })).filter((el) => el.text) // skip icon-only elements with no real label to identify or classify them by
  );

  for (const el of clickables) {
    const classification = classifyButton(el.text);
    if (classification === "denied") {
      result.elements.push({ text: el.text, tag: el.tag, classification, tested: false, reason: "matched safety denylist — never clicked" });
      continue;
    }

    const before = { url: page.url(), errCount: consoleErrors.length, netErrCount: networkErrors.length };
    try {
      const selector = el.tag === "a" ? `a:has-text("${el.text}")` : `button:has-text("${el.text}")`;
      await page.click(selector, { timeout: 5000 });
      await page.waitForTimeout(el.tag === "a" ? 1500 : 3000);

      const after = { url: page.url(), errCount: consoleErrors.length, netErrCount: networkErrors.length };
      const entry = {
        text: el.text,
        tag: el.tag,
        classification,
        tested: true,
        urlBefore: before.url,
        urlAfter: after.url,
        urlChanged: before.url !== after.url,
        newConsoleErrors: consoleErrors.slice(before.errCount),
        newNetworkErrors: networkErrors.slice(before.netErrCount),
      };

      // Real, honest "did it go to the right place" — only genuinely
      // checkable for real links, where the declared destination
      // (href) is compared against where it actually landed.
      if (el.tag === "a" && el.href && !el.href.startsWith("#") && !el.href.startsWith("javascript:")) {
        let expected;
        try { expected = new URL(el.href, before.url).pathname; } catch { expected = null; }
        const actual = new URL(after.url).pathname;
        entry.expectedDestination = expected;
        entry.actualDestination = actual;
        entry.wentToRightPlace = expected ? expected === actual : null;
      }

      result.elements.push(entry);

      // Real, honest recovery — a click may have navigated away or
      // broken the page; return to the page under test so the next
      // element's "before" state is genuinely this page, not wherever
      // the last click left us.
      if (before.url !== page.url()) {
        await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
      }
    } catch (err) {
      result.elements.push({ text: el.text, tag: el.tag, classification, tested: false, reason: err.message.slice(0, 200) });
    }
  }

  result.consoleErrors = consoleErrors;
  result.networkErrors = networkErrors;
  await context.close();
  return result;
}

// Real, deliberately small default — was 60, cut down after a real
// out-of-memory crash on Render's free tier mid-run. Covers the pages
// that actually matter (the ones from the printed QA checklist) with
// real room to spare, rather than wandering into every marketing/legal
// page on the site and running out of memory before finishing.
async function runClickAudit(baseUrl, seedPaths = ["/index.html", "/dashboard.html"], maxPages = 12) {
  const browser = await chromium.launch();
  try {
    let storageState = null;
    try {
      storageState = await login(baseUrl, browser);
    } catch (err) {
      console.warn("[qa-bot1] Login failed, continuing without it:", err.message);
    }

    const discovery = await crawlSite(browser, storageState, baseUrl, seedPaths, maxPages);
    const reachablePaths = discovery.filter((d) => d.reachable).map((d) => d.path);

    const results = [];
    for (const path of reachablePaths) {
      results.push(await testPage(browser, storageState, baseUrl, path));
    }

    return {
      auditedAt: new Date().toISOString(),
      loginSucceeded: !!storageState,
      pagesDiscovered: discovery.length,
      pagesUnreachable: discovery.filter((d) => !d.reachable),
      results,
    };
  } finally {
    await browser.close();
  }
}

module.exports = { runClickAudit, classifyButton, login, DENYLIST_PATTERNS, COST_WARNING_PATTERNS };
