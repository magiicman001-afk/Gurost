"use strict";
/**
 * tiers (premium plus, built for gyms and fitness studios): the membership is the hero. Warm sand and deep green, a big monthly /
 * yearly switch that re-prices every plan (a year is ten months, so two are free), three plan cards with the favourite ringed by a
 * live border, a full comparison table, and questions answered in plain words. The second page is every class with its drop-in
 * price. Two pages: Home and Classes. Fonts: Young Serif + Work Sans (SIL OFL). Pictures from the "atelier" set. No hero loop.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["YoungSerif-Regular.ttf", "YoungSerif-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["YoungSerif-OFL.txt", "OFL-YoungSerif.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"],
];
const PRELOAD = ["assets/fonts/YoungSerif-Regular.ttf"];

const CSS = `
@font-face{font-family:"Young Serif";src:url(fonts/YoungSerif-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#F6EFE4;--surface:#FFFFFF;--ink:#13261E;--muted:#58655D;--line:rgba(19,38,30,.16);--accent:#0F5A3F;--onaccent:#FFFFFF;--c1:#0F5A3F;--c2:#E9B949;--c3:#E8431F;--rad:26px;--display:"Young Serif",Georgia,serif;--sans:"Work Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-family:var(--display);font-weight:400}h1{font-size:clamp(3rem,8vw,7rem);line-height:.96;letter-spacing:-.02em}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1;letter-spacing:-.015em}h3{font-size:1.3rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--accent)}
.site-header.is-stuck,.mpanel{background:rgba(246,239,228,.92)}.btn-primary,.site-header .btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn-primary span{color:#fff}.btn-primary:hover{background:var(--ink);border-color:var(--ink)}
.hero{padding:clamp(110px,13vw,160px) 0 clamp(20px,3vw,40px);text-align:center}.hero h1{margin:1rem auto 1.2rem;max-width:11em}.hero .lead{margin-inline:auto}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem;justify-content:center}
.sw{display:inline-flex;align-items:center;gap:.4rem;background:var(--surface);padding:6px;border-radius:99px;border:1px solid var(--line);margin:clamp(20px,3vw,36px) auto 0}.sw button{font:700 .92rem var(--sans);padding:.8em 1.4em;border-radius:99px;border:0;background:transparent;color:var(--ink);cursor:pointer;transition:.25s}.sw button[aria-pressed=true]{background:var(--ink);color:#fff}.sw em{font:700 .7rem var(--sans);font-style:normal;background:var(--c2);color:var(--ink);padding:.3em .6em;border-radius:99px;margin-left:.4rem}
.pl{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,2vw,24px);align-items:stretch;margin-top:clamp(24px,4vw,48px)}.pc{background:var(--surface);padding:clamp(22px,2.8vw,38px);display:grid;gap:1rem;align-content:start;text-align:left;--rad:26px}.pc.star{background:var(--ink);color:#fff;transform:translateY(-10px)}.pc.star p,.pc.star li{color:#CBD6CF}.pc h3{font-size:1.6rem}.pc .pr{font:400 clamp(3.2rem,5.4vw,4.6rem)/.95 var(--display)}.pc .pr small{font:400 .95rem var(--sans);opacity:.7}.pc .sv{min-height:1.4em;font:700 .8rem var(--sans);color:var(--accent)}.pc.star .sv{color:var(--c2)}.pc p{margin:0;color:var(--muted)}.pc ul{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}.pc li{padding-left:1.5rem;position:relative}.pc li::before{content:"";position:absolute;left:0;top:.35em;width:.9rem;height:.5rem;border-left:2.5px solid var(--accent);border-bottom:2.5px solid var(--accent);transform:rotate(-45deg)}.pc.star li::before{border-color:var(--c2)}.pc .flag{justify-self:start;font:700 .68rem var(--sans);letter-spacing:.12em;text-transform:uppercase;background:var(--c2);color:var(--ink);padding:.4em .8em;border-radius:99px}.pc .btn{width:100%;text-align:center;justify-content:center}.pc.star .btn-primary{background:var(--c2);border-color:var(--c2);color:var(--ink)}.pc.star .btn-primary span{color:var(--ink)}
@media(max-width:900px){.pl{grid-template-columns:1fr}.pc.star{transform:none}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
.cmp{background:var(--surface);border-radius:26px;padding:clamp(10px,2vw,24px);overflow-x:auto}.cmp table{width:100%;border-collapse:collapse;min-width:640px}.cmp th,.cmp td{padding:1rem .8rem;text-align:left;border-bottom:1px solid var(--line);font-size:.98rem}.cmp thead th{font:400 1.2rem var(--display);position:sticky;top:0}.cmp tbody th{font-weight:700;width:34%}.cmp td{color:var(--muted)}.cmp td.y{color:var(--accent);font-weight:700}.cmp td.n{opacity:.4}.cmp tr:last-child th,.cmp tr:last-child td{border-bottom:0}
.sy{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(24px,6vw,90px);align-items:center}.sy .ph{aspect-ratio:4/5;border-radius:200px 200px 26px 26px;overflow:hidden;background:#F0DFC8}.sy img{width:100%;height:100%;object-fit:cover}.sy h2{margin:1rem 0 1.2rem}@media(max-width:820px){.sy{grid-template-columns:1fr}.sy .ph{aspect-ratio:16/11;border-radius:26px}}
.inc{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,1.6vw,18px)}.inc a{background:var(--surface);border-radius:22px;padding:10px;color:var(--ink);display:grid;gap:.7rem;transition:transform .4s var(--ease)}.inc a:hover{transform:translateY(-6px);text-decoration:none}.inc .ph{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#F0DFC8}.inc img{width:100%;height:100%;object-fit:cover}.inc b{font:400 1.15rem var(--display);padding:0 .4rem}.inc small{color:var(--muted);padding:0 .4rem .5rem;font-size:.88rem}@media(max-width:820px){.inc{grid-template-columns:repeat(2,minmax(0,1fr))}}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px);text-align:center;border-block:1px solid var(--line)}.nm div{padding:clamp(22px,3.4vw,44px) .4rem}.nm b{display:block;font:400 clamp(2.2rem,7vw,5.6rem)/1 var(--display);color:var(--accent)}.nm span{font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.fq{display:grid;gap:.7rem;max-width:860px}.fq details{background:var(--surface);border-radius:20px;padding:0 1.4rem;border:1px solid var(--line)}.fq summary{list-style:none;cursor:pointer;padding:1.2rem 0;font:400 1.3rem var(--display);display:flex;justify-content:space-between;gap:1rem;align-items:center}.fq summary::-webkit-details-marker{display:none}.fq summary::after{content:"+";font:400 1.8rem var(--sans);color:var(--accent);transition:transform .3s}.fq details[open] summary::after{transform:rotate(45deg)}.fq p{margin:0 0 1.2rem;color:var(--muted);max-width:42em}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0}
.cg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,1.8vw,22px)}.tc{background:var(--surface);border-radius:24px;padding:12px;display:grid;gap:.9rem;align-content:start}.tc .ph{aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:#F0DFC8}.tc img{width:100%;height:100%;object-fit:cover}.tc .tx{padding:0 .5rem .6rem}.tc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline;flex-wrap:wrap}.tc h3 span{font:700 .8rem var(--sans);color:var(--accent)}.tc p{margin:.4rem 0 .7rem;color:var(--muted);font-size:.95rem}.tc .ft{display:flex;gap:.4rem;flex-wrap:wrap}.tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:#EFE6D6;color:var(--ink)}.tg.star{background:var(--c2)}
.grp{padding-top:clamp(22px,3.4vw,40px)}.gh{margin-bottom:1rem}.gh h2{font-size:clamp(1.9rem,3.6vw,2.8rem)}.gh p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:900px){.cg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.cg{grid-template-columns:1fr}}
.order{--rad:30px}
`;

const JS = `
(function () {
  var sw = document.querySelector("[data-bill]"); if (!sw) return;
  var btns = [].slice.call(sw.querySelectorAll("button")), cards = [].slice.call(document.querySelectorAll("[data-price]"));
  function set(mode) {
    btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-mode") === mode ? "true" : "false"); });
    cards.forEach(function (c) {
      var p = +c.getAttribute("data-price"), pr = c.querySelector(".pr"), sv = c.querySelector(".sv");
      if (mode === "year") { pr.innerHTML = "&pound;" + p * 10 + "<small> / year</small>"; sv.textContent = "Two months free: you save \\u00A3" + p * 2; }
      else { pr.innerHTML = "&pound;" + p + "<small> / month</small>"; sv.textContent = "Cancel any time"; }
    });
  }
  btns.forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-mode")); }); });
  set("month");
})();
`;

const cell = (v) => (v === true ? '<td class="y">Included</td>' : v === false ? '<td class="n">Not included</td>' : `<td class="y">${v}</td>`);

function home(pack) {
  const X = pack.copy.atelier;
  const plans = pack.plans.map((p, i) => `<article class="pc${p.star ? " star live halo" : ""}" data-price="${p.price}" data-reveal data-delay="${i * 80}">${p.star ? '<span class="flag">Most popular</span>' : ""}<h3>${p.n}</h3><div class="pr">&pound;${p.price}<small> / ${p.per}</small></div><div class="sv">Cancel any time</div><p>${p.blurb}</p><ul>${p.feats.map((f) => `<li>${f}</li>`).join("")}</ul><a class="btn${p.star ? " btn-primary" : ""}" href="#order"><span>Choose ${p.n}</span></a></article>`).join("");
  const table = `<div class="cmp" data-reveal><table><thead><tr><th scope="col">Compare plans</th>${pack.plans.map((p) => `<th scope="col">${p.n}</th>`).join("")}</tr></thead><tbody>${pack.planRows.map(([l, v]) => `<tr><th scope="row">${l}</th>${v.map(cell).join("")}</tr>`).join("")}</tbody></table></div>`;
  const inc = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal><div class="ph">${img(c.art, c.name, { w: 400, h: 400, hint: B.hintOf(pack, c) })}</div><b>${c.name}</b><small>${c.items.length} classes</small></a>`).join("");
  const faq = pack.faq.map(([q, a]) => `<details data-reveal><summary>${q}</summary><p>${a}</p></details>`).join("");
  const body = `<section class="hero"><div class="wrap"><span class="eyebrow">${X.heroEyebrow}</span><h1>Pick the plan that <em>fits your week</em>.</h1><p class="lead">${t("tagline")}</p><div class="sw" data-bill role="group" aria-label="Billing"><button type="button" data-mode="month" aria-pressed="true">Monthly</button><button type="button" data-mode="year" aria-pressed="false">Yearly<em>2 months free</em></button></div><div class="pl">${plans}</div></div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">The detail</span><h2 style="margin-top:.8rem">Every plan, <em>side by side</em></h2></div></div>${table}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div></div><div class="inc">${inc}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm" data-reveal>${X.stats.map(([v, s, l]) => `<div><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sy"><div class="ph" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 1100, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p><div class="cta-row" style="margin-top:1.4rem"><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Good to know</span><h2 style="margin-top:.8rem">Questions, <em>answered</em></h2></div></div><div class="fq">${faq}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cg">${c.items.map((i) => `<article class="tc" data-reveal><div class="ph">${img(i.art || c.art, i.n, { w: 480, h: 360, hint: B.hintOf(pack, i) })}</div><div class="tx"><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><div class="ft">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/fitness")) {
  return { name: "tiers", themeColor: "#F6EFE4", fonts: FONTS, media: B.mediaFor(pack, "tiers", "atelier", "atelier").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.tiers || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
