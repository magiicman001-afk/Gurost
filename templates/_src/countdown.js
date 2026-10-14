"use strict";
/**
 * countdown (tutoring, real 3D): a warm cream and red look with a turnable 3D stopwatch and an "exam countdown": choose the exam date
 * and see the days and weeks left, a strip of weeks split into learn, practise and polish phases, what to do in each, and the lessons a
 * week that suit each phase, then pre-fill the enquiry. Fonts: Tektur + Lora (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Tektur-Medium.ttf", "Tektur-Medium.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Bold.ttf", "Lora-Bold.ttf"], ["Tektur-OFL.txt", "OFL-Tektur.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"Tektur";src:url(fonts/Tektur-Medium.ttf) format("truetype");font-weight:400 700;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:500;letter-spacing:-.02em}h1{font-size:clamp(2.6rem,6.6vw,5.4rem);line-height:1.02}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.08}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--display);color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(120,40,20,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.cd{border:2px solid var(--ink);border-radius:20px;background:#FFFDF6;padding:clamp(18px,3vw,36px);box-shadow:8px 8px 0 var(--accent)}.cd .top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:clamp(14px,3vw,36px);align-items:end}.cd label{display:grid;gap:.45rem;font:500 .8rem var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.cd input[type=date]{width:100%;max-width:100%;min-width:0;font:700 1.1rem var(--sans);color:var(--ink);background:#fff;border:2px solid var(--ink);border-radius:12px;padding:.8rem 1rem}
.cd .big{display:flex;gap:clamp(1rem,3vw,2.4rem);flex-wrap:wrap}.cd .big div{font:500 .8rem var(--display);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.cd .big b{display:block;font:500 clamp(3rem,9vw,5.4rem)/1 var(--display);color:var(--accent);letter-spacing:-.03em;text-transform:none}
.wks{display:grid;grid-template-columns:repeat(auto-fill,minmax(14px,1fr));gap:4px;margin:clamp(16px,3vw,28px) 0 .6rem}.wks i{aspect-ratio:1;border-radius:4px;background:#2F8F6A}.wks i.p{background:#E8A21A}.wks i.f{background:var(--accent)}
.ph{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,20px)}.ph div{border:2px solid var(--ink);border-radius:14px;padding:1rem;background:#fff}.ph div.on{box-shadow:5px 5px 0 var(--ink)}.ph small{display:block;font:500 .72rem var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.ph b{display:block;font:500 1.4rem var(--display);margin:.2rem 0}.ph p{margin:.3rem 0 0;color:var(--muted);font-size:.95rem}.ph .dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:.4rem;background:#2F8F6A}
.cd .foot{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:clamp(14px,3vw,26px)}.cd .foot p{margin:0;color:var(--muted);max-width:34em}.cd .note{display:block;margin-top:.8rem;font-size:.78rem;color:var(--muted)}
@media(max-width:760px){.cd .top,.ph{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:500 2.6rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--ink);border-radius:16px;background:#FFFDF6;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-cd]"); if (!c) return;
  var di = c.querySelector("input"), dd = c.querySelector("[data-d]"), ww = c.querySelector("[data-w]"), strip = c.querySelector(".wks"), ph = [].slice.call(c.querySelectorAll(".ph div")), msg = c.querySelector("[data-msg]"), line = "", now = new Date(); now.setHours(0, 0, 0, 0);
  var y = now.getFullYear(), d0 = new Date(y, 4, 13); if (d0 < now) d0 = new Date(y + 1, 4, 13); di.value = d0.getFullYear() + "-" + ("0" + (d0.getMonth() + 1)).slice(-2) + "-" + ("0" + d0.getDate()).slice(-2);
  function upd() {
    var p = di.value.split("-"), e = new Date(+p[0], +p[1] - 1, +p[2]); if (isNaN(e)) return; var days = Math.round((e - now) / 86400000), wk = Math.max(0, Math.ceil(days / 7));
    dd.textContent = Math.max(0, days); ww.textContent = wk; strip.innerHTML = "";
    var nL = Math.round(wk * .6), nP = Math.round(wk * .3); for (var i = 0; i < Math.min(wk, 78); i++) { var s = document.createElement("i"); s.className = i < nL ? "" : i < nL + nP ? "p" : "f"; strip.appendChild(s); }
    var cur = wk <= 0 ? -1 : 0; ph[0].className = cur === 0 ? "on" : ""; ph[1].className = ""; ph[2].className = "";
    ph[0].querySelector("[data-n]").textContent = nL + (nL === 1 ? " week" : " weeks"); ph[1].querySelector("[data-n]").textContent = nP + (nP === 1 ? " week" : " weeks"); ph[2].querySelector("[data-n]").textContent = Math.max(0, wk - nL - nP) + " weeks";
    msg.textContent = days < 0 ? "That date has passed. Pick the next exam." : days < 14 ? "Crunch time. Two short sessions a week on past papers and weak spots, plus rest." : days < 60 ? "Plenty to do, but a clear plan will get you there. Start practising papers now." : "Lots of time. A steady weekly lesson now beats a panic later.";
    line = "Exam countdown: exam on " + e.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) + ", " + wk + " weeks left. Subject and level: ";
  }
  di.addEventListener("input", upd); upd();
  c.querySelector("[data-book]").addEventListener("click", function () { var t = document.querySelector("#order textarea"); if (t) t.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "countdown", themeColor: "#FFF3E0", fonts: FONTS, preload: ["assets/fonts/Tektur-Medium.ttf"], js: JS,
  vars: { bg: "#FFF3E0", surface: "#FFFDF6", ink: "#2A1A14", muted: "#6F5D52", line: "rgba(42,26,20,.2)", accent: "#D63A2F", onaccent: "#FFFFFF", c1: "#D63A2F", c2: "#FFC15E", c3: "#2A1A14", rad: "12px", display: '"Tektur",system-ui,sans-serif', sans: '"Lora",Georgia,serif', header: "rgba(255,243,224,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>The exam is <em>coming</em>. So is your plan.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#clock"><span>Start my countdown</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "stopwatch", "trophy", "A stopwatch you can turn", { c1: "#D63A2F", c2: "#FFC15E", c3: "#2A1A14", hint: "a stopwatch" })}</div></section>
<section class="sec" id="clock" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Exam countdown</span><h2 style="margin-top:.8rem">How long <em>have we got</em>?</h2></div></div><div class="cd" data-cd data-reveal><div class="top"><label>Exam date<input type="date" aria-label="Exam date"></label><div class="big"><div><b data-d>0</b>days left</div><div><b data-w>0</b>weeks</div></div></div><div class="wks" aria-hidden="true"></div><div class="ph"><div><small><span class="dot"></span>Learn</small><b data-n></b><p>Cover every topic. One lesson a week and short daily practice.</p></div><div><small><span class="dot" style="background:#E8A21A"></span>Practise</small><b data-n></b><p>Timed questions and past papers. Two lessons a week.</p></div><div><small><span class="dot" style="background:#D63A2F"></span>Polish</small><b data-n></b><p>Weak spots, exam technique and calm. Short, sharp sessions.</p></div></div><div class="foot"><p data-msg></p><button type="button" class="btn btn-primary" data-book><span>Plan my countdown</span></button></div><span class="note">An example plan. Exam dates are set by the exam board, so check yours.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
