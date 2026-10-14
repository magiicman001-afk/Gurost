"use strict";
/**
 * linen (premium plus): warm paper, centred, classic. An arched looping-video window, menu-card lists with dotted leaders,
 * oval portraits and Roman-numeral steps. Two pages: Home and Menu. Fonts: Lora + Work Sans (SIL OFL).
 * Pictures and hero loop come from the "atelier" set (warm backgrounds, dark oven-lit loop).
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["Lora-OFL.txt", "OFL-Lora.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"],
];
const PRELOAD = ["assets/fonts/Lora-Regular.ttf"];

const CSS = `
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#2B2118;--muted:#76695C;--line:#E6DCC9;--soft:#F6EFE1;--paper:#FBF7EE;--accent:#8C3B2A;--sage:#5E7355;--display:"Lora",Georgia,serif;--sans:"Work Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(20px,5vw,56px);--max:1120px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--paper)}.site-header.is-stuck,.mpanel{background:rgba(251,247,238,.92)}.f input,.f textarea{background:var(--paper)}
h1{font-size:clamp(2.8rem,7vw,5.4rem);line-height:1.04;letter-spacing:-.015em}h2{font-size:clamp(2rem,4.4vw,3.2rem);line-height:1.1}h3{font-size:1.35rem;line-height:1.2}
h1 em,h2 em{color:var(--accent);font-style:italic}.lead{font-size:clamp(1.05rem,2vw,1.2rem);color:var(--muted);max-width:34em;margin-inline:auto}
.brand{font-style:italic}.btn{border-radius:4px;letter-spacing:.06em;text-transform:uppercase;font-size:.8rem}.bar .btn{border-radius:4px}.btn-primary{background:var(--accent);border-color:var(--accent)}.btn-primary:hover{background:var(--ink);border-color:var(--ink)}
.orn{display:flex;align-items:center;justify-content:center;gap:1rem;color:var(--accent);font:700 .74rem/1 var(--sans);letter-spacing:.2em;text-transform:uppercase}.orn::before,.orn::after{content:"";height:1px;width:clamp(28px,8vw,80px);background:currentColor;opacity:.5}
.ctr{text-align:center}.ctr .orn{margin-bottom:1.1rem}
/* hero */
.hero{padding:clamp(120px,14vw,160px) 0 0;text-align:center}.hero .lead{margin:1.4rem auto 2rem}.cta-row{display:flex;flex-wrap:wrap;gap:.8rem;justify-content:center}
.arch{position:relative;margin:clamp(36px,6vw,64px) auto 0;width:min(100%,860px);aspect-ratio:4/3.2;border-radius:999px 999px 18px 18px;overflow:hidden;background:#1a0f08;border:1px solid var(--ink);box-shadow:0 30px 70px rgba(60,35,10,.12)}
.arch video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.arch .badge{position:absolute;left:50%;bottom:7%;transform:translateX(-50%);background:var(--paper);border-radius:99px;padding:.7em 1.3em;font-weight:700;font-size:.85rem;white-space:nowrap;box-shadow:0 10px 30px rgba(60,35,10,.15);display:flex;align-items:center;gap:.6em;max-width:92%}
.badge i{width:9px;height:9px;border-radius:50%;background:var(--sage);display:block;flex:none}
@media(max-width:700px){.arch{aspect-ratio:4/5;border-radius:999px 999px 14px 14px}.arch .badge{white-space:normal;text-align:center}}
/* promise */
.promise{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;padding:clamp(48px,7vw,84px) 0;text-align:center}.promise b{display:block;font:italic 400 1.5rem/1.2 var(--display);margin-bottom:.35rem}.promise span{color:var(--muted)}
.promise div+div{border-left:1px solid var(--line)}@media(max-width:720px){.promise{grid-template-columns:1fr}.promise div+div{border-left:0;border-top:1px solid var(--line);padding-top:1.4rem}}
/* selection */
.sec{padding:clamp(56px,9vw,120px) 0}.head{margin-bottom:clamp(28px,5vw,56px)}
.sel{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,36px)}
.sc{display:grid;gap:1rem;text-align:center;justify-items:center}.sc .ph{width:100%;aspect-ratio:4/5;border-radius:999px 999px 16px 16px;overflow:hidden;background:var(--soft);border:1px solid var(--line)}.sc img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.sc:hover img{transform:scale(1.05)}
.sc p{margin:0;color:var(--muted);max-width:22em}.price{font-weight:700;color:var(--accent);white-space:nowrap}
@media(max-width:820px){.sel{grid-template-columns:1fr 1fr}.sel .sc:last-child{display:none}}@media(max-width:520px){.sel{grid-template-columns:1fr}.sel .sc:last-child{display:grid}.sc .ph{aspect-ratio:1/1.1}}
/* menu card */
.card{max-width:980px;margin:0 auto;padding:clamp(10px,1.2vw,14px);border:1px solid var(--ink);outline:1px solid var(--ink);outline-offset:-8px;background:var(--paper)}
.card-in{padding:clamp(28px,5vw,60px);display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px) clamp(32px,6vw,80px)}
.cc h3{font:italic 400 1.7rem/1 var(--display);color:var(--accent);margin-bottom:.4rem}.cc>p{margin:0 0 1rem;color:var(--muted);font-size:.92rem}
.li{display:grid;grid-template-columns:auto 1fr auto;align-items:baseline;gap:.5rem;padding:.5rem 0}.li b{font:400 1.05rem/1.3 var(--display)}.li i{border-bottom:2px dotted var(--line);transform:translateY(-4px)}.li .price{font-size:.95rem}
.li small{grid-column:1/-1;color:var(--muted);font-size:.86rem;margin-top:-.3rem}
@media(max-width:760px){.card-in{grid-template-columns:1fr}}
/* story */
.story{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(32px,7vw,96px);align-items:center}.story .ov{aspect-ratio:4/5;border-radius:50%;overflow:hidden;background:var(--soft);border:1px solid var(--line);max-width:420px;width:100%;justify-self:center}.story img{width:100%;height:100%;object-fit:cover}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2rem;padding-top:1.6rem;border-top:1px solid var(--line)}.stats b{display:block;font:italic 400 clamp(2.2rem,4.4vw,3.2rem)/1 var(--display);color:var(--accent)}.stats span{font-size:.88rem;color:var(--muted)}
@media(max-width:820px){.story{grid-template-columns:1fr;text-align:center}.story .lead{margin-inline:auto}.stats{text-align:center}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,40px);text-align:center;counter-reset:s}.step{counter-increment:s;padding:1.6rem 1rem;border-top:1px solid var(--ink)}
.step::before{content:counter(s,upper-roman);display:block;font:italic 400 2.4rem/1 var(--display);color:var(--accent);margin-bottom:1rem}.step p{margin:.5rem 0 0;color:var(--muted)}@media(max-width:760px){.steps{grid-template-columns:1fr}}
/* order */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,80px);padding:clamp(28px,5vw,60px);border:1px solid var(--ink);outline:1px solid var(--ink);outline-offset:-8px;background:var(--paper)}
.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{padding:56px 0 36px;border-top:1px solid var(--line);text-align:center;font-size:.95rem}.foot .brand{display:block;font-size:2.2rem;margin-bottom:.4rem}.foot p{color:var(--muted);margin:0 auto 1.6rem;max-width:28em}
.foot .row{display:flex;gap:2rem 3rem;justify-content:center;flex-wrap:wrap;margin-bottom:1.6rem}.foot .col{display:grid;gap:.4rem;justify-items:center}.foot address{font-style:normal;color:var(--muted)}
.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1.6rem;padding-top:1.4rem;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}@media(max-width:560px){.foot .base{justify-content:center;text-align:center}}
/* menu page */
.mhero{padding:150px 0 20px;text-align:center}.mhero .lead{margin:1.2rem auto 0}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:2rem;justify-content:center}
.chips button{font:700 .8rem/1 var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:.9em 1.3em;border-radius:4px;border:1px solid var(--line);background:var(--paper);cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}
.mcat{max-width:980px;margin:0 auto;padding:clamp(32px,5vw,56px) 0;border-bottom:1px solid var(--line)}.mcat[hidden]{display:none}
.mcat>header{display:grid;grid-template-columns:150px 1fr;gap:1.6rem;align-items:center;margin-bottom:1.8rem}.mcat .ov{aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--soft);border:1px solid var(--line)}.mcat .ov img{width:100%;height:100%;object-fit:cover}
.mcat h2{font-size:clamp(1.8rem,4vw,2.6rem)}.mcat header p{margin:.3rem 0 0;color:var(--muted)}.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(28px,6vw,72px)}
.mi{padding:.9rem 0;border-bottom:1px dotted var(--line)}.mi .r{display:grid;grid-template-columns:auto 1fr auto;gap:.5rem;align-items:baseline}.mi h3{font:400 1.12rem/1.3 var(--display)}.mi .r i{border-bottom:2px dotted var(--line);transform:translateY(-4px)}.mi p{margin:.2rem 0 .4rem;color:var(--muted);font-size:.9rem}
.tags{display:flex;gap:.4rem}.tag{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.4em .65em;border-radius:3px;background:var(--soft);color:var(--muted)}.tag.star{background:var(--accent);color:#fff}
@media(max-width:760px){.mgrid{grid-template-columns:1fr}.mcat>header{grid-template-columns:90px 1fr}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-top:0"><div class="wrap"><div class="order" data-reveal>
<div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div>
<div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p>
<div class="row"><div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const star = cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art }))).slice(0, 3);
  const sel = star.map((i, k) => `<article class="sc" data-reveal data-delay="${k * 100}"><div class="ph">${img(i.art, i.n, { hint: pack.hint + " " + i.n.toLowerCase() })}</div><h3>${i.n}</h3><p>${i.d}</p><span class="price">${i.meta}</span></article>`).join("");
  const card = cats.map((c) => `<div class="cc"><h3>${c.name}</h3><p>${c.blurb}</p>${c.items.slice(0, 3).map((i) => `<div class="li"><b>${i.n}</b><i></i><span class="price">${i.meta}</span></div>`).join("")}</div>`).join("");
  const body = `
<section class="hero"><div class="wrap"><div class="orn">${K.heroEyebrow}</div><h1 style="margin-top:1.2rem">${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div>
<div class="arch">${video("linen")}<div class="badge"><i></i>${K.glass[0]} &middot; ${K.glass[1]}</div></div></div></section>
<div class="wrap"><div class="promise" data-reveal>${K.promise.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join("")}</div></div>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head ctr"><div class="orn">${K.fav[0]}</div><h2>${K.fav[1]}</h2></div><div class="sel">${sel}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head ctr"><div class="orn">${K.collection[0]}</div><h2>${K.collection[1]}</h2></div><div class="card" data-reveal><div class="card-in">${card}</div></div>
<p class="ctr" style="margin-top:2rem"><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></p></div></section>
<section class="sec" style="padding-top:0"><div class="wrap story"><div class="ov" data-reveal>${img(K.story.art, K.story.alt, { role: "featured", hint: K.story.hint })}</div>
<div data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:1rem 0 1.2rem">${K.story.h2}</h2><p class="lead" style="margin-left:0">${K.story.lead}</p>
<div class="stats">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head ctr"><div class="orn">${K.process[0]}</div><h2>${K.process[1]}</h2></div>
<div class="steps">${K.process[2].map(([h, p], i) => `<div class="step" data-reveal${i ? ` data-delay="${i * 100}"` : ""}><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><header><div class="ov">${img(c.art, c.name, { w: 400, h: 400, hint: pack.hint + " " + c.name.toLowerCase() })}</div><div><h2>${c.name}</h2><p>${c.blurb}</p></div></header>
<div class="mgrid">${c.items.map((i) => `<div class="mi" data-reveal><div class="r"><h3>${i.n}</h3><i></i><span class="price">${i.meta}</span></div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><div class="orn">${K.menuHero[0]}</div><h1 style="margin-top:1.1rem">${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div>
<div style="height:clamp(40px,6vw,80px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "linen", themeColor: "#FBF7EE", fonts: FONTS, media: B.mediaFor(pack, "linen", "atelier", "atelier"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.linen || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
