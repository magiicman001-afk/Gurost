"use strict";
/**
 * matcher (premium plus, built for gyms and fitness studios): "find your class" in three taps. Midnight blue and sunshine yellow,
 * chunky type. The hero is a quiz card: your goal, how much you have trained, when you can come. It picks the best-fitting class
 * from the sample classes and week (beginner-friendly first for newcomers), shows the next times it runs and fills the enquiry
 * form. Below: the coaches, the classes by type and the usual enquiry block. Second page: every class as a chunky card.
 * Two pages: Home and Classes. Fonts: Erica One + Work Sans (SIL OFL). Pictures from the "motion" set. No hero loop.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["EricaOne-Regular.ttf", "EricaOne-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["EricaOne-OFL.txt", "OFL-EricaOne.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"],
];
const PRELOAD = ["assets/fonts/EricaOne-Regular.ttf"];

const CSS = `
@font-face{font-family:"Erica One";src:url(fonts/EricaOne-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--bg:#0D1B3D;--surface:#15275A;--ink:#FFFFFF;--muted:#B9C4E2;--line:rgba(255,255,255,.18);--accent:#FFD23F;--onaccent:#0D1B3D;--c1:#FFD23F;--c2:#7FD1FF;--c3:#FF6B8A;--rad:24px;--display:"Erica One",Impact,sans-serif;--sans:"Work Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1260px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
[hidden]{display:none!important}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-family:var(--display);font-weight:400;overflow-wrap:break-word}h1{font-size:clamp(2.9rem,7.6vw,6.6rem);line-height:.98;letter-spacing:-.01em}h2{font-size:clamp(2.1rem,4.8vw,4rem);line-height:1}h3{font-size:1.3rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--c2)}
.site-header.is-stuck,.mpanel{background:rgba(13,27,61,.92)}.mpanel a{color:var(--ink);border-bottom-color:var(--line)}.menu-open .site-header{background:var(--bg);color:var(--ink)}
.btn-primary,.site-header .btn-primary{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}.btn-primary span{color:var(--onaccent)}.btn-primary:hover{background:#fff;border-color:#fff}.btn:not(.btn-primary){color:var(--ink);border-color:var(--line)}
.hero{padding:clamp(100px,12vw,150px) 0 clamp(30px,5vw,70px)}.hero .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,80px);align-items:center}.hero h1{margin:1rem 0 1.2rem}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}}
/* quiz */
.qz{background:var(--surface);padding:clamp(20px,3vw,40px);--rad:30px;min-height:420px;display:grid;align-content:start;gap:1.2rem}.qz .pg{display:flex;gap:6px}.qz .pg i{flex:1;height:5px;border-radius:5px;background:rgba(255,255,255,.2);transition:background .4s}.qz .pg i.on{background:var(--accent)}
.qz h3{font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.05}.qz .st{display:none;gap:1rem}.qz .st.on{display:grid;animation:qin .45s var(--ease)}@keyframes qin{from{opacity:0;transform:translateX(18px)}}
.qz .op{display:grid;gap:.6rem}.qz .op button{display:flex;justify-content:space-between;align-items:center;gap:1rem;text-align:left;font:700 1.05rem var(--sans);padding:1rem 1.2rem;border-radius:18px;border:1.5px solid var(--line);background:rgba(255,255,255,.04);color:var(--ink);cursor:pointer;transition:.25s}.qz .op button small{font-weight:400;color:var(--muted)}.qz .op button:hover{border-color:var(--accent);background:rgba(255,210,63,.1)}.qz .op button::after{content:"\\2192";color:var(--accent);font-size:1.2rem}
.qz .rs{gap:1rem}.qz .rs .eb{font:700 .72rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}.qz .rs .ct{background:rgba(255,255,255,.06);border-radius:18px;padding:1.1rem 1.2rem;display:grid;gap:.3rem}.qz .rs .ct b{font:400 1.7rem/1 var(--display)}.qz .rs .ct span{color:var(--muted);font-size:.92rem}.qz .rs .tm{display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0}.qz .rs .tm em{font:700 .78rem var(--sans);font-style:normal;background:var(--accent);color:var(--onaccent);padding:.4em .8em;border-radius:99px}.qz .rs .go{display:flex;gap:.6rem;flex-wrap:wrap}.qz .back{background:none;border:0;color:var(--muted);font:700 .86rem var(--sans);cursor:pointer;justify-self:start;padding:0;text-decoration:underline}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
.cr{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.8vw,22px)}.co{background:var(--surface);padding:12px;--rad:26px}.co .ph{aspect-ratio:1;border-radius:18px;overflow:hidden;background:#FFE9A6}.co img{width:100%;height:100%;object-fit:cover}.co .tx{padding:1rem .5rem .5rem}.co h3{font-size:1.25rem}.co small{display:block;font:700 .7rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:.3rem 0 .5rem}.co p{margin:0;color:var(--muted);font-size:.94rem}@media(max-width:900px){.cr{grid-template-columns:repeat(2,1fr)}}@media(max-width:480px){.cr{grid-template-columns:1fr}}
.cl{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(12px,1.8vw,22px)}.cc{display:grid;grid-template-columns:42% 1fr;background:var(--surface);overflow:hidden;--rad:28px}.cc .ph{background:#FFE9A6;position:relative;min-height:220px}.cc img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cc .tx{padding:clamp(18px,2.4vw,30px);display:grid;gap:.6rem;align-content:center}.cc h3{font-size:clamp(1.6rem,2.6vw,2.2rem)}.cc p{margin:0;color:var(--muted)}.cc ul{list-style:none;margin:.3rem 0 0;padding:0;display:grid;gap:.3rem;font-weight:700;font-size:.95rem}.cc li span{font-weight:400;color:var(--muted);font-size:.84rem;margin-left:.4rem}@media(max-width:900px){.cl{grid-template-columns:1fr}}@media(max-width:480px){.cc{grid-template-columns:1fr}.cc .ph{min-height:200px}}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px);text-align:center}.nm div{background:var(--surface);border-radius:24px;padding:clamp(18px,3vw,36px) .6rem}.nm b{display:block;font:400 clamp(1.9rem,6vw,4.6rem)/1 var(--display);color:var(--accent)}.nm span{font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0;font-size:clamp(2.8rem,8vw,6.6rem)}
.cg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,1.8vw,22px)}.tc{display:grid;grid-template-columns:120px 1fr;gap:1.1rem;padding:12px;background:var(--surface);border-radius:22px}.tc .ph{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#FFE9A6}.tc img{width:100%;height:100%;object-fit:cover}.tc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline;flex-wrap:wrap;font-size:1.2rem}.tc h3 span{font:700 .8rem var(--sans);color:var(--accent)}.tc p{margin:.4rem 0 .7rem;color:var(--muted);font-size:.95rem}.tc .ft{display:flex;gap:.4rem;flex-wrap:wrap}.tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;border:1px solid var(--line)}.tg.star{background:var(--accent);border-color:var(--accent);color:var(--onaccent)}
.grp{padding-top:clamp(22px,3.4vw,40px)}.gh{margin-bottom:1rem}.gh h2{font-size:clamp(1.8rem,3.6vw,2.8rem)}.gh p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.cg{grid-template-columns:1fr}.tc{grid-template-columns:90px 1fr}}
.order{--rad:30px}
`;

const JS = `
(function () {
  var q = document.querySelector("[data-quiz]"); if (!q) return;
  var D = JSON.parse(q.getAttribute("data-quiz")), steps = [].slice.call(q.querySelectorAll(".st:not(.rs)")), bars = [].slice.call(q.querySelectorAll(".pg i")), ans = {}, cur = 0;
  var rs = q.querySelector(".rs");
  function go(n) { cur = n; steps.forEach(function (s, k) { s.classList.toggle("on", k === n); }); bars.forEach(function (b, k) { b.classList.toggle("on", k <= n); }); }
  function band(t) { var m = /(\\d+):(\\d+)(am|pm)/.exec(t); var h = +m[1]; if (m[3] === "pm" && h < 12) h += 12; return h < 12 ? "morning" : h < 15 ? "lunch" : "evening"; }
  function slots(name, b) { var o = []; Object.keys(D.week).forEach(function (d) { D.week[d].forEach(function (c) { if (c[1] === name && (!b || band(c[0]) === b)) o.push(d + " " + c[0]); }); }); return o; }
  function result() {
    var cat = D.cats[ans.goal], items = cat.items.slice();
    if (ans.exp === "new") items.sort(function (a, b) { return (b.beg ? 1 : 0) - (a.beg ? 1 : 0); });
    var picks = items.map(function (i) { return { i: i, s: slots(i.n, ans.time) }; });
    var best = picks.filter(function (p) { return p.s.length; })[0], note = "";
    if (!best) { best = picks.map(function (p) { return { i: p.i, s: slots(p.i.n, "") }; }).filter(function (p) { return p.s.length; })[0] || { i: items[0], s: [] }; note = "Nothing runs at that time right now, so here is when it does run."; }
    var i = best.i, tm = best.s.slice(0, 4).map(function (s) { return "<em>" + s + "</em>"; }).join("");
    rs.innerHTML = '<span class="eb">Your match</span><div class="ct"><b>' + i.n + '</b><span>' + i.meta + ' &middot; ' + i.d + '</span></div>' + (tm ? '<div class="tm">' + tm + '</div>' : "") + (note ? '<p class="lead" style="margin:0;font-size:.95rem">' + note + '</p>' : "") + '<div class="go"><button class="btn btn-primary" type="button" data-pick="' + i.n.replace(/"/g, "") + '"><span>Book a free session</span></button><button class="back" type="button" data-again>Start again</button></div>';
    steps.forEach(function (s) { s.classList.remove("on"); }); rs.classList.add("on"); bars.forEach(function (b) { b.classList.add("on"); });
  }
  q.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-k")) { ans[b.getAttribute("data-k")] = b.getAttribute("data-v"); if (cur < steps.length - 1) go(cur + 1); else result(); }
    else if (b.hasAttribute("data-back")) go(Math.max(0, cur - 1));
    else if (b.hasAttribute("data-again")) { ans = {}; rs.classList.remove("on"); bars.forEach(function (x) { x.classList.remove("on"); }); go(0); }
    else if (b.hasAttribute("data-pick")) {
      var f = document.querySelector("#order form"), n = b.getAttribute("data-pick"); if (!f) return;
      var m = f.querySelector("textarea[name=message]"), a = f.querySelector("input[name=about]");
      if (m) m.value = "Hi, the class finder matched me with " + n + ". I would like to book my free first session."; if (a) a.value = "Class: " + n;
      document.getElementById("order").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  go(0);
})();
`;

function quiz(pack) {
  const cats = Object.fromEntries(pack.cats.map((c) => [c.id, { name: c.name, items: c.items.map((i) => ({ n: i.n, meta: K.strip(i.meta), d: i.d, beg: i.tags.includes("Beginner") })) }]));
  const data = JSON.stringify({ cats, week: pack.week }).replace(/'/g, "&#39;");
  const op = (k, v, a, b = "") => `<button type="button" data-k="${k}" data-v="${v}"><span>${a}${b ? `<br><small>${b}</small>` : ""}</span></button>`;
  return `<div class="qz live halo" data-quiz='${data}' data-reveal><div class="pg" aria-hidden="true"><i></i><i></i><i></i></div>
<div class="st"><h3>What do you want most?</h3><div class="op">${op("goal", "strength", "Get stronger", "Lifting and conditioning")}${op("goal", "hiit", "Get fitter", "Big effort, short sessions")}${op("goal", "mind", "Move better and relax", "Yoga, mobility and stretch")}${op("goal", "pt", "Have a plan made for me", "Personal training")}</div></div>
<div class="st"><h3>How much have you trained?</h3><div class="op">${op("exp", "new", "Barely at all", "I am starting from scratch")}${op("exp", "some", "A bit", "I have done it before")}${op("exp", "lots", "A lot", "I train most weeks")}</div><button class="back" type="button" data-back>Back</button></div>
<div class="st"><h3>When can you come?</h3><div class="op">${op("time", "morning", "Mornings", "Before noon")}${op("time", "lunch", "Lunchtime", "Around midday")}${op("time", "evening", "Evenings", "After work")}</div><button class="back" type="button" data-back>Back</button></div>
<div class="rs st" aria-live="polite"></div></div>`;
}

function home(pack) {
  const X = pack.copy.atelier;
  const coaches = pack.coaches.map((c) => `<article class="co live" data-reveal><div class="ph">${img(c.art, c.n, { w: 520, h: 520, hint: "a friendly fitness coach, " + c.role.toLowerCase() })}</div><div class="tx"><h3>${c.n}</h3><small>${c.role}</small><p>${c.bio}</p></div></article>`).join("");
  const classes = pack.cats.map((c) => `<article class="cc" data-reveal><div class="ph">${img(c.art, c.name, { w: 600, h: 520, hint: B.hintOf(pack, c) })}</div><div class="tx"><h3>${c.name}</h3><p>${c.blurb}</p><ul>${c.items.slice(0, 3).map((i) => `<li>${i.n}<span>${K.strip(i.meta)}</span></li>`).join("")}</ul></div></article>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Find the class that <em>feels like yours</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a><a class="btn" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a></div></div>${quiz(pack)}</div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="cl">${classes}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Your coaches</span><h2 style="margin-top:.8rem">Meet <em>the team</em></h2></div></div><div class="cr">${coaches}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm">${X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cg">${c.items.map((i) => `<article class="tc" data-reveal><div class="ph">${img(i.art || c.art, i.n, { w: 360, h: 360, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><div class="ft">${i.star ? '<span class="tg star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/fitness")) {
  return { name: "matcher", themeColor: "#0D1B3D", fonts: FONTS, media: B.mediaFor(pack, "matcher", "motion", "motion").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.matcher || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
