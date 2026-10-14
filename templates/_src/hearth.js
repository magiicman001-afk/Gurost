"use strict";
/**
 * hearth (premium plus, photo-first): warm and human. A large photo window with an "open today" card overlapping it, a full-width
 * photo band with the story over it, tall category photos and zig-zag favourites with big pictures. Two pages: Home and Menu.
 * Fonts: Lora + Instrument Sans (SIL OFL). Pictures from the "motion" set, the loop from the "motion" set.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["Lora-OFL.txt", "OFL-Lora.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/Lora-Regular.ttf"];

const CSS = `
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#2A211B;--muted:#6F6359;--line:#E5DACB;--soft:#F5EEE3;--paper:#FBF7F0;--accent:#A5502B;--deep:#3A2A20;--ph:#E9DFD0;--display:"Lora",Georgia,serif;--sans:"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(18px,4.5vw,60px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--paper)}.site-header.is-stuck,.mpanel{background:rgba(251,247,240,.92)}.f input,.f textarea{background:#fff}
h1{font-size:clamp(2.7rem,6.8vw,5.6rem);line-height:1.04;letter-spacing:-.025em}h2{font-size:clamp(2rem,4.2vw,3.3rem);line-height:1.1;letter-spacing:-.02em}h3{font-size:1.3rem;line-height:1.25}
h1 em,h2 em{color:var(--accent);font-style:italic}.lead{font-size:clamp(1.05rem,1.8vw,1.22rem);color:var(--muted);max-width:32em}
.btn{border-radius:999px}.btn-primary{background:var(--accent);border-color:var(--accent)}.btn-primary:hover{background:var(--deep);border-color:var(--deep)}
.ph{background:var(--ph);overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover}.price{font-weight:700;color:var(--accent);white-space:nowrap}
/* hero */
.hero{padding:clamp(112px,12vw,150px) 0 0;text-align:center}.hero .lead{margin:1.3rem auto 1.8rem}.cta-row{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center}
.win{position:relative;margin:clamp(36px,6vw,64px) auto 0;aspect-ratio:16/8.5;border-radius:28px;overflow:hidden;background:#FFE9C7;box-shadow:0 30px 70px rgba(70,40,15,.16)}.win video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.win .prod{position:absolute;inset:0;display:grid;grid-template-rows:100%;place-items:center;padding:4% 0}.win .prod img{height:100%;width:auto;max-width:none;aspect-ratio:1;object-fit:cover;border-radius:50%;box-shadow:0 20px 50px rgba(70,40,15,.28)}
.open{position:absolute;left:clamp(14px,3vw,36px);bottom:clamp(14px,3vw,36px);background:var(--paper);border-radius:18px;padding:1rem 1.3rem;text-align:left;box-shadow:0 14px 40px rgba(60,35,10,.2);max-width:min(320px,76%)}
.open small{display:flex;align-items:center;gap:.5em;font:700 .7rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.open small i{width:8px;height:8px;border-radius:50%;background:#2fb764}.open b{display:block;font:400 1.3rem/1.2 var(--display);margin:.4rem 0 .2rem}.open span{font-size:.9rem;color:var(--muted)}
@media(max-width:700px){.win{aspect-ratio:4/4.6;border-radius:22px}.win .prod{grid-template-rows:auto;padding:0}.win .prod img{height:auto;width:76%;max-width:76%}}
/* intro */
.sec{padding:clamp(60px,9vw,124px) 0}.intro{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(28px,6vw,96px);align-items:center}.intro .ph{aspect-ratio:1;border-radius:50%;max-width:440px;width:100%;justify-self:center}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2rem;padding-top:1.5rem;border-top:1px solid var(--line)}.facts b{display:block;font:400 clamp(2.2rem,4vw,3.2rem)/1 var(--display);color:var(--accent)}.facts span{font-size:.88rem;color:var(--muted)}
@media(max-width:820px){.intro{grid-template-columns:1fr}.intro .ph{max-width:300px;order:-1}}
/* promise */
.pro{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.4vw,32px)}.pro div{padding:1.6rem;border-radius:22px;background:var(--soft)}.pro b{display:block;font:400 1.4rem/1.2 var(--display);margin-bottom:.3rem}.pro span{color:var(--muted)}@media(max-width:720px){.pro{grid-template-columns:1fr}}
/* photo band */
.pband{position:relative;isolation:isolate;overflow:hidden;color:#fff;padding:clamp(80px,14vw,200px) 0;background:var(--deep)}.pband video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.pband::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(36,22,12,.62)}
.pband blockquote{margin:0 auto;max-width:22em;text-align:center;font:400 clamp(1.6rem,4vw,3.1rem)/1.22 var(--display);letter-spacing:-.015em}.pband cite{display:block;margin-top:1.4rem;font:700 .78rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;font-style:normal;opacity:.85}
/* categories */
.head{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,48px)}
.tall{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.6vw,22px)}.tcard{position:relative;display:block;aspect-ratio:3/4.4;border-radius:200px 200px 18px 18px;overflow:hidden;background:var(--ph);text-decoration:none;color:#fff;isolation:isolate}
.tcard img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;transition:transform 1.4s var(--ease)}.tcard:hover img{transform:scale(1.06)}.tcard::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,0) 50%,rgba(30,16,6,.72))}
.tcard div{position:absolute;left:1.2rem;right:1.2rem;bottom:1.2rem}.tcard h3{font-size:1.5rem}.tcard p{margin:.2rem 0 0;font-size:.88rem;opacity:.9}
@media(max-width:900px){.tall{grid-template-columns:1fr 1fr}}@media(max-width:480px){.tcard{border-radius:120px 120px 14px 14px}.tcard h3{font-size:1.2rem}.tcard p{display:none}}
/* zigzag favourites */
.zz{display:grid;gap:clamp(36px,6vw,84px)}.zi{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(24px,5vw,80px);align-items:center}.zi:nth-child(even) .ph{order:2}.zi .ph{aspect-ratio:5/4;border-radius:26px}.zi img{transition:transform 1.4s var(--ease)}.zi:hover img{transform:scale(1.04)}
.zi h3{font-size:clamp(1.8rem,3.4vw,2.6rem);line-height:1.1;margin:.8rem 0 .7rem}.zi p{color:var(--muted);margin:0 0 1.2rem;max-width:26em}@media(max-width:820px){.zi{grid-template-columns:1fr}.zi:nth-child(even) .ph{order:0}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,44px);position:relative;counter-reset:s}.step{counter-increment:s;text-align:center}.step::before{content:counter(s);display:grid;place-items:center;width:56px;height:56px;margin:0 auto 1.2rem;border-radius:50%;background:var(--accent);color:#fff;font:400 1.5rem/1 var(--display)}.step p{color:var(--muted);margin:.4rem 0 0}@media(max-width:760px){.steps{grid-template-columns:1fr}}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,90px);padding:clamp(26px,5vw,60px);border-radius:32px;background:var(--soft)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}.order .f input,.order .f textarea{border-color:transparent}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{background:var(--deep);color:#F3EADD;padding:56px 0 34px;font-size:.95rem}.foot .grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:1.9rem;margin-bottom:.6rem}.foot p{color:rgba(243,234,221,.72);max-width:26em;margin:0}.foot address{font-style:normal;color:rgba(243,234,221,.72)}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.2rem;padding-top:1.2rem;border-top:1px solid rgba(255,255,255,.16);color:rgba(243,234,221,.6);font-size:.82rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:150px 0 10px;text-align:center}.mhero .lead{margin:1.2rem auto 0}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.8rem;justify-content:center}.chips button{font:700 .86rem/1 var(--sans);padding:.85em 1.3em;border-radius:999px;border:1.5px solid var(--line);background:#fff;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}
.mcat{padding:clamp(32px,5vw,60px) 0 0}.mcat[hidden]{display:none}.mcat>header{text-align:center;margin-bottom:1.6rem}.mcat>header p{margin:.4rem 0 0;color:var(--muted)}
.mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,24px)}.mc{display:grid;gap:.7rem;align-content:start;padding:10px 10px 18px;border-radius:22px;background:#fff;border:1px solid var(--line)}.mc .ph{aspect-ratio:1;border-radius:14px}.mc img{transition:transform 1.2s var(--ease)}.mc:hover img{transform:scale(1.05)}.mc .r{display:flex;justify-content:space-between;gap:.8rem;align-items:baseline;padding:0 .5rem}.mc p{margin:0;padding:0 .5rem;color:var(--muted);font-size:.9rem}.mc .tags{padding:0 .5rem}
.tags{display:flex;gap:.4rem;flex-wrap:wrap}.tag{font:700 .62rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:var(--soft);color:var(--muted)}.tag.star{background:var(--accent);color:#fff}
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
  const star = cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art }))).slice(0, 3);
  const tall = cats.map((c) => `<a class="tcard" href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { role: "featured", w: 900, h: 1320, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
  const zz = star.map((i) => `<article class="zi" data-reveal><div class="ph">${img(i.art, i.n, { w: 1000, h: 800, hint: B.hintOf(pack, i) })}</div><div><span class="eyebrow">${K.fav[0]}</span><h3>${i.n}</h3><p>${i.d}</p><span class="price">${i.meta}</span> &nbsp; <a class="btn" href="index.html#order"><span>${pack.order.eyebrow}</span></a></div></article>`).join("");
  const body = `
<section class="hero"><div class="wrap"><span class="eyebrow">${K.heroEyebrow}</span><h1 style="margin-top:1.1rem">${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div>
<div class="win">${video("hearth")}<div class="prod">${img(cats[0].art, cats[0].name, { role: "featured", w: 1000, h: 1000, lazy: false, hint: B.hintOf(pack, cats[0]) })}</div><div class="open"><small><i></i>${K.glass[0]}</small><b>${K.glass[1]}</b><span>${K.glass[2].split(".")[0]}</span></div></div></div></section>
<section class="sec"><div class="wrap intro"><div data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:1rem 0 1.1rem">${K.story.h2}</h2><p class="lead">${K.story.lead}</p><div class="facts">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div><div class="ph" data-reveal>${img(K.story.art, K.story.alt, { role: "featured", hint: K.story.hint })}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pro" data-reveal>${K.promise.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div></div></section>
<section class="pband">${video("hearth")}<div class="wrap" data-reveal><blockquote>${K.story.lead}<cite>${t("business_name")} &middot; ${t("city")}</cite></blockquote></div></section>
<section class="sec"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.collection[0]}</span><h2 style="margin-top:1rem">${K.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="tall">${tall}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><h2>${K.fav[1]}</h2></div></div><div class="zz">${zz}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head" style="justify-content:center;text-align:center"><div><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:1rem">${K.process[1]}</h2></div></div><div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
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
  return { name: "hearth", themeColor: "#FBF7F0", fonts: FONTS, media: B.mediaFor(pack, "hearth", "motion", "motion"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.hearth || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
