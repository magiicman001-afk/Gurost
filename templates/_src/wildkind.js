"use strict";
/**
 * wildkind (premium plus, built for rescue and nature sites): a field guide. The home page opens on vertical strips, one per kind
 * of animal: touch or hover one and it widens to show its photograph, number and a line about it. Further down, "A day at the
 * sanctuary": a clock stays pinned while the day's events scroll past and its hand swings to each time. Big condensed numbers with
 * growing bars, a story band and the form follow. The second page is a field-guide index of specimen cards by kind.
 * Fonts: Big Shoulders + Instrument Sans (SIL OFL). Optional pack.day = [[time "HH:MM", title, text], ...].
 */
const B = require("./plus-base");
const { t, img, footerBits } = B;

const FONTS = [
  ["BigShoulders-Bold.ttf", "BigShoulders-Bold.ttf"], ["BigShoulders-Regular.ttf", "BigShoulders-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["BigShoulders-OFL.txt", "OFL-BigShoulders.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/BigShoulders-Bold.ttf"];

const CSS = `
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#18241C;--muted:#5B6659;--line:#CFCDB8;--bg:#E8E5D2;--moss:#17241B;--moss2:#22352A;--accent:#C8DA47;--olive:#4C6A12;--display:"Big Shoulders","Arial Narrow",sans-serif;--sans:"Instrument Sans",system-ui,sans-serif;--gut:clamp(16px,3.4vw,48px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--bg)}
h1,h2,h3{font-weight:700;text-transform:uppercase;letter-spacing:.005em}h1{font-size:clamp(3.4rem,10vw,9.4rem);line-height:.84}h2{font-size:clamp(2.6rem,6.4vw,5.6rem);line-height:.88}h3{font-size:1.9rem;line-height:.95}
h1 em,h2 em{font-style:normal;color:var(--olive)}.lead{font-size:clamp(1.05rem,1.4vw,1.25rem);color:var(--muted);max-width:30em}
.site-header.is-stuck,.mpanel{background:rgba(232,229,210,.92)}.btn{border-radius:0;text-transform:uppercase;letter-spacing:.08em;font-size:.8rem}.btn-primary{background:var(--moss);color:var(--accent);border-color:var(--moss)}.btn-primary:hover{background:var(--accent);color:var(--moss);border-color:var(--accent)}
.f input,.f textarea{border-radius:0;background:#F3F1E2}.eyebrow::before{border-radius:0}.nav a{text-transform:uppercase;letter-spacing:.08em;font-size:.78rem}
/* intro */
.intro{padding:clamp(100px,11vw,132px) 0 clamp(20px,3vw,36px)}.intro .wrap{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(20px,5vw,80px);align-items:end}.intro h1{margin-top:1rem}.intro p.lead{margin:0 0 1.2rem}.cta-row{display:flex;gap:.6rem;flex-wrap:wrap}
@media(max-width:860px){.intro .wrap{grid-template-columns:1fr}}
/* strips */
.strips{display:flex;height:min(72vh,680px);min-height:420px;gap:6px;padding:0 var(--gut);max-width:calc(var(--max) + 2*var(--gut));margin:0 auto}
.sp{position:relative;flex:1;overflow:hidden;background:var(--moss2);color:#fff;text-decoration:none;transition:flex .9s var(--ease);display:block;min-width:0}.sp.on{flex:5}
.sp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.12);filter:saturate(.8) brightness(.7);transition:transform 1.4s var(--ease),filter .8s}.sp.on img{transform:none;filter:none}
.sp::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,18,13,.15),rgba(10,18,13,.78))}
.sp .no{position:absolute;left:18px;top:14px;z-index:1;font:700 1.1rem/1 var(--display);letter-spacing:.1em;color:var(--accent)}
.sp .vt{position:absolute;left:0;right:0;bottom:22px;z-index:1;display:flex;justify-content:center;transition:opacity .4s}.sp .vt b{font:700 clamp(2.4rem,4.4vw,4rem)/1 var(--display);text-transform:uppercase;writing-mode:vertical-rl;transform:rotate(180deg);letter-spacing:.02em}.sp.on .vt{opacity:0}
.sp .sx{position:absolute;left:clamp(18px,2.4vw,34px);right:clamp(18px,2.4vw,34px);bottom:clamp(18px,2.4vw,32px);z-index:1;opacity:0;transform:translateY(18px);transition:opacity .6s .25s,transform .7s .25s var(--ease)}.sp.on .sx{opacity:1;transform:none}
.sp .sx h3{font-size:clamp(3rem,6vw,5.4rem);line-height:.86}.sp .sx p{margin:.7rem 0 1rem;max-width:26em;color:#E6EADD}.sp .sx span{font:700 .78rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:.3em}
@media(max-width:760px){.strips{flex-direction:column;height:auto;min-height:0}.sp,.sp.on{flex:none;height:86px;transition:height .8s var(--ease)}.sp.on{height:380px}.sp .vt{top:0;bottom:0;align-items:center;justify-content:flex-start;padding-left:70px}.sp .vt b{writing-mode:horizontal-tb;transform:none;font-size:2.2rem}}
/* day */
.day{background:var(--moss);color:#EDEFE2;padding:clamp(56px,8vw,120px) 0;margin-top:clamp(40px,6vw,90px)}.day h2 em{color:var(--accent)}.day .eyebrow{color:#B9C6B3}.day .eyebrow::before{background:var(--accent)}
.day .wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:clamp(24px,6vw,100px)}.clk{position:sticky;top:110px;align-self:start}.clk h2{margin:1rem 0 1.6rem}
.face{position:relative;width:min(100%,360px);aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:radial-gradient(circle,#22352A,#17241B 72%)}.face svg{width:100%;height:100%;display:block}.hand{transform-origin:100px 100px;transition:transform 1.2s var(--ease)}.hand.m{transition-duration:1.2s}
.digi{margin-top:1rem;font:700 clamp(3.4rem,7vw,5.6rem)/.9 var(--display);color:var(--accent);letter-spacing:.02em}.digi small{display:block;font:400 .8rem/1.3 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:#B9C6B3;margin-top:.5rem}
.ev{border-top:1px solid rgba(255,255,255,.18);padding:clamp(22px,3.4vw,40px) 0 clamp(22px,3.4vw,40px) clamp(0px,1vw,10px);display:grid;grid-template-columns:5.2rem 1fr;gap:1.2rem;opacity:.42;transition:opacity .5s,padding .5s var(--ease)}.ev.on{opacity:1;padding-left:clamp(10px,2vw,28px)}.ev time{font:700 2.1rem/1 var(--display);color:var(--accent)}.ev h3{font-size:clamp(1.9rem,3.4vw,2.8rem);margin-bottom:.4rem}.ev p{margin:0;color:#C7D1C2;max-width:30em}
@media(max-width:860px){.day .wrap{grid-template-columns:1fr}.clk{position:static}.face{width:220px}.digi{font-size:3.4rem}}
/* numbers */
.nums{padding:clamp(56px,8vw,110px) 0}.nrow{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,48px)}.nm b{display:block;font:700 clamp(4rem,10vw,9rem)/.85 var(--display)}.nm span{display:block;font:700 .78rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:.5rem 0 .8rem}.nm i{display:block;height:6px;background:var(--line);position:relative}.nm i::after{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--w,0%);background:var(--olive);transition:width 1.6s var(--ease)}.nm.in i::after{--w:100%}
@media(max-width:700px){.nrow{grid-template-columns:1fr}}
.band{background:var(--accent);color:var(--moss);padding:clamp(40px,6vw,80px) 0}.band .wrap{display:grid;grid-template-columns:1.3fr 1fr;gap:clamp(20px,5vw,80px);align-items:center}.band h2{font-size:clamp(2.4rem,5.4vw,4.8rem)}.band h2 em{color:var(--moss);text-decoration:underline;text-decoration-thickness:.06em}.band p{margin:0 0 1.2rem;font-size:1.1rem}@media(max-width:820px){.band .wrap{grid-template-columns:1fr}}
.band .btn-primary{background:var(--moss);color:var(--accent);border-color:var(--moss)}.band .btn-primary:hover{background:#fff;color:var(--moss);border-color:#fff}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(24px,5vw,72px);padding:clamp(22px,4vw,56px);background:#F3F1E2;border:1px solid var(--line)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{background:var(--moss);color:#E4E8D8;padding:52px 0 28px;margin-top:clamp(56px,8vw,110px)}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font:700 clamp(2.2rem,4vw,3.2rem)/.95 var(--display);text-transform:uppercase;margin-bottom:.6rem}.foot p,.foot address{color:#A9B8A4;font-style:normal;margin:0}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:700 .72rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.15);color:#8DA088;font-size:.86rem}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* index page */
.mh{padding:clamp(112px,12vw,150px) 0 0}.mh h1{font-size:clamp(3rem,8vw,7.4rem);margin:1rem 0 1rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.6rem 0 0}.chips button{font:700 .8rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.9em 1.3em;border:2px solid var(--moss);background:transparent;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--moss);color:var(--accent)}
.grp{padding-top:clamp(34px,5vw,70px)}.grp[hidden]{display:none}.gh{display:flex;align-items:end;justify-content:space-between;gap:1.4rem;flex-wrap:wrap;margin-bottom:1.2rem;border-bottom:4px solid var(--moss);padding-bottom:.4rem}.gh h2{font-size:clamp(3rem,8vw,7rem)}.gh p{margin:0 0 .6rem;color:var(--muted);max-width:26em}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.6vw,22px)}.spec{background:#F3F1E2;border:1px solid var(--line);position:relative;overflow:hidden;transition:transform .5s var(--ease),box-shadow .5s}.spec:hover{transform:translateY(-6px);box-shadow:0 24px 40px -24px rgba(23,36,27,.5)}
.spec .ph{aspect-ratio:4/5;overflow:hidden;background:var(--moss2)}.spec img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}.spec:hover img{transform:scale(1.06)}.spec .no{position:absolute;left:10px;top:8px;font:700 1rem/1 var(--display);letter-spacing:.1em;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.5)}
.spec .tx{padding:.9rem 1rem 1.1rem}.spec h3{font-size:2.3rem}.spec .m{font:700 .72rem/1.3 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--olive);margin:.2rem 0 .5rem}.spec p{margin:0;font-size:.93rem;color:var(--muted)}.spec .tags{margin-top:.7rem;display:flex;gap:.3rem;flex-wrap:wrap}.spec .tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .6em;background:var(--moss);color:var(--accent)}.spec .tg.o{background:transparent;color:var(--moss);border:1px solid var(--moss)}
@media(max-width:1020px){.sg{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.sg{grid-template-columns:repeat(2,1fr)}.spec p{display:none}}@media(max-width:420px){.sg{grid-template-columns:1fr}}
`;

const JS = `(function () {
  "use strict";
  var d = document, w = window, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var sp = $$(".sp");
  if (sp.length) {
    var on = function (el) { sp.forEach(function (x) { x.classList.toggle("on", x === el); x.setAttribute("aria-expanded", x === el ? "true" : "false"); }); };
    sp.forEach(function (s) {
      s.addEventListener("mouseenter", function () { if (w.matchMedia("(hover: hover)").matches) on(s); });
      s.addEventListener("focus", function () { on(s); });
      s.addEventListener("click", function (e) { if (!s.classList.contains("on")) { e.preventDefault(); on(s); } });
    });
  }
  var hh = $("[data-hand-h]"), hm = $("[data-hand-m]"), dg = $("[data-digi]");
  var evs = $$("[data-ev]");
  if (hh && evs.length) {
    var show = function (el) {
      var p = el.getAttribute("data-ev").split(":"), h = +p[0] % 12, m = +p[1] || 0;
      hh.style.transform = "rotate(" + ((h + m / 60) * 30) + "deg)"; hm.style.transform = "rotate(" + (m * 6) + "deg)";
      if (dg) dg.firstChild.nodeValue = el.getAttribute("data-ev");
      evs.forEach(function (x) { x.classList.toggle("on", x === el); });
    };
    show(evs[0]);
    if ("IntersectionObserver" in w) {
      var io = new IntersectionObserver(function (l) { l.forEach(function (en) { if (en.isIntersecting) show(en.target); }); }, { rootMargin: "-45% 0px -45% 0px" });
      evs.forEach(function (e) { io.observe(e); });
    }
  }
})();
`;

const pad = (n) => String(n).padStart(2, "0");
const strip = (s) => String(s).replace(/&middot;/g, "·");
const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-bottom:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

const CLOCK = `<div class="face"><svg viewBox="0 0 200 200" aria-hidden="true"><g stroke="#8FA68A" stroke-width="2">${Array.from({ length: 12 }, (_, i) => `<line x1="100" y1="12" x2="100" y2="${i % 3 === 0 ? 26 : 20}" transform="rotate(${i * 30} 100 100)"/>`).join("")}</g>
<line class="hand" data-hand-h x1="100" y1="100" x2="100" y2="54" stroke="#EDEFE2" stroke-width="6" stroke-linecap="round"/><line class="hand m" data-hand-m x1="100" y1="100" x2="100" y2="30" stroke="#C8DA47" stroke-width="3.5" stroke-linecap="round"/><circle cx="100" cy="100" r="6" fill="#C8DA47"/></svg></div>`;

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats, day = pack.day || [];
  const strips = cats.map((c, k) => `<a class="sp${k === 0 ? " on" : ""}" href="menu.html#${c.id}" aria-expanded="${k === 0}">${img(c.art, c.name, { role: k === 0 ? "featured" : "secondary", w: 900, h: 1100, hint: B.hintOf(pack, c), lazy: k > 1 })}<span class="no">${pad(k + 1)}</span><span class="vt"><b>${c.name}</b></span><span class="sx"><h3>${c.name}</h3><p>${c.blurb}</p><span>${K.collection[2]} &rarr;</span></span></a>`).join("");
  const evs = day.map(([tm, h, p]) => `<div class="ev" data-ev="${tm}"><time>${tm}</time><div><h3>${h}</h3><p>${p}</p></div></div>`).join("");
  const dayHtml = day.length ? `<section class="day"><div class="wrap"><div class="clk"><span class="eyebrow">${pack.dayEyebrow || "A day with us"}</span><h2>${pack.dayH2 || "A day at the <em>sanctuary</em>"}</h2>${CLOCK}<div class="digi" data-digi>${day[0][0]}<small>${K.glass[2]}</small></div></div><div>${evs}</div></div></section>` : "";
  const nums = `<section class="nums"><div class="wrap"><div class="nrow">${K.stats.map(([v, s, l], k) => `<div class="nm" data-reveal data-delay="${k * 120}"><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span><i></i></div>`).join("")}</div></div></section>`;
  const body = `
<section class="intro"><div class="wrap"><div><span class="eyebrow">${K.heroEyebrow}</span><h1>${K.heroH1}</h1></div><div><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div></div></section>
<div class="strips" role="list">${strips}</div>
${dayHtml}
${nums}
<section class="band"><div class="wrap"><div><span class="eyebrow" style="color:var(--moss)">${K.story.eyebrow}</span><h2 style="margin-top:.8rem">${K.story.h2}</h2></div><div><p>${K.story.lead}</p><a class="btn btn-primary" href="menu.html"><span>${K.collection[2]}</span></a></div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  let n = 0;
  const grp = cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="sg">${c.items.map((i) => `<article class="spec" data-reveal><div class="ph">${img(i.art || c.art, i.n, { w: 640, h: 800, hint: B.hintOf(pack, i) })}</div><span class="no">No. ${pad(++n)}</span><div class="tx"><h3>${i.n}</h3><div class="m">${strip(i.meta)}</div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tg">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg o" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1>${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/sanctuary")) {
  return { name: "wildkind", themeColor: "#17241B", fonts: FONTS, media: B.mediaFor(pack, "wildkind", "atelier", "atelier").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.wildkind || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
