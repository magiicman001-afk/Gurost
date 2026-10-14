"use strict";
/**
 * bring (law firm, real 3D): emerald and cream with a turnable 3D stopwatch ("fifteen minutes to clarity") and a "what to bring"
 * checklist builder: pick a matter, tick what you have, watch the progress ring fill, and add what is missing to the request form.
 * Fonts: Tektur + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Tektur-Regular.ttf", "Tektur-Regular.ttf"], ["Tektur-Medium.ttf", "Tektur-Medium.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Tektur-OFL.txt", "OFL-Tektur.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Tektur";src:url(fonts/Tektur-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Tektur";src:url(fonts/Tektur-Medium.ttf) format("truetype");font-weight:500 700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:-.02em}h1{font-size:clamp(2.7rem,7vw,6rem);line-height:1}h2{font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.05}h3{font-size:1.25rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center;filter:drop-shadow(0 22px 26px rgba(10,80,60,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.bg{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(18px,4vw,56px);align-items:start;background:var(--surface);border:1px solid var(--line);border-radius:26px;padding:clamp(20px,4vw,52px)}.bg .ring{position:relative;width:min(220px,100%);margin:1.4rem 0}.bg .ring svg{width:100%;height:auto;transform:rotate(-90deg)}.bg .ring .tr{stroke:var(--line)}.bg .ring .fg{stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset .35s}.bg .ring b{position:absolute;inset:0;display:grid;place-items:center;font:500 2.2rem var(--display)}
.bg .ch{display:flex;gap:.5rem;flex-wrap:wrap}.bg .ch button{font:700 .88rem var(--sans);border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:99px;padding:.55rem 1rem;cursor:pointer}.bg .ch button[aria-pressed=true]{background:var(--accent);color:var(--onaccent);border-color:var(--accent)}
.bg ul{list-style:none;margin:1.2rem 0 0;padding:0;display:grid;gap:.5rem}.bg li label{display:flex;gap:.8rem;align-items:flex-start;border:1px solid var(--line);border-radius:14px;padding:.8rem 1rem;background:#fff;cursor:pointer}.bg li input{width:1.2rem;height:1.2rem;accent-color:var(--accent);margin-top:.2rem;flex:none}.bg li label:has(input:checked){background:#E6F4EE;border-color:var(--accent)}.bg li small{display:block;color:var(--muted)}
.bg .act{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:1.2rem}@media(max-width:820px){.bg{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:100px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:100px;height:100px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
.pr3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.pr3 div{border-top:3px solid var(--accent);padding-top:1rem}.pr3 .n{font:500 2.8rem/1 var(--display);color:var(--accent)}.pr3 p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.pr3{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var b = document.querySelector("[data-bring]"); if (!b) return; var D = JSON.parse(b.getAttribute("data-bring")), ul = b.querySelector("ul"), bs = [].slice.call(b.querySelectorAll(".ch button")), fg = b.querySelector(".fg"), num = b.querySelector(".ring b"), cur = 0, C = 2 * Math.PI * 54;
  fg.style.strokeDasharray = C;
  function prog() { var all = ul.querySelectorAll("input"), on = ul.querySelectorAll("input:checked"); fg.style.strokeDashoffset = C * (1 - (all.length ? on.length / all.length : 0)); num.textContent = on.length + "/" + all.length; }
  function show(i) { cur = i; ul.innerHTML = ""; D[i].i.forEach(function (it) { var li = document.createElement("li"), l = document.createElement("label"), c = document.createElement("input"), d = document.createElement("span"), s = document.createElement("small"); c.type = "checkbox"; d.textContent = it[0]; s.textContent = it[1]; d.appendChild(s); l.appendChild(c); l.appendChild(d); li.appendChild(l); ul.appendChild(li); }); bs.forEach(function (x, k) { x.setAttribute("aria-pressed", k === i ? "true" : "false"); }); prog(); }
  bs.forEach(function (x, i) { x.addEventListener("click", function () { show(i); }); }); ul.addEventListener("change", prog);
  b.querySelector("[data-add]").addEventListener("click", function () { var miss = []; [].slice.call(ul.querySelectorAll("li")).forEach(function (li, k) { if (!li.querySelector("input").checked) miss.push(D[cur].i[k][0]); }); var ta = document.querySelector("#order textarea"); if (ta) ta.value = D[cur].n + ". Still to find: " + (miss.length ? miss.join(", ") : "nothing, I have everything") + "."; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth" }); });
  show(0);
})();
`;
module.exports = R.make({
  name: "bring", themeColor: "#F1F7F3", fonts: FONTS, preload: ["assets/fonts/Tektur-Medium.ttf"], js: JS,
  vars: { bg: "#F1F7F3", surface: "#FFFFFF", ink: "#0D2B22", muted: "#4A665C", line: "rgba(13,43,34,.16)", accent: "#0F6B4F", onaccent: "#FFFFFF", c1: "#0F6B4F", c2: "#7FD1AE", c3: "#0D2B22", rad: "16px", display: '"Tektur",system-ui,sans-serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(241,247,243,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = [
      { n: "Buying a home", i: [["Photo ID", "Passport or driving licence"], ["Proof of address", "A bank statement or bill from the last 3 months"], ["Proof of deposit", "Bank statements showing where the money came from"], ["Mortgage in principle", "Or your lender's details if you have them"], ["Your offer details", "The estate agent's memorandum of sale"], ["Name of your mortgage broker", "If you are using one"]] },
      { n: "Divorce", i: [["Marriage certificate", "The original or a certified copy"], ["Photo ID", "Passport or driving licence"], ["Your spouse's address", "So the court papers can be sent"], ["Recent pay slips and bank statements", "For the financial part"], ["Details of property and pensions", "Values, mortgages and statements"], ["Children's details", "Names, dates of birth and where they live"]] },
      { n: "Making a will", i: [["Photo ID", "Passport or driving licence"], ["A list of who you want to include", "Family, friends and any charities"], ["Who will look after things", "Executors and guardians, if you have children"], ["Details of your home and savings", "Roughly what you own and owe"], ["Any existing will", "If you already have one"]] },
      { n: "Employment problem", i: [["Your contract of employment", "And any staff handbook"], ["Recent pay slips", "The last 3 months"], ["Letters and emails about the problem", "In date order, if you can"], ["Notes of meetings", "Who said what and when"], ["Any dismissal or warning letter", "The date you received it matters"]] },
    ];
    const ch = D.map((d, i) => `<button type="button" aria-pressed="${i === 0}">${d.n}</button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><span class="n">${v}${s}</span><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Fifteen minutes to <em>clarity</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="#bring"><span>What should I bring?</span></a></div></div>${model3d(pack, "stopwatch", "pen", "A stopwatch you can turn", { c1: "#0F6B4F", c2: "#7FD1AE", hint: "a fountain pen" })}</div></section>
<section class="sec" id="bring" style="padding-top:0"><div class="wrap"><div class="bg" data-bring='${JSON.stringify(D).replace(/'/g, "&#39;")}' data-reveal><div><span class="eyebrow">Get ready</span><h2 style="margin-top:.8rem">What to <em>bring</em></h2><p class="lead">Pick your matter and tick what you already have. We will ask for the rest.</p><div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="tr" cx="60" cy="60" r="54" fill="none" stroke-width="10"/><circle class="fg" cx="60" cy="60" r="54" fill="none" stroke-width="10"/></svg><b>0/0</b></div></div><div><div class="ch">${ch}</div><ul></ul><div class="act"><button type="button" class="btn btn-primary" data-add><span>Add to my request</span></button></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pr3">${nums}</div></div></section>`;
  },
});
