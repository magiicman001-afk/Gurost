"use strict";
/**
 * chalk (tutoring, real 3D): a green chalkboard look with hand-written headings, a turnable 3D stack of books and a "build your week"
 * timetable: tap after-school and Saturday slots (up to three), see how many tutors are free in each and the weekly hours, then send
 * the chosen times with your enquiry. Fonts: Nothing You Could Do + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["NothingYouCouldDo-Regular.ttf", "NothingYouCouldDo-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["NothingYouCouldDo-OFL.txt", "OFL-NothingYouCouldDo.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Nothing You Could Do";src:url(fonts/NothingYouCouldDo-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
body{background:radial-gradient(ellipse at 30% 0,#2A4A41 0,#1B342D 70%)}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em}h1{font-size:clamp(3rem,8.4vw,6.6rem);line-height:.95}h2{font-size:clamp(2.2rem,5vw,3.8rem);line-height:1}h3{font-size:1.6rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(0,0,0,.4))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.tt{border:10px solid #8A6B45;border-radius:14px;background:#1E3A32;padding:clamp(14px,3vw,30px);box-shadow:inset 0 0 40px rgba(0,0,0,.35),0 14px 30px rgba(0,0,0,.35)}.tt .grid{display:grid;grid-template-columns:3.6rem repeat(6,minmax(0,1fr));gap:clamp(4px,1vw,8px)}.tt .grid>*{min-width:0}.tt .h{font:400 clamp(.9rem,2.4vw,1.3rem) var(--display);text-align:center;color:var(--accent);padding:.2rem 0}.tt .t{font:700 .72rem var(--sans);color:var(--muted);align-self:center;text-align:right;padding-right:.3rem}
.tt button{aspect-ratio:2.3;min-height:44px;border:2px dashed rgba(246,244,232,.35);border-radius:8px;background:transparent;color:var(--ink);font:700 clamp(.6rem,1.7vw,.8rem) var(--sans);cursor:pointer;padding:0;display:grid;place-items:center;line-height:1.1}.tt button small{display:block;font-weight:400;opacity:.7;font-size:.9em}.tt button[aria-pressed=true]{background:var(--accent);color:#1B1A10;border:2px solid var(--accent)}.tt button:disabled{opacity:.25;cursor:not-allowed;border-style:solid}
.tt .sum{margin-top:clamp(14px,2.4vw,24px);display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}.tt .sum p{margin:0;color:var(--muted)}.tt .sum b{font:400 1.8rem var(--display);color:var(--ink)}.tt .note{display:block;margin-top:.7rem;font-size:.78rem;color:var(--muted)}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px dashed var(--accent);padding-top:1rem}.th b{display:block;font:400 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px dashed rgba(246,244,232,.3);border-radius:16px;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-week]"); if (!c) return;
  var bs = [].slice.call(c.querySelectorAll("button")), sel = [], out = c.querySelector("[data-sel]"), hrs = c.querySelector("[data-hrs]"), mx = 3;
  function upd() { out.textContent = sel.length ? sel.map(function (b) { return b.getAttribute("data-l"); }).join(", ") : "Pick up to three slots"; hrs.textContent = sel.length + (sel.length === 1 ? " hour" : " hours") + " a week"; bs.forEach(function (b) { if (b.getAttribute("data-full")) return; b.disabled = sel.length >= mx && sel.indexOf(b) < 0; }); }
  bs.forEach(function (b) { b.addEventListener("click", function () { var i = sel.indexOf(b); if (i > -1) sel.splice(i, 1); else if (sel.length < mx) sel.push(b); b.setAttribute("aria-pressed", i > -1 ? "false" : "true"); upd(); }); }); upd();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = sel.length ? "Weekly lesson times I would like: " + out.textContent + ". Subject and level: " : "Please suggest weekly lesson times. Subject and level: "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "chalk", themeColor: "#1B342D", fonts: FONTS, preload: ["assets/fonts/NothingYouCouldDo-Regular.ttf"], js: JS,
  vars: { bg: "#1B342D", surface: "#244339", ink: "#F6F4E8", muted: "#B9C7BD", line: "rgba(246,244,232,.22)", accent: "#FFD866", onaccent: "#1B1A10", c1: "#E0584A", c2: "#FFD866", c3: "#1B342D", rad: "10px", display: '"Nothing You Could Do",cursive', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(27,52,45,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], slots = ["9am", "10am", "4pm", "5pm", "6pm", "7pm"];
    const full = (d, s) => { const k = (d * 7 + s * 3 + 2) % 11; return k === 0 || k === 5; };
    const free = (d, s) => 1 + ((d * 5 + s * 3) % 5);
    let g = `<span></span>${days.map((d) => `<span class="h">${d}</span>`).join("")}`;
    slots.forEach((sl, s) => {
      g += `<span class="t">${sl}</span>`;
      days.forEach((dn, d) => {
        const sat = d === 5, morning = s < 2;
        if ((sat && !morning) || (!sat && morning)) { g += `<button type="button" disabled data-full="1" aria-label="${dn} ${sl} not offered"></button>`; return; }
        if (full(d, s)) { g += `<button type="button" disabled data-full="1" aria-label="${dn} ${sl} full">full</button>`; return; }
        g += `<button type="button" data-l="${dn} ${sl}" aria-pressed="false" aria-label="${dn} ${sl}, ${free(d, s)} tutors free">${free(d, s)}<small>free</small></button>`;
      });
    });
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Class <em>is in</em> session.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#week"><span>Build my week</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "books", "book", "A stack of books you can turn", { c1: "#E0584A", c2: "#FFD866", c3: "#1B342D", hint: "a stack of books" })}</div></section>
<section class="sec" id="week" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Weekly timetable</span><h2 style="margin-top:.8rem">Pick <em>your slots</em></h2></div></div><div class="tt" data-week data-reveal><div class="grid">${g}</div><div class="sum"><div><b data-hrs></b><p data-sel></p></div><button type="button" class="btn btn-primary" data-book><span>Send my times</span></button></div><span class="note">Example availability. The number is how many tutors are free in that slot. We confirm your tutor and time within a day.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
