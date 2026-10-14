"use strict";
/**
 * checkup (clinic, real 3D): a warm cream and coral layout with a turnable 3D medical cross and a three-question "find my
 * treatment" guide that recommends a treatment, an earliest slot and pre-fills the booking form. Fonts: Bricolage Grotesque +
 * Lora (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Regular.ttf"], ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
body{font-family:"Lora",Georgia,serif}.btn,.eyebrow,.chips,.mh .eyebrow{font-family:var(--display)}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.035em}h1{font-size:clamp(2.7rem,7vw,6rem);line-height:.98}h2{font-size:clamp(2rem,4.2vw,3.4rem);line-height:1.02}h3{font-size:1.25rem}
h1 em,h2 em{color:var(--accent);font-family:"Lora",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:-.02em}.eyebrow{color:var(--accent);letter-spacing:.12em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(160,60,40,.3))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.qz{background:var(--ink);color:#FBF5EE;border-radius:28px;padding:clamp(22px,4vw,54px);display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(20px,4vw,56px)}.qz h2{color:#fff}.qz p{color:#E8D9CC}.qz .prog{display:flex;gap:.4rem;margin-top:1.4rem}.qz .prog i{flex:1;height:5px;border-radius:9px;background:rgba(255,255,255,.2)}.qz .prog i.on{background:var(--c2)}
.qz .st{display:grid;gap:.7rem;align-content:start}.qz .st[hidden]{display:none}.qz .st h3{color:#fff;font-size:1.4rem;margin:0 0 .3rem}.qz .opt{display:flex;justify-content:space-between;align-items:center;gap:1rem;text-align:left;font:700 1.02rem var(--display);color:#fff;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.22);border-radius:16px;padding:1rem 1.2rem;cursor:pointer;transition:background .2s,border-color .2s}.qz .opt:hover,.qz .opt:focus-visible{background:rgba(255,255,255,.16);border-color:var(--c2)}.qz .opt small{font-weight:400;opacity:.7}
.qz .res{background:#fff;color:var(--ink);border-radius:20px;padding:1.4rem;display:grid;gap:.6rem}.qz .res h3{color:var(--ink);font-size:1.6rem;margin:0}.qz .res p{color:var(--muted);margin:0}.qz .res .meta{display:flex;gap:1.2rem;flex-wrap:wrap;font:700 .85rem var(--display);color:var(--accent)}.qz .res .row{display:flex;gap:.7rem;flex-wrap:wrap;margin-top:.4rem}.qz .res .flag{background:#FDE7E1;color:#8C2A17;border-radius:12px;padding:.6rem .8rem;font-size:.9rem}.qz .res .btn:not(.btn-primary){color:var(--ink);border-color:var(--line)}
@media(max-width:820px){.qz{grid-template-columns:minmax(0,1fr)}}
.tc{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.tc div{border-top:3px solid var(--accent);padding-top:1rem}.tc .n{font:700 2.8rem/1 var(--display);color:var(--accent)}.tc p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.tc{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var q = document.querySelector("[data-quiz]"); if (!q) return;
  var steps = [].slice.call(q.querySelectorAll(".st")), bars = [].slice.call(q.querySelectorAll(".prog i")), ans = [], i = 0;
  var T = JSON.parse(q.getAttribute("data-quiz"));
  function go(n) { i = n; steps.forEach(function (s, k) { s.hidden = k !== n; }); bars.forEach(function (b, k) { b.classList.toggle("on", k <= n); }); }
  function done() {
    var t = T.t[ans[0]], w = T.w[ans[1]], r = q.querySelector(".res");
    r.querySelector("h3").textContent = t.n; r.querySelector(".d").textContent = t.d; r.querySelector('[data-k="p"]').textContent = t.p; r.querySelector('[data-k="w"]').textContent = w.n;
    r.querySelector(".flag").hidden = ans[1] !== 0 || ans[0] !== 0;
    var ta = document.querySelector("#order textarea"); if (ta && !ta.value) ta.value = "Booking request: " + t.n + ", " + w.n.toLowerCase() + ".";
    steps.forEach(function (s) { s.hidden = true; }); r.hidden = false; bars.forEach(function (b) { b.classList.add("on"); });
  }
  [].slice.call(q.querySelectorAll(".opt")).forEach(function (b) { b.addEventListener("click", function () { var s = +b.closest(".st").getAttribute("data-s"); ans[s] = +b.getAttribute("data-v"); if (s < steps.length - 1) go(s + 1); else done(); }); });
  var re = q.querySelector("[data-redo]"); if (re) re.addEventListener("click", function () { ans = []; q.querySelector(".res").hidden = true; go(0); });
  go(0);
})();
`;
module.exports = R.make({
  name: "checkup", themeColor: "#FBF5EE", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#FBF5EE", surface: "#FFFFFF", ink: "#2A1B16", muted: "#6B5B52", line: "rgba(42,27,22,.14)", accent: "#C2412D", onaccent: "#FFFFFF", c1: "#D9553F", c2: "#FFB4A3", c3: "#7A1F12", rad: "14px", display: '"Bricolage Grotesque",system-ui,sans-serif', sans: '"Lora",Georgia,serif', header: "rgba(251,245,238,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const T = { t: [
      { n: "Emergency appointment", d: "Pain needs a proper look. We will ease it first, then explain your options and the price.", p: "from £75" },
      { n: "Smile design consultation", d: "A free digital preview of whitening, bonding or aligners, so you can see the result first.", p: "free preview" },
      { n: "New patient check-up", d: "A full exam, x-rays if needed and a clear written plan with prices before we begin.", p: "£49" },
      { n: "Dental implant consultation", d: "A 3D scan and a fixed-price plan for a permanent replacement tooth.", p: "from £120 consult" }], w: [{ n: "Today" }, { n: "This week" }, { n: "No rush" }] };
    const opts = (s, items) => items.map(([a, b], i) => `<button type="button" class="opt" data-v="${i}">${a}<small>${b}</small></button>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><span class="n">${v}${s}</span><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#find"><span>Find my treatment</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "cross", "shield", "A medical cross you can turn", { c1: "#D9553F", c2: "#FFB4A3", lum: 1.2, hint: "a health shield" })}</div></section>
<section class="sec" id="find" style="padding-top:0"><div class="wrap"><div class="qz" data-quiz='${JSON.stringify(T)}' data-reveal><div><span class="eyebrow" style="color:var(--c2)">Not sure where to start?</span><h2 style="margin-top:.8rem">Find the <em style="color:var(--c2)">right visit</em></h2><p>Two quick questions and we will suggest a treatment, an earliest time and fill in your booking form.</p><div class="prog"><i></i><i></i></div></div><div><div class="st" data-s="0"><h3>What brings you in?</h3>${opts(0, [["Pain or a broken tooth", "Needs attention"], ["Improve how my smile looks", "Whitening, bonding, aligners"], ["A routine check-up", "Exam and clean"], ["A missing tooth", "Implants and bridges"]])}</div><div class="st" data-s="1" hidden><h3>When would suit you?</h3>${opts(1, [["As soon as possible", "Today"], ["Within a few days", "This week"], ["Whenever works", "No rush"]])}</div><div class="res" hidden><span class="eyebrow">We suggest</span><h3></h3><p class="d"></p><div class="meta"><span data-k="p"></span><span>Earliest: <b data-k="w"></b></span></div><div class="flag" hidden>Swelling, bleeding that will not stop or an injury to the face needs urgent care. Please call us now on {{phone}}.</div><div class="row"><a class="btn btn-primary" href="#order"><span>Book this</span></a><button type="button" class="btn" data-redo><span>Start again</span></button></div></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="tc">${nums}</div></div></section>`;
  },
});
