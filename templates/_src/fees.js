"use strict";
/**
 * fees (law firm, real 3D): navy and brass with a turnable 3D house and a property cost calculator: stamp duty (England bands,
 * for illustration), our fixed fee and the total, for a home mover, first-time buyer or extra property. Fonts: DM Mono + Lora
 * (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["DMMono-Regular.ttf", "DMMono-Regular.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["DMMono-OFL.txt", "OFL-DMMono.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"DM Mono";src:url(fonts/DMMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
body{font-family:"Lora",Georgia,serif}.btn,.eyebrow,.chips{font-family:var(--display)}
h1,h2,h3{font-family:"Lora",Georgia,serif;font-weight:400;letter-spacing:-.02em}h1{font-size:clamp(2.7rem,7vw,6rem);line-height:1.02}h2{font-size:clamp(2rem,4.2vw,3.3rem);line-height:1.08}h3{font-size:1.25rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.14em;text-transform:uppercase}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(36px,5vw,64px);background:radial-gradient(ellipse 45% 55% at 78% 45%,rgba(201,154,62,.2),transparent 70%)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:460px;justify-self:center;filter:drop-shadow(0 26px 30px rgba(0,0,0,.4))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.fc{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);border:1px solid var(--line);border-radius:22px;overflow:hidden;background:var(--surface)}.fc .l{padding:clamp(18px,3.4vw,42px);display:grid;gap:1.3rem;align-content:start}.fc .r{padding:clamp(18px,3.4vw,42px);background:var(--accent);color:var(--onaccent);display:grid;gap:.3rem;align-content:center}
.fc .f label{display:flex;justify-content:space-between;font:400 .85rem var(--display);margin-bottom:.4rem}.fc .f label b{color:var(--accent);font-weight:400}.fc input[type=range]{width:100%;accent-color:var(--accent)}
.fc .ch{display:flex;gap:.5rem;flex-wrap:wrap}.fc .ch button{font:400 .85rem var(--display);border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:99px;padding:.5rem 1rem;cursor:pointer}.fc .ch button[aria-pressed=true]{background:var(--accent);color:var(--onaccent);border-color:var(--accent)}
.fc .r small{letter-spacing:.14em;text-transform:uppercase;font:400 .72rem var(--display);opacity:.8}.fc .r b{font:400 clamp(2.6rem,6vw,4.2rem)/1.05 var(--display)}.fc .r .row{display:flex;justify-content:space-between;gap:1rem;border-top:1px solid rgba(0,0,0,.22);padding:.5rem 0;font:400 .88rem var(--display)}
@media(max-width:820px){.fc{grid-template-columns:minmax(0,1fr)}}
.ft{width:100%;border-collapse:collapse}.ft td,.ft th{padding:1rem .5rem;border-bottom:1px solid var(--line);text-align:left}.ft th{font:400 .75rem var(--display);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.ft td:last-child,.ft th:last-child{text-align:right;font-family:var(--display);white-space:nowrap}.ft td:first-child{font-size:1.1rem}.ftw{overflow-x:auto}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:100px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:100px;height:100px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
.note{font-size:.8rem;color:var(--muted);margin:1rem 0 0}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-fee]"); if (!c) return; var kind = 0, q = function (n) { return c.querySelector('[name="' + n + '"]'); };
  var fm = function (n) { return "\\u00a3" + Math.round(n).toLocaleString("en-GB"); };
  var B = [[125000, 0], [250000, .02], [925000, .05], [1500000, .1], [1e12, .12]], F = [[300000, 0], [500000, .05]];
  function band(P, t, extra) { var tax = 0, lo = 0; for (var i = 0; i < t.length; i++) { var hi = Math.min(P, t[i][0]); if (hi > lo) tax += (hi - lo) * (t[i][1] + extra); lo = t[i][0]; if (P <= t[i][0]) break; } return tax; }
  function sdlt(P) { if (kind === 1 && P <= 500000) return band(P, F, 0); if (kind === 2) return band(P, B, .05); return band(P, B, 0); }
  function u() { var P = +q("price").value, tax = sdlt(P), fee = P > 500000 ? 1095 : 895, vat = fee * .2, srch = 350, tot = tax + fee + vat + srch + 40;
    c.querySelector('[data-o="price"]').textContent = fm(P); c.querySelector(".r b").textContent = fm(tot);
    c.querySelector('[data-o="tax"]').textContent = fm(tax); c.querySelector('[data-o="fee"]').textContent = fm(fee) + " + VAT"; c.querySelector('[data-o="srch"]').textContent = "about " + fm(srch + 40); }
  [].slice.call(c.querySelectorAll(".ch button")).forEach(function (b) { b.addEventListener("click", function () { kind = +b.getAttribute("data-k"); [].slice.call(c.querySelectorAll(".ch button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); u(); }); });
  c.addEventListener("input", u); u();
})();
`;
module.exports = R.make({
  name: "fees", themeColor: "#0F2742", fonts: FONTS, preload: ["assets/fonts/DMMono-Regular.ttf"], js: JS,
  vars: { bg: "#0F2742", surface: "#16335A", ink: "#F3EEDF", muted: "#B3C0D2", line: "rgba(243,238,223,.18)", accent: "#E2B14C", onaccent: "#14110A", c1: "#E2B14C", c2: "#F3D38A", c3: "#E2B14C", rad: "12px", display: '"DM Mono",ui-monospace,monospace', sans: '"Lora",Georgia,serif', header: "rgba(15,39,66,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const f = (n, l, min, max, step, val) => `<div class="f"><label>${l}<b data-o="${n}"></b></label><input type="range" name="${n}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
    const rows = pack.cats.map((c) => `<tr><td>${c.items[0].n}</td><td>${K.strip(c.items[0].meta)}</td></tr>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Fixed fees. <em>No surprises.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="#cost"><span>Work out my costs</span></a></div></div>${model3d(pack, "house", "folder", "A house you can turn", { c1: "#E2B14C", c2: "#F3D38A", lum: 1.4, hint: "a family house" })}</div></section>
<section class="sec" id="cost" style="padding-top:0"><div class="wrap"><div class="fc" data-fee data-reveal><div class="l"><div><span class="eyebrow">Buying a home</span><h2 style="margin-top:.8rem">What will it <em>really cost</em>?</h2></div>${f("price", "Property price", 100000, 1500000, 5000, 325000)}<div class="f"><label>Buyer type</label><div class="ch"><button type="button" data-k="0" aria-pressed="true">Home mover</button><button type="button" data-k="1" aria-pressed="false">First-time buyer</button><button type="button" data-k="2" aria-pressed="false">Additional property</button></div></div></div><div class="r"><small>Estimated total costs</small><b>&pound;0</b><div class="row"><span>Stamp duty (SDLT)</span><span data-o="tax"></span></div><div class="row"><span>Our fixed fee</span><span data-o="fee"></span></div><div class="row"><span>Searches and Land Registry</span><span data-o="srch"></span></div><a class="btn" href="#order" style="margin-top:.8rem;justify-self:start;color:var(--onaccent);border-color:var(--onaccent)"><span>Get a fixed quote</span></a></div></div><p class="note">An illustration for a purchase in England using the standard stamp duty bands at the time of writing. Rates and reliefs change, so please check gov.uk. Not legal advice. We confirm every cost in writing.</p></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Our fixed fees</span><h2 style="margin-top:.8rem">The price, <em>before you start</em></h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="ftw" data-reveal><table class="ft"><thead><tr><th>Service</th><th>Fee</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sv">${sv}</div></div></section>`;
  },
});
