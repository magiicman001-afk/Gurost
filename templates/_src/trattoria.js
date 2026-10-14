"use strict";
/**
 * trattoria (restaurant, real 3D): warm cream with a gingham band and tomato red. A sticky 3D pizza that turns as you scroll beside the
 * menu categories. Fonts: Erica One + Lora (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["EricaOne-Regular.ttf", "EricaOne-Regular.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Bold.ttf", "Lora-Bold.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["EricaOne-OFL.txt", "OFL-EricaOne.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"Erica One";src:url(fonts/EricaOne-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;text-transform:uppercase;letter-spacing:.01em}h1{font-size:clamp(3.2rem,9vw,8rem);line-height:.92}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1}h3{font-size:1.4rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);font-family:var(--sans);font-weight:700}
.btn-primary,.site-header .btn-primary{border-radius:99px}
.gingham{height:34px;background:repeating-linear-gradient(0deg,rgba(214,56,30,.85) 0 17px,transparent 17px 34px),repeating-linear-gradient(90deg,rgba(214,56,30,.85) 0 17px,transparent 17px 34px),#fff;background-blend-mode:multiply}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(34px,5vw,60px);text-align:center;position:relative;overflow:hidden}.hero .wrap{display:grid;justify-items:center;gap:1rem}.hero h1{margin:.6rem 0}.hero .lead{margin:0 auto}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-top:1rem}
.hero .gl3d{width:min(92vw,640px);margin-top:-.5rem;filter:drop-shadow(0 28px 30px rgba(120,40,10,.28))}
.hero .stamp{position:absolute;right:max(4vw,16px);top:clamp(110px,14vw,170px);width:110px;height:110px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;text-align:center;font:700 .8rem/1.2 var(--sans);letter-spacing:.1em;text-transform:uppercase;transform:rotate(12deg);box-shadow:0 8px 24px rgba(214,56,30,.4)}
@media(max-width:700px){.hero .stamp{display:none}}
.pz{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(20px,5vw,80px);align-items:start}.pz .stick{position:sticky;top:90px}.pz .gl3d{width:100%;max-width:520px;filter:drop-shadow(0 24px 28px rgba(120,40,10,.25))}
.pz .list{display:grid;gap:clamp(26px,4vw,54px)}.pz .cat h3{font-size:1.9rem;color:var(--accent);margin:0 0 .3rem}.pz .cat p.b{margin:0 0 .8rem;color:var(--muted);font-style:italic}.pz ul{list-style:none;margin:0;padding:0}.pz li{display:flex;gap:.8rem;justify-content:space-between;align-items:baseline;border-bottom:1px dashed var(--line);padding:.8rem 0}.pz li span{min-width:0}.pz li b{font-family:var(--sans);display:block}.pz li small{color:var(--muted)}.pz li em{font-style:normal;font-weight:700;color:var(--accent);white-space:nowrap}
@media(max-width:820px){.pz{grid-template-columns:1fr}.pz .stick{position:relative;top:0}.pz .gl3d{max-width:380px;margin:auto}}
.dots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.dots a{text-decoration:none;color:inherit;text-align:center;font:700 1.05rem var(--sans)}.dots .ph{display:block;aspect-ratio:1;border-radius:50%;overflow:hidden;border:3px solid var(--ink);margin-bottom:.6rem;transition:transform .4s var(--ease)}.dots a:hover .ph{transform:rotate(-4deg) scale(1.04)}.dots img{width:100%;height:100%;object-fit:cover}@media(max-width:560px){.dots{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cards3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.q{background:#fff;border:2px solid var(--ink);border-radius:18px;padding:1.4rem;box-shadow:6px 6px 0 var(--accent)}.q p{margin:0 0 1rem;font-style:italic;font-size:1.05rem}.q cite{font-style:normal;font-weight:700;font-size:.85rem;color:var(--muted)}@media(max-width:820px){.cards3{grid-template-columns:1fr}}
.nonna{display:grid;grid-template-columns:1fr 1fr;gap:clamp(20px,5vw,70px);align-items:center}.nonna .ph{aspect-ratio:1;border-radius:50%;overflow:hidden;border:6px solid var(--accent)}.nonna .ph img{width:100%;height:100%;object-fit:cover}@media(max-width:760px){.nonna{grid-template-columns:1fr}.nonna .ph{max-width:320px;margin:auto}}
`;
module.exports = R.make({
  name: "trattoria", themeColor: "#FBF3E4", fonts: FONTS, preload: ["assets/fonts/EricaOne-Regular.ttf"],
  vars: { bg: "#FBF3E4", surface: "#FFFFFF", ink: "#2A1810", muted: "#6B574B", line: "#E5D3BC", accent: "#D6381E", onaccent: "#FFFFFF", c2: "#2E6B3A", c3: "#F2B84B", display: '"Erica One","Arial Black",Impact,sans-serif', sans: '"Lora",Georgia,serif', header: "rgba(251,243,228,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const list = pack.cats.map((c) => `<div class="cat" data-reveal><h3>${c.name}</h3><p class="b">${c.blurb}</p><ul>${c.items.map((i) => `<li><span><b>${i.n}</b><small>${i.d}</small></span><em>${K.strip(i.meta)}</em></li>`).join("")}</ul></div>`).join("");
    const rv = pack.reviews.map((r) => `<div class="q" data-reveal><p>&ldquo;${r.q}&rdquo;</p><cite>${r.by}</cite></div>`).join("");
    return `<div class="gingham" aria-hidden="true"></div>
<section class="hero"><span class="stamp" aria-hidden="true">Fresh<br>every<br>day</span><div class="wrap"><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div>${model3d(pack, "pizza", "pizza", "A wood-fired pizza", { c2: "#D6381E", hint: "a wood fired pizza" })}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div></div><div class="pz"><div class="stick">${model3d(pack, "pizza", "pizza", "A pizza that turns as you scroll", { c2: "#D6381E", hint: "a pizza", attrs: "" }).replace('data-gl3d="pizza"', 'data-gl3d="pizza" data-scroll')}</div><div class="list">${list}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="dots">${pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal><span class="ph">${img(c.art, c.name, { w: 400, h: 400, hint: B.hintOf(pack, c) })}</span><b>${c.name}</b></a>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="cards3">${rv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap nonna"><div class="ph" data-reveal>${img("tart", "A freshly baked tart", { role: "featured", w: 700, h: 700, hint: "a freshly baked dessert" })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2 style="margin:.8rem 0 1rem">${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></section>
<div class="gingham" aria-hidden="true"></div>`;
  },
});
