"use strict";
/**
 * status (tech agency and SaaS, real 3D): a calm white and green status-page look with a turnable 3D signal tower and a live "system
 * status" board: five services with 90-day uptime bars (tap a bar for the day), a ticking response-time reading, an overall banner and
 * an uptime calculator that turns 99.5, 99.9, 99.95 and 99.99 percent into minutes of downtime a month and a year, to explain what a
 * support guarantee really means. Pre-fills the call request. Fonts: Red Hat Mono + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["RedHatMono-Regular.ttf", "RedHatMono-Regular.ttf"], ["RedHatMono-Bold.ttf", "RedHatMono-Bold.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["RedHatMono-OFL.txt", "OFL-RedHatMono.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Red Hat Mono";src:url(fonts/RedHatMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Red Hat Mono";src:url(fonts/RedHatMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1}h2{font-size:clamp(1.9rem,4.2vw,3.1rem);line-height:1.06}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--mono);color:var(--accent);letter-spacing:.08em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:340px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.st{border:1px solid var(--line);border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 16px 40px rgba(16,90,60,.1)}.st .ban{display:flex;gap:.8rem;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#E8F8EF;border-bottom:1px solid #BFE8D0;padding:1rem clamp(16px,3vw,28px);color:#0B5A36;font-weight:700}.st .ban i{display:inline-block;width:12px;height:12px;border-radius:50%;background:#16A34A;margin-right:.6rem;box-shadow:0 0 0 0 rgba(22,163,74,.6);animation:pu 2s infinite}@keyframes pu{70%{box-shadow:0 0 0 10px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}.st .ban span{font:400 .86rem var(--mono)}
.st .svc{padding:1rem clamp(16px,3vw,28px);border-bottom:1px solid var(--line);display:grid;gap:.5rem}.st .svc .h{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-weight:700}.st .svc .h span{font:400 .82rem var(--mono);color:var(--muted)}.st .bars{display:flex;gap:2px;height:30px}.st .bars button{flex:1 1 0;min-width:0;border:0;padding:0;background:#16A34A;border-radius:2px;cursor:pointer}.st .bars button.w{background:#F59E0B}.st .bars button.d{background:#DC2626}.st .bars button:focus-visible,.st .bars button:hover{outline:2px solid var(--ink);outline-offset:1px}.st .tip{min-height:1.3rem;font:400 .8rem var(--mono);color:var(--muted)}
.st .calc{padding:clamp(16px,3vw,28px);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(14px,3vw,34px);align-items:center;background:#FAFCFB}.st .calc .lb{font:700 .74rem var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted);display:grid;gap:.5rem}.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:700 .88rem var(--mono);border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:8px;padding:.55rem .85rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}
.st .calc>div:last-child{display:grid;gap:.4rem;justify-items:start}.st .big{font:700 clamp(2rem,6vw,3.2rem)/1 var(--mono);color:var(--accent)}.st .big small{display:block;font:400 .78rem var(--sans);color:var(--muted);margin-top:.3rem}.st .btn{margin-top:.8rem}.st .note{display:block;padding:0 clamp(16px,3vw,28px) 1rem;font-size:.76rem;color:var(--muted);background:#FAFCFB}
@media(max-width:760px){.st .calc{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:14px;background:#fff;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-status]"); if (!c) return;
  var S = JSON.parse(c.getAttribute("data-status")), line = "", seed = 7;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  var today = new Date();
  function dayLabel(i) { var d = new Date(today.getTime() - (89 - i) * 86400000); return d.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()]; }
  var svcs = [].slice.call(c.querySelectorAll(".svc"));
  svcs.forEach(function (el, k) {
    var bars = el.querySelector(".bars"), tip = el.querySelector(".tip"), html = "", down = 0, st = S.svc[k];
    for (var i = 0; i < 90; i++) { var r = rnd(), cls = r > .985 ? "d" : r > .955 ? "w" : "", m = cls === "d" ? 28 + Math.round(rnd() * 60) : cls === "w" ? 4 + Math.round(rnd() * 14) : 0; down += m; html += '<button type="button" class="' + cls + '" data-i="' + i + '" data-m="' + m + '" aria-label="' + dayLabel(i) + ': ' + (m ? m + ' minutes of issues' : 'no issues') + '"></button>'; }
    bars.innerHTML = html; el.querySelector("[data-up]").textContent = (100 - down / (90 * 1440) * 100).toFixed(2) + "% uptime";
    [].forEach.call(bars.children, function (b) { function show() { var m = +b.getAttribute("data-m"); tip.textContent = dayLabel(+b.getAttribute("data-i")) + ": " + (m ? m + " minutes of issues" : "no issues"); } b.addEventListener("mouseenter", show); b.addEventListener("focus", show); b.addEventListener("click", show); });
    tip.textContent = "Tap a bar to see the day.";
  });
  var ms = [].slice.call(c.querySelectorAll("[data-ms]")), base = S.svc.map(function (s) { return s.ms; });
  setInterval(function () { ms.forEach(function (e, i) { e.textContent = Math.round(base[i] + (Math.random() - .5) * base[i] * .2) + " ms"; }); c.querySelector("[data-now]").textContent = "Checked " + new Date().toLocaleTimeString("en-GB"); }, 2000);
  c.querySelector("[data-now]").textContent = "Checked " + new Date().toLocaleTimeString("en-GB");
  var bs = [].slice.call(c.querySelectorAll(".calc .opt button"));
  function calc(i) { var u = S.sla[i], mo = (100 - u) / 100 * 43200, yr = (100 - u) / 100 * 525600; function f(m) { return m >= 120 ? (m / 60).toFixed(1) + " hours" : m >= 1 ? Math.round(m) + " minutes" : Math.round(m * 60) + " seconds"; } c.querySelector("[data-mo]").textContent = f(mo); c.querySelector("[data-yr]").textContent = "about " + f(yr) + " a year"; line = "Uptime guarantee: " + u + "% (about " + f(mo) + " of downtime a month). About my project: "; bs.forEach(function (b, j) { b.setAttribute("aria-pressed", j === i ? "true" : "false"); }); }
  bs.forEach(function (b, i) { b.addEventListener("click", function () { calc(i); }); }); calc(1);
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const S = { svc: [{ n: "Website and shop", ms: 180 }, { n: "Customer app API", ms: 95 }, { n: "Admin dashboard", ms: 140 }, { n: "Payments", ms: 320 }, { n: "Email delivery", ms: 210 }], sla: [99.5, 99.9, 99.95, 99.99] };
module.exports = R.make({
  name: "status", themeColor: "#FFFFFF", fonts: FONTS, preload: ["assets/fonts/WorkSans-Bold.ttf"], js: JS,
  vars: { bg: "#F5FAF7", surface: "#FFFFFF", ink: "#10241A", muted: "#587064", line: "#DCE9E1", accent: "#0F8A55", onaccent: "#FFFFFF", c1: "#16A34A", c2: "#FDE047", c3: "#10241A", rad: "10px", display: '"Work Sans",system-ui,sans-serif', sans: '"Work Sans",system-ui,sans-serif', mono: '"Red Hat Mono",ui-monospace,monospace', header: "rgba(245,250,247,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const rows = S.svc.map((s) => `<div class="svc"><div class="h">${s.n}<span><span data-up></span> &middot; <span data-ms>${s.ms} ms</span></span></div><div class="bars"></div><div class="tip"></div></div>`).join("");
    const so = S.sla.map((u, i) => `<button type="button" aria-pressed="${i === 1}">${u}%</button>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Always on. <em>Prove it.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#status"><span>See live status</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "tower", "cloud", "A signal tower you can turn", { c1: "#16A34A", c2: "#FDE047", c3: "#10241A", hint: "a signal tower" })}</div></section>
<section class="sec" id="status" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">System status</span><h2 style="margin-top:.8rem">What we run, <em>and how it behaves</em></h2></div></div><div class="st" data-status='${JSON.stringify(S)}' data-reveal><div class="ban"><div><i></i>All systems operational</div><span data-now></span></div>${rows}<div class="calc"><div class="lb">What does the uptime guarantee mean?<div class="opt">${so}</div></div><div><div class="big" data-mo></div><small data-yr></small><button type="button" class="btn btn-primary" data-book><span>Ask about our guarantee</span></button></div></div><span class="note">A demonstration board with illustrative data. Your real status page is connected when you publish.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
