"use strict";
/**
 * cellar (restaurant, real 3D): a wine-cellar dark hero with a turnable 3D wine glass lit by gold. Arch-shaped menu cards, a
 * "from the cellar" ledger with dotted leaders, big quote. Fonts: Italiana + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Italiana-Regular.ttf", "Italiana-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Italiana-OFL.txt", "OFL-Italiana.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Italiana";src:url(fonts/Italiana-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em}h1{font-size:clamp(3.4rem,9.5vw,8.6rem);line-height:.92}h2{font-size:clamp(2.4rem,5.6vw,4.8rem);line-height:.98}h3{font-size:1.7rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{position:relative;overflow:hidden;padding:clamp(110px,12vw,150px) 0 clamp(40px,6vw,80px);background:radial-gradient(ellipse 60% 60% at 70% 45%,rgba(201,162,75,.2),transparent 70%),radial-gradient(ellipse 50% 50% at 15% 100%,rgba(122,20,36,.5),transparent 70%)}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(10px,3vw,50px);align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}
.hero .gl3d{max-width:560px;justify-self:center;filter:drop-shadow(0 30px 40px rgba(0,0,0,.5))}
.hero .rule{position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(transparent,rgba(201,162,75,.4),transparent)}
.hint{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);text-align:center;margin-top:.4rem}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}.hero .rule{display:none}}
.arches{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,24px)}
.ar{display:block;text-decoration:none;color:inherit;text-align:center}.ar .ph{aspect-ratio:3/4;border-radius:999px 999px 14px 14px;overflow:hidden;border:1px solid var(--line);background:#1d0e11;transition:transform .5s var(--ease),border-color .3s}.ar:hover .ph{transform:translateY(-8px);border-color:var(--accent)}.ar .ph img{width:100%;height:100%;object-fit:cover}.ar h3{margin:1rem 0 .2rem}.ar p{margin:0;color:var(--muted);font-size:.95rem}
@media(max-width:900px){.arches{grid-template-columns:repeat(2,minmax(0,1fr))}}
.ledger{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,80px)}.ledger ul{list-style:none;margin:0;padding:0}.ledger li{display:flex;align-items:baseline;gap:.6rem;padding:.7rem 0}.ledger li::after{content:"";order:2;flex:1;border-bottom:1px dotted var(--line);margin:0 .3rem}.ledger li span:first-child{order:1}.ledger li b{order:3;color:var(--accent);font-weight:700;white-space:nowrap}.ledger small{display:block;color:var(--muted)}
@media(max-width:760px){.ledger{grid-template-columns:1fr}}
.quote{text-align:center;max-width:900px;margin:auto}.quote blockquote{margin:0;font:clamp(1.6rem,3.6vw,3rem)/1.2 var(--display)}.quote cite{display:block;margin-top:1.2rem;color:var(--muted);font-style:normal;letter-spacing:.12em;text-transform:uppercase;font-size:.8rem}
.chef{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(20px,5vw,80px);align-items:center}.chef .gl3d{max-width:420px}@media(max-width:760px){.chef{grid-template-columns:1fr}}
`;
module.exports = R.make({
  name: "cellar", themeColor: "#120709", fonts: FONTS, preload: ["assets/fonts/Italiana-Regular.ttf"],
  vars: { bg: "#120709", surface: "#1D0E11", ink: "#F5EADB", muted: "#B9A99A", line: "rgba(245,234,219,.16)", accent: "#C9A24B", onaccent: "#1A0B0E", c2: "#E8CB82", c3: "#7A1424", display: '"Italiana","Playfair Display",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(18,7,9,.9)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const arches = pack.cats.map((c) => `<a class="ar" href="menu.html#${c.id}" data-reveal><div class="ph">${img(c.art, c.name, { w: 600, h: 800, hint: B.hintOf(pack, c) })}</div><h3>${c.name}</h3><p>${c.items.length} dishes</p></a>`).join("");
    const drinks = pack.cats.find((c) => c.id === "drinks").items, fire = pack.cats.find((c) => c.id === "fire").items;
    const li = (a) => a.map((i) => `<li><span>${i.n}<small>${i.d.split(".")[0]}.</small></span><b>${K.strip(i.meta)}</b></li>`).join("");
    const rv = pack.reviews[0];
    return `<section class="hero"><span class="rule" aria-hidden="true"></span><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div><div>${model3d(pack, "wineglass", "wineglass", "A glass of red wine", { c1: "#C9A24B", c2: "#8E1B2E", lum: 2, hint: "a glass of red wine" })}<p class="hint">Drag to turn the glass</p></div></div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="arches">${arches}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="ledger" data-reveal><div><span class="eyebrow">From the fire</span><ul>${li(fire)}</ul></div><div><span class="eyebrow">From the bar</span><ul>${li(drinks)}</ul></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap quote" data-reveal><blockquote>&ldquo;${rv.q}&rdquo;</blockquote><cite>${rv.by}</cite></div></section>
<section class="sec" style="padding-top:0"><div class="wrap chef"><div data-reveal>${model3d(pack, "coupe", "cocktail", "A cocktail in a coupe glass", { c1: "#C9A24B", c2: "#E8A63B", lum: 2, hint: "a cocktail" })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2 style="margin:.8rem 0 1rem">${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></section>`;
  },
});
