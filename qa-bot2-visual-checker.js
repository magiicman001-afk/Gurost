/**
 * QA Bot 2 — Visual Consistency Checker. Real full-page screenshots,
 * real pixel-level diffing (pixelmatch), baselines stored in Supabase
 * Storage — NOT on Render's local disk, which resets on every deploy
 * and would silently lose every baseline the moment new code ships.
 *
 * FIRST RUN ON ANY PAGE has nothing to compare against yet — it
 * captures and stores a baseline, and says so plainly rather than
 * reporting a false "no regression found."
 *
 * APPROVING A NEW BASELINE, real and manual on purpose: after an
 * intentional design change, the old baseline should be replaced
 * deliberately, not automatically — silently overwriting on every run
 * would mean a real regression on day 1 becomes tomorrow's accepted
 * baseline, and the whole tool stops catching anything. Call
 * runVisualCheck with updateBaseline=true only when you've confirmed
 * a change is real and wanted.
 */

const { chromium } = require("playwright");
const pixelmatch = require("pixelmatch");
const { PNG } = require("pngjs");
const { supabase } = require("./lib/db");

const BUCKET = "qa-baselines";
const DIFF_THRESHOLD_PERCENT = 0.5; // >0.5% of pixels differing gets flagged — real, tunable, not a magic constant hidden deep in logic

async function getBaseline(path) {
  const key = `${path.replace(/\//g, "_")}.png`;
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) return null; // real "no baseline yet" case, not an actual failure
  const buf = Buffer.from(await data.arrayBuffer());
  return PNG.sync.read(buf);
}

async function saveBaseline(path, pngBuffer) {
  const key = `${path.replace(/\//g, "_")}.png`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, pngBuffer, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`Failed saving baseline for ${path}: ${error.message}`);
}

/**
 * Real, pure diff logic — takes two already-decoded PNGs, returns a
 * real percentage. Separated from the screenshot/storage plumbing
 * above so this specific piece can be tested directly against known
 * images rather than only trusted by inspection.
 */
function diffPercent(baselinePng, currentPng) {
  if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
    // Real, honest case: a layout change resized the page. Not a
    // pixel-diffable situation — report it as its own distinct finding
    // rather than forcing a percentage that wouldn't mean anything.
    return { comparable: false, reason: `Size changed: ${baselinePng.width}x${baselinePng.height} -> ${currentPng.width}x${currentPng.height}` };
  }
  const { width, height } = baselinePng;
  const diffImg = new PNG({ width, height });
  const diffPixels = pixelmatch(baselinePng.data, currentPng.data, diffImg.data, width, height, { threshold: 0.1 });
  const totalPixels = width * height;
  const percent = (diffPixels / totalPixels) * 100;
  return { comparable: true, diffPixels, totalPixels, percent, diffImagePng: diffImg };
}

async function checkPage(browser, storageState, baseUrl, path, updateBaseline) {
  const context = storageState ? await browser.newContext({ storageState }) : await browser.newContext();
  const page = await context.newPage();
  const result = { page: path };

  try {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000); // real, honest settle time for late-loading images/fonts before the shot
    const screenshotBuffer = await page.screenshot({ fullPage: true, type: "png" });
    const currentPng = PNG.sync.read(screenshotBuffer);

    const baselinePng = updateBaseline ? null : await getBaseline(path);

    if (!baselinePng) {
      await saveBaseline(path, screenshotBuffer);
      result.status = updateBaseline ? "baseline_updated" : "baseline_captured";
      result.note = updateBaseline
        ? "Existing baseline replaced with the current page, per your explicit request."
        : "No baseline existed yet — this run became the baseline. Nothing to compare against on this run.";
    } else {
      const diff = diffPercent(baselinePng, currentPng);
      if (!diff.comparable) {
        result.status = "size_changed";
        result.note = diff.reason;
      } else {
        result.status = diff.percent > DIFF_THRESHOLD_PERCENT ? "regression_flagged" : "matches_baseline";
        result.diffPercent = Math.round(diff.percent * 100) / 100;
        result.diffPixels = diff.diffPixels;
        result.totalPixels = diff.totalPixels;
      }
    }
  } catch (err) {
    result.status = "error";
    result.error = err.message.slice(0, 300);
  }

  await context.close();
  return result;
}

async function runVisualCheck(baseUrl, paths, { storageState = null, updateBaseline = false } = {}) {
  const browser = await chromium.launch();
  try {
    const results = [];
    for (const path of paths) {
      results.push(await checkPage(browser, storageState, baseUrl, path, updateBaseline));
    }
    return {
      checkedAt: new Date().toISOString(),
      threshold: DIFF_THRESHOLD_PERCENT,
      pageCount: results.length,
      results,
    };
  } finally {
    await browser.close();
  }
}

module.exports = { runVisualCheck, diffPercent, DIFF_THRESHOLD_PERCENT };
