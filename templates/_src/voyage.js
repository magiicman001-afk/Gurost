"use strict";
/**
 * voyage (hotel and travel, real 3D): deep ocean navy and sand with a slowly spinning 3D globe and a "where and when?" explorer: pick
 * a destination and see flight time, example price and a twelve-month bar chart of the best time to go, then ask us to plan it.
 * Fonts: Outfit + Crimson Pro (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["Outfit-OFL.txt", "OFL-Outfit.txt"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"]];
const css = `
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
body{font-family:var(--serif);font-size:1.12rem}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:.98}h2{font-size:clamp(2rem,4.2vw,3.3rem);line-height:1.05}h3{font-size:1.2rem;letter-spacing:-.01em}
h1 em,h2 em{font-family:var(--serif);font-style:italic;font-weight:400;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:470px;justify-self:center;filter:drop-shadow(0 26px 34px rgba(0,0,0,.45))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.vx{border:1px solid var(--line);border-radius:26px;background:linear-gradient(180deg,#12303A,#0C2129);padding:clamp(18px,3vw,38px)}.vx .chips2{display:flex;gap:.5rem;flex-wrap:wrap}.vx .chips2 button{font:700 .9rem var(--display);border:1px solid var(--line);border-radius:99px;background:transparent;color:var(--ink);padding:.6rem 1.1rem;cursor:pointer}.vx .chips2 button[aria-pressed=true]{background:var(--accent);color:var(--onaccent);border-color:var(--accent)}
.vx .body{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(18px,4vw,48px);margin-top:clamp(18px,3vw,30px);align-items:end}.vx h3{font-size:clamp(2rem,5vw,3.4rem);margin:0 0 .4rem}.vx p{margin:0;color:var(--muted)}.vx .facts{display:flex;gap:1.6rem;flex-wrap:wrap;margin:1.1rem 0}.vx .facts div{font:700 .72rem var(--display);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.vx .facts b{display:block;font:700 1.9rem/1.1 var(--display);color:var(--ink);letter-spacing:-.02em;text-transform:none}
.bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:clamp(3px,1vw,8px);align-items:end;height:160px}.bars div{display:grid;align-content:end;justify-items:center;gap:.4rem;height:100%}.bars i{display:block;width:100%;border-radius:8px 8px 3px 3px;background:#2C5A66;transition:height .4s var(--ease)}.bars i.g1{background:#4F9BA8}.bars i.g2{background:var(--accent)}.bars span{font:700 .62rem var(--display);color:var(--muted);letter-spacing:.04em}.bars div.now span{color:var(--ink)}.bars div.now i{outline:2px solid var(--ink);outline-offset:2px}
.vx .cap{margin-top:.7rem;font-size:.9rem;color:var(--muted)}.vx .btn{margin-top:1.2rem}.vx .note{display:block;margin-top:.9rem;font-size:.78rem;color:var(--muted)}
@media(max-width:820px){.vx .body{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 2.6rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-voy]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-voy")), bs = [].slice.call(c.querySelectorAll(".chips2 button")), h = c.querySelector("h3"), p = c.querySelector(".what"), fl = c.querySelector("[data-fl]"), pr = c.querySelector("[data-pr]"), bars = c.querySelector(".bars"), cap = c.querySelector(".cap"), cur = 0;
  var M = ["J","F","M","A","M","J","J","A","S","O","N","D"], MN = ["January","February","March","April","May","June","July","August","September","October","November","December"], now = new Date().getMonth();
  function show(i) {
    cur = i; var d = D[i]; h.textContent = d.n; p.textContent = d.d; fl.textContent = d.f; pr.textContent = "\\u00A3" + d.p; bars.innerHTML = "";
    d.m.forEach(function (v, k) { var w = document.createElement("div"), b = document.createElement("i"), s = document.createElement("span"); b.className = "g" + v; b.style.height = (22 + v * 26) + "%"; s.textContent = M[k]; w.appendChild(b); w.appendChild(s); if (k === now) w.className = "now"; bars.appendChild(w); });
    var best = []; d.m.forEach(function (v, k) { if (v === 2) best.push(MN[k].slice(0, 3)); }); cap.textContent = "Best months (bright bars): " + (best.length ? best.join(", ") : "all year") + ". The outlined bar is this month.";
    bs.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
  }
  bs.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); }); show(0);
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Trip enquiry: " + D[cur].n + ". Please plan flights, hotel and transfers. Travel month: "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "voyage", themeColor: "#0C2129", fonts: FONTS, preload: ["assets/fonts/Outfit-Bold.ttf"], js: JS,
  vars: { bg: "#0C2129", surface: "#12303A", ink: "#F3EBDD", muted: "#9DB4B8", line: "rgba(243,235,221,.17)", accent: "#F0B25F", onaccent: "#1A1208", c1: "#2F8FA0", c2: "#F0B25F", c3: "#0C2129", rad: "14px", display: '"Outfit",system-ui,sans-serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(12,33,41,.92)" },
  css: css + `:root{--serif:"Crimson Pro",Georgia,serif}`,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = [
      { n: "Lisbon", d: "Hilltop viewpoints, custard tarts and trams, with the sea an hour away.", f: "2 h 50", p: 420, m: [1, 1, 1, 2, 2, 2, 1, 1, 2, 2, 1, 0] },
      { n: "Rome", d: "Ancient streets, long lunches and a fountain around every corner.", f: "2 h 40", p: 395, m: [0, 1, 1, 2, 2, 2, 1, 1, 2, 2, 1, 0] },
      { n: "Reykjavik", d: "Hot springs, waterfalls and, in winter, the northern lights.", f: "3 h 10", p: 560, m: [1, 1, 1, 1, 1, 2, 2, 2, 1, 1, 1, 1] },
      { n: "Marrakech", d: "Souks, riads and rooftop mint tea under the Atlas mountains.", f: "3 h 45", p: 480, m: [0, 1, 2, 2, 2, 0, 0, 0, 1, 2, 2, 1] },
      { n: "Prague", d: "Bridges, beer halls and a fairytale old town you can walk in a day.", f: "2 h 00", p: 340, m: [0, 0, 1, 2, 2, 2, 1, 1, 2, 1, 1, 2] },
      { n: "Santorini", d: "White villages, blue domes and sunsets worth planning a trip around.", f: "3 h 50", p: 610, m: [0, 0, 0, 1, 2, 2, 1, 1, 2, 2, 0, 0] },
    ];
    const chips = D.map((d, i) => `<button type="button" aria-pressed="${i === 0}">${d.n}</button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Where <em>next</em>?</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#where"><span>Find my trip</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "globe", "compass", "A globe you can turn", { c1: "#2F8FA0", c2: "#F0B25F", c3: "#0C2129", hint: "a desk globe" })}</div></section>
<section class="sec" id="where" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Trip finder</span><h2 style="margin-top:.8rem">Where, and <em>when to go</em>?</h2></div></div><div class="vx" data-voy='${JSON.stringify(D)}' data-reveal><div class="chips2">${chips}</div><div class="body"><div><h3></h3><p class="what"></p><div class="facts"><div>Flight from London<b data-fl></b></div><div>Example, from<b data-pr></b></div></div><button type="button" class="btn btn-primary" data-book><span>Plan this trip</span></button><span class="note">Example fares and months. We confirm real prices and dates before you pay anything.</span></div><div><div class="bars" role="img" aria-label="Best months to travel, January to December"></div><p class="cap"></p></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
