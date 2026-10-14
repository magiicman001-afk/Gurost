"use strict";
/**
 * sparks (trades, real 3D): an electrician's page that starts in the dark. A real 3D light bulb and a switch: flip it and the whole
 * page lights up (warm cream) with the bulb glowing. Services as circuit-board cards. Fonts: Jura + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Jura-Medium.ttf", "Jura-Medium.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["Jura-OFL.txt", "OFL-Jura.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Jura";src:url(fonts/Jura-Medium.ttf) format("truetype");font-weight:500;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:-.01em}h1{font-size:clamp(3rem,8.4vw,7.4rem);line-height:.96}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1}h3{font-size:1.45rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
body{transition:background .6s,color .6s}.hero,.card,.price,.order,.site-header.is-stuck{transition:background .6s,border-color .6s}
.lit{--bg:#FFF8E8;--surface:#FFFFFF;--ink:#1B1F27;--muted:#5D6470;--line:rgba(27,31,39,.16);--accent:#D97A00;--onaccent:#1A1000}
.hero{position:relative;overflow:hidden;padding:clamp(110px,12vw,150px) 0 clamp(40px,6vw,70px)}.hero::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 40% 50% at 72% 45%,rgba(255,200,70,var(--glow,.05)),transparent 70%);transition:background .6s}
.lit .hero{--glow:.55}
.hero .wrap{position:relative;display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:520px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.sw{display:inline-flex;align-items:center;gap:.8rem;margin-top:1.6rem;background:none;border:1px solid var(--line);border-radius:99px;color:var(--ink);font:700 .95rem var(--sans);padding:.5rem 1.1rem .5rem .5rem;cursor:pointer}.sw i{width:3rem;height:1.6rem;border-radius:99px;background:var(--line);position:relative;transition:background .3s}.sw i::after{content:"";position:absolute;left:.2rem;top:.2rem;width:1.2rem;height:1.2rem;border-radius:50%;background:var(--ink);transition:transform .3s,background .3s}.sw[aria-pressed=true] i{background:var(--accent)}.sw[aria-pressed=true] i::after{transform:translateX(1.4rem);background:#fff}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,1.6vw,20px)}.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1.2rem;display:grid;gap:.6rem;align-content:start;position:relative;overflow:hidden}.card::before{content:"";position:absolute;left:0;top:0;height:3px;width:100%;background:linear-gradient(90deg,var(--accent),transparent)}.card .ph{aspect-ratio:1;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.05)}.card .ph img{width:100%;height:100%;object-fit:contain}.card p{margin:0;color:var(--muted);font-size:.95rem}.card ul{list-style:none;margin:0;padding:0;display:grid;gap:.3rem;font-size:.92rem}.card li{display:flex;justify-content:space-between;gap:.6rem;border-top:1px dashed var(--line);padding-top:.35rem}.card li b{color:var(--accent);font-weight:700;white-space:nowrap}
@media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.grid{grid-template-columns:minmax(0,1fr)}}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px);position:relative}.steps div{border-top:2px solid var(--accent);padding-top:1rem}.steps .n{font:500 3.4rem/1 var(--display);color:var(--accent)}.steps p{color:var(--muted);margin:.3rem 0 0}@media(max-width:760px){.steps{grid-template-columns:1fr}}
.call{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;background:var(--accent);color:var(--onaccent);border-radius:14px;padding:clamp(18px,3vw,34px)}.call h2{margin:0;font-size:clamp(1.8rem,3.6vw,3rem)}.call a{color:var(--onaccent);font:500 clamp(1.8rem,4vw,3.4rem) var(--display);text-decoration:none}.call p{margin:.3rem 0 0}
.logos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.logos div{border:1px solid var(--line);border-radius:12px;padding:1.2rem;color:var(--muted)}.logos b{display:block;color:var(--ink);font:500 1.4rem var(--display);margin-bottom:.3rem}@media(max-width:760px){.logos{grid-template-columns:1fr}}
`;
const JS = `
(function () {
  var b = document.querySelector(".sw"); if (!b) return; var g = document.querySelector(".hero .gl3d");
  b.addEventListener("click", function () { var on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); document.documentElement.classList.toggle("lit", on); b.querySelector("span").textContent = on ? "Lights on" : "Flip the switch"; if (g && g.gl3d) g.gl3d.colors(null, on ? "#FFB01F" : "#FFC15A", null); });
})();
`;
module.exports = R.make({
  name: "sparks", themeColor: "#0C1118", fonts: FONTS, preload: ["assets/fonts/Jura-Medium.ttf"], js: JS,
  vars: { bg: "#0C1118", surface: "#141C26", ink: "#EEF2F7", muted: "#A4AFBD", line: "rgba(238,242,247,.16)", accent: "#FFC933", onaccent: "#171100", c2: "#FFC15A", c3: "#FF6A2A", display: '"Jura","Arial Narrow",system-ui,sans-serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(12,17,24,.9)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const cards = pack.cats.map((c) => `<article class="card" data-reveal><div class="ph">${img(c.art, c.name, { w: 500, h: 500, hint: B.hintOf(pack, c) })}</div><h3>${c.name}</h3><p>${c.blurb}</p><ul>${c.items.slice(0, 3).map((i) => `<li><span>${i.n}</span><b>${K.strip(i.meta)}</b></li>`).join("")}</ul></article>`).join("");
    const steps = X.process[2].map(([h, p], i) => `<div data-reveal data-delay="${i * 90}"><span class="n">0${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("");
    const logos = pack.sup.map((s) => `<div data-reveal><b>${s.split(" ").slice(0, 2).join(" ")}</b>${s}</div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div><button class="sw" type="button" aria-pressed="false"><i></i><span>Flip the switch</span></button></div>${model3d(pack, "bulb", "bulb", "A light bulb", { c1: "#FFC933", c2: "#FFC15A", lum: 2, hint: "a light bulb" })}</div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="grid">${cards}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="call" data-reveal><div><h2>Something wrong right now?</h2><p>Emergency engineers on call, day and night.</p></div><a href="tel:${t("phone_href")}">${t("phone")}</a></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.process[0]}</span><h2 style="margin-top:.8rem">${X.process[1]}</h2></div></div><div class="steps">${steps}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="logos">${logos}</div></div></section>`;
  },
});
