"use strict";
/**
 * mortgage (estate agent, real 3D): deep navy and gold with a turnable 3D key and a live mortgage calculator (price, deposit, rate,
 * term -> monthly payment). Fonts: Libre Baskerville + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["LibreBaskerville-Regular.ttf", "LibreBaskerville-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["LibreBaskerville-OFL.txt", "OFL-LibreBaskerville.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Libre Baskerville";src:url(fonts/LibreBaskerville-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.015em}h1{font-size:clamp(2.8rem,7.2vw,6.2rem);line-height:1.02}h2{font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.08}h3{font-size:1.25rem}
h1 em,h2 em{color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.18em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(40px,6vw,70px);background:radial-gradient(ellipse 45% 55% at 78% 45%,rgba(226,177,76,.2),transparent 70%)}.hero .wrap{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:480px;justify-self:center;filter:drop-shadow(0 26px 34px rgba(0,0,0,.45))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.calc{display:grid;grid-template-columns:1.1fr .9fr;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:var(--surface)}.calc .l{padding:clamp(18px,3.4vw,42px);display:grid;gap:1.3rem}.calc .r{padding:clamp(18px,3.4vw,42px);background:var(--accent);color:var(--onaccent);display:grid;gap:.5rem;align-content:center}
.calc .f label{display:flex;justify-content:space-between;font:700 .85rem var(--sans);margin-bottom:.4rem}.calc .f label b{color:var(--accent)}.calc input[type=range]{width:100%;accent-color:var(--accent)}
.calc .r small{letter-spacing:.14em;text-transform:uppercase;font-size:.75rem;opacity:.75}.calc .r b{font:400 clamp(2.8rem,6vw,4.6rem)/1 var(--display)}.calc .r p{margin:0}.calc .r .row{display:flex;justify-content:space-between;border-top:1px solid rgba(0,0,0,.2);padding:.5rem 0;font-size:.92rem}
@media(max-width:820px){.calc{grid-template-columns:1fr}}
.sx{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.sx a{display:grid;gap:.6rem;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;padding:1rem;background:var(--surface)}.sx img{width:100%;aspect-ratio:1;object-fit:contain}.sx p{margin:0;color:var(--muted);font-size:.9rem}@media(max-width:1000px){.sx{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.sx{grid-template-columns:1fr}}
.st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.st div{border-top:2px solid var(--accent);padding-top:1rem}.st .n{font:400 3.2rem/1 var(--display);color:var(--accent)}.st p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.st{grid-template-columns:1fr}}
.note{font-size:.8rem;color:var(--muted);margin:1rem 0 0}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-calc]"); if (!c) return; var q = function (n) { return c.querySelector('[name="' + n + '"]'); };
  var fm = function (n) { return "\\u00a3" + Math.round(n).toLocaleString("en-GB"); };
  function u() { var P = +q("price").value, D = +q("dep").value, R = +q("rate").value, Y = +q("yrs").value, L = P * (1 - D / 100), i = R / 1200, n = Y * 12, m = i ? L * i / (1 - Math.pow(1 + i, -n)) : L / n;
    c.querySelector('[data-o="price"]').textContent = fm(P); c.querySelector('[data-o="dep"]').textContent = D + "% (" + fm(P * D / 100) + ")"; c.querySelector('[data-o="rate"]').textContent = R.toFixed(1) + "%"; c.querySelector('[data-o="yrs"]').textContent = Y + " years";
    c.querySelector(".r b").textContent = fm(m); c.querySelector('[data-o="loan"]').textContent = fm(L); c.querySelector('[data-o="total"]').textContent = fm(m * n); }
  c.addEventListener("input", u); u();
})();
`;
module.exports = R.make({
  name: "mortgage", themeColor: "#0E1B2E", fonts: FONTS, preload: ["assets/fonts/LibreBaskerville-Regular.ttf"], js: JS,
  vars: { bg: "#0E1B2E", surface: "#15263D", ink: "#F4F1EA", muted: "#A9B6C8", line: "rgba(244,241,234,.17)", accent: "#E2B14C", onaccent: "#1A1203", c2: "#F3D38A", c3: "#E2B14C", rad: "14px", display: '"Libre Baskerville",Georgia,serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(14,27,46,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sx = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 360, h: 360, hint: B.hintOf(pack, c) })}<h3>${c.name}</h3><p>${c.blurb}</p></a>`).join("");
    const steps = X.process[2].map(([h, p], i) => `<div data-reveal data-delay="${i * 90}"><span class="n">0${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("");
    const f = (n, l, min, max, step, val) => `<div class="f"><label>${l}<b data-o="${n}"></b></label><input type="range" name="${n}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "key", "key", "A house key", { c1: "#E2B14C", c2: "#F3D38A", lum: 1.5, hint: "a house key" })}</div></section>
<section class="sec"><div class="wrap"><div class="calc" data-calc data-reveal><div class="l"><div><span class="eyebrow">Mortgage calculator</span><h2 style="margin-top:.8rem">What will it <em>cost a month</em>?</h2></div>${f("price", "Home price", 100000, 800000, 5000, 295000)}${f("dep", "Deposit", 5, 40, 1, 10)}${f("rate", "Interest rate", 1, 8, 0.1, 4.5)}${f("yrs", "Term", 10, 35, 1, 25)}</div><div class="r"><small>Estimated monthly payment</small><b>&pound;0</b><div class="row"><span>Amount borrowed</span><span data-o="loan"></span></div><div class="row"><span>Total repaid</span><span data-o="total"></span></div><a class="btn" href="#order" style="margin-top:.8rem;justify-self:start;color:var(--onaccent);border-color:var(--onaccent)"><span>Talk to an adviser</span></a></div></div><p class="note">An illustration only, not financial advice. Your own mortgage depends on your circumstances. Your home may be repossessed if you do not keep up repayments.</p></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sx">${sx}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="st">${steps}</div></div></section>`;
  },
});
