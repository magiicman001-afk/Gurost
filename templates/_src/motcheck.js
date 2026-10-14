"use strict";
/**
 * motcheck (garage, real 3D): black and number-plate yellow with a turnable 3D car and an "is my MOT due?" checker: type a
 * registration (shown on a yellow plate), pick the month of the last MOT and see the days left, the earliest date you can test
 * and still keep your renewal date, and a button that pre-fills the booking form. Fonts: Erica One + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["EricaOne-Regular.ttf", "EricaOne-Regular.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["EricaOne-OFL.txt", "OFL-EricaOne.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Erica One";src:url(fonts/EricaOne-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1.02}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.08}h3{font-size:1.15rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.brand{font-size:1.3rem;line-height:1.6}.site-header .btn{line-height:1.4}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:460px;justify-self:center;filter:drop-shadow(0 24px 30px rgba(0,0,0,.55))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.mot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(18px,4vw,50px);align-items:stretch}.mot .in,.mot .out{border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:clamp(18px,3vw,32px)}
.plate{display:flex;align-items:center;background:#F7D117;color:#111;border-radius:12px;border:3px solid #111;overflow:hidden;max-width:100%}.plate:before{content:"GB";display:flex;align-items:flex-end;justify-content:center;align-self:stretch;width:2.6rem;padding:0 0 .35rem;background:#1F4DA8;color:#fff;font:700 .8rem var(--sans)}.plate input{flex:1;min-width:0;border:0;background:transparent;color:#111;font:400 clamp(1.7rem,6vw,2.6rem)/1.1 var(--display);letter-spacing:.06em;text-transform:uppercase;padding:.5rem .9rem;outline:0}
.mot label{display:block;margin:1.1rem 0 .4rem;font:700 .8rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mot input[type=month]{width:100%;max-width:100%;font:700 1.05rem var(--sans);color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:.85rem 1rem;color-scheme:dark}
.mot .big{font:400 clamp(3.6rem,10vw,6rem)/1 var(--display);color:var(--accent)}.mot .big small{font:700 1rem var(--sans);color:var(--muted);margin-left:.4rem}.mot .st{display:inline-block;border-radius:99px;padding:.3rem .8rem;font:700 .78rem var(--sans);letter-spacing:.08em;text-transform:uppercase;background:#1C3B26;color:#7DE2A0}.mot .st.soon{background:#46380E;color:#F7D117}.mot .st.over{background:#4A1B1B;color:#FF8E8E}
.bar{height:10px;border-radius:99px;background:var(--bg);overflow:hidden;margin:1rem 0}.bar i{display:block;height:100%;width:0;border-radius:99px;background:var(--accent);transition:width .6s var(--ease)}.mot p{margin:.45rem 0;color:var(--muted)}.mot p b{color:var(--ink)}.mot .btn{margin-top:1rem}.mot small.note{display:block;margin-top:1rem;color:var(--muted);font-size:.8rem}
@media(max-width:820px){.mot{grid-template-columns:minmax(0,1fr)}}
.chk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,1.8vw,20px)}.chk div{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:1.1rem}.chk b{display:block;font:400 1.05rem var(--display);margin-bottom:.3rem}.chk span{color:var(--muted);font-size:.92rem}@media(max-width:760px){.chk{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-mot]"); if (!c) return;
  var reg = c.querySelector("[data-reg]"), mon = c.querySelector("[data-month]"), out = c.querySelector(".out");
  var days = out.querySelector(".big"), st = out.querySelector(".st"), bar = out.querySelector(".bar i"), due = out.querySelector("[data-due]"), early = out.querySelector("[data-early]"), msg = out.querySelector("[data-msg]"), bk = out.querySelector("[data-book]");
  var M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  function fmt(d) { return d.getDate() + " " + M[d.getMonth()] + " " + d.getFullYear(); }
  var now = new Date(); now.setHours(0, 0, 0, 0);
  if (!mon.value) { var d0 = new Date(now.getFullYear(), now.getMonth() - 10, 1); mon.value = d0.getFullYear() + "-" + ("0" + (d0.getMonth() + 1)).slice(-2); }
  var dueDate = null;
  function calc() {
    var p = mon.value.split("-"); if (p.length < 2) return;
    dueDate = new Date(+p[0] + 1, +p[1], 0);
    var left = Math.round((dueDate - now) / 86400000), e = new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, dueDate.getDate() + 1);
    days.firstChild.nodeValue = left < 0 ? Math.abs(left) : left; days.querySelector("small").textContent = left < 0 ? "days overdue" : (left === 1 ? "day left" : "days left");
    st.className = "st" + (left < 0 ? " over" : left <= 30 ? " soon" : ""); st.textContent = left < 0 ? "MOT expired" : left <= 30 ? "Book soon" : "You are fine for now";
    bar.style.width = Math.max(0, Math.min(100, left / 365 * 100)) + "%";
    due.textContent = fmt(dueDate); early.textContent = fmt(e);
    msg.textContent = left < 0 ? "Without a valid MOT you can only drive to a pre-booked test." : left <= 30 ? "Test now and, if you are inside the window, you keep the same renewal date." : "No rush. Book any time from the earliest date and keep your renewal date.";
  }
  mon.addEventListener("input", calc); calc();
  reg.addEventListener("input", function () { reg.value = reg.value.replace(/[^A-Za-z0-9 ]/g, "").toUpperCase(); });
  bk.addEventListener("click", function () {
    var ta = document.querySelector("#order textarea"); if (ta) ta.value = "MOT booking. Registration: " + (reg.value || "not given") + ". MOT due by " + (dueDate ? fmt(dueDate) : "not given") + ".";
    var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
`;
module.exports = R.make({
  name: "motcheck", themeColor: "#0F1114", fonts: FONTS, preload: ["assets/fonts/EricaOne-Regular.ttf"], js: JS,
  vars: { bg: "#0F1114", surface: "#181B20", ink: "#F4F1E8", muted: "#A4A9B3", line: "rgba(244,241,232,.16)", accent: "#F7D117", onaccent: "#14110A", c1: "#F7D117", c2: "#FFE27A", c3: "#111111", rad: "14px", display: '"Erica One",Impact,sans-serif', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(15,17,20,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const chk = [["Lights and signals", "Every bulb, indicator and reflector."], ["Brakes", "Pads, discs, fluid and the handbrake."], ["Steering and suspension", "Play, wear and leaks."], ["Tyres and wheels", "Tread, condition and pressure."], ["Exhaust and emissions", "Leaks, noise and smoke readings."], ["Body and seatbelts", "Sharp edges, corrosion and belts."]].map(([a, b]) => `<div data-reveal><b>${a}</b><span>${b}</span></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>MOT due? <em>Check it now.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#check"><span>Check my MOT date</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "car", "hatch", "A small car you can turn", { c1: "#F7D117", c2: "#FFF3B0", c3: "#111111", hint: "a small car" })}</div></section>
<section class="sec" id="check" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">MOT checker</span><h2 style="margin-top:.8rem">Is your MOT <em>due soon</em>?</h2></div></div><div class="mot" data-mot data-reveal><div class="in"><div class="plate"><input data-reg value="" placeholder="AB21 XYZ" maxlength="8" aria-label="Registration number" autocomplete="off" spellcheck="false"></div><label for="mot-m">Month of your last MOT</label><input id="mot-m" type="month" data-month><small class="note">An example checker. Your real date is on GOV.UK or your last certificate.</small></div><div class="out"><div class="big">0<small>days left</small></div><span class="st">&nbsp;</span><div class="bar"><i></i></div><p>MOT runs out on <b data-due></b></p><p>Earliest test that keeps your date: <b data-early></b></p><p data-msg></p><button type="button" class="btn btn-primary" data-book><span>Book my MOT</span></button></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">What we check</span><h2 style="margin-top:.8rem">Six areas, <em>every test</em></h2></div></div><div class="chk">${chk}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
