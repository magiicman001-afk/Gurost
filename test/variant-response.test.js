// Run: node --test test/variant-response.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseVariantResponse, VariantParseError } = require("../lib/variant-response");

const page = (body, head = "") => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="gurost:summary" content="A warm, full bakery site.">
<title>Crumb &amp; Co</title>${head}
</head>
<body>
${body}
</body>
</html>`;

const HERO = '<section id="hero"><img src="IMG_1" data-gurost-image="Crumb &amp; Co shopfront at dawn, warm light" alt="Shopfront"></section>';

function throwsParse(raw, re) {
  assert.throws(() => parseVariantResponse(raw), (err) => err instanceof VariantParseError && re.test(err.reason) && err.raw !== undefined);
}

test("baseline: summary, images and clean HTML", () => {
  const r = parseVariantResponse(page(HERO));
  assert.equal(r.summary, "A warm, full bakery site.");
  assert.deepEqual(r.imageRequests, [{ placeholder: "IMG_1", description: "Crumb & Co shopfront at dawn, warm light" }]);
  assert.ok(!r.html.includes("data-gurost-image"));
  assert.ok(!r.html.includes("gurost:summary"));
  assert.ok(r.html.includes('<img src="IMG_1" alt="Shopfront">'));
  assert.equal(r.format, "html");
});

test("1. unescaped quotes survive byte-for-byte", () => {
  const body = '<a href="foo">bar</a><p class="x" title=\'it"s\'>"quoted"</p>';
  assert.ok(parseVariantResponse(page(body)).html.includes(body));
});

test("2. backslashes survive byte-for-byte", () => {
  const body = "<p>C:\\Users\\test and \\n and \\\"</p>";
  assert.ok(parseVariantResponse(page(body)).html.includes(body));
});

test("3. marker-like and boundary text inside the page", () => {
  const body = '<pre>===HTML=== ===SUMMARY=== ```json {"html": 1}```</pre><script>document.write("</html>");</script>';
  const r = parseVariantResponse(page(body));
  assert.ok(r.html.includes(body), "marker text kept as content");
  assert.ok(r.html.trimEnd().endsWith("</html>"));
  assert.ok(r.html.includes("<body>"), "not cut at the </html> inside the script");
});

test("4. JSON-looking strings inside <script>", () => {
  const body = '<script>var x = {"a":1, "html": "<b>no</b>"}; const y = [{"placeholder":"IMG_9"}];</script>';
  const r = parseVariantResponse(page(body));
  assert.ok(r.html.includes(body));
  assert.equal(r.format, "html");
});

test("5a. ```html fence around the page", () => {
  const r = parseVariantResponse("```html\n" + page(HERO) + "\n```");
  assert.ok(r.html.startsWith("<!DOCTYPE html>") && r.html.endsWith("</html>"));
});

test("5b. ```json fence around legacy JSON output", () => {
  const legacy = JSON.stringify({ html: page("<p>legacy</p>"), summary: "Legacy.", imageRequests: [{ placeholder: "IMG_2", description: "loaf" }] });
  const r = parseVariantResponse("```json\n" + legacy + "\n```");
  assert.equal(r.format, "legacy-json");
  assert.ok(r.html.includes("<p>legacy</p>"));
  assert.equal(r.imageRequests[0].placeholder, "IMG_2");
});

test("6. commentary before and after, including a stray <html> mention", () => {
  const raw = "Sure! Here is your <html> website:\n\n" + page(HERO) + "\n\nLet me know if you want changes to the </html>.";
  const r = parseVariantResponse(raw);
  assert.ok(r.html.startsWith("<!DOCTYPE html>"));
  assert.ok(r.html.endsWith("</html>"));
  assert.ok(!r.html.includes("Let me know"));
});

test("7a. no summary meta -> falls back to <title>", () => {
  const r = parseVariantResponse(page("<p>x</p>").replace(/<meta name="gurost:summary"[^>]*>\n/, ""));
  assert.equal(r.summary, "Crumb & Co");
});

test("7b. no doctype, bare <html> start", () => {
  const r = parseVariantResponse(page("<p>x</p>").replace("<!DOCTYPE html>\n", ""));
  assert.ok(r.html.startsWith("<html"));
});

test("7c. old ===HTML=== marker format still accepted", () => {
  const raw = `===SUMMARY===\nMarkers.\n===IMAGES===\n[{"placeholder":"IMG_1","description":"door",}]\n===HTML===\n${page("<p>m</p>")}`;
  const r = parseVariantResponse(raw);
  assert.equal(r.format, "markers");
  assert.equal(r.summary, "Markers.");
  assert.equal(r.imageRequests.length, 1, "trailing comma repaired");
});

test("7d. no HTML at all -> specific error", () => {
  throwsParse("I'm sorry, I can't help with that.", /no HTML document/);
});

test("8. CRLF line endings", () => {
  const r = parseVariantResponse(page(HERO).replace(/\n/g, "\r\n"));
  assert.ok(!r.html.includes("\r"));
  assert.equal(r.imageRequests.length, 1);
});

test("9a. truncated mid-tag -> specific error", () => {
  const full = page(HERO + "<footer>© 2026</footer>");
  throwsParse(full.slice(0, full.indexOf("<footer>") + 5), /truncated: no closing <\/html>/);
});

test("9b. truncated inside an attribute -> specific error", () => {
  throwsParse(page(HERO).slice(0, page(HERO).indexOf("data-gurost-image") + 25), /truncated/);
});

test("9c. mis-escaped legacy JSON -> specific error", () => {
  throwsParse('{"html": "<!DOCTYPE html><html class="x"></html>", "summary": "s"}', /legacy JSON format but it is not valid JSON/);
});

test("9d. JSON-escaped HTML that slipped through -> specific error", () => {
  const escaped = page('<div class=\\"a\\">' + '<span class=\\"b\\"></span>'.repeat(15) + "</div>");
  throwsParse(escaped, /still JSON-escaped/);
});

test("9e. empty reply -> specific error", () => {
  throwsParse("   ", /Empty reply/);
});

test("10. emoji and unicode", () => {
  const body = '<h1>Crumb & Co 🥐🍞 — Café Crème, 日本語, Ünïcödé</h1><img src="IMG_1" data-gurost-image="Croissant 🥐 on a café table">';
  const r = parseVariantResponse(page(body));
  assert.ok(r.html.includes("🥐🍞 — Café Crème, 日本語, Ünïcödé"));
  assert.equal(r.imageRequests[0].description, "Croissant 🥐 on a café table");
});

test("11. very long HTML (>50k chars)", () => {
  const sections = Array.from({ length: 400 }, (_, i) => `<section id="s${i}"><h2>Section ${i}</h2><p>${"Lorem ipsum dolor sit amet. ".repeat(4)}</p></section>`).join("\n");
  const raw = page(sections);
  assert.ok(raw.length > 50000);
  const t0 = Date.now();
  const r = parseVariantResponse(raw);
  assert.ok(Date.now() - t0 < 500, "parses quickly");
  assert.ok(r.html.includes('<section id="s399">'));
});

test("12. metadata in a different order / position", () => {
  const raw = `<!DOCTYPE html><html><head><title>T</title></head><body>
<img data-gurost-image="second image, listed first" alt="b" src="IMG_2">
<footer><img src='IMG_1' data-gurost-image='single-quoted &quot;desc&quot; with > inside'></footer>
<meta content="Summary at the end of body." name="gurost:summary">
</body></html>`;
  const r = parseVariantResponse(raw);
  assert.equal(r.summary, "Summary at the end of body.");
  assert.deepEqual(r.imageRequests.map((i) => i.placeholder), ["IMG_2", "IMG_1"]);
  assert.equal(r.imageRequests[1].description, 'single-quoted "desc" with > inside');
  assert.ok(!r.html.includes("data-gurost-image") && !r.html.includes("gurost:summary"));
});

test("extra: duplicate and invalid placeholders are dropped", () => {
  const body = '<img src="IMG_1" data-gurost-image="a"><img src="IMG_1" data-gurost-image="dup"><img src="https://x/y.png" data-gurost-image="external"><img src="IMG_3" data-gurost-image="  ">';
  const r = parseVariantResponse(page(body));
  assert.deepEqual(r.imageRequests, [{ placeholder: "IMG_1", description: "a" }]);
});

test("extra: page without <body> -> specific error", () => {
  throwsParse("<!DOCTYPE html><html><head></head></html>", /no <body>/);
});

test("extra: </html> inside an HTML comment is not the end", () => {
  const body = "<!-- old footer ended with </html> here --><footer>real footer</footer>";
  const r = parseVariantResponse(page(body));
  assert.ok(r.html.includes("<footer>real footer</footer>"));
});

test("extra: truncated inside an unclosed <script> -> truncated error", () => {
  const raw = page("<p>ok</p>").replace("</body>", '<script>const s = "</html>"; function f() {');
  throwsParse(raw.slice(0, raw.indexOf("function f() {") + 14), /truncated/);
});

test("extra: model repeats the whole page -> first complete copy wins", () => {
  const one = page("<p>first</p>");
  const r = parseVariantResponse(one + "\n\nHere it is again:\n" + page("<p>second</p>"));
  assert.ok(r.html.includes("<p>first</p>") && !r.html.includes("<p>second</p>"));
});
