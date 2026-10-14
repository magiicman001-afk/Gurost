"use strict";
/**
 * seasons (hotel, real 3D): a page that changes colour with the season you pick, with a turnable 3D house whose roof is repainted live,
 * a rates table for every room in every season, the cheapest season marked, and what each season is best for.
 * Fonts: National Park + Lora (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["NationalPark-Regular.ttf", "NationalPark-Regular.ttf"], ["NationalPark-Bold.ttf", "NationalPark-Bold.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["NationalPark-OFL.txt", "OFL-NationalPark.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"National Park";src:url(fonts/NationalPark-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"National Park";src:url(fonts/NationalPark-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.025em}h1{font-size:clamp(2.8rem,7.2vw,6rem);line-height:1}h2{font-size:clamp(2rem,4.2vw,3.3rem);line-height:1.06}h3{font-size:1.25rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:460px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(40,40,20,.25))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.sea{--sb:#F2F6E8;--sa:#5C8F3A;border-radius:28px;padding:clamp(18px,3vw,38px);background:var(--sb);border:1px solid var(--line);transition:background .5s}.sea .sw{display:flex;gap:.5rem;flex-wrap:wrap}.sea .sw button{font:700 .9rem var(--sans);border:2px solid var(--sa);border-radius:99px;background:transparent;color:#1F2A22;padding:.6rem 1.2rem;cursor:pointer;transition:all .3s}.sea .sw button[aria-pressed=true]{background:var(--sa);color:#fff}
.sea .what{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(14px,3vw,36px);margin:clamp(16px,3vw,28px) 0}.sea .what h3{font-size:clamp(1.6rem,3.6vw,2.4rem);margin:0 0 .4rem;color:var(--sa)}.sea .what p{margin:0;color:#44504A}.sea .tbl{width:100%;border-collapse:collapse;color:#1F2A22}.sea .tbl th,.sea .tbl td{text-align:left;padding:.7rem .4rem;border-bottom:1px solid rgba(31,42,34,.18)}.sea .tbl td:last-child,.sea .tbl th:last-child{text-align:right}.sea .tbl td:last-child{font:700 1.3rem var(--display);color:var(--sa)}.sea .tbl small{display:block;color:#5A665F}.sea .cheap{display:inline-block;margin-left:.5rem;font:700 .7rem var(--sans);text-transform:uppercase;letter-spacing:.08em;background:var(--sa);color:#fff;border-radius:99px;padding:.15rem .6rem}
.sea .btn{margin-top:1rem;background:var(--sa);border-color:var(--sa);color:#fff}.sea .note{display:block;margin-top:.8rem;font-size:.78rem;color:#5A665F}
@media(max-width:760px){.sea .what{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 2.6rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-sea]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-sea")), bs = [].slice.call(c.querySelectorAll(".sw button")), h = c.querySelector("h3"), p = c.querySelector(".best"), tb = c.querySelector("tbody"), g = document.querySelector(".hero .gl3d"), cur = 0;
  function show(i) {
    cur = i; var s = D.s[i]; c.style.setProperty("--sb", s.bg); c.style.setProperty("--sa", s.ac); h.textContent = s.n; p.textContent = s.b; tb.innerHTML = "";
    D.r.forEach(function (r) { var tr = document.createElement("tr"), a = document.createElement("td"), b = document.createElement("td"), n = document.createElement("b"), sm = document.createElement("small"); n.textContent = r.n; sm.textContent = r.d; a.appendChild(n); a.appendChild(sm); var min = Math.min.apply(null, r.p); b.textContent = "\\u00A3" + r.p[i]; if (r.p[i] === min) { var ch = document.createElement("span"); ch.className = "cheap"; ch.textContent = "Lowest"; a.firstChild.appendChild(ch); } tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr); });
    bs.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
    if (g) { g.setAttribute("data-c1", s.roof); if (g.gl3d) g.gl3d.colors(s.roof); }
  }
  bs.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); });
  var m = new Date().getMonth(); show(m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3); bs.forEach(function (b, k) { b.setAttribute("aria-pressed", k === cur ? "true" : "false"); });
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Stay enquiry for " + D.s[cur].n.toLowerCase() + ". Room and dates: "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "seasons", themeColor: "#F5F3EA", fonts: FONTS, preload: ["assets/fonts/NationalPark-Bold.ttf"], js: JS,
  vars: { bg: "#F5F3EA", surface: "#FFFFFF", ink: "#1F2A22", muted: "#5A665F", line: "rgba(31,42,34,.16)", accent: "#B5532F", onaccent: "#FFFFFF", c1: "#C7603A", c2: "#F0C27B", c3: "#1F2A22", rad: "14px", display: '"National Park",Georgia,serif', sans: '"Lora",Georgia,serif', header: "rgba(245,243,234,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = {
      s: [
        { n: "Spring", b: "Blossom walks, quiet gardens and lambs in the fields. Good rooms, fewer crowds.", bg: "#F2F6E8", ac: "#4F8A30", roof: "#7FB05B" },
        { n: "Summer", b: "Garden dinners, boat trips and long light evenings. Book early for August.", bg: "#FFF6DC", ac: "#C97A0A", roof: "#F0B24A" },
        { n: "Autumn", b: "Log fires, woodland colour and big appetites. Our favourite time of year.", bg: "#F8EBDD", ac: "#AD4A28", roof: "#C7603A" },
        { n: "Winter", b: "Spa days, Christmas markets and a room with a view of frost. Best value of the year.", bg: "#E9EFF5", ac: "#3C6A94", roof: "#5C84AA" },
      ],
      r: [
        { n: "Classic double", d: "King bed, rainfall shower", p: [139, 169, 129, 99] },
        { n: "Garden view room", d: "Larger, with a reading chair", p: [169, 199, 159, 119] },
        { n: "Family suite", d: "Two rooms, sleeps four", p: [229, 279, 219, 169] },
        { n: "The Tower suite", d: "Freestanding bath, rooftop view", p: [349, 419, 329, 259] },
      ],
    };
    const sw = D.s.map((s) => `<button type="button" aria-pressed="false">${s.n}</button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Every season, <em>a new stay</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#rates"><span>See rates by season</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "house", "bed", "A house you can turn", { c1: "#C7603A", c2: "#F0C27B", c3: "#1F2A22", hint: "a small hotel building" })}</div></section>
<section class="sec" id="rates" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Rates by season</span><h2 style="margin-top:.8rem">When is <em>best for you</em>?</h2></div></div><div class="sea" data-sea='${JSON.stringify(D)}' data-reveal><div class="sw">${sw}</div><div class="what"><div><h3></h3><p class="best"></p><button type="button" class="btn" data-book><span>Ask about this season</span></button><span class="note">Example rates per room per night. We confirm the exact price for your dates.</span></div><table class="tbl"><tbody></tbody></table></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
