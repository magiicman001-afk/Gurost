"use strict";
/**
 * studio (premium plus, photo-first): cinematic and dark. A full-screen hero (the looping video, or a real clip), a photo reel,
 * full-width photo bands, thin type. Built around photographs: big frames, little decoration. Two pages: Home and Menu.
 * Fonts: Libre Baskerville + Outfit (SIL OFL). Pictures from the "atelier" set, the loop from the "atelier" set.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["LibreBaskerville-Regular.ttf", "LibreBaskerville-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"],
  ["LibreBaskerville-OFL.txt", "OFL-LibreBaskerville.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"],
];
const PRELOAD = ["assets/fonts/LibreBaskerville-Regular.ttf"];

const CSS = `
@font-face{font-family:"Libre Baskerville";src:url(fonts/LibreBaskerville-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#F3EEE6;--bg:#0E0D0C;--muted:#A8A097;--line:rgba(243,238,230,.16);--soft:#171513;--accent:#D9A35C;--ph:#2a2622;--display:"Libre Baskerville",Georgia,serif;--sans:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(20px,5vw,64px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--bg);color:var(--ink)}h1,h2,h3{font-weight:400}
h1{font-size:clamp(2.6rem,7.2vw,6.2rem);line-height:1.04;letter-spacing:-.02em}h2{font-size:clamp(1.9rem,4.2vw,3.4rem);line-height:1.12;letter-spacing:-.015em}h3{font-size:1.25rem;line-height:1.25}
h1 em,h2 em{font-style:italic;color:var(--accent)}.lead{font-size:clamp(1.02rem,1.7vw,1.2rem);color:var(--muted);max-width:34em}
.eyebrow{color:var(--muted)}.eyebrow::before{background:var(--accent)}
.btn{border-radius:2px;border-color:var(--ink);color:var(--ink);letter-spacing:.1em;text-transform:uppercase;font-size:.76rem;padding:1.15em 1.9em}.btn:hover{background:var(--ink);color:var(--bg)}
.btn-primary{background:var(--accent);border-color:var(--accent);color:#14100B}.btn-primary:hover{background:var(--ink);border-color:var(--ink);color:var(--bg)}.bar .btn{padding:.85em 1.4em;border-radius:2px}
.site-header{color:var(--ink)}.site-header.is-stuck{background:rgba(14,13,12,.86);box-shadow:0 1px 0 var(--line)}.nav a{letter-spacing:.1em;text-transform:uppercase;font-size:.74rem}.brand{font-size:1.25rem;letter-spacing:.02em}
.mpanel{background:var(--bg)}.mpanel a{border-bottom-color:var(--line);color:var(--ink)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.f input,.f textarea{background:rgba(255,255,255,.04);border-color:var(--line);color:var(--ink);border-radius:2px}.f label{color:var(--muted)}.f-status.ok{color:#8FD6A6}.f-status.bad{color:#FF9C8F}
.hours th{color:var(--muted)}.hours th,.hours td{border-bottom-color:var(--line)}
dialog.legal{background:#1A1816;color:var(--ink)}.legal-x{background:rgba(255,255,255,.08);color:var(--ink)}
.ph{background:var(--ph)}.ph img{width:100%;height:100%;object-fit:cover}
/* hero */
.hero{position:relative;min-height:100vh;min-height:100svh;display:flex;align-items:flex-end;isolation:isolate;overflow:hidden}
.hero video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.hero::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(14,13,12,.55) 0%,rgba(14,13,12,.1) 38%,rgba(14,13,12,.9) 100%)}
.hero .wrap{padding-bottom:clamp(36px,7vw,84px);padding-top:140px;display:grid;grid-template-columns:1fr auto;gap:2rem;align-items:end}.hero h1{max-width:11em}.hero .lead{color:rgba(243,238,230,.8);margin:1.4rem 0 2rem}.cta-row{display:flex;flex-wrap:wrap;gap:.8rem}
.hero .note{font:400 .76rem/1.5 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:rgba(243,238,230,.75);text-align:right;max-width:16em}.hero .note b{display:block;color:var(--accent);margin-bottom:.4rem;font-weight:700}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}.hero .note{text-align:left;max-width:none}}
/* statement + stats */
.sec{padding:clamp(64px,10vw,140px) 0}.intro{max-width:980px;margin:0 auto;text-align:center}.intro p.big{font:400 clamp(1.5rem,3.2vw,2.6rem)/1.3 var(--display);letter-spacing:-.01em;margin:1.2rem 0 0}.intro p.big em{font-style:italic;color:var(--accent)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;max-width:760px;margin:clamp(36px,5vw,64px) auto 0;padding-top:2rem;border-top:1px solid var(--line)}.stats b{display:block;font:400 clamp(2.2rem,5vw,3.8rem)/1 var(--display)}.stats span{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
/* reel */
.head{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,48px)}.arrows{display:flex;gap:.6rem}.arrows button{width:50px;height:50px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:1.2rem;cursor:pointer;transition:.3s}.arrows button:hover{background:var(--ink);color:var(--bg)}
.railbox{overflow:hidden}.rail{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;--pad:max(var(--gut),calc((100vw - var(--max))/2 + var(--gut)));padding:0 var(--pad) 12px;scroll-padding-left:var(--pad);scrollbar-width:none;cursor:grab}.rail::-webkit-scrollbar{display:none}.rail.drag{cursor:grabbing;scroll-snap-type:none}
.shot{position:relative;flex:0 0 min(78vw,380px);aspect-ratio:3/4;scroll-snap-align:start;overflow:hidden;background:var(--ph);text-decoration:none;color:#fff}.shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform 1.4s var(--ease);-webkit-user-drag:none}.shot:hover img{transform:scale(1.05)}
.shot::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.78))}.shot .cap{position:absolute;left:1.3rem;right:1.3rem;bottom:1.2rem;z-index:1;display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.shot h3{font-size:1.2rem}.shot .price{font-size:.9rem;opacity:.85;white-space:nowrap}
/* photo bands */
.band{display:grid;grid-template-columns:1.25fr 1fr;min-height:min(80vh,720px);border-top:1px solid var(--line)}.band:nth-of-type(even){grid-template-columns:1fr 1.25fr}.band:nth-of-type(even) .bp{order:2}
.band .bp{position:relative;min-height:340px;background:var(--ph);overflow:hidden}.band .bp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform 1.6s var(--ease)}.band:hover .bp img{transform:scale(1.03)}
.band .bt{padding:clamp(28px,5vw,72px) var(--gut);display:flex;flex-direction:column;justify-content:center;gap:1.2rem}.band .bt p{color:var(--muted);margin:0}
.li{display:flex;justify-content:space-between;gap:1rem;padding:.8rem 0;border-bottom:1px solid var(--line);align-items:baseline}.li b{font:400 1.1rem/1.3 var(--display)}.price{font-size:.92rem;color:var(--accent);white-space:nowrap}
@media(max-width:820px){.band,.band:nth-of-type(even){grid-template-columns:minmax(0,1fr)}.band:nth-of-type(even) .bp{order:0}.band .bp{aspect-ratio:4/3;min-height:0;width:100%}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,48px);counter-reset:s}.step{counter-increment:s;border-top:1px solid var(--line);padding-top:1.4rem}.step::before{content:"0" counter(s);font:400 .95rem/1 var(--sans);letter-spacing:.2em;color:var(--accent);display:block;margin-bottom:1.4rem}.step p{color:var(--muted);margin:.5rem 0 0}@media(max-width:760px){.steps{grid-template-columns:1fr}}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,96px);align-items:start}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{padding:56px 0 34px;border-top:1px solid var(--line);font-size:.95rem}.foot .grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:1.7rem;margin-bottom:.6rem}.foot p{color:var(--muted);max-width:26em;margin:0}.foot address{font-style:normal;color:var(--muted)}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.3rem;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:150px 0 20px}.mhero .lead{margin-top:1.2rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:2rem}.chips button{font:700 .74rem/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;padding:1em 1.3em;border-radius:2px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.mcat{display:grid;grid-template-columns:1fr 1.15fr;gap:clamp(24px,5vw,72px);padding:clamp(36px,6vw,72px) 0;border-top:1px solid var(--line)}.mcat[hidden]{display:none}.mcat .side{position:sticky;top:96px;align-self:start}.mcat .side .ph{aspect-ratio:4/5;margin-top:1.4rem}.mcat .side p{color:var(--muted)}
.mi{padding:1.1rem 0;border-bottom:1px solid var(--line)}.mi:first-child{padding-top:0}.mi .r{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.mi h3{font-size:1.35rem}.mi p{margin:.3rem 0 .5rem;color:var(--muted);font-size:.95rem}
.tags{display:flex;gap:.4rem;flex-wrap:wrap}.tag{font:700 .62rem/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;padding:.45em .7em;border:1px solid var(--line);color:var(--muted)}.tag.star{background:var(--accent);border-color:var(--accent);color:#14100B}
@media(max-width:820px){.mcat{grid-template-columns:1fr}.mcat .side{position:static}.mcat .side .ph{aspect-ratio:16/10}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="border-top:1px solid var(--line)"><div class="wrap order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .9rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}<b style="margin-top:.8rem">Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const star = cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art })));
  const reel = star.map((i) => `<a class="shot" href="index.html#order">${img(i.art, i.n, { role: "featured", w: 760, h: 1013, hint: B.hintOf(pack, i) })}<div class="cap"><h3>${i.n}</h3><span class="price" style="color:#fff">${i.meta}</span></div></a>`).join("");
  const bands = cats.slice(0, 3).map((c) => `<section class="band"><div class="bp">${img(c.art, c.name, { role: "featured", w: 1100, h: 880, hint: B.hintOf(pack, c) })}</div><div class="bt" data-reveal><span class="eyebrow">${c.name}</span><h2>${c.blurb}</h2><div>${c.items.slice(0, 3).map((i) => `<div class="li"><b>${i.n}</b><span class="price">${i.meta}</span></div>`).join("")}</div><p><a class="btn" href="menu.html#${c.id}"><span>${K.collection[2]}</span></a></p></div></section>`).join("");
  const body = `
<section class="hero">${video("studio")}<div class="wrap"><div><span class="eyebrow" style="color:rgba(243,238,230,.8)">${K.heroEyebrow}</span><h1 style="margin-top:1.2rem">${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div>
<div class="note"><b>${K.glass[0]}</b>${K.glass[1]}</div></div></section>
<section class="sec"><div class="wrap intro" data-reveal><span class="eyebrow">${K.story.eyebrow}</span><p class="big">${K.story.lead}</p><div class="stats">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap head"><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:1rem">${K.fav[1]}</h2></div><div class="arrows"><button type="button" data-rail-prev aria-label="Previous">&larr;</button><button type="button" data-rail-next aria-label="Next">&rarr;</button></div></div>
<div class="railbox"><div class="rail" data-rail tabindex="0" aria-label="${K.fav[0]}">${reel}</div></div></section>
${bands}
<section class="sec" style="border-top:1px solid var(--line)"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:1rem">${K.process[1]}</h2></div></div><div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><div class="side"><h2>${c.name}</h2><p>${c.blurb}</p><div class="ph">${img(c.art, c.name, { w: 900, h: 1125, hint: B.hintOf(pack, c) })}</div></div>
<div>${c.items.map((i) => `<div class="mi" data-reveal><div class="r"><h3>${i.n}</h3><span class="price">${i.meta}</span></div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1 style="margin-top:1rem">${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div><div style="height:clamp(30px,5vw,60px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "studio", themeColor: "#0E0D0C", fonts: FONTS, media: B.mediaFor(pack, "studio", "atelier", "atelier"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.studio || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
