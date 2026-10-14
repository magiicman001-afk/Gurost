"use strict";
/**
 * progress (tutoring, real 3D): a calm navy and gold look with a turnable 3D trophy and a "reach your grade" planner: set the current
 * and target grade (1 to 9) and the months to the exam, and an animated line chart plots an example path while the page works out the
 * hours a week it would take, then pre-fills the enquiry. Fonts: Crimson Pro + DM Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Bold.ttf", "CrimsonPro-Bold.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["DMMono-Regular.ttf", "DMMono-Regular.ttf"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"], ["DMMono-OFL.txt", "OFL-DMMono.txt"]];
const css = `
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"DM Mono";src:url(fonts/DMMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
:root{--mono:"DM Mono",ui-monospace,monospace}body{font-size:1.12rem}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.02em}h1{font-size:clamp(2.9rem,7.6vw,6.2rem);line-height:.98}h2{font-size:clamp(2.1rem,4.6vw,3.6rem);line-height:1.04}h3{font-size:1.35rem}
h1 em,h2 em{font-style:italic;font-weight:400;color:var(--accent)}.eyebrow{font-family:var(--mono);color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center;filter:drop-shadow(0 24px 30px rgba(0,0,0,.45))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.pg{border:1px solid var(--line);border-radius:24px;background:linear-gradient(180deg,#16234A,#101A38);padding:clamp(18px,3vw,38px)}.pg .ctl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,3vw,32px)}.pg label{display:grid;gap:.4rem;font:400 .8rem var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}.pg label b{font:700 2.4rem/1 var(--display);color:var(--ink);letter-spacing:-.02em;text-transform:none}.pg input[type=range]{width:100%;accent-color:var(--accent)}
.pg svg{width:100%;height:auto;margin-top:clamp(14px,3vw,28px);overflow:visible}.pg .gl{stroke:rgba(244,238,224,.14)}.pg .ax{fill:var(--muted);font:400 11px var(--mono)}.pg .ln{fill:none;stroke:var(--accent);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.pg .dt{fill:var(--bg);stroke:var(--accent);stroke-width:3}.pg .lbl{fill:var(--ink);font:700 14px var(--mono)}
.pg .sum{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:clamp(14px,3vw,26px);border-top:1px solid var(--line);padding-top:clamp(14px,3vw,26px)}.pg .sum p{margin:0;color:var(--muted);max-width:34em}.pg .sum b{color:var(--ink)}.pg .note{display:block;margin-top:.8rem;font-size:.8rem;color:var(--muted)}
@media(max-width:700px){.pg .ctl{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 2.8rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.95rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-pg]"); if (!c) return;
  var cu = c.querySelector("[data-cur]"), ta = c.querySelector("[data-tar]"), mo = c.querySelector("[data-mon]"), svg = c.querySelector("svg"), msg = c.querySelector("[data-msg]"), line = "", W = 600, H = 240, pl = 34, pr = 16, pt = 18, pb = 28, NS = "http://www.w3.org/2000/svg";
  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function draw() {
    var a = +cu.value, t = +ta.value, m = +mo.value; c.querySelector("[data-cv]").textContent = a; c.querySelector("[data-tv]").textContent = t; c.querySelector("[data-mv]").textContent = m;
    svg.innerHTML = ""; var X = function (i) { return pl + (W - pl - pr) * (m ? i / m : 0); }, Y = function (g) { return H - pb - (H - pt - pb) * (g - 1) / 8; };
    for (var g = 1; g <= 9; g += 2) { svg.appendChild(el("line", { x1: pl, x2: W - pr, y1: Y(g), y2: Y(g), class: "gl" })); var tx = el("text", { x: 4, y: Y(g) + 4, class: "ax" }); tx.textContent = g; svg.appendChild(tx); }
    var d = t - a, pts = []; for (var i = 0; i <= m; i++) { var f = m ? i / m : 1, gr = a + (d > 0 ? d * (1 - Math.pow(1 - f, 1.5)) : 0); pts.push([X(i), Y(gr), gr]); }
    var path = el("path", { d: "M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" L"), class: "ln" }); svg.appendChild(path);
    var len = path.getTotalLength ? path.getTotalLength() : 0; if (len) { path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect(); path.style.transition = "stroke-dashoffset .9s ease"; path.style.strokeDashoffset = 0; }
    [0, m].forEach(function (i) { var p = pts[i]; svg.appendChild(el("circle", { cx: p[0], cy: p[1], r: 6, class: "dt" })); var l = el("text", { x: p[0], y: p[1] - 12, "text-anchor": i ? "end" : "start", class: "lbl" }); l.textContent = "Grade " + Math.round(p[2] * 10) / 10; svg.appendChild(l); });
    for (var k = 0; k <= m; k += Math.max(1, Math.ceil(m / 6))) { var mt = el("text", { x: X(k), y: H - 6, "text-anchor": "middle", class: "ax" }); mt.textContent = k ? "m" + k : "now"; svg.appendChild(mt); }
    if (d <= 0) { msg.innerHTML = "You are already at your target. Aim a grade higher, or ask us about stretch work."; line = "I would like help aiming above grade " + t + "."; return; }
    var hrs = d * 14, wk = hrs / (m * 4.3), les = wk <= 1.5 ? "one lesson a week" : wk <= 3 ? "two lessons a week" : "two or three lessons a week";
    msg.innerHTML = "Going from <b>" + a + "</b> to <b>" + t + "</b> in <b>" + m + (m === 1 ? " month" : " months") + "</b> usually means about <b>" + (Math.round(wk * 10) / 10) + " hours a week</b>, including practice between lessons. That is " + les + (m < d * 1.2 ? ", and it is ambitious, so we would check it with you." : ".");
    line = "Grade plan: from " + a + " to " + t + " in " + m + " months. Subject: ";
  }
  [cu, ta, mo].forEach(function (x) { x.addEventListener("input", draw); }); draw();
  c.querySelector("[data-book]").addEventListener("click", function () { var t = document.querySelector("#order textarea"); if (t) t.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "progress", themeColor: "#101A38", fonts: FONTS, preload: ["assets/fonts/CrimsonPro-Bold.ttf"], js: JS,
  vars: { bg: "#101A38", surface: "#16234A", ink: "#F4EEE0", muted: "#A8B2D0", line: "rgba(244,238,224,.17)", accent: "#E9B949", onaccent: "#1A1204", c1: "#E9B949", c2: "#FFE08A", c3: "#101A38", rad: "14px", display: '"Crimson Pro",Georgia,serif', sans: '"Crimson Pro",Georgia,serif', header: "rgba(16,26,56,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>From <em>where you are</em> to where you want to be.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#plan"><span>Plan my grade</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "trophy", "trophy", "A trophy you can turn", { c1: "#E9B949", c2: "#FFE08A", c3: "#101A38", hint: "a winner's trophy" })}</div></section>
<section class="sec" id="plan" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Grade planner</span><h2 style="margin-top:.8rem">How do we get <em>there from here</em>?</h2></div></div><div class="pg" data-pg data-reveal><div class="ctl"><label>Grade now<b data-cv></b><input type="range" data-cur min="1" max="9" value="4" aria-label="Current grade"></label><label>Grade wanted<b data-tv></b><input type="range" data-tar min="1" max="9" value="7" aria-label="Target grade"></label><label>Months to the exam<b data-mv></b><input type="range" data-mon min="1" max="12" value="8" aria-label="Months to the exam"></label></div><svg viewBox="0 0 600 240" role="img" aria-label="An example path from the current grade to the target grade"></svg><div class="sum"><p data-msg></p><button type="button" class="btn btn-primary" data-book><span>Ask for this plan</span></button></div><span class="note">A guide, not a promise. Real progress depends on the student, and we review it with you every six weeks.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
