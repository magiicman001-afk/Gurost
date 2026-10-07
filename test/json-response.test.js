// Run: node --test test/json-response.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.OPENROUTER_API_KEY ||= "test-key"; // the client won't load without one; nothing is called
const { _parseJsonResponse: parse } = require("../lib/claude-client");

test("a plain or fenced object parses as before", () => {
  assert.deepEqual(parse('{"a":1}'), { a: 1 });
  assert.deepEqual(parse('```json\n{"a":1}\n```'), { a: 1 });
});

test("text after a complete object is ignored (live Pulse patch, 2026-10-07)", () => {
  const raw = '{"patch": {"find": "footer class=\\"bg-primary\\"", "replace": "footer class=\\"bg-primary text-body-text\\""}, "summary": "Footer text readable"}\nThis makes the footer { readable }.';
  const out = parse(raw);
  assert.equal(out.patch.replace, 'footer class="bg-primary text-body-text"');
  assert.equal(out.summary, "Footer text readable");
});

test("braces and escaped quotes inside strings don't end the object early", () => {
  assert.deepEqual(parse('{"code": "if (a) { b(\\"}\\") }"} trailing'), { code: 'if (a) { b("}") }' });
});

test("no complete object still fails with the original error", () => {
  assert.throws(() => parse('{"a": 1'), /Failed to parse response as JSON/);
  assert.throws(() => parse("Sorry, I can't do that."), /Failed to parse response as JSON/);
});
