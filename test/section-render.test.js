// Run: node --test test/section-render.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../lib/sections/render");
const H = require("./helpers/section-test");
const F = require("./fixtures/sections.json");

const NOW = new Date(Date.UTC(2031, 5, 1));
const render = (tpl, slots) => R.renderTemplate(tpl, F.toyDefs, slots, { now: NOW });

test("truncate cuts on a word boundary, adds an ellipsis and never exceeds the max", () => {
  const long = "Freshly baked sourdough and pastries made every morning by hand in the heart of town";
  const t = R.truncate(long, 32);
  assert.ok([...t].length <= 32, t);
  assert.ok(t.endsWith("…"));
  assert.ok(!/\s…$/.test(t));
  assert.ok(long.startsWith(t.slice(0, -1)), "cut text must be a prefix of the original");
  assert.equal(R.truncate("x".repeat(200), 32).length, 32); // no spaces: hard cut
  assert.equal(R.truncate("Short", 32), "Short");
  assert.equal(R.truncate("a\n\n  b\tc", 32), "a b c");
});

test("every text slot is HTML-escaped: no payload survives raw", () => {
  const { html } = render("<h1>{{title}}</h1><p>{{note}}</p>{{#each items}}<a href=\"{{url}}\">{{label}}</a>{{/each}}", {
    title: F.xssPayloads[0],
    note: F.xssPayloads.join(" "),
    href: "#x",
    items: F.xssPayloads.map((p) => ({ label: p, url: "#y" })),
  });
  assert.deepEqual(H.leakedPayloads(html, F.xssPayloads), []);
  assert.equal(H.hasActiveInjection(html), false);
  assert.ok(html.includes("&lt;img"), "payload text should appear as escaped text");
});

test("href allowlist: safe schemes pass, everything else becomes '#'", () => {
  for (const [input, expected] of F.hrefCases) assert.equal(R.sanitizeHref(input), expected, JSON.stringify(input));
  const { html } = render('<a href="{{href}}">{{title}}</a>', { title: "t", href: "javascript:alert(1)" });
  assert.ok(html.includes('href="#"'));
  assert.ok(!html.includes("javascript"));
});

test("empty optional slots remove their whole block; no braces or empty hrefs are left", () => {
  const tpl = "<div>{{#if note}}<p>{{note}}</p>{{/if}}{{#if photo}}<img src=\"{{photo}}\">{{/if}}{{#if show}}<b>credit</b>{{/if}}{{#each items}}<i>{{label}}</i>{{/each}}</div>";
  const { html, warnings } = render(tpl, { title: "Hi", href: "#a" });
  assert.equal(html, "<div></div>");
  assert.equal(H.leftoverSlots(html), false);
  assert.deepEqual(warnings, []);
  const on = render(tpl, { title: "Hi", href: "#a", note: "n", show: true, photo: "IMG_2", items: [{ label: "x", url: "#u" }] }).html;
  assert.equal(on, '<div><p>n</p><img src="IMG_2"><b>credit</b><i>x</i></div>');
});

test("images accept an IMG_n token or an allowlisted https URL only", () => {
  assert.equal(R.sanitizeImage("IMG_3"), "IMG_3");
  assert.equal(R.sanitizeImage("https://cdn.pixabay.com/photo/a.jpg"), "https://cdn.pixabay.com/photo/a.jpg");
  assert.equal(R.sanitizeImage("https://evil.example.com/a.jpg"), "");
  assert.equal(R.sanitizeImage("http://cdn.pixabay.com/a.jpg"), "");
  assert.equal(R.sanitizeImage("data:image/png;base64,AAAA"), "");
  assert.equal(R.sanitizeImage("javascript:alert(1)"), "");
  assert.equal(R.sanitizeImage("IMG_3<script>"), "");
});

test("lists are capped at their max, items missing a required field are dropped, groups nest", () => {
  const items = Array.from({ length: 8 }, (_, i) => ({ label: `Item ${i} with a very long label`, url: "#u" }));
  items.splice(1, 0, { label: "", url: "#u" }, { label: "NoLink", url: "" });
  const { html } = render("{{#each items}}[{{@n}}:{{label}}{{#if @first}}!{{/if}}{{#if @last}}.{{/if}}]{{/each}}", { title: "t", href: "#", items });
  assert.equal((html.match(/\[/g) || []).length, 3);
  assert.ok(/\[1:Item 0[^\]]*!\]/.test(html));
  assert.ok(html.endsWith(".]"));
  const nested = R.renderTemplate("{{#each g}}<h>{{t}}</h>{{#each l}}<a>{{n}}</a>{{/each}}{{/each}}", { g: { type: "list", max: 2, item: { t: { type: "text", max: 9, required: true }, l: { type: "list", max: 2, item: { n: { type: "text", max: 5, required: true } } } } } }, { g: [{ t: "A", l: [{ n: "1" }, { n: "2" }, { n: "3" }] }, { t: "B", l: [] }, { t: "C" }] }).html;
  assert.equal(nested, "<h>A</h><a>1</a><a>2</a><h>B</h>");
});

test("honest placeholders: a missing required fact is visibly marked, never invented", () => {
  const r = render("<h1>{{title}}</h1>", { href: "#" });
  assert.equal(r.html, "<h1>[Add title]</h1>");
  assert.ok(r.warnings.some((w) => /missing required slot: title/.test(w)));
  assert.equal(R.placeholder("price"), "[Add price]");
  assert.equal(R.placeholder("year"), "[Add year]");
  assert.equal(R.placeholder("rating"), "[Add rating]");
  assert.equal(R.placeholder("stat"), "[Add figure]");
  assert.equal(R.placeholder("review"), "[Add a real customer review]");
  assert.equal(R.placeholder("hours"), "[Add your opening hours]");
  for (const k of ["price", "year", "rating", "stat", "review"]) assert.ok(!/\d/.test(R.placeholder(k)), `${k} placeholder must not look like data`);
});

test("{{year}} is the real current year (injectable), unknown slots warn, unicode survives", () => {
  const r = render("<p>© {{year}} {{title}} {{nope}}</p>", { title: F.unicode[0], href: "#" });
  assert.ok(r.html.includes("© 2031 Café Écl"));
  assert.ok(r.warnings.some((w) => /unknown slot in template: nope/.test(w)));
  for (const u of F.unicode) assert.equal(R.truncate(u, 40), u);
  const e = R.truncate("🥐".repeat(30), 10);
  assert.equal([...e].length, 10); // no broken surrogate pairs
});

test("social icons are built by render.js (raw), user text never is", () => {
  const defs = { socials: { type: "list", max: 5, derive: "social_icon", item: { platform: { type: "enum", values: ["instagram", "facebook", "tiktok", "youtube", "x"], required: true }, url: { type: "link", required: true } } } };
  const r = R.renderTemplate("{{#each socials}}<a href=\"{{url}}\">{{{icon}}}{{platform}}</a>{{/each}}", defs, {
    socials: [{ platform: "instagram", url: "https://instagram.com/a" }, { platform: "<b>evil</b>", url: "https://x.com" }, { platform: "x", url: "javascript:alert(1)" }],
  });
  assert.equal((r.html.match(/<svg/g) || []).length, 2);
  assert.ok(!r.html.includes("<b>evil"));
  assert.ok(r.html.includes('href="#"'));
});

test("template errors are loud: unclosed blocks throw", () => {
  assert.throws(() => R.renderTemplate("{{#if a}}x", {}, {}), /unclosed/);
  assert.throws(() => R.renderTemplate("x{{/each}}", {}, {}), /unexpected/);
});

test("the injection detector itself works (mutation check): raw tags are caught, escaped text is not", () => {
  assert.equal(H.hasActiveInjection("<img src=x onerror=alert(1)>"), true);
  assert.equal(H.hasActiveInjection("<p>x</p><script>alert(1)</script>"), true);
  assert.equal(H.hasActiveInjection("&lt;img src=x onerror=alert(1)&gt;"), false);
  assert.deepEqual(H.rawColours("a{color:#fff;background:rgb(0,0,0)}"), ["#fff", "rgb(0,0,0)"]);
  assert.deepEqual(H.unknownVars("a{color:var(--g-nope)}"), ["--g-nope"]);
  assert.deepEqual(H.unscopedHiding(".x{opacity:0}.g-js .y{opacity:0}"), [".x"]);
});
