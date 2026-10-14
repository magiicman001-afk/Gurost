"use strict";
/**
 * metrics (tech agency and SaaS, real 3D): a bright sky-blue and navy look with a turnable, spinning 3D globe and a working product
 * dashboard demo: switch between 7, 30 and 90 days and between visitors, sign-ups and revenue, and the headline figure, the change
 * against the last period and an animated bar chart update; tap a bar to read the day. Shows what a custom dashboard from the agency
 * feels like. Pre-fills the call request. Fonts: Jura + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Jura-Medium.ttf", "Jura-Medium.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Jura-OFL.txt", "OFL-Jura.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Jura";src:url(fonts/Jura-Medium.ttf) format("truetype");font-weight:500 700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:600;letter-spacing:-.02em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1}h2{font-size:clamp(1.9rem,4.2vw,3.1rem);line-height:1.08}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.18em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.mt{border-radius:20px;background:#0F1F3D;color:#EAF2FF;padding:clamp(16px,3vw,32px);box-shadow:0 24px 60px rgba(15,31,61,.3)}.mt .tabs{display:flex;gap:1rem;justify-content:space-between;flex-wrap:wrap;align-items:center}.mt .opt{display:flex;gap:.4rem;flex-wrap:wrap}.mt .opt button{font:700 .86rem var(--sans);border:1px solid #2C4570;background:transparent;color:#B8CBEA;border-radius:999px;padding:.5rem .95rem;cursor:pointer}.mt .opt button[aria-pressed=true]{background:#38BDF8;border-color:#38BDF8;color:#06223F}
.mt .kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,2vw,18px);margin:1.2rem 0}.mt .kpi button{text-align:left;border:1px solid #2C4570;background:#14294D;color:#EAF2FF;border-radius:14px;padding:clamp(10px,2vw,18px);cursor:pointer}.mt .kpi button[aria-pressed=true]{border-color:#38BDF8;background:#1B3560}.mt .kpi span{display:block;font:400 .74rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:#9FB6D8}.mt .kpi b{display:block;font:600 clamp(1.3rem,4.4vw,2.2rem)/1.1 var(--display);margin:.3rem 0 .15rem}.mt .kpi i{font:700 .78rem var(--sans);font-style:normal;color:#4ADE80}.mt .kpi i.neg{color:#F87171}
.mt .chart{position:relative;height:clamp(150px,28vw,240px);display:flex;align-items:flex-end;gap:2px;border-bottom:1px solid #2C4570}.mt .chart button{flex:1 1 0;min-width:0;border:0;padding:0;background:linear-gradient(180deg,#38BDF8,#2563EB);border-radius:3px 3px 0 0;height:4%;transition:height .6s cubic-bezier(.2,.7,.2,1);cursor:pointer;opacity:.85}.mt .chart button:hover,.mt .chart button.on{opacity:1;background:linear-gradient(180deg,#FDE047,#F59E0B)}
.mt .read{min-height:1.5rem;margin:.8rem 0 0;font:400 .88rem var(--sans);color:#B8CBEA}.mt .btn-primary{background:#38BDF8;border-color:#38BDF8;color:#06223F}.mt .foot{display:flex;gap:1rem;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-top:1rem}.mt .note{font-size:.76rem;color:#8EA6CA}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:600 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:16px;background:#fff;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-metrics]"); if (!c) return;
  var M = JSON.parse(c.getAttribute("data-metrics")), st = { r: 1, k: 0 }, line = "", ch = c.querySelector(".chart"), rd = c.querySelector(".read");
  var DAYS = [7, 30, 90], seed = 11;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  var data = M.map(function (m) { var a = []; for (var i = 0; i < 180; i++) a.push(Math.max(.15, 1 + Math.sin(i / 9) * .18 + (i / 180) * .9 + (rnd() - .5) * .35)); return a; });
  function fmt(k, v) { return k === 2 ? "\\u00A3" + Math.round(v).toLocaleString("en-GB") : Math.round(v).toLocaleString("en-GB"); }
  function draw() {
    var n = DAYS[st.r], kk = st.k, now = data[kk].slice(180 - n), prev = data[kk].slice(180 - 2 * n < 0 ? 0 : 180 - 2 * n, 180 - n);
    M.forEach(function (m, k) { var d = data[k].slice(180 - n), p = data[k].slice(Math.max(0, 180 - 2 * n), 180 - n), s = 0, q = 0; d.forEach(function (x) { s += x * m.s; }); p.forEach(function (x) { q += x * m.s; }); var ch2 = q ? (s - q) / q * 100 : 0, kb = c.querySelectorAll(".kpi button")[k]; kb.querySelector("b").textContent = fmt(k, s); var i = kb.querySelector("i"); i.textContent = (ch2 >= 0 ? "+" : "") + ch2.toFixed(1) + "% vs previous " + n + " days"; i.className = ch2 < 0 ? "neg" : ""; kb.setAttribute("aria-pressed", k === kk ? "true" : "false"); });
    var mx = Math.max.apply(null, now), html = ""; now.forEach(function (v, i) { html += '<button type="button" data-i="' + i + '" aria-label="' + fmt(kk, v * M[kk].s) + '" style="height:' + Math.round(v / mx * 96) + '%"></button>'; });
    ch.innerHTML = html; rd.textContent = "Tap a bar to read the day.";
    [].forEach.call(ch.children, function (b) { b.addEventListener("click", function () { [].forEach.call(ch.children, function (x) { x.className = ""; }); b.className = "on"; var d = new Date(Date.now() - (n - 1 - +b.getAttribute("data-i")) * 86400000); rd.textContent = d.toLocaleDateString("en-GB", { day: "numeric", month: "long" }) + ": " + b.getAttribute("aria-label") + " " + M[kk].u; }); });
    line = "Dashboard demo: " + M[kk].n + " over " + n + " days. I would like something like this for my business. About my project: ";
  }
  [].forEach.call(c.querySelectorAll(".opt button"), function (b, i) { b.addEventListener("click", function () { st.r = i; [].forEach.call(c.querySelectorAll(".opt button"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); draw(); }); });
  [].forEach.call(c.querySelectorAll(".kpi button"), function (b, i) { b.addEventListener("click", function () { st.k = i; draw(); }); });
  draw();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const M = [{ n: "Visitors", u: "visitors", s: 640 }, { n: "Sign-ups", u: "sign-ups", s: 38 }, { n: "Revenue", u: "in revenue", s: 920 }];
module.exports = R.make({
  name: "metrics", themeColor: "#EAF4FF", fonts: FONTS, preload: ["assets/fonts/Jura-Medium.ttf"], js: JS,
  vars: { bg: "#EAF4FF", surface: "#FFFFFF", ink: "#0F1F3D", muted: "#4F6585", line: "#CFE0F5", accent: "#1D6FE0", onaccent: "#FFFFFF", c1: "#38BDF8", c2: "#2563EB", c3: "#0F1F3D", rad: "12px", display: '"Jura",system-ui,sans-serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(234,244,255,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const kp = M.map((m, i) => `<button type="button" aria-pressed="${i === 0}"><span>${m.n}</span><b></b><i></i></button>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>See your business <em>in real time</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#dash"><span>Try the dashboard</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "globe", "cloud", "A spinning globe", { c1: "#2563EB", c2: "#38BDF8", c3: "#0F1F3D", hint: "a globe" })}</div></section>
<section class="sec" id="dash" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Dashboard demo</span><h2 style="margin-top:.8rem">The numbers that matter, <em>one tap away</em></h2></div></div><div class="mt" data-metrics='${JSON.stringify(M)}' data-reveal><div class="tabs"><div class="opt"><button type="button" aria-pressed="false">7 days</button><button type="button" aria-pressed="true">30 days</button><button type="button" aria-pressed="false">90 days</button></div></div><div class="kpi">${kp}</div><div class="chart"></div><p class="read"></p><div class="foot"><span class="note">Illustrative data. A custom dashboard shows your real numbers, live.</span><button type="button" class="btn btn-primary" data-book><span>I want one like this</span></button></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
