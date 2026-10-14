"use strict";
/**
 * packages (photography and weddings, real 3D): an ivory, blush and gold wedding look with a turnable 3D diamond ring and a "build your
 * wedding package" tool: hours of coverage, a second photographer, an engagement shoot and an album, shown as a total, a 25% deposit,
 * the number of edited photographs to expect and a short list of what is included, which pre-fills the enquiry. Fonts: Italiana +
 * Lora (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Italiana-Regular.ttf", "Italiana-Regular.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Bold.ttf", "Lora-Bold.ttf"], ["Italiana-OFL.txt", "OFL-Italiana.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"Italiana";src:url(fonts/Italiana-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.02em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1.04}h2{font-size:clamp(1.9rem,4vw,3.2rem);line-height:1.12}h3{font-size:1.4rem}
h1 em,h2 em{font-style:italic;font-family:"Lora",Georgia,serif;font-size:.86em;color:var(--accent)}.eyebrow{color:var(--gold);letter-spacing:.24em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.pk{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(18px,4vw,50px);align-items:start;border:1px solid var(--gold);outline:1px solid var(--gold);outline-offset:6px;border-radius:4px;background:#FFFCF8;padding:clamp(18px,3vw,38px)}.pk .ctl{display:grid;gap:1.3rem}.pk .lb{display:grid;gap:.5rem;font:700 .72rem var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:700 .92rem var(--sans);border:1px solid var(--gold);border-radius:999px;background:transparent;color:var(--ink);padding:.6rem 1.1rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
.pk .out{border:1px solid var(--line);background:var(--soft);padding:clamp(16px,3vw,30px)}.pk .big{font:400 clamp(3rem,8vw,4.6rem)/1 var(--display);color:var(--accent)}.pk .big small{font:400 .95rem var(--sans);color:var(--muted);margin-left:.5rem}.pk ul{list-style:none;margin:1.1rem 0 0;padding:0;display:grid;gap:.5rem}.pk li{display:flex;gap:.6rem;align-items:baseline;color:var(--ink)}.pk li:before{content:"\\2726";color:var(--gold)}.pk li[hidden]{display:none}
.pk dl{margin:1.1rem 0 0;display:grid;gap:.5rem}.pk dl div{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--line);padding-bottom:.4rem}.pk dt{color:var(--muted)}.pk dd{margin:0;font-weight:700}.pk .btn{width:100%;justify-content:center;margin-top:1.1rem}.pk .note{display:block;margin-top:.8rem;font-size:.78rem;color:var(--muted)}
@media(max-width:860px){.pk{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px);text-align:center}.th div{border-top:1px solid var(--gold);padding-top:1rem}.th b{display:block;font:400 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);background:#FFFCF8;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-pack]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-pack")), st = { hrs: 8, two: 1, eng: 0, alb: 0 }, line = "";
  function money(n) { return "\\u00A3" + n.toLocaleString("en-GB"); }
  function set(k, v) { c.querySelector("[data-" + k + "]").textContent = v; }
  function calc() {
    var base = D.hours[st.hrs], total = base + (st.two ? D.two : 0) + (st.eng ? D.eng : 0) + D.albums[st.alb][1], pics = st.hrs * 65 + (st.eng ? 40 : 0);
    c.querySelector(".big").firstChild.nodeValue = money(total); set("dep", money(Math.round(total * .25))); set("pics", "about " + pics); set("rest", money(total - Math.round(total * .25)));
    [].forEach.call(c.querySelectorAll("[data-inc]"), function (li) { var k = li.getAttribute("data-inc"); li.hidden = (k === "two" && !st.two) || (k === "eng" && !st.eng) || (k === "alb" && !st.alb); });
    set("hrsl", st.hrs + " hours of coverage"); set("albl", st.alb ? D.albums[st.alb][0] + " album" : "");
    line = "Wedding enquiry: " + st.hrs + " hours" + (st.two ? ", second photographer" : "") + (st.eng ? ", engagement shoot" : "") + (st.alb ? ", " + D.albums[st.alb][0] + " album" : "") + ". Estimate " + money(total) + ". My date is: ";
  }
  [].forEach.call(c.querySelectorAll("[data-g]"), function (g) { var k = g.getAttribute("data-g"), bs = [].slice.call(g.querySelectorAll("button")); bs.forEach(function (b) { b.addEventListener("click", function () { st[k] = +b.getAttribute("data-v"); bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); calc(); }); }); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const grp = (key, items, sel) => `<div class="lb">${key[1]}<div class="opt" data-g="${key[0]}">${items.map(([l, v]) => `<button type="button" data-v="${v}" aria-pressed="${v === sel}">${l}</button>`).join("")}</div></div>`;
module.exports = R.make({
  name: "packages", themeColor: "#FBF6F1", fonts: FONTS, preload: ["assets/fonts/Italiana-Regular.ttf"], js: JS,
  vars: { bg: "#FBF6F1", surface: "#FFFCF8", ink: "#3A2E31", muted: "#7A6A6F", line: "#E9DCD8", accent: "#A8506A", onaccent: "#FFFFFF", c1: "#C45C78", c2: "#E8C46A", c3: "#3A2E31", rad: "4px", display: '"Italiana",Georgia,serif', sans: '"Lora",Georgia,serif', header: "rgba(251,246,241,.93)", gold: "#B88A2E", soft: "#F8EBEA" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = { hours: { 4: 1200, 6: 1700, 8: 2200, 10: 2600 }, two: 350, eng: 250, albums: [["No", 0], ["20 page", 350], ["30 page", 480]] };
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Your day, <em>quietly</em> remembered.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#build"><span>Build my package</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "ring", "ring", "A diamond ring you can turn", { c1: "#C45C78", c2: "#E8C46A", c3: "#3A2E31", hint: "a diamond ring" })}</div></section>
<section class="sec" id="build" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Package builder</span><h2 style="margin-top:.8rem">Build <em>your wedding package</em></h2></div></div><div class="pk" data-pack='${JSON.stringify(D)}' data-reveal><div class="ctl">${grp(["hrs", "Hours of coverage"], [["4 hours", 4], ["6 hours", 6], ["8 hours", 8], ["10 hours", 10]], 8)}${grp(["two", "Second photographer"], [["Yes", 1], ["No", 0]], 1)}${grp(["eng", "Engagement shoot"], [["Add it", 1], ["No thanks", 0]], 0)}${grp(["alb", "Printed album"], [["None", 0], ["20 page", 1], ["30 page", 2]], 0)}</div><div class="out"><div class="big">&pound;0<small>total</small></div><dl><div><dt>Deposit to hold your date (25%)</dt><dd data-dep></dd></div><div><dt>Balance before the day</dt><dd data-rest></dd></div><div><dt>Edited photographs</dt><dd data-pics></dd></div></dl><ul><li data-inc="hrs"><span data-hrsl></span></li><li data-inc="two"><span>A second photographer, so nothing is missed</span></li><li data-inc="eng"><span>A relaxed engagement shoot</span></li><li data-inc="alb"><span data-albl></span></li><li data-inc="gal"><span>A private online gallery, ready in two weeks</span></li></ul><button type="button" class="btn btn-primary" data-book><span>Check my date</span></button><span class="note">Example prices. We confirm your quote in writing before you book.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
