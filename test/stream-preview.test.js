// Run: node --test test/stream-preview.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPartialPage, createStreamPreview } = require("../lib/stream-preview");

const HEAD = '<!DOCTYPE html>\n<html><head><script src="https://cdn.tailwindcss.com"></script><title>T</title></head>\n<body>\n';
const NAV = '<nav id="top"><a href="#menu">Menu</a></nav>\n';
const HERO = '<section id="hero"><h1>Bread that’s worth getting up for</h1><img src="IMG_1" alt="loaf"></section>\n';
const MENU = '<section id="menu"><h2>Baked this morning</h2><p>Sourdough £4.20</p></section>\n';
const FOOT = '<footer><p>© Crumb &amp; Co</p></footer>\n</body></html>';
const FULL = HEAD + NAV + HERO + MENU + FOOT;

test("nothing renderable before </head> or before the first block", () => {
  assert.equal(buildPartialPage(""), null);
  assert.equal(buildPartialPage("Thinking about the design..."), null);
  assert.equal(buildPartialPage(HEAD.slice(0, 40)), null, "head not finished");
  assert.equal(buildPartialPage(HEAD + '<nav id="top"><a href="#'), null, "first block not finished");
});

test("cuts after the last completed block and labels each block", () => {
  const p = buildPartialPage(HEAD + NAV + HERO + '<section id="menu"><h2>Baked th');
  assert.deepEqual(p.blocks.map((b) => [b.tag, b.label]), [["nav", "#top"], ["section", "Bread that’s worth getting up for"]]);
  assert.ok(p.html.includes("Bread that’s worth"));
  assert.ok(!p.html.includes("Baked th"), "the unfinished section is not shown");
});

test("whole document: every block in order, footer included", () => {
  const p = buildPartialPage(FULL);
  assert.deepEqual(p.blocks.map((b) => b.label), ["#top", "Bread that’s worth getting up for", "Baked this morning", "footer"]);
});

test("image placeholders become shimmer boxes, not broken images", () => {
  const p = buildPartialPage(HEAD + HERO);
  assert.ok(!/src="IMG_\d/.test(p.html));
  assert.match(p.html, /data-gurost-pending/);
  assert.match(p.html, /<style data-gurost-preview>[\s\S]*<\/head>/);
});

test("block-closing text inside scripts, styles and comments is ignored", () => {
  const tricky = HEAD.replace("</head>", '<style>/* </section> */</style></head>') +
    '<section id="a"><h2>A</h2><script>const t = "</section></footer>";</script><!-- </nav> -->';
  const p = buildPartialPage(tricky);
  assert.equal(p, null, "the only real block is still open");
  const done = buildPartialPage(tricky + "</section>");
  assert.deepEqual(done.blocks.map((b) => b.label), ["A"]);
});

test("a </head> inside a head script does not count as the end of the head", () => {
  const p = buildPartialPage('<!DOCTYPE html><html><head><script>var s = "</head>";</script>' + NAV);
  assert.equal(p, null, "real </head> has not arrived");
});

test("commentary before the page and CRLF line endings", () => {
  const p = buildPartialPage(("Sure! Here's the page:\n```html\n" + HEAD + NAV).replace(/\n/g, "\r\n"));
  assert.ok(p.html.startsWith("<!DOCTYPE html>"));
  assert.equal(p.blocks.length, 1);
});

test("stream: one checkpoint per newly completed block, throttled, nothing lost", () => {
  let clock = 0;
  const checkpoints = [];
  const s = createStreamPreview({ onCheckpoint: (c) => checkpoints.push(c), minIntervalMs: 1000, now: () => clock });
  // Feed the page in 7-character chunks, advancing the clock 100ms each.
  for (let i = 0; i < FULL.length; i += 7) { s.append(FULL.slice(i, i + 7)); clock += 100; }
  assert.ok(checkpoints.length >= 2, "more than one checkpoint while streaming");
  const reported = checkpoints.flatMap((c) => c.newBlocks.map((b) => b.label));
  assert.deepEqual(reported, [...new Set(reported)], "no block reported twice");
  for (let i = 1; i < checkpoints.length; i++) assert.ok(checkpoints[i].blocks.length > checkpoints[i - 1].blocks.length);
  assert.equal(s.text(), FULL);
});

test("stream: throttle merges blocks that finish close together", () => {
  let clock = 0;
  const checkpoints = [];
  const s = createStreamPreview({ onCheckpoint: (c) => checkpoints.push(c), minIntervalMs: 5000, now: () => clock });
  s.append(HEAD + NAV);          // first block -> checkpoint
  clock += 100; s.append(HERO);  // within 5s -> held back
  clock += 6000; s.append(MENU); // past the interval -> hero + menu together
  assert.equal(checkpoints.length, 2);
  assert.deepEqual(checkpoints[1].newBlocks.map((b) => b.label), ["Bread that’s worth getting up for", "Baked this morning"]);
});

test("stream: a held-back block appears once the interval passes, without waiting for the next block", () => {
  let clock = 0;
  const checkpoints = [];
  const s = createStreamPreview({ onCheckpoint: (c) => checkpoints.push(c), minIntervalMs: 1000, now: () => clock });
  s.append(HEAD + NAV);                       // checkpoint 1 (nav)
  clock += 200; s.append(HERO);               // hero done but throttled
  clock += 2000; s.append('<section id="menu"><h2>Baked'); // long section still open
  assert.equal(checkpoints.length, 2, "hero shown while the menu is still being written");
  assert.deepEqual(checkpoints[1].newBlocks.map((b) => b.label), ["Bread that’s worth getting up for"]);
});

test("labels from text skip icon-font glyph names", () => {
  const trust = '<section class="py-8"><span class="material-symbols-outlined text-blue-900">verified</span><p>Regulated by the Solicitors Regulation Authority</p></section>\n';
  const page = buildPartialPage(HEAD + NAV + trust);
  assert.equal(page.blocks[1].label, "Regulated by the Solicitors Regulation…");
});
