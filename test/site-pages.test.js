// Run: node --test test/site-pages.test.js
// The one-file design becomes a real multi-page site: right pages, working links, shared CSS/JS, nothing lost.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSite, topLevel, classify } = require("../lib/site-pages");
const { hardenSite } = require("../lib/site-links");

const HEAD = (title, extra = "") => `<!DOCTYPE html><html class="light" lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><meta name="description" content="A friendly neighbourhood business.">
<script src="https://cdn.tailwindcss.com"></script><script>tailwind.config = { darkMode: 'class' };</script>
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
<style>@import url('https://fonts.googleapis.com/css2?family=Fraunces&display=swap'); .hero-bg { background: #f5e6d3; } html { scroll-behavior: smooth; }</style>
<style type="text/tailwindcss">@layer components { .btn { @apply rounded-full px-5 py-2; } }</style>${extra}</head>`;
const SCRIPT = `<script>
(function () {
  var toggle = document.getElementById('menuToggle'); var menu = document.getElementById('mobileMenu');
  toggle.addEventListener('click', function () { menu.classList.toggle('hidden'); });
  var theme = document.getElementById('themeToggle'); theme.addEventListener('click', function () { document.documentElement.classList.toggle('dark'); });
  var cf = document.getElementById('contactForm'); cf.addEventListener('submit', function (e) { e.preventDefault(); });
})();
</script>`;
const HEADER = (links) => `<header class="sticky top-0 z-40 bg-white"><nav class="flex gap-4"><a href="#top" class="logo">Crumb &amp; Co</a>${links}<button id="menuToggle">Menu</button><button id="themeToggle">Theme</button></nav><div id="mobileMenu" class="hidden"><a href="#contact">Contact</a></div></header>`;
const FOOTER = `<footer id="site-footer"><a href="#about">About us</a> <a href="#contact">Contact</a> <a href="https://www.instagram.com/crumbandco" target="_blank">Instagram</a><p>© 2026 Crumb &amp; Co</p></footer>`;

function bakery(withLabels = true) {
  const dp = (v) => (withLabels ? ` data-page="${v}"` : "");
  return HEAD("Crumb & Co | Artisan bakery in Bristol") + `<body class="bg-stone-50">${HEADER('<a href="#about">Our story</a><a href="#menu">Menu</a><a href="#testimonials">Reviews</a><a href="#contact">Contact</a><a href="#order">Place Order</a>')}
<main>
<section id="hero"${dp("home")}><h1>Bread worth waking up for</h1><p>Sourdough, pastries and celebration cakes baked every morning in Stokes Croft.</p><a href="#order">Place Order</a> <a href="#menu">See the menu</a></section>
<section id="about"${dp("about")}><h2>Our story</h2><p>Three generations of bakers, one stubborn starter called Doris. HERO-ABOUT-MARKER</p></section>
<section id="menu"${dp("offering")}><h2>The menu</h2><p>Country sourdough, cardamom buns and seasonal tarts. MENU-MARKER</p></section>
<section id="testimonials"${dp("home")}><h2>Kind words</h2><p>"Best loaf in the city" - Aisha, regular. REVIEWS-MARKER</p></section>
<section id="contact"${dp("contact")}><h2>Visit us</h2><p>42 Stokes Croft, open 7 to 4. CONTACT-MARKER</p><form id="contactForm"><input name="name" required><input name="email" type="email" required><textarea name="message" required></textarea><button type="submit">Send</button></form></section>
<section id="order"${dp("order")}><h2>Place an order</h2><p>Order a cake 48 hours ahead. ORDER-MARKER</p><form id="orderForm"><input name="item" required><button type="submit">Send order</button></form></section>
</main>${FOOTER}${SCRIPT}</body></html>`;
}

const harden = (html) => hardenSite(html, { formEndpoint: "https://example.test/api/site-forms/11111111-1111-4111-8111-111111111111" }).html;
const fileMap = (r) => Object.fromEntries(r.files.map((f) => [f.path, f.content]));
const names = (r) => r.files.map((f) => f.path).sort();
const idsOf = (h) => new Set([...h.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));

/** Every internal link on every page must land on a real page / section. */
function brokenLinks(r) {
  const files = fileMap(r), bad = [];
  for (const [path, html] of Object.entries(files)) {
    if (!path.endsWith(".html")) continue;
    for (const m of html.matchAll(/<a\b[^>]*\shref\s*=\s*"([^"]*)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|tel:)/.test(href)) continue;
      const [file, hash] = href.split("#");
      const target = file ? files[file] : html;
      if (target === undefined) { bad.push(`${path}: ${href} (no such page)`); continue; }
      if (hash && hash !== "top" && !idsOf(target).has(hash)) bad.push(`${path}: ${href} (no such section)`);
      if (href === "#" || href === "") bad.push(`${path}: dead link`);
    }
  }
  return bad;
}

test("a labelled bakery design becomes five pages plus shared CSS and JS, offering page named from the nav (menu)", () => {
  const r = buildSite(harden(bakery(true)));
  assert.equal(r.multi, true);
  assert.deepEqual(names(r), ["about.html", "contact.html", "index.html", "menu.html", "order.html", "script.js", "styles.css"]);
  assert.deepEqual(r.pages.map((p) => p.file).sort(), ["about.html", "contact.html", "index.html", "menu.html", "order.html"]);
});

test("every section lands on exactly one page, and nothing is lost or duplicated", () => {
  const f = fileMap(buildSite(harden(bakery(true))));
  const where = (marker) => Object.entries(f).filter(([p, h]) => p.endsWith(".html") && h.includes(marker)).map(([p]) => p);
  assert.deepEqual(where("HERO-ABOUT-MARKER"), ["about.html"]);
  assert.deepEqual(where("MENU-MARKER"), ["menu.html"]);
  assert.deepEqual(where("ORDER-MARKER"), ["order.html"]);
  assert.deepEqual(where("CONTACT-MARKER"), ["contact.html"]);
  assert.deepEqual(where("REVIEWS-MARKER"), ["index.html"], "testimonials stay on the home page");
  assert.deepEqual(where("Bread worth waking up for"), ["index.html"]);
});

test("the same header and footer are on every page, with working links between pages", () => {
  const r = buildSite(harden(bakery(true))), f = fileMap(r);
  for (const p of r.pages) {
    assert.match(f[p.file], /Crumb &amp; Co<\/a>/, `${p.file} has the header`);
    assert.match(f[p.file], /© 2026 Crumb/, `${p.file} has the footer`);
    assert.match(f[p.file], /<link rel="stylesheet" href="styles\.css">/);
    assert.match(f[p.file], /<script src="script\.js" defer><\/script>/);
  }
  assert.match(f["index.html"], /<a [^>]*href="order\.html"[^>]*>Place Order<\/a>/, "Place Order goes to the order page, not a scroll");
  assert.match(f["index.html"], /href="menu\.html"[^>]*>Menu<|href="menu\.html">Menu</);
  assert.match(f["index.html"], /href="contact\.html"/);
  assert.match(f["about.html"], /href="index\.html"[^>]*class="logo"|class="logo"[^>]*href="index\.html"|href="index\.html"/, "the logo on another page goes home");
  assert.deepEqual(brokenLinks(r), [], "no dead or broken links anywhere");
});

test("each page has its own title and meta description; home keeps the original", () => {
  const r = buildSite(harden(bakery(true))), f = fileMap(r);
  const title = (h) => /<title>([^<]*)<\/title>/.exec(h)[1];
  const desc = (h) => /<meta name="description" content="([^"]*)"/.exec(h)[1];
  assert.equal(title(f["index.html"]), "Crumb & Co | Artisan bakery in Bristol".replace("&", "&amp;"));
  assert.equal(title(f["about.html"]), "About | Crumb &amp; Co");
  assert.equal(title(f["menu.html"]), "Menu | Crumb &amp; Co");
  const titles = r.pages.map((p) => title(f[p.file]));
  assert.equal(new Set(titles).size, titles.length, "titles are all different");
  const descs = r.pages.map((p) => desc(f[p.file]));
  assert.equal(new Set(descs).size, descs.length, "descriptions are all different");
  for (const p of r.pages) assert.equal((f[p.file].match(/<title>/g) || []).length, 1);
});

test("plain styles move to styles.css (imports first); Tailwind's own style block stays on the page", () => {
  const f = fileMap(buildSite(harden(bakery(true))));
  assert.match(f["styles.css"], /^@import url/);
  assert.match(f["styles.css"], /\.hero-bg/);
  for (const p of ["index.html", "about.html"]) {
    assert.ok(!/<style(?![^>]*tailwind)[^>]*>/i.test(f[p]), "no plain inline style left");
    assert.match(f[p], /<style type="text\/tailwindcss">/);
    assert.match(f[p], /tailwind\.config = /, "the Tailwind config script stays in the head");
  }
});

test("shared script.js holds every page script, each in its own try, and works when elements are missing", () => {
  const f = fileMap(buildSite(harden(bakery(true))));
  assert.match(f["script.js"], /window\.GUROST_PAGES = \{"order":"order\.html","contact":"contact\.html"\}/);
  assert.ok((f["script.js"].match(/try \{/g) || []).length >= 2, "the design's script and the form handler are separate");
  assert.ok(!/<script>[^<]*menuToggle/.test(f["index.html"]), "page scripts are no longer inline");
  // run it on a page where nothing exists
  const handlers = [];
  const doc = { getElementById: () => null, addEventListener: (t, h) => handlers.push([t, h]), documentElement: { classList: { toggle() {} } } };
  const win = {};
  assert.doesNotThrow(() => new Function("window", "document", "location", f["script.js"])(win, doc, {}));
  assert.deepEqual(win.GUROST_PAGES, { order: "order.html", contact: "contact.html" });
  assert.ok(handlers.length >= 2, "the form handler still started even though the design's own script threw");
});

test("an Order button with no #order on the page goes to the order page (and through the preview hook when there is one)", () => {
  const f = fileMap(buildSite(harden(bakery(true))));
  const handlers = {}; const went = [];
  const doc = { getElementById: () => null, addEventListener: (t, h) => { handlers[t] = handlers[t] || []; handlers[t].push(h); } };
  new Function("window", "document", "location", f["script.js"])({ gurostGo: (file) => went.push(file) }, doc, {});
  const button = { closest: () => null, getAttribute: () => null, form: null, textContent: "Order Now", tagName: "BUTTON" };
  const evt = { target: { closest: (sel) => (sel === "button" ? button : null) }, preventDefault() { evt.prevented = true; } };
  handlers.click.forEach((h) => h(evt));
  assert.deepEqual(went, ["order.html"]);
  assert.equal(evt.prevented, true);
});

test("a design with no data-page labels (older projects) is still split by its section ids and headings", () => {
  const r = buildSite(harden(bakery(false)));
  assert.equal(r.multi, true);
  assert.deepEqual(names(r), ["about.html", "contact.html", "index.html", "menu.html", "order.html", "script.js", "styles.css"]);
  assert.deepEqual(brokenLinks(r), []);
});

test("the offering page is named from the design: services, products, features", () => {
  const mk = (label, id, h2) => HEAD("Firm") + `<body>${HEADER(`<a href="#about">About</a><a href="#${id}">${label}</a><a href="#contact">Contact</a>`)}<main><section id="hero"><h1>Hello</h1><p>Welcome to the firm.</p></section><section id="about"><h2>About</h2><p>We are a firm.</p></section><section id="${id}"><h2>${h2}</h2><p>What we do.</p></section><section id="contact"><h2>Contact</h2><p>Call us.</p></section></main>${FOOTER}</body></html>`;
  assert.ok(names(buildSite(harden(mk("Services", "services", "Our services")))).includes("services.html"));
  assert.ok(names(buildSite(harden(mk("Products", "shop", "Shop our range")))).includes("products.html"));
  assert.ok(names(buildSite(harden(mk("Features", "features", "Everything you need")))).includes("features.html"));
  assert.ok(names(buildSite(harden(mk("Menu", "food", "Today's menu")))).includes("menu.html"));
});

test("a whole-page wrapper div (root/app container) is kept around every page", () => {
  const html = HEAD("Shop") + `<body><div id="root" class="min-h-screen bg-stone-900">${HEADER('<a href="#about">About</a><a href="#contact">Contact</a>')}<section id="hero"><h1>Hi</h1><p>Welcome to the shop.</p></section><section id="about"><h2>About</h2><p>Story.</p></section><section id="contact"><h2>Contact</h2><p>Call.</p></section>${FOOTER}</div></body></html>`;
  const r = buildSite(harden(html)), f = fileMap(r);
  assert.equal(r.multi, true);
  for (const p of r.pages) assert.match(f[p.file], /<div id="root" class="min-h-screen bg-stone-900">[\s\S]*<\/div>\s*(<script[^>]*>[^<]*<\/script>\s*)*<\/body>/, `${p.file} keeps the wrapper (its background)`);
});

test("a design that cannot be split is left exactly as it was (single page, nothing broken)", () => {
  const one = HEAD("Tiny") + `<body>${HEADER("")}<section id="hero"><h1>Hello</h1><p>Only a hero.</p></section>${FOOTER}</body></html>`;
  const r = buildSite(one);
  assert.equal(r.multi, false);
  assert.deepEqual(names(r), ["index.html"]);
  assert.equal(r.files[0].content, one);
});

test("odd but common generated HTML (unclosed paragraphs, stray closing tags) does not break the split", () => {
  const messy = HEAD("Messy") + `<body>${HEADER('<a href="#about">About</a><a href="#contact">Contact</a>')}<main>
<section id="hero"><h1>Hi</h1><p>Unclosed paragraph<p>another one</section>
</div><section id="about"><h2>About</h2><ul><li>one<li>two</ul><p>Text</p></section>
<section id="contact"><h2>Contact</h2><p>Call us</p></section></main>${FOOTER}</body></html>`;
  const r = buildSite(messy);
  assert.equal(r.multi, true);
  assert.ok(fileMap(r)["about.html"].includes("<li>two"));
  assert.deepEqual(brokenLinks(r), []);
});

test("buildSite never throws, whatever it is given, and is repeatable", () => {
  for (const junk of ["", null, undefined, "<p>hi</p>", "<body>", "<html><body><section>", 42]) assert.doesNotThrow(() => buildSite(junk));
  assert.equal(buildSite("<p>hi</p>").multi, false);
  const h = harden(bakery(true));
  assert.deepEqual(buildSite(h).files, buildSite(h).files);
});

test("a fixed header gets space above the content on the other pages, so nothing hides under it", () => {
  const html = bakery(true).replace('class="sticky top-0 z-40 bg-white"', 'class="fixed top-0 z-40 bg-white"');
  const f = fileMap(buildSite(harden(html)));
  assert.match(f["about.html"], /<main style="padding-top:5rem">/);
  assert.match(f["index.html"], /<main>/);
});

test("topLevel splits markup into its top-level elements", () => {
  const parts = topLevel('<header>H</header>text<main><section>S</section></main><script>var a="</div>";</script>').filter((p) => p.kind === "el");
  assert.deepEqual(parts.map((p) => p.tag), ["header", "main", "script"]);
  assert.equal(parts[1].inner, "<section>S</section>");
});

test("classify prefers data-page, then id, then heading", () => {
  const b = (open, inner) => ({ open, inner });
  assert.equal(classify(b('<section data-page="order" id="x">', "")), "order");
  assert.equal(classify(b('<section id="our-story">', "<h2>Hello</h2>")), "about");
  assert.equal(classify(b("<section>", "<h2>Get in touch</h2>")), "contact");
  assert.equal(classify(b("<section>", "<h2>Something else</h2>")), "home");
});
