"use strict";
/**
 * skyline (estate agent, real 3D): a dark luxury layout. A 3D tower block turns as you scroll beside giant numbers and a list of
 * neighbourhoods that reveals a picture on hover. Fonts: Italiana + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Italiana-Regular.ttf", "Italiana-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Italiana-OFL.txt", "OFL-Italiana.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Italiana";src:url(fonts/Italiana-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.02em;text-transform:uppercase}h1{font-size:clamp(2.8rem,8vw,7.4rem);line-height:.98}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1.02}h3{font-size:1.5rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.28em}
.hero{position:relative;min-height:min(96svh,860px);padding:clamp(110px,12vw,150px) 0 40px;overflow:hidden;background:linear-gradient(180deg,#0B0B0D,#131318)}.hero::after{content:"";position:absolute;inset:auto 0 0 0;height:40%;background:repeating-linear-gradient(90deg,rgba(200,181,138,.06) 0 2px,transparent 2px 46px);pointer-events:none}
.hero .wrap{position:relative;z-index:1;display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:520px;justify-self:center;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,30px);border-block:1px solid var(--line);padding:clamp(20px,3vw,40px) 0}.nums b{display:block;font:400 clamp(2.2rem,7vw,6rem)/1 var(--display);color:var(--accent);overflow-wrap:anywhere}.nums span{color:var(--muted);letter-spacing:.14em;text-transform:uppercase;font-size:.78rem}
.ar{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}.ar li{border-bottom:1px solid var(--line)}.ar a{display:grid;grid-template-columns:3rem 1fr auto;gap:1rem;align-items:center;padding:1.3rem 0;color:inherit;text-decoration:none;position:relative}.ar .n{color:var(--accent)}.ar h3{font-size:clamp(1.6rem,4vw,3rem);transition:padding-left .4s var(--ease),color .3s}.ar a:hover h3{padding-left:1rem;color:var(--accent)}.ar em{font-style:normal;color:var(--muted)}
.ar .pv{position:absolute;right:6rem;top:50%;width:150px;aspect-ratio:1;transform:translateY(-50%) scale(.7) rotate(-6deg);opacity:0;transition:.4s var(--ease);pointer-events:none}.ar a:hover .pv{opacity:1;transform:translateY(-50%) scale(1) rotate(-3deg)}.ar .pv img{width:100%;height:100%;object-fit:contain}
@media(max-width:700px){.ar .pv{display:none}.ar a{grid-template-columns:2rem 1fr}.ar em{grid-column:2}}
.fe{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.fe article{border:1px solid var(--line);padding:1.2rem;display:grid;gap:.5rem;background:var(--surface)}.fe .ph{aspect-ratio:4/3;background:#1B1B22;display:grid;place-items:center}.fe img{width:80%;height:80%;object-fit:contain}.fe b{color:var(--accent);font:400 1.8rem var(--display)}.fe p{margin:0;color:var(--muted);font-size:.93rem}@media(max-width:900px){.fe{grid-template-columns:1fr}}
.qt{text-align:center;max-width:860px;margin:auto}.qt blockquote{margin:0;font:clamp(1.5rem,3.4vw,2.8rem)/1.25 var(--display);text-transform:none}.qt cite{display:block;margin-top:1.2rem;font-style:normal;color:var(--muted);letter-spacing:.14em;text-transform:uppercase;font-size:.78rem}
`;
module.exports = R.make({
  name: "skyline", themeColor: "#0B0B0D", fonts: FONTS, preload: ["assets/fonts/Italiana-Regular.ttf"],
  vars: { bg: "#0B0B0D", surface: "#141418", ink: "#F2EEE6", muted: "#9E9A90", line: "rgba(242,238,230,.16)", accent: "#C8B58A", onaccent: "#14110A", c2: "#E8DCC0", c3: "#C8B58A", rad: "0", display: '"Italiana",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(11,11,13,.9)" },
  css: css + ".btn,.btn-primary{border-radius:0}",
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("");
    const arts = ["villa", "flat", "door", "plant", "key", "sign", "villa", "flat"];
    const areas = pack.areas.slice(0, 6).map((a, i) => `<li><a href="menu.html"><span class="n">${K.pad(i + 1)}</span><h3>${a}</h3><em>View homes</em><span class="pv">${img(arts[i], a, { w: 220, h: 220, hint: "a home in " + a })}</span></a></li>`).join("");
    const fe = pack.cats.find((c) => c.id === "sale").items.slice(0, 3).map((i) => `<article data-reveal><div class="ph">${img(i.art || "villa", i.n, { w: 500, h: 380, hint: B.hintOf(pack, i) })}</div><b>${K.strip(i.meta)}</b><h3 style="font-size:1.25rem">${i.n}</h3><p>${i.d}</p></article>`).join("");
    const rv = pack.reviews[0];
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "tower", "flat", "A tower block that turns as you scroll", { c1: "#C8B58A", c2: "#C8B58A", lum: 1.4, hint: "an apartment block" }).replace('data-gl3d="tower"', 'data-gl3d="tower" data-scroll')}</div></section>
<section class="sec" style="padding-bottom:0"><div class="wrap"><div class="nums">${nums}</div></div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Neighbourhoods</span><h2 style="margin-top:.8rem">Where we <em>work</em></h2></div></div><ul class="ar">${areas}</ul></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.fav[0]}</span><h2 style="margin-top:.8rem">${X.fav[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="fe">${fe}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap qt" data-reveal><blockquote>&ldquo;${rv.q}&rdquo;</blockquote><cite>${rv.by}</cite></div></section>`;
  },
});
