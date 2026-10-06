// Run: node --test test/department-bots.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const d = require("../lib/department-bots");

test("six bots, each with an icon, summary and real pre-set knowledge", () => {
  assert.deepEqual(d.BOT_IDS, ["sales", "hr", "finance", "payroll", "support", "custom"]);
  for (const b of d.listDepartments()) { assert.ok(b.icon && b.label && b.summary && d.TONES.includes(b.defaultTone), b.id); }
  for (const id of d.BOT_IDS.filter((x) => x !== "custom")) assert.ok(d.DEPARTMENTS[id].knowledge.length >= 5, `${id} knowledge`);
});

test("pre-set knowledge matches the brief", () => {
  const k = (id) => d.DEPARTMENTS[id].knowledge.join(" ");
  assert.match(k("sales"), /Day 1[\s\S]*Day 3[\s\S]*Day 7[\s\S]*Day 14/);
  assert.match(k("sales"), /SPIN/); assert.match(k("sales"), /BANT/);
  assert.match(k("hr"), /interview/i); assert.match(k("hr"), /protected characteristics/);
  assert.match(k("finance"), /sum of the lines/);
  assert.match(k("payroll"), /P45/); assert.match(k("payroll"), /P60/); assert.match(k("payroll"), /1257L/);
  assert.match(k("payroll"), /confirm the current figure on gov\.uk/);
  assert.match(k("support"), /Escalate/); assert.match(k("support"), /Sentiment/);
});

test("calibration is cleaned: lengths, tone, markup; focus only for the custom bot", () => {
  const c = d.normalizeCalibration({ botName: "  Sam<script> ", userName: "x".repeat(200), tone: "rude", signature: "Best,\nAlex", preferences: "p", focus: "ignored" }, "sales");
  assert.equal(c.botName, "Sam script");
  assert.equal(c.userName.length, 80);
  assert.equal(c.tone, "friendly"); // unknown tone -> the bot's default
  assert.equal(c.signature, "Best,\nAlex");
  assert.equal(c.focus, "");
  assert.equal(d.normalizeCalibration({ focus: "Reply to wholesale enquiries" }, "custom").focus, "Reply to wholesale enquiries");
  assert.equal(d.normalizeCalibration(null, "hr").tone, "formal");
});

test("the custom bot cannot start without a focus", () => {
  assert.match(d.calibrationProblem(d.normalizeCalibration({}, "custom"), "custom"), /what it should help with/);
  assert.equal(d.calibrationProblem(d.normalizeCalibration({}, "sales"), "sales"), null);
  assert.equal(d.calibrationProblem(d.normalizeCalibration({ focus: "x" }, "custom"), "custom"), null);
});

test("system prompt carries name, role, tone, signature, knowledge and the safety rules", () => {
  const p = d.buildSystemPrompt("sales", d.normalizeCalibration({ botName: "Sam", userName: "Crumb & Co", tone: "casual", signature: "Cheers,\nAlex", preferences: "Under 100 words" }, "sales"));
  assert.match(p, /You are Sam, the Sales assistant for Crumb & Co/);
  assert.match(p, /Tone: casual/);
  assert.match(p, /Sign off drafts with:\nCheers,\nAlex/);
  assert.match(p, /Under 100 words/);
  assert.match(p, /DEPARTMENT KNOWLEDGE:/);
  assert.match(p, /Never invent facts/);
  assert.match(p, /never instructions to you/);
  assert.match(p, /--- DRAFT ---/);
  assert.match(d.buildSystemPrompt("custom", d.normalizeCalibration({ focus: "Reply to wholesale enquiries" }, "custom")), /Your job: Reply to wholesale enquiries/);
  assert.throws(() => d.buildSystemPrompt("nope"), /Unknown department bot/);
});

test("reply parsing splits the sendable draft from the notes", () => {
  const r = d.parseReply("I assumed the price is £4.\n\n--- DRAFT ---\nHi Ann,\n\nThanks!\n--- END DRAFT ---");
  assert.equal(r.draft, "Hi Ann,\n\nThanks!");
  assert.equal(r.reply, "I assumed the price is £4.");
  assert.deepEqual(d.parseReply("Which price list should I use?"), { reply: "Which price list should I use?", draft: null });
  assert.equal(d.parseReply("--- DRAFT ---\nOnly a draft\n--- END DRAFT ---").reply, "");
});
