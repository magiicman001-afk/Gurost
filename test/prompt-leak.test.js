// Run: node --test test/prompt-leak.test.js
//
// security.detectPromptLeak rejects any reply that repeats 50+ chars of
// the system prompt. A correct Website Builder page must therefore never
// need to repeat a long run of the prompt: an earlier prompt contained a
// literal example <img ... data-gurost-image-role="hero" ...> tag, the
// model copied it into every page, and every design was rejected.
process.env.OPENROUTER_API_KEY ||= "test";
const test = require("node:test");
const assert = require("node:assert/strict");
const security = require("../security");
const { BRIEFS, _internal } = require("../bots/variant-bot");
const { designPromptLines } = require("../lib/industry-design");

// The pieces a correct, compliant page contains.
const COMPLIANT_SNIPPETS = [
  '<img src="IMG_1" data-gurost-image-role="hero" data-gurost-image="Crumb and Co shopfront at dawn, warm light" alt="Crumb and Co shopfront">',
  '<img data-gurost-image="Croissant close-up on a marble counter" data-gurost-image-role="featured" src="IMG_2" alt="Butter croissant">',
  '<img alt="Sourdough loaf" src="IMG_3" data-gurost-image="Sourdough loaf on a floured board" data-gurost-image-role="secondary">',
  '<meta name="gurost:summary" content="A warm, complete website for a neighbourhood bakery.">',
  '<script src="https://cdn.tailwindcss.com"></script>',
  '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display+SC:wght@400;700&family=Karla:wght@400;700&display=swap" rel="stylesheet">',
  '<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">',
];

for (const prompt of ["A website for a neighbourhood bakery", "A law firm specialising in family law", "Something cool"]) {
  for (const b of BRIEFS) {
    test(`no compliant page content trips the leak check: ${b.id} / "${prompt}"`, () => {
      const system = security.withGuardrail(_internal.systemFor(b.brief, true, designPromptLines(prompt)));
      for (const snippet of COMPLIANT_SNIPPETS) {
        assert.equal(security.detectPromptLeak(`<!DOCTYPE html><html><body>${snippet}</body></html>`, system), null, snippet);
      }
    });
  }
}
