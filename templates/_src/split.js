"use strict";
/**
 * split (premium plus): a fixed colour-video panel on the left, the story scrolling on the right (a stacked hero on phones).
 * Deep green and cream, row-style lists, numbered promises and a vertical timeline. Two pages: Home and Menu.
 * Fonts: Gloock + Work Sans (SIL OFL). Pictures from the "gallery" set, the loop from the "motion" set.
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"],
];
const PRELOAD = ["assets/fonts/Gloock-Regular.ttf"];

const CSS = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#14261F;--muted:#5F6E66;--line:#E3E8E2;--soft:#F3F6F1;--accent:#1F6B4F;--pop:#E8A33A;--display:"Gloock",Georgia,serif;--sans:"Work Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(20px,4.5vw,64px);--max:760px;--panel:40vw;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
h1{font-size:clamp(2.8rem,5.6vw,5rem);line-height:1.02;letter-spacing:-.015em}h2{font-size:clamp(2rem,3.8vw,3rem);line-height:1.08}h3{font-size:1.3rem;line-height:1.2}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.8vw,1.2rem);color:var(--muted);max-width:32em}
.btn-primary{background:var(--accent);border-color:var(--accent)}.btn-primary:hover{background:var(--ink);border-color:var(--ink)}
/* shell: panel + content */
.shell{display:grid;grid-template-columns:var(--panel) 1fr;min-height:100vh}
.pan{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden;background:#FFE9C7;color:var(--ink)}.pan video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pan::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,244,225,.55) 0%,rgba(255,244,225,0) 32%,rgba(255,244,225,0) 60%,rgba(255,244,225,.7) 100%)}
.pan .pin{position:absolute;inset:0;z-index:2;padding:clamp(24px,3vw,44px);display:flex;flex-direction:column;justify-content:space-between}
.hero-art{position:absolute;inset:0;z-index:1;display:grid;place-items:center;pointer-events:none}.hero-art img{width:min(66%,360px);height:auto;aspect-ratio:1;object-fit:cover;border-radius:50%;border:8px solid #fff;box-shadow:0 30px 70px rgba(120,60,10,.28);animation:bob 7s ease-in-out infinite}@keyframes bob{50%{transform:translateY(-14px)}}
.pan .brand{font-size:clamp(2rem,3.4vw,3.2rem);line-height:1;margin:0;text-decoration:none}.pan .pcap{font-size:1rem;max-width:20em;margin:0;color:var(--ink)}
.pan .badge{align-self:flex-start;background:#fff;border-radius:99px;padding:.65em 1.1em;font-weight:700;font-size:.85rem;display:flex;gap:.6em;align-items:center;box-shadow:0 10px 30px rgba(20,38,31,.15)}.badge i{width:9px;height:9px;border-radius:50%;background:#2fb764;display:block}
.pan .badge{display:flex}@media(min-width:901px){.pan .badge{display:none}}
.main{min-width:0;background:#fff}.cw{max-width:var(--max);margin:0 auto;padding-inline:var(--gut)}
.site-header{left:var(--panel)}.site-header .brand{display:none}.site-header .nav{margin-left:auto}
@media(max-width:900px){:root{--panel:0px}.shell{grid-template-columns:1fr}.pan{position:relative;height:62svh;min-height:380px}.site-header{left:0}.site-header .brand{display:block;color:var(--ink)}.site-header:not(.is-stuck){color:var(--ink)}.hero-art{position:absolute;inset:0;z-index:1;display:grid;place-items:center;pointer-events:none}.hero-art img{width:min(66%,360px);height:auto;aspect-ratio:1;object-fit:cover;border-radius:50%;border:8px solid #fff;box-shadow:0 30px 70px rgba(120,60,10,.28);animation:bob 7s ease-in-out infinite}@keyframes bob{50%{transform:translateY(-14px)}}
.pan .brand{display:none}.pan .pin{justify-content:flex-end;gap:1rem}.pan .badge{display:flex}.hero-art img{width:min(62%,300px)}.pan .pcap{display:none}.pan::after{background:linear-gradient(180deg,rgba(255,244,225,.6) 0%,rgba(255,244,225,0) 30%,rgba(255,244,225,0) 70%,rgba(255,244,225,.7) 100%)}}
.sec{padding:clamp(52px,8vw,104px) 0}
/* hero text */
.hero{padding-top:clamp(112px,12vw,150px)}.hero .lead{margin:1.3rem 0 1.8rem}.cta-row{display:flex;flex-wrap:wrap;gap:.8rem}
@media(max-width:900px){.hero{padding-top:44px}}
/* promise */
.pro{list-style:none;margin:0;padding:0;counter-reset:p}.pro li{counter-increment:p;display:grid;grid-template-columns:3.2rem 1fr;gap:0 1rem;padding:1.3rem 0;border-top:1px solid var(--line);align-items:baseline}
.pro li::before{content:"0" counter(p);font:400 1.1rem/1 var(--display);color:var(--accent)}.pro b{font:400 1.35rem/1.2 var(--display)}.pro span{grid-column:2;color:var(--muted)}.pro li:last-child{border-bottom:1px solid var(--line)}
/* rows */
.head{display:flex;justify-content:space-between;align-items:end;gap:1.6rem;flex-wrap:wrap;margin-bottom:clamp(22px,4vw,40px)}
.rows{display:grid}.lrow{display:grid;grid-template-columns:clamp(84px,14vw,132px) 1fr auto;gap:1.2rem;align-items:center;padding:1rem 0;border-top:1px solid var(--line);text-decoration:none;transition:background .3s,padding .3s var(--ease)}.lrow:last-child{border-bottom:1px solid var(--line)}
.lrow:hover{background:var(--soft);padding-inline:.8rem}.lrow .ph{aspect-ratio:1;border-radius:18px;overflow:hidden;background:#fff;border:1px solid var(--line)}.lrow img{width:100%;height:100%;object-fit:cover}
.lrow p{margin:.25rem 0 0;color:var(--muted);font-size:.94rem}.price{font-weight:700;white-space:nowrap;color:var(--accent)}
@media(max-width:520px){.lrow{grid-template-columns:76px 1fr;}.lrow .price{grid-column:2}}
/* collection */
.cg{display:grid;grid-template-columns:1fr 1fr;gap:14px}.cgc{position:relative;display:grid;gap:.7rem;padding:12px 12px 20px;border-radius:24px;background:var(--soft);text-decoration:none;transition:transform .4s var(--ease)}.cgc:hover{transform:translateY(-4px)}
.cgc .ph{aspect-ratio:1/.8;border-radius:16px;overflow:hidden;background:#fff}.cgc img{width:100%;height:100%;object-fit:cover}.cgc h3{padding:0 .5rem}.cgc span{padding:0 .5rem;color:var(--muted);font-size:.9rem}
/* story */
.story .ph{border-radius:28px;overflow:hidden;aspect-ratio:4/3;background:#fff;border:1px solid var(--line);margin-bottom:1.8rem}.story img{width:100%;height:100%;object-fit:cover}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2rem;padding-top:1.6rem;border-top:1px solid var(--line)}.stats b{display:block;font:400 clamp(2rem,3.6vw,2.8rem)/1 var(--display);color:var(--accent)}.stats span{font-size:.88rem;color:var(--muted)}
/* timeline */
.tl{list-style:none;margin:0;padding:0 0 0 1.6rem;border-left:2px solid var(--line);display:grid;gap:1.8rem;counter-reset:s}.tl li{position:relative;counter-increment:s}
.tl li::before{content:counter(s);position:absolute;left:calc(-1.6rem - 15px);top:-2px;width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;font:700 .8rem/28px var(--sans);text-align:center}.tl p{margin:.3rem 0 0;color:var(--muted)}
/* order */
.order{display:grid;gap:1.6rem;padding:clamp(24px,4vw,44px);border-radius:28px;background:var(--soft)}.order .hours{margin:.8rem 0}.order address{font-style:normal;color:var(--muted)}.order .f input,.order .f textarea{border-color:transparent}
/* footer */
.foot{padding:48px 0 32px;border-top:1px solid var(--line);font-size:.95rem}.foot .grid{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem}.foot .brand{display:block;font-size:1.7rem;margin-bottom:.5rem}.foot p{color:var(--muted);margin:0}.foot address{font-style:normal;color:var(--muted)}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2rem;padding-top:1.2rem;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
@media(max-width:560px){.foot .grid{grid-template-columns:1fr}}
/* menu */
.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.6rem}.chips button{font:700 .86rem/1 var(--sans);padding:.85em 1.2em;border-radius:999px;border:1.5px solid var(--line);background:#fff;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.mcat{padding:clamp(30px,5vw,52px) 0 0}.mcat[hidden]{display:none}.mcat>header{margin-bottom:1rem}.mcat>header p{margin:.3rem 0 0;color:var(--muted)}
.mrow{display:grid;grid-template-columns:96px 1fr auto;gap:1rem;align-items:center;padding:.9rem 0;border-top:1px solid var(--line)}.mrow .ph{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#fff;border:1px solid var(--line)}.mrow img{width:100%;height:100%;object-fit:cover}.mrow h3{font-size:1.15rem}.mrow p{margin:.2rem 0 .4rem;color:var(--muted);font-size:.9rem}
.tags{display:flex;gap:.4rem;flex-wrap:wrap}.tag{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.42em .68em;border-radius:99px;background:var(--soft);color:var(--muted)}.tag.star{background:var(--pop);color:var(--ink)}
@media(max-width:520px){.mrow{grid-template-columns:70px 1fr}.mrow .price{grid-column:2}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-top:0"><div class="cw"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:.9rem 0 .7rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="cw"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;
const panel = (pack, K) => `<aside class="pan">${video("split")}<div class="hero-art">${img(pack.cats[0].art, pack.cats[0].name, { role: "featured", w: 960, h: 1200, lazy: false, hint: B.hintOf(pack, pack.cats[0]) })}</div><div class="pin"><a class="brand" href="index.html">${t("business_name")}</a><div class="badge"><i></i>${K.glass[0]} &middot; ${K.glass[1]}</div><p class="pcap">${t("tagline")}</p></div></aside>`;

function home(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const star = cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art }))).slice(0, 4);
  const rows = star.map((i) => `<a class="lrow" href="index.html#order" data-reveal><div class="ph">${img(i.art, i.n, { w: 480, h: 480, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}</h3><p>${i.d}</p></div><span class="price">${i.meta}</span></a>`).join("");
  const cg = cats.map((c) => `<a class="cgc" href="menu.html#${c.id}" data-reveal><div class="ph">${img(c.art, c.name, { w: 640, h: 512, hint: B.hintOf(pack, c) })}</div><h3>${c.name}</h3><span>${c.blurb}</span></a>`).join("");
  const body = `<div class="shell">${panel(pack, K)}<div class="main">
<section class="hero"><div class="cw"><span class="eyebrow">${K.heroEyebrow}</span><h1 style="margin-top:1.1rem">${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div></section>
<section class="sec" style="padding-bottom:0"><div class="cw"><ol class="pro" data-reveal>${K.promise.map(([b, s]) => `<li><b>${b}</b><span>${s}</span></li>`).join("")}</ol></div></section>
<section class="sec"><div class="cw"><div class="head"><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:.9rem">${K.fav[1]}</h2></div></div><div class="rows">${rows}</div></div></section>
<section class="sec" style="padding-top:0"><div class="cw"><div class="head"><div><span class="eyebrow">${K.collection[0]}</span><h2 style="margin-top:.9rem">${K.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="cg">${cg}</div></div></section>
<section class="sec" style="padding-top:0"><div class="cw story" data-reveal><div class="ph">${img(K.story.art, K.story.alt, { role: "featured", w: 960, h: 720, hint: K.story.hint })}</div><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:.9rem 0 1.1rem">${K.story.h2}</h2><p class="lead">${K.story.lead}</p>
<div class="stats">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="cw"><span class="eyebrow">${K.process[0]}</span><h2 style="margin:.9rem 0 1.8rem">${K.process[1]}</h2><ol class="tl">${K.process[2].map(([h, p]) => `<li data-reveal><h3>${h}</h3><p>${p}</p></li>`).join("")}</ol></div></section>
${ORDER(pack, K.orderHome)}
${foot()}</div></div>`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><header><h2>${c.name}</h2><p>${c.blurb}</p></header>${c.items.map((i) => `<div class="mrow" data-reveal><div class="ph">${img(i.art || c.art, i.n, { w: 320, h: 320, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}</h3><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div><span class="price">${i.meta}</span></div>`).join("")}</section>`).join("");
  const body = `<div class="shell">${panel(pack, K)}<div class="main">
<section class="hero"><div class="cw"><span class="eyebrow">${K.menuHero[0]}</span><h1 style="margin-top:1.1rem">${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="cw">${sec}</div><div style="height:clamp(40px,6vw,80px)"></div>
${ORDER(pack, K.orderMenu)}
${foot()}</div></div>`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "split", themeColor: "#FFFFFF", fonts: FONTS, media: B.mediaFor(pack, "split", "gallery", "motion"), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.split || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
