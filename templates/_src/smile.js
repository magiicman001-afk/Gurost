"use strict";
/**
 * smile (clinic, real 3D): a bright mint-and-white layout with a turnable 3D tooth and a drag-to-reveal before and after slider.
 * Fonts: Young Serif + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["YoungSerif-Regular.ttf", "YoungSerif-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["YoungSerif-OFL.txt", "OFL-YoungSerif.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Young Serif";src:url(fonts/YoungSerif-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.02em}h1{font-size:clamp(2.7rem,7vw,6rem);line-height:1.02}h2{font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.06}h3{font-size:1.3rem}
h1 em,h2 em{color:var(--accent);font-style:italic}.eyebrow{color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px);background:radial-gradient(ellipse 50% 60% at 80% 40%,rgba(127,214,194,.35),transparent 70%)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(10,90,100,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.ba{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(18px,4vw,56px);align-items:center}.ba .view{position:relative;aspect-ratio:1;border-radius:28px;overflow:hidden;background:linear-gradient(160deg,#EAF8F6,#C9ECE7);--p:50%;touch-action:pan-y}
.ba .view img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:8%}.ba .before{clip-path:inset(0 calc(100% - var(--p)) 0 0);filter:sepia(.85) saturate(1.5) brightness(.9) hue-rotate(-12deg)}
.ba .line{position:absolute;top:0;bottom:0;left:var(--p);width:3px;margin-left:-1.5px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.08)}.ba .line:after{content:"\\2194";position:absolute;top:50%;left:50%;width:42px;height:42px;margin:-21px;border-radius:50%;background:#fff;color:var(--accent);display:grid;place-items:center;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.ba .view input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:ew-resize;margin:0}.ba .lab{position:absolute;bottom:14px;font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;background:rgba(255,255,255,.92);padding:.3rem .65rem;border-radius:99px;color:var(--ink)}.ba .l1{left:14px}.ba .l2{right:14px}
.ba ul{list-style:none;margin:1.4rem 0 0;padding:0;display:grid;gap:.7rem}.ba li{display:flex;gap:.7rem;align-items:flex-start;color:var(--muted)}.ba li:before{content:"";flex:none;width:.9rem;height:.9rem;margin-top:.35rem;border-radius:50%;background:var(--accent2)}.ba .nt{font-size:.8rem;color:var(--muted);margin-top:1rem}
@media(max-width:820px){.ba{grid-template-columns:minmax(0,1fr)}}
.tg4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.tg4 a{display:grid;gap:.6rem;text-decoration:none;color:inherit;border-radius:22px;padding:1.1rem;background:var(--surface);border:1px solid var(--line);transition:transform .35s var(--ease),box-shadow .35s}.tg4 a:hover{transform:translateY(-6px);box-shadow:0 20px 40px -22px rgba(10,90,100,.45)}.tg4 img{width:100%;aspect-ratio:1;object-fit:contain}.tg4 p{margin:0;color:var(--muted);font-size:.92rem}
@media(max-width:1000px){.tg4{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.tg4{grid-template-columns:minmax(0,1fr)}}
.st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.st div{background:var(--surface);border-radius:22px;padding:1.4rem;border:1px solid var(--line)}.st .n{font:400 2.6rem/1 var(--display);color:var(--accent)}.st p{margin:.4rem 0 0;color:var(--muted)}@media(max-width:760px){.st{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  [].slice.call(document.querySelectorAll(".ba .view")).forEach(function (v) { var i = v.querySelector("input"); function u() { v.style.setProperty("--p", i.value + "%"); } i.addEventListener("input", u); u(); });
})();
`;
module.exports = R.make({
  name: "smile", themeColor: "#F2FAF8", fonts: FONTS, preload: ["assets/fonts/YoungSerif-Regular.ttf"], js: JS,
  vars: { bg: "#F2FAF8", surface: "#FFFFFF", ink: "#0B2B33", muted: "#4B6A70", line: "rgba(11,43,51,.13)", accent: "#0E7C86", onaccent: "#FFFFFF", c1: "#0E7C86", c2: "#7FD6C2", c3: "#0B4F5C", rad: "16px", display: '"Young Serif",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(242,250,248,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const tg = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 360, h: 360, hint: B.hintOf(pack, c) })}<h3>${c.name}</h3><p>${c.blurb}</p></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><span class="n">${v}${s}</span><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "tooth", "tooth", "A healthy tooth you can turn", { c1: "#0E7C86", c2: "#7FD6C2", hint: "a healthy white tooth" })}</div></section>
<section class="sec"><div class="wrap"><div class="ba" data-reveal><div class="view"><div style="display:contents">${img("smile", "A bright, healthy smile after whitening", { w: 700, h: 700, hint: "a bright confident smile" })}${img("smile", "The same smile before whitening", { w: 700, h: 700, hint: "a dull stained smile" }).replace("<img", '<img class="before"')}</div><div class="line"></div><span class="lab l1">Before</span><span class="lab l2">After</span><input type="range" min="0" max="100" value="50" aria-label="Drag to compare before and after"></div><div><span class="eyebrow">Smile design</span><h2 style="margin-top:.8rem">See it <em>before</em> it happens</h2><p class="lead">Every whitening, bonding or aligner plan starts with a digital preview, so you know what to expect and can say yes only when you love it.</p><ul><li>A free smile preview with every consultation</li><li>Safe, enamel-friendly whitening</li><li>Clear aligners and bonding, planned with you</li></ul><p class="nt">Illustration for demonstration. Results vary from person to person.</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="tg4">${tg}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="st">${nums}</div></div></section>`;
  },
});
