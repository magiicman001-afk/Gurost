"use strict";
/**
 * cocktail (restaurant/bar, real 3D): midnight navy with neon pink and cyan. A turnable 3D coupe whose drink colour you change with
 * "mix your own" chips, glowing live-border drink cards, a neon sign headline. Fonts: Poiret One + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["PoiretOne-Regular.ttf", "PoiretOne-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["PoiretOne-OFL.txt", "OFL-PoiretOne.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Poiret One";src:url(fonts/PoiretOne-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.02em}h1{font-size:clamp(3.2rem,9vw,8rem);line-height:.95}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1}h3{font-size:1.6rem}
h1 em,h2 em{font-style:normal;color:var(--accent);text-shadow:0 0 24px rgba(255,61,154,.7),0 0 60px rgba(255,61,154,.35)}.eyebrow{color:var(--c2);letter-spacing:.24em}
.hero{position:relative;overflow:hidden;padding:clamp(110px,12vw,150px) 0 clamp(40px,6vw,70px);background:radial-gradient(ellipse 45% 50% at 75% 50%,rgba(255,61,154,.28),transparent 70%),radial-gradient(ellipse 40% 50% at 20% 90%,rgba(61,224,255,.18),transparent 70%)}
.hero .wrap{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}
.hero .gl3d{max-width:520px;justify-self:center;filter:drop-shadow(0 0 60px rgba(255,61,154,.35))}
.ring{position:absolute;left:68%;top:50%;width:min(60vw,620px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(61,224,255,.4);box-shadow:0 0 50px rgba(61,224,255,.2),inset 0 0 50px rgba(255,61,154,.15);pointer-events:none;animation:rg 9s ease-in-out infinite}@keyframes rg{50%{transform:translate(-50%,-50%) scale(1.06)}}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}.ring{left:50%;top:62%}}
.mix{display:grid;grid-template-columns:1fr 1fr;gap:clamp(20px,5vw,70px);align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:clamp(20px,4vw,50px)}.mix .gl3d{max-width:380px;justify-self:center}
.mix .sw{display:flex;flex-wrap:wrap;gap:.6rem;margin:1.2rem 0}.mix button{font:700 .9rem var(--sans);color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:99px;padding:.6rem 1rem;cursor:pointer;display:inline-flex;gap:.5rem;align-items:center}.mix button i{width:.9rem;height:.9rem;border-radius:50%;background:var(--sw)}.mix button[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 18px rgba(255,61,154,.4)}
.mix .nt{min-height:3.4em;color:var(--muted)}.mix .nt b{color:var(--ink)}
@media(max-width:820px){.mix{grid-template-columns:1fr}}
.dr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.dc{background:var(--surface);border-radius:18px;padding:1.4rem;display:grid;gap:.6rem;--rad:18px}.dc .ph{aspect-ratio:4/3;border-radius:12px;overflow:hidden}.dc .ph img{width:100%;height:100%;object-fit:cover}.dc p{margin:0;color:var(--muted)}.dc b{color:var(--c2)}
@media(max-width:900px){.dr{grid-template-columns:1fr}}
.night{display:flex;gap:clamp(14px,3vw,40px);flex-wrap:wrap;justify-content:space-between;border-block:1px solid var(--line);padding:1.4rem 0}.night div{min-width:9rem}.night b{display:block;font:2.2rem var(--display);color:var(--accent);text-shadow:0 0 20px rgba(255,61,154,.5)}.night span{color:var(--muted);font-size:.9rem}
`;
const JS = `
(function () {
  var m = document.querySelector("[data-mix]"); if (!m) return;
  var N = {}, g = m.querySelector(".gl3d"), nt = m.querySelector(".nt");
  [].slice.call(m.querySelectorAll("button")).forEach(function (b) {
    b.addEventListener("click", function () {
      [].slice.call(m.querySelectorAll("button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var c = b.getAttribute("data-c"); if (g && g.gl3d) g.gl3d.colors(null, c, null);
      nt.innerHTML = "<b>" + b.getAttribute("data-n") + ".</b> " + b.getAttribute("data-d");
    });
  });
})();
`;
module.exports = R.make({
  name: "cocktail", themeColor: "#0A0B1A", fonts: FONTS, preload: ["assets/fonts/PoiretOne-Regular.ttf"], js: JS,
  vars: { bg: "#0A0B1A", surface: "#14152B", ink: "#F3F1FA", muted: "#A9A7C2", line: "rgba(243,241,250,.15)", accent: "#FF3D9A", onaccent: "#16030C", c2: "#3DE0FF", c3: "#FF3D9A", display: '"Poiret One","Playfair Display",Georgia,serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(10,11,26,.9)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const mixes = [["#F0A23B", "Old fashioned", "Bourbon, maple and bitters, smoked at the table."], ["#FF3D6E", "Cherry sour", "Tart cherry, lemon and a silky egg-white top."], ["#7AE582", "Garden spritz", "Cucumber, elderflower and sparkling wine over ice."], ["#3DB6FF", "Blue lagoon", "Gin, citrus and a splash of blue curaçao."]];
    const btn = mixes.map(([c, n, d], i) => `<button type="button" data-c="${c}" data-n="${n}" data-d="${d}" aria-pressed="${i === 0}" style="--sw:${c}"><i></i>${n}</button>`).join("");
    const dr = pack.cats.find((c) => c.id === "drinks");
    const cards = dr.items.slice(0, 3).map((i, k) => `<article class="dc live halo" data-reveal data-delay="${k * 80}"><div class="ph">${img(i.art || dr.art, i.n, { w: 600, h: 450, hint: B.hintOf(pack, i) })}</div><h3>${i.n}</h3><p>${i.d}</p><b>${K.strip(i.meta)}</b></article>`).join("");
    return `<section class="hero"><span class="ring" aria-hidden="true"></span><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "coupe", "cocktail", "A cocktail in a coupe glass", { c1: "#FF3D9A", c2: "#F0A23B", lum: 2, hint: "a cocktail" })}</div></section>
<section class="sec"><div class="wrap"><div class="mix" data-mix data-reveal><div><span class="eyebrow">Mix your own</span><h2 style="margin:.8rem 0 .6rem">Pick <em>a pour</em></h2><div class="sw">${btn}</div><p class="nt" aria-live="polite"><b>${mixes[0][1]}.</b> ${mixes[0][2]}</p></div>${model3d(pack, "coupe", "cocktail", "A coupe glass you can turn", { c1: "#FF3D9A", c2: "#F0A23B", yaw: 0.2, lum: 2 })}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${dr.name}</span><h2 style="margin-top:.8rem">Tonight's <em>pours</em></h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="dr">${cards}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="night" data-reveal><div><b>${t("hours_weekdays")}</b><span>Mon to Fri</span></div><div><b>${t("hours_saturday")}</b><span>Saturday</span></div><div><b>${t("hours_sunday")}</b><span>Sunday</span></div></div></div></section>`;
  },
});
