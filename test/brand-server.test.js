// Run: node --test test/brand-server.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../public/shared/ai-brand");
const N = F.NAME;

test("every prompt sent to a model carries the honesty rules (via the central guardrail)", () => {
  const sec = require("../security");
  const out = sec.withGuardrail("Build a bakery site.");
  assert.ok(out.startsWith("Build a bakery site."));
  assert.ok(out.includes(F.IDENTITY_RULES));
  assert.equal(F.mentionsModel(F.IDENTITY_RULES), false);
  assert.ok(!/You are the AI/.test(F.IDENTITY_RULES), "the persona is only for conversational surfaces");
});

test("server payloads: model names dropped from the envelope, error text scrubbed, user data untouched", () => {
  const { publicPayload, wsJson } = require("../lib/brand");
  const input = { issues: [{ title: "Claude's Bakery menu" }], modelUsed: "Claude", modelsUsed: [{ model: "z-ai/glm-5.2" }], data: { model: "gemini", other: 1, schema: { cars: [{ model: "Civic" }] } }, error: "OpenRouter error (402)" };
  const out = publicPayload(input);
  assert.equal(out.modelUsed, undefined);
  assert.equal(out.modelsUsed, undefined);
  assert.equal(out.data.model, undefined);
  assert.equal(out.data.other, 1);
  assert.equal(out.data.schema.cars[0].model, "Civic", "a user's own 'model' field survives");
  assert.equal(out.issues[0].title, "Claude's Bakery menu", "user text survives");
  assert.equal(out.error, N + " is very busy right now. Please try again in a little while.");
  assert.equal(input.modelUsed, "Claude", "the original is not changed");
  assert.equal(publicPayload(null), null);
  assert.deepEqual(publicPayload([1, "a"]), [1, "a"]);
  assert.equal(JSON.parse(wsJson({ type: "error", error: "Gemini paused" })).error, N + " hit a snag. Please try again in a moment.");
});

test("a list of the user's own rows keeps a 'model' column, even at the top level", () => {
  const { publicPayload } = require("../lib/brand");
  assert.deepEqual(publicPayload([{ model: "Civic" }]), [{ model: "Civic" }]);
  assert.deepEqual(publicPayload({ cars: [{ model: "Civic" }] }), { cars: [{ model: "Civic" }] });
});
