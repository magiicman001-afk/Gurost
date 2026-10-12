"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const P = require("../lib/sections/premium");
const E = require("../lib/sections/escalation");
const SR = require("../lib/sections/senior");
const BL = require("../lib/build-log");
const L = require("../bots/library-bot");
const H = require("./helpers/premium-sample");

const reason = (code, text) => ({ code, text: text || code });
const sc = (total, reasons = []) => ({ total, pass: total >= 70, threshold: 70, reasons, parts: { mix: total } });
const PAL = "salon";
const looks = P.looksFor(PAL);
const available = new Set(["services", "about", "process", "faq", "cta", "features", "gallery", "booking", "location"]);
const GOOD_HTML = '<!doctype html><html lang="en"><head><title>T</title><style>a{color:red}</style></head><body><h1>Hi</h1><div><p>x</p></div></body></html>';
const built = (html = GOOD_HTML, sections = [{ id: "hero", variant: "a" }]) => ({ page: { html, sections }, gate: { failures: [] } });

/** Run the chain with a scripted sequence of scores (one per build, in order). */
async function run(scores, opts = {}) {
  const logger = BL.createLogger({ projectId: "p", buildId: "b" });
  const calls = [];
  let i = 0;
  const r = await E.runEscalation({
    palette: PAL, startLook: looks[0], available, used: new Set(), cfg: { threshold: 70 }, logger, slot: "minimal", content: opts.content || {},
    seniorEnabled: opts.seniorEnabled,
    buildOne: async (look, o) => {
      calls.push({ look: look.id, fallback: !!o.fallbackSearch, palette: o.palette });
      const step = scores[Math.min(i, scores.length - 1)];
      if (step instanceof Error) { i++; throw step; }
      return opts.built ? opts.built(look, i) : built();
    },
    review: async () => { const s = scores[Math.min(i, scores.length - 1)]; i++; return s; },
    onLevel: opts.onLevel,
  });
  return { r, logger, calls, bots: logger.entries.filter((e) => BL.CHAIN.includes(e.bot) && e.bot !== "builder" || e.bot === "builder").map((e) => e.bot) };
}
const chainBots = (logger) => logger.entries.filter((e) => BL.CHAIN.includes(e.bot)).map((e) => `${e.bot}:${e.result}`);

test("level 1: a passing builder ends the chain (no fixer, manager or senior)", async () => {
  const { r, logger, calls } = await run([sc(88)]);
  assert.equal(r.passed, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(chainBots(logger), ["builder:success", "builder:success"]); // the attempt, then "choose what to show"
  assert.ok(logger.entries.some((e) => e.bot === "reviewer" && e.result === "success"));
});

test("level 2: a failing builder escalates to the fixer, which repairs the same look and passes", async () => {
  const { r, logger, calls } = await run([sc(55, [reason("weak-hierarchy", "Headline is weak")]), sc(82)]);
  assert.equal(r.passed, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].look, calls[1].look, "the fixer repairs the same look");
  const first = logger.entries.find((e) => e.bot === "builder");
  assert.equal(first.result, "escalate");
  assert.equal(first.next_bot, "fixer");
  const fixer = logger.entries.find((e) => e.bot === "fixer");
  assert.match(fixer.task, /swap the hero section/);
  assert.equal(fixer.result, "success");
  assert.ok(!logger.entries.some((e) => e.bot === "manager" || e.bot === "senior"));
});

test("level 3: fixer fails, the manager replans with a different look and passes", async () => {
  const { r, logger, calls } = await run([sc(50, [reason("weak-hierarchy")]), sc(60, [reason("weak-hierarchy")]), sc(90)]);
  assert.equal(r.passed, true);
  assert.equal(calls.length, 3);
  assert.notEqual(calls[2].look, calls[0].look);
  assert.deepEqual(chainBots(logger).slice(0, 3), ["builder:escalate", "fixer:escalate", "manager:success"]);
  assert.equal(logger.entries.find((e) => e.bot === "fixer").next_bot, "manager");
  assert.ok(!logger.entries.some((e) => e.bot === "senior"));
});

test("level 4: everything fails, the senior inspects, tries one specific fix, and flags it when it does not help", async () => {
  const html = GOOD_HTML.replace("<h1>", '<img src="IMG_1" alt=""><h1>');
  const { r, logger } = await run([sc(40, [reason("weak-hierarchy")]), sc(45, [reason("weak-hierarchy")]), sc(50, [reason("weak-hierarchy")]), sc(48, [reason("weak-hierarchy")])], { built: () => built(html, [{ id: "hero", variant: "a" }, { id: "gallery", variant: "a" }]) });
  assert.equal(r.passed, false);
  assert.match(r.note, /^Quality check 50\/100/);
  const senior = logger.entries.filter((e) => e.bot === "senior");
  assert.ok(senior.length >= 2, "diagnosis, rebuild and report are all logged");
  const dive = senior[0];
  assert.equal(dive.next_bot, "builder");
  assert.ok(Array.isArray(dive.details.checks) && dive.details.checks.length === 8);
  assert.ok(dive.details.closest && dive.details.closest.id);
  assert.ok(senior.some((e) => e.details && e.details.flagged === true), "flagged for the admin");
  assert.equal(r.flagged, true);
  assert.match(r.report, /senior engineer found/);
});

test("level 4: not salvageable -> a plain-language report, flagged, no extra rebuild", async () => {
  const { r, logger, calls } = await run([sc(40, [reason("fonts")]), sc(41, [reason("fonts")]), sc(42, [reason("fonts")])]);
  assert.equal(calls.length, 2, "builder + manager; the fixer had nothing specific, the senior found nothing safe to rebuild");
  assert.equal(r.flagged, true);
  const rep = logger.entries.find((e) => e.bot === "senior" && e.details.report);
  assert.ok(rep);
  assert.match(rep.details.report, /needs a person/);
  assert.equal(rep.next_bot, null);
});

test("senior switched off: logged as skipped, nothing rebuilt", async () => {
  const { r, logger } = await run([sc(40, [reason("fonts")])], { seniorEnabled: false });
  const e = logger.entries.find((x) => x.bot === "senior");
  assert.equal(e.decision, "skipped");
  assert.equal(r.passed, false);
});

test("a look that cannot be built escalates (fixer has nothing to fix, manager builds another)", async () => {
  const { r, logger, calls } = await run([new Error("assembler exploded"), sc(85)]);
  assert.equal(r.passed, true);
  assert.equal(calls.length, 2);
  const b = logger.entries.find((e) => e.bot === "builder");
  assert.equal(b.result, "fail");
  assert.equal(b.next_bot, "fixer");
  const f = logger.entries.find((e) => e.bot === "fixer");
  assert.equal(f.decision, "none found");
  assert.ok(logger.entries.some((e) => e.bot === "manager" && e.result === "success"));
});

test("if nothing can be built at all the error surfaces", async () => {
  await assert.rejects(run([new Error("boom")]), /boom/);
});

test("the best attempt of any level ships", async () => {
  const { r } = await run([sc(30, [reason("fonts")]), sc(64, [reason("fonts")]), sc(52, [reason("fonts")]), sc(10)], {});
  assert.equal(r.best.score.total, 64);
});

test("manager borrows a neutral palette only when the industry's own looks are used up", () => {
  const used = new Set(looks.map((l) => l.id));
  const pick = E.managerPick({ palette: PAL, attempts: [{ score: sc(40, []) }], used, triedFallback: false });
  assert.equal(pick.paletteChanged, true);
  assert.ok(["tech", "law"].includes(pick.palette));
  const own = E.managerPick({ palette: PAL, attempts: [{ score: sc(40, []) }], used: new Set([looks[0].id]), triedFallback: false });
  assert.equal(own.palette, PAL);
  assert.ok(!own.paletteChanged);
  const none = E.managerPick({ palette: "tech", attempts: [{ score: sc(40, []) }], used: new Set(P.allLooks().map((l) => l.id)), triedFallback: false });
  assert.equal(none, null);
});

test("fixer plans: photos first, then section count, then a variant swap that cycles a>b>c>a", () => {
  const base = { look: looks[0], available, triedFallback: false };
  const photo = E.fixerPlan({ ...base, score: sc(50, [reason("no-hero-image")]) });
  assert.equal(photo.fallbackSearch, true);
  assert.equal(E.fixerPlan({ ...base, triedFallback: true, score: sc(50, [reason("no-hero-image")]) }), null);
  const thin = E.fixerPlan({ ...base, score: sc(50, [reason("few-sections")]) });
  assert.ok(thin.look.order.length > looks[0].order.length);
  const bloated = E.fixerPlan({ ...base, score: sc(50, [reason("many-sections")]) });
  assert.ok(bloated.look.order.length < looks[0].order.length);
  const look = { ...looks[0], variants: { ...looks[0].variants, hero: "c" } };
  assert.equal(E.fixerPlan({ ...base, look, score: sc(50, [reason("contrast")]) }).look.variants.hero, "a");
  assert.equal(E.fixerPlan({ ...base, score: sc(50, [reason("build-failed")]) }), null);
  assert.equal(E.fixerPlan({ ...base, score: sc(50, [reason("fonts")]) }), null);
});

test("onLevel fires for every bot after the builder", async () => {
  const seen = [];
  await run([sc(40, [reason("fonts")]), sc(41, [reason("fonts")]), sc(42, [reason("fonts")])], { onLevel: (x) => seen.push(x.bot) });
  assert.deepEqual(seen, ["manager"], "the fixer had nothing to fix, so only the manager ran an attempt");
});

// ---- senior checks --------------------------------------------------------------------------------------------------

test("senior checks: html, css, images, links, security each catch their own defect", () => {
  assert.equal(SR.checkHtml(GOOD_HTML).ok, true);
  assert.match(SR.checkHtml("<html><body><h1>a</h1><h1>b</h1><div></body></html>").detail, /no doctype.*2 h1.*div/);
  assert.equal(SR.checkCss("<style>a{color:red</style>").ok, false);
  assert.equal(SR.checkCss("<style>a{}</style>").ok, false);
  assert.match(SR.checkImages('<img src="IMG_3" alt="x">').detail, /never filled/);
  assert.match(SR.checkImages('<img src="https://x/y.jpg">').detail, /without alt/);
  assert.match(SR.checkLinks('<a href="#">x</a><a href="#nope">y</a><div id="yes"></div><a href="#yes">z</a>').detail, /href="#".*missing section.*nope/);
  const sec = SR.checkSecurity('<a href="javascript:x()">a</a><button onclick="x()">b</button><script src="https://evil.example/x.js"></script><a target="_blank" href="https://x">c</a>');
  assert.equal(sec.ok, false);
  for (const w of ["javascript:", "event handler", "unknown host", "noopener"]) assert.ok(sec.detail.includes(w), w);
  assert.equal(SR.checkSecurity('<script src="https://cdn.jsdelivr.net/npm/x"></script><a target="_blank" rel="noopener" href="x">c</a>').ok, true);
});

test("senior schema check reads required slots from the manifest", () => {
  const ok = SR.checkSchema([{ id: "hero" }], { hero: { headline: "A", subhead: "B", cta1_label: "Go" } });
  assert.equal(ok.ok, true);
  const bad = SR.checkSchema([{ id: "hero" }], { hero: { headline: "", subhead: "B", cta1_label: "Go" } });
  assert.equal(bad.ok, false);
  assert.match(bad.detail, /hero\.headline is empty/);
});

test("senior ranks all 24 looks and the look itself is the closest match to its own page", () => {
  const look = looks[2];
  const ranked = SR.rankLooks(look.order.map((id) => ({ id, variant: look.variants[id] })));
  assert.equal(ranked.length, 24);
  assert.equal(ranked[0].match, 100);
  assert.equal(ranked.find((x) => x.id === look.id).match, 100, "ties with identical looks of other industries are possible");
});

test("senior applyFix never drops navbar, hero or footer", () => {
  const out = SR.applyFix(looks[0], { drop: ["hero", "gallery", "navbar"], fallbackSearch: true });
  assert.ok(out.look.order.includes("hero") && out.look.order.includes("navbar") && out.look.order.includes("footer"));
  assert.ok(!out.look.order.includes("gallery"));
  assert.equal(out.fallbackSearch, true);
});

// ---- the log ----------------------------------------------------------------------------------------------------------

test("logger: normalises entries, strips html/secrets from details, writes to build_logs, never throws", () => {
  const rows = [];
  const heard = [];
  const lg = BL.createLogger({ projectId: "p1", buildId: "b1", userId: 5, db: { from: (t) => ({ insert: (r) => { rows.push([t, r]); return Promise.resolve({ error: null }); } }) }, onEntry: (e) => heard.push(e) });
  const e = lg.log({ bot: "fixer", task: "t", decision: "d", reason: "r", time_ms: 12.6, result: "weird", next_bot: "manager", details: { html: "<b>", apiKey: "k", ok: 1, nested: { password: "p", n: 2 }, list: new Array(50).fill("x") } });
  assert.equal(e.result, "fail", "an unknown result is recorded as fail, not dropped");
  assert.equal(e.time_ms, 13);
  assert.equal(e.user_id, "5");
  assert.deepEqual(Object.keys(e.details).sort(), ["list", "nested", "ok"]);
  assert.deepEqual(e.details.nested, { n: 2 });
  assert.equal(e.details.list.length, 30);
  assert.equal(rows[0][0], "build_logs");
  assert.equal(heard.length, 1);
  assert.doesNotThrow(() => BL.createLogger({ db: { from() { throw new Error("db down"); } }, onEntry() { throw new Error("ui"); } }).log({ bot: "builder" }));
  assert.doesNotThrow(() => BL.nullLogger.log({ bot: "x" }));
});

test("logger.step logs success and failure with timing", async () => {
  const lg = BL.createLogger({});
  assert.equal(await lg.step("builder", "do it", async () => 7), 7);
  await assert.rejects(lg.step("fixer", "break it", async () => { throw new Error("nope"); }), /nope/);
  assert.deepEqual(lg.entries.map((e) => [e.bot, e.result]), [["builder", "success"], ["fixer", "fail"]]);
  assert.equal(lg.entries[1].reason, "nope");
});

test("flags: default on, '0' turns off, build logs for admins have no switch", () => {
  assert.equal(BL.escalationOn({}), true);
  assert.equal(BL.escalationOn({ ESCALATION_HIERARCHY: "0" }), false);
  assert.equal(BL.seniorOn({}), true);
  assert.equal(BL.seniorOn({ SENIOR_BOT_ENABLED: "0" }), false);
  assert.equal(BL.logsVisible({ BUILD_LOGS_VISIBLE: "0" }), false);
  assert.equal(BL.logsVisible({}), true);
});

test("groupBuilds orders each chain, flags escalated and flagged builds", () => {
  const rows = [
    { build_id: "b2", project_id: "p", bot: "builder", result: "success", created_at: "2026-10-12T10:00:00Z", details: {} },
    { build_id: "b1", project_id: "p", bot: "fixer", result: "escalate", created_at: "2026-10-12T09:00:02Z", details: {} },
    { build_id: "b1", project_id: "p", bot: "builder", result: "escalate", created_at: "2026-10-12T09:00:01Z", details: {} },
    { build_id: "b1", project_id: "p", bot: "senior", result: "fail", created_at: "2026-10-12T09:00:03Z", details: { flagged: true } },
  ];
  const g = BL.groupBuilds(rows);
  assert.equal(g[0].buildId, "b2", "newest build first");
  const b1 = g.find((b) => b.buildId === "b1");
  assert.deepEqual(b1.entries.map((e) => e.bot), ["builder", "fixer", "senior"]);
  assert.equal(b1.escalated, true);
  assert.equal(b1.flagged, true);
  assert.equal(b1.failures, 1);
  assert.equal(g[0].flagged, false);
});

// ---- the whole bot ----------------------------------------------------------------------------------------------------

test("library bot: logs copywriter, photographer, reviewer and the builder chain; escalation off = old loop", async () => {
  const logger = BL.createLogger({ projectId: "p", buildId: "b" });
  const orig = console.log;
  console.log = () => {};
  let r;
  try {
    r = await L.generateLibraryVariants("a hair salon in Manchester", { businessInfo: H.INFO, premium: true, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("salon"), search: H.search, logger });
  } finally { console.log = orig; }
  assert.equal(r.variants.length, 2);
  const bots = new Set(logger.entries.map((e) => e.bot));
  for (const b of ["copywriter", "photographer", "reviewer", "builder"]) assert.ok(bots.has(b), `missing ${b}`);
  for (const e of logger.entries) {
    assert.ok(["success", "fail", "escalate"].includes(e.result));
    assert.ok("task" in e && "decision" in e && "reason" in e && "time_ms" in e && "next_bot" in e && e.details);
  }
  assert.ok(r.variants[0].premium.levels.length >= 1);

  const old = BL.createLogger({});
  process.env.ESCALATION_HIERARCHY = "0";
  try {
    console.log = () => {};
    await L.generateLibraryVariants("a hair salon in Manchester", { businessInfo: H.INFO, premium: true, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("salon"), search: H.search, logger: old });
  } finally { console.log = orig; delete process.env.ESCALATION_HIERARCHY; }
  assert.ok(!old.entries.some((e) => e.bot === "fixer" || e.bot === "manager" || e.bot === "senior"));
});

test("library bot, not premium: the builder's action is logged too", async () => {
  const logger = BL.createLogger({});
  await L.generateLibraryVariants("a hair salon in Manchester", { businessInfo: H.INFO, premium: false, browserChecks: false, previewStepMs: 0, callModel: async () => H.sampleModel("salon"), search: H.search, logger });
  assert.equal(logger.entries.filter((e) => e.bot === "builder").length, 2);
});

test("server wiring: user route is owner-checked and switchable, admin route needs the builds section", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(src, /app\.get\("\/api\/project\/:id\/build-log"[\s\S]{0,400}logsVisible[\s\S]{0,300}getProject\(/);
  assert.match(src, /app\.get\("\/api\/admin\/build-logs", requireAdminAuth, adminAccess\.needs\("builds"\)/);
  assert.match(src, /const \{ user_id, \.\.\.pub \} = entry/, "the owner's user id is not streamed to the page");
  assert.equal((src.match(/logger: makeBuildLogger\(/g) || []).length, 2, "both build routes log");
});
