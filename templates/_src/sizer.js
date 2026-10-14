"use strict";
/**
 * sizer (fashion and online shop, real 3D): a cream and black editorial look with a turnable 3D clothes hanger and a "find your size"
 * tool: sliders for chest and waist, a fit preference (fitted, true to size, relaxed) and the result as a highlighted size ladder with
 * the UK dress size and a plain-English note; pre-fills the question form. Fonts: Gloock + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:1}h2{font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.06}h3{font-size:1.3rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}.eyebrow{color:var(--ink);letter-spacing:.22em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.sz{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(18px,4vw,50px);align-items:start;border:1px solid var(--ink);padding:clamp(18px,3vw,38px);background:#FBF9F4}.sz .ctl{display:grid;gap:1.4rem}.sz .lb{display:grid;gap:.5rem;font:700 .74rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}.sz .lb span{display:flex;justify-content:space-between;color:var(--ink);font-size:.9rem;letter-spacing:0;text-transform:none}.sz .lb b{font:400 1.5rem var(--display)}
.sz input[type=range]{width:100%;accent-color:var(--accent);height:32px}
.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:700 .9rem var(--sans);border:1px solid var(--ink);background:transparent;color:var(--ink);padding:.6rem 1.05rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
.sz .res{display:grid;gap:1rem}.sz .big{font:400 clamp(4.2rem,12vw,7rem)/.9 var(--display);color:var(--accent)}.sz .big small{display:block;font:700 .74rem var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}
.sz .ladder{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.sz .ladder i{display:grid;place-items:center;font:700 .78rem var(--sans);font-style:normal;border:1px solid var(--line);padding:.7rem 0;color:var(--muted)}.sz .ladder i.on{background:var(--ink);border-color:var(--ink);color:var(--bg)}.sz .ladder i.nb{border-color:var(--accent);color:var(--accent)}
.sz .say{margin:0;color:var(--ink)}.sz .btn{justify-self:start}.sz .note{font-size:.76rem;color:var(--muted)}
@media(max-width:860px){.sz{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:1px solid var(--ink);padding-top:1rem}.th b{display:block;font:400 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border-top:1px solid var(--ink);padding:1rem 0}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-sizer]"); if (!c) return;
  var S = ["XS", "S", "M", "L", "XL", "XXL"], UK = ["6 to 8", "10 to 12", "14", "16 to 18", "20", "22 to 24"], CH = [84, 92, 100, 108, 116], WA = [68, 76, 84, 92, 100], st = { fit: 1 }, line = "";
  var ch = c.querySelector("[data-ch]"), wa = c.querySelector("[data-wa]"), lad = [].slice.call(c.querySelectorAll(".ladder i"));
  function idx(v, t) { for (var i = 0; i < t.length; i++) if (v <= t[i]) return i; return t.length; }
  function calc() {
    var a = idx(+ch.value, CH), b = idx(+wa.value, WA), i = Math.max(a, b), note = a === b ? "Your chest and waist agree." : a > b ? "Your chest decides this one. We sized to the larger measurement." : "Your waist decides this one. We sized to the larger measurement.";
    i = Math.max(0, Math.min(5, i + (st.fit === 0 ? 1 : st.fit === 2 ? -1 : 0)));
    c.querySelector("[data-chv]").textContent = ch.value + " cm"; c.querySelector("[data-wav]").textContent = wa.value + " cm";
    c.querySelector("[data-size]").textContent = S[i]; c.querySelector("[data-uk]").textContent = "UK " + UK[i];
    lad.forEach(function (l, j) { l.className = j === i ? "on" : (Math.abs(j - i) === 1 ? "nb" : ""); });
    c.querySelector(".say").textContent = note + (st.fit === 0 ? " Fitted fit: we moved you up one size for a close cut." : st.fit === 2 ? " Relaxed fit: we moved you down one size for an easy, roomy cut." : " True to size.") + (i === 0 || i === 5 ? " You are at the edge of our range. Message us and we will help." : "");
    line = "Size help: chest " + ch.value + " cm, waist " + wa.value + " cm, " + ["fitted", "true to size", "relaxed"][st.fit] + " fit. The finder says " + S[i] + " (UK " + UK[i] + "). My question: ";
  }
  [].forEach.call(c.querySelectorAll(".opt button"), function (b, i, all) { b.addEventListener("click", function () { st.fit = i; all.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); calc(); }); });
  ch.addEventListener("input", calc); wa.addEventListener("input", calc); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "sizer", themeColor: "#F3F1EA", fonts: FONTS, preload: ["assets/fonts/Gloock-Regular.ttf"], js: JS,
  vars: { bg: "#F3F1EA", surface: "#FBF9F4", ink: "#1F2A24", muted: "#5F6A62", line: "#DEDACB", accent: "#1F4A3A", onaccent: "#FFFFFF", c1: "#1F4A3A", c2: "#F0C24A", c3: "#1F2A24", rad: "0px", display: '"Gloock",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(243,241,234,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Find the fit <em>first time</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#size"><span>Find my size</span></a><a class="btn" href="menu.html"><span>${X.cta1}</span></a></div></div>${model3d(pack, "hanger", "dress", "A clothes hanger you can turn", { c1: "#1F4A3A", c2: "#F0C24A", c3: "#1F2A24", hint: "a clothes hanger" })}</div></section>
<section class="sec" id="size" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Size finder</span><h2 style="margin-top:.8rem">Two measurements, <em>one right size</em></h2></div></div><div class="sz" data-sizer data-reveal><div class="ctl"><label class="lb"><span>Chest or bust <b data-chv></b></span><input type="range" min="76" max="130" value="96" data-ch aria-label="Chest or bust in centimetres"></label><label class="lb"><span>Waist <b data-wav></b></span><input type="range" min="60" max="116" value="80" data-wa aria-label="Waist in centimetres"></label><div class="lb">Fit you like<div class="opt"><button type="button" aria-pressed="false">Fitted</button><button type="button" aria-pressed="true">True to size</button><button type="button" aria-pressed="false">Relaxed</button></div></div></div><div class="res"><div class="big"><small>Your size</small><span data-size></span></div><div class="ladder"><i>XS</i><i>S</i><i>M</i><i>L</i><i>XL</i><i>XXL</i></div><p class="big" style="font-size:1.4rem;line-height:1.2" data-uk></p><p class="say"></p><button type="button" class="btn btn-primary" data-book><span>Ask about my size</span></button><span class="note">A guide to our womenswear and unisex sizing. Measure over light clothing, with the tape snug but not tight.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
