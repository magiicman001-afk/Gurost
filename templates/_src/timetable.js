"use strict";
/**
 * timetable (premium plus, built for gyms and fitness studios): the week is the page. A bright, app-like layout with a day strip
 * (opens on the visitor's current weekday), filter chips by class type, and a clean list of classes with a Book button that fills
 * the enquiry form. Without script every day is listed in order. Coach cards, plan chips and the usual enquiry block follow.
 * The second page is the price list by class type. Two pages: Home and Classes.
 * Fonts: Tektur + Work Sans (SIL OFL). Pictures from the "gallery" set. No hero loop: the timetable is the motion.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["Tektur-Medium.ttf", "Tektur-Medium.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["Tektur-OFL.txt", "OFL-Tektur.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"],
];
const PRELOAD = ["assets/fonts/Tektur-Medium.ttf"];
const DAYS = [["Mon", "Monday"], ["Tue", "Tuesday"], ["Wed", "Wednesday"], ["Thu", "Thursday"], ["Fri", "Friday"], ["Sat", "Saturday"], ["Sun", "Sunday"]];
const DOT = { strength: "#E8431F", hiit: "#E9A400", mind: "#5B86B0" };

const CSS = `
@font-face{font-family:"Tektur";src:url(fonts/Tektur-Medium.ttf) format("truetype");font-weight:500;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#F1F3EE;--surface:#FFFFFF;--ink:#0E1A12;--muted:#55645A;--line:rgba(14,26,18,.14);--accent:#1B6B40;--onaccent:#FFFFFF;--hi:#C8F54A;--c1:#1B6B40;--c2:#C8F54A;--c3:#0E1A12;--rad:18px;--display:"Tektur",system-ui,sans-serif;--sans:"Work Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:-.02em}h1{font-size:clamp(2.8rem,7.4vw,6.4rem);line-height:.96}h2{font-size:clamp(2rem,4.6vw,3.8rem);line-height:1}h3{font-size:1.15rem}
h1 em,h2 em{font-style:normal;background:linear-gradient(transparent 62%,var(--hi) 62%)}.lead{font-size:clamp(1.05rem,1.4vw,1.2rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--accent)}
.site-header.is-stuck,.mpanel{background:rgba(241,243,238,.92)}.btn-primary,.site-header .btn-primary{background:var(--ink);border-color:var(--ink);color:#fff}.btn-primary span{color:#fff}.btn-primary:hover{background:var(--accent);border-color:var(--accent)}
.hero{padding:clamp(104px,12vw,150px) 0 clamp(20px,3vw,36px)}.hero .wrap{display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(20px,5vw,72px);align-items:center}.hero h1{margin:1rem 0 1.2rem}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .fr{aspect-ratio:1;overflow:hidden;background:#E3E9DC;--rad:28px}.hero .fr img{width:100%;height:100%;object-fit:cover}.hero .fr .tagl{position:absolute;left:14px;bottom:14px;z-index:3;background:var(--hi);font:700 .78rem var(--sans);padding:.6em 1em;border-radius:99px}@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}.hero .fr{max-width:360px}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
/* timetable */
.tt{background:var(--surface);border-radius:28px;padding:clamp(16px,3vw,36px);--rad:28px}.tt .top{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center;margin-bottom:1.2rem}.tt .chips{margin:0}
.dtabs{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.4rem;scrollbar-width:none}.dtabs::-webkit-scrollbar{display:none}.dtabs button{flex:1 0 auto;min-width:64px;display:grid;gap:.1rem;justify-items:center;padding:.7rem .6rem;border-radius:16px;border:1.5px solid var(--line);background:transparent;cursor:pointer;color:var(--ink);transition:.25s}.dtabs button small{font:700 .66rem var(--sans);letter-spacing:.1em;text-transform:uppercase;opacity:.7}.dtabs button b{font:500 1.15rem var(--display)}.dtabs button:hover{border-color:var(--accent)}.dtabs button[aria-selected=true]{background:var(--ink);border-color:var(--ink);color:#fff}.dtabs button.now b::after{content:"";display:inline-block;width:6px;height:6px;margin-left:.3rem;border-radius:50%;background:var(--hi);vertical-align:middle}
.dy{margin-top:1rem}.js .dy:not(.on){display:none}.dy>h3{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:1.4rem 0 .2rem}.js .dy>h3{display:none}
.dy ul{list-style:none;margin:0;padding:0}.dy li{display:grid;grid-template-columns:5.4rem 1fr auto;gap:.4rem 1rem;align-items:center;padding:1rem .2rem;border-top:1px solid var(--line)}.dy li time{font:500 1.35rem var(--display)}.dy li .nm{display:flex;gap:.6rem;align-items:center;font-weight:700}.dy li .nm i{width:10px;height:10px;border-radius:50%;background:var(--dot);flex:none}.dy li .nm small{display:block;font-weight:400;color:var(--muted);font-size:.86rem}.dy li button{font:700 .84rem var(--sans);padding:.7em 1.2em;border-radius:99px;border:1.5px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;transition:.25s}.dy li button:hover{background:var(--hi)}
.tt .none{padding:1.4rem .2rem;color:var(--muted)}@media(max-width:560px){.dy li{grid-template-columns:4.6rem 1fr}.dy li button{grid-column:1/-1;justify-self:start}}
/* coaches */
.cr{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.8vw,22px)}.co{background:var(--surface);border-radius:24px;padding:12px;--rad:24px}.co .ph{aspect-ratio:1;border-radius:16px;overflow:hidden;background:#E3E9DC}.co img{width:100%;height:100%;object-fit:cover}.co .tx{padding:1rem .5rem .5rem}.co h3{font-size:1.2rem}.co small{display:block;font:700 .7rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:.2rem 0 .5rem}.co p{margin:0;color:var(--muted);font-size:.94rem}@media(max-width:900px){.cr{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.cr{grid-template-columns:1fr}}
/* plans strip */
.ps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(10px,1.6vw,18px)}.pp{background:var(--surface);border-radius:22px;padding:1.4rem;display:grid;gap:.4rem;--rad:22px}.pp.star{background:var(--ink);color:#fff}.pp.star p,.pp.star li{color:#C9D3CC}.pp h3{font-size:1.3rem}.pp .pr{font:500 clamp(2.4rem,4vw,3.4rem)/1 var(--display)}.pp .pr small{font:400 .9rem var(--sans);opacity:.7}.pp p{margin:0;color:var(--muted)}.pp ul{margin:.6rem 0 0;padding-left:1.1rem;color:var(--muted);display:grid;gap:.3rem}@media(max-width:820px){.ps{grid-template-columns:1fr}}
.nm2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.nm2 div{background:var(--surface);border-radius:22px;padding:clamp(18px,3vw,34px) 1rem;text-align:center}.nm2 b{display:block;font:500 clamp(1.9rem,6vw,4.6rem)/1 var(--display);color:var(--accent)}.nm2 span{font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
/* classes page */
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0}
.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,1.8vw,22px)}.tc{display:grid;grid-template-columns:110px 1fr;gap:1.1rem;padding:12px;background:var(--surface);border-radius:20px}.tc .ph{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#E3E9DC}.tc img{width:100%;height:100%;object-fit:cover}.tc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline;flex-wrap:wrap}.tc h3 span{font:700 .8rem var(--sans);color:var(--accent)}.tc p{margin:.4rem 0 .7rem;color:var(--muted);font-size:.95rem}.tc .ft{display:flex;gap:.4rem;flex-wrap:wrap}.tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:var(--hi);color:var(--ink)}.tg.n{background:#E3E9DC}
.grp{padding-top:clamp(22px,3.4vw,40px)}.gh{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}.gh h2{font-size:clamp(1.8rem,3.4vw,2.6rem)}.gh p{margin:0;color:var(--muted)}@media(max-width:760px){.cg{grid-template-columns:1fr}.tc{grid-template-columns:90px 1fr}}
.order{--rad:28px}
`;

const JS = `
(function () {
  var tt = document.querySelector("[data-tt]"); if (!tt) return;
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var days = $$(".dy", tt), tabs = $$(".dtabs button", tt), keys = days.map(function (d) { return d.getAttribute("data-day"); });
  tt.classList.add("js"); document.documentElement.classList.add("js");
  var nm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], today = nm[new Date().getDay()];
  function show(k) {
    days.forEach(function (d) { d.classList.toggle("on", d.getAttribute("data-day") === k); });
    tabs.forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-day") === k ? "true" : "false"); });
  }
  tabs.forEach(function (b) { b.addEventListener("click", function () { show(b.getAttribute("data-day")); }); if (b.getAttribute("data-day") === today) b.classList.add("now"); });
  show(keys.indexOf(today) > -1 ? today : keys[0]);
  tt.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-book]"); if (!b) return;
    var f = document.querySelector("#order form"); if (!f) return;
    var m = f.querySelector("textarea[name=message]"), a = f.querySelector("input[name=about]");
    if (m) m.value = "Hi, I would like to join " + b.getAttribute("data-book") + ". Please send me the details for my free first session.";
    if (a) a.value = "Class: " + b.getAttribute("data-book").split(" on ")[0];
    document.getElementById("order").scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
`;

const full = Object.fromEntries(DAYS);
function ttable(pack) {
  const tabs = DAYS.map(([k, f], i) => `<button type="button" role="tab" data-day="${k}" aria-selected="${i === 0}"><small>${k}</small><b>${f.slice(0, 3)}</b></button>`).join("");
  const days = DAYS.map(([k, f], i) => `<div class="dy${i === 0 ? " on" : ""}" data-day="${k}"><h3>${f}</h3>${pack.week[k].length ? `<ul>${pack.week[k].map(([time, cls, coach, cat]) => `<li data-cat="${cat}" style="--dot:${DOT[cat] || "#1B6B40"}"><time>${time}</time><div class="nm"><i></i><span>${cls}<small>with ${coach}</small></span></div><button type="button" data-book="${cls} on ${f} at ${time}">Book</button></li>`).join("")}</ul>` : '<p class="none">Rest day. See you tomorrow.</p>'}</div>`).join("");
  return `<div class="tt live" data-tt><div class="top"><div class="dtabs" role="tablist" aria-label="Day of the week">${tabs}</div><div class="chips">${K.chips(pack)}</div></div>${days}</div>`;
}

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack), lead = all.find((i) => i.star) || all[0];
  const coaches = pack.coaches.map((c) => `<article class="co live" data-reveal><div class="ph">${img(c.art, c.n, { w: 520, h: 520, hint: "a friendly fitness coach, " + c.role.toLowerCase() })}</div><div class="tx"><h3>${c.n}</h3><small>${c.role}</small><p>${c.bio}</p></div></article>`).join("");
  const plans = pack.plans.map((p) => `<article class="pp${p.star ? " star" : ""}" data-reveal><h3>${p.n}</h3><div class="pr">&pound;${p.price}<small> / ${p.per}</small></div><p>${p.blurb}</p><ul>${p.feats.slice(0, 3).map((f) => `<li>${f}</li>`).join("")}</ul></article>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#timetable"><span>See the week</span></a><a class="btn" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a></div></div>
<div class="fr live" style="position:relative">${img(lead.art, lead.n, { role: "featured", w: 900, h: 900, hint: B.hintOf(pack, lead), lazy: false })}<span class="tagl">${X.glass[1]}</span></div></div></section>
<section class="sec" id="timetable" style="padding-top:clamp(20px,3vw,40px)"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">This <em>week</em> at ${t("business_name")}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div>${ttable(pack)}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Your coaches</span><h2 style="margin-top:.8rem">Meet <em>the team</em></h2></div></div><div class="cr">${coaches}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Membership</span><h2 style="margin-top:.8rem">Simple <em>pricing</em></h2></div></div><div class="ps">${plans}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm2">${X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cg">${c.items.map((i) => `<article class="tc" data-reveal><div class="ph">${img(i.art || c.art, i.n, { w: 360, h: 360, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><div class="ft">${i.star ? '<span class="tg">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg n" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/fitness")) {
  return { name: "timetable", themeColor: "#F1F3EE", fonts: FONTS, media: B.mediaFor(pack, "timetable", "gallery", "gallery").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.timetable || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
