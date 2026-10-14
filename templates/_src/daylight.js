"use strict";
/**
 * daylight (premium plus, photo-first): bright, airy and quiet. A photo collage hero with a small looping video tile, a staggered
 * photo grid, plain captions under every picture and generous white space. Almost no decoration: the photographs carry it.
 * Two pages: Home and Menu. Fonts: Outfit + Crimson Pro italics (SIL OFL). Pictures from the "gallery" set, the loop from the "gallery" set.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"],
  ["Outfit-OFL.txt", "OFL-Outfit.txt"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"],
];
const PRELOAD = ["assets/fonts/Outfit-Regular.ttf"];

const CSS = `
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
:root{--ink:#1B1B1A;--muted:#767570;--line:#E8E6E1;--soft:#F6F5F2;--accent:#B26A2B;--ph:#ECEAE5;--display:"Outfit",system-ui,sans-serif;--sans:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;--serif:"Crimson Pro",Georgia,serif;--gut:clamp(18px,4.5vw,64px);--max:1360px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
h1,h2,h3{font-family:var(--display);font-weight:400}h1{font-size:clamp(2.8rem,8vw,7rem);line-height:.98;letter-spacing:-.045em}h2{font-size:clamp(2rem,4.6vw,3.8rem);line-height:1.04;letter-spacing:-.035em}h3{font-size:1.15rem;line-height:1.3;letter-spacing:-.01em}
h1 em,h2 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--accent);letter-spacing:-.01em}.lead{font-size:clamp(1.05rem,1.7vw,1.22rem);color:var(--muted);max-width:30em}
.btn{border-radius:4px;font-size:.82rem;letter-spacing:.04em;padding:1.05em 1.6em}.btn-primary{background:var(--ink);color:#fff}.btn-primary:hover{background:var(--accent);border-color:var(--accent)}.bar .btn{border-radius:4px}
.site-header.is-stuck,.mpanel{background:rgba(255,255,255,.92)}.brand{font-weight:700;letter-spacing:-.04em}.nav a{font-size:.85rem}
.f input,.f textarea{border-radius:4px}.ph{background:var(--ph);overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover}
/* hero */
.hero{padding:clamp(112px,12vw,150px) 0 0}.hero .top{display:grid;grid-template-columns:1.5fr 1fr;gap:var(--gut);align-items:end;margin-bottom:clamp(24px,4vw,52px)}.hero .lead{margin:0 0 1.6rem}.cta-row{display:flex;flex-wrap:wrap;gap:.7rem}
.coll{display:grid;grid-template-columns:7fr 5fr;gap:14px}.coll .big{aspect-ratio:5/4}.coll .col{display:grid;grid-template-rows:1fr 1fr;gap:14px}.coll .sm{display:grid;grid-template-columns:1fr 1fr;gap:14px}.coll .sm .ph{aspect-ratio:1}
.vtile{position:relative;overflow:hidden;background:var(--ph)}.vtile video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;transform:scale(1.25)}.vtile span{position:absolute;left:.9rem;bottom:.8rem;font:700 .7rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;background:#fff;padding:.55em .8em;border-radius:3px}
.coll .wide{grid-row:1;aspect-ratio:auto}.coll .col .vtile{min-height:200px}
@media(max-width:860px){.hero .top{grid-template-columns:1fr}.coll{grid-template-columns:1fr}.coll .big{aspect-ratio:4/3}.coll .col{grid-template-rows:auto}.coll .col .vtile{aspect-ratio:16/10;min-height:0}}
/* strip */
.strip{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:clamp(28px,4vw,48px);padding:1.1rem 0;border-block:1px solid var(--line);font-size:.85rem;color:var(--muted)}.strip b{color:var(--ink)}
.sec{padding:clamp(60px,9vw,130px) 0}.head{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,48px)}
/* staggered grid */
.stag{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,28px);align-items:start}.stag a{display:grid;gap:.8rem;text-decoration:none}.stag a:nth-child(even){margin-top:clamp(30px,6vw,90px)}
.stag .ph{aspect-ratio:4/5}.stag a:nth-child(3n) .ph{aspect-ratio:1}.stag img{transition:transform 1.2s var(--ease)}.stag a:hover img{transform:scale(1.04)}.stag p{margin:0;color:var(--muted);font-size:.92rem}.stag h3{display:flex;justify-content:space-between;gap:1rem}
@media(max-width:900px){.stag{grid-template-columns:1fr 1fr}.stag a:nth-child(even){margin-top:clamp(20px,6vw,50px)}}
/* favourites */
.favs{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.4vw,32px)}.fav{display:grid;gap:.9rem}.fav .ph{aspect-ratio:1}.fav img{transition:transform 1.2s var(--ease)}.fav:hover img{transform:scale(1.04)}.fav .r{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.fav p{margin:0;color:var(--muted)}.price{font-weight:700;white-space:nowrap}
@media(max-width:820px){.favs{grid-template-columns:1fr 1fr}.favs .fav:last-child{display:none}}@media(max-width:520px){.favs{grid-template-columns:1fr}.favs .fav:last-child{display:grid}}
/* story */
.story{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,7vw,110px);align-items:center}.story .ph{aspect-ratio:4/5}.story .lead{margin:1.2rem 0 2rem}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;border-top:1px solid var(--line);padding-top:1.4rem}.facts b{display:block;font-size:clamp(2.2rem,4vw,3.2rem);line-height:1;letter-spacing:-.04em}.facts span{font-size:.85rem;color:var(--muted)}
@media(max-width:820px){.story{grid-template-columns:1fr}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,48px);counter-reset:s}.step{counter-increment:s}.step::before{content:"0" counter(s);display:block;font-size:clamp(3rem,6vw,5rem);line-height:1;letter-spacing:-.05em;color:var(--line);margin-bottom:1rem}.step p{color:var(--muted);margin:.4rem 0 0}@media(max-width:760px){.steps{grid-template-columns:1fr}}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,96px);padding:clamp(26px,5vw,64px);background:var(--soft)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}.order .f input,.order .f textarea{border-color:transparent}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{padding:56px 0 34px;border-top:1px solid var(--line);font-size:.95rem}.foot .grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:1.6rem;margin-bottom:.6rem}.foot p{color:var(--muted);max-width:26em;margin:0}.foot address{font-style:normal;color:var(--muted)}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.2rem;padding-top:1.2rem;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:150px 0 10px}.mhero .lead{margin-top:1.2rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.8rem}.chips button{font:700 .8rem/1 var(--sans);padding:.9em 1.2em;border-radius:4px;border:1px solid var(--line);background:#fff;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.mcat{padding:clamp(32px,5vw,60px) 0 0}.mcat[hidden]{display:none}.mcat>header{display:flex;align-items:baseline;gap:1.2rem;flex-wrap:wrap;margin-bottom:1.4rem}.mcat>header p{margin:0;color:var(--muted)}
.mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,26px)}.mc{display:grid;gap:.7rem;align-content:start}.mc .ph{aspect-ratio:1}.mc img{transition:transform 1.2s var(--ease)}.mc:hover img{transform:scale(1.04)}
.mc .r{display:flex;justify-content:space-between;gap:.8rem;align-items:baseline}.mc p{margin:0;color:var(--muted);font-size:.9rem}.tags{display:flex;gap:.4rem;flex-wrap:wrap}.tag{font:700 .62rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .65em;border:1px solid var(--line);color:var(--muted)}.tag.star{background:var(--ink);border-color:var(--ink);color:#fff}
@media(max-width:1000px){.mgrid{grid-template-columns:1fr 1fr}}@media(max-width:420px){.mgrid{gap:12px}.mc .r{flex-direction:column;gap:.2rem}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-top:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

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
  const pick = (k) => cats[k % cats.length];
  const stag = cats.map((c) => `<a href="menu.html#${c.id}" data-reveal><div class="ph">${img(c.art, c.name, { role: "featured", hint: B.hintOf(pack, c) })}</div><h3><span>${c.name}</span><span aria-hidden="true">&rarr;</span></h3><p>${c.blurb}</p></a>`).join("");
  const favs = star.slice(0, 3).map((i, k) => `<article class="fav" data-reveal data-delay="${k * 100}"><div class="ph">${img(i.art, i.n, { hint: B.hintOf(pack, i) })}</div><div class="r"><h3>${i.n}</h3><span class="price">${i.meta}</span></div><p>${i.d}</p></article>`).join("");
  const body = `
<section class="hero"><div class="wrap"><div class="top"><h1>${K.heroH1}</h1><div><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div></div>
<div class="coll"><div class="ph big">${img(pick(0).art, pick(0).name, { role: "featured", w: 1200, h: 960, lazy: false, hint: B.hintOf(pack, pick(0)) })}</div>
<div class="col"><div class="vtile">${video("daylight")}<span>${K.glass[0]}</span></div><div class="sm"><div class="ph">${img(pick(1).art, pick(1).name, { w: 600, h: 600, hint: B.hintOf(pack, pick(1)) })}</div><div class="ph">${img(pick(2).art, pick(2).name, { w: 600, h: 600, hint: B.hintOf(pack, pick(2)) })}</div></div></div></div>
<div class="strip"><span><b>${K.heroEyebrow}</b></span><span>${K.glass[1]}</span></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.collection[0]}</span><h2 style="margin-top:1rem">${K.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="stag">${stag}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:1rem">${K.fav[1]}</h2></div></div><div class="favs">${favs}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap story"><div class="ph" data-reveal>${img(K.story.art, K.story.alt, { role: "featured", hint: K.story.hint })}</div><div data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin-top:1rem">${K.story.h2}</h2><p class="lead">${K.story.lead}</p><div class="facts">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:1rem">${K.process[1]}</h2></div></div><div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><header><h2>${c.name}</h2><p>${c.blurb}</p></header><div class="mgrid">${c.items.map((i) => `<article class="mc" data-reveal><div class="ph">${img(i.art || c.art, i.n, { hint: B.hintOf(pack, i) })}</div><div class="r"><h3>${i.n}</h3><span class="price">${i.meta}</span></div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1 style="margin-top:1rem">${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div><div style="height:clamp(40px,6vw,80px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "daylight", themeColor: "#FFFFFF", fonts: FONTS, media: B.mediaFor(pack, "daylight", "gallery", "gallery"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.daylight || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
