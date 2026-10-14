"use strict";
/**
 * estimate (tech agency and SaaS, real 3D): a crisp white and indigo look with a turnable 3D laptop and a "project estimator": pick
 * what you are building, how many pages or screens, and optional extras (design, content, SEO setup), and the tool shows a price range,
 * a realistic timeline in weeks and the monthly care plan, and pre-fills the call request. Fonts: Outfit + IBM Plex Mono (SIL OFL).
 */
const R = require("./rest-kit");
const FONTS = [["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["IBMPlexMono-Regular.ttf", "IBMPlexMono-Regular.ttf"], ["Outfit-OFL.txt", "OFL-Outfit.txt"], ["IBMPlexMono-OFL.txt", "OFL-IBMPlexMono.txt"]];
const css = `
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url(fonts/IBMPlexMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:.98}h2{font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.04}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;background:linear-gradient(90deg,#4F46E5,#06B6D4);-webkit-background-clip:text;background-clip:text;color:transparent}.eyebrow{font-family:var(--mono);color:var(--accent);letter-spacing:.1em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.es{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(18px,4vw,48px);align-items:start;border:1px solid var(--line);border-radius:20px;background:#fff;padding:clamp(18px,3vw,36px);box-shadow:0 20px 50px rgba(79,70,229,.1)}.es .ctl{display:grid;gap:1.3rem}.es .lb{display:grid;gap:.5rem;font:400 .74rem var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.es .lb span{display:flex;justify-content:space-between;color:var(--ink);font:700 .95rem var(--sans);letter-spacing:0;text-transform:none}.es input[type=range]{width:100%;accent-color:var(--accent);height:32px}
.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:700 .9rem var(--sans);border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);padding:.65rem 1rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
.es .out{border-radius:16px;background:linear-gradient(160deg,#12142B,#241E6E);color:#fff;padding:clamp(18px,3vw,28px)}.es .big{font:700 clamp(2.4rem,6.4vw,3.6rem)/1 var(--display);color:#7EE9FF}.es .out small{display:block;font:400 .72rem var(--mono);letter-spacing:.1em;text-transform:uppercase;color:#B8BCF0;margin-bottom:.4rem}.es dl{margin:1.1rem 0 0;display:grid;gap:.5rem}.es dl div{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,255,255,.15);padding-bottom:.4rem}.es dt{color:#C9CCF3}.es dd{margin:0;font-weight:700}.es .btn{width:100%;justify-content:center;margin-top:1.1rem}.es .note{display:block;margin-top:.8rem;font-size:.76rem;color:#B8BCF0}
@media(max-width:860px){.es{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:16px;background:#fff;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-est]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-est")), st = { t: 0, x: [0, 0, 0] }, pg = c.querySelector("[data-pg]"), line = "";
  function money(n) { return "\\u00A3" + n.toLocaleString("en-GB"); }
  function calc() {
    var T = D.types[st.t], n = +pg.value, extra = Math.max(0, n - T.free) * T.per, ex = 0, names = [];
    D.extras.forEach(function (e, i) { if (st.x[i]) { ex += e.p; names.push(e.n.toLowerCase()); } });
    var low = Math.round((T.base + extra + ex) / 100) * 100, high = Math.round(low * 1.2 / 100) * 100, wk = Math.round(T.wk + Math.max(0, n - T.free) / T.wd + st.x[0] * 1 + st.x[1] * 1);
    c.querySelector("[data-pgv]").textContent = n + " " + T.unit; c.querySelector("[data-pgl]").firstChild.nodeValue = T.unit.charAt(0).toUpperCase() + T.unit.slice(1);
    c.querySelector(".big").textContent = money(low) + " to " + money(high); c.querySelector("[data-wk]").textContent = wk + " to " + (wk + 2) + " weeks"; c.querySelector("[data-care]").textContent = money(T.care) + " a month"; c.querySelector("[data-inc]").textContent = names.length ? names.join(", ") : "none";
    line = "Project estimate: " + T.n + ", " + n + " " + T.unit + (names.length ? ", with " + names.join(", ") : "") + ". Range " + money(low) + " to " + money(high) + ", about " + wk + " weeks. About my project: ";
  }
  var tb = [].slice.call(c.querySelectorAll("[data-g=t] button")); tb.forEach(function (b, i) { b.addEventListener("click", function () { st.t = i; tb.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); pg.min = D.types[i].min; pg.max = D.types[i].max; pg.value = D.types[i].def; calc(); }); });
  [].forEach.call(c.querySelectorAll("[data-g=x] button"), function (b, i) { b.addEventListener("click", function () { st.x[i] = st.x[i] ? 0 : 1; b.setAttribute("aria-pressed", st.x[i] ? "true" : "false"); calc(); }); });
  pg.addEventListener("input", calc); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const D = {
  types: [
    { n: "Brochure website", base: 2500, free: 5, per: 160, unit: "pages", min: 3, max: 30, def: 5, wk: 4, wd: 6, care: 149 },
    { n: "Online shop", base: 5500, free: 20, per: 25, unit: "products set up", min: 10, max: 300, def: 40, wk: 7, wd: 60, care: 249 },
    { n: "Mobile app", base: 12000, free: 8, per: 900, unit: "screens", min: 5, max: 40, def: 10, wk: 12, wd: 4, care: 399 },
    { n: "Custom web app", base: 15000, free: 8, per: 1100, unit: "screens", min: 5, max: 40, def: 10, wk: 12, wd: 4, care: 449 },
  ],
  extras: [{ n: "Brand and design", p: 1200 }, { n: "Content writing", p: 900 }, { n: "SEO set-up", p: 600 }],
};
module.exports = R.make({
  name: "estimate", themeColor: "#FFFFFF", fonts: FONTS, preload: ["assets/fonts/Outfit-Bold.ttf"], js: JS,
  vars: { bg: "#F7F7FE", surface: "#FFFFFF", ink: "#12142B", muted: "#5A5E7E", line: "#E1E1F5", accent: "#4F46E5", onaccent: "#FFFFFF", c1: "#4F46E5", c2: "#7EE9FF", c3: "#12142B", rad: "12px", display: '"Outfit",system-ui,sans-serif', sans: '"Outfit",system-ui,sans-serif', mono: '"IBM Plex Mono",ui-monospace,monospace', header: "rgba(247,247,254,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const tb = D.types.map((x, i) => `<button type="button" aria-pressed="${i === 0}">${x.n}</button>`).join("");
    const xb = D.extras.map((x) => `<button type="button" aria-pressed="false">${x.n} (+&pound;${x.p.toLocaleString("en-GB")})</button>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Know the price <em>before you call</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#estimate"><span>Estimate my project</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "laptop", "laptop", "A laptop you can turn", { c1: "#4F46E5", c2: "#7EE9FF", c3: "#12142B", hint: "a laptop" })}</div></section>
<section class="sec" id="estimate" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Project estimator</span><h2 style="margin-top:.8rem">What will it <em>cost and take</em>?</h2></div></div><div class="es" data-est='${JSON.stringify(D)}' data-reveal><div class="ctl"><div class="lb">What are you building?<div class="opt" data-g="t">${tb}</div></div><label class="lb"><span data-pgl>Pages <b data-pgv style="font-weight:700"></b></span><input type="range" min="3" max="30" value="5" data-pg aria-label="Size of the project"></label><div class="lb">Extras<div class="opt" data-g="x">${xb}</div></div></div><div class="out"><small>Estimated price</small><div class="big"></div><dl><div><dt>Timeline</dt><dd data-wk></dd></div><div><dt>Extras included</dt><dd data-inc></dd></div><div><dt>Care plan after launch</dt><dd data-care></dd></div></dl><button type="button" class="btn btn-primary" data-book><span>Book a call about this</span></button><span class="note">A guide only. We confirm a fixed written quote after a free discovery call.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
