"use strict";
/**
 * plain (law firm, real 3D): a friendly white-and-blue layout with a turnable 3D key and a searchable "legal jargon buster" that
 * explains twelve common terms in plain English. Fonts: Arsenal SC + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["ArsenalSC-Regular.ttf", "ArsenalSC-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["ArsenalSC-OFL.txt", "OFL-ArsenalSC.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Arsenal SC";src:url(fonts/ArsenalSC-Regular.ttf) format("truetype");font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em}h1{font-size:clamp(2.8rem,7.4vw,6.4rem);line-height:1}h2{font-size:clamp(2rem,4.4vw,3.6rem);line-height:1.05}h3{font-size:1.4rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.14em;font-weight:700}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center;filter:drop-shadow(0 22px 26px rgba(30,70,150,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.jb{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(18px,4vw,56px);align-items:start}.jb .s{position:sticky;top:96px}.jb input[type=search]{width:100%;box-sizing:border-box;font:400 1.05rem var(--sans);border:2px solid var(--ink);border-radius:14px;padding:.9rem 1.1rem;background:#fff;color:var(--ink);margin-top:1rem}.jb .cnt{font-size:.85rem;color:var(--muted);margin-top:.6rem}
.jb details{border-bottom:1px solid var(--line);padding:1rem 0}.jb summary{cursor:pointer;font:400 1.35rem var(--display);list-style:none;display:flex;justify-content:space-between;gap:1rem}.jb summary::-webkit-details-marker{display:none}.jb summary:after{content:"+";color:var(--accent);font-weight:700}.jb details[open] summary:after{content:"\\2212"}.jb details p{margin:.6rem 0 0;color:var(--muted);max-width:40em}.jb .none{padding:1.4rem 0;color:var(--muted)}
@media(max-width:820px){.jb{grid-template-columns:minmax(0,1fr)}.jb .s{position:static}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:100px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:100px;height:100px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
.pr3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.pr3 div{background:var(--surface);border-radius:20px;padding:1.4rem;border:1px solid var(--line)}.pr3 .n{font:400 2.6rem/1 var(--display);color:var(--accent)}.pr3 p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.pr3{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var j = document.querySelector("[data-jargon]"); if (!j) return; var q = j.querySelector("input"), ds = [].slice.call(j.querySelectorAll("details")), cnt = j.querySelector(".cnt"), none = j.querySelector(".none");
  function u() { var v = q.value.trim().toLowerCase(), n = 0; ds.forEach(function (d) { var m = !v || d.textContent.toLowerCase().indexOf(v) > -1; d.hidden = !m; if (m) n++; }); cnt.textContent = n + " of " + ds.length + " terms"; none.hidden = n > 0; }
  q.addEventListener("input", u); u();
})();
`;
module.exports = R.make({
  name: "plain", themeColor: "#FFFFFF", fonts: FONTS, preload: ["assets/fonts/ArsenalSC-Regular.ttf"], js: JS,
  vars: { bg: "#FFFFFF", surface: "#F2F6FC", ink: "#10213E", muted: "#4F607C", line: "rgba(16,33,62,.15)", accent: "#2459A8", onaccent: "#FFFFFF", c1: "#2459A8", c2: "#E2B14C", c3: "#10213E", rad: "16px", display: '"Arsenal SC",Georgia,serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(255,255,255,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const T = [["Conveyancing", "The legal work of buying or selling a property, from checking the papers to moving the ownership into your name."], ["Exchange of contracts", "The moment both sides sign and swap contracts. From here the sale is legally binding and the moving date is fixed."], ["Completion", "Moving day. The money is paid, the keys are handed over and the property becomes yours."], ["Freehold and leasehold", "Freehold means you own the building and the land. Leasehold means you own it for a set number of years, usually with a ground rent."], ["Probate", "The legal right to deal with someone's money and property after they die."], ["Executor", "The person named in a will to carry out its instructions and settle the estate."], ["Lasting power of attorney", "A document that lets someone you trust make decisions for you if you cannot, about your money or your health."], ["Intestacy", "What happens when someone dies without a valid will. The law, not the family, decides who inherits."], ["Decree nisi (conditional order)", "A court's first step in a divorce, saying you are entitled to divorce. It does not end the marriage yet."], ["Decree absolute (final order)", "The final step that legally ends the marriage."], ["Without prejudice", "Words on a letter or call meaning what is said in a genuine attempt to settle cannot later be used against you in court."], ["Settlement agreement", "A legal deal, usually when leaving a job, in which you agree to a payment and terms, and must have independent advice."]]
      .map(([a, b]) => `<details><summary>${a}</summary><p>${b}</p></details>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><span class="n">${v}${s}</span><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Law without <em>the jargon</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="#jargon"><span>Try the jargon buster</span></a></div></div>${model3d(pack, "key", "folder", "A key you can turn", { c1: "#2459A8", c2: "#E2B14C", hint: "a house key" })}</div></section>
<section class="sec" id="jargon" style="padding-top:0"><div class="wrap"><div class="jb" data-jargon data-reveal><div class="s"><span class="eyebrow">Jargon buster</span><h2 style="margin-top:.8rem">Say it <em>in plain English</em></h2><input type="search" placeholder="Search a word, like probate" aria-label="Search legal terms"><p class="cnt" aria-live="polite"></p></div><div>${T}<p class="none" hidden>No match. Ask us and we will explain it for free.</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pr3">${nums}</div></div></section>`;
  },
});
