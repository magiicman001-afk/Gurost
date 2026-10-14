"use strict";
/**
 * wears (fashion and online shop, real 3D): a warm kraft-paper and forest-green look with a turnable 3D set of scales and a
 * "cost per wear" calculator: choose a price, how often you wear it and how many years you keep it, and see the cost of each wear
 * set against a 15 pound top worn six times, with the break-even point in plain words. Pre-fills the question form. Fonts: Crimson Pro +
 * DM Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["DMMono-Regular.ttf", "DMMono-Regular.ttf"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"], ["DMMono-OFL.txt", "OFL-DMMono.txt"]];
const css = `
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"DM Mono";src:url(fonts/DMMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
body{background-image:radial-gradient(rgba(70,50,20,.05) 1px,transparent 1px);background-size:6px 6px}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:.98}h2{font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.04}h3{font-size:1.4rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.cw{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(18px,4vw,50px);align-items:start;background:#FBF6EA;border:1px solid #CDBE9B;border-radius:6px;padding:clamp(18px,3vw,38px)}.cw .ctl{display:grid;gap:1.4rem}.cw .lb{display:grid;gap:.5rem;font:400 .76rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.cw .lb span{display:flex;justify-content:space-between;color:var(--ink);font-size:.95rem;letter-spacing:0;text-transform:none}.cw .lb b{font:400 1.7rem var(--display)}.cw input[type=range]{width:100%;accent-color:var(--accent);height:32px}
.cw .big{font:400 clamp(3.6rem,10vw,6rem)/.95 var(--display);color:var(--accent)}.cw .big small{display:block;font:400 .74rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem}.cw .cmp{display:grid;gap:.7rem;margin:1.2rem 0}.cw .cmp div{display:grid;gap:.3rem;font:400 .8rem var(--sans);color:var(--ink)}.cw .cmp i{display:block;height:14px;background:var(--accent);border-radius:2px;transition:width .4s;min-width:3px}.cw .cmp .f i{background:#B9AE95}
.cw .say{margin:0 0 1rem;color:var(--ink)}.cw .note{display:block;margin-top:.8rem;font-size:.74rem;color:var(--muted)}
@media(max-width:860px){.cw{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:400 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid #CDBE9B;background:#FBF6EA;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.95rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-cpw]"); if (!c) return;
  var pr = c.querySelector("[data-pr]"), mo = c.querySelector("[data-mo]"), yr = c.querySelector("[data-yr]"), line = "", FAST = 15 / 6;
  function money(n) { return "\\u00A3" + (n < 10 ? n.toFixed(2) : n.toFixed(n < 100 ? 1 : 0)); }
  function calc() {
    var p = +pr.value, w = +mo.value * 12 * +yr.value, cpw = p / w, be = Math.ceil(p / FAST), mx = Math.max(cpw, FAST);
    c.querySelector("[data-prv]").textContent = "\\u00A3" + p; c.querySelector("[data-mov]").textContent = mo.value + " a month"; c.querySelector("[data-yrv]").textContent = yr.value + (+yr.value === 1 ? " year" : " years");
    c.querySelector("[data-cpw-n]").textContent = money(cpw); c.querySelector("[data-w]").textContent = w + " wears";
    c.querySelector(".mine i").style.width = Math.max(1, cpw / mx * 100) + "%"; c.querySelector(".fast i").style.width = Math.max(1, FAST / mx * 100) + "%";
    c.querySelector("[data-mine]").textContent = money(cpw) + " each"; c.querySelector("[data-fast]").textContent = money(FAST) + " each";
    c.querySelector(".say").textContent = cpw <= FAST ? "Over " + yr.value + (+yr.value === 1 ? " year" : " years") + " this piece costs less per wear than a \\u00A315 top worn six times." : "You need about " + be + " wears before this piece costs less per wear than a \\u00A315 top worn six times. That is " + Math.ceil(be / +mo.value) + " months at your pace.";
    line = "Cost per wear: a \\u00A3" + p + " piece worn " + mo.value + " times a month for " + yr.value + " years is " + money(cpw) + " a wear. My question: ";
  }
  [pr, mo, yr].forEach(function (e) { e.addEventListener("input", calc); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "wears", themeColor: "#F1E9D6", fonts: FONTS, preload: ["assets/fonts/CrimsonPro-Regular.ttf"], js: JS,
  vars: { bg: "#F1E9D6", surface: "#FBF6EA", ink: "#2B2A1F", muted: "#6B6650", line: "#D9CCAA", accent: "#2E6B3E", onaccent: "#FFFFFF", c1: "#2E6B3E", c2: "#E6C766", c3: "#2B2A1F", rad: "4px", display: '"Crimson Pro",Georgia,serif', sans: '"DM Mono",ui-monospace,monospace', header: "rgba(241,233,214,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Cheap is <em>never</em> cheap.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#worth"><span>Work out the cost</span></a><a class="btn" href="menu.html"><span>${X.cta1}</span></a></div></div>${model3d(pack, "scales", "dress", "A pair of scales you can turn", { c1: "#2E6B3E", c2: "#E6C766", c3: "#2B2A1F", hint: "a pair of scales" })}</div></section>
<section class="sec" id="worth" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Cost per wear</span><h2 style="margin-top:.8rem">What does <em>each wear</em> cost?</h2></div></div><div class="cw" data-cpw data-reveal><div class="ctl"><label class="lb"><span>Price <b data-prv></b></span><input type="range" min="10" max="300" step="5" value="89" data-pr aria-label="Price in pounds"></label><label class="lb"><span>How often you wear it <b data-mov></b></span><input type="range" min="1" max="30" value="4" data-mo aria-label="Wears per month"></label><label class="lb"><span>How long you keep it <b data-yrv></b></span><input type="range" min="1" max="10" value="3" data-yr aria-label="Years kept"></label></div><div><div class="big"><small>Cost per wear</small><span data-cpw-n></span></div><p class="lb" style="margin:.4rem 0 0" data-w></p><div class="cmp"><div class="mine"><span>This piece <b data-mine></b></span><i></i></div><div class="fast f"><span>A &pound;15 top worn six times <b data-fast></b></span><i></i></div></div><p class="say"></p><button type="button" class="btn btn-primary" data-book><span>Ask about durability</span></button><span class="note">A simple guide. It ignores washing, repairs and resale value.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
