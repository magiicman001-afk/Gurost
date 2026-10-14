"use strict";
/**
 * shotlist (photography and weddings, real 3D): a darkroom look (charcoal and safelight amber) with a turnable 3D camera and a "plan
 * your shot list" contact sheet: tap the photographs you must have (12 classic wedding moments), and the tool adds up the time they
 * need and suggests how many hours of coverage to book, then pre-fills the enquiry with the list. Fonts: Bricolage Grotesque + JetBrains
 * Mono (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["JetBrainsMono-Regular.ttf", "JetBrainsMono-Regular.ttf"], ["JetBrainsMono-Bold.ttf", "JetBrainsMono-Bold.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["JetBrainsMono-OFL.txt", "OFL-JetBrainsMono.txt"]];
const css = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/JetBrainsMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/JetBrainsMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.02em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.08}h3{font-size:1.15rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--sans);color:var(--accent);letter-spacing:.18em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.cs{background:#15110F;border:1px solid #3A2F2A;border-radius:10px;padding:clamp(14px,3vw,30px);box-shadow:0 0 0 6px #0D0B0A inset}.cs .holes{height:14px;background:radial-gradient(circle,#0D0B0A 0 4px,transparent 5px) 0 0/22px 14px repeat-x;margin:0 -6px 12px}
.cs .sheet{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(6px,1.4vw,12px)}.cs .sheet button{position:relative;aspect-ratio:1.7;border:1px solid #4A3C34;background:#241C18;color:#E7D8C8;border-radius:4px;padding:.55rem;text-align:left;cursor:pointer;font:400 clamp(.64rem,1.7vw,.8rem)/1.25 var(--sans);display:flex;flex-direction:column;justify-content:space-between;min-height:70px}
.cs .sheet button b{font:700 .66rem var(--sans);color:#9C8978}.cs .sheet button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#1A0F08}.cs .sheet button[aria-pressed=true] b{color:#4A2A10}.cs .sheet button[aria-pressed=true]:after{content:"\\2713";position:absolute;right:.5rem;top:.35rem;font-weight:700}
@media(max-width:640px){.cs .sheet{grid-template-columns:repeat(3,minmax(0,1fr))}.cs .sheet button{font-size:.62rem;padding:.4rem;overflow-wrap:anywhere;aspect-ratio:1.45}}
.cs .sum{margin-top:clamp(14px,2.4vw,22px);display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;gap:clamp(10px,2vw,22px);align-items:end;color:#E7D8C8}.cs .sum div b{display:block;font:700 clamp(1.5rem,4vw,2.4rem)/1 var(--display);color:var(--accent)}.cs .sum span{font:400 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:#9C8978}
@media(max-width:700px){.cs .sum{grid-template-columns:repeat(3,minmax(0,1fr))}.cs .sum .btn{grid-column:1/-1;justify-content:center}}
.cs .bar{height:8px;border-radius:99px;background:#2E241F;overflow:hidden;margin-top:14px}.cs .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),#FFD27A);transition:width .5s}.cs .tip{margin:.9rem 0 0;color:#C9B8A6;font-size:.86rem}.cs .note{display:block;margin-top:.6rem;font-size:.74rem;color:#8A7867}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 2.8rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.9rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-shots]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-shots")), bs = [].slice.call(c.querySelectorAll(".sheet button")), line = "";
  function calc() {
    var sel = bs.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }), mins = 0, names = [];
    sel.forEach(function (b) { var i = +b.getAttribute("data-i"); mins += D[i][1]; names.push(D[i][0]); });
    var hrs = sel.length ? Math.max(4, Math.min(10, Math.ceil((mins + 150) / 60 / 2) * 2)) : 0;
    c.querySelector("[data-n]").textContent = sel.length; c.querySelector("[data-m]").textContent = mins; c.querySelector("[data-h]").textContent = hrs ? hrs + "h" : "-";
    c.querySelector(".bar i").style.width = Math.min(100, sel.length / D.length * 100) + "%";
    c.querySelector(".tip").textContent = !sel.length ? "Tap the moments you cannot do without." : sel.length < 5 ? "A short, simple list. A half day covers it." : sel.length < 9 ? "A good balance. Most couples book " + hrs + " hours for this." : "A full list. Add a second photographer so nothing is rushed.";
    line = sel.length ? "My must-have shots: " + names.join(", ") + ". Suggested coverage " + hrs + " hours. My date is: " : "";
  }
  bs.forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); calc(); }); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line || "I would like to check a date. My date is: "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const SHOTS = [["Getting ready", 25], ["First look", 15], ["The rings", 10], ["Ceremony kiss", 10], ["Confetti line", 10], ["Family formals", 30], ["Couple portraits", 30], ["Golden hour", 20], ["Cake cutting", 10], ["First dance", 10], ["Speeches", 15], ["Sparkler exit", 10]];
module.exports = R.make({
  name: "shotlist", themeColor: "#15110F", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#1B1512", surface: "#241C18", ink: "#F3E8DB", muted: "#B5A391", line: "#3A2F2A", accent: "#FF9D3C", onaccent: "#1A0F08", c1: "#FF9D3C", c2: "#7FC4D6", c3: "#15110F", rad: "10px", display: '"Bricolage Grotesque",system-ui,sans-serif', sans: '"JetBrains Mono",ui-monospace,monospace', header: "rgba(27,21,18,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const sheet = SHOTS.map(([n, m], i) => `<button type="button" data-i="${i}" aria-pressed="false"><b>${String(i + 1).padStart(2, "0")}</b>${n}</button>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Shoot <em>what matters</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#shots"><span>Plan my shot list</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "camera", "camera", "A camera you can turn", { c1: "#FF9D3C", c2: "#7FC4D6", c3: "#15110F", hint: "a camera" })}</div></section>
<section class="sec" id="shots" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Shot list planner</span><h2 style="margin-top:.8rem">Tap the photographs <em>you must have</em></h2></div></div><div class="cs" data-shots='${JSON.stringify(SHOTS)}' data-reveal><div class="holes"></div><div class="sheet">${sheet}</div><div class="bar"><i></i></div><p class="tip"></p><div class="sum"><div><b data-n>0</b><span>moments</span></div><div><b data-m>0</b><span>minutes</span></div><div><b data-h>-</b><span>coverage</span></div><button type="button" class="btn btn-primary" data-book><span>Send my list</span></button></div><span class="note">A guide only. We plan the real timeline together, around your venue and the light.</span></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
