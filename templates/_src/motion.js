"use strict";
/**
 * bakery-motion (premium plus): loud and kinetic on a white page. Giant condensed type with a looping colour video showing
 * through the letters, marquee, tilting tiles, hover-preview menu rows and a footer wordmark that fits any name.
 * Two pages: Home and Menu. Fonts: Big Shoulders + Instrument Sans (SIL OFL).
 */
const B = require("./plus-base");
const { t, img, video, footerBits } = B;

const FONTS = [
  ["BigShoulders-Bold.ttf", "BigShoulders-Bold.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["BigShoulders-OFL.txt", "OFL-BigShoulders.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const media = (pack) => [
  ...pack.media.motifs.map((n) => [`${pack.mediaDir}/img/motion/${n}.webp`, `img/${n}.webp`]),
  [`${pack.mediaDir}/video/motion-hero.mp4`, "video/motion-hero.mp4"], [`${pack.mediaDir}/video/motion-hero.webm`, "video/motion-hero.webm"], [`${pack.mediaDir}/video/motion-poster.webp`, "video/motion-poster.webp"],
];
const PRELOAD = ["assets/fonts/BigShoulders-Bold.ttf"];

const CSS = `
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#14110F;--muted:#6A625A;--line:#EBE5DD;--soft:#F7F3EE;--accent:#D63A1F;--butter:#FFC93C;--display:"Big Shoulders","Arial Narrow",Impact,sans-serif;--sans:"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(18px,4.5vw,56px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
h1,h2,h3{font-weight:700;text-transform:uppercase;letter-spacing:-.005em;line-height:.9}
h2{font-size:clamp(3rem,8vw,7rem)}h3{font-size:1.9rem;line-height:1}h2 em{font-style:normal;color:var(--accent)}
.brand{font-weight:700;font-size:1.9rem;text-transform:uppercase;letter-spacing:.01em}.nav a{text-transform:uppercase;letter-spacing:.08em;font-size:.82rem}
.btn{border-radius:12px;text-transform:uppercase;letter-spacing:.08em;font-size:.82rem}.bar .btn{border-radius:10px}
.lead{font-size:clamp(1.05rem,2vw,1.3rem);color:var(--muted);max-width:30em}
/* knock-out hero: white mask with black letters, lighten blend lets the video show through the letters */
.kn{position:relative;isolation:isolate;margin-top:72px;overflow:hidden;background:#000}
.kn video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.kn .mask{position:relative;z-index:1;background:#fff;mix-blend-mode:lighten;padding:clamp(10px,2vw,28px) var(--gut) clamp(14px,2.4vw,34px)}
.kn h1{margin:0;color:#000;font-size:clamp(5rem,28vw,34rem);line-height:.8;letter-spacing:-.01em;white-space:nowrap}.kn h1 span{display:inline-block}
.kn .row2{display:flex;justify-content:space-between;align-items:end;gap:1rem}
.under{display:grid;grid-template-columns:1.3fr auto;gap:2rem;align-items:end;padding-block:clamp(28px,4vw,48px)}.under .lead{margin:0}.cta-row{display:flex;flex-wrap:wrap;gap:.8rem}
.under .eb{display:block;margin-bottom:.9rem}
@media(max-width:800px){.under{grid-template-columns:1fr}}
/* marquee */
.mq{overflow:hidden;background:var(--ink);color:#fff;padding:1rem 0;white-space:nowrap}.mq div{display:inline-flex;gap:2rem;animation:mq 30s linear infinite;font:700 clamp(2rem,4vw,3.2rem)/1 var(--display);text-transform:uppercase}
.mq span{display:inline-flex;align-items:center;gap:2rem}.mq span::after{content:"";width:.5em;height:.5em;border-radius:50%;background:var(--butter)}@keyframes mq{to{transform:translateX(-50%)}}
/* tiles */
.head{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,48px)}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:clamp(12px,2vw,24px)}
.tile{position:relative;border-radius:28px;overflow:hidden;aspect-ratio:1/1;display:flex;align-items:flex-end;padding:clamp(18px,3vw,32px);text-decoration:none;color:#fff;isolation:isolate;transition:transform .4s var(--ease),box-shadow .4s;will-change:transform}
.tile:hover{box-shadow:0 30px 60px rgba(20,17,15,.2)}.tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;transition:transform 1.2s var(--ease)}.tile:hover img{transform:scale(1.07)}
.tile h3{font-size:clamp(2.4rem,6vw,4.6rem);color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.25)}.tile p{margin:.4rem 0 0;color:rgba(255,255,255,.92);font-size:.95rem;text-shadow:0 1px 12px rgba(0,0,0,.3)}
.tile .n{position:absolute;top:clamp(16px,2.5vw,28px);left:clamp(18px,3vw,32px);font:700 1.2rem/1 var(--display);background:#fff;color:var(--ink);padding:.45em .7em;border-radius:99px}
@media(max-width:620px){.tiles{grid-template-columns:1fr}}
/* numbers */
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;border-top:3px solid var(--ink)}.nums div{padding:1.4rem 0}.nums b{display:block;font:700 clamp(4.5rem,14vw,12rem)/.85 var(--display);color:var(--ink)}.nums div:nth-child(2) b{color:var(--accent)}.nums span{font-weight:700;text-transform:uppercase;letter-spacing:.1em;font-size:.82rem;color:var(--muted)}
@media(max-width:620px){.nums{grid-template-columns:1fr 1fr}.nums div:last-child{grid-column:1/-1}}
/* order */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(24px,6vw,90px);padding:clamp(24px,5vw,60px);border-radius:32px;background:var(--butter)}
.order h2{margin:.9rem 0 1rem}.order .lead{color:#3b2f10}.order .eyebrow{color:var(--ink)}.order .eyebrow::before{background:var(--ink)}
.order .hours th{color:#3b2f10}.order .hours th,.order .hours td{border-color:rgba(20,17,15,.18)}.order .hours tr.is-today th,.order .hours tr.is-today td{color:var(--ink);text-decoration:underline;text-underline-offset:4px}.order .hours{margin:1.4rem 0}
.order address{font-style:normal}.order .f input,.order .f textarea{border-color:transparent;background:#fff}.order .f label{color:#3b2f10}
.order .btn-primary:hover{background:#fff;color:var(--ink);border-color:#fff}
@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{padding:56px 0 28px;font-size:.95rem;overflow:hidden}.foot .grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:2rem}.foot p{color:var(--muted);max-width:24em;margin:0}.foot address{font-style:normal;color:var(--muted)}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}
.big{margin-top:2.4rem;font:700 100px/.8 var(--display);text-transform:uppercase;white-space:nowrap;letter-spacing:-.01em;display:block;width:100%}.big span{display:inline-block}
.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1.6rem;padding-top:1.2rem;border-top:3px solid var(--ink);color:var(--muted);font-size:.85rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:140px 0 24px}.mhero h1{font-size:clamp(6rem,24vw,20rem);line-height:.78;margin:0}.mhero h1 em{font-style:normal;color:var(--accent)}.mhero .lead{margin-top:1.4rem}
.chips{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.8rem}.chips button{font:700 .8rem/1 var(--sans);text-transform:uppercase;letter-spacing:.08em;padding:.95em 1.3em;border-radius:12px;border:1.5px solid var(--ink);background:#fff;cursor:pointer;transition:.25s}
.chips button[aria-pressed=true]{background:var(--ink);color:#fff}
.mlayout{display:grid;grid-template-columns:1fr minmax(280px,420px);gap:clamp(24px,5vw,80px);align-items:start}
.mprev{position:sticky;top:96px;aspect-ratio:1;border-radius:30px;overflow:hidden;background:var(--soft)}.mprev img{width:100%;height:100%;object-fit:cover;transition:opacity .3s}
.mcat{padding:clamp(24px,4vw,44px) 0 0}.mcat[hidden]{display:none}.mcat>h2{font-size:clamp(2.6rem,6vw,4.4rem);display:flex;gap:1rem;align-items:baseline;border-bottom:3px solid var(--ink);padding-bottom:.4rem}.mcat>h2 small{font:400 1rem/1.3 var(--sans);text-transform:none;color:var(--muted);letter-spacing:0}
.mrow{display:grid;grid-template-columns:1fr auto;gap:.3rem 1.2rem;align-items:center;padding:1.2rem .6rem;border-bottom:1px solid var(--line);transition:background .25s,padding .3s var(--ease);cursor:default}
.mrow .th{grid-row:span 3;width:64px;height:64px;border-radius:14px;overflow:hidden;display:none}.mrow .th img{width:100%;height:100%;object-fit:cover}
.mrow h3{font-size:clamp(1.9rem,3.4vw,2.8rem)}.mrow .price{font:700 1.7rem/1 var(--display)}.mrow p{grid-column:1/-1;margin:0;color:var(--muted);font-size:.95rem}.mrow .tags{grid-column:1/-1;display:flex;gap:.4rem;margin-top:.3rem}
.mrow.act,.mrow:hover{background:var(--soft);padding-left:1.4rem}.mrow.act h3{color:var(--accent)}
.tag{font:700 .66rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:var(--soft);color:var(--muted)}.tag.star{background:var(--butter);color:var(--ink)}
@media(max-width:900px){.mlayout{grid-template-columns:1fr}.mprev{display:none}.mrow{grid-template-columns:64px 1fr auto}.mrow .th{display:block}.mrow p,.mrow .tags{grid-column:2/-1}}
`;

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-top:0"><div class="wrap"><div class="order" data-reveal>
<div><span class="eyebrow">${pack.order.eyebrow}</span><h2>${h}</h2><p class="lead">${pack.copy.motion.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div>
<div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid">
<div><b>${t("business_name")}</b><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div>
<div class="col"><b>Follow</b>${f.social}<b style="margin-top:.8rem">Legal</b>${f.legal}</div></div>
<div class="big" data-fit aria-hidden="true"><span>${t("business_name")}</span></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;

function home(pack) {
  const K = pack.copy.motion, cats = pack.cats;
  const tiles = cats.map((c, i) => `<a class="tile" data-tilt data-reveal data-delay="${(i % 2) * 90}" href="menu.html#${c.id}">${img(c.art, c.name, { role: i === 0 ? "featured" : "secondary", w: 1000, h: 1000, hint: pack.hint + " " + c.name.toLowerCase() })}<span class="n">0${i + 1}</span><div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
  const words = K.marquee.map((w) => `<span>${w}</span>`).join("");
  const body = `
<section class="kn">${video("motion")}<div class="mask"><h1 data-fitlines>${K.heroLines.map((l) => `<span>${l}</span>`).join("<br>")}</h1></div></section>
<div class="wrap under"><div><span class="eyebrow eb">${K.heroEyebrow || "{{city}} &middot; Since {{year_founded}}"}</span><p class="lead">${t("tagline")}</p></div><div class="cta-row"><a class="btn btn-primary" href="${K.cta1Href || "#order"}"><span>${K.cta1}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div></div>
<div class="mq" aria-hidden="true"><div>${words}${words}${words}${words}</div></div>
<section class="sec"><div class="wrap"><div class="head"><h2 data-reveal>${K.tiles[0]}</h2><a class="btn" href="menu.html"><span>${K.tiles[1]}</span></a></div><div class="tiles">${tiles}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nums" data-reveal>${K.nums.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div>
<p class="lead" style="margin-top:2rem" data-reveal>${K.about}</p></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.motion, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = cats.map((c) => `<section class="mcat" id="${c.id}" data-cat="${c.id}"><h2>${c.name} <small>${c.blurb}</small></h2>${c.items.map((i) => {
    const a = i.art || c.art;
    return `<article class="mrow" tabindex="0" data-preview="assets/img/${a}.webp"><div class="th">${img(a, i.n, { w: 200, h: 200, hint: pack.hint + " " + i.n.toLowerCase() })}</div><h3>${i.n}</h3><span class="price">${i.meta}</span><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${pack.tags[x]}">${x}</span>`).join("")}</div></article>`;
  }).join("")}</section>`).join("");
  const first = cats[0].art;
  const body = `<section class="mhero"><div class="wrap"><h1>${K.menuHero[0]}</h1><p class="lead">${K.menuHero[1]}</p><div class="chips">${chips}</div></div></section>
<div class="sec" style="padding-top:20px"><div class="wrap"><div class="mlayout"><div>${sec}</div><div class="mprev"><img data-preview-img src="assets/img/${first}.webp" alt="Preview of the item you point at" width="1000" height="1000" data-gurost-image="${pack.hint} ${first}" data-gurost-image-role="featured"></div></div></div></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/bakery")) {
  return { name: "motion", themeColor: "#FFFFFF", fonts: FONTS, media: media(pack), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + pack.css.motion, "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
