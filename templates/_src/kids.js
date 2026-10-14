"use strict";
/**
 * kids (clinic, real 3D): a bright, playful family layout. A turnable 3D tooth beside a two-minute brushing timer that walks a
 * child round the four quarters of the mouth, plus fun facts. Fonts: Outfit + Bricolage Grotesque (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["Outfit-OFL.txt", "OFL-Outfit.txt"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"]];
const css = `
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.8rem,7.6vw,6.4rem);line-height:.98}h2{font-size:clamp(2rem,4.4vw,3.6rem);line-height:1.02}h3{font-size:1.3rem}
h1 em,h2 em{font-style:normal;color:var(--accent);background:linear-gradient(transparent 62%,var(--c2) 62%)}.eyebrow{color:var(--accent);letter-spacing:.1em;font-weight:700}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px);position:relative;overflow:hidden}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center;position:relative;z-index:1}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(20,80,160,.28))}
.bub{position:absolute;border-radius:50%;background:rgba(255,255,255,.7);border:2px solid rgba(255,255,255,.95);animation:bub 9s ease-in-out infinite}.bub:nth-child(1){width:70px;height:70px;left:6%;top:30%}.bub:nth-child(2){width:36px;height:36px;left:46%;top:18%;animation-delay:-3s}.bub:nth-child(3){width:96px;height:96px;right:5%;top:56%;animation-delay:-6s}
@keyframes bub{0%,100%{transform:translateY(0)}50%{transform:translateY(-26px)}}@media(prefers-reduced-motion:reduce){.bub{animation:none}}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.tm{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(18px,4vw,56px);align-items:center;background:var(--surface);border-radius:32px;padding:clamp(20px,4vw,52px);border:3px solid var(--ink);box-shadow:8px 8px 0 var(--ink)}.tm .ring{position:relative;max-width:300px;margin:auto;width:100%}.tm svg{width:100%;height:auto;transform:rotate(-90deg)}.tm .bg{stroke:#DCEBFA}.tm .fg{stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset .25s linear}.tm .tx{position:absolute;inset:0;display:grid;place-items:center;text-align:center;font:700 clamp(2.4rem,8vw,3.4rem)/1 var(--display);color:var(--ink)}.tm .tx small{display:block;font:400 .85rem var(--sans);color:var(--muted);margin-top:.3rem}
.tm .quad{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;margin:1rem 0}.tm .quad div{border:2px solid var(--ink);border-radius:16px;padding:.8rem;font:700 .95rem var(--display);background:#fff;transition:background .25s,transform .25s}.tm .quad div.on{background:var(--c2);transform:scale(1.04)}.tm .msg{font:700 1.2rem var(--display);min-height:1.6em;color:var(--accent)}
.tm .row{display:flex;gap:.7rem;flex-wrap:wrap}@media(max-width:820px){.tm{grid-template-columns:minmax(0,1fr)}}
.fc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.fc div{border:2px solid var(--ink);border-radius:24px;padding:1.3rem;background:var(--surface)}.fc div:nth-child(2){background:var(--c2)}.fc img{width:84px;height:84px;object-fit:contain}.fc p{margin:.4rem 0 0}@media(max-width:820px){.fc{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:100px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--ink);border-radius:22px;background:var(--surface);padding:1rem}.sv img{width:100px;height:100px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var t = document.querySelector("[data-timer]"); if (!t) return;
  var TOT = 120, left = TOT, id = null, fg = t.querySelector(".fg"), tx = t.querySelector(".tx b"), msg = t.querySelector(".msg"), qs = [].slice.call(t.querySelectorAll(".quad div")), go = t.querySelector("[data-go]"), C = 2 * Math.PI * 54;
  var M = ["Brush the top left", "Now the top right", "Bottom right next", "Last: the bottom left"];
  fg.style.strokeDasharray = C;
  function draw() { var d = TOT - left, k = Math.min(3, Math.floor(d / 30)); fg.style.strokeDashoffset = C * (1 - d / TOT); tx.textContent = Math.floor(left / 60) + ":" + ("0" + (left % 60)).slice(-2); qs.forEach(function (q, i) { q.classList.toggle("on", !!id && i === k); }); msg.textContent = left === 0 ? "Sparkling! Great job, superstar." : (id ? M[k] : "Ready when you are"); }
  function stop() { clearInterval(id); id = null; go.querySelector("span").textContent = left === 0 || left === TOT ? "Start brushing" : "Keep going"; }
  go.addEventListener("click", function () { if (id) { stop(); draw(); return; } if (left === 0) left = TOT; go.querySelector("span").textContent = "Pause"; id = setInterval(function () { left--; if (left <= 0) { left = 0; stop(); } draw(); }, 1000); draw(); });
  t.querySelector("[data-reset]").addEventListener("click", function () { stop(); left = TOT; go.querySelector("span").textContent = "Start brushing"; draw(); });
  draw();
})();
`;
module.exports = R.make({
  name: "kids", themeColor: "#E8F4FF", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#E8F4FF", surface: "#FFFFFF", ink: "#12264A", muted: "#4D6285", line: "rgba(18,38,74,.2)", accent: "#1F6FEB", onaccent: "#FFFFFF", c1: "#1F6FEB", c2: "#FFD84D", c3: "#FF7A59", rad: "20px", display: '"Bricolage Grotesque","Outfit",system-ui,sans-serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(232,244,255,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.slice(0, 2).map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const facts = [["tooth", "Tooth fairy facts", "Baby teeth start to wiggle around age six. Twenty fall out and make room for grown-up teeth."], ["brush", "Two minutes, twice a day", "That is all it takes. Brush the fronts, backs and tops, and spit but do not rinse."], ["smile", "Smiles are catching", "Smiling at someone makes them smile back. Try it on your dentist."]]
      .map(([a, h, p]) => `<div data-reveal>${img(a, h, { w: 160, h: 160, hint: "a friendly cartoon " + a })}<h3>${h}</h3><p>${p}</p></div>`).join("");
    return `<section class="hero"><span class="bub"></span><span class="bub"></span><span class="bub"></span><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Big smiles for <em>little teeth</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="#brush"><span>Try the brushing timer</span></a></div></div>${model3d(pack, "tooth", "tooth", "A happy tooth you can turn", { c1: "#1F6FEB", c2: "#FFD84D", hint: "a happy white tooth" })}</div></section>
<section class="sec" id="brush" style="padding-top:0"><div class="wrap"><div class="tm" data-timer data-reveal><div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="54" fill="none" stroke-width="10"/><circle class="fg" cx="60" cy="60" r="54" fill="none" stroke-width="10"/></svg><div class="tx"><div><b>2:00</b><small>minutes left</small></div></div></div><div><span class="eyebrow">Brushing timer</span><h2 style="margin-top:.8rem">Brush for <em>two minutes</em></h2><div class="quad"><div>Top left</div><div>Top right</div><div>Bottom left</div><div>Bottom right</div></div><p class="msg" aria-live="polite">Ready when you are</p><div class="row"><button type="button" class="btn btn-primary" data-go><span>Start brushing</span></button><button type="button" class="btn" data-reset><span>Reset</span></button></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="fc">${facts}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
