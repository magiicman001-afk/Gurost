"use strict";
/**
 * letter (premium plus, built for rescue and charity sites): a letter from the sanctuary. One calm column of warm paper and a book
 * serif, read like a personal newsletter: an opening with a drop cap, photographs set inline with captions, this week's residents
 * written as short paragraphs with a round photo, the numbers inside a sentence, a handwritten signature that writes itself in,
 * a P.S. with the donate button and a numbered "how to adopt". A thin reading bar runs along the top and a quiet bar with the two
 * actions slides up after the first screen. The second page is the register in the same voice. Two pages: Home and Our animals.
 * Fonts: Lora + Nothing You Could Do (SIL OFL). Pictures from the "motion" set. No hero loop.
 */
const B = require("./plus-base");
const { t, img, footerBits } = B;

const FONTS = [
  ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["Lora-Bold.ttf", "Lora-Bold.ttf"], ["NothingYouCouldDo-Regular.ttf", "NothingYouCouldDo-Regular.ttf"],
  ["Lora-OFL.txt", "OFL-Lora.txt"], ["NothingYouCouldDo-OFL.txt", "OFL-NothingYouCouldDo.txt"],
];
const PRELOAD = ["assets/fonts/Lora-Regular.ttf"];

const CSS = `
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Bold.ttf) format("truetype");font-weight:700;font-style:normal;font-display:swap}
@font-face{font-family:"Hand";src:url(fonts/NothingYouCouldDo-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
:root{--ink:#2A241C;--muted:#6B6254;--line:#E6DDCB;--paper:#FFFCF5;--soft:#F5EEDF;--accent:#9A4A2B;--display:"Lora",Georgia,serif;--sans:"Lora",Georgia,serif;--hand:"Hand","Segoe Script",cursive;--gut:clamp(18px,5vw,40px);--max:720px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--paper);font:400 clamp(1.08rem,1.4vw,1.24rem)/1.75 var(--sans)}
h1,h2,h3{font-weight:700;letter-spacing:-.01em}h1{font-size:clamp(2.5rem,6.4vw,4.6rem);line-height:1.04;font-weight:400;font-style:italic}h2{font-size:clamp(1.7rem,3.4vw,2.5rem);line-height:1.12}h3{font-size:1.3rem;line-height:1.2}
h1 em,h2 em{font-style:normal;color:var(--accent);font-weight:700}h1 em{font-weight:400;font-style:normal}
.wrap{max-width:calc(var(--max) + 2*var(--gut))}.wide{max-width:calc(1040px + 2*var(--gut))}
.site-header.is-stuck,.mpanel{background:rgba(255,252,245,.94)}.btn{border-radius:99px;font-family:var(--sans)}.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn-primary:hover{background:var(--ink);border-color:var(--ink)}.f input,.f textarea{border-radius:10px;background:#fff}
.eyebrow{font-style:italic;font-weight:400;letter-spacing:.02em;text-transform:none;font-size:1rem;color:var(--muted)}.eyebrow::before{display:none}
.progress{position:fixed;left:0;top:0;height:3px;width:100%;background:var(--accent);transform:scaleX(0);transform-origin:left;z-index:60}
/* letter */
.top{padding:clamp(110px,13vw,170px) 0 clamp(10px,2vw,24px)}.top .date{font-style:italic;color:var(--muted);margin:0 0 1.2rem}.top h1{margin:0 0 1.4rem}
.letter p{margin:0 0 1.35em}.letter>p:first-of-type::first-letter{float:left;font:700 4.6em/.8 var(--display);padding:.08em .1em 0 0;color:var(--accent)}
.fig{margin:clamp(26px,4vw,48px) calc(-1*clamp(0px,(100vw - 720px)/4,90px));text-align:center}.fig .ph{aspect-ratio:3/2;overflow:hidden;background:var(--soft);border-radius:6px;box-shadow:0 24px 44px -26px rgba(42,36,28,.5)}.fig img{width:100%;height:100%;object-fit:cover}.fig figcaption{margin-top:.7rem;font-style:italic;color:var(--muted);font-size:.95rem}
.res{display:grid;grid-template-columns:104px 1fr;gap:1.3rem;align-items:start;margin:0 0 1.9rem}.res .ph{width:104px;height:104px;border-radius:50%;overflow:hidden;background:var(--soft);box-shadow:0 0 0 5px var(--paper),0 0 0 6px var(--line);transition:transform .6s var(--ease)}.res:hover .ph{transform:rotate(-6deg) scale(1.06)}.res img{width:100%;height:100%;object-fit:cover}.res h3{margin:0 0 .15rem}.res h3 span{font-weight:400;font-style:italic;color:var(--muted);font-size:1rem;margin-left:.4rem}.res p{margin:0}.res a{color:var(--accent);text-underline-offset:3px}
@media(max-width:520px){.res{grid-template-columns:72px 1fr}.res .ph{width:72px;height:72px}}
.quote{margin:clamp(28px,4vw,50px) 0;padding:0 0 0 1.4rem;border-left:3px solid var(--accent);font:italic 400 clamp(1.4rem,2.6vw,1.9rem)/1.4 var(--display)}
.sig{margin:1.6rem 0 .4rem}.sig b{display:block;font:400 clamp(2.4rem,5vw,3.4rem)/1 var(--hand);color:var(--accent);clip-path:inset(0 100% 0 0);transition:clip-path 2.2s .2s steps(24)}.sig.in b{clip-path:inset(0)}.sig span{display:block;color:var(--muted);font-style:italic}
.sig[data-reveal]{opacity:1;transform:none}
.ps{margin:clamp(26px,4vw,44px) 0;padding:1.4rem 1.5rem;background:var(--soft);border-radius:14px}.ps p{margin:0 0 1rem}.ps p:last-child{margin:0}.ps b{font-family:var(--hand);font-weight:400;font-size:1.6rem;color:var(--accent);margin-right:.3rem}
.how{counter-reset:s;margin:0;padding:0;list-style:none}.how li{counter-increment:s;display:grid;grid-template-columns:3rem 1fr;gap:1rem;padding:1.1rem 0;border-bottom:1px solid var(--line)}.how li::before{content:counter(s);font:italic 700 2.4rem/1 var(--display);color:var(--accent)}.how h3{margin:0 0 .2rem}.how p{margin:0;color:var(--muted)}
.sec{padding:clamp(40px,6vw,76px) 0 0}
/* quiet bar */
.qbar{position:fixed;left:0;right:0;bottom:0;z-index:40;background:rgba(255,252,245,.94);backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:.7rem var(--gut) calc(.7rem + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;gap:.7rem;flex-wrap:wrap;transform:translateY(110%);transition:transform .6s var(--ease)}.qbar.on{transform:none}.qbar .btn{padding:.8em 1.4em;font-size:.9rem}
/* order + footer */
.order{display:grid;gap:1.6rem;background:var(--soft);border-radius:20px;padding:clamp(22px,4vw,44px)}.order .hours{margin:1rem 0}.order address{font-style:normal;color:var(--muted)}
.foot{padding:48px 0 calc(90px + env(safe-area-inset-bottom,0px));margin-top:clamp(40px,6vw,80px);border-top:1px solid var(--line);font-size:1rem}.foot .grid{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem}.foot .grid>:first-child{grid-column:1/-1}.foot .brand{display:block;font-size:1.8rem;margin-bottom:.3rem}.foot p,.foot address{color:var(--muted);font-style:normal;margin:0}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font-weight:400;font-style:italic;color:var(--accent);margin-bottom:.2rem}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1.6rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}
/* register */
.rh{padding:clamp(110px,13vw,160px) 0 0}.rh h1{margin:.4rem 0 1rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.4rem 0 0}.chips button{font:400 1rem/1 var(--sans);font-style:italic;padding:.7em 1.2em;border-radius:99px;border:1px solid var(--ink);background:transparent;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--ink);color:var(--paper);font-style:normal}
.rg{padding-top:clamp(30px,5vw,56px)}.rg[hidden]{display:none}.rg h2{border-bottom:1px solid var(--ink);padding-bottom:.4rem}.rg .bl{font-style:italic;color:var(--muted);margin:.6rem 0 1.2rem}.rg .res:last-child{margin-bottom:0}
`;

const JS = `(function () {
  "use strict";
  var d = document, w = window, bar = d.querySelector("[data-progress]"), q = d.querySelector("[data-qbar]"), tick = false;
  var run = function () {
    tick = false; var h = d.documentElement, max = h.scrollHeight - h.clientHeight, y = w.pageYOffset;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    if (q) q.classList.toggle("on", y > w.innerHeight * 0.7);
  };
  w.addEventListener("scroll", function () { if (!tick) { tick = true; w.requestAnimationFrame(run); } }, { passive: true }); run();
})();
`;

const strip = (s) => String(s).replace(/&middot;/g, "·");
const animals = (pack) => pack.cats.flatMap((c) => c.items.map((i) => ({ ...i, art: i.art || c.art, kind: c.name })));

const ORDER = (pack, h) => `<section class="sec" id="order"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:.4rem 0 .6rem">${h}</h2><p style="margin:0;color:var(--muted)">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}<b style="margin-top:.6rem">Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}
const qbar = (K) => `<div class="qbar" data-qbar><a class="btn btn-primary" href="#order"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "#order"}"><span>${K.cta2}</span></a></div>`;

function home(pack) {
  const K = pack.copy.atelier, list = animals(pack), pick = list.filter((i) => i.star).slice(0, 4), first = pick[0] || list[0];
  const res = pick.map((i, k) => `<div class="res" data-reveal data-delay="${k * 80}"><div class="ph">${img(i.art, i.n, { w: 320, h: 320, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}<span>${strip(i.meta)}</span></h3><p>${i.d} <a href="#order">Ask about ${i.n}.</a></p></div></div>`).join("");
  const [y, r, c] = K.stats;
  const body = `
<div class="progress" data-progress aria-hidden="true"></div>
<section class="top"><div class="wrap"><p class="date" data-today></p><span class="eyebrow">${K.heroEyebrow}</span><h1 style="margin-top:.6rem">${K.heroH1}</h1></div></section>
<article class="letter"><div class="wrap"><p>${K.story.lead}</p><p>${t("tagline")}</p>
<figure class="fig" data-reveal><div class="ph">${img(K.story.art, K.story.alt, { role: "featured", w: 1200, h: 800, hint: K.story.hint, lazy: false })}</div><figcaption>${K.story.alt}</figcaption></figure>
<p>In ${y[0]} years we have found homes for ${r[0]} animals, and ${c[0]} are in our care today. ${pack.cats.map((k) => k.blurb).slice(0, 2).join(" ")}</p>
<h2 style="margin:clamp(30px,4vw,50px) 0 1.2rem">${K.fav[1]}</h2>${res}
<p class="quote" data-reveal>${K.process[2][0][1]}</p>
<h2 style="margin:clamp(30px,4vw,50px) 0 .6rem">${K.process[1]}</h2><ol class="how">${K.process[2].map(([h, p]) => `<li data-reveal><div><h3>${h}</h3><p>${p}</p></div></li>`).join("")}</ol>
<div class="sig" data-reveal><b>${t("owner_name")}</b><span>${t("business_name")}</span></div>
<div class="ps" data-reveal><p><b>P.S.</b>${pack.donate ? pack.donate.lead : "We depend on kind people."}</p><p style="margin:0"><a class="btn btn-primary" href="${K.cta2Href || "#order"}"><span>${K.cta2}</span></a> &nbsp; <a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></p></div></div></article>
${ORDER(pack, K.orderHome)}
${foot()}${qbar(K)}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const rg = cats.map((c) => `<section class="rg" id="${c.id}" data-cat="${c.id}"><h2>${c.name}</h2><p class="bl">${c.blurb}</p>${c.items.map((i) => `<div class="res"><div class="ph">${img(i.art || c.art, i.n, { w: 320, h: 320, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}<span>${strip(i.meta)}</span></h3><p>${i.d}${i.tags.length ? ` <em style="color:var(--muted)">${i.tags.map((x) => pack.tags[x]).join(", ")}.</em>` : ""} <a href="#order">Ask about ${i.n}.</a></p></div></div>`).join("")}</section>`).join("");
  const body = `<div class="progress" data-progress aria-hidden="true"></div><section class="rh"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1>${K.menuHero[1]}</h1><p style="color:var(--muted)">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${rg}</div>
${ORDER(pack, K.orderMenu)}
${foot()}${qbar(K)}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/sanctuary")) {
  return { name: "letter", themeColor: "#FFFCF5", fonts: FONTS, media: B.mediaFor(pack, "letter", "motion", "motion").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.letter || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
