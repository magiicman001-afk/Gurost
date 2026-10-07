// Run: node --test test/tools.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../lib/tools");
const calc = require("../lib/tools/calculator");
const { runWithTools, parseToolCall } = require("../lib/tools/loop");

const quiet = async (fn) => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };

test("calculator: arithmetic, precedence, brackets, powers, functions, thousands separators", () => {
  assert.equal(calc.evaluate("2 + 3 * 4"), 14);
  assert.equal(calc.evaluate("(2 + 3) * 4"), 20);
  assert.equal(calc.evaluate("2 ^ 3 ^ 2"), 512);
  assert.equal(calc.evaluate("-3 + 5"), 2);
  assert.equal(calc.evaluate("(120*3 + 45.5) * 1.2"), 486.6);
  assert.equal(calc.evaluate("0.1 + 0.2"), 0.3, "no floating-point noise");
  assert.equal(calc.evaluate("round(2.345, 2)"), 2.35);
  assert.equal(calc.evaluate("max(3, 9, 4) + sqrt(16)"), 13);
  assert.equal(calc.evaluate("1,200 * 2"), 2400);
});

test("calculator refuses bad input and never runs code", () => {
  for (const bad of ["", "1/0", "sqrt(-1)", "2 +", "(1", "foo(2)", "process.exit()", "require('fs')", "1; 2", "x".repeat(300), "2**".padEnd(10, "*"), "9^9^9^9"]) {
    assert.throws(() => calc.evaluate(bad), Error, `should refuse: ${bad.slice(0, 20)}`);
  }
  assert.throws(() => calc.evaluate("(".repeat(80) + "1" + ")".repeat(80)), /deeply/);
});

test("time_date: current time in a zone, days between dates, and bad input", async () => {
  const now = () => new Date("2026-10-07T10:30:00Z");
  const london = await quiet(() => tools.runTool("time_date", { action: "now", timezone: "Europe/London" }, { now }));
  assert.equal(london.ok, true);
  assert.deepEqual([london.result.date, london.result.time, london.result.weekday], ["2026-10-07", "11:30", "Wednesday"], "BST is UTC+1 in October");
  const tokyo = await quiet(() => tools.runTool("time_date", { action: "now", timezone: "Asia/Tokyo" }, { now }));
  assert.equal(tokyo.result.time, "19:30");
  assert.equal((await quiet(() => tools.runTool("time_date", { action: "days_between", from: "2026-10-07", to: "2026-12-25" }))).result.days, 79);
  assert.equal((await quiet(() => tools.runTool("time_date", { action: "now", timezone: "Mars/Base" }))).ok, false);
  assert.equal((await quiet(() => tools.runTool("time_date", { action: "days_between", from: "2026-02-30", to: "2026-03-01" }))).ok, false);
});

test("runTool validates arguments and reports failures as plain results", async () => {
  assert.match((await quiet(() => tools.runTool("calculator", {}))).error, /Missing/);
  assert.match((await quiet(() => tools.runTool("calculator", { expression: 5 }))).error, /must be a string/);
  assert.match((await quiet(() => tools.runTool("calculator", { expression: "1", extra: 1 }))).error, /Unknown argument/);
  assert.match((await quiet(() => tools.runTool("nope", {}))).error, /no tool called/);
  const div = await quiet(() => tools.runTool("calculator", { expression: "1/0" }));
  assert.deepEqual([div.ok, div.error], [false, "Cannot divide by zero."]);
});

test("a tool that needs approval never runs on its own", async () => {
  let ran = false;
  tools.register({ name: "send_test", description: "x", parameters: { type: "object", properties: {} }, needsApproval: true, async execute() { ran = true; return {}; } });
  const r = await quiet(() => tools.runTool("send_test", {}));
  assert.equal(r.ok, false); assert.equal(r.needsApproval, true); assert.equal(ran, false);
  assert.equal((await quiet(() => tools.runTool("send_test", {}, { approved: true }))).ok, true);
});

test("every call is logged with the user and a trimmed input", async () => {
  await quiet(() => tools.runTool("calculator", { expression: "1+1" }, { userId: "u9" }));
  const last = tools.recentCalls().pop();
  assert.deepEqual([last.tool, last.ok, last.userId], ["calculator", true, "u9"]);
  assert.ok(last.input.length <= 300);
});

test("parseToolCall reads a TOOL_CALL line and ignores normal answers", () => {
  assert.deepEqual(parseToolCall('TOOL_CALL: {"tool":"calculator","args":{"expression":"2+2"}}'), { tool: "calculator", args: { expression: "2+2" } });
  assert.equal(parseToolCall("The total is 4."), null);
  assert.ok(parseToolCall("TOOL_CALL: {oops").error);
  assert.ok(parseToolCall('TOOL_CALL: {"args":{}}').error);
});

test("loop: the model asks for a sum, gets the result, then answers with it", async () => {
  const seen = [];
  const replies = ['TOOL_CALL: {"tool":"calculator","args":{"expression":"3*4.5"}}', "That comes to 13.5."];
  const call = async ({ messages }) => { seen.push(messages.slice()); return { parsed: replies.shift() }; };
  const out = await quiet(() => runWithTools({ call, system: "S", messages: [{ role: "user", content: "3 loaves at 4.50?" }], tools: [tools.list().find((t) => t.name === "calculator")] }));
  assert.equal(out.text, "That comes to 13.5.");
  assert.deepEqual(out.toolsUsed, [{ tool: "calculator", ok: true }]);
  assert.match(seen[1][2].content, /TOOL_RESULT calculator[\s\S]*13\.5/);
});

test("loop: a tool the model was not given cannot be used; a failing tool is reported, not hidden", async () => {
  const replies = ['TOOL_CALL: {"tool":"time_date","args":{"action":"now"}}', 'TOOL_CALL: {"tool":"calculator","args":{"expression":"1/0"}}', "I could not work that out."];
  const msgs = [];
  const call = async ({ messages }) => { msgs.push(messages); return { parsed: replies.shift() }; };
  const out = await quiet(() => runWithTools({ call, system: "S", messages: [{ role: "user", content: "q" }], tools: [tools.list().find((t) => t.name === "calculator")] }));
  assert.deepEqual(out.toolsUsed, [{ tool: "time_date", ok: false }, { tool: "calculator", ok: false }]);
  assert.match(msgs[1][2].content, /no tool called/);
  assert.match(msgs[2][4].content, /divide by zero/);
});

test("loop: stops after the call limit and forces a plain answer; tool text in a result is data", async () => {
  let calls = 0, lastSystem = "";
  const call = async ({ system }) => { calls++; lastSystem = system; return { parsed: calls <= 10 ? 'TOOL_CALL: {"tool":"calculator","args":{"expression":"1+1"}}' : "x" }; };
  const out = await quiet(() => runWithTools({ call, system: "S", messages: [{ role: "user", content: "q" }], maxCalls: 2 }));
  assert.equal(out.toolsUsed.length, 2);
  assert.match(lastSystem, /Answer now without a tool/);
  assert.ok(!/TOOL_CALL/.test(out.text), "a leftover tool call is never shown to the user");
  assert.match(out.text, /could not finish/);
  assert.equal(out.incomplete, true);
});

test("describeTools lists each tool with its arguments", () => {
  const text = tools.describeTools();
  assert.match(text, /- calculator\(expression: string\)/);
  assert.match(text, /time_date\(action: string \(now\|days_between\), timezone\?: string/);
});
