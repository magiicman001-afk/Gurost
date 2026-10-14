"use strict";
/**
 * quickfire (tutoring, real 3D): a bright purple and yellow look with a turnable 3D graduation cap and a playable 30 second times-tables
 * game (three levels, a draining timer bar, score and accuracy) that ends with a plain suggestion and a pre-filled enquiry.
 * Fonts: Pixelify Sans + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["PixelifySans-Medium.ttf", "PixelifySans-Medium.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["PixelifySans-OFL.txt", "OFL-PixelifySans.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Pixelify Sans";src:url(fonts/PixelifySans-Medium.ttf) format("truetype");font-weight:400 700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:0}h1{font-size:clamp(2.8rem,7.6vw,6rem);line-height:1}h2{font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.05}h3{font-size:1.3rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--display);color:var(--accent);letter-spacing:.12em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(0,0,0,.4))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.qf{border:3px solid var(--accent);border-radius:24px;background:#2A1F6B;padding:clamp(18px,3vw,38px);box-shadow:0 0 0 6px #1A1248,0 20px 40px rgba(0,0,0,.4);text-align:center}.qf .lv{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}.qf .lv button{font:500 1rem var(--display);border:2px solid var(--accent);border-radius:10px;background:transparent;color:var(--ink);padding:.55rem 1.1rem;cursor:pointer}.qf .lv button[aria-pressed=true]{background:var(--accent);color:#2A1D00}
.qf .tm{height:12px;border-radius:99px;background:#1A1248;overflow:hidden;margin:1.4rem auto;max-width:520px}.qf .tm i{display:block;height:100%;width:100%;background:var(--accent);transition:width .1s linear}.qf .q{font:500 clamp(3.4rem,13vw,6.6rem)/1 var(--display);margin:.4rem 0;min-height:1.1em}.qf form{display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap}.qf input{width:min(220px,60vw);font:500 2rem var(--display);text-align:center;color:#2A1D00;background:#FFF3C4;border:3px solid var(--accent);border-radius:14px;padding:.5rem}.qf .stats{display:flex;gap:2rem;justify-content:center;margin:1.2rem 0 0;color:var(--muted)}.qf .stats b{display:block;font:500 2rem var(--display);color:var(--ink)}
.qf .res{display:none;margin-top:1.4rem;border-top:2px dashed rgba(255,255,255,.25);padding-top:1.2rem}.qf .res.on{display:block}.qf .res p{margin:.3rem auto;max-width:34em;color:var(--muted)}.qf .res b{color:var(--accent)}.qf .res .btn{margin-top:.8rem}.qf .note{display:block;margin-top:1rem;font-size:.78rem;color:var(--muted)}.qf .go{font-size:1.1rem}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:500 2.8rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-qf]"); if (!c) return;
  var T = [[2, 5, 10], [3, 4, 6], [7, 8, 9, 12]], NM = ["Easy", "Medium", "Hard"], lv = 0, run = false, left = 30, tick = 0, score = 0, asked = 0, a = 0, b = 0;
  var lb = [].slice.call(c.querySelectorAll(".lv button")), q = c.querySelector(".q"), inp = c.querySelector("input"), bar = c.querySelector(".tm i"), sc = c.querySelector("[data-score]"), tl = c.querySelector("[data-time]"), res = c.querySelector(".res"), go = c.querySelector(".go"), form = c.querySelector("form"), line = "";
  function next() { var s = T[lv]; a = s[Math.floor(Math.random() * s.length)]; b = 2 + Math.floor(Math.random() * 11); q.textContent = a + " x " + b; inp.value = ""; }
  function end() {
    run = false; clearInterval(tick); inp.disabled = true; go.textContent = "Play again"; var acc = asked ? Math.round(score / asked * 100) : 0;
    res.className = "res on"; res.querySelector("[data-r]").textContent = "You got " + score + " right out of " + asked + " (" + acc + "%).";
    res.querySelector("[data-s]").textContent = score >= 20 ? "Brilliant speed. Try the next level, or a stretch session." : score >= 10 ? "Solid. A weekly tutor can turn good into quick and confident." : "A good start. We build a confident base first, then speed.";
    line = "Quick-fire result: " + NM[lv] + " level, " + score + " right out of " + asked + ". I would like a free maths lesson.";
  }
  function start() { run = true; left = 30; score = 0; asked = 0; inp.disabled = false; res.className = "res"; go.textContent = "Go"; sc.textContent = "0"; next(); inp.focus({ preventScroll: true }); clearInterval(tick); tick = setInterval(function () { left -= .1; bar.style.width = Math.max(0, left / 30 * 100) + "%"; tl.textContent = Math.max(0, Math.ceil(left)); if (left <= 0) end(); }, 100); }
  lb.forEach(function (x, i) { x.addEventListener("click", function () { lv = i; lb.forEach(function (y) { y.setAttribute("aria-pressed", y === x ? "true" : "false"); }); if (run) start(); }); });
  form.addEventListener("submit", function (e) { e.preventDefault(); if (!run) { start(); return; } if (inp.value === "") return; asked++; if (+inp.value === a * b) { score++; sc.textContent = score; } next(); });
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line || "I would like a free maths lesson."; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "quickfire", themeColor: "#20165A", fonts: FONTS, preload: ["assets/fonts/PixelifySans-Medium.ttf"], js: JS,
  vars: { bg: "#20165A", surface: "#2A1F6B", ink: "#FFFFFF", muted: "#C5BDF0", line: "rgba(255,255,255,.22)", accent: "#FFD23F", onaccent: "#2A1D00", c1: "#7C5CFF", c2: "#FFD23F", c3: "#20165A", rad: "14px", display: '"Pixelify Sans",ui-monospace,monospace', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(32,22,90,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const lv = ["Easy", "Medium", "Hard"].map((l, i) => `<button type="button" aria-pressed="${i === 0}">${l}</button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Learning is <em>a game</em> worth winning.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#play"><span>Play 30 seconds</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "gradcap", "trophy", "A graduation cap you can turn", { c1: "#7C5CFF", c2: "#FFD23F", c3: "#20165A", hint: "a graduation cap" })}</div></section>
<section class="sec" id="play" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Quick-fire</span><h2 style="margin-top:.8rem">How fast are <em>your times tables</em>?</h2></div></div><div class="qf" data-qf data-reveal><div class="lv">${lv}</div><div class="tm"><i></i></div><div class="q">Ready?</div><form><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Your answer" disabled><button type="submit" class="btn btn-primary go"><span>Start</span></button></form><div class="stats"><div><b data-score>0</b>right</div><div><b data-time>30</b>seconds</div></div><div class="res"><p><b data-r></b></p><p data-s></p><button type="button" class="btn btn-primary" data-book><span>Book a free maths lesson</span></button></div><span class="note">Just for fun. It is not a test, and nothing is saved.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
