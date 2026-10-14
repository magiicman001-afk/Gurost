"use strict";
/**
 * servicing (garage, real 3D): a pale blueprint look with a turnable 3D spark plug and a "what does my car need?" tool: drag the miles
 * since the last service and each part (oil, filters, plugs, fluids, belt) shows a wear bar that goes from fine to soon to due, with a
 * running example price and a button that pre-fills the booking form. Fonts: Jura + Geist Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Jura-Medium.ttf", "Jura-Medium.ttf"], ["GeistMono-Regular.ttf", "GeistMono-Regular.ttf"], ["GeistMono-Bold.ttf", "GeistMono-Bold.ttf"], ["Jura-OFL.txt", "OFL-Jura.txt"], ["GeistMono-OFL.txt", "OFL-GeistMono.txt"]];
const css = `
@font-face{font-family:"Jura";src:url(fonts/Jura-Medium.ttf) format("truetype");font-weight:400 700;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(fonts/GeistMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(fonts/GeistMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
body{background-image:linear-gradient(rgba(10,116,201,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(10,116,201,.07) 1px,transparent 1px);background-size:32px 32px}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.01em}h1{font-size:clamp(2.6rem,6.6vw,5.4rem);line-height:1.02}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.08}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--mono);color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center;filter:drop-shadow(0 22px 26px rgba(10,40,80,.25))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.sr{border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:clamp(18px,3vw,36px)}.sr .top{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap}.sr .mi{font:700 clamp(2.4rem,6vw,3.8rem)/1 var(--mono);color:var(--accent)}.sr .mi small{font-size:1rem;color:var(--muted);margin-left:.4rem}.sr input[type=range]{width:100%;margin:1.2rem 0 .4rem;accent-color:var(--accent)}
.sr ul{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;gap:.7rem}.sr li{display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,1.2fr) 4.6rem;gap:1rem;align-items:center}.sr li b{font-size:.98rem}.sr li small{display:block;font:400 .74rem var(--mono);color:var(--muted)}.sr .meter{height:10px;border-radius:99px;background:rgba(14,34,51,.1);overflow:hidden}.sr .meter i{display:block;height:100%;width:0;border-radius:99px;background:#2FA56B;transition:width .3s,background .3s}.sr .meter i.soon{background:#E0A41B}.sr .meter i.due{background:#D9402B}.sr .tag{font:700 .72rem var(--mono);text-transform:uppercase;letter-spacing:.06em;text-align:right}.sr .tag.soon{color:#9A6A00}.sr .tag.due{color:#C33621}.sr .tag.ok{color:#1F7F50}
.sr .foot{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:1.4rem;border-top:1px solid var(--line);padding-top:1.2rem}.sr .foot p{margin:0;color:var(--muted)}.sr .foot b{font:700 1.8rem var(--mono);color:var(--ink)}.sr .note{display:block;margin-top:.8rem;font-size:.78rem;color:var(--muted)}
@media(max-width:600px){.sr li{grid-template-columns:minmax(0,1fr) 4.4rem}.sr .meter{grid-column:1/-1;grid-row:2}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 2.6rem/1 var(--mono);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-service]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-service")), rg = c.querySelector("input"), mi = c.querySelector(".mi"), ul = c.querySelector("ul"), tot = c.querySelector("[data-total]"), rec = c.querySelector("[data-rec]"), bk = c.querySelector("[data-book]"), rows = [], due = [];
  D.forEach(function (x) {
    var li = document.createElement("li"), a = document.createElement("div"), b = document.createElement("b"), s = document.createElement("small"), m = document.createElement("div"), i = document.createElement("i"), t = document.createElement("span");
    b.textContent = x.n; s.textContent = "every " + x.e.toLocaleString("en-GB") + " miles, from \\u00A3" + x.p; a.appendChild(b); a.appendChild(s); m.className = "meter"; m.appendChild(i); t.className = "tag"; li.appendChild(a); li.appendChild(m); li.appendChild(t); ul.appendChild(li); rows.push([x, i, t]);
  });
  function calc() {
    var v = +rg.value, sum = 0; due = [];
    mi.firstChild.nodeValue = v.toLocaleString("en-GB");
    rows.forEach(function (r) {
      var k = v / r[0].e, cls = k >= 1 ? "due" : k >= .7 ? "soon" : "ok"; r[1].style.width = Math.min(100, k * 100) + "%"; r[1].className = cls; r[2].className = "tag " + cls; r[2].textContent = cls === "due" ? "Due" : cls === "soon" ? "Soon" : "Fine";
      if (k >= .7) { sum += r[0].p; due.push(r[0].n); }
    });
    var labour = due.length ? 45 : 0; tot.textContent = "\\u00A3" + (sum + labour);
    rec.textContent = !due.length ? "Nothing needed yet." : v >= 18000 ? "We would suggest a full service." : "An interim service would cover it.";
  }
  rg.addEventListener("input", calc); calc();
  bk.addEventListener("click", function () {
    var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Service booking. About " + (+rg.value).toLocaleString("en-GB") + " miles since the last service. " + (due.length ? "Likely due: " + due.join(", ") + "." : "Just a check please.");
    var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
`;
module.exports = R.make({
  name: "servicing", themeColor: "#EAF0F5", fonts: FONTS, preload: ["assets/fonts/Jura-Medium.ttf"], js: JS,
  vars: { bg: "#EAF0F5", surface: "#FFFFFF", ink: "#0E2233", muted: "#566879", line: "rgba(14,34,51,.16)", accent: "#0A74C9", onaccent: "#FFFFFF", c1: "#0A74C9", c2: "#F4B740", c3: "#0E2233", rad: "12px", display: '"Jura",system-ui,sans-serif', sans: '"Jura",system-ui,sans-serif', header: "rgba(234,240,245,.92)" },
  css: css + `:root{--mono:"Geist Mono",ui-monospace,monospace}`,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = [{ n: "Engine oil and filter", e: 10000, p: 59 }, { n: "Air filter", e: 20000, p: 24 }, { n: "Pollen filter", e: 20000, p: 28 }, { n: "Brake fluid", e: 24000, p: 45 }, { n: "Spark plugs", e: 40000, p: 56 }, { n: "Coolant", e: 60000, p: 59 }];
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Service it <em>before</em> it fails.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#plan"><span>What does my car need?</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "plug", "plug", "A spark plug you can turn", { c1: "#0A74C9", c2: "#F4B740", c3: "#0E2233", hint: "a spark plug" })}</div></section>
<section class="sec" id="plan" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Service planner</span><h2 style="margin-top:.8rem">What does your car <em>need now</em>?</h2></div></div><div class="sr" data-service='${JSON.stringify(D)}' data-reveal><div class="top"><div><span class="eyebrow">Miles since your last service</span><div class="mi">0<small>miles</small></div></div></div><input type="range" min="0" max="45000" step="500" value="9500" aria-label="Miles since your last service"><ul></ul><div class="foot"><div><p>Example price for what is due, with labour</p><b data-total></b><p data-rec></p></div><button type="button" class="btn btn-primary" data-book><span>Book this service</span></button></div><span class="note">An example guide only. Your manufacturer's schedule and a technician's check decide what your car really needs.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
