/**
 * Full-site Playwright audit for GUROST's public/ pages, run against a
 * locally running server.js (default http://localhost:3000).
 *
 * Read-only against the app: no destructive actions are taken. Buttons
 * whose text/aria-label looks destructive (delete, logout, cancel
 * subscription, etc.) are skipped, and any click that would navigate
 * to a different origin (Stripe checkout, OAuth providers, etc.) is
 * intercepted and aborted rather than followed, so this never actually
 * hits a real third-party endpoint.
 *
 * Usage: node scripts/playwright-audit.js [baseUrl]
 * Output: screenshots/*.png + screenshots/report.json + console summary
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.argv[2] || "http://localhost:3000";
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SCREENSHOT_DIR = path.join(__dirname, "..", "screenshots");
const NAV_TIMEOUT_MS = 15000;
const ACTION_TIMEOUT_MS = 5000;

const DESTRUCTIVE_RE = /(delete|remove|logout|log out|sign out|cancel subscription|unsubscribe|deactivate|revoke|destroy)/i;

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function listHtmlFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".html"))
    .map((e) => e.name)
    .sort();
}

async function auditPage(browser, file) {
  const url = `${BASE_URL}/${file}`;
  const result = {
    file,
    url,
    status: null,
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    links: { total: 0, internalChecked: 0, broken: [] },
    buttons: { total: 0, clicked: 0, skippedDestructive: 0, errorsOnClick: [] },
    forms: { total: 0, emptySubmitBlocked: 0, notes: [] },
    faq: { found: 0, toggled: 0, notWorking: [] },
    pricingHover: { cardsFound: 0, liftedOnHover: 0, notLifting: [] },
    screenshot: null,
    fatal: null,
    authRedirect: null, // set if this page auth-gates and bounced us elsewhere before we could test it
  };

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") result.consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on("pageerror", (err) => result.pageErrors.push(String(err).slice(0, 500)));
  page.on("requestfailed", (req) => {
    result.requestFailures.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText || "failed"}`);
  });

  // Never actually leave localhost — abort any navigation/request to a
  // different origin (Stripe, OAuth providers, etc.) instead of
  // following it, so clicking a real "Subscribe" or "Sign in with X"
  // button can't reach a live third-party service.
  await page.route("**/*", (route) => {
    const reqUrl = route.request().url();
    try {
      const u = new URL(reqUrl);
      const base = new URL(BASE_URL);
      if (u.origin !== base.origin && route.request().isNavigationRequest()) {
        return route.abort();
      }
    } catch (_) {}
    return route.continue();
  });

  try {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });
    result.status = resp ? resp.status() : null;
  } catch (e) {
    result.fatal = `Navigation failed: ${e.message}`;
    await context.close();
    return result;
  }

  // --- Full-page screenshot ---
  try {
    const shotPath = path.join(SCREENSHOT_DIR, `${file.replace(/\.html$/, "")}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    result.screenshot = path.relative(path.join(__dirname, ".."), shotPath);
  } catch (e) {
    result.notes = result.notes || [];
    result.notes.push(`Screenshot failed: ${e.message}`);
  }

  // Auth-gated pages bounce to login/signup before any JS finishes —
  // detect that now so we don't waste the button/form/faq/hover passes
  // clicking around on the WRONG page and reporting false "bugs".
  if (page.url() !== url) {
    result.authRedirect = page.url();
    await context.close();
    return result;
  }

  // --- Links: collect + check internal ones for real status codes ---
  try {
    const hrefs = await page.$$eval("a[href]", (as) =>
      as.map((a) => a.getAttribute("href")).filter(Boolean)
    );
    result.links.total = hrefs.length;
    const base = new URL(BASE_URL);
    const seen = new Set();
    for (const href of hrefs) {
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
      let full;
      try {
        full = new URL(href, url);
      } catch (_) {
        continue;
      }
      if (full.origin !== base.origin) continue; // don't hit external sites
      if (seen.has(full.href)) continue;
      seen.add(full.href);
      result.links.internalChecked++;
      try {
        const r = await page.request.get(full.href, { timeout: ACTION_TIMEOUT_MS });
        if (r.status() >= 400) result.links.broken.push(`${full.pathname} → HTTP ${r.status()}`);
      } catch (e) {
        result.links.broken.push(`${full.pathname} → request failed (${e.message.slice(0, 80)})`);
      }
    }
  } catch (e) {
    result.notes = result.notes || [];
    result.notes.push(`Link audit failed: ${e.message}`);
  }

  // --- Buttons: click each non-destructive, visible, enabled button ---
  try {
    const buttonHandles = await page.$$("button, [role=button], input[type=submit], input[type=button]");
    result.buttons.total = buttonHandles.length;
    for (const handle of buttonHandles) {
      let label = "";
      try {
        label = ((await handle.innerText().catch(() => "")) || (await handle.getAttribute("aria-label")) || (await handle.getAttribute("value")) || "").trim();
      } catch (_) {}
      if (DESTRUCTIVE_RE.test(label)) {
        result.buttons.skippedDestructive++;
        continue;
      }
      try {
        const visible = await handle.isVisible();
        const enabled = await handle.isEnabled();
        if (!visible || !enabled) continue;
        const urlBefore = page.url();
        const errCountBefore = result.consoleErrors.length + result.pageErrors.length;
        await handle.click({ timeout: ACTION_TIMEOUT_MS, trial: false }).catch((e) => {
          throw e;
        });
        result.buttons.clicked++;
        await page.waitForTimeout(150); // let any handler/console error fire
        const newErrs = result.consoleErrors.length + result.pageErrors.length - errCountBefore;
        if (newErrs > 0) {
          result.buttons.errorsOnClick.push({ label: label.slice(0, 60) || "(unlabeled)", newErrors: newErrs });
        }
        if (page.url() !== urlBefore && new URL(page.url()).origin === new URL(BASE_URL).origin && page.url() !== url) {
          // Navigated to another internal page — go back to keep auditing this page's other buttons.
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch(() => {});
        }
      } catch (e) {
        result.buttons.errorsOnClick.push({ label: label.slice(0, 60) || "(unlabeled)", error: e.message.slice(0, 120) });
      }
    }
  } catch (e) {
    result.notes = result.notes || [];
    result.notes.push(`Button audit failed: ${e.message}`);
  }

  // --- Forms: submit empty and confirm native/JS validation blocks it ---
  try {
    const forms = await page.$$("form");
    result.forms.total = forms.length;
    for (const form of forms) {
      const urlBefore = page.url();
      const submitBtn = await form.$("button[type=submit], input[type=submit], button:not([type])");
      if (!submitBtn) continue;
      try {
        await submitBtn.click({ timeout: ACTION_TIMEOUT_MS });
        await page.waitForTimeout(200);
        const stillSamePage = page.url() === urlBefore;
        const hasInvalid = await form.$$eval("input:invalid, select:invalid, textarea:invalid", (els) => els.length).catch(() => 0);
        if (stillSamePage || hasInvalid > 0) result.forms.emptySubmitBlocked++;
        else result.forms.notes.push("A form submitted with empty required fields and left the page — check server-side validation.");
        if (page.url() !== urlBefore) {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }).catch(() => {});
        }
      } catch (e) {
        result.forms.notes.push(`Form submit test failed: ${e.message.slice(0, 100)}`);
      }
    }
  } catch (e) {
    result.notes = result.notes || [];
    result.notes.push(`Form audit failed: ${e.message}`);
  }

  // --- FAQ expand/collapse ---
  try {
    const faqItems = await page.$$(
      "details, [class*=faq-btn], [class*=faq-toggle], [class*=faq-question], [class*=accordion-btn], [class*=accordion-toggle], [class*=accordion-header], [data-faq], summary"
    );
    result.faq.found = faqItems.length;
    for (const item of faqItems) {
      try {
        const before = await item.evaluate((el) => (el.tagName === "DETAILS" ? el.open : el.getAttribute("aria-expanded")));
        await item.click({ timeout: ACTION_TIMEOUT_MS }).catch(() => {});
        await page.waitForTimeout(150);
        const after = await item.evaluate((el) => (el.tagName === "DETAILS" ? el.open : el.getAttribute("aria-expanded")));
        if (String(before) === String(after)) {
          result.faq.notWorking.push("An FAQ/accordion item didn't change state on click.");
        } else {
          result.faq.toggled++;
        }
      } catch (e) {
        result.faq.notWorking.push(`FAQ toggle test failed: ${e.message.slice(0, 100)}`);
      }
    }
  } catch (e) {
    result.notes = result.notes || [];
    result.notes.push(`FAQ audit failed: ${e.message}`);
  }

  // --- Pricing card hover lift ---
  try {
    const cards = await page.$$("[class*=pricing-card], [class*=price-card], [class*=plan-card], [class*=card-hover]");
    result.pricingHover.cardsFound = cards.length;
    for (const card of cards) {
      try {
        const before = await card.evaluate((el) => getComputedStyle(el).transform);
        await card.hover({ timeout: ACTION_TIMEOUT_MS });
        await page.waitForTimeout(250);
        const after = await card.evaluate((el) => getComputedStyle(el).transform);
        if (before !== after) result.pricingHover.liftedOnHover++;
        else result.pricingHover.notLifting.push("A pricing card's transform didn't change on hover.");
      } catch (e) {
        result.pricingHover.notLifting.push(`Hover test failed: ${e.message.slice(0, 100)}`);
      }
    }
  } catch (e) {
    result.notes = result.notes || [];
    result.notes.push(`Pricing hover audit failed: ${e.message}`);
  }

  await context.close();
  return result;
}

(async () => {
  const files = listHtmlFiles(PUBLIC_DIR);
  console.log(`Found ${files.length} HTML pages in public/. Base URL: ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const file of files) {
    process.stdout.write(`Auditing ${file} ... `);
    const r = await auditPage(browser, file);
    results.push(r);
    if (r.fatal) console.log(`FATAL: ${r.fatal}`);
    else if (r.authRedirect) console.log(`auth-redirected to ${r.authRedirect} (skipped interaction tests, expected for logged-out visitor)`);
    else console.log(`HTTP ${r.status}, ${r.consoleErrors.length + r.pageErrors.length} JS errors, ${r.buttons.clicked}/${r.buttons.total} buttons clicked`);
  }

  await browser.close();

  const reportPath = path.join(SCREENSHOT_DIR, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  // --- Summary ---
  let totalButtons = 0, totalClicked = 0, totalBugs = 0, pagesWithFatal = 0;
  for (const r of results) {
    totalButtons += r.buttons.total;
    totalClicked += r.buttons.clicked;
    if (r.fatal) { pagesWithFatal++; totalBugs++; continue; }
    totalBugs += r.consoleErrors.length + r.pageErrors.length + r.requestFailures.length
      + r.links.broken.length + r.buttons.errorsOnClick.length
      + r.forms.notes.length + r.faq.notWorking.length + r.pricingHover.notLifting.length;
  }

  console.log("\n===== AUDIT SUMMARY =====");
  console.log(`Total pages tested: ${results.length} (${pagesWithFatal} failed to load)`);
  console.log(`Total buttons found: ${totalButtons}, clicked: ${totalClicked}`);
  console.log(`Total issues found (console errors + broken links + failed clicks + form/FAQ/hover issues): ${totalBugs}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}`);
  console.log(`Full JSON report: ${reportPath}`);
})();
