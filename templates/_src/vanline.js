"use strict";
/**
 * vanline (trades, real 3D): a bold local-coverage page. A turning 3D house, a live "open now" status from the visitor's clock, a
 * postcode checker that says whether we cover them, and a marquee of areas. Fonts: Arsenal SC + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["ArsenalSC-Regular.ttf", "ArsenalSC-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["ArsenalSC-OFL.txt", "OFL-ArsenalSC.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Arsenal SC";src:url(fonts/ArsenalSC-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.02em}h1{font-size:clamp(3.2rem,9.4vw,8.4rem);line-height:.9}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1}h3{font-size:1.6rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.top{position:fixed;top:0;left:0;right:0;z-index:70;background:var(--accent);color:var(--onaccent);font:700 .85rem var(--sans);text-align:center;padding:.5rem var(--gut);letter-spacing:.04em}.top a{color:inherit}
.site-header{top:2.15rem!important}.hero{padding:clamp(120px,12vw,160px) 0 clamp(30px,5vw,60px);background:linear-gradient(180deg,#0F1D33,#142A4A)}.hero .wrap{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:500px;justify-self:center;filter:drop-shadow(0 28px 34px rgba(0,0,0,.5))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.live{display:inline-flex;align-items:center;gap:.6rem;border:1px solid var(--line);border-radius:99px;padding:.4rem .9rem;font:700 .85rem var(--sans);margin-bottom:.4rem}.live i{width:.7rem;height:.7rem;border-radius:50%;background:#44D17A;box-shadow:0 0 0 0 rgba(68,209,122,.6);animation:pl 1.8s infinite}.live.off i{background:#F2B33D;animation:none}@keyframes pl{70%{box-shadow:0 0 0 .6rem rgba(68,209,122,0)}}
.mq{overflow:hidden;white-space:nowrap;background:var(--accent);color:var(--onaccent);padding:.9rem 0}.mq div{display:inline-flex;gap:2rem;animation:mq 30s linear infinite}.mq span{font:400 clamp(1.4rem,3vw,2.2rem) var(--display);text-transform:uppercase}.mq span::after{content:"\\2022";margin-left:2rem}@keyframes mq{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.mq div{animation:none}}
.pc{display:grid;grid-template-columns:1fr 1fr;gap:clamp(20px,5vw,80px);align-items:center}.pc form{display:flex;gap:.6rem;flex-wrap:wrap}.pc input{flex:1;min-width:12rem;font:700 1.2rem var(--sans);padding:.9rem 1rem;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);text-transform:uppercase}.pc .out{margin-top:1rem;min-height:3.2em;font-size:1.1rem}.pc .out b{color:var(--accent)}
@media(max-width:820px){.pc{grid-template-columns:1fr}}
.cv{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,1.8vw,20px)}.cv article{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1rem;display:grid;gap:.4rem}.cv img{width:100%;aspect-ratio:1;object-fit:contain}.cv p{margin:0;color:var(--muted);font-size:.92rem}@media(max-width:1000px){.cv{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.cv{grid-template-columns:1fr}}
.rv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.rv blockquote{margin:0;border-left:4px solid var(--accent);padding:.4rem 0 .4rem 1.2rem}.rv p{margin:0 0 .6rem;font-size:1.1rem}.rv cite{color:var(--muted);font-style:normal;font-size:.85rem}@media(max-width:820px){.rv{grid-template-columns:1fr}}
`;
const JS = `
(function () {
  var l = document.querySelector("[data-live]"); if (l) { var d = new Date(), h = d.getHours() + d.getMinutes() / 60, wd = d.getDay(), open = wd > 0 && wd < 6 ? h >= 7 && h < 19 : wd === 6 ? h >= 8 && h < 16 : false; l.className = "live" + (open ? "" : " off"); l.lastChild.textContent = open ? "Open now. Call and we pick up" : "Office closed. Emergency line open 24/7"; }
  var f = document.querySelector("[data-pc]"); if (f) { var ok = (f.getAttribute("data-ok") || "").split(","), o = f.parentNode.querySelector(".out"); f.addEventListener("submit", function (e) { e.preventDefault(); var raw = f.querySelector("input").value.trim().toUpperCase(), v = /\\s/.test(raw) ? raw.split(/\\s+/)[0] : (raw.length >= 6 ? raw.slice(0, -3) : raw); if (!v) { o.innerHTML = "Type the first part of your postcode."; return; } var m = v.match(/^[A-Z]{1,2}\\d{1,2}/); var area = m ? m[0] : v; var hit = ok.some(function (p) { return area.indexOf(p) === 0 && /\\d/.test(area.slice(p.length, p.length + 1)); }); o.innerHTML = hit ? "<b>Yes, we cover " + area + ".</b> Request a free quote below." : "<b>Not sure about " + area + " yet.</b> Call us and we will tell you straight away."; }); }
})();
`;
module.exports = R.make({
  name: "vanline", themeColor: "#0F1D33", fonts: FONTS, preload: ["assets/fonts/ArsenalSC-Regular.ttf"], js: JS,
  vars: { bg: "#0F1D33", surface: "#17284A", ink: "#F3F6FB", muted: "#A9B6CC", line: "rgba(243,246,251,.18)", accent: "#FFB81C", onaccent: "#14110A", c2: "#FFD36B", c3: "#FFB81C", display: '"Arsenal SC","Arial Narrow",system-ui,sans-serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(15,29,51,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const a = pack.areas.map((x) => `<span>${x}</span>`).join("");
    const cv = pack.cats.map((c) => `<article data-reveal>${img(c.art, c.name, { w: 360, h: 360, hint: B.hintOf(pack, c) })}<h3>${c.name}</h3><p>${c.blurb}</p></article>`).join("");
    const rv = pack.reviews.map((r) => `<blockquote data-reveal><p>&ldquo;${r.q}&rdquo;</p><cite>${r.by}</cite></blockquote>`).join("");
    return `<div class="top">24 hour emergency line: <a href="tel:${t("phone_href")}">${t("phone")}</a></div>
<section class="hero"><div class="wrap"><div><span class="live" data-live><i></i><span>Checking hours</span></span><span class="eyebrow" style="display:block;margin-top:.6rem">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "house", "house", "A house", { c1: "#FFB81C", c2: "#FFD36B", hint: "a house" })}</div></section>
<div class="mq" aria-hidden="true"><div>${a}${a}${a}${a}</div></div>
<section class="sec"><div class="wrap pc"><div data-reveal><span class="eyebrow">Do we cover you?</span><h2 style="margin:.8rem 0 1rem">Check your <em>postcode</em></h2><p class="lead">Enter the first part of your postcode, like M4 or SK3.</p></div><div data-reveal><form data-pc data-ok="M,SK,WA,BL,OL"><input type="text" inputmode="text" autocomplete="postal-code" placeholder="M4" aria-label="Postcode"><button class="btn btn-primary" type="submit"><span>Check</span></button></form><p class="out" aria-live="polite"></p></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="cv">${cv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="rv">${rv}</div></div></section>`;
  },
});
