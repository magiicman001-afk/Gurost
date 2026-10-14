"use strict";
/**
 * drop (fashion and online shop, real 3D): a dark streetwear look (near-black, acid lime) with a turnable 3D stopwatch and a live
 * "next drop" board: a ticking countdown to the next Friday 10am release, a waitlist that grows through the week, three limited
 * pieces with a stock bar that fills as the drop approaches, and a notify-me box that pre-fills the question form. Fonts: Boldonse +
 * JetBrains Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Boldonse-Regular.ttf", "Boldonse-Regular.ttf"], ["JetBrainsMono-Regular.ttf", "JetBrainsMono-Regular.ttf"], ["JetBrainsMono-Bold.ttf", "JetBrainsMono-Bold.ttf"], ["Boldonse-OFL.txt", "OFL-Boldonse.txt"], ["JetBrainsMono-OFL.txt", "OFL-JetBrainsMono.txt"]];
const css = `
@font-face{font-family:"Boldonse";src:url(fonts/Boldonse-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/JetBrainsMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/JetBrainsMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:0;line-height:1.5}h1{font-size:clamp(1.9rem,6vw,4.4rem);line-height:1.45}h2{font-size:clamp(1.4rem,3.6vw,2.6rem);line-height:1.5}h3{font-size:1rem;line-height:1.6}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--sans);color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.dr{border:1px solid #2C3027;background:#12140F;padding:clamp(16px,3vw,34px);border-radius:6px}.dr .clock{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(8px,2vw,20px);text-align:center}.dr .clock div{border:1px solid #2C3027;padding:clamp(12px,3vw,26px) 0;background:#0B0C09}.dr .clock b{display:block;font:700 clamp(2rem,8vw,4.6rem)/1 var(--sans);color:var(--accent);font-variant-numeric:tabular-nums}.dr .clock span{font:400 .7rem var(--sans);letter-spacing:.2em;text-transform:uppercase;color:#8C9482}
.dr .when{margin:1rem 0 0;color:#B9C2AD;font-size:.9rem}.dr .wl{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:1.4rem;border-top:1px solid #2C3027;padding-top:1.1rem;color:#B9C2AD}.dr .wl b{color:var(--accent);font-size:1.3rem}
.dr .pieces{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(8px,2vw,18px);margin-top:1.4rem}.dr .pc{border:1px solid #2C3027;background:#0B0C09;padding:1rem}.dr .pc img{width:100%;max-width:140px;height:auto;display:block;margin:0 auto .6rem}.dr .pc b{display:block;font:700 .9rem var(--sans);color:#EFF5E4}.dr .pc span{font-size:.78rem;color:#8C9482}.dr .bar{height:8px;background:#23271E;margin-top:.7rem}.dr .bar i{display:block;height:100%;width:0;background:var(--accent);transition:width 1s}.dr .left{font-size:.72rem;color:#B9C2AD;margin-top:.35rem}
@media(max-width:700px){.dr .pieces{grid-template-columns:minmax(0,1fr)}.dr .pc{display:grid;grid-template-columns:90px minmax(0,1fr);gap:.8rem;align-items:center}.dr .pc img{margin:0}}
.dr form{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.4rem}.dr input{flex:1 1 220px;min-width:0;font:400 1rem var(--sans);background:#0B0C09;color:#EFF5E4;border:1px solid #3A4033;padding:.85rem 1rem;border-radius:4px}.dr .note{display:block;margin-top:.7rem;font-size:.74rem;color:#8C9482}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:400 2rem/1.3 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid #2C3027;background:#12140F;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.86rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-drop]"); if (!c) return;
  var L = JSON.parse(c.getAttribute("data-drop")), bars = [].slice.call(c.querySelectorAll(".bar i")), lefts = [].slice.call(c.querySelectorAll(".left")), em = c.querySelector("input");
  function next() { var d = new Date(), t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0), add = (5 - d.getDay() + 7) % 7; t.setDate(t.getDate() + add); if (t <= d) t.setDate(t.getDate() + 7); return t; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tick() {
    var now = new Date(), t = next(), s = Math.max(0, Math.floor((t - now) / 1000)), W = 7 * 86400, prog = 1 - s / W;
    c.querySelector("[data-dd]").textContent = pad(Math.floor(s / 86400)); c.querySelector("[data-hh]").textContent = pad(Math.floor(s % 86400 / 3600)); c.querySelector("[data-mm]").textContent = pad(Math.floor(s % 3600 / 60)); c.querySelector("[data-ss]").textContent = pad(s % 60);
    c.querySelector("[data-when]").textContent = "Next drop: " + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][t.getDay()] + " " + t.getDate() + " " + ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][t.getMonth()] + " at 10:00.";
    c.querySelector("[data-wl]").textContent = (840 + Math.round(prog * 1900)).toLocaleString("en-GB");
    L.forEach(function (p, i) { var left = Math.max(0, Math.round(p.n * (1 - prog * .02))); bars[i].style.width = Math.min(100, 20 + prog * 80) + "%"; lefts[i].textContent = p.n + " pieces, " + Math.round(20 + prog * 80) + "% of the waitlist wants one"; });
  }
  tick(); setInterval(tick, 1000);
  c.querySelector("form").addEventListener("submit", function (e) { e.preventDefault(); var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Please notify me about the next drop. My email: " + (em.value || "(add your email)") + ". "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const L = [{ n: 120, t: "Heavyweight tee", a: "tee" }, { n: 80, t: "Chore overshirt", a: "tee" }, { n: 60, t: "Court sneaker", a: "sneaker" }];
module.exports = R.make({
  name: "drop", themeColor: "#0E0F0C", fonts: FONTS, preload: ["assets/fonts/Boldonse-Regular.ttf"], js: JS,
  vars: { bg: "#0E0F0C", surface: "#12140F", ink: "#EFF5E4", muted: "#9BA48F", line: "#2C3027", accent: "#C8F34D", onaccent: "#10130A", c1: "#C8F34D", c2: "#F0C24A", c3: "#0E0F0C", rad: "4px", display: '"Boldonse",Impact,sans-serif', sans: '"JetBrains Mono",ui-monospace,monospace', header: "rgba(14,15,12,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const pcs = L.map((p) => `<div class="pc">${img(p.a, p.t, { w: 200, h: 200, hint: "a product photograph of " + p.t.toLowerCase() })}<div><b>${p.t}</b><span>Limited run</span><div class="bar"><i></i></div><div class="left"></div></div></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Small runs. <em>Big drops.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#drop"><span>See the next drop</span></a><a class="btn" href="menu.html"><span>${X.cta1}</span></a></div></div>${model3d(pack, "stopwatch", "tee", "A stopwatch you can turn", { c1: "#C8F34D", c2: "#F0C24A", c3: "#0E0F0C", hint: "a stopwatch" })}</div></section>
<section class="sec" id="drop" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Next drop</span><h2 style="margin-top:.8rem">Be there <em>when it lands</em></h2></div></div><div class="dr" data-drop='${JSON.stringify(L)}' data-reveal><div class="clock"><div><b data-dd>00</b><span>days</span></div><div><b data-hh>00</b><span>hours</span></div><div><b data-mm>00</b><span>minutes</span></div><div><b data-ss>00</b><span>seconds</span></div></div><p class="when" data-when></p><div class="wl"><span>People on the waitlist</span><b data-wl></b></div><div class="pieces">${pcs}</div><form><input type="email" placeholder="you@example.com" aria-label="Your email" autocomplete="email"><button type="submit" class="btn btn-primary"><span>Notify me</span></button></form><span class="note">A demonstration board. The waitlist and stock figures are illustrative.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
