"use strict";
/**
 * warmth (trades, real 3D): a heating engineer's page. A 3D house that turns as you scroll, a thermostat dial you drag that changes
 * the page glow and shows a yearly saving, and plan cards. Fonts: Young Serif + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["YoungSerif-Regular.ttf", "YoungSerif-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["YoungSerif-OFL.txt", "OFL-YoungSerif.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Young Serif";src:url(fonts/YoungSerif-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(3rem,8vw,7rem);line-height:.98}h2{font-size:clamp(2.2rem,4.8vw,4rem);line-height:1.02}h3{font-size:1.45rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(40px,6vw,70px);background:radial-gradient(ellipse 60% 55% at 80% 40%,rgba(255,150,60,calc(var(--heat,.5) * .5)),transparent 70%),var(--bg);transition:background .4s}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:560px;justify-self:center;filter:drop-shadow(0 26px 30px rgba(90,40,10,.3))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px);border-block:1px solid var(--line);padding:1.4rem 0}.stats b{display:block;font:400 clamp(1.5rem,6.4vw,3.8rem)/1 var(--display);color:var(--accent);overflow-wrap:anywhere}.stats span{color:var(--muted);font-size:.9rem}
.th{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(20px,5vw,80px);align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:clamp(20px,4vw,50px)}
.dial{position:relative;width:min(100%,320px);aspect-ratio:1;margin:auto;border-radius:50%;background:conic-gradient(from 220deg,#4A90E2,#F2D14B 45%,#E8552A 75%,#E8552A 0);--p:.5;-webkit-mask:radial-gradient(circle,transparent 58%,#000 59%);mask:radial-gradient(circle,transparent 58%,#000 59%)}
.dialw{position:relative;overflow:hidden;width:min(100%,320px);margin:auto}.dialw::after{content:"";position:absolute;inset:0;pointer-events:none;transform:rotate(calc(var(--p,.5)*280deg - 140deg));background:radial-gradient(circle at 50% 8%,#fff 0 4.5%,var(--ink) 4.7% 6.4%,transparent 6.6%)}.dialw .dial{margin:0;width:100%}.dialw .val{position:absolute;inset:0;display:grid;place-content:center;text-align:center}.dialw .val b{font:400 clamp(3rem,9vw,4.6rem)/1 var(--display)}.dialw .val span{color:var(--muted);font-size:.85rem;letter-spacing:.12em;text-transform:uppercase}
.th input[type=range]{width:100%;accent-color:var(--accent);margin:1.4rem 0 .4rem}.th .sv{font-size:1.1rem}.th .sv b{color:var(--accent);font-size:1.6em}
@media(max-width:820px){.th{grid-template-columns:1fr}}
.plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.pc{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:clamp(20px,2.6vw,32px);display:grid;gap:.8rem;align-content:start}.pc.star{background:var(--accent);color:var(--onaccent);border-color:var(--accent)}.pc .pr{font:400 3rem/1 var(--display)}.pc small{font:400 1rem var(--sans)}.pc ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}.pc li::before{content:"\\2713\\00a0";font-weight:700}.pc p{margin:0}.pc.star .btn{border-color:var(--onaccent);color:var(--onaccent)}
@media(max-width:900px){.plans{grid-template-columns:1fr}}
.faq details{border-bottom:1px solid var(--line);padding:1rem 0}.faq summary{cursor:pointer;font:400 1.3rem var(--display);list-style:none;display:flex;justify-content:space-between;gap:1rem}.faq summary::after{content:"+";color:var(--accent)}.faq details[open] summary::after{content:"\\2212"}.faq p{margin:.6rem 0 0;color:var(--muted);max-width:44em}
.ph3{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.ph3 a{text-decoration:none;color:inherit;text-align:center}.ph3 img{width:100%;aspect-ratio:1;object-fit:contain;background:var(--surface);border-radius:20px;border:1px solid var(--line)}.ph3 b{display:block;margin-top:.5rem}@media(max-width:600px){.ph3{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
const JS = `
(function () {
  var t = document.querySelector("[data-th]"); if (!t) return; var r = t.querySelector("input"), v = t.querySelector(".val b"), s = t.querySelector(".sv b"), d = t.querySelector(".dial"), h = document.querySelector(".hero");
  function u() { var c = +r.value, p = (c - 14) / 12; v.textContent = c + "\\u00b0"; s.textContent = "\\u00a3" + Math.max(0, Math.round((21 - c) * 80 + 60)); d.parentNode.style.setProperty("--p", p); if (h) h.style.setProperty("--heat", (0.15 + p * 0.85).toFixed(2)); }
  r.addEventListener("input", u); u();
})();
`;
module.exports = R.make({
  name: "warmth", themeColor: "#FFF1E0", fonts: FONTS, preload: ["assets/fonts/YoungSerif-Regular.ttf"], js: JS,
  vars: { bg: "#FFF1E0", surface: "#FFFFFF", ink: "#2B1A12", muted: "#6E5648", line: "rgba(43,26,18,.16)", accent: "#D9481E", onaccent: "#FFFFFF", c2: "#F2A33A", c3: "#D9481E", rad: "20px", display: '"Young Serif",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(255,241,224,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const stats = X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("");
    const plans = pack.plans.map((p, i) => `<article class="pc${p.star ? " star" : ""}" data-reveal data-delay="${i * 80}"><h3>${p.n}</h3><div class="pr">&pound;${p.price}<small> / ${p.per}</small></div><p>${p.blurb}</p><ul>${p.feats.map((f) => `<li>${f}</li>`).join("")}</ul><a class="btn" href="#order"><span>Choose ${p.n}</span></a></article>`).join("");
    const faq = pack.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("");
    const tiles = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 400, h: 400, hint: B.hintOf(pack, c) })}<b>${c.name}</b></a>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "house", "house", "A house that turns as you scroll", { c1: "#D9481E", c2: "#F2A33A", hint: "a house" }).replace('data-gl3d="house"', 'data-gl3d="house" data-scroll')}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="stats">${stats}</div></div></section>
<section class="sec"><div class="wrap"><div class="th" data-th data-reveal><div class="dialw"><div class="dial" aria-hidden="true"></div><div class="val"><b>19&deg;</b><span>Thermostat</span></div></div><div><span class="eyebrow">Heating, explained</span><h2 style="margin:.8rem 0 .6rem">Turn it <em>down a degree</em></h2><p class="lead">Drag the dial to see what a smarter thermostat could save you each year. A modern boiler and good controls make every degree count.</p><input type="range" min="14" max="26" value="19" aria-label="Thermostat temperature"><p class="sv">Estimated yearly saving: <b>&pound;0</b></p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Care plans</span><h2 style="margin-top:.8rem">Pick <em>your cover</em></h2></div></div><div class="plans">${plans}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="ph3">${tiles}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap faq" data-reveal><span class="eyebrow">Questions</span><h2 style="margin:.8rem 0 1rem">Good to <em>know</em></h2>${faq}</div></section>`;
  },
});
