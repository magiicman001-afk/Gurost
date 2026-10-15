// Run: node --test test/bot-personalities.test.js
// Business Assistant 2.0, phase 2: personalities, the per-bot chat, voices and animation states.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const P = require("../lib/bot-personalities");
const { createBotChat, cleanHistory } = require("../lib/bot-chat");
const W = require("../public/shared/bot-widgets.js");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("all 8 bots have tone, opinions, boundaries, hardcoded catchphrases and their own voice", () => {
  assert.deepEqual(P.IDS.slice().sort(), ["builder", "designer", "industry", "launch", "planner", "pulse", "research", "review"]);
  const voices = new Set();
  for (const id of P.IDS) {
    const p = P.get(id);
    assert.ok(p.tone && p.opinions.length >= 2 && p.expertise.length && p.neverDo.length >= 2, id);
    for (const k of ["greeting", "done", "problem", "alert"]) assert.ok(p.catchphrases[k], id + " " + k);
    assert.match(p.voice.model, /^aura-2-[a-z]+-en$/);
    assert.ok(p.voice.rate >= 0.9 && p.voice.rate <= 1.1);
    voices.add(p.voice.model);
  }
  assert.equal(voices.size, 8, "no two bots share a voice");
});

test("the catchphrases are the ones in the spec", () => {
  assert.equal(P.catchphrase("planner", "done"), "Here's the plan.");
  assert.equal(P.catchphrase("designer", "done"), "Trust me on this one.");
  assert.equal(P.catchphrase("industry", "done"), "Here's what works.");
  assert.equal(P.catchphrase("builder", "done"), "Done. Next?");
  assert.equal(P.catchphrase("pulse", "problem"), "I caught something.");
  assert.equal(P.catchphrase("research", "done"), "Found it.");
  assert.equal(P.catchphrase("review", "problem"), "Not good enough. Fix it.");
  assert.equal(P.catchphrase("launch", "done"), "Let's go live.");
  assert.equal(P.catchphrase("nobody", "done"), "");
});

test("the system prompt carries the personality, the honesty rules and the project context; unknown bots throw", () => {
  const s = P.systemPrompt("review", "A bakery in Leeds.");
  assert.match(s, /You are Review/);
  assert.match(s, /Critical, honest/);
  assert.match(s, /invented facts are not/);
  assert.match(s, /never claim to have sent, published, paid/);
  assert.match(s, /original character.*not a real person/);
  assert.match(s, /A bakery in Leeds\./);
  assert.match(P.systemPrompt("pulse"), /no project details/);
  assert.throws(() => P.systemPrompt("elon"), /Unknown bot/);
  assert.ok(P.withPersonality("builder", "Extra rule.").endsWith("Extra rule."));
});

test("the browser sees names, colours, openers and catchphrases, never prompts or opinions", () => {
  const view = P.publicView();
  assert.equal(view.length, 8);
  assert.doesNotMatch(JSON.stringify(view), /opinions|neverDo|You are /);
});

test("the widget's table agrees with the personality table (name, colour, opener, voice rate)", () => {
  for (const b of W.BOTS) {
    const p = P.get(b.id);
    assert.equal(b.name, p.name); assert.equal(b.color, p.color); assert.equal(b.opens, p.opens); assert.equal(b.rate, p.voice.rate);
  }
});

test("a chat turn sends the bot's personality, its history and the plan's model, and returns the reply and the hardcoded catchphrase", async () => {
  let sent = null;
  const chat = createBotChat({
    modelRouter: { modelFor: (task, plan) => task + ":" + plan, recordUse() {} },
    claudeClient: { callClaude: async (a) => { sent = a; return { parsed: "  Start with the menu page.  " }; } }
  });
  const out = await chat.run({ userId: "u1", plan: "unlimited", ip: "1.1.1.1", botId: "planner", message: "What first?", history: [{ role: "user", content: "hi" }, { role: "system", content: "evil" }, { role: "assistant", content: "hello" }], context: "Bakery" });
  assert.equal(out.status, 200);
  assert.deepEqual(out.body, { reply: "Start with the menu page.", catchphrase: "Here's the plan.", bot: "planner" });
  assert.match(sent.system, /You are Planner/);
  assert.match(sent.system, /Bakery/);
  assert.deepEqual(sent.messages.map((m) => m.role), ["user", "assistant", "user"], "system-role history is dropped");
  assert.equal(sent.model, "simple_reply:unlimited");
});

test("a chat turn fails honestly: unknown bot, empty message, model error and empty answer", async () => {
  const mk = (call) => createBotChat({ modelRouter: { modelFor: () => "m" }, claudeClient: { callClaude: call } });
  assert.equal((await mk(async () => ({ parsed: "x" })).run({ botId: "elon", message: "hi" })).status, 404);
  assert.equal((await mk(async () => ({ parsed: "x" })).run({ botId: "pulse", message: "   " })).status, 400);
  const boom = await mk(async () => { throw new Error("402 Payment required: key sk-secret"); }).run({ botId: "pulse", message: "hi" });
  assert.equal(boom.status, 502);
  assert.doesNotMatch(JSON.stringify(boom.body), /402|sk-secret/, "no provider detail reaches the person");
  assert.equal((await mk(async () => ({ parsed: "" })).run({ botId: "pulse", message: "hi" })).status, 502);
  assert.equal(cleanHistory(new Array(30).fill({ role: "user", content: "x" })).length, 10);
});

test("server routes: chat and speak exist, are rate-capped, and the voice never comes from the request", () => {
  const s = read("server.js");
  assert.match(s, /app\.post\("\/api\/bots\/:bot\/chat", botChatLimiter/);
  assert.match(s, /app\.post\("\/api\/bots\/:bot\/speak", botSpeakLimiter/);
  assert.match(s, /rejectUnknownFields\(\["text"\]\)/, "speak accepts text only");
  assert.match(s, /botPersonalities\.voiceFor\(req\.params\.bot\)/);
  assert.doesNotMatch(s.slice(s.indexOf('"/api/bots/:bot/speak"'), s.indexOf('"/api/bots/:bot/speak"') + 1200), /req\.body\.voice/);
});

test("website copy is untouched: no site-writing or JSON bot imports the personalities", () => {
  for (const f of ["bots/site-research-bot.js", "bots/builder-bot.js", "bots/library-bot.js", "bots/variant-bot.js", "bots/review-bot.js", "bots/site-review-bot.js", "bots/app-bot.js"]) {
    assert.doesNotMatch(read(f), /bot-personalities/, f);
  }
});

test("widget animation states exist in the script and the style, with reduced motion still showing each state", () => {
  const css = read("public/shared/bot-widgets.css"), js = read("public/shared/bot-widgets.js");
  assert.deepEqual(W.STATES, ["idle", "working", "speaking", "alert"]);
  for (const st of ["working", "speaking", "alert"]) assert.match(css, new RegExp('\\[data-state="' + st + '"\\]'));
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*data-state="alert"/);
  assert.match(js, /preservesPitch/);
  assert.doesNotMatch(js, /innerHTML|insertAdjacentHTML/);
});

test("a waiting alert replaces the opener, so 'All good' never sits above a problem", () => {
  assert.match(read("public/shared/bot-widgets.js"), /if \(!pending\) addMsg\(log, bot\.name, bot\.opens/);
});
