"use strict";
/**
 * listings (estate agent, real 3D): an airy property-portal layout. A search strip (buy or rent, bedrooms, max price) filters the
 * property cards live, beside a turnable 3D house. Fonts: Crimson Pro + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"], ["CrimsonPro-Bold.ttf", "CrimsonPro-Bold.ttf"], ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(3.2rem,8.6vw,7.6rem);line-height:.94}h2{font-size:clamp(2.4rem,5vw,4.2rem);line-height:1}h3{font-size:1.6rem}
h1 em,h2 em{color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,50px)}.hero .wrap{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.hero .gl3d{max-width:430px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(20,60,40,.25))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.srch{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:.8rem;align-items:end;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:1rem;box-shadow:0 14px 40px rgba(20,50,35,.1);margin-top:-8px}
.srch .seg{display:flex;border:1px solid var(--line);border-radius:12px;overflow:hidden}.srch .seg button{font:700 .9rem var(--sans);border:0;background:transparent;color:var(--ink);padding:.8rem 1.1rem;cursor:pointer}.srch .seg button[aria-pressed=true]{background:var(--ink);color:#fff}
.srch label{display:grid;gap:.3rem;font:700 .72rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.srch select{font:400 1rem var(--sans);padding:.75rem;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink)}
@media(max-width:820px){.srch{grid-template-columns:1fr 1fr}.srch .seg{grid-column:1/-1}}
.cnt{margin:1.4rem 0 1rem;color:var(--muted)}
.pg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.pr{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden;display:grid;align-content:start}.pr .ph{aspect-ratio:4/3;background:#E7EFE9;position:relative}.pr .ph img{width:100%;height:100%;object-fit:contain;padding:1rem}.pr .tg{position:absolute;left:.7rem;top:.7rem;display:flex;gap:.3rem;flex-wrap:wrap}.pr .tg span{background:#fff;border-radius:99px;font:700 .68rem var(--sans);padding:.2rem .6rem;letter-spacing:.06em;text-transform:uppercase}
.pr .tx{padding:1rem 1.1rem 1.2rem;display:grid;gap:.3rem}.pr b.pp{font:700 1.7rem var(--display);color:var(--accent)}.pr h3{font-size:1.25rem;margin:0}.pr p{margin:0;color:var(--muted);font-size:.93rem}.pr .bd{font-size:.85rem;font-weight:700}
@media(max-width:1000px){.pg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.pg{grid-template-columns:minmax(0,1fr)}}
.none{padding:2rem;border:1px dashed var(--line);border-radius:18px;text-align:center;color:var(--muted)}
.svc{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.svc a{display:grid;grid-template-columns:96px 1fr;gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;padding:1rem;background:var(--surface)}.svc img{width:96px;height:96px;object-fit:contain}.svc p{margin:.2rem 0 0;color:var(--muted);font-size:.93rem}@media(max-width:760px){.svc{grid-template-columns:1fr}}
`;
const JS = `
(function () {
  var s = document.querySelector("[data-srch]"); if (!s) return; var cards = [].slice.call(document.querySelectorAll(".pr[data-cat]")), tab = "sale", cnt = document.querySelector(".cnt"), none = document.querySelector(".none");
  var bed = s.querySelector('[name="beds"]'), mx = s.querySelector('[name="max"]');
  function u() { var n = 0, b = +bed.value, m = +mx.value; cards.forEach(function (c) { var ok = c.getAttribute("data-cat") === tab && (!b || +c.getAttribute("data-beds") >= b) && (!m || +c.getAttribute("data-price") <= m); c.hidden = !ok; if (ok) n++; }); cnt.textContent = n + (n === 1 ? " home" : " homes") + " match"; none.hidden = n > 0; }
  function opts() { var rent = tab === "rent", L = rent ? [["Any rent", 0], ["Up to \\u00a31,000", 1000], ["Up to \\u00a31,500", 1500], ["Up to \\u00a32,500", 2500]] : [["Any price", 0], ["Up to \\u00a3200k", 200000], ["Up to \\u00a3400k", 400000], ["Up to \\u00a3700k", 700000]]; mx.innerHTML = L.map(function (o) { return '<option value="' + o[1] + '">' + o[0] + "</option>"; }).join(""); }
  [].slice.call(s.querySelectorAll(".seg button")).forEach(function (b) { b.addEventListener("click", function () { [].slice.call(s.querySelectorAll(".seg button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); tab = b.getAttribute("data-t"); opts(); u(); }); });
  bed.addEventListener("change", u); mx.addEventListener("change", u); opts(); u();
})();
`;
module.exports = R.make({
  name: "listings", themeColor: "#FBFAF6", fonts: FONTS, preload: ["assets/fonts/CrimsonPro-Regular.ttf"], js: JS,
  vars: { bg: "#FBFAF6", surface: "#FFFFFF", ink: "#12251E", muted: "#5A6B63", line: "#DCE5DF", accent: "#1F6B52", onaccent: "#FFFFFF", c2: "#D9A441", c3: "#1F6B52", rad: "18px", display: '"Crimson Pro",Georgia,serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(251,250,246,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const props = pack.cats.filter((c) => c.id === "sale" || c.id === "rent").flatMap((c) => c.items.map((i) => ({ ...i, cat: c.id, art: i.art || c.art }))).map((i) => `<article class="pr" data-cat="${i.cat}" data-beds="${i.beds}" data-price="${i.price}"><div class="ph">${img(i.art, i.n, { w: 600, h: 450, hint: B.hintOf(pack, i) })}<div class="tg">${i.tags.map((x) => `<span>${x}</span>`).join("")}</div></div><div class="tx"><b class="pp">${K.strip(i.meta)}</b><h3>${i.n}</h3><p>${i.d}</p><span class="bd">${i.beds ? i.beds + " bed" : "Studio"}</span></div></article>`).join("");
    const svc = pack.cats.filter((c) => c.id === "sell" || c.id === "landlord").map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 200, h: 200, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p></div>${model3d(pack, "house", "villa", "A family house", { c1: "#1F6B52", c2: "#D9A441", hint: "a family house" })}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><form class="srch" data-srch onsubmit="return false"><div class="seg"><button type="button" data-t="sale" aria-pressed="true">Buy</button><button type="button" data-t="rent" aria-pressed="false">Rent</button></div><label>Bedrooms<select name="beds"><option value="0">Any</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label><label>Price<select name="max"></select></label><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a></form><p class="cnt" aria-live="polite"></p><div class="pg">${props}</div><p class="none" hidden>No homes match. Call us, as many of our homes are not listed online yet.</p></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">Selling <em>or letting</em>?</h2></div></div><div class="svc">${svc}</div></div></section>`;
  },
});
