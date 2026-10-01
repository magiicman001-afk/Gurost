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

const { condenseForReview } = require("../bots/variant-bot")._internal;

test("Guide Bot review sees the whole page: footer and contact survive condensing", () => {
  const filler = `<section class="${"px-6 py-24 md:py-32 bg-gradient-to-br from-amber-50 to-orange-100 ".repeat(20)}"><svg viewBox="0 0 24 24"><path d="${"M12 2L2 7l10 5 10-5-10-5z ".repeat(30)}"/></svg><p>Fresh bread daily.</p></section>`;
  const page = `<!DOCTYPE html><html><head><style>${"body{margin:0}".repeat(300)}</style><script src="https://cdn.tailwindcss.com"></script></head><body>${filler.repeat(20)}<footer class="bg-stone-900"><a href="tel:+442086920000">020 8692 0000</a> <a href="mailto:hi@crumb.co">hi@crumb.co</a></footer><script>${"console.log(1);".repeat(400)}</script></body></html>`;
  assert.ok(page.length > 40000, "realistic full-site size");
  assert.ok(!page.slice(0, 12000).includes("<footer"), "the old 12KB cut never reached the footer");
  const c = condenseForReview(page);
  assert.ok(c.length < 12000, `condensed to ${c.length} chars`);
  assert.match(c, /<footer>.*tel:\+442086920000.*mailto:hi@crumb\.co/);
  assert.ok(!/class=|<svg|<style|console\.log/.test(c), "markup noise removed");
});
