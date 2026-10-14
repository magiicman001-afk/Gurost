"use strict";
/**
 * market (premium plus): a lively street-market stall. Chunky outlines with hard shadows, a spinning sticker, bright colour bands,
 * a marquee and big rounded cards. Two pages: Home and Menu. Font: Bricolage Grotesque (SIL OFL).
 * Pictures and the colour loop come from the "motion" set.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Regular.ttf"], ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"],
];
const PRELOAD = ["assets/fonts/BricolageGrotesque-Bold.ttf"];

const CSS = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#1A1410;--muted:#5E544B;--line:#1A1410;--soft:#FFF6E3;--accent:#FF5A36;--sun:#FFC93C;--mint:#9FE3C6;--pink:#FFB3C7;--display:"Bricolage Grotesque",system-ui,sans-serif;--sans:"Bricolage Grotesque",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1280px;--ease:cubic-bezier(.2,.7,.2,1);--sh:5px 5px 0 var(--ink)}
${B.BASE_CSS}
body{font:400 clamp(1rem,1.2vw,1.1rem)/1.55 var(--sans);background:#fff}
h1,h2,h3{font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(3.2rem,9vw,8rem);line-height:.92}h2{font-size:clamp(2.3rem,5.6vw,4.6rem);line-height:.98}h3{font-size:1.4rem;line-height:1.1}
h1 em,h2 em{font-style:normal;background:var(--sun);padding:0 .12em;border-radius:.18em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.lead{font-size:clamp(1.1rem,1.9vw,1.35rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--ink)}.eyebrow::before{background:var(--accent)}
.btn{border:2.5px solid var(--ink);border-radius:14px;box-shadow:var(--sh);font-size:.95rem;transition:transform .2s var(--ease),box-shadow .2s var(--ease),background .2s}.btn:hover{transform:translate(2px,2px);box-shadow:3px 3px 0 var(--ink)}
.btn-primary{background:var(--accent);color:#fff;border-color:var(--ink)}.btn-primary:hover{background:var(--accent)}.btn-light{background:#fff}.bar .btn{border-radius:12px;box-shadow:3px 3px 0 var(--ink)}
.site-header{background:#fff;border-bottom:2.5px solid var(--ink)}.site-header.is-stuck{background:#fff}.mpanel{background:#fff}.brand{font-weight:700;letter-spacing:-.04em}.nav a{font-weight:700}
.f input,.f textarea{border:2.5px solid var(--ink);border-radius:14px;background:#fff}.f label{color:var(--ink)}
/* hero */
.hero{padding:clamp(96px,11vw,120px) 0 0;background:var(--sun);border-bottom:2.5px solid var(--ink);overflow:hidden}
.hero .hg{display:grid;grid-template-columns:1.1fr .9fr;gap:var(--gut);align-items:center;padding-bottom:clamp(36px,6vw,72px)}.hero .lead{color:var(--ink);margin:1.3rem 0 1.8rem}.cta-row{display:flex;flex-wrap:wrap;gap:.9rem}
.hero h1 em{background:#fff}.hero .eyebrow{background:#fff;border:2.5px solid var(--ink);border-radius:99px;padding:.55em 1em}
.vid-card{position:relative;aspect-ratio:1;border:2.5px solid var(--ink);border-radius:32px;overflow:hidden;box-shadow:8px 8px 0 var(--ink);background:#FFE9C7;transform:rotate(2deg)}.vid-card video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vid-card .prod{position:absolute;inset:0;display:grid;place-items:center}.vid-card .prod img{width:74%;height:74%;object-fit:cover;border-radius:50%;border:2.5px solid var(--ink);animation:bob 6s ease-in-out infinite}@keyframes bob{50%{transform:translateY(-12px) rotate(-3deg)}}
.stk{position:absolute;right:-14px;top:-14px;z-index:3;width:clamp(96px,12vw,140px);aspect-ratio:1;border-radius:50%;background:var(--pink);border:2.5px solid var(--ink);display:grid;place-items:center;text-align:center;font-weight:700;font-size:clamp(.78rem,1.1vw,.95rem);line-height:1.1;padding:.8rem;transform:rotate(12deg);animation:wob 5s ease-in-out infinite;box-shadow:3px 3px 0 var(--ink)}@keyframes wob{50%{transform:rotate(-6deg)}}
@media(max-width:860px){.hero .hg{grid-template-columns:1fr}.vid-card{max-width:440px;width:92%;margin:12px auto 0}}
/* marquee */
.mq{background:var(--ink);color:#fff;overflow:hidden;white-space:nowrap;border-bottom:2.5px solid var(--ink);padding:.9rem 0}.mq div{display:inline-flex;gap:2.4rem;animation:mq 30s linear infinite;font-weight:700;font-size:1.5rem;text-transform:uppercase;letter-spacing:-.01em}.mq span::after{content:"\\2736";margin-left:2.4rem;color:var(--sun)}@keyframes mq{to{transform:translateX(-50%)}}
/* promise */
.pro{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:clamp(40px,6vw,72px) 0}.pro div{border:2.5px solid var(--ink);border-radius:22px;padding:1.4rem;box-shadow:var(--sh)}.pro div:nth-child(1){background:var(--mint)}.pro div:nth-child(2){background:var(--pink)}.pro div:nth-child(3){background:var(--sun)}
.pro b{display:block;font-size:1.6rem;line-height:1.1;margin-bottom:.3rem;letter-spacing:-.02em}@media(max-width:720px){.pro{grid-template-columns:1fr}}
.sec{padding:clamp(56px,8vw,110px) 0}.head{display:flex;justify-content:space-between;align-items:end;gap:1.6rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,44px)}
/* tiles */
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.tile{display:grid;border:2.5px solid var(--ink);border-radius:26px;overflow:hidden;background:#fff;text-decoration:none;box-shadow:var(--sh);transition:transform .25s var(--ease),box-shadow .25s var(--ease)}.tile:hover{transform:translate(3px,3px) rotate(-.6deg);box-shadow:2px 2px 0 var(--ink)}
.tile .ph{aspect-ratio:1;overflow:hidden;border-bottom:2.5px solid var(--ink)}.tile img{width:100%;height:100%;object-fit:cover;transition:transform .8s var(--ease)}.tile:hover img{transform:scale(1.08)}.tile div.tx{padding:1rem 1.1rem 1.2rem}.tile p{margin:.3rem 0 0;color:var(--muted);font-size:.92rem}
@media(max-width:960px){.tiles{grid-template-columns:1fr 1fr}}@media(max-width:480px){.tiles{gap:12px}.tile div.tx{padding:.8rem}.tile h3{font-size:1.15rem}}
/* favourites band */
.band{background:var(--mint);border-block:2.5px solid var(--ink)}.favs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.fav{display:grid;grid-template-columns:1fr;border:2.5px solid var(--ink);border-radius:26px;overflow:hidden;background:#fff;box-shadow:var(--sh)}
.fav .ph{aspect-ratio:5/4;overflow:hidden;border-bottom:2.5px solid var(--ink)}.fav img{width:100%;height:100%;object-fit:cover}.fav .tx{padding:1.1rem 1.2rem 1.3rem}.fav .r{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.fav p{margin:.4rem 0 0;color:var(--muted)}
.price{font-weight:700;background:var(--sun);border:2px solid var(--ink);border-radius:99px;padding:.18em .7em;white-space:nowrap;font-size:.95rem}
@media(max-width:860px){.favs{grid-template-columns:1fr 1fr}.favs .fav:last-child{display:none}}@media(max-width:520px){.favs{grid-template-columns:1fr}.favs .fav:last-child{display:grid}}
/* story */
.story{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,6vw,80px);align-items:center}.story .ph{border:2.5px solid var(--ink);border-radius:32px;overflow:hidden;aspect-ratio:1;box-shadow:8px 8px 0 var(--ink);transform:rotate(-2deg)}.story img{width:100%;height:100%;object-fit:cover}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:2rem}.stats div{border:2.5px solid var(--ink);border-radius:18px;padding:.9rem 1rem;background:var(--pink);box-shadow:3px 3px 0 var(--ink)}.stats div:nth-child(2){background:var(--sun)}.stats div:nth-child(3){background:var(--mint)}.stats b{display:block;font-size:clamp(2rem,3.6vw,3rem);line-height:1;letter-spacing:-.04em}.stats span{font-size:.85rem}
@media(max-width:860px){.story{grid-template-columns:1fr}.story .ph{max-width:420px}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;counter-reset:s}.step{counter-increment:s;border:2.5px solid var(--ink);border-radius:26px;padding:1.5rem;background:#fff;box-shadow:var(--sh)}
.step::before{content:counter(s);display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:var(--accent);color:#fff;border:2.5px solid var(--ink);font-weight:700;font-size:1.4rem;margin-bottom:1.2rem}.step p{margin:.4rem 0 0;color:var(--muted)}@media(max-width:760px){.steps{grid-template-columns:1fr}}
/* order */
.ob{background:var(--pink);border-block:2.5px solid var(--ink)}.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(24px,5vw,72px);padding:clamp(24px,4vw,48px);border:2.5px solid var(--ink);border-radius:32px;background:#fff;box-shadow:8px 8px 0 var(--ink)}.order .hours{margin:1.2rem 0}.order address{font-style:normal;color:var(--muted)}
.hours th,.hours td{border-bottom:2px solid var(--ink)}.hours tr.is-today th,.hours tr.is-today td{color:var(--accent)}@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{background:var(--ink);color:#fff;padding:52px 0 30px}.foot .grid{display:grid;grid-template-columns:1.6fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:clamp(2rem,5vw,3.4rem);line-height:1;margin-bottom:.7rem;color:var(--sun)}.foot p{color:rgba(255,255,255,.75);margin:0}.foot address{font-style:normal;color:rgba(255,255,255,.75)}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}.foot .col b{color:var(--sun)}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.2rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.65);font-size:.85rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:clamp(100px,11vw,124px) 0 clamp(26px,4vw,44px);background:var(--sun);border-bottom:2.5px solid var(--ink)}.mhero .lead{color:var(--ink);margin-top:1.1rem}.chips{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.6rem}
.chips button{font:700 .95rem/1 var(--sans);padding:.8em 1.2em;border-radius:99px;border:2.5px solid var(--ink);background:#fff;cursor:pointer;box-shadow:3px 3px 0 var(--ink);transition:.2s}.chips button[aria-pressed=true]{background:var(--accent);color:#fff}
.mcat{padding:clamp(30px,5vw,56px) 0 0}.mcat[hidden]{display:none}.mcat>header{margin-bottom:1.2rem}.mcat>header p{margin:.3rem 0 0;color:var(--muted)}
.mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.mc{display:grid;align-content:start;border:2.5px solid var(--ink);border-radius:24px;overflow:hidden;background:#fff;box-shadow:var(--sh)}.mc .ph{aspect-ratio:1;overflow:hidden;border-bottom:2.5px solid var(--ink)}.mc img{width:100%;height:100%;object-fit:cover;transition:transform .8s var(--ease)}.mc:hover img{transform:scale(1.07)}
.mc .tx{padding:.9rem 1rem 1.1rem;display:grid;gap:.5rem}.mc .r{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline}.mc h3{font-size:1.15rem}.mc p{margin:0;color:var(--muted);font-size:.9rem}
.tags{display:flex;gap:.35rem;flex-wrap:wrap}.tag{font:700 .64rem/1 var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;border:2px solid var(--ink);background:#fff}.tag.star{background:var(--sun)}
@media(max-width:1000px){.mgrid{grid-template-columns:1fr 1fr}}@media(max-width:420px){.mgrid{gap:12px}.mc .r{flex-direction:column;gap:.3rem}}
`;

const ORDER = (pack, h) => `<section class="sec ob" id="order"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
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
  const words = pack.copy.motion.marquee.concat(pack.copy.motion.marquee).map((w) => `<span>${w}</span>`).join("");
  const tiles = cats.map((c) => `<a class="tile" href="menu.html#${c.id}" data-reveal><div class="ph">${img(c.art, c.name, { hint: pack.hint + " " + c.name.toLowerCase() })}</div><div class="tx"><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
  const favs = star.map((i, k) => `<article class="fav" data-reveal data-delay="${k * 100}"><div class="ph">${img(i.art, i.n, { w: 960, h: 768, hint: pack.hint + " " + i.n.toLowerCase() })}</div><div class="tx"><div class="r"><h3>${i.n}</h3><span class="price">${i.meta}</span></div><p>${i.d}</p></div></article>`).join("");
  const body = `
<section class="hero"><div class="wrap hg"><div><span class="eyebrow">${K.heroEyebrow}</span><h1 style="margin-top:1.3rem">${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn btn-light" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div>
<div class="vid-card">${video("market")}<div class="prod">${img(cats[0].art, cats[0].name, { role: "featured", w: 960, h: 1200, lazy: false, hint: pack.hint + " " + cats[0].name.toLowerCase() })}</div><div class="stk">${K.glass[0]}</div></div></div></section>
<div class="mq" aria-hidden="true"><div>${words}</div></div>
<div class="wrap"><div class="pro" data-reveal>${K.promise.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div></div>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.collection[0]}</span><h2 style="margin-top:.9rem">${K.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="tiles">${tiles}</div></div></section>
<section class="sec band"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:.9rem">${K.fav[1]}</h2></div></div><div class="favs">${favs}</div></div></section>
<section class="sec"><div class="wrap story"><div class="ph" data-reveal>${img(K.story.art, K.story.alt, { role: "featured", hint: K.story.hint })}</div>
<div data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:1rem 0 1.1rem">${K.story.h2}</h2><p class="lead">${K.story.lead}</p><div class="stats">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:.9rem">${K.process[1]}</h2></div></div><div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><header><h2>${c.name}</h2><p>${c.blurb}</p></header><div class="mgrid">${c.items.map((i) => `<article class="mc" data-reveal><div class="ph">${img(i.art || c.art, i.n, { hint: pack.hint + " " + i.n.toLowerCase() })}</div><div class="tx"><div class="r"><h3>${i.n}</h3><span class="price">${i.meta}</span></div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1 style="margin-top:1rem">${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div><div style="height:clamp(40px,6vw,80px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "market", themeColor: "#FFC93C", fonts: FONTS, media: B.mediaFor(pack, "market", "motion", "motion"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.market || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
