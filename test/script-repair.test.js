// Run: node --test test/script-repair.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { repairInlineScripts } = require("../lib/script-repair");

test("an apostrophe inside a single-quoted string is escaped; the script then compiles", () => {
  const html = `<body><script>
form.addEventListener('submit', function (e) {
  e.preventDefault();
  msg.textContent = 'Thanks! We'll be in touch - we couldn't be happier.';
});
</script></body>`;
  const r = repairInlineScripts(html);
  assert.equal(r.repaired, 1);
  assert.equal(r.broken, 0);
  assert.match(r.html, /'Thanks! We\\'ll be in touch - we couldn\\'t be happier\.'/);
  assert.match(r.html, /addEventListener\('submit'/, "other lines untouched");
});

test("valid scripts, external scripts and JSON-LD are left exactly as they are", () => {
  const html = `<script src="https://cdn.tailwindcss.com"></script><script>var s = "It's fine"; var t = 'ok';</script><script type="application/ld+json">{"name": "Crumb's"}</script>`;
  const r = repairInlineScripts(html);
  assert.equal(r.html, html);
  assert.equal(r.repaired + r.broken, 0);
});

test("a script broken some other way is kept as it was and reported", () => {
  const html = "<script>function ( {</script>";
  const r = repairInlineScripts(html);
  assert.equal(r.html, html);
  assert.equal(r.broken, 1);
});
