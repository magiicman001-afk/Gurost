"use strict";
/**
 * booker (premium plus, built for beauty and tanning salons): the page IS the booking. A four-step stepper in the middle of the
 * home page: pick a treatment, pick a day (the next fourteen, closed days greyed out), pick a time of day, then review. The
 * choices fill a live "your visit" summary and pre-fill the enquiry form, so the visitor only adds a name and email. It never
 * pretends to show live availability: the salon confirms the exact slot by message. Treatments page has a "Book this" button
 * on each row that jumps back and pre-selects it. Two pages: Home and Treatments.
 * Fonts: Work Sans + Lora (SIL OFL). Pictures from the "motion" set. No hero loop.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"],
  ["WorkSans-OFL.txt", "OFL-WorkSans.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"],
];
const PRELOAD = ["assets/fonts/Lora-Regular.ttf"];

const CSS = `
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
:root{--bg:#F7F2EC;--surface:#FFFFFF;--ink:#1D2A2A;--muted:#566362;--line:rgba(29,42,42,.16);--accent:#0F6B63;--onaccent:#FFFFFF;--c1:#0F6B63;--c2:#9ED8CE;--c3:#E2A66B;--rad:20px;--display:"Lora",Georgia,serif;--sans:"Work Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink)}
h1,h2,h3{font-weight:400}h1{font-size:clamp(2.8rem,7.4vw,6.4rem);line-height:.98;letter-spacing:-.015em}h1 em,h2 em{color:var(--accent)}h2{font-size:clamp(2rem,4.6vw,3.8rem);line-height:1.02;letter-spacing:-.01em}h3{font-family:var(--sans);font-weight:700;font-size:1.05rem}
.lead{font-size:clamp(1.05rem,1.4vw,1.2rem);color:var(--muted);max-width:32em}.eyebrow{color:var(--accent)}
.site-header.is-stuck,.mpanel{background:rgba(247,242,236,.92)}
.hero{padding:clamp(104px,12vw,150px) 0 clamp(20px,3vw,36px)}.hero .wrap{display:grid;grid-template-columns:1.3fr .7fr;gap:clamp(20px,5vw,72px);align-items:center}.hero h1{margin:1rem 0 1.2rem}.hero .fr{--rad:200px 200px 24px 24px;aspect-ratio:3/4;overflow:hidden;background:#DDEFEA}.hero .fr img{width:100%;height:100%;object-fit:cover}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}.hero .fr{max-width:320px}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
/* the booking stepper */
.bk{display:grid;grid-template-columns:1.6fr 1fr;gap:clamp(16px,2.4vw,32px);align-items:start;--rad:28px}
.bk .main{background:var(--surface);border-radius:28px;padding:clamp(18px,3vw,38px)}.bk .tabs{display:flex;gap:.4rem;margin-bottom:1.6rem;flex-wrap:wrap}.bk .tabs button{flex:1;min-width:110px;display:flex;gap:.6rem;align-items:center;font:700 .86rem var(--sans);padding:.8em 1em;border-radius:99px;border:1.5px solid var(--line);background:transparent;color:var(--muted);cursor:pointer}.bk .tabs button span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--line);color:var(--ink);font-size:.76rem}.bk .tabs button[aria-selected=true]{border-color:var(--accent);color:var(--ink)}.bk .tabs button[aria-selected=true] span,.bk .tabs button.done span{background:var(--accent);color:#fff}.bk .tabs button:disabled{opacity:.45;cursor:not-allowed}
.bk .pn{display:none}.bk .pn.on{display:block;animation:pin .5s var(--ease)}@keyframes pin{from{opacity:0;transform:translateY(10px)}}.bk h3.q{font:400 clamp(1.6rem,2.8vw,2.2rem)/1.1 var(--display);margin:0 0 1.2rem}
.tr{display:grid;grid-template-columns:repeat(2,1fr);gap:.7rem}.tr button{display:grid;grid-template-columns:64px 1fr;gap:.9rem;align-items:center;text-align:left;padding:.7rem;border-radius:18px;border:1.5px solid var(--line);background:var(--bg);cursor:pointer;color:var(--ink);transition:.25s}.tr button:hover{border-color:var(--accent)}.tr button[aria-pressed=true]{border-color:var(--accent);background:#E5F3F0;box-shadow:0 0 0 3px rgba(15,107,99,.18)}.tr .ph{width:64px;height:64px;border-radius:14px;overflow:hidden;background:#DDEFEA}.tr img{width:100%;height:100%;object-fit:cover}.tr b{display:block;font:700 .98rem var(--sans)}.tr small{color:var(--muted);font-size:.82rem}.tr .cn{grid-column:1/-1;font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:.6rem 0 -.2rem}
.dy{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.5rem}.dy button{display:grid;gap:.1rem;justify-items:center;padding:.8rem .2rem;border-radius:16px;border:1.5px solid var(--line);background:var(--bg);cursor:pointer;color:var(--ink);transition:.25s}.dy button:hover:not(:disabled){border-color:var(--accent)}.dy button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}.dy small{font:700 .66rem var(--sans);letter-spacing:.1em;text-transform:uppercase;opacity:.75}.dy b{font:400 1.6rem var(--display)}.dy em{font:normal .66rem var(--sans);opacity:.75}.dy button:disabled{opacity:.4;cursor:not-allowed;background:transparent;text-decoration:line-through}
.tm{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem}.tm button{display:grid;gap:.2rem;justify-items:center;padding:1.2rem .6rem;border-radius:18px;border:1.5px solid var(--line);background:var(--bg);cursor:pointer;color:var(--ink);transition:.25s}.tm button:hover{border-color:var(--accent)}.tm button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}.tm b{font:400 1.5rem var(--display)}.tm small{font-size:.8rem;opacity:.8}
.bk .note{margin:1.2rem 0 0;color:var(--muted);font-size:.9rem}.bk .go{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1.4rem}
.bk .rv dl{display:grid;grid-template-columns:auto 1fr;gap:.6rem 1.4rem;margin:0 0 1.4rem}.bk .rv dt{color:var(--muted);font-size:.9rem}.bk .rv dd{margin:0;font:700 1.02rem var(--sans)}
.bk .side{position:sticky;top:96px;background:var(--accent);color:#fff;border-radius:28px;padding:clamp(20px,3vw,34px);display:grid;gap:1rem}.bk .side h3{font:italic 1.9rem var(--display);margin:0}.bk .side ul{list-style:none;margin:0;padding:0;display:grid;gap:.8rem}.bk .side li{border-top:1px solid rgba(255,255,255,.25);padding-top:.7rem}.bk .side li small{display:block;font:700 .68rem var(--sans);letter-spacing:.12em;text-transform:uppercase;opacity:.75}.bk .side li span{font:700 1.05rem var(--sans)}.bk .side li.empty span{opacity:.55;font-weight:400}.bk .side p{margin:0;font-size:.88rem;opacity:.85}
@media(max-width:920px){.bk{grid-template-columns:1fr}.bk .side{position:static;order:-1}}@media(max-width:560px){.tr{grid-template-columns:1fr}.dy{grid-template-columns:repeat(4,minmax(0,1fr))}.tm{grid-template-columns:1fr}.bk .tabs button{min-width:0;padding:.7em .6em;font-size:.78rem}}
/* the rest */
.fv{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,2vw,26px)}.fc{background:var(--surface);padding:10px;--rad:24px}.fc .ph{aspect-ratio:1;border-radius:16px;overflow:hidden;background:#DDEFEA}.fc img{width:100%;height:100%;object-fit:cover}.fc .tx{padding:1rem .5rem .5rem}.fc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline}.fc h3 span{font:700 .8rem var(--sans);color:var(--accent);white-space:nowrap}.fc p{margin:.4rem 0 .8rem;color:var(--muted)}.fc a.bkb{font:700 .86rem var(--sans);color:var(--accent);text-decoration:underline;text-underline-offset:3px}@media(max-width:860px){.fv{grid-template-columns:1fr}}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px);text-align:center}.nm b{display:block;font:400 clamp(2rem,6vw,4.6rem)/1 var(--display);color:var(--accent)}.nm span{font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.sy{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,6vw,90px);align-items:center}.sy .ph{aspect-ratio:4/5;border-radius:200px 200px 24px 24px;overflow:hidden;background:#DDEFEA}.sy img{width:100%;height:100%;object-fit:cover}.sy h2{margin:1rem 0 1.2rem}@media(max-width:820px){.sy{grid-template-columns:1fr}.sy .ph{aspect-ratio:16/11;border-radius:24px}}
.cg{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(12px,1.8vw,22px)}.tc{display:grid;grid-template-columns:120px 1fr;gap:1.1rem;padding:12px;background:var(--surface);border-radius:20px}.tc .ph{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#DDEFEA}.tc img{width:100%;height:100%;object-fit:cover}.tc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline}.tc h3 span{font:700 .8rem var(--sans);color:var(--accent);text-align:right}.tc p{margin:.4rem 0 .7rem;color:var(--muted);font-size:.95rem}.tc .ft{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}.tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:#E5F3F0;color:var(--accent)}.tc .bkb{margin-left:auto;font:700 .84rem var(--sans);padding:.6em 1em;border-radius:99px;background:var(--accent);color:#fff}
.grp{padding-top:clamp(22px,3.4vw,40px)}.gh{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}.gh h2{font-size:clamp(1.8rem,3.4vw,2.6rem)}.gh p{margin:0;color:var(--muted)}
@media(max-width:760px){.cg{grid-template-columns:1fr}.tc{grid-template-columns:96px 1fr}}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0}
`;

const JS = `
(function () {
  var bk = document.querySelector("[data-bk]"); if (!bk) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var st = { tr: "", day: "", time: "" }, step = 1, tabs = $$(".tabs button", bk), pns = $$(".pn", bk);
  var closed = (bk.getAttribute("data-closed") || "").split(",").filter(Boolean).map(Number);
  var DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], FD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var dy = $(".dy", bk), now = new Date();
  for (var i = 0; i < 14; i++) {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i), b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-pressed", "false"); b.dataset.v = FD[d.getDay()] + " " + d.getDate() + " " + MN[d.getMonth()];
    b.innerHTML = "<small>" + DN[d.getDay()] + "</small><b>" + d.getDate() + "</b><em>" + MN[d.getMonth()] + "</em>";
    if (closed.indexOf(d.getDay()) > -1) { b.disabled = true; b.title = "Closed"; }
    dy.appendChild(b);
  }
  function show(n) {
    step = n;
    pns.forEach(function (p, k) { p.classList.toggle("on", k + 1 === n); });
    tabs.forEach(function (x, k) { x.setAttribute("aria-selected", k + 1 === n ? "true" : "false"); x.classList.toggle("done", k + 1 < n); x.disabled = k + 1 > reach(); });
  }
  function reach() { return !st.tr ? 1 : !st.day ? 2 : !st.time ? 3 : 4; }
  function sum() {
    var v = [st.tr, st.day, st.time];
    $$(".side li", bk).forEach(function (li, k) { li.classList.toggle("empty", !v[k]); $("span", li).textContent = v[k] || "Not chosen yet"; });
    $$("[data-rv]", bk).forEach(function (x) { x.textContent = st[x.dataset.rv] || "-"; });
    var f = document.querySelector("#order form"); if (!f) return;
    var m = f.querySelector("textarea[name=message]"), a = f.querySelector("input[name=about]");
    if (st.tr && st.day && st.time) {
      if (m && (!m.value || m.dataset.auto)) { m.value = "Hi, I would like to book " + st.tr + " on " + st.day + ", " + st.time.toLowerCase() + ". Please let me know what is free."; m.dataset.auto = "1"; }
      if (a && (!a.value || a.dataset.auto)) { a.value = "Booking: " + st.tr; a.dataset.auto = "1"; }
    }
  }
  function pick(group, key, btn, next) {
    $$("button", group).forEach(function (x) { x.setAttribute("aria-pressed", x === btn ? "true" : "false"); });
    st[key] = btn.dataset.v; sum(); show(next);
  }
  $$("[data-tr] button", bk).forEach(function (b) { b.addEventListener("click", function () { pick($("[data-tr]", bk), "tr", b, 2); }); });
  dy.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b && !b.disabled) pick(dy, "day", b, 3); });
  $$(".tm button", bk).forEach(function (b) { b.addEventListener("click", function () { pick($(".tm", bk), "time", b, 4); }); });
  tabs.forEach(function (x, k) { x.addEventListener("click", function () { if (k + 1 <= reach()) show(k + 1); }); });
  $$("[data-back]", bk).forEach(function (b) { b.addEventListener("click", function () { show(Math.max(1, step - 1)); }); });
  function fromHash() {
    var h = decodeURIComponent((location.hash || "").replace("#", "")); if (h.indexOf("book=") !== 0) return;
    var want = h.slice(5), b = $$("[data-tr] button", bk).filter(function (x) { return x.dataset.s === want; })[0];
    if (b) { pick($("[data-tr]", bk), "tr", b, 2); bk.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  window.addEventListener("hashchange", fromHash); show(1); sum(); fromHash();
})();
`;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const TIMES = [["Morning", "9am to 12pm"], ["Afternoon", "12pm to 4pm"], ["Late", "4pm to close"]];

function stepper(pack, X) {
  const trs = pack.cats.map((c) => `<span class="cn">${c.name}</span>` + c.items.map((i) => `<button type="button" aria-pressed="false" data-v="${i.n}" data-s="${slug(i.n)}"><span class="ph">${img(i.art || c.art, i.n, { w: 160, h: 160, hint: B.hintOf(pack, i) })}</span><span><b>${i.n}</b><small>${K.strip(i.meta)}</small></span></button>`).join("")).join("");
  return `<div class="bk" id="book" data-bk data-closed="${(pack.closedDays || [0]).join(",")}">
<div class="main live"><div class="tabs" role="tablist" aria-label="Booking steps"><button type="button" role="tab" aria-selected="true"><span>1</span>Treatment</button><button type="button" role="tab" aria-selected="false" disabled><span>2</span>Day</button><button type="button" role="tab" aria-selected="false" disabled><span>3</span>Time</button><button type="button" role="tab" aria-selected="false" disabled><span>4</span>Review</button></div>
<div class="pn on"><h3 class="q">What would you like?</h3><div class="tr" data-tr>${trs}</div></div>
<div class="pn"><h3 class="q">Which day suits you?</h3><div class="dy"></div><p class="note">Greyed days are closed. We confirm the exact slot by message.</p><div class="go"><button class="btn" type="button" data-back><span>Back</span></button></div></div>
<div class="pn"><h3 class="q">Roughly what time?</h3><div class="tm">${TIMES.map(([a, b]) => `<button type="button" aria-pressed="false" data-v="${a} (${b})"><b>${a}</b><small>${b}</small></button>`).join("")}</div><div class="go"><button class="btn" type="button" data-back><span>Back</span></button></div></div>
<div class="pn rv"><h3 class="q">Nearly there</h3><dl><dt>Treatment</dt><dd data-rv="tr"></dd><dt>Day</dt><dd data-rv="day"></dd><dt>Time</dt><dd data-rv="time"></dd></dl><p class="lead" style="margin:0 0 .6rem">Add your name and email below and we will confirm your slot within a day.</p><div class="go"><a class="btn btn-primary" href="#order"><span>${X.orderHome ? "Finish below" : "Continue"}</span></a><button class="btn" type="button" data-back><span>Change something</span></button></div></div></div>
<aside class="side" aria-live="polite"><h3>Your visit</h3><ul><li class="empty"><small>Treatment</small><span>Not chosen yet</span></li><li class="empty"><small>Day</small><span>Not chosen yet</span></li><li class="empty"><small>Time</small><span>Not chosen yet</span></li></ul><p>${t("address_line1")}, ${t("address_line2")}. No payment needed to ask.</p></aside></div>`;
}

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack), star = all.filter((i) => i.star).slice(0, 3), lead = star[0] || all[0];
  const fav = star.map((i) => `<article class="fc live" data-reveal><div class="ph">${img(i.art, i.n, { w: 700, h: 700, hint: B.hintOf(pack, i) })}</div><div class="tx"><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><a class="bkb" href="#book=${slug(i.n)}">Book this</a></div></article>`).join("");
  const body = `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#book"><span>${X.cta1}</span></a><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div></div>
<div class="fr live">${img(lead.art, lead.n, { role: "featured", w: 800, h: 1100, hint: B.hintOf(pack, lead), lazy: false })}</div></div></section>
<section class="sec" style="padding-top:clamp(20px,3vw,40px)"><div class="wrap">${stepper(pack, X)}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.fav[0]}</span><h2 style="margin-top:.8rem">${X.fav[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="fv">${fav}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm" data-reveal>${X.stats.map(([v, s, l]) => `<div><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sy"><div class="ph" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 1100, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="grp" id="${c.id}" data-cat="${c.id}"><div class="gh"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cg">${c.items.map((i) => `<article class="tc" data-reveal><div class="ph shine">${img(i.art || c.art, i.n, { w: 360, h: 360, hint: B.hintOf(pack, i) })}</div><div><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p><div class="ft">${i.star ? '<span class="tg">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}<a class="bkb" href="index.html#book=${slug(i.n)}">Book this</a></div></div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p><div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap">${grp}</div><div style="height:clamp(20px,4vw,50px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/beauty")) {
  return { name: "booker", themeColor: "#F7F2EC", fonts: FONTS, media: B.mediaFor(pack, "booker", "motion", "motion").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.booker || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
