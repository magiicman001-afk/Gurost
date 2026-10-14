"use strict";
/**
 * lantern (hotel, real 3D): a cosy dusk-to-night look with a glowing 3D lantern and a "a day at the hotel" slider: drag the time from 6am
 * to midnight and the sky changes (sun, dusk, moon and stars) while the hotel shows what is on right now and what comes next.
 * Fonts: Gloock + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Gloock-Regular.ttf", "Gloock-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["Gloock-OFL.txt", "OFL-Gloock.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
body{background:radial-gradient(ellipse at 50% 0,#33264A 0,#171325 60%)}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(2.8rem,7.4vw,6rem);line-height:1}h2{font-size:clamp(2rem,4.2vw,3.3rem);line-height:1.08}h3{font-size:1.3rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center;filter:drop-shadow(0 0 60px rgba(255,170,90,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.dy{border-radius:28px;overflow:hidden;border:1px solid var(--line)}.dy .sky{position:relative;height:clamp(220px,34vw,320px);background:linear-gradient(#8EC5E8,#E8F3FA);overflow:hidden}.dy .sun,.dy .moon{position:absolute;width:56px;height:56px;border-radius:50%;left:0;top:0;transform:translate(-50%,-50%);transition:opacity .4s}.dy .sun{background:radial-gradient(circle,#FFF6C8 0,#FFD36B 60%,rgba(255,200,80,0) 72%);box-shadow:0 0 60px 20px rgba(255,210,110,.5)}.dy .moon{background:radial-gradient(circle at 36% 36%,#FFFFFF,#D8DEEE 70%);box-shadow:0 0 40px 8px rgba(200,215,255,.4);opacity:0}.dy .stars{position:absolute;inset:0;opacity:0;transition:opacity .6s;background-image:radial-gradient(1.5px 1.5px at 12% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 30% 60%,#fff,transparent),radial-gradient(2px 2px at 48% 18%,#fff,transparent),radial-gradient(1.5px 1.5px at 66% 48%,#fff,transparent),radial-gradient(2px 2px at 82% 24%,#fff,transparent),radial-gradient(1.5px 1.5px at 92% 66%,#fff,transparent),radial-gradient(1.5px 1.5px at 22% 80%,#fff,transparent)}
.dy .hill{position:absolute;left:-5%;right:-5%;bottom:-2px;height:38%;background:#2B3B2F;border-radius:50% 50% 0 0/100% 100% 0 0}.dy .hill.b{height:26%;background:#1D2A21;left:20%;right:-20%}
.dy .time{position:absolute;left:clamp(16px,3vw,32px);top:clamp(14px,2.4vw,24px);font:400 clamp(2.2rem,6vw,3.6rem)/1 var(--display);color:#1B2A3A;transition:color .4s}.dy.night .time{color:#F3EBDD}
.dy .panel{background:var(--surface);padding:clamp(18px,3vw,34px);display:grid;gap:1.4rem}.dy input[type=range]{width:100%;accent-color:var(--accent)}.dy .ticks{display:flex;justify-content:space-between;font:700 .7rem var(--sans);color:var(--muted);letter-spacing:.06em;margin-top:-.6rem}
.dy .now{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.2rem}.dy .now div{border:1px solid var(--line);border-radius:16px;padding:1rem 1.2rem}.dy .now small{display:block;font:700 .72rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}.dy .now b{display:block;font:400 1.5rem var(--display);margin:.3rem 0}.dy .now span{color:var(--muted)}
.dy ol{list-style:none;margin:0;padding:0;display:grid;gap:.3rem}.dy li{display:grid;grid-template-columns:5.4rem minmax(0,1fr) auto;gap:1rem;padding:.55rem .8rem;border-radius:10px;color:var(--muted)}.dy li time{font:700 .85rem var(--sans)}.dy li.on{background:rgba(255,176,90,.16);color:var(--ink)}.dy .note{font-size:.78rem;color:var(--muted)}.dy .btn{justify-self:start}
@media(max-width:700px){.dy .now{grid-template-columns:minmax(0,1fr)}.dy li{grid-template-columns:4.6rem minmax(0,1fr)}.dy li em{display:none}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:400 2.8rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-day]"); if (!c) return;
  var E = JSON.parse(c.getAttribute("data-day")), rg = c.querySelector("input"), sky = c.querySelector(".sky"), sun = c.querySelector(".sun"), moon = c.querySelector(".moon"), st = c.querySelector(".stars"), tm = c.querySelector(".time"), ol = c.querySelector("ol"), nw = c.querySelector("[data-now]"), nx = c.querySelector("[data-next]"), lis = [];
  var K = [[6, [247,184,138], [252,227,192]], [9, [142,197,232], [232,243,250]], [13, [91,174,230], [220,239,250]], [17, [143,183,223], [251,226,184]], [19, [231,140,107], [246,197,138]], [20.5, [75,59,114], [201,102,122]], [22, [20,32,63], [43,58,102]], [24, [11,18,38], [26,37,71]]];
  function mix(a, b, k) { return a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }); }
  function css(a) { return "rgb(" + a.join(",") + ")"; }
  function hm(t) { var h = Math.floor(t), m = Math.round((t - h) * 60); if (m === 60) { h++; m = 0; } var hh = h % 24, ap = hh >= 12 ? "pm" : "am"; return ((hh % 12) || 12) + (m ? ":" + ("0" + m).slice(-2) : "") + ap; }
  E.forEach(function (e) { var li = document.createElement("li"), t = document.createElement("time"), n = document.createElement("span"), l = document.createElement("em"); t.textContent = hm(e[0]); n.textContent = e[2]; l.textContent = e[3]; l.style.fontStyle = "normal"; li.appendChild(t); li.appendChild(n); li.appendChild(l); ol.appendChild(li); lis.push(li); });
  function upd() {
    var t = +rg.value, i = 0; while (i < K.length - 2 && t >= K[i + 1][0]) i++; var a = K[i], b = K[i + 1], k = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
    sky.style.background = "linear-gradient(" + css(mix(a[1], b[1], k)) + "," + css(mix(a[2], b[2], k)) + ")";
    var night = t >= 19.5; c.className = "dy" + (night ? " night" : ""); tm.textContent = hm(t);
    var p = (t - 6) / 18, x = p * 100, y = 90 - Math.sin(p * Math.PI) * 70; sun.style.left = moon.style.left = x + "%"; sun.style.top = moon.style.top = y + "%";
    sun.style.opacity = t < 19.5 ? 1 : 0; moon.style.opacity = t >= 19.5 ? 1 : 0; st.style.opacity = t >= 20.5 ? Math.min(1, (t - 20.5) / 1.5) : 0;
    var cur = -1; E.forEach(function (e, j) { if (t >= e[0] && t < e[1]) cur = j; });
    lis.forEach(function (li, j) { li.className = j === cur ? "on" : ""; });
    var nowE = cur > -1 ? E[cur] : null, next = null; E.forEach(function (e) { if (!next && e[0] > t) next = e; });
    nw.querySelector("b").textContent = nowE ? nowE[2] : "A quiet moment"; nw.querySelector("span").textContent = nowE ? nowE[3] : "Nothing scheduled. The kettle is always on."; nx.querySelector("b").textContent = next ? next[2] : "See you tomorrow"; nx.querySelector("span").textContent = next ? "From " + hm(next[0]) + ", " + next[3] : "Breakfast starts at 7am.";
  }
  rg.addEventListener("input", upd); var d = new Date(), h = d.getHours() + d.getMinutes() / 60; rg.value = Math.max(6, Math.min(24, h)); upd();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Table or treatment request for around " + hm(+rg.value) + ". Date and number of people: "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "lantern", themeColor: "#171325", fonts: FONTS, preload: ["assets/fonts/Gloock-Regular.ttf"], js: JS,
  vars: { bg: "#171325", surface: "#211B36", ink: "#F6EEDD", muted: "#B0A8C4", line: "rgba(246,238,221,.17)", accent: "#FFB45E", onaccent: "#1A1005", c1: "#FFB45E", c2: "#FFC770", c3: "#171325", rad: "14px", display: '"Gloock",Georgia,serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(23,19,37,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const E = [[6, 7, "Early coffee on the terrace", "Terrace"], [7, 10.5, "Cooked breakfast", "Dining room"], [10.5, 12, "Coffee and the papers", "Lounge"], [12, 14.5, "Light lunch", "Garden"], [15, 17.5, "Afternoon tea and check-in", "Lounge"], [17.5, 19, "Cocktail hour", "Bar"], [19, 21.5, "Dinner", "Dining room"], [21.5, 23, "Last orders and a nightcap", "Bar"], [23, 24, "Quiet hours", "Rooms"]];
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>A light <em>left on</em> for you.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#day"><span>See a day here</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "lantern", "lamp", "A lantern you can turn", { c1: "#FFB45E", c2: "#FFC770", c3: "#171325", hint: "a glowing lantern", lum: 1.6 })}</div></section>
<section class="sec" id="day" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">A day at the hotel</span><h2 style="margin-top:.8rem">What is on <em>right now</em>?</h2></div></div><div class="dy" data-day='${JSON.stringify(E).replace(/'/g, "&#39;")}' data-reveal><div class="sky"><div class="stars"></div><div class="sun"></div><div class="moon"></div><div class="time">9am</div><div class="hill"></div><div class="hill b"></div></div><div class="panel"><div><input type="range" min="6" max="24" step="0.25" value="9" aria-label="Time of day"><div class="ticks"><span>6am</span><span>12pm</span><span>6pm</span><span>12am</span></div></div><div class="now"><div data-now><small>Now</small><b></b><span></span></div><div data-next><small>Next up</small><b></b><span></span></div></div><ol></ol><button type="button" class="btn btn-primary" data-book><span>Book a table or treatment</span></button><span class="note">Example timetable. Opening times change with the season.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
