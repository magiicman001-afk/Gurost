"use strict";
/**
 * smokehouse (restaurant, real 3D): charcoal black with drifting canvas embers, a huge turnable 3D serving cloche, a doneness slider
 * that changes the steak note and colour, and horizontal scroll-snap "from the fire" cards. Fonts: Gloock + Work Sans (SIL OFL).
 */
const R = require("./rest-kit");
const FONTS = [["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400}h1{font-size:clamp(3.8rem,11vw,10rem);line-height:.88}h2{font-size:clamp(2.4rem,5.6vw,4.8rem);line-height:1}h3{font-size:1.6rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--c2)}
.hero{position:relative;overflow:hidden;min-height:min(100svh,920px);padding:clamp(110px,12vw,150px) 0 40px;background:radial-gradient(ellipse 70% 50% at 70% 100%,rgba(255,107,26,.28),transparent 70%),#0E0D0C}
.hero canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.hero .wrap{position:relative;display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:20px}.hero h1{margin:1rem 0 1.4rem;text-shadow:0 4px 40px rgba(0,0,0,.6)}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}
.hero .gl3d{width:min(100%,620px);margin-left:auto;filter:drop-shadow(0 0 50px rgba(255,107,26,.35))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}.hero .gl3d{width:min(86%,420px);margin:0 auto}}
.done{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:clamp(20px,3.4vw,46px);display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(20px,4vw,60px);align-items:center}
.done h2{margin:.8rem 0 1rem}.slab{height:150px;border-radius:12px;position:relative;overflow:hidden;background:linear-gradient(90deg,#2a1713,#3b1d17);border:1px solid var(--line)}.slab i{position:absolute;inset:0;background:var(--dc,#B13A2C);transition:background .5s,clip-path .5s;clip-path:inset(30% 6% 30% 6% round 40px)}
.done input[type=range]{width:100%;margin:1.4rem 0 .6rem;accent-color:var(--accent)}.done .st{display:flex;justify-content:space-between;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.done .nt{min-height:3.2em;margin:.8rem 0 0;color:var(--ink)}.done .nt b{color:var(--c2)}
@media(max-width:820px){.done{grid-template-columns:1fr}}
.snap{display:flex;gap:clamp(12px,2vw,22px);overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:1rem;margin-inline:calc(var(--gut) * -1);padding-inline:var(--gut);scrollbar-width:thin}
.fc{flex:0 0 min(78vw,360px);scroll-snap-align:start;background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:grid}.fc .ph{aspect-ratio:4/3;overflow:hidden}.fc .ph img{width:100%;height:100%;object-fit:cover}.fc div.tx{padding:1.2rem;display:grid;gap:.5rem}.fc .n{font:700 .8rem var(--sans);letter-spacing:.14em;color:var(--accent)}.fc p{margin:0;color:var(--muted);font-size:.95rem}.fc b{color:var(--c2)}
.sup{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.sup div{border-top:2px solid var(--accent);padding-top:1rem;color:var(--muted)}.sup b{display:block;font:3.2rem/1 var(--display);color:var(--ink);margin-bottom:.4rem}@media(max-width:760px){.sup{grid-template-columns:1fr}}
`;
const JS = `
(function () {
  var cv = document.querySelector(".hero canvas"); if (cv && cv.getContext && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var x = cv.getContext("2d"), P = [], W = 0, H = 0, on = true;
    function rs() { var r = cv.parentNode.getBoundingClientRect(); W = cv.width = Math.round(r.width / 2); H = cv.height = Math.round(r.height / 2); }
    rs(); window.addEventListener("resize", rs);
    for (var i = 0; i < 70; i++) P.push({ x: Math.random(), y: Math.random(), s: .3 + Math.random() * 1.4, v: .0006 + Math.random() * .002, ph: Math.random() * 6 });
    function f(t) { if (on) { x.clearRect(0, 0, W, H); P.forEach(function (p) { p.y -= p.v; p.x += Math.sin(t / 900 + p.ph) * .0004; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); } var a = .35 + .65 * Math.abs(Math.sin(t / 500 + p.ph)); x.fillStyle = "rgba(255," + (110 + Math.round(p.s * 50)) + ",40," + (a * .8).toFixed(2) + ")"; x.shadowColor = "rgba(255,120,30,.9)"; x.shadowBlur = 6; x.beginPath(); x.arc(p.x * W, p.y * H, p.s, 0, 6.3); x.fill(); }); } requestAnimationFrame(f); }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { on = e[0].isIntersecting; }).observe(cv); requestAnimationFrame(f);
  }
  var r = document.querySelector("[data-done]"); if (r) {
    var L = [["Blue", "#7A1F22", "Seared outside, cool and almost raw in the middle. For the brave."], ["Rare", "#A02A2C", "Red and tender, warm through. Pure beef flavour."], ["Medium rare", "#B13A2C", "Our chef's pick. Rosy, juicy and full of flavour."], ["Medium", "#B8654E", "Pink in the centre, a little firmer."], ["Well done", "#8A6A55", "Cooked through. We keep it moist with bone-marrow butter."]];
    var n = r.querySelector(".nt"), s = r.querySelector("input"), sl = r.querySelector(".slab");
    function u() { var d = L[+s.value]; sl.style.setProperty("--dc", d[1]); n.innerHTML = "<b>" + d[0] + ".</b> " + d[2]; }
    s.addEventListener("input", u); u();
  }
})();
`;
module.exports = R.make({
  name: "smokehouse", themeColor: "#0E0D0C", fonts: FONTS, preload: ["assets/fonts/Gloock-Regular.ttf"], js: JS,
  vars: { bg: "#0E0D0C", surface: "#181513", ink: "#F6EFE6", muted: "#B3A89C", line: "rgba(246,239,230,.14)", accent: "#FF6B1A", onaccent: "#170800", c2: "#FFC15A", c3: "#B13A2C", display: '"Gloock","Playfair Display",Georgia,serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(14,13,12,.9)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const fire = pack.cats.find((c) => c.id === "fire");
    const cards = pack.cats.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, art: i.art || c.art, cn: c.name }))).map((i, k) => `<article class="fc" data-reveal><div class="ph">${img(i.art, i.n, { w: 600, h: 450, hint: B.hintOf(pack, i) })}</div><div class="tx"><span class="n">${K.pad(k + 1)} &middot; ${i.cn}</span><h3>${i.n}</h3><p>${i.d}</p><b>${K.strip(i.meta)}</b></div></article>`).join("");
    return `<section class="hero"><canvas aria-hidden="true"></canvas><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "cloche", "cloche", "A silver serving cloche", { c1: "#FF6B1A", c2: "#FFC15A", hint: "a serving cloche" })}</div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${fire.name}</span><h2 style="margin-top:.8rem">What we <em>cook</em> best</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div></div><div class="wrap"><div class="snap">${cards}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="done" data-done data-reveal><div><span class="eyebrow">Steak, your way</span><h2>How do you <em>like it</em>?</h2><p class="lead">Slide to see how our ribeye is cooked. Tell us when you book and the grill does the rest.</p></div><div><div class="slab" aria-hidden="true"><i></i></div><input type="range" min="0" max="4" value="2" aria-label="How well done"><div class="st"><span>Blue</span><span>Rare</span><span>Medium</span><span>Well</span></div><p class="nt" aria-live="polite"></p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sup">${pack.sup.map((s, i) => `<div data-reveal data-delay="${i * 80}"><b>0${i + 1}</b>${s}</div>`).join("")}</div></div></section>`;
  },
});
