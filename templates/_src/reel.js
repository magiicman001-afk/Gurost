"use strict";
/**
 * reel (premium plus, built for beauty and tanning salons): social-story feel. A tall story card with progress bars at the top
 * plays through the favourite treatments (auto-advance, tap the left or right half to go back or forward, holds while you hover
 * or press); beside it a loud headline. Below, a swipe rail of reels per category, big black-and-coral type, ring-lit cards.
 * The second page is a grid of every treatment as tall cards. Two pages: Home and Treatments.
 * Fonts: Gloock + Outfit (SIL OFL). Pictures from the "gallery" set. No hero loop: the story is the motion.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"],
  ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"],
];
const PRELOAD = ["assets/fonts/Gloock-Regular.ttf"];

const CSS = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#0E0B0A;--surface:#1A1514;--ink:#FFF6EE;--muted:#C9B8AE;--line:rgba(255,255,255,.16);--accent:#FF7A59;--onaccent:#1A0A05;--c1:#FF7A59;--c2:#FFC857;--c3:#FF4F8B;--rad:30px;--display:"Gloock",Georgia,serif;--sans:"Outfit",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1280px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-weight:400}h1{font-size:clamp(3.4rem,9.6vw,8.6rem);line-height:.9;letter-spacing:-.025em}h2{font-size:clamp(2.3rem,5.6vw,4.6rem);line-height:.98;letter-spacing:-.015em}h3{font-family:var(--sans);font-weight:700;font-size:1.1rem}
h1 em,h2 em{font-style:normal;background:linear-gradient(95deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--c2)}
.site-header.is-stuck,.mpanel{background:rgba(14,11,10,.88)}.mpanel a{color:var(--ink);border-bottom-color:var(--line)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.btn-primary,.site-header .btn-primary{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.btn-primary span{color:var(--onaccent)}.btn-primary:hover{background:var(--c2);border-color:var(--c2)}
.hero{padding:clamp(100px,12vw,140px) 0 clamp(30px,5vw,70px)}.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(24px,5vw,80px);align-items:center}.hero h1{margin:1rem 0 1.3rem}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .btn:not(.btn-primary){color:var(--ink);border-color:var(--line)}
@media(max-width:860px){.hero .wrap{grid-template-columns:1fr}}
/* story card */
.sto{position:relative;width:min(100%,400px);aspect-ratio:9/15;justify-self:center;--rad:34px;background:var(--surface);cursor:pointer;user-select:none;-webkit-user-select:none}.sto .ct{position:absolute;inset:0;border-radius:34px;overflow:hidden}
.sto .sl{position:absolute;inset:0;opacity:0;transition:opacity .5s var(--ease)}.sto .sl.on{opacity:1}.sto .sl .ph{position:absolute;inset:0;background:#2a2220}.sto .sl img{width:100%;height:100%;object-fit:cover}.sto .sl::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(14,11,10,.96) 0%,rgba(14,11,10,.75) 34%,transparent 62%),linear-gradient(to bottom,rgba(14,11,10,.7),transparent 26%)}
.sto .cap{position:absolute;left:0;right:0;bottom:0;padding:clamp(18px,3vw,28px);z-index:2;display:grid;gap:.5rem}.sto .cap small{font:700 .72rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--c2)}.sto .cap b{font:400 clamp(1.9rem,3.4vw,2.6rem)/1 var(--display)}.sto .cap p{margin:0;color:var(--muted);font-size:.95rem}.sto .cap .bk{text-decoration:none;justify-self:start;margin-top:.4rem;font:700 .9rem var(--sans);padding:.8em 1.3em;border-radius:99px;background:var(--accent);color:var(--onaccent)}
.sto .bars{position:absolute;top:14px;left:14px;right:14px;display:flex;gap:5px;z-index:4}.sto .bars i{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.3);overflow:hidden}.sto .bars i::after{content:"";display:block;height:100%;width:0;background:#fff}.sto .bars i.dn::after{width:100%}.sto .bars i.on::after{animation:fill var(--dur,5s) linear forwards}.sto.hold .bars i.on::after{animation-play-state:paused}@keyframes fill{to{width:100%}}
.sto .who{color:#fff;position:absolute;top:28px;left:18px;right:18px;display:flex;align-items:center;gap:.6rem;z-index:4;font:700 .86rem var(--sans)}.sto .who i{width:30px;height:30px;border-radius:50%;background:conic-gradient(var(--c1),var(--c2),var(--c3),var(--c1));display:grid;place-items:center;font:normal 0/0 sans-serif}.sto .who i::after{content:"";width:22px;height:22px;border-radius:50%;background:var(--bg);box-shadow:inset 0 0 0 5px rgba(255,255,255,.08)}
.sto .nv{position:absolute;top:60px;bottom:120px;width:40%;z-index:3;background:none;border:0;cursor:pointer}.sto .nv.p{left:0}.sto .nv.n{right:0}.sto .nv:focus-visible{outline:2px solid var(--c2)}
@media(prefers-reduced-motion:reduce){.sto .bars i.on::after{animation:none;width:100%}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
/* reels rail */
.rail{display:flex;gap:clamp(12px,1.6vw,20px);overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 0 18px;margin:0 calc(-1*var(--gut));padding-inline:var(--gut);scrollbar-width:thin;scrollbar-color:var(--c1) transparent}.rail::-webkit-scrollbar{height:6px}.rail::-webkit-scrollbar-thumb{background:var(--c1);border-radius:6px}
.rl{flex:0 0 min(72vw,280px);aspect-ratio:9/14;scroll-snap-align:start;position:relative;border-radius:26px;overflow:hidden;background:var(--surface);color:var(--ink);transition:transform .5s var(--ease)}.rl:hover{transform:translateY(-8px);text-decoration:none;color:var(--ink)}.rl .ph{position:absolute;inset:0}.rl img{width:100%;height:100%;object-fit:cover}.rl::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(14,11,10,.92),transparent 62%)}.rl .tx{position:absolute;left:0;right:0;bottom:0;padding:1.1rem;z-index:2}.rl small{font:700 .66rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--c2)}.rl b{display:block;font:400 1.5rem/1.05 var(--display);margin:.25rem 0}.rl span{font-size:.86rem;color:var(--muted)}
.cat{margin-bottom:clamp(24px,3.6vw,48px)}.cat>.row{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem}.cat h3{font:400 clamp(1.6rem,3vw,2.3rem)/1 var(--display)}.cat p{margin:0;color:var(--muted)}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px);text-align:center;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.nm div{padding:clamp(22px,3.4vw,44px) .4rem}.nm b{display:block;font:400 clamp(2rem,7vw,6rem)/1 var(--display);background:linear-gradient(95deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}.nm span{font:700 .72rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.sy{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(24px,6vw,90px);align-items:center}.sy .ph{aspect-ratio:3/4;border-radius:34px;overflow:hidden;background:#2a2220}.sy img{width:100%;height:100%;object-fit:cover}.sy h2{margin:1rem 0 1.2rem}@media(max-width:820px){.sy{grid-template-columns:1fr}.sy .ph{aspect-ratio:16/11}}
.stp{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,2vw,24px)}.st{background:var(--surface);border-radius:var(--rad);padding:1.6rem;border:1px solid var(--line)}.st .n{font:400 3.6rem/1 var(--display);background:linear-gradient(95deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}.st h3{margin:.6rem 0 .3rem}.st p{margin:0;color:var(--muted)}@media(max-width:760px){.stp{grid-template-columns:1fr}}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0}
.gr{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.6vw,20px);margin-bottom:clamp(30px,5vw,60px)}.gr .rl{flex:none;width:100%}.gh{margin:clamp(26px,4vw,48px) 0 1rem}.gh h2{font-size:clamp(2rem,4vw,3.2rem)}.gh p{margin:.3rem 0 0;color:var(--muted)}
.rl .pr{display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.4rem}.rl .tg{font:700 .6rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.4em .6em;border-radius:99px;border:1px solid var(--line);color:var(--ink)}.rl .tg.star{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}
.rl .d{display:none;margin:.3rem 0 0;font-size:.82rem;color:var(--muted)}.rl:hover .d,.rl:focus-visible .d{display:block}
@media(max-width:1000px){.gr{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.gr{grid-template-columns:repeat(2,1fr)}.rl .d{display:block;font-size:.72rem}}
.order{--rad:36px}
`;

const JS = `
(function () {
  var s = document.querySelector("[data-story]"); if (!s) return;
  var sl = [].slice.call(s.querySelectorAll(".sl")), bars = [].slice.call(s.querySelectorAll(".bars i")), cur = 0, tm = null, t0 = 0, left = 0, DUR = 5000;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go(n) {
    cur = (n + sl.length) % sl.length;
    sl.forEach(function (x, k) { x.classList.toggle("on", k === cur); x.setAttribute("aria-hidden", k === cur ? "false" : "true"); });
    bars.forEach(function (b, k) { b.classList.remove("on", "dn"); void b.offsetWidth; if (k < cur) b.classList.add("dn"); if (k === cur) b.classList.add("on"); });
    left = DUR; run();
  }
  function run() { clearTimeout(tm); if (reduce || s.classList.contains("hold")) return; t0 = Date.now(); tm = setTimeout(function () { go(cur + 1); }, left); }
  function hold(on) { if (on) { left -= Date.now() - t0; clearTimeout(tm); s.classList.add("hold"); } else { s.classList.remove("hold"); run(); } }
  s.querySelector(".nv.p").addEventListener("click", function () { go(cur - 1); });
  s.querySelector(".nv.n").addEventListener("click", function () { go(cur + 1); });
  s.addEventListener("mouseenter", function () { hold(true); }); s.addEventListener("mouseleave", function () { hold(false); });
  s.addEventListener("focusin", function () { hold(true); }); s.addEventListener("focusout", function () { hold(false); });
  go(0);
})();
`;

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack), star = all.filter((i) => i.star).slice(0, 5), lead = star[0] || all[0];
  const slides = star.map((i, k) => `<div class="sl${k === 0 ? " on" : ""}" aria-hidden="${k !== 0}"><div class="ph">${img(i.art, i.n, { role: k === 0 ? "featured" : "secondary", w: 800, h: 1300, hint: B.hintOf(pack, i), lazy: k > 0 })}</div><div class="cap"><small>${i.cname}</small><b>${i.n}</b><p>${i.d}</p><a class="bk" href="#order">Book &middot; ${K.strip(i.meta)}</a></div></div>`).join("");
  const reels = pack.cats.map((c) => `<div class="cat" data-reveal><div class="row"><h3>${c.name}</h3><p>${c.blurb}</p></div><div class="rail" tabindex="0" aria-label="${c.name}">${c.items.map((i) => `<a class="rl" href="menu.html#${c.id}"><div class="ph">${img(i.art || c.art, i.n, { w: 520, h: 800, hint: B.hintOf(pack, i) })}</div><div class="tx"><small>${c.name}</small><b>${i.n}</b><span>${K.strip(i.meta)}</span></div></a>`).join("")}</div></div>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div></div>
<div class="sto live halo" data-story role="region" aria-roledescription="carousel" aria-label="${X.fav[0]}"><div class="ct">${slides}<div class="bars" aria-hidden="true">${star.map(() => "<i></i>").join("")}</div><div class="who"><i></i>${t("business_name")}</div><button class="nv p" type="button" aria-label="Previous"></button><button class="nv n" type="button" aria-label="Next"></button></div></div></div></section>
<section class="sec" style="padding-top:clamp(20px,4vw,50px)"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" style="color:var(--ink);border-color:var(--line)" href="menu.html"><span>${X.collection[2]}</span></a></div>${reels}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm" data-reveal>${X.stats.map(([v, s, l]) => `<div><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sy"><div class="ph live" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 1100, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.process[0]}</span><h2 style="margin-top:.8rem">${X.process[1]}</h2></div></div><div class="stp">${X.process[2].map(([h, p], i) => `<div class="st" data-reveal data-delay="${i * 100}"><span class="n">${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="gr">${c.items.map((i) => `<a class="rl" href="index.html#order" data-reveal><div class="ph">${img(i.art || c.art, i.n, { w: 520, h: 800, hint: B.hintOf(pack, i) })}</div><div class="tx"><small>${c.name}</small><b>${i.n}</b><span>${K.strip(i.meta)}</span><p class="d">${i.d}</p><div class="pr">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></a>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/beauty")) {
  return { name: "reel", themeColor: "#0E0B0A", fonts: FONTS, media: B.mediaFor(pack, "reel", "gallery", "gallery").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.reel || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
