// Run: node --test test/app-placeholders.test.js
process.env.OPENROUTER_API_KEY ||= "test"; // claude-client refuses to load without one
const test = require("node:test");
const assert = require("node:assert/strict");
const imageBot = require("../image-bot");
const { fulfillImageRequestsMultiFile } = require("../bots/app-bot")._internal;

test("App Builder: IMG_1 never rewrites IMG_10; unfilled and unlisted placeholders become a blank pixel", async () => {
  imageBot.generateImageUrl = async (d) => { if (d === "fails") throw new Error("boom"); return `https://cdn/${d}.png`; };
  const files = [{ path: "App.jsx", content: '<img src="IMG_1"/><img src="IMG_10"/><img src={"IMG_2"}/><img src="IMG_3"/>' }];
  const out = await fulfillImageRequestsMultiFile(files, [
    { placeholder: "IMG_1", description: "one" },
    { placeholder: "IMG_10", description: "ten" },
    { placeholder: "IMG_2", description: "fails" },
  ]);
  const c = out[0].content;
  assert.match(c, /src="https:\/\/cdn\/one\.png"/);
  assert.match(c, /src="https:\/\/cdn\/ten\.png"/);
  assert.ok(!/IMG_\d/.test(c), "failed (IMG_2) and unlisted (IMG_3) placeholders are swept");
  assert.equal((c.match(/data:image\/gif/g) || []).length, 2);
});

test("App Builder: no image requests still sweeps stray placeholders", async () => {
  const out = await fulfillImageRequestsMultiFile([{ path: "a.jsx", content: 'const hero = "IMG_4";' }], []);
  assert.ok(!/IMG_4/.test(out[0].content));
});

// Evening test 2026-10-06: nemotron wrote <data-gurost-file="App.jsx"> as a tag.
test("stray <data-gurost-file=...> tags are removed from JSX; the real attribute stays", () => {
  const { removeStrayFileTags } = require("../bots/app-bot")._internal;
  const src = 'return (\n    <>\n      <data-gurost-file="App.jsx">\n        {renderPage()}\n      </data-gurost-file>\n      <section data-gurost-file="Hero.jsx">x</section>\n    </>\n);';
  const [out] = removeStrayFileTags([{ path: "src/App.jsx", content: src }]);
  assert.equal(out.content, 'return (\n    <>\n        {renderPage()}\n      <section data-gurost-file="Hero.jsx">x</section>\n    </>\n);');
  const [css] = removeStrayFileTags([{ path: "src/main.css", content: '<data-gurost-file="x">' }]);
  assert.equal(css.content, '<data-gurost-file="x">', "only code files are touched");
});
