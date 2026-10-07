// Run: node --test test/design-repair.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { repairDesign, colorNamesUsed, scaleOf } = require("../lib/design-repair");

const CDN = '<script src="https://cdn.tailwindcss.com"></script>';
const page = (head, body) => `<!DOCTYPE html><html><head>${head}</head><body class="bg-base-100 text-base-content">${body}</body></html>`;

test("daisyUI and custom colour names are found; Tailwind's own are not", () => {
  const names = colorNamesUsed('<div class="bg-base-100 text-base-content hover:bg-secondary/80 border-brand-200 text-gray-700 bg-white text-xl"></div>');
  assert.deepEqual([...names].sort(), ["base-100", "base-content", "brand-*", "secondary"]);
});

test("undefined colours get a tailwind.config from the industry palette, right after the CDN script", () => {
  const { html, added } = repairDesign(page(CDN, '<a class="bg-secondary">Order</a>'), { prompt: "a bakery in Bristol" });
  assert.match(html, /cdn\.tailwindcss\.com"><\/script>\n<script>tailwind\.config = /);
  const { colors } = JSON.parse(/extend: (\{.*\}) \} \};<\/script>/.exec(html)[1]);
  for (const n of ["base-100", "base-content", "secondary"]) assert.match(colors[n], /^#[0-9a-f]{6}$/i, n);
  assert.match(added[0], /colours for/);
});

test("a page with its own tailwind.config, or no Tailwind, is left alone", () => {
  const own = page(`${CDN}<script>tailwind.config = {}</script>`, "");
  assert.equal(repairDesign(own).html, own);
  const noTw = page("", "");
  assert.equal(repairDesign(noTw).html, noTw);
});

test("a shade scale runs light to dark around the base colour", () => {
  const s = scaleOf("#92400e");
  assert.equal(s[500], "#92400e");
  assert.equal(s.DEFAULT, "#92400e");
  const lum = (h) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  assert.ok(lum(s[50]) > lum(s[300]) && lum(s[300]) > lum(s[500]) && lum(s[500]) > lum(s[900]));
});

test("icon fonts are loaded when their classes are used without them", () => {
  const { html, added } = repairDesign(page("", '<span class="material-icons">menu</span><span class="material-symbols-outlined">call</span>'));
  assert.match(html, /family=Material\+Icons/);
  assert.match(html, /family=Material\+Symbols\+Outlined/);
  assert.equal(added.length, 2);
  const already = page('<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">', '<i class="material-icons">x</i>');
  assert.equal(repairDesign(already).html, already);
});

test("<source> entries naming files we never made are dropped so the <img> loads", () => {
  const S = "https://x.supabase.co/storage/v1/object/public/project-assets/stock/abc";
  const pic = `<picture><source type="image/avif" srcset="${S}.avif?width=1080"><source type="image/webp" srcset="${S}.webp?width=720 720w, ${S}.webp?width=1080 1080w"><source media="(min-width: 721px)" srcset="${S}.jpg?width=1080"><source srcset="https://images.example.com/real.avif"><img src="${S}.jpg?width=720" alt="Bread"></picture>`;
  const { html, added } = repairDesign(page("", pic));
  assert.doesNotMatch(html, /abc\.avif|abc\.webp/);
  assert.match(html, /abc\.jpg\?width=1080/, "the same file at another size is kept");
  assert.match(html, /images\.example\.com\/real\.avif/, "another host is not ours to judge");
  assert.match(added.join(), /2 image sources/);
});

test("font-heading / font-body get the industry fonts, loaded once", () => {
  const { html, added } = repairDesign(page(CDN, '<h1 class="font-heading">Crumb</h1><p class="font-body">Bread</p>'), { prompt: "a bakery" });
  const ext = JSON.parse(/extend: (\{.*\}) \} \};<\/script>/.exec(html)[1]);
  assert.equal(ext.fontFamily.heading[0], "Playfair Display SC");
  assert.equal(ext.fontFamily.body[0], "Karla");
  assert.equal((html.match(/fonts\.googleapis\.com\/css2/g) || []).length, 1);
  assert.ok(added.some((a) => /fonts for font-heading, font-body/.test(a)));
});

test("daisyUI buttons and cards are styled only when the page never defines them", () => {
  const { html, added } = repairDesign(page(CDN, '<a class="btn-primary btn-lg">Order</a><div class="card"><div class="card-body">Loaf</div></div>'), { prompt: "a bakery" });
  assert.match(html, /<style data-gurost="components">[^<]*\.btn-primary\{[^}]*background:#92400E/);
  assert.match(html, /\.card\{[^}]*border-radius:1rem/);
  assert.ok(added.some((a) => /styles for 4 button\/card classes/.test(a)));
  const own = page(`${CDN}<style>.btn-primary { background: red }</style>`, '<a class="btn-primary">Go</a>');
  assert.doesNotMatch(repairDesign(own).html, /data-gurost="components"/);
});

test("each icon style needs its own font: Material+Icons doesn't cover -outlined", () => {
  const p = page('<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">', '<span class="material-icons-outlined">phone</span><i class="material-icons">menu</i>');
  const { html, added } = repairDesign(p);
  assert.match(html, /icon\?family=Material\+Icons\+Outlined"/);
  assert.equal((html.match(/family=Material\+Icons"/g) || []).length, 1, "the plain set isn't loaded twice");
  assert.match(added.join(), /Material Icons Outlined/);
});

test("a cut-down icon font is loaded whole; @apply styles get compiled", () => {
  const link = '<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght@20..48,100..700&icon_names=menu,close&display=block" rel="stylesheet">';
  const { html, added } = repairDesign(page(`${CDN}${link}<style>.btn-brand { @apply px-4 py-2; }</style><style>.x{color:red}</style>`, '<span class="material-symbols-outlined">bakery_dining</span>'));
  assert.doesNotMatch(html, /icon_names/);
  assert.match(html, /Material\+Symbols\+Outlined:opsz,wght@20\.\.48,100\.\.700&display=block/);
  assert.match(html, /<style type="text\/tailwindcss">\.btn-brand/);
  assert.match(html, /<style>\.x\{color:red\}<\/style>/, "a style without @apply is left alone");
  assert.ok(added.some((a) => /full icon font/.test(a)) && added.some((a) => /@apply/.test(a)));
});
