"use strict";
/**
 * pulse (premium plus, built for gyms and fitness studios): charcoal and vermilion with a heartbeat line that draws itself across
 * the hero. Huge condensed type, a "today" card that lists the classes running on the visitor's current weekday (from the sample
 * week, filled by script; Monday shows without script), an outlined class-name marquee, slabs per class type, big counters and
 * plan cards. The second page lists every class as a big numbered row. Two pages: Home and Classes.
 * Fonts: Big Shoulders + Instrument Sans (SIL OFL). Pictures from the "motion" set. No hero loop: the heartbeat is the motion.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["BigShoulders-Bold.ttf", "BigShoulders-Bold.ttf"], ["BigShoulders-Regular.ttf", "BigShoulders-Regular.ttf"],
  ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["BigShoulders-OFL.txt", "OFL-BigShoulders.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/BigShoulders-Bold.ttf"];

const CSS = `
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#0F1114;--surface:#181B20;--ink:#F4F1EC;--muted:#B5B0A8;--line:rgba(255,255,255,.14);--accent:#FF5A2A;--onaccent:#160803;--c1:#FF5A2A;--c2:#FFC24A;--c3:#FF2E63;--rad:8px;--display:"Big Shoulders","Arial Narrow",Impact,sans-serif;--sans:"Instrument Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1320px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-family:var(--display);font-weight:700;text-transform:uppercase;letter-spacing:.005em}h1{font-size:clamp(4rem,13vw,11.5rem);line-height:.84}h2{font-size:clamp(2.8rem,7vw,6rem);line-height:.9}h3{font-size:1.5rem;line-height:1}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--c2)}
.site-header.is-stuck,.mpanel{background:rgba(15,17,20,.9)}.mpanel a{color:var(--ink);border-bottom-color:var(--line)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.btn-primary,.site-header .btn-primary{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.btn-primary span{color:var(--onaccent)}.btn-primary:hover{background:var(--c2);border-color:var(--c2)}.btn:not(.btn-primary){color:var(--ink);border-color:var(--line)}
.hero{padding:clamp(100px,12vw,150px) 0 0;position:relative;overflow:hidden}.hero .wrap{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(20px,4vw,64px);align-items:end}.hero h1{margin:1rem 0 1.4rem}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin:1.6rem 0 clamp(26px,4vw,50px)}
.td{background:var(--surface);padding:clamp(18px,2.6vw,30px);--rad:10px;margin-bottom:clamp(26px,4vw,50px)}.td h3{font-size:1.1rem;color:var(--c2);display:flex;justify-content:space-between;gap:1rem;margin:0 0 .8rem}.td ul{list-style:none;margin:0;padding:0;display:grid}.td li{display:grid;grid-template-columns:5.2rem 1fr auto;gap:.8rem;align-items:baseline;padding:.7rem 0;border-top:1px solid var(--line)}.td li b{font:700 1.5rem/1 var(--display);color:var(--accent)}.td li span{font-weight:700}.td li small{color:var(--muted)}.td .none{color:var(--muted);padding:.8rem 0}
@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}}
.ecg{display:block;width:100%;height:clamp(70px,10vw,130px);margin-top:0}.ecg path{fill:none;stroke:var(--accent);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1400;stroke-dashoffset:1400;animation:beat 4.5s linear infinite;filter:drop-shadow(0 0 6px rgba(255,90,42,.7))}@keyframes beat{0%{stroke-dashoffset:1400}70%,100%{stroke-dashoffset:0}}@media(prefers-reduced-motion:reduce){.ecg path{animation:none;stroke-dashoffset:0}}
.mq{overflow:hidden;white-space:nowrap;border-block:1px solid var(--line);padding:1rem 0}.mq div{display:inline-flex;gap:2.4rem;animation:mq 34s linear infinite}.mq span{font:700 clamp(2.4rem,6vw,4.6rem)/1 var(--display);text-transform:uppercase;color:transparent;-webkit-text-stroke:1.5px rgba(244,241,236,.55)}.mq span:nth-child(3n){-webkit-text-stroke:0;color:var(--accent)}@keyframes mq{to{transform:translateX(-50%)}}@media(prefers-reduced-motion:reduce){.mq div{animation:none}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
.slabs{display:grid;gap:clamp(12px,1.6vw,20px)}.sl{display:grid;grid-template-columns:.9fr 1.1fr;background:var(--surface);overflow:hidden;--rad:10px}.sl:nth-child(even){grid-template-columns:1.1fr .9fr}.sl:nth-child(even) .ph{order:2}.sl .ph{min-height:300px;background:#2A1E18;overflow:hidden;position:relative}.sl img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;transition:transform .8s var(--ease)}.sl:hover img{transform:scale(1.05)}
.sl .tx{padding:clamp(20px,3.4vw,46px);display:grid;gap:.8rem;align-content:center}.sl .n{font:700 .9rem var(--sans);color:var(--accent);letter-spacing:.14em}.sl h3{font-size:clamp(2.4rem,5vw,4rem)}.sl p{margin:0;color:var(--muted)}.sl ul{list-style:none;margin:.4rem 0 0;padding:0;display:grid}.sl li{display:flex;justify-content:space-between;gap:1rem;padding:.6rem 0;border-top:1px solid var(--line);font-weight:700}.sl li span{font-weight:400;color:var(--muted);font-size:.9rem;text-align:right}
@media(max-width:820px){.sl,.sl:nth-child(even){grid-template-columns:1fr}.sl:nth-child(even) .ph{order:0}.sl .ph{min-height:220px}}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,2vw,22px);text-align:left}.nm div{border-top:3px solid var(--accent);padding-top:1rem}.nm b{display:block;font:700 clamp(3.2rem,12vw,10rem)/.85 var(--display)}.nm span{font:700 .78rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.pl{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,2vw,24px);align-items:stretch}.pc{background:var(--surface);padding:clamp(20px,2.6vw,34px);display:grid;gap:.9rem;align-content:start;--rad:10px}.pc.star{background:#1F1410}.pc h3{font-size:2rem}.pc .pr{font:700 clamp(3.6rem,6vw,5.4rem)/.9 var(--display)}.pc .pr small{font:400 1rem var(--sans);color:var(--muted)}.pc p{margin:0;color:var(--muted)}.pc ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}.pc li{padding-left:1.4rem;position:relative}.pc li::before{content:"";position:absolute;left:0;top:.55em;width:.7rem;height:2px;background:var(--accent)}.pc .flag{justify-self:start;font:700 .68rem var(--sans);letter-spacing:.12em;text-transform:uppercase;background:var(--accent);color:var(--onaccent);padding:.4em .8em;border-radius:99px}
@media(max-width:900px){.pl{grid-template-columns:1fr}}
.sy{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,6vw,90px);align-items:center}.sy .ph{aspect-ratio:4/5;overflow:hidden;background:#2A1E18;--rad:10px}.sy img{width:100%;height:100%;object-fit:cover}.sy h2{margin:1rem 0 1.2rem}@media(max-width:820px){.sy{grid-template-columns:1fr}.sy .ph{aspect-ratio:16/11}}
.stp{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,2vw,24px)}.st{border-top:3px solid var(--accent);padding-top:1rem}.st .n{font:700 4.4rem/1 var(--display);color:var(--accent)}.st h3{margin:.3rem 0}.st p{margin:0;color:var(--muted)}@media(max-width:760px){.stp{grid-template-columns:1fr}}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0;font-size:clamp(3.6rem,11vw,9rem)}
.rows{border-top:1px solid var(--line)}.rw{display:grid;grid-template-columns:3.4rem 1fr auto 92px;gap:clamp(10px,2vw,28px);align-items:center;padding:1.1rem 0;border-bottom:1px solid var(--line)}.rw .n{font:700 1.2rem var(--display);color:var(--accent)}.rw h3{font-size:clamp(1.8rem,3.6vw,3rem)}.rw p{margin:.2rem 0 0;color:var(--muted)}.rw .pr{font:700 .95rem var(--sans);text-align:right}.rw .tags{display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem}.tg{font:700 .62rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;border:1px solid var(--line);color:var(--ink)}.tg.star{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.rw .ph{width:92px;height:92px;border-radius:8px;overflow:hidden;background:#2A1E18}.rw img{width:100%;height:100%;object-fit:cover}
.gh{margin:clamp(30px,5vw,60px) 0 .8rem}.gh h2{font-size:clamp(2.6rem,6vw,5rem)}.gh p{margin:.3rem 0 0;color:var(--muted)}
@media(max-width:640px){.rw{grid-template-columns:2.4rem 1fr 72px}.rw .pr{grid-column:2;text-align:left}.rw .ph{grid-column:3;grid-row:1/3;width:72px;height:72px}}
.order{--rad:10px}
`;

const JS = `
(function () {
  var td = document.querySelector("[data-ontoday]"); if (td && td.hasAttribute("data-week")) {
    var wk = JSON.parse(td.getAttribute("data-week")), nm = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], d = new Date().getDay();
    var list = wk[nm[d]] || [], ul = td.querySelector("ul"), h = td.querySelector("[data-day]");
    if (h) h.textContent = full[d];
    ul.innerHTML = list.length ? list.map(function (c) { return "<li><b>" + c[0] + "</b><span>" + c[1] + "</span><small>" + c[2] + "</small></li>"; }).join("") : '<li class="none">Rest day. See you tomorrow.</li>';
  }
})();
`;

const todayCard = (pack) => {
  const w = pack.week.Mon;
  return `<div class="td live" data-ontoday data-week='${JSON.stringify(pack.week).replace(/'/g, "&#39;")}' data-reveal><h3><span>On today</span><span data-day>Monday</span></h3><ul>${w.map((c) => `<li><b>${c[0]}</b><span>${c[1]}</span><small>${c[2]}</small></li>`).join("")}</ul></div>`;
};
const ECG = `<svg class="ecg" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 H150 l14 -10 l14 10 H280 l12 14 l22 -78 l24 112 l16 -48 H470 l12 -12 l14 12 H640 l12 14 l22 -78 l24 112 l16 -48 H830 l12 -12 l14 12 H1000 l12 14 l22 -78 l24 112 l16 -48 H1200"/></svg>`;

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack);
  const mq = all.map((i) => `<span>${i.n}</span>`).join("");
  const slabs = pack.cats.map((c, k) => `<article class="sl live" data-reveal><div class="ph shine">${img(c.art, c.name, { w: 800, h: 900, hint: B.hintOf(pack, c) })}</div><div class="tx"><span class="n">${K.pad(k + 1)}</span><h3>${c.name}</h3><p>${c.blurb}</p><ul>${c.items.slice(0, 3).map((i) => `<li>${i.n}<span>${K.strip(i.meta)}</span></li>`).join("")}</ul></div></article>`).join("");
  const plans = pack.plans.map((p, i) => `<article class="pc${p.star ? " star live halo" : ""}" data-reveal data-delay="${i * 80}">${p.star ? '<span class="flag">Most popular</span>' : ""}<h3>${p.n}</h3><div class="pr">&pound;${p.price}<small> / ${p.per}</small></div><p>${p.blurb}</p><ul>${p.feats.map((f) => `<li>${f}</li>`).join("")}</ul><a class="btn${p.star ? " btn-primary" : ""}" href="#order"><span>Choose ${p.n}</span></a></article>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div></div>${todayCard(pack)}</div>${ECG}</section>
<div class="mq" aria-hidden="true"><div>${mq}${mq}</div></div>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="slabs">${slabs}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm">${X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Membership</span><h2 style="margin-top:.8rem">Pick <em>your plan</em></h2></div></div><div class="pl">${plans}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sy"><div class="ph live" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 1100, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.process[0]}</span><h2 style="margin-top:.8rem">${X.process[1]}</h2></div></div><div class="stp">${X.process[2].map(([h, p], i) => `<div class="st" data-reveal data-delay="${i * 100}"><span class="n">${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  let n = 0;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="rows">${c.items.map((i) => `<article class="rw" data-reveal><span class="n">${K.pad(++n)}</span><div><h3>${i.n}</h3><p>${i.d}</p><div class="tags">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div><span class="pr">${K.strip(i.meta)}</span><div class="ph">${img(i.art || c.art, i.n, { w: 240, h: 240, hint: B.hintOf(pack, i) })}</div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/fitness")) {
  return { name: "pulse", themeColor: "#0F1114", fonts: FONTS, media: B.mediaFor(pack, "pulse", "motion", "motion").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.pulse || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
