// Run: node --test test/ai-brand.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../public/shared/ai-brand");
const C = require("../public/shared/brand-config");
const N = C.NAME;

test("the name and avatar come from the one config file; status lines are built from it", () => {
  assert.equal(F.NAME, C.NAME);
  assert.equal(F.AVATAR, C.AVATAR);
  assert.equal(F.STATUS.thinking, N + " is thinking…");
  assert.equal(F.STATUS.analyzing, N + " is analyzing…");
  assert.equal(F.STATUS.builtSite, N + " built your site.");
  assert.equal(F.STATUS.found(3), N + " found 3 issues.");
  assert.equal(F.STATUS.found(1), N + " found 1 issue.");
  assert.equal(F.STATUS.found(0), N + " found no issues.");
  assert.match(F.VOICE.noticed, /^I noticed something\. Here's what I'd try\.$/);
  assert.equal(F.VOICE.ready, "Looking good. Ready to launch?");
  assert.equal(F.CANT_SHARE, "I can't share that.");
});

test("honesty rule: says it can't share, never denies being an AI, never claims to be Gurost's own model", () => {
  const r = F.IDENTITY_RULE;
  assert.ok(r.startsWith("You are " + N));
  assert.match(r, /reply exactly: "I can't share that\."/);
  assert.match(r, /Never deny being an AI/);
  assert.match(r, /Never say or imply that Gurost trained or built you/);
  assert.equal(F.mentionsModel(r), false, "the rule itself names no model");
  assert.ok(r.length < 700, "short enough to add to every chat prompt");
  assert.ok(r.endsWith(F.IDENTITY_RULES));
  assert.ok(!r.slice(0, -F.IDENTITY_RULES.length).includes("trained"));
});

test("mentionsModel catches model and provider names, slugs included, and nothing ordinary", () => {
  for (const t of ["Claude", "claude-sonnet-5", "Powered by GPT-4", "ChatGPT", "Gemini unavailable (quota)", "DeepSeek", "GLM 5.2", "OpenRouter error (402)", "anthropic/claude-sonnet-5", "z-ai/glm-5.2", "nvidia/nemotron-3-super-120b-a12b:free", "FLUX image failed", "Qwen3", "Llama", "Mistral", "Grok", "an OpenAI model"]) {
    assert.equal(F.mentionsModel(t), true, t);
  }
  for (const t of ["", null, undefined, N + " is thinking…", "Google Maps", "Crumb & Co", "a hero image", "Your order form is ready", "Room o1 is free", "Pixabay photo"]) {
    assert.equal(F.mentionsModel(t), false, String(t));
  }
});

test("publicText turns model-naming text into a friendly line and leaves everything else alone", () => {
  assert.equal(F.publicText("Your site is ready."), "Your site is ready.");
  assert.equal(F.publicText(null), "");
  assert.equal(F.publicText('OpenRouter error (500) calling model "z-ai/glm-5.2": boom'), N + " hit a snag. Please try again in a moment.");
  assert.equal(F.publicText("Gemini paused after a payment/quota error"), N + " is very busy right now. Please try again in a little while.");
  assert.equal(F.publicText("OpenRouter error (402)"), N + " is very busy right now. Please try again in a little while.");
  for (const t of ['Claude said no', "FLUX image failed (500)", "GPT-4 timeout", "deepseek/deepseek-v4 returned empty"]) assert.equal(F.mentionsModel(F.publicText(t)), false, t);
});

test("avatar: the configured emoji in a badge, same everywhere, size kept sensible, labelled for screen readers", () => {
  const a = F.avatar(24);
  assert.match(a, /^<span /);
  assert.ok(a.includes(">" + C.AVATAR + "<"));
  assert.ok(a.includes('aria-label="' + N + '"'));
  assert.match(a, /width:24px;height:24px/);
  assert.match(F.avatar(1000), /width:64px/);
  assert.match(F.avatar("x"), /width:24px/);
  assert.equal(F.avatar(24), F.avatar(24));
});

test("fillPage fills the name and avatar placeholders from the config", () => {
  const els = [{ attrs: {}, getAttribute: (k) => "30", textContent: "" }, { getAttribute: () => "40", innerHTML: "" }];
  const doc = { querySelectorAll: (sel) => (sel === "[data-brand-name]" ? [els[0]] : [els[1]]) };
  F.fillPage(doc);
  assert.equal(els[0].textContent, N);
  assert.ok(els[1].innerHTML.includes(C.AVATAR));
});

test("the end-of-build report: time, what was found and fixed, what needs attention, nothing invented", () => {
  assert.deepEqual(F.buildSummary({ seconds: 134, found: 5, fixed: 3, remaining: 2, verified: true }), ["Build complete (2m 14s).", "5 issues found. 3 fixed. 2 need your attention."]);
  assert.deepEqual(F.buildSummary({ seconds: 45, found: 1, fixed: 1, remaining: 0, verified: true }), ["Build complete (45s).", "1 issue found. 1 fixed."]);
  assert.deepEqual(F.buildSummary({ seconds: 60, found: 0, fixed: 0, remaining: 0 }), ["Build complete (1m 0s).", "No issues found."]);
  assert.deepEqual(F.buildSummary({ seconds: 20, found: 2, fixed: 1, remaining: 1 }).slice(1), ["2 issues found. 1 fixed. 1 needs your attention."]);
  const unchecked = F.buildSummary({ seconds: 30, found: null, fixed: null, remaining: null, verified: false });
  assert.equal(unchecked.length, 2);
  assert.match(unchecked[1], /couldn't confirm/);
  assert.equal(unchecked.some((l) => /issue/.test(l)), false, "no issue counts when the checks did not run");
  assert.deepEqual(F.buildSummary(null), ["Build complete (0s)."]);
});
