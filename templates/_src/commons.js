"use strict";
/**
 * commons (premium plus, built for rescue and community sites): a bento noticeboard. The home page opens on a mosaic of tiles
 * (headline, film, today's hours, a live counter, donate) that rise in one after another, then a ticker, a wall of polaroid
 * photographs that straighten when touched, a map-and-hours block, events, ways to help and the enquiry form. The second page
 * shows each kind of animal as a swimlane: a row of polaroids you can drag or flick sideways.
 * Fonts: Bricolage Grotesque + Nothing You Could Do for photo captions (SIL OFL). Optional pack.community = { events, ways }.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Regular.ttf"], ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["NothingYouCouldDo-Regular.ttf", "NothingYouCouldDo-Regular.ttf"],
  ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["NothingYouCouldDo-OFL.txt", "OFL-NothingYouCouldDo.txt"],
];
const PRELOAD = ["assets/fonts/BricolageGrotesque-Bold.ttf"];

const CSS = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Hand";src:url(fonts/NothingYouCouldDo-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
:root{--ink:#17231F;--muted:#586660;--line:#D9DFD6;--bg:#EEF1EA;--card:#FFFFFF;--accent:#F2C230;--leaf:#2E6B4F;--sky:#CFE6EC;--display:"Bricolage Grotesque",system-ui,sans-serif;--sans:"Bricolage Grotesque",system-ui,sans-serif;--hand:"Hand","Segoe Script",cursive;--gut:clamp(16px,3.4vw,44px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1);--rad:26px}
${B.BASE_CSS}
body{background:var(--bg)}
h1,h2,h3{font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.7rem,6.6vw,6.2rem);line-height:.95}h2{font-size:clamp(2rem,4.2vw,3.6rem);line-height:1}h3{font-size:1.35rem;line-height:1.1;letter-spacing:-.02em}
mark{background:linear-gradient(transparent 58%,var(--accent) 58% 92%,transparent 92%);color:inherit;padding:0 .08em}h1 em,h2 em{font-style:normal}h1 em,h2 em{background:linear-gradient(transparent 58%,var(--accent) 58% 92%,transparent 92%)}
.lead{font-size:clamp(1.05rem,1.4vw,1.25rem);color:var(--muted);max-width:30em}
.site-header.is-stuck,.mpanel{background:rgba(238,241,234,.9)}.btn{border-radius:99px}.btn-primary{background:var(--ink);color:#fff;border-color:var(--ink)}.btn-primary:hover{background:var(--accent);border-color:var(--accent);color:var(--ink)}
.btn-y{background:var(--accent);border-color:var(--accent);color:var(--ink)}.btn-y:hover{background:var(--ink);border-color:var(--ink);color:#fff}.f input,.f textarea{border-radius:16px}
/* bento hero */
.hero{padding:clamp(92px,10vw,116px) 0 clamp(26px,3vw,40px)}.bento{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:minmax(92px,auto);gap:clamp(10px,1.4vw,18px)}
.tile{position:relative;border-radius:var(--rad);overflow:hidden;background:var(--card);padding:clamp(18px,2vw,28px);animation:rise .9s var(--ease) both;animation-delay:calc(var(--i,0)*90ms)}
@keyframes rise{from{opacity:0;transform:translateY(34px) scale(.97)}}
.t-h{grid-column:span 7;grid-row:span 4;display:flex;flex-direction:column;justify-content:space-between;gap:1.6rem;padding:clamp(24px,3.4vw,52px)}.t-h .lead{margin:0}.cta-row{display:flex;gap:.6rem;flex-wrap:wrap}
.t-v{grid-column:span 5;grid-row:span 4;padding:0;background:#0B1A14}.t-v video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.t-v .tag2{position:absolute;left:16px;bottom:16px;z-index:1;background:rgba(255,255,255,.92);color:var(--ink);border-radius:99px;padding:.55em 1em;font-size:.86rem;font-weight:700;display:flex;gap:.6rem;align-items:center}
.dot{width:9px;height:9px;border-radius:50%;background:#2FB36B;animation:ping 2.2s infinite;display:inline-block}@keyframes ping{70%{box-shadow:0 0 0 10px rgba(47,179,107,0)}100%{box-shadow:0 0 0 0 rgba(47,179,107,0)}}
.t-o{grid-column:span 3;grid-row:span 2;background:var(--sky);display:flex;flex-direction:column;justify-content:space-between}.t-o small,.t-n small{font:700 .72rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.t-o b{font-size:1.5rem;line-height:1.1;letter-spacing:-.02em}
.t-n{grid-column:span 3;grid-row:span 2;background:var(--ink);color:#fff;display:flex;flex-direction:column;justify-content:space-between}.t-n small{color:#B7C4BD}.t-n b{font-size:clamp(3rem,5vw,4.6rem);line-height:.9;letter-spacing:-.04em;color:var(--accent)}
.t-d{grid-column:span 3;grid-row:span 2;background:var(--accent);display:flex;flex-direction:column;justify-content:space-between}.t-d b{font-size:1.5rem;line-height:1.1;letter-spacing:-.02em}.t-d .btn{align-self:flex-start;background:var(--ink);color:#fff;border-color:var(--ink)}
.t-p{grid-column:span 3;grid-row:span 2;padding:0}.t-p img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}.t-p:hover img{transform:scale(1.07)}
@media(max-width:980px){.bento{grid-template-columns:repeat(6,1fr)}.t-h{grid-column:1/-1;grid-row:auto}.t-v{grid-column:1/-1;grid-row:auto;aspect-ratio:16/10}.t-o,.t-n,.t-d,.t-p{grid-column:span 3;grid-row:auto;min-height:180px}}
@media(max-width:520px){.t-o,.t-n,.t-d,.t-p{grid-column:span 6;min-height:150px}.t-p{aspect-ratio:16/10}}
/* ticker */
.band{overflow:hidden;white-space:nowrap;border-block:2px solid var(--ink);margin:clamp(30px,4vw,56px) 0;background:var(--accent)}.bt{display:inline-flex;animation:bt 30s linear infinite}.bt span{font:700 clamp(2rem,5vw,4rem)/1 var(--display);letter-spacing:-.03em;padding:.35em .6em;text-transform:uppercase}.bt span:nth-child(even){color:transparent;-webkit-text-stroke:1.5px var(--ink)}@keyframes bt{to{transform:translateX(-50%)}}
/* wall */
.sec{padding:clamp(48px,7vw,100px) 0}.shead{display:flex;justify-content:space-between;align-items:end;gap:1.5rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}.shead p{margin:.6rem 0 0;color:var(--muted);max-width:30em}
.wall{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(18px,2.4vw,34px) clamp(12px,1.6vw,22px);padding:.6rem 0}
.po{background:#fff;padding:12px 12px 0;border-radius:6px;box-shadow:0 14px 34px -14px rgba(23,35,31,.35);transform:rotate(var(--r,0deg));transition:transform .5s var(--ease),box-shadow .5s var(--ease);margin:0;position:relative}.po:hover{transform:rotate(0) translateY(-8px) scale(1.03);box-shadow:0 30px 50px -18px rgba(23,35,31,.45);z-index:2}
.po .ph{aspect-ratio:1;overflow:hidden;background:var(--bg)}.po img{width:100%;height:100%;object-fit:cover}.po figcaption{font:400 1.45rem/1 var(--hand);padding:1rem .2rem .9rem;display:flex;justify-content:space-between;align-items:baseline;gap:.5rem}.po figcaption span{font:400 .82rem/1 var(--sans);color:var(--muted)}
.po::before{content:"";position:absolute;left:50%;top:-12px;width:74px;height:24px;margin-left:-37px;background:rgba(242,194,48,.7);transform:rotate(-3deg)}
@media(max-width:980px){.wall{grid-template-columns:repeat(3,1fr)}}@media(max-width:700px){.wall{grid-template-columns:repeat(2,1fr)}.po figcaption span{display:none}}
/* visit */
.visit{display:grid;grid-template-columns:repeat(12,1fr);gap:clamp(10px,1.4vw,18px)}.v-map{grid-column:span 7;min-height:420px;padding:0;position:relative;background:#E3EBDD}.v-map>svg:first-child{position:absolute;inset:0;width:100%;height:100%}.v-map .pin{width:46px;height:60px;position:absolute;left:54%;top:42%;transform:translate(-50%,-100%);animation:drop 1.6s var(--ease) infinite}@keyframes drop{50%{transform:translate(-50%,-112%)}}
.v-map .addr{position:absolute;left:16px;bottom:16px;right:16px;background:#fff;border-radius:18px;padding:1rem 1.2rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;box-shadow:0 14px 30px -14px rgba(0,0,0,.35)}.v-map address{font-style:normal;font-weight:700}.v-map address span{display:block;font-weight:400;color:var(--muted)}
.v-h{grid-column:span 5;display:flex;flex-direction:column;gap:1rem}.v-h .hours{margin:0}
@media(max-width:900px){.visit{grid-template-columns:1fr}.v-map,.v-h{grid-column:auto}.v-map{min-height:360px}}
.hours tr.is-today th,.hours tr.is-today td{color:var(--ink);background:linear-gradient(transparent 62%,rgba(242,194,48,.6) 62%)}
/* events + ways */
.ev{display:grid;gap:.8rem}.evr{display:grid;grid-template-columns:88px 1fr auto;gap:1.2rem;align-items:center;background:#fff;border-radius:22px;padding:.9rem 1.2rem .9rem .9rem;transition:transform .4s var(--ease),box-shadow .4s}.evr:hover{transform:translateX(8px);box-shadow:0 18px 36px -22px rgba(23,35,31,.4)}
.evr .dt{background:var(--ink);color:#fff;border-radius:16px;text-align:center;padding:.6rem 0;line-height:1}.evr .dt b{display:block;font-size:2rem;letter-spacing:-.04em;color:var(--accent)}.evr .dt span{font:700 .7rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase}.evr h3{margin-bottom:.2rem}.evr p{margin:0;color:var(--muted)}
@media(max-width:620px){.evr{grid-template-columns:72px 1fr}.evr .btn{display:none}}
.ways{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(10px,1.4vw,18px)}.wc{background:#fff;border-radius:var(--rad);padding:1.5rem;display:flex;flex-direction:column;gap:.8rem;transition:transform .5s var(--ease),background .4s}.wc:hover{transform:translateY(-8px);background:var(--accent)}.wc .ic{width:50px;height:50px;border-radius:50%;background:var(--bg);display:grid;place-items:center;font-size:1.5rem}.wc p{margin:0;color:var(--muted);flex:1}.wc:hover p{color:var(--ink)}.wc a{font-weight:700;text-decoration:none;border-bottom:2px solid currentColor;width:fit-content}
@media(max-width:980px){.ways{grid-template-columns:1fr 1fr}}@media(max-width:520px){.ways{grid-template-columns:1fr}}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(24px,5vw,72px);background:#fff;border-radius:34px;padding:clamp(22px,4vw,56px)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{padding:56px 0 30px;margin-top:clamp(50px,7vw,90px);background:var(--ink);color:#E5EBE6;border-radius:34px 34px 0 0}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:clamp(1.8rem,3.4vw,2.6rem);margin-bottom:.6rem;font-weight:700;letter-spacing:-.03em}.foot p,.foot address{color:#A9B9B0;font-style:normal;margin:0}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:700 .72rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.15);color:#8FA298;font-size:.86rem}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* animals page: swimlanes */
.mhero{padding:clamp(110px,12vw,150px) 0 0}.mhero h1{font-size:clamp(2.6rem,6vw,5.4rem);margin:1rem 0 1rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0 0}.chips button{font:700 .9rem/1 var(--sans);padding:.85em 1.3em;border-radius:99px;border:2px solid var(--ink);background:transparent;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--ink);color:#fff}
.lane{padding:clamp(34px,5vw,64px) 0 0}.lane[hidden]{display:none}.lh{display:flex;align-items:end;justify-content:space-between;gap:1.4rem;margin-bottom:1.4rem;flex-wrap:wrap}.lh p{margin:.5rem 0 0;color:var(--muted);max-width:28em}.arrows{display:flex;gap:.5rem}.arrows button{width:48px;height:48px;border-radius:50%;border:2px solid var(--ink);background:transparent;cursor:pointer;font-size:1.2rem;transition:.25s}.arrows button:hover{background:var(--ink);color:#fff}
.railbox{overflow:hidden}.rail{display:flex;gap:clamp(16px,2vw,28px);overflow-x:auto;scroll-snap-type:x mandatory;padding:18px var(--pad,var(--gut)) 26px;--pad:max(var(--gut),calc((100vw - var(--max))/2 + var(--gut)));scroll-padding-left:var(--pad);scrollbar-width:none;cursor:grab}.rail::-webkit-scrollbar{display:none}.rail.drag{cursor:grabbing;scroll-snap-type:none}
.rail .po{flex:0 0 min(74vw,300px);scroll-snap-align:start;--r:-1.5deg}.rail .po:nth-child(even){--r:2deg}.rail .po p{margin:0;padding:0 .3rem 1rem;font-size:.9rem;color:var(--muted)}.rail .po .tg{display:inline-block;margin:.2rem .3rem .9rem 0;font:700 .66rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.4em .7em;border-radius:99px;background:var(--bg)}.rail .po .tg.star{background:var(--accent)}
`;

const JS = `(function () {
  var d = document, reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Array.prototype.slice.call(d.querySelectorAll("[data-lane]")).forEach(function (b) {
    b.addEventListener("click", function () { var rail = b.closest(".lane").querySelector(".rail"); rail.scrollBy({ left: Number(b.getAttribute("data-lane")) * Math.max(280, rail.clientWidth * 0.7), behavior: reduce ? "auto" : "smooth" }); });
  });
})();`;
const pad = (n) => String(n).padStart(2, "0");
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;
const all = (pack) => pack.cats.flatMap((c) => c.items.map((i) => ({ ...i, art: i.art || c.art })));
const rot = [-3, 2.5, -1.5, 3, -2.5, 1.5, -3.5, 2];
const ICON = { 0: "&#x1F43E;", 1: "&#x1F3E0;", 2: "&#x1F49B;", 3: "&#x1F381;" };

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-bottom:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

/** A drawn neighbourhood: park, river, lanes and a pin. It is a picture, not live data; the button below opens the real map. */
const MAP = `<svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map showing where to find us" focusable="false"><rect width="800" height="520" fill="#E3EBDD"/>
<path d="M-20 380 C150 330 260 430 420 380 S690 300 830 350 V560 H-20Z" fill="#CFE6EC"/><path d="M-20 400 C150 350 260 450 420 400 S690 320 830 370" fill="none" stroke="#B9D8E1" stroke-width="10"/>
<ellipse cx="170" cy="150" rx="150" ry="95" fill="#CBE0BE"/><ellipse cx="660" cy="130" rx="110" ry="70" fill="#D4E6C6"/>
<g fill="none" stroke="#fff" stroke-linecap="round"><path d="M-10 250 H810" stroke-width="22"/><path d="M430 -10 V330" stroke-width="22"/><path d="M0 120 C200 160 300 60 560 90 S760 190 820 170" stroke-width="12"/><path d="M120 -10 L210 250" stroke-width="12"/><path d="M640 250 L700 520" stroke-width="12"/></g>
<g fill="none" stroke="#D6DCCF" stroke-width="2"><path d="M-10 250 H810"/><path d="M430 -10 V330"/></g></svg>`;
const PIN = `<svg class="pin" width="46" height="60" viewBox="0 0 46 60" aria-hidden="true"><path d="M23 0C10 0 0 10 0 23c0 17 23 37 23 37s23-20 23-37C46 10 36 0 23 0z" fill="#17231F"/><circle cx="23" cy="23" r="9" fill="#F2C230"/></svg>`;

function home(pack) {
  const K = pack.copy.atelier, C = pack.community || {}, animals = all(pack);
  const pics = animals.filter((i) => i.star).concat(animals.filter((i) => !i.star)).slice(0, 8);
  const photos = [animals.find((i) => i.art === "cat") || animals[1], animals.find((i) => i.art === "rabbit") || animals[2]];
  const wall = pics.map((i, k) => `<figure class="po" style="--r:${rot[k]}deg" data-reveal data-delay="${(k % 4) * 80}"><div class="ph">${img(i.art, i.n, { w: 640, h: 640, hint: B.hintOf(pack, i) })}</div><figcaption>${i.n}<span>${i.meta.split("&middot;")[0].trim()}</span></figcaption></figure>`).join("");
  const word = ["Adopt", "Volunteer", "Donate", "Visit", "Foster", "Sponsor"], bt = word.map((w) => `<span>${w}</span>`).join("");
  const events = (C.events || []).map(([d, m, h, p]) => `<div class="evr"><div class="dt"><b>${d}</b><span>${m}</span></div><div><h3>${h}</h3><p>${p}</p></div><a class="btn" href="#order"><span>Tell us you're coming</span></a></div>`).join("");
  const ways = (C.ways || []).map(([h, p, a, href], k) => `<article class="wc" data-reveal data-delay="${k * 80}"><span class="ic" aria-hidden="true">${ICON[k % 4]}</span><h3>${h}</h3><p>${p}</p><a href="${href || "#order"}">${a}</a></article>`).join("");
  const body = `
<section class="hero"><div class="wrap"><div class="bento">
<div class="tile t-h" style="--i:0"><div><span class="eyebrow">${K.heroEyebrow}</span><h1 style="margin-top:1rem">${K.heroH1}</h1></div><div><p class="lead" style="margin-bottom:1.4rem">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div></div></div>
<div class="tile t-v" style="--i:1">${video("commons")}<span class="tag2"><i class="dot"></i>${K.glass[0]}</span></div>
<div class="tile t-o" style="--i:2"><small>${K.glass[1]}</small><b>${K.glass[2]}</b></div>
<div class="tile t-n" style="--i:3"><small>${K.stats[2][2]}</small>${stat(K.stats[2])}</div>
<div class="tile t-d" style="--i:4"><b>${K.cta2} and help us keep the lights on.</b><a class="btn" href="${K.cta2Href || "#order"}"><span>${K.cta2}</span></a></div>
<div class="tile t-p" style="--i:5">${img(photos[0].art, photos[0].n, { role: "featured", w: 700, h: 700, hint: B.hintOf(pack, photos[0]) })}</div>
</div></div></section>
<div class="band" aria-hidden="true"><div class="bt">${bt}${bt}${bt}${bt}</div></div>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="shead" data-reveal><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:.8rem">${K.fav[1]}</h2></div><a class="btn btn-primary" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="wall">${wall}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="shead" data-reveal><div><span class="eyebrow">${C.visitEyebrow || K.process[0]}</span><h2 style="margin-top:.8rem">${C.visitH2 || K.process[1]}</h2></div></div>
<div class="visit"><div class="tile v-map" data-reveal>${MAP}${PIN}<div class="addr"><address>${t("business_name")}<span>${t("address_line1")}, ${t("address_line2")}</span></address><a class="btn btn-y" href="${t("maps_url")}" rel="noopener"><span>Get directions</span></a></div></div>
<div class="tile v-h" data-reveal data-delay="100"><span class="eyebrow">${pack.order.eyebrow}</span>${B.C.hoursRows()}<p style="margin:0;color:var(--muted)">${K.glass[2]}</p><a class="btn btn-primary" href="#order" style="align-self:flex-start"><span>${K.cta1}</span></a></div></div></div></section>
${events ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="shead" data-reveal><div><span class="eyebrow">${C.eventsEyebrow || "Coming up"}</span><h2 style="margin-top:.8rem">${C.eventsH2 || "What is on"}</h2></div></div><div class="ev" data-reveal>${events}</div></div></section>` : ""}
${ways ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="shead" data-reveal><div><span class="eyebrow">${C.waysEyebrow || "Get involved"}</span><h2 style="margin-top:.8rem">${C.waysH2 || "Ways to help"}</h2></div></div><div class="ways">${ways}</div></div></section>` : ""}
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const lanes = cats.map((c) => `<section class="lane" id="${c.id}" data-cat="${c.id}"><div class="wrap"><div class="lh"><div><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="arrows"><button type="button" data-lane="-1" aria-label="Previous">&larr;</button><button type="button" data-lane="1" aria-label="Next">&rarr;</button></div></div></div>
<div class="railbox"><div class="rail" data-rail tabindex="0" aria-label="${c.name}">${c.items.map((i, k) => `<figure class="po"><div class="ph">${img(i.art || c.art, i.n, { w: 640, h: 640, hint: B.hintOf(pack, i) })}</div><figcaption>${i.n}<span>${i.meta.split("&middot;")[0].trim()}</span></figcaption><p>${i.d}</p>${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</figure>`).join("")}</div></div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1>${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
${lanes}<div style="height:clamp(10px,3vw,40px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/sanctuary")) {
  return { name: "commons", themeColor: "#EEF1EA", fonts: FONTS, media: B.mediaFor(pack, "commons", "gallery", "gallery"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.commons || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
