"use strict";
/**
 * aura (premium plus, built for beauty and tanning salons): midnight plum glass with live borders. Drifting colour glows behind
 * an elegant display headline, a glowing pill to book, a tabbed treatment menu (pick Hair, Nails, Face or Tanning and the picture
 * and price list swap), favourites in cards ringed by a circling colour border, ring counters and a glowing step line.
 * The second page lists every treatment in glass cards. Two pages: Home and Treatments.
 * Fonts: Italiana + Outfit (SIL OFL). Pictures from the "atelier" set. No hero loop: the glow is the motion.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["Italiana-Regular.ttf", "Italiana-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"],
  ["Italiana-OFL.txt", "OFL-Italiana.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"],
];
const PRELOAD = ["assets/fonts/Italiana-Regular.ttf"];

const CSS = `
@font-face{font-family:"Italiana";src:url(fonts/Italiana-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#150A16;--surface:rgba(255,255,255,.06);--ink:#F8EEF2;--muted:#C7B3C0;--line:rgba(255,255,255,.14);--accent:#F29AB9;--onaccent:#1B0B14;--c1:#F29AB9;--c2:#B79BFF;--c3:#FFD58F;--rad:26px;--display:"Italiana",Georgia,serif;--sans:"Outfit",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1280px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink);position:relative}
h1,h2,h3{font-weight:400;letter-spacing:.005em}h1{font-size:clamp(3.2rem,8.6vw,8rem);line-height:.95}h2{font-size:clamp(2.2rem,5vw,4.4rem);line-height:1}h3{font-family:var(--sans);font-weight:700;font-size:1.15rem;letter-spacing:0}
h1 em,h2 em{font-style:normal;background:linear-gradient(100deg,var(--c1),var(--c2) 55%,var(--c3));-webkit-background-clip:text;background-clip:text;color:transparent}.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}
.site-header.is-stuck,.mpanel{background:rgba(21,10,22,.86)}.mpanel a{color:var(--ink);border-bottom-color:var(--line)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.btn{border-color:var(--line);color:var(--ink)}.btn-primary{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.btn-primary:hover{background:#fff;border-color:#fff;color:var(--onaccent)}.f input,.f textarea{background:rgba(255,255,255,.07);color:#fff;border-color:var(--line)}.f label{color:var(--muted)}
.eyebrow{color:var(--muted)}.nav a{font-weight:400;letter-spacing:.06em;font-size:.9rem}
.orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}.orbs i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.5;animation:drift 22s ease-in-out infinite}.orbs i:nth-child(1){width:46vw;height:46vw;left:-12vw;top:-10vw;background:#8E2F6B}.orbs i:nth-child(2){width:40vw;height:40vw;right:-10vw;top:20vh;background:#5A3A9A;animation-delay:-7s}.orbs i:nth-child(3){width:34vw;height:34vw;left:30vw;bottom:-14vw;background:#B8505F;animation-delay:-13s}
@keyframes drift{50%{transform:translate(6vw,4vh) scale(1.12)}}
main,.foot{position:relative;z-index:1}
/* hero */
.hero{padding:clamp(110px,13vw,170px) 0 clamp(40px,6vw,80px)}.hero .wrap{display:grid;grid-template-columns:1.25fr 1fr;gap:clamp(24px,5vw,70px);align-items:center}.hero h1{margin:1rem 0 1.4rem}.hero .lead{margin:0 0 2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;align-items:center}
.pill{display:inline-flex;border-radius:99px;--rad:99px}.pill .btn{border:0;padding:1.15em 2em;position:relative;z-index:1}
.gl{padding:clamp(18px,2.4vw,28px);background:var(--surface);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.gl .ph{aspect-ratio:4/5;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.05)}.gl img{width:100%;height:100%;object-fit:cover}.gl .row{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1rem}.gl .row b{font:400 1.7rem/1 var(--display)}.gl .row span{font-size:.9rem;color:var(--muted)}
.open{display:inline-flex;align-items:center;gap:.6rem;margin-top:1.6rem;font-size:.95rem;color:var(--muted)}.open i{width:9px;height:9px;border-radius:50%;background:#58D68D;animation:ping 2.2s infinite}@keyframes ping{70%{box-shadow:0 0 0 10px rgba(88,214,141,0)}100%{box-shadow:0 0 0 0 rgba(88,214,141,0)}}
@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}.hero .gl{max-width:420px}}
/* marquee */
.mq{overflow:hidden;white-space:nowrap;border-block:1px solid var(--line);padding:1rem 0}.mq div{display:inline-flex;gap:2.6rem;animation:mq 34s linear infinite;font:400 clamp(1.6rem,3vw,2.4rem)/1 var(--display)}.mq span::after{content:"\\2726";margin-left:2.6rem;color:var(--accent);font-size:.9rem}@keyframes mq{to{transform:translateX(-50%)}}
/* tabs */
.sec{padding:clamp(56px,8vw,110px) 0}.sh{display:flex;justify-content:space-between;align-items:end;gap:1.5rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
.tabs{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.4fr);gap:clamp(18px,3vw,40px)}.tl{display:grid;gap:.7rem;align-content:start}
.tb{--rad:20px;text-align:left;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:1.2rem 1.3rem;border-radius:20px;cursor:pointer;font:inherit;transition:transform .4s var(--ease),background .3s;display:flex;justify-content:space-between;align-items:center;gap:1rem}.tb h3{font:400 clamp(1.6rem,2.6vw,2.2rem)/1 var(--display)}.tb small{color:var(--muted);display:block;margin-top:.3rem}.tb span.n{font:400 1rem/1 var(--sans);color:var(--accent)}
.tb[aria-selected=true]{transform:translateX(10px);background:rgba(255,255,255,.1)}.tb[aria-selected=true]::before{content:"";position:absolute;inset:-2px;border-radius:22px;padding:2px;background:conic-gradient(from var(--ang),var(--c1),var(--c2),var(--c3),var(--c1));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:ang 6s linear infinite}.tb{position:relative}
.tp{display:none;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(18px,3vw,36px);padding:clamp(18px,2.4vw,28px);background:var(--surface);border:1px solid var(--line);border-radius:var(--rad);animation:fade .6s var(--ease)}.tp.on{display:grid}@keyframes fade{from{opacity:0;transform:translateY(12px)}}
.tp .ph{aspect-ratio:4/5;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.05)}.tp img{width:100%;height:100%;object-fit:cover}.tp ul{list-style:none;margin:0;padding:0;display:grid;align-content:start}.tp li{padding:1rem 0;border-bottom:1px solid var(--line)}.tp li:first-child{padding-top:0}.tp li div{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.tp li b{font-size:1.15rem}.tp li span{font-size:.86rem;color:var(--accent);white-space:nowrap}.tp li p{margin:.3rem 0 0;color:var(--muted);font-size:.95rem}.tp .btn{margin-top:1.2rem;justify-self:start}
@media(max-width:900px){.tabs{grid-template-columns:1fr}.tl{grid-template-columns:1fr 1fr}.tb{padding:.9rem}.tb small{display:none}.tp.on{grid-template-columns:1fr}.tp .ph{aspect-ratio:16/10}.tb[aria-selected=true]{transform:none}}
/* favourites */
.fv{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,2.4vw,32px)}.fc{--rad:24px;padding:12px 12px 1.2rem;background:var(--surface);transition:transform .5s var(--ease)}.fc:hover{transform:translateY(-8px)}.fc .ph{aspect-ratio:1;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.05)}.fc img{width:100%;height:100%;object-fit:cover}.fc .tx{padding:1rem .6rem 0}.fc h3{display:flex;justify-content:space-between;gap:.8rem}.fc h3 span{font-weight:400;color:var(--accent);font-size:.9rem;white-space:nowrap}.fc p{color:var(--muted);margin:.5rem 0 0;font-size:.95rem}
@media(max-width:820px){.fv{grid-template-columns:1fr 1fr}.fv .fc:last-child{display:none}}@media(max-width:520px){.fv{grid-template-columns:1fr}.fv .fc:last-child{display:block}}
/* rings */
.rg{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,2vw,28px)}.rn{display:grid;justify-items:center;text-align:center;gap:.8rem;padding:1.6rem 1rem;background:var(--surface);border-radius:var(--rad);border:1px solid var(--line)}.rn svg{width:clamp(110px,14vw,170px);height:auto;transform:rotate(-90deg)}.rn circle{fill:none;stroke-width:6}.rn .bg{stroke:rgba(255,255,255,.12)}.rn .fg{stroke:url(#gr);stroke-linecap:round;stroke-dasharray:314;stroke-dashoffset:314;transition:stroke-dashoffset 2s var(--ease)}.rn.in .fg{stroke-dashoffset:50}
.rn b{font:400 clamp(1.3rem,2vw,1.8rem)/1 var(--display);white-space:nowrap}.rn span{color:var(--muted);font-size:.9rem}.rn .num{position:relative;display:grid;place-items:center}.rn .num b{position:absolute}
@media(max-width:620px){.rg{grid-template-columns:1fr}}
/* story + steps */
.sy{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,6vw,90px);align-items:center}.sy .ph{aspect-ratio:4/5;border-radius:var(--rad);overflow:hidden;background:rgba(255,255,255,.05)}.sy img{width:100%;height:100%;object-fit:cover}.sy h2{margin:1rem 0 1.2rem}@media(max-width:820px){.sy{grid-template-columns:1fr}.sy .ph{aspect-ratio:16/11}}
.stp{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,3vw,40px)}.stp::before{content:"";position:absolute;left:0;right:0;top:27px;height:2px;background:linear-gradient(90deg,var(--c1),var(--c2),var(--c3));box-shadow:0 0 18px var(--c1);opacity:.7}.st{position:relative;padding-top:4.2rem}.st .n{position:absolute;top:0;left:0;width:56px;height:56px;border-radius:50%;background:var(--bg);border:2px solid var(--accent);display:grid;place-items:center;font:400 1.5rem/1 var(--display);color:var(--accent);z-index:1}.st p{color:var(--muted);margin:.4rem 0 0}
@media(max-width:720px){.stp{grid-template-columns:1fr}.stp::before{left:27px;right:auto;top:0;bottom:0;width:2px;height:auto}.st{padding:.1rem 0 0 4.6rem}}
/* treatments page */
.mh{padding:clamp(120px,14vw,180px) 0 0}.mh h1{margin:1rem 0 1rem;font-size:clamp(3rem,7vw,6rem)}
.grp{padding-top:clamp(36px,5vw,70px)}.grp[hidden]{display:none}.gh{display:flex;align-items:end;justify-content:space-between;gap:1.4rem;flex-wrap:wrap;margin-bottom:1.4rem}.gh p{margin:0;color:var(--muted);max-width:28em}
.cg{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(14px,2vw,26px)}.tc{display:grid;grid-template-columns:150px 1fr;gap:1.2rem;padding:12px;background:var(--surface);border:1px solid var(--line);border-radius:22px;transition:transform .4s var(--ease),border-color .3s}.tc:hover{transform:translateY(-4px);border-color:var(--accent)}.tc .ph{aspect-ratio:1;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.05)}.tc img{width:100%;height:100%;object-fit:cover}.tc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline}.tc h3 span{font-weight:400;color:var(--accent);font-size:.84rem;text-align:right}.tc p{margin:.4rem 0 .6rem;color:var(--muted);font-size:.95rem}.tc .tags{display:flex;gap:.35rem;flex-wrap:wrap}.tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;border:1px solid var(--line);color:var(--muted)}.tg.star{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}
@media(max-width:900px){.cg{grid-template-columns:1fr}}@media(max-width:440px){.tc{grid-template-columns:96px 1fr}}
`;

const JS = `(function () {
  "use strict";
  var d = document, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var tabs = $$("[role=tab]"), panels = $$("[role=tabpanel]");
  tabs.forEach(function (tb) { tb.addEventListener("click", function () {
    tabs.forEach(function (x) { x.setAttribute("aria-selected", x === tb ? "true" : "false"); });
    panels.forEach(function (p) { p.classList.toggle("on", p.id === tb.getAttribute("aria-controls")); });
  }); });
})();
`;

const RING = `<svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs><linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F29AB9"/><stop offset=".6" stop-color="#B79BFF"/><stop offset="1" stop-color="#FFD58F"/></linearGradient></defs></svg>`;
const ring = ([v, s, l]) => `<div class="rn" data-reveal><div class="num"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="50"/><circle class="fg" cx="60" cy="60" r="50"/></svg><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b></div><span>${l}</span></div>`;

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack), star = all.filter((i) => i.star).slice(0, 3), lead = star[0] || all[0];
  const tabBtns = pack.cats.map((c, k) => `<button class="tb live" role="tab" id="tb-${c.id}" aria-controls="tp-${c.id}" aria-selected="${k === 0}" type="button"><span><h3>${c.name}</h3><small>${c.blurb}</small></span><span class="n">${K.pad(k + 1)}</span></button>`).join("");
  const tabPanels = pack.cats.map((c, k) => `<div class="tp${k === 0 ? " on" : ""}" role="tabpanel" id="tp-${c.id}" aria-labelledby="tb-${c.id}"><div class="ph shine">${img(c.art, c.name, { role: k === 0 ? "featured" : "secondary", w: 900, h: 1100, hint: B.hintOf(pack, c), lazy: k > 0 })}</div><div><ul>${c.items.map((i) => `<li><div><b>${i.n}</b><span>${K.strip(i.meta)}</span></div><p>${i.d}</p></li>`).join("")}</ul><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a></div></div>`).join("");
  const fav = star.map((i) => `<article class="fc live halo" data-reveal><div class="ph shine">${img(i.art, i.n, { w: 700, h: 700, hint: B.hintOf(pack, i) })}</div><div class="tx"><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p></div></article>`).join("");
  const mq = pack.cats.flatMap((c) => c.items.map((i) => `<span>${i.n}</span>`)).join("");
  const body = `${RING}<div class="orbs" aria-hidden="true"><i></i><i></i><i></i></div>
<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><span class="pill live halo"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a></span><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div><p class="open"><i></i>${X.glass[2]}</p></div>
<div class="gl live halo"><div class="ph shine">${img(lead.art, lead.n, { role: "featured", w: 900, h: 1100, hint: B.hintOf(pack, lead), lazy: false })}</div><div class="row"><b>${lead.n}</b><span>${K.strip(lead.meta)}</span></div></div></div></section>
<div class="mq" aria-hidden="true"><div>${mq}${mq}</div></div>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="tabs"><div class="tl" role="tablist" aria-label="${X.collection[0]}">${tabBtns}</div><div>${tabPanels}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.fav[0]}</span><h2 style="margin-top:.8rem">${X.fav[1]}</h2></div></div><div class="fv">${fav}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="rg">${X.stats.map(ring).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sy"><div class="ph live halo" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 1100, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.process[0]}</span><h2 style="margin-top:.8rem">${X.process[1]}</h2></div></div><div class="stp">${X.process[2].map(([h, p], i) => `<div class="st" data-reveal data-delay="${i * 100}"><span class="n">${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cg">${c.items.map((i) => `<article class="tc" data-reveal><div class="ph shine">${img(i.art || c.art, i.n, { w: 480, h: 480, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><div class="tags">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<div class="orbs" aria-hidden="true"><i></i><i></i><i></i></div><section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/beauty")) {
  return { name: "aura", themeColor: "#150A16", fonts: FONTS, media: B.mediaFor(pack, "aura", "atelier", "atelier").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.aura || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
