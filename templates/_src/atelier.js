"use strict";
/**
 * bakery-atelier (premium plus): a white page with a dark, oven-lit video hero in a rounded frame, a bento collection,
 * a story with counters and a three-step process. Two pages: Home and Menu. Fonts: Italiana + Instrument Sans (SIL OFL).
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["Italiana-Regular.ttf", "Italiana-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["Italiana-OFL.txt", "OFL-Italiana.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const media = (pack) => [
  ...pack.media.motifs.map((n) => [`${pack.mediaDir}/img/atelier/${n}.webp`, `img/${n}.webp`]),
  [`${pack.mediaDir}/video/atelier-hero.mp4`, "video/atelier-hero.mp4"], [`${pack.mediaDir}/video/atelier-hero.webm`, "video/atelier-hero.webm"], [`${pack.mediaDir}/video/atelier-poster.webp`, "video/atelier-poster.webp"],
];
const PRELOAD = ["assets/fonts/Italiana-Regular.ttf"];

const CSS = `
@font-face{font-family:"Italiana";src:url(fonts/Italiana-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#1B1613;--muted:#6E645B;--line:#E9E2D8;--soft:#F8F3EB;--accent:#B5651D;--display:"Italiana",Georgia,serif;--sans:"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(20px,5vw,56px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
h1{font-size:clamp(3.1rem,9vw,7.4rem);line-height:.96;letter-spacing:-.01em}h2{font-size:clamp(2.3rem,5.4vw,4rem);line-height:1.02}h3{font-size:1.7rem;line-height:1.1}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,2vw,1.25rem);color:var(--muted);max-width:34em}
/* hero */
body[data-page=home] .site-header:not(.is-stuck){color:#fff}body[data-page=home] .site-header:not(.is-stuck) .btn-primary{background:#fff;color:var(--ink);border-color:#fff}
.menu-open body[data-page=home] .site-header,.menu-open .site-header{color:var(--ink)}
.hero{padding:12px}.hero-box{position:relative;isolation:isolate;border-radius:30px;overflow:hidden;min-height:min(92vh,860px);min-height:min(92svh,860px);display:flex;align-items:flex-end;background:#1a0f08;color:#fff}
.hero-box::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(15,8,3,.55) 0%,rgba(15,8,3,0) 36%,rgba(15,8,3,.72) 100%)}
.hero-box .vid{z-index:-2}.hero-in{width:100%;display:grid;grid-template-columns:1fr auto;gap:2rem;align-items:end;padding-top:140px;padding-bottom:clamp(28px,5vw,56px)}
.hero h1{max-width:9em}.hero .lead{color:rgba(255,255,255,.82);margin:1.4rem 0 2rem}.hero .eyebrow{color:rgba(255,255,255,.8);margin-bottom:1.4rem}
.cta-row{display:flex;flex-wrap:wrap;gap:.8rem}
.glass{width:290px;padding:1.3rem 1.4rem;border-radius:22px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);font-size:.95rem;line-height:1.5}
.glass b{display:block;font:400 1.5rem/1.1 var(--display);margin:.25rem 0 .5rem}.glass small{display:block;opacity:.78;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}
.glass .live{display:inline-block;width:8px;height:8px;border-radius:50%;background:#7CE29B;margin-right:.5em;animation:pulse 2s infinite}
@keyframes pulse{50%{opacity:.35}}
@media(max-width:860px){.hero-box::after{background:linear-gradient(180deg,rgba(15,8,3,.55) 0%,rgba(15,8,3,.45) 30%,rgba(15,8,3,.86) 100%)}.hero-in{grid-template-columns:1fr}.glass{width:100%;max-width:340px}.hero-box{min-height:88svh}}
/* promise strip */
.promise{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;padding:clamp(40px,6vw,72px) 0;border-bottom:1px solid var(--line)}
.promise div{display:grid;gap:.3rem}.promise b{font:400 1.7rem/1.1 var(--display)}.promise span{color:var(--muted)}
@media(max-width:720px){.promise{grid-template-columns:1fr;gap:1.4rem}}
/* bento */
.head{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(28px,5vw,56px)}.head .lead{margin:0}
.bento{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:minmax(190px,auto);gap:16px}
.tile{position:relative;overflow:hidden;border-radius:26px;background:var(--soft);text-decoration:none;display:flex;flex-direction:column;justify-content:flex-end;padding:1.6rem;min-height:260px;isolation:isolate;transition:transform .5s var(--ease)}
.tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;transition:transform 1.2s var(--ease)}.tile:hover img{transform:scale(1.06)}.tile:hover{transform:translateY(-4px)}
.tile::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(30,16,6,.72))}
.tile h3{color:#fff}.tile p{color:rgba(255,255,255,.85);margin:.3rem 0 0;font-size:.95rem}
.tile .go{position:absolute;top:1.2rem;right:1.2rem;width:44px;height:44px;border-radius:50%;background:#fff;color:var(--ink);display:grid;place-items:center;font-size:1.2rem;transition:transform .4s var(--ease)}.tile:hover .go{transform:rotate(-45deg)}
.t1{grid-column:span 7;grid-row:span 2}.t2{grid-column:span 5}.t3{grid-column:span 5}.t4{grid-column:span 12;min-height:300px}.t4 img{object-position:center 42%}
@media(max-width:820px){.t1,.t2,.t3,.t4{grid-column:1/-1;grid-row:auto;min-height:260px}}
/* favourites */
.fav{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,32px)}
.card{display:grid;gap:1rem}.card .ph{border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:var(--soft)}.card img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.card:hover img{transform:scale(1.05)}
.card h3{font-size:1.5rem}.card .row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.card p{color:var(--muted);margin:0}.price{font-weight:700;white-space:nowrap}
@media(max-width:820px){.fav{grid-template-columns:1fr 1fr}.fav .card:last-child{display:none}}@media(max-width:520px){.fav{grid-template-columns:1fr}.fav .card:last-child{display:grid}.card .ph{aspect-ratio:1}}
/* story */
.story{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,7vw,100px);align-items:center}.story .ph{border-radius:30px;overflow:hidden;aspect-ratio:4/5;background:var(--soft)}.story img{width:100%;height:100%;object-fit:cover}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2.2rem;padding-top:2rem;border-top:1px solid var(--line)}.stats b{display:block;font:400 clamp(2.4rem,5vw,3.6rem)/1 var(--display)}.stats span{color:var(--muted);font-size:.9rem}
@media(max-width:820px){.story{grid-template-columns:1fr}.story .ph{aspect-ratio:1}}
/* process */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,36px);counter-reset:s}.step{padding:1.8rem;border-radius:26px;background:var(--soft);counter-increment:s}
.step::before{content:"0" counter(s);font:400 2.6rem/1 var(--display);color:var(--accent);display:block;margin-bottom:2.4rem}.step p{color:var(--muted);margin:.6rem 0 0}
@media(max-width:820px){.steps{grid-template-columns:1fr}.step::before{margin-bottom:1.2rem}}
/* order */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,90px);padding:clamp(28px,5vw,64px);border-radius:34px;background:var(--soft)}
.order .hours{margin:1.6rem 0}.order address{font-style:normal;color:var(--muted)}.order .f input,.order .f textarea{border-color:transparent}
@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{padding:56px 0 40px;border-top:1px solid var(--line);font-size:.95rem}.foot .grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:2rem;margin-bottom:.6rem}.foot p{color:var(--muted);max-width:26em}
.foot address{font-style:normal;color:var(--muted)}.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}
.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.4rem;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu page */
.mhero{padding:150px 0 40px}.mhero h1{font-size:clamp(3rem,8vw,6rem)}.mhero .lead{margin-top:1.2rem}
.chips{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:2rem}.chips button{font:700 .9rem/1 var(--sans);padding:.85em 1.3em;border-radius:999px;border:1.5px solid var(--line);background:#fff;cursor:pointer;transition:.25s}
.chips button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.cat{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(24px,6vw,90px);padding:clamp(36px,6vw,72px) 0;border-top:1px solid var(--line)}.cat[hidden]{display:none}
.cat .side{position:sticky;top:96px;align-self:start}.cat .ph{border-radius:26px;overflow:hidden;aspect-ratio:4/5;margin-top:1.4rem;background:var(--soft)}.cat .ph img{width:100%;height:100%;object-fit:cover}
.cat .side p{color:var(--muted)}
.item{display:grid;grid-template-columns:1fr auto;gap:.3rem 1.5rem;padding:1.3rem 0;border-bottom:1px solid var(--line)}.item:first-child{padding-top:0}
.item h3{font-size:1.5rem}.item .price{font-size:1.1rem}.item p{grid-column:1;margin:0;color:var(--muted)}.tags{display:flex;gap:.4rem;grid-column:1;margin-top:.4rem}
.tag{font:700 .68rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:var(--soft);color:var(--muted)}.tag.star{background:var(--accent);color:#fff}
@media(max-width:820px){.cat{grid-template-columns:1fr}.cat .side{position:static}.cat .ph{aspect-ratio:16/10}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-top:0"><div class="wrap"><div class="order" data-reveal>
<div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div>
<div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid">
<div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div>
<div class="col"><b>Follow</b>${f.social}<b style="margin-top:.8rem">Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const star = cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art }))).slice(0, 3);
  const tiles = cats.map((c, i) => `<a class="tile t${i + 1}" href="menu.html#${c.id}" data-reveal data-delay="${i * 80}">${img(c.art, c.name, { role: i === 0 ? "featured" : "secondary", hint: B.hintOf(pack, c) })}<span class="go" aria-hidden="true">&rarr;</span><h3>${c.name}</h3><p>${c.blurb}</p></a>`).join("");
  const favs = star.map((i, k) => `<article class="card" data-reveal data-delay="${k * 100}"><div class="ph">${img(i.art, i.n)}</div><div class="row"><h3>${i.n}</h3><span class="price">${i.meta}</span></div><p>${i.d}</p></article>`).join("");
  const body = `
<section class="hero"><div class="hero-box">${video("atelier", { cls: "vid" })}
<div class="wrap hero-in"><div><span class="eyebrow">${K.heroEyebrow}</span><h1>${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-light" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn btn-glass" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div>
<div class="glass"><small><span class="live"></span>${K.glass[0]}</small><b>${K.glass[1]}</b>${K.glass[2]}</div></div></div></section>
<div class="wrap"><div class="promise" data-reveal>${K.promise.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div></div>
<section class="sec"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.collection[0]}</span><h2 style="margin-top:1rem">${K.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="bento">${tiles}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:1rem">${K.fav[1]}</h2></div></div><div class="fav">${favs}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap story"><div class="ph" data-reveal>${img(K.story.art, K.story.alt, { role: "featured", hint: K.story.hint })}</div>
<div data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:1rem 0 1.2rem">${K.story.h2}</h2><p class="lead">${K.story.lead}</p>
<div class="stats">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:1rem">${K.process[1]}</h2></div></div>
<div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="cat" id="${c.id}" data-cat="${c.id}"><div class="side"><h2>${c.name}</h2><p>${c.blurb}</p><div class="ph">${img(c.art, c.name, { hint: B.hintOf(pack, c) })}</div></div>
<div>${c.items.map((i) => `<div class="item"><h3>${i.n}</h3><span class="price">${i.meta}</span><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1 style="margin-top:1rem">${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "atelier", themeColor: "#FFFFFF", fonts: FONTS, media: media(pack), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + pack.css.atelier, "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
