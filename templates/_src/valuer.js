"use strict";
/**
 * valuer (estate agent, real 3D): a warm "what is my home worth?" estimator. Pick bedrooms, property type and area to see an animated
 * price range beside a turnable 3D house; sends the details to the valuation form. Fonts: Outfit + Crimson Pro (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["Outfit-OFL.txt", "OFL-Outfit.txt"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"]];
const css = `
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-style:italic;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(3rem,8.4vw,7.4rem);line-height:.94}h2{font-size:clamp(2.2rem,4.8vw,4rem);line-height:1}h3{font-size:1.3rem}
h1 em,h2 em{font-family:"Crimson Pro",Georgia,serif;font-weight:400;font-style:italic;color:var(--accent);letter-spacing:-.01em}.eyebrow{color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(30px,5vw,60px);background:radial-gradient(ellipse 50% 50% at 80% 40%,rgba(228,87,46,.16),transparent 70%)}.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.hero .gl3d{max-width:460px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(120,40,10,.25))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.vz{display:grid;grid-template-columns:1fr 1fr;gap:clamp(18px,4vw,60px);background:var(--surface);border:1px solid var(--line);border-radius:26px;padding:clamp(20px,4vw,50px);align-items:center}
.vz fieldset{border:0;margin:0 0 1.2rem;padding:0}.vz legend{font:700 .78rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem}.vz .ch{display:flex;flex-wrap:wrap;gap:.5rem}.vz .ch button{font:700 .95rem var(--sans);border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--ink);padding:.6rem 1.1rem;cursor:pointer}.vz .ch button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}
.vz .out{background:var(--ink);color:#fff;border-radius:22px;padding:clamp(18px,3vw,36px);display:grid;gap:.5rem}.vz .out small{letter-spacing:.14em;text-transform:uppercase;font-size:.75rem;opacity:.7}.vz .out b{font:700 clamp(2.4rem,5.4vw,4.2rem)/1 var(--display);color:#FFB88A}.vz .out p{margin:0;opacity:.85}.vz .out .btn{justify-self:start;margin-top:.5rem}
@media(max-width:820px){.vz{grid-template-columns:1fr}}
.pc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.pc div{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1.3rem}.pc b{font:700 2.6rem/1 var(--display);color:var(--accent)}.pc p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.pc{grid-template-columns:1fr}}
.cs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,20px)}.cs a{text-decoration:none;color:inherit;text-align:center;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:1rem}.cs img{width:100%;aspect-ratio:1;object-fit:contain}.cs b{display:block;margin-top:.4rem}@media(max-width:600px){.cs{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
const JS = `
(function () {
  var v = document.querySelector("[data-vz]"); if (!v) return; var st = { beds: 3, type: 1, area: 1 }, base = { 1: 150000, 2: 205000, 3: 255000, 4: 380000, 5: 520000 }, tf = [0.62, 1, 1.18], af = [0.82, 1, 1.45], out = v.querySelector(".out b"), note = v.querySelector(".out p"), cur = 0, tgt = 0, raf = 0;
  var fm = function (n) { return "\\u00a3" + (Math.round(n / 1000) * 1000).toLocaleString("en-GB"); };
  function anim() { cur += (tgt - cur) * .18; if (Math.abs(tgt - cur) < 400) cur = tgt; out.textContent = fm(cur * 0.94) + " \\u2013 " + fm(cur * 1.06); if (cur !== tgt) raf = requestAnimationFrame(anim); }
  function u() { tgt = base[st.beds] * tf[st.type] * af[st.area]; if (!cur) cur = tgt * .6; cancelAnimationFrame(raf); anim(); var tx = v.querySelectorAll("[data-k]"); var d = {}; [].slice.call(v.querySelectorAll("[aria-pressed=true]")).forEach(function (b) { d[b.parentNode.getAttribute("data-g")] = b.textContent; }); var m = document.querySelector("textarea"); if (m) m.value = "Valuation request: " + d.beds + ", " + d.type + ", " + d.area + "."; }
  [].slice.call(v.querySelectorAll(".ch")).forEach(function (g) { var k = g.getAttribute("data-g"); [].slice.call(g.querySelectorAll("button")).forEach(function (b, i) { b.addEventListener("click", function () { [].slice.call(g.querySelectorAll("button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); st[k] = k === "beds" ? i + 1 : i; u(); }); }); });
  u();
})();
`;
module.exports = R.make({
  name: "valuer", themeColor: "#FFF4EC", fonts: FONTS, preload: ["assets/fonts/Outfit-Bold.ttf"], js: JS,
  vars: { bg: "#FFF4EC", surface: "#FFFFFF", ink: "#2A1810", muted: "#7A6155", line: "rgba(42,24,16,.14)", accent: "#D4502E", onaccent: "#FFFFFF", c2: "#FFB88A", c3: "#D4502E", rad: "20px", display: '"Outfit",system-ui,sans-serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(255,244,236,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const grp = (g, legend, labels, pressed) => `<fieldset><legend>${legend}</legend><div class="ch" data-g="${g}">${labels.map((l, i) => `<button type="button" aria-pressed="${i === pressed}">${l}</button>`).join("")}</div></fieldset>`;
    const cs = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 300, h: 300, hint: B.hintOf(pack, c) })}<b>${c.name}</b></a>`).join("");
    const pc = X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>What is <em>your home</em> worth?</h1><p class="lead">${t("tagline")}</p></div>${model3d(pack, "house", "villa", "A family house", { c1: "#D4502E", c2: "#FFB88A", hint: "a family house" })}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="vz" data-vz data-reveal><div>${grp("beds", "Bedrooms", ["1", "2", "3", "4", "5+"], 2)}${grp("type", "Property type", ["Flat", "Terrace or semi", "Detached"], 1)}${grp("area", "Area", ["Outer Leeds", "Central areas", "Prime areas"], 1)}</div><div class="out"><small>Estimated value</small><b>&pound;0</b><p>An instant guide based on typical local sales. A free visit gives you an exact figure.</p><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pc">${pc}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">How we <em>help</em></h2></div></div><div class="cs">${cs}</div></div></section>`;
  },
});
