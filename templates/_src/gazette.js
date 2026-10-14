"use strict";
/**
 * gazette (premium plus, built for rescue and community sites): a front page. Newsprint paper, a big masthead, a lead story with a
 * photograph and an "in this issue" column, then the animals as classified ads set in newspaper columns, a story in two columns
 * with a drop cap and a "by the numbers" box, ruled steps and a classified-style enquiry form. Favourites get an ink stamp that
 * lands on scroll. The second page is the register: one ruled table per kind of animal. Two pages: Home and Our animals.
 * Fonts: IBM Plex Serif + IBM Plex Mono (SIL OFL). Pictures from the "gallery" set. No hero loop: a newspaper does not move.
 */
const B = require("./plus-base");
const { t, img, footerBits } = B;

const FONTS = [
  ["IBMPlexSerif-Regular.ttf", "IBMPlexSerif-Regular.ttf"], ["IBMPlexSerif-Bold.ttf", "IBMPlexSerif-Bold.ttf"], ["IBMPlexSerif-Italic.ttf", "IBMPlexSerif-Italic.ttf"],
  ["IBMPlexMono-Regular.ttf", "IBMPlexMono-Regular.ttf"], ["IBMPlexMono-OFL.txt", "OFL-IBMPlex.txt"],
];
const PRELOAD = ["assets/fonts/IBMPlexSerif-Bold.ttf"];

const CSS = `
@font-face{font-family:"IBM Plex Serif";src:url(fonts/IBMPlexSerif-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"IBM Plex Serif";src:url(fonts/IBMPlexSerif-Bold.ttf) format("truetype");font-weight:700;font-style:normal;font-display:swap}
@font-face{font-family:"IBM Plex Serif";src:url(fonts/IBMPlexSerif-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url(fonts/IBMPlexMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
:root{--ink:#16130F;--muted:#5E574B;--line:#16130F;--hair:#CFC6B2;--paper:#F4EEE0;--soft:#EBE3D0;--accent:#B5301B;--display:"IBM Plex Serif",Georgia,serif;--sans:"IBM Plex Serif",Georgia,serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--gut:clamp(16px,3.4vw,40px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--paper);font:400 clamp(1rem,1.1vw,1.08rem)/1.6 var(--sans)}
h1,h2,h3{font-weight:700;letter-spacing:-.02em}h1{font-size:clamp(2.4rem,6vw,5.2rem);line-height:.98}h2{font-size:clamp(1.8rem,3.6vw,3rem);line-height:1.02}h3{font-size:1.25rem;line-height:1.15}
h1 em,h2 em{font-style:italic;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.4vw,1.25rem);color:var(--muted)}
.mono,.eyebrow,.btn,.nav a,.f label,.chips button,.hours,.foot .base,.kick{font-family:var(--mono)}
.eyebrow{font-size:.72rem;letter-spacing:.08em;color:var(--ink)}.eyebrow::before{border-radius:0;background:var(--accent)}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.06em;font-size:.76rem;border-color:var(--ink)}.btn-primary{background:var(--ink);color:var(--paper)}.btn-primary:hover{background:var(--accent);border-color:var(--accent)}.bar .btn{border-radius:0}
.brand{font-weight:700}.nav a{text-transform:uppercase;letter-spacing:.06em;font-size:.76rem}.f input,.f textarea{border-radius:0;border-color:var(--ink);background:#FBF8EF}
.site-header.is-stuck,.mpanel{background:rgba(244,238,224,.95)}
/* masthead */
.mast{padding:clamp(94px,10vw,116px) 0 0;text-align:center}.mast .top{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font:400 .72rem/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;border-block:1px solid var(--ink);padding:.55rem 0}
.mast .nm{font:700 clamp(2.6rem,9.4vw,8.4rem)/.92 var(--display);letter-spacing:-.04em;margin:clamp(14px,2.4vw,28px) 0 .4rem}.mast .sub{font:italic 400 clamp(1rem,1.6vw,1.3rem)/1.3 var(--display);color:var(--muted);margin:0 0 clamp(14px,2vw,24px)}
.mast .rule{height:7px;border-block:1px solid var(--ink);border-bottom-width:3px;margin-bottom:0}
/* front page */
.front{display:grid;grid-template-columns:1fr 2.2fr 1fr;gap:0;padding:clamp(18px,3vw,36px) 0;text-align:left}.front>div{padding:0 clamp(14px,2.2vw,30px)}.front>div+div{border-left:1px solid var(--ink)}.front>div:first-child{padding-left:0}.front>div:last-child{padding-right:0}
.kick{display:block;font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:.6rem}.lede h1{margin:.4rem 0 1rem}.lede .ph{aspect-ratio:3/2;overflow:hidden;background:var(--soft);margin:1.2rem 0 .5rem}.lede img{width:100%;height:100%;object-fit:cover;filter:grayscale(.15) contrast(1.02)}
.cap{font:400 .72rem/1.4 var(--mono);letter-spacing:.04em;color:var(--muted)}.cta-row{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem}
.toc{list-style:none;margin:0;padding:0}.toc li{border-bottom:1px solid var(--hair);padding:.7rem 0}.toc a{text-decoration:none;display:flex;justify-content:space-between;gap:1rem;font-weight:700}.toc a:hover{color:var(--accent)}.toc small{font:400 .72rem/1 var(--mono);color:var(--muted);align-self:center}
.box{border:3px double var(--ink);padding:1rem 1.1rem;margin-top:1.4rem;text-align:center}.box b{display:block;font-size:1.3rem;line-height:1.1;margin-bottom:.4rem}.box p{font-size:.92rem;margin:0 0 .8rem;color:var(--muted)}
@media(max-width:980px){.front{grid-template-columns:1fr}.front>div,.front>div+div{padding:0;border-left:0}.front>div+div{border-top:1px solid var(--ink);margin-top:1.4rem;padding-top:1.4rem}.lede{order:-1}}
/* classifieds */
.sec{padding:clamp(40px,6vw,80px) 0}.sh{display:flex;justify-content:space-between;align-items:end;gap:1.4rem;flex-wrap:wrap;border-bottom:3px double var(--ink);padding-bottom:.8rem;margin-bottom:1.4rem}.sh h2{margin-top:.4rem}
.ads{column-count:3;column-gap:clamp(16px,2.4vw,32px);column-rule:1px solid var(--hair)}.ad{break-inside:avoid;border:1px solid var(--ink);padding:.9rem 1rem 1rem;margin:0 0 clamp(14px,2vw,22px);background:#FBF8EF;position:relative;transition:transform .4s var(--ease),box-shadow .4s}.ad:hover{transform:translate(-3px,-3px);box-shadow:5px 5px 0 var(--ink)}
.ad .ph{aspect-ratio:4/3;overflow:hidden;background:var(--soft);margin-bottom:.7rem}.ad img{width:100%;height:100%;object-fit:cover;filter:grayscale(.2)}.ad h3{font-size:1.1rem;text-transform:uppercase;letter-spacing:.02em}.ad h3 span{font:400 .74rem/1 var(--mono);letter-spacing:.02em;text-transform:none;color:var(--muted);margin-left:.4rem}.ad p{margin:.4rem 0 .6rem;font-size:.95rem}
.ad .mini{font:400 .68rem/1.4 var(--mono);letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}.ad a.enq{font:700 .74rem/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;border-bottom:2px solid var(--accent);text-decoration:none;display:inline-block;margin-top:.7rem}
.stamp{position:absolute;right:10px;top:12px;font:700 .8rem/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);border:3px solid var(--accent);padding:.35em .55em;transform:rotate(-9deg);opacity:0;mix-blend-mode:multiply;background:rgba(244,238,224,.4)}.ad.in .stamp{animation:stamp .5s .35s var(--ease) both}@keyframes stamp{0%{opacity:0;transform:rotate(-9deg) scale(2.2)}60%{opacity:1;transform:rotate(-9deg) scale(.94)}100%{opacity:.92;transform:rotate(-9deg) scale(1)}}
@media(max-width:900px){.ads{column-count:2}}@media(max-width:560px){.ads{column-count:1}}
/* story */
.story{display:grid;grid-template-columns:2fr 1fr;gap:clamp(20px,4vw,56px)}.story .cols{column-count:2;column-gap:2rem;column-rule:1px solid var(--hair);font-size:1.02rem}.story .cols p::first-letter{float:left;font:700 4.1em/.78 var(--display);padding:.06em .1em 0 0;color:var(--accent)}
.nums{border:1px solid var(--ink);align-self:start}.nums h3{font:700 .74rem/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;padding:.8rem 1rem;background:var(--ink);color:var(--paper)}.nums div{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;padding:.9rem 1rem;border-bottom:1px solid var(--hair)}.nums div:last-child{border:0}.nums b{font:700 2.4rem/1 var(--display);letter-spacing:-.03em}.nums span{font:400 .72rem/1.2 var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);text-align:right}
@media(max-width:860px){.story{grid-template-columns:1fr}.story .cols{column-count:1}}
/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr)}.st{padding:0 clamp(14px,2.4vw,32px)}.st:first-child{padding-left:0}.st+.st{border-left:1px solid var(--ink)}.st b{font:700 4rem/.9 var(--display);color:var(--accent);display:block}.st h3{margin:.5rem 0 .3rem}.st p{margin:0;color:var(--muted)}
@media(max-width:720px){.steps{grid-template-columns:1fr}.st,.st+.st{padding:1rem 0;border-left:0;border-top:1px solid var(--ink)}}
/* order + footer */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(22px,5vw,72px);border:3px double var(--ink);padding:clamp(20px,4vw,52px);background:#FBF8EF}.order .hours{margin:1.2rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{border-top:3px double var(--ink);padding:40px 0 28px;margin-top:clamp(40px,6vw,80px);font-size:.98rem}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:2rem;margin-bottom:.4rem}.foot p,.foot address{color:var(--muted);font-style:normal;margin:0}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:400 .7rem/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2rem;padding-top:1rem;border-top:1px solid var(--hair);color:var(--muted);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* register page */
.mh{padding:clamp(110px,12vw,140px) 0 0}.mh h1{margin:.8rem 0 .8rem}.chips{display:flex;gap:.4rem;flex-wrap:wrap;margin:1.4rem 0 0}.chips button{font:400 .74rem/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;padding:.9em 1.2em;border:1px solid var(--ink);background:transparent;cursor:pointer;transition:.2s}.chips button[aria-pressed=true]{background:var(--ink);color:var(--paper)}
.reg{padding-top:clamp(26px,4vw,48px)}.reg[hidden]{display:none}.reg h2{border-bottom:3px double var(--ink);padding-bottom:.5rem}.reg .bl{color:var(--muted);margin:.5rem 0 1rem}
table.rt{width:100%;border-collapse:collapse;font-size:.98rem}.rt th{font:400 .68rem/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;text-align:left;color:var(--muted);padding:.5rem .6rem .5rem 0;border-bottom:1px solid var(--ink)}.rt td{padding:.8rem .6rem .8rem 0;border-bottom:1px solid var(--hair);vertical-align:top}.rt td:first-child{font:400 .74rem/1.9 var(--mono);color:var(--accent);width:3rem}.rt td b{font-size:1.15rem}.rt .tg{font:400 .66rem/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--ink);padding:.3em .5em;margin-right:.3rem;display:inline-block}
@media(max-width:720px){.rt thead{display:none}.rt,.rt tbody,.rt tr,.rt td{display:block}.rt tr{padding:.8rem 0;border-bottom:1px solid var(--hair)}.rt td{border:0;padding:.1rem 0}.rt td:first-child{width:auto}}
`;

const pad = (n) => String(n).padStart(2, "0");
const strip = (s) => String(s).replace(/&middot;/g, "·");
const animals = (pack) => pack.cats.flatMap((c) => c.items.map((i) => ({ ...i, art: i.art || c.art, kind: c.name, cid: c.id })));

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-bottom:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

function home(pack) {
  const K = pack.copy.atelier, list = animals(pack), lead = list.find((i) => i.star) || list[0];
  const ads = list.map((i, k) => `<article class="ad" data-reveal data-delay="${(k % 3) * 80}">${i.star ? '<span class="stamp">Favourite</span>' : ""}${k % 2 === 0 ? `<div class="ph">${img(i.art, i.n, { w: 640, h: 480, hint: B.hintOf(pack, i) })}</div>` : ""}<h3>${i.n}<span>${strip(i.meta)}</span></h3><p>${i.d}</p><div class="mini">${i.kind}${i.tags.length ? " &middot; " + i.tags.map((x) => pack.tags[x]).join(", ") : ""}</div><a class="enq" href="#order">Enquire about ${i.n}</a></article>`).join("");
  const toc = [[K.fav[1].replace(/<[^>]+>/g, ""), "#wanted", "p.2"], [K.story.eyebrow, "#story", "p.4"], [K.process[0], "#how", "p.5"], [K.cta1, "#order", "p.6"]].map(([a, h, p]) => `<li><a href="${h}"><span>${a}</span><small>${p}</small></a></li>`).join("");
  const body = `
<section class="mast"><div class="wrap"><div class="top"><span>${K.heroEyebrow}</span><span>${K.glass[0]}</span><span data-today></span></div>
<div class="nm">${t("business_name")}</div><p class="sub">${t("tagline")}</p><div class="rule"></div>
<div class="front"><div><span class="kick">In this issue</span><ul class="toc">${toc}</ul><div class="box"><b>${K.cta1}</b><p>${K.glass[2]}</p><a class="btn btn-primary" href="#order"><span>${K.cta1}</span></a></div></div>
<div class="lede"><span class="kick">${K.fav[0]}</span><h1>${K.heroH1}</h1><p class="lead">${K.story.lead}</p><div class="ph">${img(lead.art, lead.n, { role: "featured", w: 900, h: 600, hint: B.hintOf(pack, lead), lazy: false })}</div><div class="cap">${lead.n}, ${strip(lead.meta)}. ${lead.d}</div><div class="cta-row"><a class="btn btn-primary" href="#wanted"><span>${K.collection[2]}</span></a><a class="btn" href="${K.cta2Href || "#order"}"><span>${K.cta2}</span></a></div></div>
<div><span class="kick">${K.stats[2][2]}</span><div class="nums" style="margin-top:.4rem"><h3>By the numbers</h3>${K.stats.map(([v, s, l]) => `<div><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></div></div></section>
<section class="sec" id="wanted"><div class="wrap"><div class="sh"><div><span class="eyebrow">${K.fav[0]}</span><h2>${K.fav[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div><div class="ads">${ads}</div></div></section>
<section class="sec" id="story" style="padding-top:0"><div class="wrap"><div class="sh"><div><span class="eyebrow">${K.story.eyebrow}</span><h2>${K.story.h2}</h2></div></div><div class="story"><div class="cols" data-reveal><p>${K.story.lead}</p><p>${pack.cats.map((c) => c.blurb).join(" ")}</p></div><figure style="margin:0" data-reveal><div class="ph" style="aspect-ratio:4/5;overflow:hidden;background:var(--soft)">${img(K.story.art, K.story.alt, { w: 800, h: 1000, hint: K.story.hint })}</div><div class="cap" style="margin-top:.5rem">${K.story.alt}</div></figure></div></div></section>
<section class="sec" id="how" style="padding-top:0"><div class="wrap"><div class="sh"><div><span class="eyebrow">${K.process[0]}</span><h2>${K.process[1]}</h2></div></div><div class="steps">${K.process[2].map(([h, p], i) => `<div class="st" data-reveal data-delay="${i * 100}"><b>${i + 1}</b><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, cats = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  let n = 0;
  const regs = cats.map((c) => `<section class="reg" id="${c.id}" data-cat="${c.id}"><h2>${c.name}</h2><p class="bl">${c.blurb}</p><table class="rt"><thead><tr><th>No.</th><th>Name</th><th>Details</th><th>About</th></tr></thead><tbody>${c.items.map((i) => `<tr><td>${pad(++n)}</td><td><b>${i.n}</b></td><td>${strip(i.meta)}</td><td>${i.d}<br>${i.star ? '<span class="tg">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</td></tr>`).join("")}</tbody></table></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><div class="mast" style="padding:0"><div class="top"><span>${K.menuHero[0]}</span><span>${t("business_name")}</span><span data-today></span></div></div><h1>${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${regs}</div>
<div class="wrap" style="margin-top:clamp(24px,4vw,48px)"><div class="ph" style="aspect-ratio:21/6;overflow:hidden;background:var(--soft)">${img(cats[0].art, cats[0].name, { w: 1200, h: 340, hint: B.hintOf(pack, cats[0]) })}</div></div>
${ORDER(pack, K.orderMenu)}
${foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/sanctuary")) {
  return { name: "gazette", themeColor: "#F4EEE0", fonts: FONTS, media: B.mediaFor(pack, "gazette", "gallery", "gallery").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.gazette || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
