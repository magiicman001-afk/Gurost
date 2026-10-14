"use strict";
/**
 * Shared pieces of the "premium plus" bakery templates: white page, two pages only (Home + Menu), a looping video,
 * image frames the live builder can swap for real photos (data-gurost-image), and the legal text in a pop-up <dialog>
 * instead of extra pages. Each template adds its own look on top.
 */
const C = require("./common");
const { t, esc } = C;

/** Image frame. The data-gurost-image hint is what bots/premium-images.js reads to replace the picture with a real or AI photo. */
const img = (name, alt, { role = "secondary", cls = "", w = 960, h = 1200, lazy = true, hint } = {}) =>
  `<img class="${cls}" src="assets/img/${name}.webp" alt="${esc(alt)}" width="${w}" height="${h}" ${lazy ? 'loading="lazy" decoding="async"' : ""} data-gurost-image="${esc(hint || "bakery " + name)}" data-gurost-image-role="${role}">`;

/** Looping hero video: mp4 first (Safari, iPhone), webm as a fallback, a still poster while loading and for people who prefer reduced motion. */
const video = (name, { cls = "" } = {}) =>
  `<video class="${cls}" data-hero-video autoplay muted loop playsinline preload="metadata" poster="assets/video/${name}-poster.webp" aria-hidden="true"><source src="assets/video/${name}-hero.mp4" type="video/mp4"><source src="assets/video/${name}-hero.webm" type="video/webm"></video>`;

function header(active, nav) {
  const links = [["index.html", nav.home, "home"], ["menu.html", nav.menu, "menu"]];
  const li = links.map(([h, l, k]) => `<a href="${h}"${k === active ? ' aria-current="page"' : ""}>${l}</a>`).join("");
  return `<header class="site-header"><div class="bar wrap">
<a class="brand" href="index.html">${t("business_name")}</a>
<nav class="nav" aria-label="Main">${li}</nav>
<a class="btn btn-primary bar-cta" href="${nav.ctaHref}"><span>${nav.cta}</span></a>
<button class="burger" type="button" data-menu-toggle aria-expanded="false" aria-controls="menu" aria-label="Menu"><span></span><span></span></button>
</div>
<div class="mpanel" id="menu" data-menu><nav aria-label="Mobile">${li}<a href="${nav.ctaHref}">${nav.cta}</a></nav></div></header>`;
}

function dialogs() {
  return ["privacy", "terms"].map((k) => {
    const l = C.legal(k);
    return `<dialog class="legal" id="legal-${k}" aria-labelledby="legal-${k}-t"><div class="legal-in"><button class="legal-x" type="button" data-close aria-label="Close">&times;</button><h2 id="legal-${k}-t">${l.title}</h2>${l.body}</div></dialog>`;
  }).join("\n");
}

function footerBits() {
  return {
    contact: `<address><a href="tel:${t("phone_href")}">${t("phone")}</a><br><a href="mailto:${t("email")}">${t("email")}</a><br>${t("address_line1")}, ${t("address_line2")}</address>`,
    social: `<a href="${t("instagram_url")}" rel="noopener">Instagram</a> <a href="${t("facebook_url")}" rel="noopener">Facebook</a> <a href="${t("maps_url")}" rel="noopener">Find us</a>`,
    legal: `<button type="button" data-legal="privacy">Privacy</button><button type="button" data-legal="terms">Terms</button>`,
    copy: `&copy; <span data-year></span> ${t("business_name")}`,
  };
}

/** Page shell. extraHead goes before </head> (a no-JS safety style makes sure nothing stays hidden). */
function page({ title, desc, key, body, preload = [], pack }) {
  const h = C.head({ title, desc, page: key, fontsPreload: preload, ldType: pack.ldType, ldExtra: pack.ldExtra }).replace("</head>", '<noscript><style>[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}</style></noscript>\n</head>');
  return photoReady(`${h}
${header(key, pack.nav)}
<main id="main">
${body}
</main>
${dialogs()}
<script src="assets/site.js" defer></script>
</body>
</html>
`, pack);
}

/** Everything every plus template needs, written once: reset, header, forms, hours, dialog, reveal. Variables come from the template's :root. */
const BASE_CSS = `
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:var(--ink);font:400 17px/1.65 var(--sans);-webkit-font-smoothing:antialiased;font-synthesis:none;overflow-x:hidden}
img,svg,video{display:block;max-width:100%}a{color:inherit}p{margin:0 0 1em}
h1,h2,h3{font-family:var(--display);font-weight:400;margin:0}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding:0 var(--gut)}
.skip{position:absolute;left:-999px;top:8px;background:var(--ink);color:#fff;padding:.6em 1em;border-radius:8px;z-index:100}.skip:focus{left:8px}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
.sec{padding:clamp(64px,10vw,140px) 0}
.eyebrow{display:inline-flex;align-items:center;gap:.6em;font:700 .74rem/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent)}
[data-reveal]{opacity:0;transform:translateY(26px);transition:opacity .9s var(--ease),transform .9s var(--ease)}[data-reveal].in{opacity:1;transform:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.6em;font:700 .95rem/1 var(--sans);padding:1.05em 1.7em;border-radius:999px;border:1.5px solid var(--ink);text-decoration:none;cursor:pointer;background:transparent;color:var(--ink);transition:background .3s,color .3s,transform .3s var(--ease),border-color .3s}
.btn:hover{transform:translateY(-2px)}.btn-primary{background:var(--ink);color:#fff}.btn-primary:hover{background:var(--accent);border-color:var(--accent)}
.btn-light{background:#fff;color:var(--ink);border-color:#fff}.btn-light:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.btn-glass{color:#fff;border-color:rgba(255,255,255,.55)}.btn-glass:hover{background:#fff;color:var(--ink)}
/* header */
.site-header{position:fixed;inset:0 0 auto 0;z-index:50;transition:background .35s,box-shadow .35s}
.site-header.is-stuck{background:rgba(255,255,255,.88);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);box-shadow:0 1px 0 var(--line)}
.bar{display:flex;align-items:center;gap:2rem;height:72px}
.brand{font-family:var(--display);font-size:1.6rem;text-decoration:none;letter-spacing:-.01em;margin-right:auto;line-height:1}
.nav{display:flex;gap:2rem}.nav a{text-decoration:none;font-weight:600;font-size:.95rem;position:relative;padding:.3em 0}
.nav a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--accent);transform:scaleX(0);transform-origin:left;transition:transform .4s var(--ease)}
.nav a:hover::after,.nav a[aria-current]::after{transform:scaleX(1)}
.bar .btn{padding:.75em 1.4em;font-size:.9rem}
.burger{display:none;width:44px;height:44px;border:0;background:none;cursor:pointer;position:relative;color:inherit}
.burger span{position:absolute;left:11px;right:11px;height:2px;background:currentColor;transition:transform .35s var(--ease),top .35s var(--ease)}.burger span:first-child{top:18px}.burger span:last-child{top:25px}
.menu-open .burger span:first-child{top:21px;transform:rotate(45deg)}.menu-open .burger span:last-child{top:21px;transform:rotate(-45deg)}
.mpanel{display:none}
@media(max-width:820px){.nav,.bar .btn{display:none}.burger{display:block}.bar{gap:1rem}
.mpanel{display:block;position:fixed;inset:72px 0 auto 0;background:#fff;padding:1rem var(--gut) 2rem;border-bottom:1px solid var(--line);transform:translateY(-12px);opacity:0;visibility:hidden;transition:.35s var(--ease)}
.menu-open .mpanel{transform:none;opacity:1;visibility:visible}.menu-open .site-header{background:#fff;color:var(--ink)}
.mpanel nav{display:grid}.mpanel a{padding:1rem 0;border-bottom:1px solid var(--line);text-decoration:none;font:400 1.8rem/1 var(--display)}}
/* forms */
.f{display:grid;gap:1.1rem}.f-row{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem}.f-field{display:grid;gap:.4rem}
.f label{font:700 .78rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.f input,.f textarea{font:inherit;color:var(--ink);background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:.9em 1em;width:100%;transition:border-color .25s,box-shadow .25s}
.f input:focus,.f textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 16%,transparent)}
.f textarea{resize:vertical;min-height:120px}.f-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.f .btn{justify-self:start}.f-status{margin:0;min-height:1.6em;font-size:.95rem}.f-status.ok{color:#2D7A4A}.f-status.bad{color:#B4281B}
@media(max-width:560px){.f-row{grid-template-columns:1fr}}
/* hours */
.hours{border-collapse:collapse;width:100%}.hours th,.hours td{padding:.85rem 0;border-bottom:1px solid var(--line);text-align:left;font-weight:400}
.hours th{color:var(--muted)}.hours td{text-align:right;font-weight:700}.hours tr.is-today th,.hours tr.is-today td{color:var(--accent);font-weight:700}
.hours tr.is-today th::after{content:" · today";font-weight:400}
/* legal pop-up */
.foot button{font:inherit;background:none;border:0;padding:0;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
dialog.legal{border:0;border-radius:24px;padding:0;max-width:640px;width:calc(100% - 32px);max-height:86vh;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.25);color:var(--ink)}
dialog.legal::backdrop{background:rgba(20,14,8,.55);backdrop-filter:blur(4px)}
.legal-in{padding:clamp(24px,5vw,44px);position:relative}.legal-in h2{font-size:2rem;margin-bottom:1rem}.legal-in h2+p{margin-top:0}.legal-in h2:not(:first-of-type){font-size:1.25rem;margin:1.4rem 0 .4rem}
.legal-x{position:absolute;right:14px;top:10px;width:40px;height:40px;border-radius:50%;border:0;background:var(--soft);font-size:1.6rem;line-height:1;cursor:pointer}
/* media */
.vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
@media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}[data-reveal]{opacity:1;transform:none}}
`;

/** Extra behaviour: legal pop-ups, video that rests when off screen or when reduced motion is on, drag rails, tilt, hover preview. */
const PLUS_JS = `(function () {
  "use strict";
  var d = document, w = window, reduce = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  $$("[data-legal]").forEach(function (b) { b.addEventListener("click", function () { var dlg = $("#legal-" + b.getAttribute("data-legal")); if (dlg && dlg.showModal) dlg.showModal(); }); });
  $$("dialog.legal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.hasAttribute("data-close")) dlg.close(); });
  });
  $$("video[data-hero-video]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); return; }
    var p = v.play && v.play(); if (p && p.catch) p.catch(function () {});
    if ("IntersectionObserver" in w) new IntersectionObserver(function (l) { l.forEach(function (en) { if (en.isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause(); }); }, { threshold: 0.05 }).observe(v);
  });
  $$("[data-rail]").forEach(function (rail) {
    var box = rail.parentNode, step = function (dir) { rail.scrollBy({ left: dir * Math.max(280, rail.clientWidth * 0.7), behavior: reduce ? "auto" : "smooth" }); };
    var prev = $("[data-rail-prev]", box), next = $("[data-rail-next]", box);
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    var down = false, sx = 0, sl = 0;
    rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add("drag"); });
    w.addEventListener("pointerup", function () { down = false; rail.classList.remove("drag"); });
    w.addEventListener("pointermove", function (e) { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
  });
  if (!reduce && w.matchMedia("(hover: hover)").matches) {
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = "perspective(900px) rotateY(" + (x * 8).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg) translateZ(0)"; });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }
  // poster headline: every line as wide as the page, whatever the words are
  var fl = $$("[data-fitlines]");
  function fitLines() { fl.forEach(function (h) { var spans = $$("span", h), box = h.parentNode, cs = w.getComputedStyle(box), inner = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); h.style.fontSize = "100px"; var widest = 1; spans.forEach(function (s) { widest = Math.max(widest, s.offsetWidth); }); h.style.fontSize = Math.min(520, 100 * inner / widest * 0.99).toFixed(1) + "px"; }); }
  if (fl.length) { fitLines(); w.addEventListener("resize", fitLines); if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitLines); }
  var pv = $("[data-preview-img]");
  if (pv) $$("[data-preview]").forEach(function (row) {
    var set = function () { pv.src = row.getAttribute("data-preview"); pv.parentNode.classList.add("on"); $$("[data-preview]").forEach(function (x) { x.classList.toggle("act", x === row); }); };
    row.addEventListener("mouseenter", set); row.addEventListener("focusin", set);
  });
})();
`;

/** The photographic subject of an item or a category: its own brief when the pack gives one, else the industry word plus its name. */
const hintOf = (pack, x) => x.hint || x.photo || (pack.hint + " " + String(x.n || x.name).toLowerCase());

/**
 * Makes every picture frame ready for real photographs (see bots/template-photos.js): the short subject stays as the stock-photo
 * search (data-gurost-search), and the AI brief gets the industry's photographic style added. A hero loop gets a stock-video search.
 */
function photoReady(html, pack) {
  let out = html.replace(/<img\b[^>]*?data-gurost-image="([^"]*)"[^>]*>/g, (tag, hint) =>
    tag.replace(`data-gurost-image="${hint}"`, `data-gurost-search="${hint}" data-gurost-image="${hint}${pack.photo ? ", " + esc(pack.photo) : ""}"`));
  if (pack.videoQuery) out = out.replace(/<video\b([^>]*?)data-hero-video/g, (m, pre) => `<video${pre}data-gurost-video="${esc(pack.videoQuery)}" data-hero-video`);
  return out;
}

/** Media list for a layout that borrows another layout's pictures (imgSet) and hero loop (vidSet): [source in templates/_media, file in the template's assets]. */
const mediaFor = (pack, layout, imgSet, vidSet) => [
  ...pack.media.motifs.map((n) => [`${pack.mediaDir}/img/${imgSet}/${n}.webp`, `img/${n}.webp`]),
  ...["mp4", "webm"].map((x) => [`${pack.mediaDir}/video/${vidSet}-hero.${x}`, `video/${layout}-hero.${x}`]),
  [`${pack.mediaDir}/video/${vidSet}-poster.webp`, `video/${layout}-poster.webp`],
];

module.exports = { hintOf, photoReady, mediaFor, C, t, esc, img, video, header, dialogs, footerBits, page, BASE_CSS, PLUS_JS, MENU: C.MENU, TAGS: C.TAGS };
