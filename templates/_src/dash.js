"use strict";
/**
 * dash (garage, real 3D): a night-time dashboard look with a scroll-turned 3D spanner and a "what does my warning light mean?" decoder:
 * tap one of six glowing dashboard lights to see how urgent it is, what it means and what to do, then book a check that pre-fills the
 * form. Fonts: Red Hat Mono + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["RedHatMono-Regular.ttf", "RedHatMono-Regular.ttf"], ["RedHatMono-Bold.ttf", "RedHatMono-Bold.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["RedHatMono-OFL.txt", "OFL-RedHatMono.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"Red Hat Mono";src:url(fonts/RedHatMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Red Hat Mono";src:url(fonts/RedHatMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(2.4rem,6.2vw,5rem);line-height:1.04}h2{font-size:clamp(1.8rem,3.8vw,2.9rem);line-height:1.1}h3{font-size:1.1rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--display);color:var(--accent);letter-spacing:.14em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center;filter:drop-shadow(0 24px 30px rgba(255,176,32,.18))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.dk{border:1px solid var(--line);border-radius:26px;background:radial-gradient(ellipse at 50% 0,#1B2330 0,#0F141C 70%);padding:clamp(18px,3vw,38px)}.dk .lights{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:clamp(8px,1.6vw,18px)}.dk .lights button{display:grid;place-items:center;aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.14);background:#0B0E14;color:var(--ink);cursor:pointer;padding:18%;transition:all .25s}.dk .lights button svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:.55}.dk .lights button[data-sev=amber]{color:#FFB020}.dk .lights button[data-sev=red]{color:#FF4D4D}.dk .lights button[aria-pressed=true]{border-color:currentColor;box-shadow:0 0 28px currentColor,inset 0 0 18px rgba(255,255,255,.06)}.dk .lights button[aria-pressed=true] svg{opacity:1}
.dk .info{margin-top:clamp(18px,3vw,32px);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:clamp(14px,3vw,40px);align-items:start;border-top:1px solid var(--line);padding-top:clamp(16px,2.6vw,28px)}.dk .sev{display:inline-block;font:700 .75rem var(--display);letter-spacing:.1em;text-transform:uppercase;border-radius:99px;padding:.3rem .8rem;margin-bottom:.8rem}.dk .sev.red{background:#4A1B1B;color:#FF8E8E}.dk .sev.amber{background:#46330E;color:#FFC24D}.dk h3{font-size:clamp(1.4rem,3vw,2rem);margin:0 0 .5rem}.dk p{margin:0;color:var(--muted)}.dk ul{margin:0;padding:0;list-style:none;display:grid;gap:.7rem}.dk li{padding-left:1.4rem;position:relative}.dk li:before{content:"";position:absolute;left:0;top:.55em;width:8px;height:8px;border-radius:50%;background:var(--accent)}.dk .btn{margin-top:1.2rem}.dk .note{display:block;margin-top:1rem;font-size:.78rem;color:var(--muted)}
@media(max-width:820px){.dk .info{grid-template-columns:minmax(0,1fr)}}@media(max-width:480px){.dk .lights{grid-template-columns:repeat(3,minmax(0,1fr))}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 2.6rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-dash]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-dash")), bs = [].slice.call(c.querySelectorAll(".lights button")), sev = c.querySelector(".sev"), h = c.querySelector("h3"), p = c.querySelector(".what"), ul = c.querySelector("ul"), bk = c.querySelector("[data-book]"), cur = 0;
  function show(i) {
    cur = i; var d = D[i]; sev.className = "sev " + d.s; sev.textContent = d.s === "red" ? "Stop safely" : "Book a check soon"; h.textContent = d.n; p.textContent = d.m; ul.innerHTML = "";
    d.d.forEach(function (x) { var li = document.createElement("li"); li.textContent = x; ul.appendChild(li); });
    bs.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
  }
  bs.forEach(function (b, i) { b.addEventListener("click", function () { show(i); }); }); show(0);
  bk.addEventListener("click", function () {
    var ta = document.querySelector("#order textarea"); if (ta) ta.value = "Warning light on: " + D[cur].n + ". Please check the car.";
    var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
`;
const ICONS = [
  '<path d="M8 20h5v-6h10v-4h8v4h5l4 4v10l-4 4H15l-5-5v-3H8z"/>',
  '<path d="M6 28h22l8-8h6M12 28v10h20V28"/><path d="M38 28c-3 4-3 6 0 6s3-2 0-6z"/>',
  '<rect x="6" y="16" width="36" height="22" rx="3"/><path d="M14 16v-4h6v4M28 16v-4h6v4M12 27h8M30 27h8M34 23v8"/>',
  '<circle cx="24" cy="24" r="12"/><path d="M24 17v9M24 30v2"/><path d="M8 14c-3 6-3 14 0 20M40 14c3 6 3 14 0 20"/>',
  '<path d="M14 36V18c0-6 4-10 10-10s10 4 10 10v18l-4-3-3 3-3-3-3 3-3-3z"/><path d="M24 15v10M24 30v2"/>',
  '<path d="M20 30V12a4 4 0 0 1 8 0v18a8 8 0 1 1-8 0z"/><path d="M24 18v14"/><path d="M32 14h6M32 20h6"/>',
];
module.exports = R.make({
  name: "dash", themeColor: "#0B0E14", fonts: FONTS, preload: ["assets/fonts/RedHatMono-Bold.ttf"], js: JS,
  vars: { bg: "#0B0E14", surface: "#141922", ink: "#EEF1F6", muted: "#9AA3B2", line: "rgba(238,241,246,.15)", accent: "#FFB020", onaccent: "#171002", c1: "#FFB020", c2: "#FFD27A", c3: "#111111", rad: "12px", display: '"Red Hat Mono",ui-monospace,monospace', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(11,14,20,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const D = [
      { n: "Engine warning light", s: "amber", m: "The engine or emissions system has logged a fault. A steady light means it can usually wait a little. A flashing light means a misfire.", d: ["Steady: drive gently and book a diagnostic scan this week.", "Flashing: slow down, avoid hard acceleration and get it checked straight away. A misfire can damage the exhaust.", "Do not ignore it. It will fail an MOT."] },
      { n: "Oil pressure warning", s: "red", m: "The engine may not be getting enough oil. Running on can destroy it in minutes.", d: ["Pull over safely and switch the engine off now.", "Do not restart it. Check the oil level once the engine has cooled.", "Call us or your breakdown cover to get the car moved."] },
      { n: "Battery or charging warning", s: "red", m: "The battery is not charging. The cause is often the alternator or its belt, and the car will stop when the battery runs flat.", d: ["Switch off the heater, radio and other extras.", "Drive straight to a garage only if it is close.", "Do not switch the engine off until you arrive. It may not restart."] },
      { n: "Brake warning light", s: "red", m: "The handbrake is on, the brake fluid is low, or there is a fault in the braking system.", d: ["Check the handbrake is fully released.", "If the light stays on, test the brakes gently in a safe place.", "If the pedal feels soft or low, do not drive. Call for recovery."] },
      { n: "Tyre pressure warning", s: "amber", m: "One or more tyres are low on air, or the pressure sensors have a fault.", d: ["Check all four tyres at the next safe stop.", "Inflate to the pressures in the door pillar or handbook.", "If it flashes first and then stays on, the sensor system needs a look."] },
      { n: "Coolant temperature warning", s: "red", m: "The engine is overheating. Driving on can warp the cylinder head and cost thousands.", d: ["Pull over safely and switch the engine off.", "Never open the coolant cap while hot. Wait at least 30 minutes.", "Call us. Topping up and carrying on can hide a leak."] },
    ];
    const btns = D.map((d, i) => `<button type="button" data-sev="${d.s}" aria-label="${d.n}" aria-pressed="false"><svg viewBox="0 0 48 48" aria-hidden="true">${ICONS[i]}</svg></button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const w3d = model3d(pack, "wrench", "plug", "A spanner you can turn", { c1: "#FFB020", c2: "#FFD27A", c3: "#111111", hint: "a spanner" }).replace('data-gl3d=', 'data-scroll data-gl3d=');
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Warning light <em>on</em>? Do not panic.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#lights"><span>Decode my light</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${w3d}</div></section>
<section class="sec" id="lights" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Dashboard decoder</span><h2 style="margin-top:.8rem">What is your car <em>telling you</em>?</h2></div></div><div class="dk" data-dash='${JSON.stringify(D).replace(/'/g, "&#39;")}' data-reveal><div class="lights">${btns}</div><div class="info"><div><span class="sev"></span><h3></h3><p class="what"></p></div><div><ul></ul><button type="button" class="btn btn-primary" data-book><span>Book a check for this</span></button><span class="note">General guidance only. If you feel unsafe, stop and call for help. Your handbook has the final word.</span></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
