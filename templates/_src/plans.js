"use strict";
/**
 * plans (clinic, real 3D): deep navy and mint with a turnable 3D tooth, a 0% payment plan calculator (treatment cost, deposit,
 * months -> monthly payment) and three membership plans. Fonts: Gloock + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(2.8rem,7.2vw,6.2rem);line-height:1.02}h2{font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.08}h3{font-size:1.3rem}
h1 em,h2 em{color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.18em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(40px,6vw,70px);background:radial-gradient(ellipse 45% 55% at 78% 45%,rgba(127,214,194,.2),transparent 70%)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:460px;justify-self:center;filter:drop-shadow(0 26px 30px rgba(0,0,0,.45))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.pc{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);border:1px solid var(--line);border-radius:24px;overflow:hidden;background:var(--surface)}.pc .l{padding:clamp(18px,3.4vw,42px);display:grid;gap:1.3rem}.pc .r{padding:clamp(18px,3.4vw,42px);background:var(--accent);color:var(--onaccent);display:grid;gap:.5rem;align-content:center}
.pc .f label{display:flex;justify-content:space-between;font:700 .85rem var(--sans);margin-bottom:.4rem}.pc .f label b{color:var(--accent)}.pc input[type=range]{width:100%;accent-color:var(--accent)}
.pc .ch{display:flex;gap:.5rem;flex-wrap:wrap}.pc .ch button{font:700 .9rem var(--sans);border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:99px;padding:.5rem 1rem;cursor:pointer}.pc .ch button[aria-pressed=true]{background:var(--accent);color:var(--onaccent);border-color:var(--accent)}
.pc .r small{letter-spacing:.14em;text-transform:uppercase;font-size:.75rem;opacity:.8}.pc .r b{font:400 clamp(2.8rem,6vw,4.6rem)/1 var(--display)}.pc .r .row{display:flex;justify-content:space-between;border-top:1px solid rgba(0,0,0,.2);padding:.5rem 0;font-size:.92rem}
@media(max-width:820px){.pc{grid-template-columns:minmax(0,1fr)}}
.pl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px);align-items:stretch}.pl article{display:grid;gap:.8rem;align-content:start;border:1px solid var(--line);border-radius:22px;padding:1.5rem;background:var(--surface)}.pl article>img{width:84px;height:84px;object-fit:contain}.pl .hi{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 30px 60px -30px rgba(127,214,194,.4)}.pl .pr{font:400 2.6rem/1 var(--display);color:var(--accent)}.pl .pr small{font:400 .9rem var(--sans);color:var(--muted)}.pl ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem;color:var(--muted)}.pl li{display:flex;gap:.6rem}.pl li:before{content:"\\2713";color:var(--accent);font-weight:700}.pl .badge{justify-self:start;font:700 .7rem var(--sans);letter-spacing:.1em;text-transform:uppercase;background:var(--accent);color:var(--onaccent);border-radius:99px;padding:.2rem .7rem}
@media(max-width:900px){.pl{grid-template-columns:minmax(0,1fr)}}
.note{font-size:.8rem;color:var(--muted);margin:1rem 0 0}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-plan]"); if (!c) return; var m = 12, q = function (n) { return c.querySelector('[name="' + n + '"]'); };
  var fm = function (n) { return "\\u00a3" + Math.round(n).toLocaleString("en-GB"); };
  function u() { var P = +q("cost").value, D = +q("dep").value, L = P - P * D / 100, pay = L / m;
    c.querySelector('[data-o="cost"]').textContent = fm(P); c.querySelector('[data-o="dep"]').textContent = D + "% (" + fm(P * D / 100) + ")";
    c.querySelector(".r b").textContent = fm(pay); c.querySelector('[data-o="loan"]').textContent = fm(L); c.querySelector('[data-o="mo"]').textContent = m + " months"; }
  [].slice.call(c.querySelectorAll(".ch button")).forEach(function (b) { b.addEventListener("click", function () { m = +b.getAttribute("data-m"); [].slice.call(c.querySelectorAll(".ch button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); u(); }); });
  c.addEventListener("input", u); u();
})();
`;
module.exports = R.make({
  name: "plans", themeColor: "#0B1F2E", fonts: FONTS, preload: ["assets/fonts/Gloock-Regular.ttf"], js: JS,
  vars: { bg: "#0B1F2E", surface: "#122B3D", ink: "#EEF6F5", muted: "#A6BCC4", line: "rgba(238,246,245,.16)", accent: "#7FD6C2", onaccent: "#06242B", c1: "#7FD6C2", c2: "#CFF3EA", c3: "#7FD6C2", rad: "14px", display: '"Gloock",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(11,31,46,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const f = (n, l, min, max, step, val) => `<div class="f"><label>${l}<b data-o="${n}"></b></label><input type="range" name="${n}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
    const plans = [["Essential", "12", "For healthy teeth", "brush", ["Two check-ups a year", "One scale and polish", "10% off treatment"], ""], ["Complete", "24", "Our most popular", "smile", ["Check-ups and two hygiene visits", "Free emergency appointments", "15% off treatment", "Whitening top-up each year"], "hi"], ["Family", "49", "Up to four people", "tooth", ["Everything in Complete, for four", "Children's check-ups included", "Priority same-day slots"], ""]]
      .map(([n, p, s, a, li, c]) => `<article class="${c}" data-reveal>${c ? '<span class="badge">Most popular</span>' : ""}${img(a, n + " plan", { w: 120, h: 120, hint: "a friendly cartoon " + a })}<h3>${n}</h3><div class="pr">&pound;${p}<small> a month</small></div><p style="margin:0;color:var(--muted)">${s}</p><ul>${li.map((x) => `<li>${x}</li>`).join("")}</ul><a class="btn ${c ? "btn-primary" : ""}" href="#order"><span>Join ${n}</span></a></article>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="#plan"><span>Spread the cost</span></a></div></div>${model3d(pack, "tooth", "tooth", "A healthy tooth you can turn", { c1: "#7FD6C2", c2: "#CFF3EA", lum: 1.5, hint: "a healthy white tooth" })}</div></section>
<section class="sec" id="plan"><div class="wrap"><div class="pc" data-plan data-reveal><div class="l"><div><span class="eyebrow">Payment plan</span><h2 style="margin-top:.8rem">Spread the cost, <em>pay no interest</em></h2></div>${f("cost", "Treatment cost", 300, 6000, 50, 1800)}${f("dep", "Deposit", 0, 50, 5, 10)}<div class="f"><label>Months</label><div class="ch"><button type="button" data-m="6" aria-pressed="false">6</button><button type="button" data-m="10" aria-pressed="false">10</button><button type="button" data-m="12" aria-pressed="true">12</button></div></div></div><div class="r"><small>Your monthly payment</small><b>&pound;0</b><div class="row"><span>Amount spread</span><span data-o="loan"></span></div><div class="row"><span>Over</span><span data-o="mo"></span></div><a class="btn" href="#order" style="margin-top:.8rem;justify-self:start;color:var(--onaccent);border-color:var(--onaccent)"><span>Ask about a plan</span></a></div></div><p class="note">An illustration of a 0% plan on treatment over &pound;300. Plans are subject to status and a short check. Your dentist will confirm the final price.</p></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Membership</span><h2 style="margin-top:.8rem">One fixed price, <em>all year</em></h2></div></div><div class="pl">${plans}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap sh" data-reveal><div>${img("shield", "A health shield", { w: 160, h: 160, hint: "a protective health shield" })}<h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div></section>`;
  },
});
