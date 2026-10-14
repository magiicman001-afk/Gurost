"use strict";
/**
 * daycast (photography and weddings, real 3D): a sage and ivory look with a turnable 3D champagne coupe and a "plan your wedding-day
 * light" timeline: pick the month and the ceremony time, and the tool works out sunset for the south of England, finds golden hour and
 * lays out a photographer's timeline for the day (preparation, first look, ceremony, family, portraits in the best light, speeches, cake,
 * first dance), with a warning when the best light falls at an awkward time. Pre-fills the enquiry. Fonts: Gloock + Work Sans (SIL OFL).
 */
const R = require("./rest-kit");
const FONTS = [["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.005em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1.04}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.1}h3{font-size:1.25rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.dc{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(18px,4vw,48px);align-items:start;background:#FBFBF6;border:1px solid var(--line);border-radius:20px;padding:clamp(18px,3vw,36px)}.dc .ctl{display:grid;gap:1.2rem}.dc label{display:grid;gap:.45rem;font:700 .74rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.dc select{font:400 1rem var(--sans);color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;appearance:none;-webkit-appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 20px) 55%,calc(100% - 14px) 55%;background-size:6px 6px;background-repeat:no-repeat;width:100%}
.dc .gold{border-radius:14px;background:linear-gradient(135deg,#FFF0C9,#F8D58C);color:#4A3508;padding:1rem 1.1rem}.dc .gold b{display:block;font:400 2rem/1 var(--display)}.dc .gold span{font-size:.82rem}
.dc .day{position:relative;margin:0;padding:0;list-style:none;display:grid;gap:0}.dc .day:before{content:"";position:absolute;left:4.7rem;top:.6rem;bottom:.6rem;width:2px;background:var(--line)}.dc .day li{display:grid;grid-template-columns:4rem 14px minmax(0,1fr);gap:.9rem;align-items:start;padding:.55rem 0}.dc .day time{font:700 .95rem var(--sans);color:var(--ink);text-align:right;padding-top:.1rem}.dc .day i{width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid var(--accent);margin-top:.25rem;position:relative;z-index:1}.dc .day li.g i{background:#F4B93E;border-color:#C9871A}.dc .day b{display:block;font-weight:700}.dc .day span{display:block;color:var(--muted);font-size:.86rem}
.dc .warn{margin:1rem 0 0;padding:.8rem 1rem;border-radius:12px;background:#F2F1E6;color:var(--ink);font-size:.88rem}.dc .btn{margin-top:1rem}.dc .note{display:block;margin-top:.8rem;font-size:.76rem;color:var(--muted)}
@media(max-width:860px){.dc{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:400 2.8rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:16px;background:#FBFBF6;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-day]"); if (!c) return;
  var SUN = [990, 1040, 1090, 1200, 1250, 1285, 1275, 1225, 1160, 1090, 985, 955], MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var mo = c.querySelector("[data-mo]"), ce = c.querySelector("[data-ce]"), ul = c.querySelector(".day"), gb = c.querySelector("[data-gold]"), gs = c.querySelector("[data-goldsub]"), wn = c.querySelector(".warn"), line = "";
  function hm(m) { m = Math.round(m / 5) * 5; var h = Math.floor(m / 60) % 24, n = m % 60, ap = h < 12 ? "am" : "pm"; h = h % 12 || 12; return h + ":" + (n < 10 ? "0" : "") + n + ap; }
  function calc() {
    var m = +mo.value, cer = +ce.value, sun = SUN[m], gold = sun - 60, ev = [];
    var after = cer + 100, gp = Math.max(gold, after), early = gold < after;
    ev.push([cer - 150, "Preparations", "Dress, suit, flowers, rings and quiet moments."], [cer - 75, "First look and couple portraits", "Optional: a private moment before the guests arrive."], [cer - 20, "Guests arrive", "Candid photographs as everyone finds their seat."], [cer, "Ceremony", "Aisle, vows, rings and the first kiss."], [cer + 45, "Confetti and congratulations", "Hugs, laughter and a confetti line."], [cer + 65, "Family and group photographs", "A short list keeps this to about 30 minutes."], [gp, "Golden hour portraits", "Twenty minutes in the best light of the day.", 1], [cer + 150, "Wedding breakfast and speeches", "Photographed from a distance, no fuss."], [Math.max(gp + 25, cer + 300), "Cake cutting", "Quick and sweet."], [Math.max(gp + 55, cer + 330), "First dance", "Then the party. Evening coverage ends here."]);
    ev.sort(function (a, b) { return a[0] - b[0]; });
    ul.innerHTML = ev.map(function (e) { return '<li' + (e[3] ? ' class="g"' : "") + '><time>' + hm(e[0]) + '</time><i></i><div><b>' + e[1] + '</b><span>' + e[2] + '</span></div></li>'; }).join("");
    gb.textContent = hm(gold) + " to " + hm(sun); gs.textContent = "Golden hour in " + MN[m] + " (sunset about " + hm(sun) + ")";
    wn.textContent = early ? "Heads up: golden hour starts before your ceremony ends, so we take portraits straight after the family photographs. We will use the softest light available." : gold - after > 150 ? "There is a gap before golden hour. We can use it for relaxed portraits in the shade, and save the glow for later." : "Your timing works well. The best light arrives right after your photographs with family.";
    line = "Wedding day plan: " + MN[m] + ", ceremony at " + hm(cer) + ", golden hour " + hm(gold) + ". My date is: ";
  }
  mo.addEventListener("change", calc); ce.addEventListener("change", calc); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CER = [660, 690, 720, 750, 780, 810, 840, 870, 900, 930, 960];
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}${m < 720 ? "am" : "pm"}`.replace(/^(1[3-9]|2\d):/, (x) => `${parseInt(x, 10) - 12}:`);
module.exports = R.make({
  name: "daycast", themeColor: "#F3F4EC", fonts: FONTS, preload: ["assets/fonts/Gloock-Regular.ttf"], js: JS,
  vars: { bg: "#F3F4EC", surface: "#FBFBF6", ink: "#27332A", muted: "#667466", line: "#DADFCF", accent: "#52744F", onaccent: "#FFFFFF", c1: "#D9E6D4", c2: "#E8C46A", c3: "#27332A", rad: "14px", display: '"Gloock",Georgia,serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(243,244,236,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const mo = MONTHS.map((m, i) => `<option value="${i}"${i === 5 ? " selected" : ""}>${m}</option>`).join("");
    const ce = CER.map((m) => `<option value="${m}"${m === 840 ? " selected" : ""}>${hm(m)}</option>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Chase <em>the golden light</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#light"><span>Plan my day</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "coupe", "bouquet", "A champagne coupe you can turn", { c1: "#D9E6D4", c2: "#E8C46A", c3: "#27332A", hint: "a champagne coupe" })}</div></section>
<section class="sec" id="light" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Wedding-day planner</span><h2 style="margin-top:.8rem">When is <em>your best light</em>?</h2></div></div><div class="dc" data-day data-reveal><div class="ctl"><label>Month of the wedding<select data-mo>${mo}</select></label><label>Ceremony starts<select data-ce>${ce}</select></label><div class="gold"><b data-gold></b><span data-goldsub></span></div></div><div><ul class="day"></ul><p class="warn"></p><button type="button" class="btn btn-primary" data-book><span>Send my plan</span></button><span class="note">Sunset times are typical for the south of England. We plan around your real venue and date.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
