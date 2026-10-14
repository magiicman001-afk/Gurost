"use strict";
/**
 * journal (premium plus): a magazine. Hairline grid, mono labels ("Plate 01", "Fig. 1"), huge serif headline, a wide cinema
 * strip, an index of categories and a menu laid out as a printed table. Two pages: Home and Menu.
 * Fonts: Crimson Pro + DM Mono (SIL OFL). Pictures from the "motion" set (colour tiles), the loop from the "atelier" set.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["CrimsonPro-Bold.ttf", "CrimsonPro-Bold.ttf"], ["DMMono-Regular.ttf", "DMMono-Regular.ttf"],
  ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"], ["DMMono-OFL.txt", "OFL-DMMono.txt"],
];
const PRELOAD = ["assets/fonts/CrimsonPro-Regular.ttf"];

const CSS = `
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"DM Mono";src:url(fonts/DMMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
:root{--ink:#111111;--muted:#6B6B66;--line:#DAD8D2;--soft:#F5F3EE;--accent:#E4452B;--display:"Crimson Pro",Georgia,serif;--sans:"Crimson Pro",Georgia,serif;--mono:"DM Mono",ui-monospace,Menlo,monospace;--gut:clamp(18px,4vw,48px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{font:400 clamp(1.05rem,1.2vw,1.2rem)/1.55 var(--sans)}
h1{font-size:clamp(3.4rem,11.5vw,10.5rem);line-height:.88;letter-spacing:-.035em}h2{font-size:clamp(2.2rem,5.4vw,4.4rem);line-height:.98;letter-spacing:-.025em}h3{font-size:1.55rem;line-height:1.1;letter-spacing:-.01em}
h1 em,h2 em{color:var(--accent)}.lead{font-size:clamp(1.15rem,1.8vw,1.45rem);color:var(--muted);max-width:26em}
.mono,.eyebrow,.btn,.nav a,.tag,.f label,.chips button,.hours,.foot .base{font-family:var(--mono)}
.eyebrow{font-size:.72rem;letter-spacing:.1em}.eyebrow::before{border-radius:0;width:8px;height:8px}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.06em;font-size:.76rem;border-color:var(--ink)}.btn-primary{background:var(--ink);color:#fff}.btn-primary:hover{background:var(--accent);border-color:var(--accent)}.bar .btn{border-radius:0}
.brand{font-weight:700;letter-spacing:-.02em}.nav a{text-transform:uppercase;letter-spacing:.06em;font-size:.76rem}
.f input,.f textarea{border-radius:0;border-color:var(--ink)}
.site-header.is-stuck,.mpanel{background:rgba(255,255,255,.94)}
/* top strip */
.strip{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;border-block:1px solid var(--ink);padding:.7rem 0;font:400 .72rem/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase}.strip span+span{text-align:right}
/* hero */
.hero{padding:clamp(100px,12vw,132px) 0 0}.hero h1{margin:clamp(20px,3vw,36px) 0}
.hgrid{display:grid;grid-template-columns:repeat(12,1fr);gap:var(--gut);align-items:end;padding:clamp(18px,3vw,36px) 0}.hgrid .l{grid-column:1/span 4}.hgrid .l .lead{margin:0 0 1.8rem}.hgrid .r{grid-column:5/-1}
.cta-row{display:flex;flex-wrap:wrap;gap:.7rem}
.cine{position:relative;aspect-ratio:21/9;overflow:hidden;background:#150B05}.cine video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cap{display:flex;justify-content:space-between;gap:1rem;margin-top:.6rem;font:400 .72rem/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
@media(max-width:860px){.hgrid{grid-template-columns:1fr}.hgrid .l,.hgrid .r{grid-column:1}.cine{aspect-ratio:4/3}}
/* promise */
.pro{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);margin-top:clamp(36px,5vw,64px)}.pro div{padding:1.2rem var(--gut) 1.6rem 0}.pro div+div{padding-left:var(--gut);border-left:1px solid var(--line)}
.pro small{display:block;font:400 .72rem/1 var(--mono);letter-spacing:.1em;color:var(--accent);margin-bottom:.8rem}.pro b{display:block;font-size:1.7rem;line-height:1.1;margin-bottom:.3rem}.pro span{color:var(--muted)}
@media(max-width:720px){.pro{grid-template-columns:1fr}.pro div,.pro div+div{padding:1.1rem 0;border-left:0;border-top:1px solid var(--line)}}
.sec{padding:clamp(60px,9vw,120px) 0}.sechead{display:flex;justify-content:space-between;align-items:end;gap:1.6rem;flex-wrap:wrap;border-bottom:1px solid var(--ink);padding-bottom:1rem;margin-bottom:clamp(24px,4vw,44px)}
/* index */
.idx{display:grid}.ix{display:grid;grid-template-columns:4rem 1fr 1.2fr 150px 3rem;gap:1.2rem;align-items:center;padding:1.2rem 0;border-bottom:1px solid var(--line);text-decoration:none;transition:background .3s,padding .3s var(--ease)}
.ix:hover{background:var(--soft);padding-inline:.8rem}.ix .n{font:400 .8rem/1 var(--mono);color:var(--accent)}.ix h3{font-size:clamp(1.7rem,3.4vw,2.8rem);letter-spacing:-.02em}.ix p{margin:0;color:var(--muted)}.ix .ph{aspect-ratio:3/2;overflow:hidden;background:var(--soft)}.ix img{width:100%;height:100%;object-fit:cover}.ix .ar{font-size:1.4rem;text-align:right;transition:transform .4s var(--ease)}.ix:hover .ar{transform:translateX(6px)}
@media(max-width:820px){.ix{grid-template-columns:2.6rem 1fr 90px}.ix p,.ix .ar{display:none}}
/* plates */
.plates{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gut)}.pl .ph{aspect-ratio:4/5;overflow:hidden;background:var(--soft)}.pl img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.pl:hover img{transform:scale(1.04)}
.pl .cap{margin:.7rem 0 .6rem}.pl h3{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.pl p{margin:.3rem 0 0;color:var(--muted)}.price{font-family:var(--mono);font-size:.9rem;white-space:nowrap}
@media(max-width:820px){.plates{grid-template-columns:1fr 1fr}.plates .pl:last-child{display:none}}@media(max-width:520px){.plates{grid-template-columns:1fr}.plates .pl:last-child{display:block}}
/* story */
.story{display:grid;grid-template-columns:repeat(12,1fr);gap:var(--gut)}.story .a{grid-column:1/span 5}.story .b{grid-column:6/-1}.story .ph{aspect-ratio:4/5;overflow:hidden;background:var(--soft)}.story img{width:100%;height:100%;object-fit:cover}
.story .pq{font-size:clamp(1.7rem,3.4vw,2.8rem);line-height:1.12;letter-spacing:-.015em;margin:1rem 0 2rem}.story .pq::first-letter{float:left;font-size:4.2em;line-height:.8;padding:.06em .1em 0 0;color:var(--accent)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink)}.stats div{padding:1rem 1rem 0 0}.stats b{display:block;font-size:clamp(2.4rem,4.6vw,3.8rem);line-height:1;letter-spacing:-.03em}.stats span{font:400 .72rem/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
@media(max-width:860px){.story .a,.story .b{grid-column:1/-1}.story .ph{aspect-ratio:16/11}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink)}.step{padding:1.4rem var(--gut) 0 0}.step+.step{padding-left:var(--gut);border-left:1px solid var(--line)}.step small{font:400 .72rem/1 var(--mono);letter-spacing:.1em;color:var(--accent)}.step h3{margin:.8rem 0 .4rem;font-size:2rem}.step p{margin:0;color:var(--muted)}
@media(max-width:720px){.steps{grid-template-columns:1fr}.step,.step+.step{padding:1.2rem 0;border-left:0;border-top:1px solid var(--line)}}
/* order */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,90px);padding:clamp(24px,4vw,56px);border:1px solid var(--ink)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{border-top:1px solid var(--ink);padding:48px 0 30px;font-size:1rem}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:clamp(2rem,5vw,3.6rem);line-height:.95;margin-bottom:.8rem;letter-spacing:-.03em}.foot p{color:var(--muted);margin:0}
.foot address{font-style:normal;color:var(--muted)}.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:400 .72rem/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}
.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:130px 0 0}.mhero h1{margin:1.2rem 0 1.4rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.8rem 0 0}.chips button{font:400 .74rem/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:.9em 1.2em;border:1px solid var(--ink);background:#fff;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--ink);color:#fff}
.mcat{display:grid;grid-template-columns:repeat(12,1fr);gap:var(--gut);padding:clamp(30px,5vw,56px) 0;border-top:1px solid var(--ink);margin-top:clamp(30px,5vw,56px)}.mcat[hidden]{display:none}
.mcat .side{grid-column:1/span 4;position:sticky;top:96px;align-self:start}.mcat .side h2{font-size:clamp(2.4rem,4.6vw,3.8rem)}.mcat .side p{color:var(--muted)}.mcat .side .ph{aspect-ratio:1;overflow:hidden;background:var(--soft);margin-top:1rem}.mcat .side img{width:100%;height:100%;object-fit:cover}
.mcat .list{grid-column:6/-1}.mi{display:grid;grid-template-columns:3rem 1fr auto;gap:.3rem 1rem;padding:1rem 0;border-bottom:1px solid var(--line)}.mi:first-child{padding-top:0}.mi .n{font:400 .74rem/1.8 var(--mono);color:var(--accent)}.mi h3{font-size:1.6rem}.mi p{grid-column:2;margin:0;color:var(--muted)}.mi .tags{grid-column:2;display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.3rem}
.tag{font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;padding:.4em .6em;border:1px solid var(--line);color:var(--muted)}.tag.star{background:var(--accent);border-color:var(--accent);color:#fff}
@media(max-width:860px){.mcat .side,.mcat .list{grid-column:1/-1;position:static}.mcat .side .ph{display:none}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-top:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;
const pad = (n) => String(n).padStart(2, "0");

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const star = cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art }))).slice(0, 3);
  const plates = star.map((i, k) => `<article class="pl" data-reveal data-delay="${k * 100}"><div class="ph">${img(i.art, i.n, { hint: B.hintOf(pack, i) })}</div><div class="cap"><span>Plate ${pad(k + 1)}</span><span>${i.meta}</span></div><h3>${i.n}</h3><p>${i.d}</p></article>`).join("");
  const idx = cats.map((c, k) => `<a class="ix" href="menu.html#${c.id}" data-reveal><span class="n">${pad(k + 1)}</span><h3>${c.name}</h3><p>${c.blurb}</p><div class="ph">${img(c.art, c.name, { w: 600, h: 400, hint: B.hintOf(pack, c) })}</div><span class="ar" aria-hidden="true">&rarr;</span></a>`).join("");
  const body = `
<section class="hero"><div class="wrap"><div class="strip"><span>${K.heroEyebrow}</span><span>${K.glass[0]} &middot; ${K.glass[1]}</span></div>
<h1>${K.heroH1}</h1>
<div class="hgrid"><div class="l"><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div>
<div class="r"><div class="cine">${video("journal")}</div><div class="cap"><span>Fig. 1</span><span>${K.glass[2].split(".")[0]}</span></div></div></div>
<div class="pro" data-reveal>${K.promise.map(([b, s], k) => `<div><small>${pad(k + 1)}</small><b>${b}</b><span>${s}</span></div>`).join("")}</div></div></section>
<section class="sec"><div class="wrap"><div class="sechead"><h2>${K.collection[1]}</h2><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="idx">${idx}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sechead"><h2>${K.fav[1]}</h2><span class="eyebrow">${K.fav[0]}</span></div><div class="plates">${plates}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap story"><div class="a" data-reveal><div class="ph">${img(K.story.art, K.story.alt, { role: "featured", hint: K.story.hint })}</div><div class="cap"><span>Fig. 2</span><span>${K.story.alt}</span></div></div>
<div class="b" data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:1rem 0 0">${K.story.h2}</h2><p class="pq">${K.story.lead}</p><div class="stats">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sechead"><h2>${K.process[1]}</h2><span class="eyebrow">${K.process[0]}</span></div><div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><small>Step ${pad(i + 1)}</small><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  let n = 0;
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><div class="side"><span class="eyebrow">${pad(cats.indexOf(c) + 1)}</span><h2 style="margin-top:.8rem">${c.name}</h2><p>${c.blurb}</p><div class="ph">${img(c.art, c.name, { hint: B.hintOf(pack, c) })}</div></div>
<div class="list">${c.items.map((i) => `<div class="mi" data-reveal><span class="n">${pad(++n)}</span><h3>${i.n}</h3><span class="price">${i.meta}</span><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><div class="strip"><span>${K.menuHero[0]}</span><span>${t("business_name")}</span></div><h1>${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div><div style="height:clamp(40px,6vw,80px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "journal", themeColor: "#FFFFFF", fonts: FONTS, media: B.mediaFor(pack, "journal", "motion", "atelier"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.journal || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
