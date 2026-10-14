"use strict";
/**
 * verdict (law firm, real 3D): a dark, dramatic layout. A giant 3D set of scales turns as you scroll beside big numbers, and a
 * "book your free 15 minute call" picker offers the next five working days and time slots and pre-fills the form. Fonts: Crimson
 * Pro + JetBrains Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["JetBrainsMono-Regular.ttf", "JetBrainsMono-Regular.ttf"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"], ["JetBrainsMono-OFL.txt", "OFL-JetBrainsMono.txt"]];
const css = `
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:200 900;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:200 900;font-style:italic;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/JetBrainsMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
body{font-family:"Crimson Pro",Georgia,serif;font-size:1.1rem}.btn,.eyebrow,.chips{font-family:var(--sans)}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:-.02em}h1{font-size:clamp(3rem,8.2vw,7.6rem);line-height:.96}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1}h3{font-size:1.5rem}
h1 em,h2 em{color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em;text-transform:uppercase;font-size:.75rem}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(30px,5vw,60px);background:radial-gradient(ellipse 50% 60% at 75% 45%,rgba(201,154,62,.16),transparent 70%)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:520px;justify-self:center;filter:drop-shadow(0 28px 34px rgba(0,0,0,.55))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,32px);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:clamp(20px,4vw,44px) 0}.nm div{display:grid;gap:.3rem}.nm b{font:500 clamp(2.6rem,7vw,5.6rem)/1 var(--display);color:var(--accent)}.nm span{font:400 .75rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}@media(max-width:640px){.nm{grid-template-columns:minmax(0,1fr)}}
.bk{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(20px,4vw,60px);align-items:start;border:1px solid var(--line);border-radius:24px;padding:clamp(20px,4vw,52px);background:var(--surface)}.bk .grp{display:grid;gap:.6rem;margin-bottom:1.2rem}.bk .grp>span{font:400 .72rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}.bk .ch{display:flex;gap:.5rem;flex-wrap:wrap}.bk .ch button{font:400 .85rem var(--sans);border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:12px;padding:.6rem .9rem;cursor:pointer}.bk .ch button[aria-pressed=true]{background:var(--accent);color:var(--onaccent);border-color:var(--accent)}
.bk .sum{border:1px dashed var(--accent);border-radius:16px;padding:1rem 1.2rem;font:400 .9rem var(--sans);color:var(--ink)}.bk .sum b{color:var(--accent)}@media(max-width:820px){.bk{grid-template-columns:minmax(0,1fr)}}
.qt{max-width:46rem}.qt blockquote{margin:0;font:500 clamp(1.6rem,3.6vw,2.8rem)/1.2 var(--display)}.qt cite{display:block;margin-top:1rem;font:400 .8rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-style:normal}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:100px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:100px;height:100px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:1rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var b = document.querySelector("[data-book]"); if (!b) return;
  var days = b.querySelector('[data-g="day"]'), times = b.querySelector('[data-g="time"]'), sum = b.querySelector(".sum"), pick = {};
  var N = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var d = new Date(), n = 0; while (n < 5) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 === 0) continue; n++; var x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-pressed", "false"); x.textContent = N[d.getDay()] + " " + d.getDate() + " " + M[d.getMonth()]; days.appendChild(x); }
  ["9:30am", "11:00am", "12:30pm", "2:00pm", "3:30pm", "5:00pm"].forEach(function (t) { var x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-pressed", "false"); x.textContent = t; times.appendChild(x); });
  function u() { var ok = pick.day && pick.time; sum.innerHTML = ok ? "Your free 15 minute call: <b>" + pick.day + " at " + pick.time + "</b>. Send your details below and we will confirm." : "Choose a day and a time, and we will pre-fill your request."; if (ok) { var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Free first call request: " + pick.day + " at " + pick.time + "."; } }
  function wire(g, k) { g.addEventListener("click", function (e) { var t = e.target.closest("button"); if (!t) return; [].slice.call(g.querySelectorAll("button")).forEach(function (y) { y.setAttribute("aria-pressed", y === t ? "true" : "false"); }); pick[k] = t.textContent; u(); }); }
  wire(days, "day"); wire(times, "time"); u();
})();
`;
module.exports = R.make({
  name: "verdict", themeColor: "#0E0E10", fonts: FONTS, preload: ["assets/fonts/CrimsonPro-Regular.ttf"], js: JS,
  vars: { bg: "#0E0E10", surface: "#171719", ink: "#F2EEE4", muted: "#A8A398", line: "rgba(242,238,228,.16)", accent: "#D4A74A", onaccent: "#14110A", c1: "#D4A74A", c2: "#F1D78F", c3: "#D4A74A", rad: "12px", display: '"Crimson Pro",Georgia,serif', sans: '"JetBrains Mono",ui-monospace,monospace', header: "rgba(14,14,16,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t, rv = pack.reviews[0];
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#book"><span>Book a free call</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "scales", "scales", "The scales of justice, turning as you scroll", { c1: "#D4A74A", c2: "#F1D78F", lum: 1.5, hint: "the scales of justice" }).replace('data-gl3d="scales"', 'data-gl3d="scales" data-scroll')}</div></section>
<section class="sec" style="padding-bottom:0"><div class="wrap"><div class="nm">${nums}</div></div></section>
<section class="sec" id="book"><div class="wrap"><div class="bk" data-book data-reveal><div><span class="eyebrow">Free first call</span><h2 style="margin-top:.8rem">Fifteen minutes. <em>No obligation.</em></h2><p class="lead">Pick a time and a solicitor will call you. Tell us a little about what has happened and we will explain where you stand.</p></div><div><div class="grp"><span>Choose a day</span><div class="ch" data-g="day"></div></div><div class="grp"><span>Choose a time</span><div class="ch" data-g="time"></div></div><div class="sum"></div><a class="btn btn-primary" href="#order" style="margin-top:1rem"><span>Continue</span></a></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap qt" data-reveal><blockquote>&ldquo;${rv.q}&rdquo;</blockquote><cite>${rv.by}</cite></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
