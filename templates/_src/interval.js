"use strict";
/**
 * interval (premium plus, built for gyms and fitness studios): the hero is a working interval timer. Black and acid lime, giant
 * condensed numerals. A ring counts 40 seconds of work then 20 of rest through six moves (runs by itself, one tap to pause, and
 * it stays still for visitors who prefer reduced motion). Below: classes as numbered rounds that flood with lime on hover, a
 * week-at-a-glance bar chart drawn from the sample timetable, big counters and the enquiry block. Second page: every class as a
 * big round card. Two pages: Home and Classes. Fonts: Smooch Sans + Instrument Sans (SIL OFL). Pictures from the "gallery" set.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["SmoochSans-Medium.ttf", "SmoochSans-Medium.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["SmoochSans-OFL.txt", "OFL-SmoochSans.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/SmoochSans-Medium.ttf"];
const MOVES = ["Squat", "Push-up", "Row", "Lunge", "Burpee", "Plank"];

const CSS = `
@font-face{font-family:"Smooch Sans";src:url(fonts/SmoochSans-Medium.ttf) format("truetype");font-weight:500;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#08090A;--surface:#14171A;--ink:#F5F6F2;--muted:#A9AEA6;--line:rgba(255,255,255,.14);--accent:#D7FF3A;--onaccent:#0A0B08;--c1:#D7FF3A;--c2:#3AF0C5;--c3:#FFFFFF;--rad:6px;--display:"Smooch Sans","Arial Narrow",Impact,sans-serif;--sans:"Instrument Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-family:var(--display);font-weight:500;text-transform:uppercase;letter-spacing:.01em}h1{font-size:clamp(4rem,12vw,10.5rem);line-height:.82}h2{font-size:clamp(3rem,7.4vw,6.4rem);line-height:.88}h3{font-size:1.9rem;line-height:1}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--accent)}
.site-header.is-stuck,.mpanel{background:rgba(8,9,10,.9)}.mpanel a{color:var(--ink);border-bottom-color:var(--line)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.btn-primary,.site-header .btn-primary{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.btn-primary span{color:var(--onaccent)}.btn-primary:hover{background:#fff;border-color:#fff}.btn:not(.btn-primary){color:var(--ink);border-color:var(--line)}
.hero{padding:clamp(100px,12vw,150px) 0 clamp(30px,5vw,70px)}.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(24px,5vw,80px);align-items:center}.hero h1{margin:1rem 0 1.4rem}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}}
/* timer */
.tm{position:relative;display:grid;place-items:center;aspect-ratio:1;max-width:520px;width:100%;justify-self:center;--rad:50%;border-radius:50%;background:radial-gradient(circle,#1B1F14 0%,#0C0E09 70%)}.tm svg{position:absolute;inset:6%;width:88%;height:88%;transform:rotate(-90deg)}.tm circle{fill:none;stroke-width:5}.tm .bg{stroke:rgba(255,255,255,.1)}.tm .fg{stroke:var(--accent);stroke-linecap:round;stroke-dasharray:628;stroke-dashoffset:0;filter:drop-shadow(0 0 8px rgba(215,255,58,.55));transition:stroke .3s}.tm.rest .fg{stroke:var(--c2);filter:drop-shadow(0 0 8px rgba(58,240,197,.55))}
.tm .in{position:relative;display:grid;gap:.2rem;text-align:center;justify-items:center}.tm .ph2{font:700 .78rem var(--sans);letter-spacing:.22em;text-transform:uppercase;color:var(--accent)}.tm.rest .ph2{color:var(--c2)}.tm .sec2{font:500 clamp(6rem,17vw,11rem)/.8 var(--display)}.tm .mv{font:500 clamp(1.6rem,3vw,2.4rem)/1 var(--display);text-transform:uppercase;letter-spacing:.04em}.tm .rd{font:700 .74rem var(--sans);letter-spacing:.14em;color:var(--muted);text-transform:uppercase}.tm button{margin-top:.8rem;font:700 .84rem var(--sans);padding:.7em 1.4em;border-radius:99px;border:1.5px solid var(--line);background:rgba(255,255,255,.06);color:var(--ink);cursor:pointer}.tm button:hover{border-color:var(--accent)}
.mvl{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;margin-top:1rem;max-width:520px;justify-self:center}.mvl span{font:700 .72rem var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.5em .8em;border-radius:99px;border:1px solid var(--line);color:var(--muted);transition:.3s}.mvl span.on{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
/* rounds */
.rd{border-top:1px solid var(--line)}.rn,.rn:hover{text-decoration:none}.rn{position:relative;display:grid;grid-template-columns:clamp(70px,12vw,170px) 1fr minmax(120px,240px);gap:clamp(12px,3vw,48px);align-items:center;padding:clamp(18px,2.6vw,32px) 0;border-bottom:1px solid var(--line);overflow:hidden;color:var(--ink);transition:color .35s,padding .35s}.rn::before{content:"";position:absolute;inset:0;background:var(--accent);transform:translateY(101%);transition:transform .5s var(--ease);z-index:0}.rn:hover::before{transform:none}.rn:hover{color:var(--onaccent);padding-inline:1.2rem}.rn>*{position:relative;z-index:1}
.rn .no{font:500 clamp(3.4rem,9vw,8rem)/.8 var(--display);color:var(--accent);transition:color .35s}.rn:hover .no{color:var(--onaccent)}.rn h3{font-size:clamp(2.2rem,4.6vw,4rem)}.rn p{margin:.3rem 0 0;color:var(--muted);transition:color .35s}.rn:hover p{color:rgba(10,11,8,.75)}.rn .ph{aspect-ratio:4/3;border-radius:6px;overflow:hidden;background:#222}.rn .ph img{width:100%;height:100%;object-fit:cover}
@media(max-width:700px){.rn{grid-template-columns:3.2rem 1fr}.rn .ph{grid-column:1/-1;aspect-ratio:16/8}.rn .no{font-size:3.4rem}}
/* week chart */
.wk{display:grid;grid-template-columns:repeat(7,1fr);gap:clamp(6px,1.4vw,18px);align-items:end;height:clamp(180px,26vw,300px)}.wk div{display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:.5rem;height:100%}.wk i{display:block;flex:none;width:100%;height:calc(var(--h) * .7);background:var(--accent);border-radius:4px 4px 0 0;transform-origin:bottom;transform:scaleY(0);transition:transform 1s var(--ease)}.wk.in i{transform:none}.wk b{font:500 1.5rem/1 var(--display)}.wk span{font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,2vw,22px)}.nm div{border-top:3px solid var(--accent);padding-top:1rem}.nm b{display:block;font:500 clamp(3.4rem,12vw,10rem)/.82 var(--display)}.nm span{font:700 .78rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0;font-size:clamp(3.6rem,11vw,9rem)}
.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,1.8vw,22px)}.tc{display:grid;grid-template-columns:100px 1fr;gap:1.1rem;padding:14px;background:var(--surface);border:1px solid var(--line);border-radius:8px;transition:border-color .3s}.tc:hover{border-color:var(--accent)}.tc .n{font:500 4.4rem/.8 var(--display);color:var(--accent)}.tc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline;flex-wrap:wrap}.tc h3 span{font:700 .8rem var(--sans);color:var(--accent)}.tc p{margin:.4rem 0 .7rem;color:var(--muted);font-size:.95rem}.tc .ft{display:flex;gap:.4rem;flex-wrap:wrap}.tg{font:700 .62rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;border:1px solid var(--line)}.tg.star{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}
.grp{padding-top:clamp(22px,3.4vw,40px)}.gh{margin-bottom:1rem}.gh h2{font-size:clamp(2.6rem,5.6vw,4.6rem)}.gh p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.cg{grid-template-columns:1fr}.tc{grid-template-columns:72px 1fr}.tc .n{font-size:3.4rem}}
.order{--rad:8px}
`;

const JS = `
(function () {
  var tm = document.querySelector("[data-timer]"); if (!tm) return;
  var W = 40, R = 20, moves = JSON.parse(tm.getAttribute("data-moves")), fg = tm.querySelector(".fg"), sec = tm.querySelector(".sec2"), mv = tm.querySelector(".mv"), ph = tm.querySelector(".ph2"), rd = tm.querySelector(".rd"), btn = tm.querySelector("button"), chips = [].slice.call(document.querySelectorAll(".mvl span"));
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches, run = !reduce, t0 = 0, left = W, work = true, idx = 0, last = Date.now();
  function paint() {
    var tot = work ? W : R; fg.style.strokeDashoffset = String(628 * (1 - left / tot));
    sec.textContent = Math.ceil(left); ph.textContent = work ? "Work" : "Rest"; tm.classList.toggle("rest", !work);
    var m = work ? moves[idx] : "Next: " + moves[(idx + 1) % moves.length]; mv.textContent = m; rd.textContent = "Move " + (idx + 1) + " of " + moves.length;
    chips.forEach(function (c, k) { c.classList.toggle("on", k === idx); }); btn.textContent = run ? "Pause" : "Start";
  }
  setInterval(function () {
    var now = Date.now(), dt = (now - last) / 1000; last = now; if (!run) return;
    left -= dt; if (left <= 0) { if (work) { work = false; left = R; } else { work = true; left = W; idx = (idx + 1) % moves.length; } } paint();
  }, 100);
  btn.addEventListener("click", function () { run = !run; last = Date.now(); paint(); }); paint();
})();
`;

function timer() {
  return `<div><div class="tm live halo" data-timer data-moves='${JSON.stringify(MOVES)}' role="timer" aria-label="Interval timer demo: 40 seconds work, 20 seconds rest"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="bg" cx="110" cy="110" r="100"/><circle class="fg" cx="110" cy="110" r="100"/></svg><div class="in"><span class="ph2">Work</span><span class="sec2">40</span><span class="mv">${MOVES[0]}</span><span class="rd">Move 1 of 6</span><button type="button">Pause</button></div></div><div class="mvl" aria-hidden="true">${MOVES.map((m) => `<span>${m}</span>`).join("")}</div></div>`;
}

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack);
  let n = 0;
  const rounds = pack.cats.map((c) => `<a class="rn" href="menu.html#${c.id}" data-reveal><span class="no">${K.pad(++n)}</span><div><h3>${c.name}</h3><p>${c.blurb}</p></div><div class="ph">${img(c.art, c.name, { w: 480, h: 360, hint: B.hintOf(pack, c) })}</div></a>`).join("");
  const max = Math.max(...Object.values(pack.week).map((d) => d.length));
  const wk = Object.entries(pack.week).map(([d, list]) => `<div><b>${list.length}</b><i style="--h:${Math.round((list.length / max) * 100)}%"></i><span>${d}</span></div>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div></div>${timer()}</div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="rd">${rounds}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Your week</span><h2 style="margin-top:.8rem">Classes <em>per day</em></h2></div></div><div class="wk" data-reveal>${wk}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm">${X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  let n = 0;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cg">${c.items.map((i) => `<article class="tc" data-reveal><span class="n">${K.pad(++n)}</span><div><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><div class="ft">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/fitness")) {
  return { name: "interval", themeColor: "#08090A", fonts: FONTS, media: B.mediaFor(pack, "interval", "gallery", "gallery").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.interval || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
