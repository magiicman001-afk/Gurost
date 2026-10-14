"use strict";
/**
 * tasting (restaurant, real 3D): editorial paper layout like a printed tasting-menu card. A sticky stage on the left shows a 3D model
 * that changes as each course scrolls into view; the right side is a long list of numbered courses. Fonts: Lora + DM Mono (SIL OFL).
 */
const R = require("./rest-kit");
const FONTS = [["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Bold.ttf", "Lora-Bold.ttf"], ["Lora-Italic.ttf", "Lora-Italic.ttf"], ["DMMono-Regular.ttf", "DMMono-Regular.ttf"], ["Lora-OFL.txt", "OFL-Lora.txt"], ["DMMono-OFL.txt", "OFL-DMMono.txt"]];
const css = `
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"DM Mono";src:url(fonts/DMMono-Regular.ttf) format("truetype");font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(3rem,8vw,7.2rem);line-height:.98}h2{font-size:clamp(2.2rem,4.6vw,3.8rem);line-height:1.04}h3{font-size:1.6rem}
h1 em,h2 em{color:var(--accent)}.eyebrow{font-family:var(--mono);letter-spacing:.14em;color:var(--accent);text-transform:uppercase}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(30px,5vw,60px);border-bottom:1px solid var(--ink)}.hero .wrap{display:grid;grid-template-columns:1.4fr .6fr;gap:clamp(20px,4vw,60px);align-items:end}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap}
.hero .card{font-family:var(--mono);font-size:.85rem;line-height:1.7;border:1px solid var(--ink);padding:1.2rem}.hero .card b{display:block;text-transform:uppercase;letter-spacing:.14em;margin-bottom:.4rem;color:var(--accent)}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.cs{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(20px,5vw,80px);align-items:start}.stage{position:sticky;top:90px;aspect-ratio:1;border:1px solid var(--ink);background:radial-gradient(circle at 50% 38%,#fff,#E9E0CF 80%);display:grid}
.stage .gl3d{grid-area:1/1;width:100%}.stage .gl3d[hidden]{display:none}.stage .lab{position:absolute;left:14px;bottom:10px;font:.75rem var(--mono);letter-spacing:.14em;text-transform:uppercase;z-index:2}
.course{padding:clamp(26px,4vw,56px) 0;border-top:1px solid var(--ink);min-height:38vh}.course:first-child{border-top:0;padding-top:0}.course .no{font:.8rem var(--mono);letter-spacing:.14em;color:var(--accent)}.course h2{margin:.5rem 0 .6rem}.course .bl{font-style:italic;color:var(--muted);margin:0 0 1rem}.course ol{list-style:none;margin:0;padding:0;font-size:1.05rem}.course li{display:flex;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px dotted var(--line)}.course li small{display:block;color:var(--muted)}.course li span:last-child{font-family:var(--mono);white-space:nowrap}
@media(max-width:820px){.cs{grid-template-columns:1fr}.stage{position:relative;top:0;max-width:380px;margin:auto}.course{min-height:0}}
.pair{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;border:1px solid var(--ink)}.pair div{padding:1.4rem;border-right:1px solid var(--ink);font-size:1.05rem}.pair div:last-child{border:0}.pair b{display:block;font:3rem/1 var(--display);color:var(--accent)}@media(max-width:760px){.pair{grid-template-columns:1fr}.pair div{border-right:0;border-bottom:1px solid var(--ink)}}
`;
const JS = `
(function () {
  var st = document.querySelector(".stage"); if (!st) return;
  var boxes = [].slice.call(st.querySelectorAll(".gl3d")), cs = [].slice.call(document.querySelectorAll(".course")), lab = st.querySelector(".lab");
  function show(i) { boxes.forEach(function (b, k) { b.hidden = k !== i; }); if (lab && cs[i]) lab.textContent = cs[i].getAttribute("data-lab"); window.dispatchEvent(new Event("resize")); }
  show(0);
  if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) show(cs.indexOf(e.target)); }); }, { rootMargin: "-45% 0px -45% 0px" }); cs.forEach(function (c) { io.observe(c); }); }
})();
`;
module.exports = R.make({
  name: "tasting", themeColor: "#F3EEE4", fonts: FONTS, preload: ["assets/fonts/Lora-Regular.ttf"], js: JS,
  vars: { bg: "#F3EEE4", surface: "#FFFFFF", ink: "#1B1A17", muted: "#665F54", line: "#CFC6B4", accent: "#8A2B1D", onaccent: "#FFFFFF", c2: "#C9A24B", c3: "#8A2B1D", rad: "0", display: '"Lora",Georgia,serif', sans: '"Lora",Georgia,serif', header: "rgba(243,238,228,.92)" },
  css: css + `:root{--mono:"DM Mono",ui-monospace,monospace}.btn{border-radius:0}.btn-primary{border-radius:0}`,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const M = { small: ["wineglass", "wineglass"], fire: ["cloche", "cloche"], sweet: ["pizza", "tart"], drinks: ["coupe", "cocktail"] };
    const models = pack.cats.map((c, k) => model3d(pack, M[c.id][0], M[c.id][1], c.name, { c1: "#8A2B1D", c2: "#C9A24B", hint: c.name }).replace("class=\"gl3d \"", "class=\"gl3d\"")).join("");
    const courses = pack.cats.map((c, k) => `<section class="course" data-lab="Course ${K.pad(k + 1)} &middot; ${c.name}" data-reveal><span class="no">Course ${K.pad(k + 1)}</span><h2>${c.name}</h2><p class="bl">${c.blurb}</p><ol>${c.items.map((i) => `<li><span>${i.n}<small>${i.d.split(".")[0]}.</small></span><span>${K.strip(i.meta)}</span></li>`).join("")}</ol></section>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div><div class="card"><b>This week</b>${t("hours_weekdays")} Mon to Fri<br>${t("hours_saturday")} Saturday<br>${t("hours_sunday")} Sunday<br>${t("address_line1")}</div></div></section>
<section class="sec"><div class="wrap"><div class="cs"><div class="stage">${models}<span class="lab"></span></div><div>${courses}</div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pair">${pack.sup.map((s, i) => `<div data-reveal><b>${i + 1}</b>${s}</div>`).join("")}</div></div></section>`;
  },
});
