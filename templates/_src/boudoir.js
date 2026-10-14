"use strict";
/**
 * boudoir (premium plus, built for beauty and tanning salons): editorial luxe on ivory. A huge italic serif headline with a framed
 * portrait, a before-and-after slider you drag (or move with the keyboard), a price menu with dotted leaders like a printed
 * treatment card, a quote-style story and numbered steps. The second page is the full price card by category.
 * Two pages: Home and Treatments. Fonts: Crimson Pro + Instrument Sans (SIL OFL). Pictures from the "atelier" set. No hero loop.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"],
  ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/CrimsonPro-Italic.ttf"];

const CSS = `
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#FBF6EF;--surface:#FFFFFF;--ink:#2A1A20;--muted:#6E5A60;--line:rgba(42,26,32,.18);--accent:#9C3558;--onaccent:#FFFFFF;--c1:#9C3558;--c2:#E9B8C6;--c3:#C99A3B;--rad:6px;--display:"Crimson Pro",Georgia,serif;--sans:"Instrument Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-weight:400}h1{font-size:clamp(3.4rem,9.4vw,8.6rem);line-height:.9;letter-spacing:-.02em}h1 em,h2 em{font-style:italic;color:var(--accent)}h2{font-size:clamp(2.4rem,5.6vw,4.6rem);line-height:.98;letter-spacing:-.01em}h3{font-family:var(--sans);font-weight:700;font-size:1.05rem}
.lead{font-size:clamp(1.15rem,1.6vw,1.4rem);color:var(--muted);max-width:30em}.eyebrow{font-family:var(--sans);color:var(--accent)}
.site-header.is-stuck,.mpanel{background:rgba(251,246,239,.92)}
.hero{padding:clamp(110px,14vw,170px) 0 clamp(40px,6vw,80px)}.hero .wrap{display:grid;grid-template-columns:1.25fr .75fr;gap:clamp(24px,5vw,80px);align-items:end}.hero h1{margin:1rem 0 1.4rem}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.8rem}
.hero .fr{position:relative;padding:12px;background:var(--surface);box-shadow:0 30px 60px -30px rgba(80,20,50,.35)}.hero .fr .ph{aspect-ratio:4/5;overflow:hidden;background:#F5E6EA}.hero .fr img{width:100%;height:100%;object-fit:cover}.hero .fr .cap{display:flex;justify-content:space-between;gap:1rem;padding:.8rem .2rem 0;font:italic 1.05rem var(--display)}.hero .fr .cap span{font:700 .78rem var(--sans);letter-spacing:.06em;color:var(--accent);align-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.rule{height:1px;background:var(--line);border:0;margin:0}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,48px)}
/* before and after */
.ba{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(24px,5vw,80px);align-items:center}.ba .cmp{position:relative;aspect-ratio:4/5;overflow:hidden;background:#F5E6EA;--p:50%;touch-action:pan-y;box-shadow:0 30px 60px -30px rgba(80,20,50,.35)}
.cmp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cmp .bf{clip-path:inset(0 calc(100% - var(--p)) 0 0);filter:grayscale(.85) brightness(.9) contrast(.9)}
.cmp .lb{position:absolute;top:14px;font:700 .68rem var(--sans);letter-spacing:.12em;text-transform:uppercase;background:rgba(255,255,255,.92);color:var(--ink);padding:.5em .8em;z-index:3}.cmp .lb.l{left:14px}.cmp .lb.r{right:14px}
.cmp .hd{position:absolute;top:0;bottom:0;left:var(--p);width:2px;background:#fff;z-index:3;pointer-events:none;transform:translateX(-1px)}.cmp .hd::after{content:"\\2194";position:absolute;top:50%;left:50%;width:46px;height:46px;border-radius:50%;background:#fff;color:var(--accent);display:grid;place-items:center;font-size:1.2rem;transform:translate(-50%,-50%);box-shadow:0 6px 20px rgba(0,0,0,.25)}
.cmp input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;z-index:4;margin:0}.cmp input:focus-visible+.hd::after{outline:3px solid var(--accent);outline-offset:2px}
.ba p{color:var(--muted)}.ba .pts{display:grid;gap:.7rem;margin:1.4rem 0 1.8rem;padding:0;list-style:none}.ba .pts li{display:flex;gap:.8rem;align-items:baseline;border-top:1px solid var(--line);padding-top:.7rem}.ba .pts b{font:italic 1.5rem var(--display);color:var(--accent)}
@media(max-width:820px){.ba{grid-template-columns:1fr}}
/* price card */
.card{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(26px,5vw,80px)}.card section{break-inside:avoid}.card h3.ct{font:italic 2rem var(--display);color:var(--accent);margin:0 0 .2rem}.card .cb{color:var(--muted);font-size:.95rem;margin:0 0 1rem}
.pl{list-style:none;margin:0;padding:0;display:grid;gap:1.1rem}.pl li .r{display:flex;align-items:baseline;gap:.5rem}.pl .r b{font:400 1.45rem/1.1 var(--display)}.pl .r i{flex:1;border-bottom:1.5px dotted var(--line);min-width:16px;transform:translateY(-4px)}.pl .r span{font:700 .86rem var(--sans);color:var(--accent);white-space:nowrap}.pl p{margin:.15rem 0 0;color:var(--muted);font-size:.95rem}
@media(max-width:760px){.card{grid-template-columns:1fr}}
/* favourites */
.fv{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,2.4vw,34px)}.fc{background:var(--surface);padding:12px;--rad:8px;transition:transform .5s var(--ease)}.fc:hover{transform:translateY(-6px)}.fc .ph{aspect-ratio:1;overflow:hidden;background:#F5E6EA}.fc img{width:100%;height:100%;object-fit:cover}.fc .tx{padding:1rem .4rem .5rem}.fc h3{font:400 1.7rem/1.1 var(--display);display:flex;justify-content:space-between;gap:.6rem;align-items:baseline}.fc h3 span{font:700 .8rem var(--sans);color:var(--accent);text-align:right}.fc p{margin:.4rem 0 0;color:var(--muted)}
@media(max-width:860px){.fv{grid-template-columns:1fr}}
/* numbers + story */
.nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.nums div{padding:clamp(22px,3vw,40px) .4rem;text-align:center}.nums div+div{border-left:1px solid var(--line)}.nums b{display:block;font:italic clamp(1.9rem,7vw,5.6rem)/1 var(--display);color:var(--accent)}.nums span{font:700 .74rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.qt{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(24px,6vw,90px);align-items:center}.qt .ph{aspect-ratio:4/5;overflow:hidden;background:#F5E6EA;box-shadow:0 30px 60px -30px rgba(80,20,50,.35)}.qt img{width:100%;height:100%;object-fit:cover}.qt h2{margin:1rem 0 1.2rem}.qt .lead{font-style:italic;font-size:clamp(1.3rem,2.2vw,1.8rem);line-height:1.35}@media(max-width:820px){.qt{grid-template-columns:1fr}.qt .ph{aspect-ratio:16/11}}
.stp{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,48px)}.st{border-top:1px solid var(--ink);padding-top:1rem}.st .n{font:italic 3.4rem/1 var(--display);color:var(--accent)}.st h3{margin:.4rem 0 .3rem}.st p{margin:0;color:var(--muted)}@media(max-width:760px){.stp{grid-template-columns:1fr}}
.mh{padding:clamp(120px,14vw,180px) 0 clamp(24px,4vw,50px)}.mh h1{margin:1rem 0}
.order{--rad:4px;border:1px solid var(--line)}
`;

const JS = `
(function () {
  document.querySelectorAll(".cmp").forEach(function (c) {
    var r = c.querySelector("input");
    function set() { c.style.setProperty("--p", r.value + "%"); }
    r.addEventListener("input", set); set();
  });
})();
`;

const lines = (c) => c.items.map((i) => `<li><div class="r"><b>${i.n}</b><i></i><span>${K.strip(i.meta)}</span></div><p>${i.d}</p></li>`).join("");

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack), star = all.filter((i) => i.star).slice(0, 3), lead = star[0] || all[0], two = star[1] || lead;
  const fav = star.map((i) => `<article class="fc live" data-reveal><div class="ph">${img(i.art, i.n, { w: 700, h: 700, hint: B.hintOf(pack, i) })}</div><div class="tx"><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p></div></article>`).join("");
  const card = pack.cats.map((c) => `<section data-reveal><h3 class="ct">${c.name}</h3><p class="cb">${c.blurb}</p><ul class="pl">${lines(c)}</ul></section>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div></div>
<div class="fr live"><div class="ph shine">${img(lead.art, lead.n, { role: "featured", w: 900, h: 1100, hint: B.hintOf(pack, lead), lazy: false })}</div><div class="cap"><em>${lead.n}</em><span>${K.strip(lead.meta)}</span></div></div></div></section>
<hr class="rule">
<section class="sec"><div class="wrap"><div class="ba"><div class="cmp" data-reveal><div class="ph">${img(two.art, two.n + " after", { w: 900, h: 1100, hint: B.hintOf(pack, two) + ", glowing result" })}</div>${img(two.art, two.n + " before", { w: 900, h: 1100, hint: B.hintOf(pack, two) + ", before the treatment" }).replace("<img", '<img class="bf"')}<span class="lb l">Before</span><span class="lb r">After</span><input type="range" min="4" max="96" value="50" aria-label="Drag to compare before and after"><span class="hd"></span></div>
<div data-reveal><span class="eyebrow">Before and after</span><h2 style="margin:.8rem 0 1rem">Results you can <em>see</em></h2><p class="lead">${t("tagline")}</p><ul class="pts">${X.promise.map(([h, p], i) => `<li><b>${K.pad(i + 1)}</b><span><strong>${h}.</strong> ${p}</span></li>`).join("")}</ul><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="card">${card}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.fav[0]}</span><h2 style="margin-top:.8rem">${X.fav[1]}</h2></div></div><div class="fv">${fav}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nums" data-reveal>${X.stats.map(([v, s, l]) => `<div><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="qt"><div class="ph live" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 1100, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.process[0]}</span><h2 style="margin-top:.8rem">${X.process[1]}</h2></div></div><div class="stp">${X.process[2].map(([h, p], i) => `<div class="st" data-reveal data-delay="${i * 100}"><span class="n">${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}" style="padding:clamp(24px,4vw,44px) 0;border-top:1px solid var(--line)"><div class="card"><div><h3 class="ct">${c.name}</h3><p class="cb">${c.blurb}</p><div class="ph shine" style="aspect-ratio:4/3;overflow:hidden;background:#F5E6EA">${img(c.art, c.name, { w: 700, h: 520, hint: B.hintOf(pack, c) })}</div></div><ul class="pl">${lines(c)}</ul></div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/beauty")) {
  return { name: "boudoir", themeColor: "#FBF6EF", fonts: FONTS, media: B.mediaFor(pack, "boudoir", "atelier", "atelier").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.boudoir || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
