"use strict";
/**
 * tyrefit (garage, real 3D): charcoal and orange with a turnable 3D wheel and a "read your tyre" tool: choose width, profile, rim and
 * speed rating, the sidewall text updates on a drawn tyre, the numbers are explained, and an example price is shown with a button that
 * pre-fills the booking form. Fonts: Smooch Sans + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["SmoochSans-Medium.ttf", "SmoochSans-Medium.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["SmoochSans-OFL.txt", "OFL-SmoochSans.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Smooch Sans";src:url(fonts/SmoochSans-Medium.ttf) format("truetype");font-weight:400 700;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:.005em;text-transform:uppercase}h1{font-size:clamp(3.4rem,10vw,8rem);line-height:.9}h2{font-size:clamp(2.4rem,5.4vw,4.2rem);line-height:.95}h3{font-size:1.5rem}
h1,h2{-webkit-text-stroke:1.2px currentColor}h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.18em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:460px;justify-self:center;filter:drop-shadow(0 26px 30px rgba(0,0,0,.5))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.ty{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(18px,4vw,56px);align-items:center}.ty svg{width:100%;max-width:420px;height:auto;justify-self:center}.ty svg text{font:500 25px "Smooch Sans",sans-serif;letter-spacing:.08em;fill:#D5D9E0}
.ty .sel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem}.ty label{display:grid;gap:.35rem;font:700 .74rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.ty select{width:100%;min-width:0;font:700 1.1rem var(--sans);color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.8rem .9rem;color-scheme:dark}
.ty .res{margin-top:1.4rem;border-top:1px solid var(--line);padding-top:1.2rem;display:grid;gap:.5rem}.ty .res p{margin:0;color:var(--muted)}.ty .res b{color:var(--ink)}.ty .code{font:500 clamp(2.4rem,6vw,3.6rem)/1 var(--display);color:var(--accent);letter-spacing:.03em}.ty .px{display:flex;gap:1.4rem;flex-wrap:wrap;margin:.4rem 0}.ty .px div{font:700 .75rem var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.ty .px b{display:block;font:500 2rem/1.1 var(--display);color:var(--ink);letter-spacing:0}.ty .btn{justify-self:start;margin-top:.6rem}.ty .note{font-size:.8rem;color:var(--muted)}
@media(max-width:820px){.ty{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-left:4px solid var(--accent);padding:.3rem 0 .3rem 1rem}.th b{display:block;font:500 2.6rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-tyre]"); if (!c) return;
  var s = c.querySelectorAll("select"), code = c.querySelector(".code"), tp = c.querySelector("textPath"), d = c.querySelector("[data-d]"), sw = c.querySelector("[data-sw]"), lo = c.querySelector("[data-lo]"), hi = c.querySelector("[data-hi]"), meaning = c.querySelector("[data-meaning]"), bk = c.querySelector("[data-book]"), txt = "";
  var base = { 14: 48, 15: 54, 16: 62, 17: 75, 18: 92, 19: 115, 20: 140 };
  function calc() {
    var w = +s[0].value, p = +s[1].value, r = +s[2].value, v = s[3].value, side = Math.round(w * p / 100), dia = Math.round(r * 25.4 + 2 * side);
    txt = w + "/" + p + " R" + r + " 91" + v; code.textContent = txt; tp.textContent = txt;
    d.textContent = dia + " mm"; sw.textContent = side + " mm";
    var b = (base[r] || 60) * (1 + (w - 155) / 500), l = Math.round(b / 1) , h = Math.round(b * 1.9);
    lo.textContent = "\\u00A3" + l; hi.textContent = "\\u00A3" + h;
    meaning.textContent = w + " mm wide, a sidewall " + p + "% as tall as it is wide (" + side + " mm), made for a " + r + " inch wheel, and rated for " + ({ T: "118 mph", H: "130 mph", V: "149 mph", W: "168 mph" }[v]) + ".";
  }
  [].forEach.call(s, function (x) { x.addEventListener("change", calc); }); calc();
  bk.addEventListener("click", function () {
    var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Tyre quote: size " + txt + ", please quote budget and premium brands, fitted.";
    var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
`;
const opts = (a, sel) => a.map((x) => `<option${x === sel ? " selected" : ""}>${x}</option>`).join("");
module.exports = R.make({
  name: "tyrefit", themeColor: "#15171B", fonts: FONTS, preload: ["assets/fonts/SmoochSans-Medium.ttf"], js: JS,
  vars: { bg: "#15171B", surface: "#1E2126", ink: "#F2F3F5", muted: "#A0A6B1", line: "rgba(242,243,245,.15)", accent: "#FF6B1A", onaccent: "#16110C", c1: "#FF6B1A", c2: "#FFB27A", c3: "#111111", rad: "12px", display: '"Smooch Sans",Impact,sans-serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(21,23,27,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const tyre = `<svg viewBox="0 0 300 300" role="img" aria-label="A tyre showing its size on the sidewall"><defs><path id="ty-arc" d="M 30 150 A 120 120 0 0 1 270 150"/></defs><circle cx="150" cy="150" r="146" fill="#0C0D0F"/><circle cx="150" cy="150" r="140" fill="#23262C"/><circle cx="150" cy="150" r="92" fill="#0C0D0F"/><circle cx="150" cy="150" r="86" fill="#B9C0CB"/><circle cx="150" cy="150" r="70" fill="#8D96A4"/><g stroke="#D5DAE2" stroke-width="13" stroke-linecap="round"><path d="M150 150 L150 84"/><path d="M150 150 L213 129"/><path d="M150 150 L189 204"/><path d="M150 150 L111 204"/><path d="M150 150 L87 129"/></g><circle cx="150" cy="150" r="20" fill="#FF6B1A"/><circle cx="150" cy="150" r="8" fill="#FFB27A"/><text><textPath href="#ty-arc" startOffset="50%" text-anchor="middle">205/55 R16 91V</textPath></text></svg>`;
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Grip <em>that</em> lasts.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#size"><span>Read my tyre size</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "wheel", "tyre", "A wheel you can turn", { c1: "#FF6B1A", c2: "#FFB27A", c3: "#111111", hint: "a car wheel and tyre" })}</div></section>
<section class="sec" id="size" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Tyre reader</span><h2 style="margin-top:.8rem">What do those <em>numbers mean</em>?</h2></div></div><div class="ty" data-tyre data-reveal>${tyre}<div><div class="sel"><label>Width (mm)<select>${opts([155, 175, 195, 205, 215, 225, 245], 205)}</select></label><label>Profile (%)<select>${opts([35, 40, 45, 50, 55, 60, 65], 55)}</select></label><label>Wheel (inches)<select>${opts([14, 15, 16, 17, 18, 19, 20], 16)}</select></label><label>Speed rating<select>${opts(["T", "H", "V", "W"], "V")}</select></label></div><div class="res"><div class="code">205/55 R16 91V</div><p data-meaning></p><div class="px"><div>Budget, fitted<b data-lo></b></div><div>Premium, fitted<b data-hi></b></div></div><p>Sidewall <b data-sw></b> &middot; Overall height <b data-d></b></p><button type="button" class="btn btn-primary" data-book><span>Get my tyre quote</span></button><span class="note">Example prices from the pack, each, fitted. We confirm the exact price before we start.</span></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
