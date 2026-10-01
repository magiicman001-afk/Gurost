// Run: node --test test/live-preview.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const { createLivePreview } = require("../bots/variant-bot")._internal;

const HEAD = '<!DOCTYPE html><html><head><title>T</title></head><body>';
const section = (id) => `<section id="${id}"><p>${id}</p></section>`;
const SYSTEM_A = "You are a senior designer. " + "Follow the house rules for layout and typography carefully. ".repeat(3);

function setup() {
  const events = [];
  const live = createLivePreview((stage, status, data) => events.push({ status, ...data }));
  const partials = () => events.filter((e) => e.status === "partial");
  return { events, live, partials };
}

test("first design to finish a section leads; the other is not broadcast", () => {
  const { live, partials } = setup();
  const a = live.streamFor({ id: "bold", label: "Bold" }, SYSTEM_A);
  const b = live.streamFor({ id: "minimal", label: "Minimal" }, SYSTEM_A);
  b({ content: HEAD }); a({ content: HEAD });
  a({ content: section("hero") });      // bold finishes a section first -> lead
  b({ content: section("intro") });     // minimal ignored
  assert.deepEqual(partials().map((p) => [p.variantId, p.sections.join()]), [["bold", "#hero"]]);
});

test("when the lead fails, the next design to finish a section takes over", () => {
  const { live, partials } = setup();
  const a = live.streamFor({ id: "bold", label: "Bold" }, SYSTEM_A);
  const b = live.streamFor({ id: "minimal", label: "Minimal" }, SYSTEM_A);
  a({ content: HEAD + section("hero") });
  live.release("bold");
  b({ content: HEAD + section("intro") });
  assert.deepEqual(partials().map((p) => p.variantId), ["bold", "minimal"]);
});

test("a stream that repeats the system prompt is stopped, never broadcast", () => {
  const { live, partials } = setup();
  const a = live.streamFor({ id: "bold", label: "Bold" }, SYSTEM_A);
  a({ content: HEAD + `<section id="leak"><p>${SYSTEM_A}</p></section>` });
  a({ content: section("more") });
  assert.equal(partials().length, 0);
});

test("'thinking' is announced once, before any design leads", () => {
  const { live, events } = setup();
  const a = live.streamFor({ id: "bold", label: "Bold" }, SYSTEM_A);
  const b = live.streamFor({ id: "minimal", label: "Minimal" }, SYSTEM_A);
  a({ reasoning: "hmm", content: "" }); b({ reasoning: "hmm", content: "" }); a({ reasoning: "more", content: "" });
  assert.equal(events.filter((e) => e.status === "thinking").length, 1);
});
