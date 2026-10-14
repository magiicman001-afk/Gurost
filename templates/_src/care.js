"use strict";
/**
 * plans (tech agency and SaaS, real 3D): a soft violet gradient look with a turnable 3D rocket and a SaaS-style pricing board for the
 * agency's care and support plans: a monthly or yearly switch (yearly saves 20%), a team-size slider and three plan cards that update
 * their price and point out the best fit for the team size, then pre-fill the call request. Fonts: Bricolage Grotesque + Instrument
 * Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
body{background-image:radial-gradient(ellipse 80% 40% at 80% 0,rgba(124,58,237,.14),transparent 60%),radial-gradient(ellipse 60% 30% at 0 20%,rgba(34,211,238,.12),transparent 60%)}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:.98}h2{font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.04}h3{font-size:1.3rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:380px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.pl .top{display:flex;gap:1.4rem 2.4rem;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:1.4rem}.pl .sw{display:inline-flex;background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px}.pl .sw button{font:700 .9rem var(--sans);border:0;background:transparent;color:var(--muted);padding:.55rem 1.1rem;border-radius:999px;cursor:pointer}.pl .sw button[aria-pressed=true]{background:var(--accent);color:#fff}.pl .sw small{font-weight:700;color:#0E9F6E;margin-left:.3rem}
.pl .seats{flex:1 1 280px;display:grid;gap:.3rem;font:700 .9rem var(--sans)}.pl .seats span{display:flex;justify-content:space-between}.pl .seats input{width:100%;accent-color:var(--accent);height:32px}
.pl .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.pl .card{position:relative;background:#fff;border:1px solid var(--line);border-radius:20px;padding:clamp(18px,2.6vw,28px);display:grid;gap:.9rem;align-content:start;transition:transform .3s,box-shadow .3s}.pl .card.best{border-color:var(--accent);box-shadow:0 18px 44px rgba(79,70,229,.22);transform:translateY(-6px)}.pl .card .tag{position:absolute;top:-13px;left:20px;background:var(--accent);color:#fff;font:700 .72rem var(--sans);letter-spacing:.1em;text-transform:uppercase;padding:.3rem .7rem;border-radius:99px;opacity:0}.pl .card.best .tag{opacity:1}
.pl .price{font:700 clamp(2.2rem,5vw,3.2rem)/1 var(--display);color:var(--ink)}.pl .price small{font:400 .9rem var(--sans);color:var(--muted);margin-left:.3rem}.pl .card ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem;color:var(--muted);font-size:.93rem}.pl .card li:before{content:"\\2713";color:var(--accent);font-weight:700;margin-right:.5rem}.pl .card .btn{justify-content:center;width:100%}.pl .note{display:block;margin-top:1.1rem;font-size:.78rem;color:var(--muted)}
@media(max-width:860px){.pl .cards{grid-template-columns:minmax(0,1fr)}.pl .card.best{transform:none}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:#fff;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-plans]"); if (!c) return;
  var P = JSON.parse(c.getAttribute("data-plans")), yr = 0, seats = c.querySelector("input"), cards = [].slice.call(c.querySelectorAll(".card")), sb = [].slice.call(c.querySelectorAll(".sw button")), line = "", best = 0;
  function calc() {
    var n = +seats.value; best = n <= 5 ? 0 : n <= 20 ? 1 : 2; c.querySelector("[data-n]").textContent = n + (n === 1 ? " person" : " people");
    cards.forEach(function (cd, i) { var p = P[i], m = Math.round((p.base + p.seat * n) * (yr ? .8 : 1)); cd.querySelector(".price").firstChild.nodeValue = "\\u00A3" + m; cd.querySelector(".price small").textContent = yr ? "a month, billed yearly" : "a month"; cd.className = "card" + (i === best ? " best" : ""); });
    var m2 = Math.round((P[best].base + P[best].seat * n) * (yr ? .8 : 1));
    line = "Plan enquiry: " + P[best].n + " for " + n + " people, " + (yr ? "yearly" : "monthly") + ", about \\u00A3" + m2 + " a month. About us: ";
  }
  sb.forEach(function (b, i) { b.addEventListener("click", function () { yr = i; sb.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); calc(); }); });
  seats.addEventListener("input", calc); calc();
  [].forEach.call(c.querySelectorAll(".card .btn"), function (b) { b.addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); }); });
})();
`;
const P = [
  { n: "Care", base: 99, seat: 5, f: ["Hosting and backups", "Security updates", "2 hours of changes a month", "Email support"] },
  { n: "Grow", base: 249, seat: 9, f: ["Everything in Care", "6 hours of changes a month", "SEO and analytics report", "Priority chat support"] },
  { n: "Scale", base: 599, seat: 14, f: ["Everything in Grow", "20 hours of changes a month", "Dedicated developer", "99.95% uptime guarantee"] },
];
module.exports = R.make({
  name: "care", themeColor: "#F6F4FF", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#F6F4FF", surface: "#FFFFFF", ink: "#17163A", muted: "#5F5F86", line: "#E1DEF6", accent: "#6D4AE8", onaccent: "#FFFFFF", c1: "#6D4AE8", c2: "#22D3EE", c3: "#17163A", rad: "14px", display: '"Bricolage Grotesque",system-ui,sans-serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(246,244,255,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const cards = P.map((p) => `<div class="card"><span class="tag">Best fit</span><h3>${p.n}</h3><div class="price">&pound;0<small></small></div><ul>${p.f.map((f) => `<li>${f}</li>`).join("")}</ul><button type="button" class="btn btn-primary"><span>Talk to us</span></button></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Launch it. <em>We keep it flying.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#plans"><span>See care plans</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "rocket", "rocket", "A rocket you can turn", { c1: "#6D4AE8", c2: "#22D3EE", c3: "#17163A", hint: "a rocket" })}</div></section>
<section class="sec" id="plans" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Care plans</span><h2 style="margin-top:.8rem">Pick a plan, <em>skip the stress</em></h2></div></div><div class="pl" data-plans='${JSON.stringify(P)}' data-reveal><div class="top"><div class="sw"><button type="button" aria-pressed="true">Monthly</button><button type="button" aria-pressed="false">Yearly <small>save 20%</small></button></div><label class="seats"><span>Team size <b data-n></b></span><input type="range" min="1" max="50" value="8" aria-label="Number of people on your team"></label></div><div class="cards">${cards}</div><span class="note">Example prices. Every plan can be cancelled any month, and you keep everything we build.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
