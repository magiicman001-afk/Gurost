"use strict";
/**
 * packing (hotel and travel, real 3D): a kraft-paper and stamp-ink look with a turnable 3D suitcase and a "pack your bag" list builder:
 * pick a trip type and the number of nights, tick items off as you pack (a ring fills up), and send the list with your enquiry.
 * Fonts: Bricolage Grotesque + DM Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Regular.ttf"], ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["DMMono-Regular.ttf", "DMMono-Regular.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["DMMono-OFL.txt", "OFL-DMMono.txt"]];
const css = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"DM Mono";src:url(fonts/DMMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
:root{--mono:"DM Mono",ui-monospace,monospace}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.035em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:.98}h2{font-size:clamp(2rem,4.2vw,3.3rem);line-height:1.05}h3{font-size:1.2rem;letter-spacing:-.02em}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--mono);color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(70,45,20,.3))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.pk{border:2px solid var(--ink);border-radius:8px;background:#FBF5E8;padding:clamp(18px,3vw,36px);background-image:repeating-linear-gradient(90deg,transparent 0 28px,rgba(120,90,50,.04) 28px 29px)}.pk .ctl{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:clamp(14px,3vw,36px);align-items:end}.pk .types{display:flex;gap:.5rem;flex-wrap:wrap}.pk .types button{font:400 .9rem var(--mono);text-transform:uppercase;letter-spacing:.08em;border:2px solid var(--ink);border-radius:6px;background:transparent;color:var(--ink);padding:.6rem .9rem;cursor:pointer}.pk .types button[aria-pressed=true]{background:var(--ink);color:#FBF5E8}
.pk .nn{display:grid;gap:.4rem;font:400 .8rem var(--mono);text-transform:uppercase;letter-spacing:.08em}.pk .nn b{font:700 1.4rem var(--display);letter-spacing:0;text-transform:none}.pk input[type=range]{width:100%;accent-color:var(--accent)}
.pk .body{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.6fr);gap:clamp(14px,3vw,40px);margin-top:clamp(18px,3vw,30px);border-top:2px dashed var(--ink);padding-top:clamp(16px,3vw,28px)}.pk ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem .9rem}.pk li label{display:flex;align-items:center;gap:.7rem;padding:.5rem .2rem;border-bottom:1px solid rgba(35,28,20,.15);cursor:pointer;font:400 1rem var(--sans)}.pk li input{width:22px;height:22px;accent-color:var(--accent);flex:none}.pk li b{margin-left:auto;font:400 .85rem var(--mono);color:var(--accent)}.pk li input:checked~span{text-decoration:line-through;opacity:.55}
.pk .side{display:grid;justify-items:center;align-content:start;gap:.8rem;text-align:center}.ring{position:relative;width:min(180px,100%);aspect-ratio:1}.ring svg{width:100%;height:100%;transform:rotate(-90deg)}.ring circle{fill:none;stroke-width:12}.ring .bg{stroke:rgba(35,28,20,.15)}.ring .fg{stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset .4s var(--ease)}.ring b{position:absolute;inset:0;display:grid;place-items:center;font:700 2rem var(--display)}.pk .side p{margin:0;font:400 .85rem var(--mono);color:var(--muted)}.pk .side .btn{width:100%;justify-content:center}
@media(max-width:820px){.pk .ctl,.pk .body{grid-template-columns:minmax(0,1fr)}}@media(max-width:520px){.pk ul{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border:2px solid var(--ink);border-radius:8px;padding:1rem}.th b{display:block;font:700 2.4rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--ink);border-radius:8px;background:#FBF5E8;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-pack]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-pack")), ts = [].slice.call(c.querySelectorAll(".types button")), rg = c.querySelector("input[type=range]"), nn = c.querySelector("[data-nn]"), ul = c.querySelector("ul"), fg = c.querySelector(".fg"), pc = c.querySelector(".ring b"), left = c.querySelector("[data-left]"), cur = 0, items = [], L = 2 * Math.PI * 54;
  fg.style.strokeDasharray = L;
  function prog() { var k = items.filter(function (x) { return x.cb.checked; }).length; fg.style.strokeDashoffset = L * (1 - (items.length ? k / items.length : 0)); pc.textContent = k + "/" + items.length; left.textContent = k === items.length && k ? "All packed. Have a lovely trip." : (items.length - k) + " to go"; }
  function build() {
    var n = +rg.value; nn.textContent = n + (n === 1 ? " night" : " nights"); ul.innerHTML = ""; items = [];
    D.common.concat(D.types[cur].i).forEach(function (r) {
      var q = r[1] + Math.ceil(n * r[2]), li = document.createElement("li"), lb = document.createElement("label"), cb = document.createElement("input"), sp = document.createElement("span"), b = document.createElement("b");
      cb.type = "checkbox"; sp.textContent = r[0]; b.textContent = "x" + q; lb.appendChild(cb); lb.appendChild(sp); lb.appendChild(b); li.appendChild(lb); ul.appendChild(li); items.push({ cb: cb, t: r[0] + " x" + q }); cb.addEventListener("change", prog);
    });
    prog();
  }
  ts.forEach(function (b, i) { b.addEventListener("click", function () { cur = i; ts.forEach(function (x, k) { x.setAttribute("aria-pressed", k === i ? "true" : "false"); }); build(); }); }); rg.addEventListener("input", build); build();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Trip enquiry: " + D.types[cur].n + ", " + rg.value + " nights. My packing list so far: " + items.map(function (x) { return x.t; }).join(", ") + ". Please tell me the baggage allowance and anything I should add."; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "packing", themeColor: "#E9DCC4", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#E9DCC4", surface: "#FBF5E8", ink: "#231C14", muted: "#6A5B46", line: "rgba(35,28,20,.28)", accent: "#B0391F", onaccent: "#FFFFFF", c1: "#B0391F", c2: "#F0C27B", c3: "#231C14", rad: "8px", display: '"Bricolage Grotesque",system-ui,sans-serif', sans: '"Bricolage Grotesque",system-ui,sans-serif', header: "rgba(233,220,196,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = {
      common: [["Passport or photo ID", 1, 0], ["Phone and charger", 1, 0], ["Toiletries bag", 1, 0], ["Underwear", 1, 1], ["Socks", 1, 1]],
      types: [
        { n: "Beach", i: [["Swimwear", 2, 0], ["Sun cream", 1, 0], ["Sunglasses", 1, 0], ["Flip-flops", 1, 0], ["Light tops", 1, 0.5], ["Beach towel", 1, 0]] },
        { n: "City", i: [["Comfortable shoes", 1, 0], ["Day bag", 1, 0], ["Compact umbrella", 1, 0], ["Smart outfit", 1, 0], ["Tops", 1, 0.5], ["Portable charger", 1, 0]] },
        { n: "Ski", i: [["Thermal layers", 1, 0.5], ["Ski jacket", 1, 0], ["Gloves", 1, 0], ["Goggles", 1, 0], ["Lip balm and sun cream", 1, 0], ["Warm hat", 1, 0]] },
        { n: "Camping", i: [["Tent", 1, 0], ["Sleeping bag", 1, 0], ["Torch", 1, 0], ["Waterproof jacket", 1, 0], ["Camping stove", 1, 0], ["Spare layers", 1, 0.3]] },
      ],
    };
    const types = D.types.map((x, i) => `<button type="button" aria-pressed="${i === 0}">${x.n}</button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Pack <em>once</em>. Forget nothing.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#bag"><span>Build my packing list</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "suitcase", "suitcase", "A suitcase you can turn", { c1: "#B0391F", c2: "#F0C27B", c3: "#231C14", hint: "a travel suitcase" })}</div></section>
<section class="sec" id="bag" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Packing list</span><h2 style="margin-top:.8rem">Pack your bag, <em>tick by tick</em></h2></div></div><div class="pk" data-pack='${JSON.stringify(D)}' data-reveal><div class="ctl"><div class="types">${types}</div><label class="nn">How long are you away?<b data-nn></b><input type="range" min="1" max="14" value="4" aria-label="Number of nights"></label></div><div class="body"><ul></ul><div class="side"><div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" cx="60" cy="60" r="54"/></svg><b>0/0</b></div><p data-left></p><button type="button" class="btn btn-primary" data-book><span>Send me this list</span></button></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
