"use strict";
/**
 * counsel (law firm, real 3D): ivory and oxblood with a turnable 3D gavel and an interactive "your case, step by step" timeline:
 * pick a matter and see the stages, who does what and how long each takes. Fonts: National Park + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["NationalPark-Regular.ttf", "NationalPark-Regular.ttf"], ["NationalPark-Bold.ttf", "NationalPark-Bold.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["NationalPark-OFL.txt", "OFL-NationalPark.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"National Park";src:url(fonts/NationalPark-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"National Park";src:url(fonts/NationalPark-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.025em}h1{font-size:clamp(2.8rem,7.2vw,6.2rem);line-height:1}h2{font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.05}h3{font-size:1.25rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(60,20,20,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.cs{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(18px,4vw,56px);align-items:start}.cs .tabs{display:grid;gap:.5rem}.cs .tabs button{display:flex;justify-content:space-between;gap:1rem;text-align:left;font:700 1rem var(--display);border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);padding:.95rem 1.1rem;cursor:pointer}.cs .tabs button[aria-pressed=true]{background:var(--ink);color:#F7F3EA;border-color:var(--ink)}.cs .tabs small{font:400 .8rem var(--sans);opacity:.7;align-self:center}
.cs ol{list-style:none;margin:0;padding:0 0 0 1.6rem;border-left:2px solid var(--line);display:grid;gap:1.4rem}.cs li{position:relative;opacity:0;transform:translateY(10px);animation:csin .5s var(--ease) forwards}.cs li:before{content:"";position:absolute;left:calc(-1.6rem - 7px);top:.35rem;width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--bg)}.cs li b{display:block;font:700 1.15rem var(--display)}.cs li em{font-style:normal;font:700 .78rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}.cs li p{margin:.3rem 0 0;color:var(--muted)}
@keyframes csin{to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.cs li{animation:none;opacity:1;transform:none}}@media(max-width:820px){.cs{grid-template-columns:minmax(0,1fr)}}
.pr3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.pr3 div{border-top:3px solid var(--accent);padding-top:1rem}.pr3 .n{font:700 2.8rem/1 var(--display);color:var(--accent)}.pr3 p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.pr3{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-case]"); if (!c) return; var D = JSON.parse(c.getAttribute("data-case")), ol = c.querySelector("ol"), bs = [].slice.call(c.querySelectorAll(".tabs button"));
  function show(i) { var d = D[i]; ol.innerHTML = ""; d.s.forEach(function (s, k) { var li = document.createElement("li"); li.style.animationDelay = (k * 90) + "ms"; var e = document.createElement("em"), b = document.createElement("b"), p = document.createElement("p"); e.textContent = s[1]; b.textContent = s[0]; p.textContent = s[2]; li.appendChild(e); li.appendChild(b); li.appendChild(p); ol.appendChild(li); }); bs.forEach(function (x, k) { x.setAttribute("aria-pressed", k === i ? "true" : "false"); }); }
  bs.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); }); show(0);
})();
`;
module.exports = R.make({
  name: "counsel", themeColor: "#F7F3EA", fonts: FONTS, preload: ["assets/fonts/NationalPark-Bold.ttf"], js: JS,
  vars: { bg: "#F7F3EA", surface: "#FFFFFF", ink: "#1B1A17", muted: "#5E5A52", line: "rgba(27,26,23,.15)", accent: "#8E2433", onaccent: "#FFFFFF", c1: "#6B3A22", c2: "#E2B14C", c3: "#2A1A14", rad: "14px", display: '"National Park",Georgia,serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(247,243,234,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = [
      { n: "Buying a home", w: "8 to 12 weeks", s: [["Instruct us", "Day 1", "You send ID and the offer details. We confirm your fixed fee in writing."], ["Contract pack and searches", "Week 1 to 3", "We read the seller's papers, order searches and raise questions."], ["Mortgage and report", "Week 3 to 6", "We check your mortgage offer and explain the legal report in plain English."], ["Exchange of contracts", "Week 6 to 10", "Contracts are signed and swapped, and the moving date is fixed."], ["Completion", "Moving day", "Money moves, we register your ownership and the keys are yours."]] },
      { n: "Divorce", w: "4 to 6 months", s: [["First advice", "Week 1", "We explain your options, the grounds and what to expect, with a fixed fee."], ["Application", "Week 2", "We prepare and file the application and serve it on your spouse."], ["Financial agreement", "Month 1 to 4", "We negotiate a fair settlement and make it legally binding."], ["Conditional order", "Month 3 to 5", "The court confirms you can proceed to the final stage."], ["Final order", "Month 4 to 6", "The marriage legally ends and we close your file."]] },
      { n: "Making a will", w: "1 to 2 weeks", s: [["Free first call", "Day 1", "We talk through your family, your home and who you want to protect."], ["Draft your will", "Day 2 to 5", "We write it in clear language and send it for your approval."], ["Sign and witness", "Week 1 to 2", "You sign with two witnesses at our office or by arrangement."], ["Safe storage", "Same day", "We store your original will securely, free, and give you a copy."]] },
      { n: "Employment problem", w: "varies", s: [["Free first call", "Day 1", "We listen, explain your rights and the time limits that apply."], ["Plan and evidence", "Week 1", "We gather documents and agree what outcome you want."], ["Talk to your employer", "Week 2 to 6", "We write on your behalf and try to settle without a tribunal."], ["Early conciliation", "Week 4 to 8", "A free ACAS process is started if we need to go further."], ["Tribunal, if needed", "Month 3 onward", "We prepare and represent you, with costs explained at every step."]] },
    ];
    const tabs = D.map((d, i) => `<button type="button" aria-pressed="${i === 0}">${d.n}<small>${d.w}</small></button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><span class="n">${v}${s}</span><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "gavel", "gavel", "A gavel you can turn", { c1: "#6B3A22", c2: "#E2B14C", hint: "a judge's gavel" })}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Your case, step by step</span><h2 style="margin-top:.8rem">Know <em>what happens next</em></h2></div></div><div class="cs" data-case='${JSON.stringify(D).replace(/'/g, "&#39;")}' data-reveal><div class="tabs">${tabs}</div><ol></ol></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pr3">${nums}</div></div></section>`;
  },
});
