"use strict";
/**
 * stories (premium plus, built for rescue and charity sites): a documentary. A full-screen film hero with a running ticker of
 * names, then one "chapter" per kind of animal: the chapter title stays pinned while tall photographs unmask one after another.
 * A ledger of impact numbers, a donate panel (amount switch, monthly or once) and a numbered path close the page.
 * The second page is an index of every animal: hover a name and its photograph follows on a pinned frame.
 * Fonts: Gloock + Instrument Sans (SIL OFL). Optional pack.donate = { eyebrow, h2, lead, amounts, gifts }.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/Gloock-Regular.ttf"];

const CSS = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#14211C;--muted:#5B665F;--line:#D7CFBC;--bone:#EFE9DC;--soft:#E7E0CF;--accent:#C9801C;--deep:#0E3A33;--display:"Gloock",Georgia,serif;--sans:"Instrument Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,56px);--max:1360px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--bone);font-size:clamp(1rem,1.1vw,1.1rem)}
h1{font-size:clamp(3rem,9.4vw,9rem);line-height:.92;letter-spacing:-.025em}h2{font-size:clamp(2.2rem,5vw,4.6rem);line-height:1;letter-spacing:-.02em}h3{font-size:1.5rem;line-height:1.1}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.08rem,1.5vw,1.3rem);color:var(--muted);max-width:30em}
.site-header{color:#fff}.site-header.is-stuck{background:rgba(239,233,220,.92);color:var(--ink)}.mpanel{background:var(--bone)}.mpanel a{color:var(--ink)}.menu-open .site-header{background:var(--bone);color:var(--ink)}
.btn{border-radius:4px;text-transform:uppercase;letter-spacing:.09em;font-size:.8rem}.btn-primary{background:var(--accent);border-color:var(--accent);color:#14110A}.btn-primary:hover{background:#fff;border-color:#fff;color:var(--ink)}
.site-header .bar .btn{background:transparent;color:inherit;border-color:currentColor}.site-header .bar .btn:hover{background:var(--accent);border-color:var(--accent);color:#14110A}
.nav a{letter-spacing:.08em;text-transform:uppercase;font-size:.78rem}.f input,.f textarea{border-radius:4px;background:#fff}
/* film hero */
.film{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;color:#fff;background:#07140F;overflow:hidden}.film video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.film::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,20,15,.45),rgba(7,20,15,.05) 35%,rgba(7,20,15,.82))}
.film .wrap{position:relative;z-index:1;padding-bottom:clamp(30px,5vw,60px);padding-top:140px}.film .eyebrow{color:#E9DFC6}.film h1{margin:1.1rem 0 1.4rem;max-width:11em}.film .lead{color:#E3E8E0;margin-bottom:2rem}
.film .row{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap}.cta-row{display:flex;gap:.7rem;flex-wrap:wrap}.film .btn:not(.btn-primary){color:#fff;border-color:rgba(255,255,255,.6)}.film .btn:not(.btn-primary):hover{background:#fff;color:var(--ink)}
.live{display:flex;align-items:center;gap:.7rem;font-size:.92rem;background:rgba(255,255,255,.12);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.25);padding:.8rem 1.1rem;border-radius:99px}.live i{width:9px;height:9px;border-radius:50%;background:#58D68D;animation:ping 2.2s infinite}
@keyframes ping{70%{box-shadow:0 0 0 11px rgba(88,214,141,0)}100%{box-shadow:0 0 0 0 rgba(88,214,141,0)}}
.ticker{position:relative;z-index:1;border-top:1px solid rgba(255,255,255,.22);overflow:hidden;white-space:nowrap;background:rgba(7,20,15,.55);backdrop-filter:blur(8px)}.tk{display:inline-flex;gap:2.4rem;padding:1rem 1.2rem;animation:tk 38s linear infinite;font:400 1.35rem/1 var(--display)}.tk span::after{content:"\\2726";margin-left:2.4rem;color:var(--accent);font-size:.9rem}
@keyframes tk{to{transform:translateX(-100%)}}.ticker:hover .tk{animation-play-state:paused}
/* chapters */
.chap{padding:clamp(64px,9vw,130px) 0;border-bottom:1px solid var(--line)}.chap .wrap{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(28px,6vw,100px)}
.pin{position:sticky;top:110px;align-self:start}.pin .num{display:block;font:400 clamp(5rem,12vw,10rem)/.8 var(--display);color:transparent;-webkit-text-stroke:1.5px var(--ink);margin-bottom:1.4rem;opacity:.9}.pin h2{margin-bottom:1rem}.pin p{color:var(--muted);max-width:24em}.pin .btn{margin-top:.6rem}
.frames{display:grid;gap:clamp(20px,3vw,40px)}.fr{position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--soft);border-radius:4px}.fr:nth-child(even){width:84%;justify-self:end;aspect-ratio:1}.fr img{width:100%;height:100%;object-fit:cover;transform:scale(1.14);transition:transform 1.8s var(--ease)}.fr.in img{transform:none}
.fr[data-reveal]{opacity:1;transform:none;clip-path:inset(0 0 100% 0);transition:clip-path 1.3s var(--ease)}.fr[data-reveal].in{clip-path:inset(0)}
.fr figcaption{position:absolute;left:0;right:0;bottom:0;padding:3rem 1.3rem 1.2rem;color:#fff;background:linear-gradient(180deg,transparent,rgba(8,20,16,.78));display:flex;justify-content:space-between;align-items:baseline;gap:1rem}.fr figcaption b{font:400 1.7rem/1 var(--display)}.fr figcaption span{font-size:.88rem;opacity:.9}
@media(max-width:860px){.chap .wrap{grid-template-columns:1fr}.pin{position:static}.pin .num{font-size:5rem;margin-bottom:.6rem}.fr:nth-child(even){width:100%}.fr{aspect-ratio:4/3}.fr:nth-child(even){aspect-ratio:4/3}}
/* ledger */
.ledger{background:var(--deep);color:#EFE9DC;padding:clamp(60px,9vw,130px) 0}.ledger .eyebrow{color:#B9CBC4}.ledger .quote{font:400 clamp(1.6rem,3.2vw,2.8rem)/1.18 var(--display);max-width:22em;margin:1.2rem 0 clamp(36px,6vw,80px)}
.led{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,.3)}.led div{padding:1.4rem 1.4rem 0 0}.led div+div{padding-left:1.4rem;border-left:1px solid rgba(255,255,255,.18)}.led b{display:block;font:400 clamp(3.4rem,9vw,8rem)/.95 var(--display);color:#F2B65A;letter-spacing:-.03em}.led span{font-size:.86rem;letter-spacing:.1em;text-transform:uppercase;color:#B9CBC4}
@media(max-width:700px){.led{grid-template-columns:1fr}.led div,.led div+div{padding:1.2rem 0;border-left:0;border-top:1px solid rgba(255,255,255,.18)}}
/* donate */
.give{padding:clamp(60px,9vw,120px) 0}.give .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,6vw,90px);align-items:start}.give h2{margin:1rem 0 1rem}
.gifts{display:grid;gap:.7rem;margin:1.6rem 0 0;padding:0;list-style:none}.gifts li{display:flex;gap:1rem;align-items:baseline;border-bottom:1px solid var(--line);padding-bottom:.7rem}.gifts b{font:400 1.5rem/1 var(--display);color:var(--accent);min-width:3.2rem}
.gbox{background:#fff;border:1px solid var(--line);border-radius:6px;padding:clamp(20px,3.4vw,40px);box-shadow:0 30px 60px -34px rgba(20,33,28,.4)}
.seg{display:grid;grid-template-columns:1fr 1fr;border:1.5px solid var(--ink);border-radius:4px;overflow:hidden;margin-bottom:1.2rem}.seg button{font:700 .82rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:1em;background:#fff;border:0;cursor:pointer;color:var(--ink)}.seg button[aria-pressed=true]{background:var(--ink);color:#fff}
.amts{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:1.2rem}.amts button{font:400 1.7rem/1 var(--display);padding:.8em 0;border:1.5px solid var(--line);background:#fff;border-radius:4px;cursor:pointer;transition:.25s;color:var(--ink)}.amts button:hover{border-color:var(--ink)}.amts button[aria-pressed=true]{border-color:var(--accent);background:#FFF5E3;box-shadow:inset 0 0 0 1px var(--accent)}
.gbox .btn{width:100%}.gbox small{display:block;margin-top:.8rem;color:var(--muted);text-align:center}
@media(max-width:860px){.give .wrap{grid-template-columns:1fr}}
/* path */
.way{padding:0 0 clamp(60px,9vw,120px)}.ways{border-top:2px solid var(--ink)}.wy{display:grid;grid-template-columns:minmax(4.5rem,11rem) 1fr 1.4fr;gap:clamp(14px,3vw,48px);align-items:center;padding:1.4rem 0;border-bottom:1px solid var(--line);transition:padding .5s var(--ease),background .4s}.wy:hover{padding-inline:1rem;background:var(--soft)}
.wy .n{font:400 clamp(3rem,7vw,6rem)/.9 var(--display);color:var(--accent)}.wy p{margin:0;color:var(--muted)}@media(max-width:720px){.wy{grid-template-columns:3.4rem 1fr}.wy p{grid-column:2}}
.hours tr.is-today th,.hours tr.is-today td{color:#8A5200}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(26px,5vw,80px);padding:clamp(22px,4vw,60px);background:#fff;border:1px solid var(--line);border-radius:6px}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{background:#0A2A25;color:#E6E0D0;padding:56px 0 30px;margin-top:clamp(60px,9vw,120px)}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:clamp(2rem,4vw,3rem);margin-bottom:.6rem}.foot p,.foot address{color:#AABDB5;font-style:normal;margin:0}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:700 .72rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:#F2B65A;margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.15);color:#8FA69D;font-size:.86rem}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* animals index */
.mh{background:var(--deep);color:#fff;padding:clamp(120px,14vw,190px) 0 clamp(36px,5vw,60px)}.mh .eyebrow{color:#B9CBC4}.mh h1{font-size:clamp(3rem,8vw,7rem);margin:1rem 0 1.2rem}.mh .lead{color:#C9D8D2}
.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.8rem}.chips button{font:700 .78rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.9em 1.3em;border:1.5px solid rgba(255,255,255,.4);background:transparent;color:#fff;cursor:pointer;border-radius:4px;transition:.25s}.chips button[aria-pressed=true]{background:#fff;color:var(--ink);border-color:#fff}
.idx{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:clamp(24px,5vw,80px);padding:clamp(30px,5vw,70px) 0 0}.idx .col{min-width:0}
.grp{margin-bottom:clamp(28px,4vw,52px)}.grp[hidden]{display:none}.grp h2{font-size:clamp(1.4rem,2.2vw,2rem);border-bottom:2px solid var(--ink);padding-bottom:.6rem;margin-bottom:0}
.ar{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:1.1rem;align-items:center;padding:1rem 0;border-bottom:1px solid var(--line);transition:padding .4s var(--ease),background .3s;cursor:default}.ar:hover,.ar.act{padding-inline:.9rem;background:var(--soft)}
.ar .th{width:56px;height:56px;border-radius:50%;overflow:hidden;background:var(--soft)}.ar .th img{width:100%;height:100%;object-fit:cover}.ar h3{font-size:clamp(1.6rem,3.2vw,2.6rem);line-height:1}.ar p{margin:.3rem 0 0;color:var(--muted);font-size:.95rem}.ar .m{font-size:.86rem;color:var(--muted);text-align:right;max-width:9em}
.pvw{position:sticky;top:100px;align-self:start}.pvw .box{aspect-ratio:4/5;border-radius:4px;overflow:hidden;background:var(--soft);position:relative}.pvw img{width:100%;height:100%;object-fit:cover;transition:opacity .35s}.pvw .cap{margin-top:.8rem;font:400 1.5rem/1 var(--display)}
@media(max-width:860px){.idx{grid-template-columns:1fr}.pvw{display:none}.ar{grid-template-columns:48px 1fr}.ar .th{width:48px;height:48px}.ar .m{grid-column:2;text-align:left;max-width:none}}
`;

const JS = `(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var pv = $("[data-pv] img"), cap = $("[data-pv-cap]");
  if (pv) {
    var rows = $$("[data-ar]"), show = function (r) {
      var im = $("img", r); if (!im) return;
      pv.style.opacity = 0; setTimeout(function () { pv.src = im.currentSrc || im.src; pv.alt = im.alt; pv.style.opacity = 1; }, 120);
      if (cap) cap.textContent = r.getAttribute("data-ar");
      rows.forEach(function (x) { x.classList.toggle("act", x === r); });
    };
    rows.forEach(function (r) { r.addEventListener("mouseenter", function () { show(r); }); r.addEventListener("focusin", function () { show(r); }); });
  }
  var g = $("[data-give]");
  if (g) {
    var mode = "once", amt = "25", base = g.getAttribute("data-url"), go = $("[data-go]", g), txt = $("[data-go-txt]", g);
    var upd = function () {
      var u = base + (base.indexOf("?") > -1 ? "&" : "?") + "amount=" + encodeURIComponent(amt) + (mode === "monthly" ? "&frequency=monthly" : "");
      go.setAttribute("href", u); txt.textContent = (mode === "monthly" ? "Give " : "Give ") + "\\u00A3" + amt + (mode === "monthly" ? " a month" : "");
    };
    $$("[data-mode]", g).forEach(function (b) { b.addEventListener("click", function () { mode = b.getAttribute("data-mode"); $$("[data-mode]", g).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); upd(); }); });
    $$("[data-amt]", g).forEach(function (b) { b.addEventListener("click", function () { amt = b.getAttribute("data-amt"); $$("[data-amt]", g).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); upd(); }); });
    upd();
  }
})();
`;

const pad = (n) => String(n).padStart(2, "0");
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;
const names = (pack) => pack.cats.flatMap((c) => c.items.map((i) => i.n));

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-bottom:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

function donate(pack) {
  const D = pack.donate; if (!D) return "";
  return `<section class="give" id="give"><div class="wrap"><div data-reveal><span class="eyebrow">${D.eyebrow}</span><h2>${D.h2}</h2><p class="lead">${D.lead}</p><ul class="gifts">${D.gifts.map(([a, s]) => `<li><b>${a}</b><span>${s}</span></li>`).join("")}</ul></div>
<div class="gbox" data-reveal data-delay="120" data-give data-url="${t("donate_url")}"><div class="seg" role="group" aria-label="How often"><button type="button" data-mode="once" aria-pressed="true">Give once</button><button type="button" data-mode="monthly" aria-pressed="false">Every month</button></div>
<div class="amts" role="group" aria-label="Amount">${D.amounts.map((a, k) => `<button type="button" data-amt="${a}" aria-pressed="${k === 1}">&pound;${a}</button>`).join("")}</div>
<a class="btn btn-primary" href="${t("donate_url")}" data-go rel="noopener"><span data-go-txt>Give &pound;${D.amounts[1]}</span></a><small>${D.note}</small></div></div></section>`;
}

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const tk = names(pack).map((n) => `<span>${n}</span>`).join("");
  const chapters = cats.map((c, k) => `<section class="chap" id="${c.id}"><div class="wrap"><div class="pin" data-reveal><span class="num">${pad(k + 1)}</span><h2>${c.name}</h2><p>${c.blurb}</p><a class="btn" href="menu.html#${c.id}"><span>${K.collection[2]}</span></a></div>
<div class="frames">${c.items.slice(0, 2).map((i) => `<figure class="fr" data-reveal>${img(i.art || c.art, i.n, { role: k === 0 ? "featured" : "secondary", w: 900, h: 1120, hint: B.hintOf(pack, i) })}<figcaption><b>${i.n}</b><span>${i.meta}</span></figcaption></figure>`).join("")}</div></div></section>`).join("");
  const body = `
<section class="film">${video("stories")}<div class="wrap"><span class="eyebrow">${K.heroEyebrow}</span><h1>${K.heroH1}</h1><div class="row"><div><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "#give"}"><span>${K.cta2}</span></a></div></div><p class="live"><i></i>${K.glass[2]}</p></div></div>
<div class="ticker" aria-hidden="true"><div class="tk">${tk}${tk}</div></div></section>
${chapters}
<section class="ledger"><div class="wrap" data-reveal><span class="eyebrow">${K.story.eyebrow}</span><p class="quote">${K.story.lead}</p><div class="led">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></section>
${donate(pack)}
<section class="way"><div class="wrap"><div style="margin-bottom:2rem" data-reveal><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:.8rem">${K.process[1]}</h2></div><div class="ways">${K.process[2].map(([h, p], i) => `<div class="wy" data-reveal><span class="n">${pad(i + 1)}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats, first = cats[0].items[0], fart = first.art || cats[0].art;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const grp = cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><h2>${c.name}</h2>${c.items.map((i) => `<div class="ar" data-ar="${i.n}" tabindex="0"><span class="th">${img(i.art || c.art, i.n, { w: 240, h: 240, hint: B.hintOf(pack, i) })}</span><div><h3>${i.n}</h3><p>${i.d}</p></div><span class="m">${i.meta}</span></div>`).join("")}</section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1>${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap"><div class="idx"><div class="col">${grp}</div><aside class="pvw" data-pv aria-hidden="true"><div class="box">${img(fart, first.n, { role: "featured", w: 900, h: 1120, hint: B.hintOf(pack, first), lazy: false })}</div><div class="cap" data-pv-cap>${first.n}</div></aside></div></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/sanctuary")) {
  return { name: "stories", themeColor: "#0E3A33", fonts: FONTS, media: B.mediaFor(pack, "stories", "atelier", "atelier"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.stories || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
