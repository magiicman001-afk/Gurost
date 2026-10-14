"use strict";
/**
 * tour (estate agent, real 3D): a neighbourhood explorer. Tap an area to see its sample price, commute and a short description; a
 * turnable 3D tower block and key sit alongside. Fonts: Red Hat Mono + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["RedHatMono-Regular.ttf", "RedHatMono-Regular.ttf"], ["RedHatMono-Bold.ttf", "RedHatMono-Bold.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["RedHatMono-OFL.txt", "OFL-RedHatMono.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Red Hat Mono";src:url(fonts/RedHatMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Red Hat Mono";src:url(fonts/RedHatMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.04em}h1{font-size:clamp(2.8rem,7.4vw,6.4rem);line-height:.98}h2{font-size:clamp(2rem,4.4vw,3.6rem);line-height:1.02}h3{font-size:1.25rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--display);color:var(--accent);letter-spacing:.12em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,50px)}.hero .wrap{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center;filter:drop-shadow(0 22px 26px rgba(10,60,60,.3))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.map{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(16px,3vw,40px);align-items:start}.map .chs{display:grid;gap:.5rem}.map .chs button{display:flex;justify-content:space-between;gap:1rem;font:700 1rem var(--display);text-align:left;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);padding:.9rem 1.1rem;cursor:pointer}.map .chs button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}.map .chs small{opacity:.6;font-weight:400}
.map .panel{background:var(--ink);color:#EAF4F2;border-radius:22px;padding:clamp(20px,3.4vw,44px);display:grid;grid-template-columns:minmax(0,1fr);gap:1rem;position:sticky;top:90px}.map .panel h2{margin:0;color:#fff}.map .panel p{margin:0;color:#B7CFCB}.map .kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.map .kv div{border-top:1px solid rgba(255,255,255,.25);padding-top:.6rem}.map .kv b{display:block;font:700 clamp(1.2rem,3vw,1.9rem)/1.1 var(--display);color:#7FE3D4;overflow-wrap:anywhere}.map .kv span{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:#9FBFBA}.map .panel .ph{aspect-ratio:16/8;display:grid;place-items:center;background:rgba(255,255,255,.07);border-radius:14px}.map .panel img{height:88%;max-width:100%;object-fit:contain}.map .sm{font-size:.75rem;color:#7FA7A1}
@media(max-width:820px){.map{grid-template-columns:minmax(0,1fr)}.map .panel{position:relative;top:0}}
.fl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.fl a{display:grid;grid-template-columns:110px 1fr;gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.fl img{width:110px;height:110px;object-fit:contain}.fl p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}.fl b{color:var(--accent)}@media(max-width:760px){.fl{grid-template-columns:1fr}}
`;
const JS = `
(function () {
  var m = document.querySelector("[data-map]"); if (!m) return; var D = JSON.parse(m.getAttribute("data-map")), p = m.querySelector(".panel");
  function show(i) { var d = D[i]; p.querySelector("h2").textContent = d.n; p.querySelector("p").textContent = d.t; p.querySelector('[data-k="p"]').textContent = d.p; p.querySelector('[data-k="c"]').textContent = d.c; p.querySelector('[data-k="s"]').textContent = d.s; }
  [].slice.call(m.querySelectorAll(".chs button")).forEach(function (b, i) { b.addEventListener("click", function () { [].slice.call(m.querySelectorAll(".chs button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); show(i); }); });
  show(0);
})();
`;
module.exports = R.make({
  name: "tour", themeColor: "#EAF2EF", fonts: FONTS, preload: ["assets/fonts/RedHatMono-Bold.ttf"], js: JS,
  vars: { bg: "#EAF2EF", surface: "#FFFFFF", ink: "#0C3A3A", muted: "#4C6A68", line: "rgba(12,58,58,.16)", accent: "#0F8A85", onaccent: "#FFFFFF", c2: "#7FE3D4", c3: "#0F8A85", rad: "18px", display: '"Red Hat Mono",ui-monospace,monospace', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(234,242,239,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const info = [["A leafy student-and-family favourite with a big park, cafes and strong schools.", "£285k", "12 min", "Good"], ["A village feel with parks and a lake close to town.", "£420k", "15 min", "Excellent"], ["Independent shops, bars and Victorian terraces.", "£265k", "10 min", "Good"], ["Lively, young and well connected, close to the university.", "£210k", "8 min", "Mixed"], ["A market-town feel, with good trains and strong schools.", "£340k", "25 min", "Excellent"], ["A diverse, affordable area with new developments.", "£195k", "14 min", "Improving"], ["Riverside flats, offices and nightlife in the heart of town.", "£189k", "2 min", "Limited"], ["Quiet, green and leafy with large family homes.", "£510k", "20 min", "Excellent"]];
    const D = pack.areas.map((n, i) => ({ n, t: info[i][0], p: info[i][1], c: info[i][2], s: info[i][3] }));
    const chs = D.map((d, i) => `<button type="button" aria-pressed="${i === 0}">${d.n}<small>${d.p}</small></button>`).join("");
    const fl = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Find <em>your</em> neighbourhood.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "tower", "flat", "A tower block you can turn", { c1: "#0F8A85", c2: "#7FE3D4", hint: "an apartment block" })}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="map" data-map='${JSON.stringify(D).replace(/'/g, "&#39;")}' data-reveal><div class="chs">${chs}</div><div class="panel"><div class="ph">${img("key", "A house key", { w: 400, h: 220, hint: "a house key" })}</div><h2></h2><p></p><div class="kv"><div><b data-k="p"></b><span>Average price</span></div><div><b data-k="c"></b><span>To centre</span></div><div><b data-k="s"></b><span>Schools</span></div></div><span class="sm">Sample figures for illustration only.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">How we <em>help</em></h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="fl">${fl}</div></div></section>`;
  },
});
