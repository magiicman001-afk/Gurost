"use strict";
/**
 * bundle (fashion and online shop, real 3D): a bold sports-poster look (Big Shoulders, tomato red and cream) with a turnable 3D
 * shopping bag and a working basket: add everyday basics with plus and minus buttons and watch the bundle discount (10% for two
 * items, 15% for three or more), the free-delivery progress bar (free over 60 pounds) and the total. Pre-fills the question form with
 * the basket. Fonts: Big Shoulders + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BigShoulders-Bold.ttf", "BigShoulders-Bold.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["BigShoulders-OFL.txt", "OFL-BigShoulders.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:.005em;text-transform:uppercase}h1{font-size:clamp(3.4rem,10vw,8rem);line-height:.88}h2{font-size:clamp(2.4rem,5.4vw,4.2rem);line-height:.95}h3{font-size:1.5rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.bk{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:clamp(16px,3vw,36px);align-items:start}.bk .items{display:grid;gap:10px}.bk .row{display:grid;grid-template-columns:84px minmax(0,1fr) auto;gap:1rem;align-items:center;border:2px solid var(--ink);background:#FFFBF1;padding:.7rem 1rem .7rem .7rem}.bk .row img{width:84px;height:84px;object-fit:contain}.bk .row b{display:block;font:700 1.35rem var(--display);text-transform:uppercase}.bk .row span{color:var(--muted);font-size:.9rem}
.bk .q{display:flex;align-items:center;gap:.4rem}.bk .q button{width:38px;height:38px;border:2px solid var(--ink);background:transparent;color:var(--ink);font:700 1.2rem var(--sans);cursor:pointer;padding:0}.bk .q button:active{background:var(--ink);color:var(--bg)}.bk .q output{min-width:1.6rem;text-align:center;font:700 1.1rem var(--sans)}
.bk .sum{border:2px solid var(--ink);background:var(--ink);color:#FFF6E4;padding:clamp(16px,3vw,26px);position:sticky;top:96px}.bk .sum dl{margin:0;display:grid;gap:.5rem}.bk .sum dl div{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(255,246,228,.2);padding-bottom:.4rem}.bk .sum dt{color:#D8C9B0}.bk .sum dd{margin:0;font-weight:700}
.bk .tot{margin:1rem 0 .2rem;font:700 clamp(3.2rem,8vw,4.8rem)/1 var(--display);color:#FF7A5C}.bk .prog{height:12px;background:rgba(255,246,228,.18);margin:.8rem 0 .4rem}.bk .prog i{display:block;height:100%;width:0;background:#FF7A5C;transition:width .4s}.bk .msg{margin:0 0 1rem;font-size:.88rem;color:#F2E6D2}.bk .sum .btn{width:100%;justify-content:center}.bk .note{display:block;margin-top:.7rem;font-size:.74rem;color:#CBBCA2}
@media(max-width:860px){.bk{grid-template-columns:minmax(0,1fr)}.bk .sum{position:static}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:4px solid var(--ink);padding-top:1rem}.th b{display:block;font:700 3.6rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--ink);background:#FFFBF1;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-basket]"); if (!c) return;
  var P = JSON.parse(c.getAttribute("data-basket")), qty = P.map(function () { return 0; }), line = "";
  function money(n) { return "\\u00A3" + n.toFixed(2); }
  function calc() {
    var n = 0, sub = 0, names = [];
    P.forEach(function (p, i) { n += qty[i]; sub += qty[i] * p.p; if (qty[i]) names.push(qty[i] + " x " + p.n); c.querySelectorAll(".row output")[i].textContent = qty[i]; });
    var d = n >= 3 ? .15 : n >= 2 ? .10 : 0, after = sub * (1 - d), ship = !n ? 0 : after >= 60 ? 0 : 3.95, tot = after + ship, left = Math.max(0, 60 - after);
    c.querySelector("[data-sub]").textContent = money(sub); c.querySelector("[data-disc]").textContent = d ? "-" + money(sub * d) + " (" + Math.round(d * 100) + "%)" : "none yet"; c.querySelector("[data-ship]").textContent = !n ? "-" : ship ? money(ship) : "Free";
    c.querySelector(".tot").textContent = money(tot); c.querySelector(".prog i").style.width = Math.min(100, after / 60 * 100) + "%";
    c.querySelector(".msg").textContent = !n ? "Add an item to start. Two items save 10%, three or more save 15%." : left > 0 ? "Add " + money(left) + " more for free delivery." + (n < 3 ? " Add another item to save more." : "") : "Free delivery unlocked." + (n < 3 ? " One more item saves 15%." : " You have the best bundle discount.");
    line = n ? "Basket: " + names.join(", ") + ". Total " + money(tot) + (ship ? " including delivery" : " with free delivery") + ". My question: " : "";
  }
  [].forEach.call(c.querySelectorAll(".row"), function (row, i) { row.querySelector("[data-m]").addEventListener("click", function () { qty[i] = Math.max(0, qty[i] - 1); calc(); }); row.querySelector("[data-p]").addEventListener("click", function () { qty[i] = Math.min(9, qty[i] + 1); calc(); }); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line || "I have a question about an order. "; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const P = [{ n: "Heavyweight tee", p: 32, a: "tee" }, { n: "Ribbed tank", p: 18, a: "dress" }, { n: "Canvas trainers", p: 55, a: "sneaker" }, { n: "Summer straw hat", p: 24, a: "hat" }];
module.exports = R.make({
  name: "bundle", themeColor: "#FFF6E4", fonts: FONTS, preload: ["assets/fonts/BigShoulders-Bold.ttf"], js: JS,
  vars: { bg: "#FFF6E4", surface: "#FFFBF1", ink: "#1E1A17", muted: "#6B6258", line: "#E6D8BE", accent: "#E4442B", onaccent: "#FFFFFF", c1: "#E4442B", c2: "#F0C24A", c3: "#1E1A17", rad: "0px", display: '"Big Shoulders",Impact,sans-serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(255,246,228,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const rows = P.map((p) => `<div class="row">${img(p.a, p.n, { w: 168, h: 168, hint: "a product photograph of " + p.n.toLowerCase() })}<div><b>${p.n}</b><span>&pound;${p.p.toFixed(2)}</span></div><div class="q"><button type="button" data-m aria-label="Remove one ${p.n}">&minus;</button><output>0</output><button type="button" data-p aria-label="Add one ${p.n}">+</button></div></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Buy more. <em>Pay less.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#basket"><span>Fill my basket</span></a><a class="btn" href="menu.html"><span>${X.cta1}</span></a></div></div>${model3d(pack, "bag", "handbag", "A shopping bag you can turn", { c1: "#E4442B", c2: "#F0C24A", c3: "#1E1A17", hint: "a shopping bag" })}</div></section>
<section class="sec" id="basket" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Basket</span><h2 style="margin-top:.8rem">Build a bundle, <em>save 15%</em></h2></div></div><div class="bk" data-basket='${JSON.stringify(P)}' data-reveal><div class="items">${rows}</div><div class="sum"><dl><div><dt>Items</dt><dd data-sub>&pound;0.00</dd></div><div><dt>Bundle discount</dt><dd data-disc></dd></div><div><dt>Delivery</dt><dd data-ship></dd></div></dl><div class="tot"></div><div class="prog"><i></i></div><p class="msg"></p><button type="button" class="btn btn-primary" data-book><span>Send my basket</span></button><span class="note">A demonstration basket. Your real shop checkout is connected when you publish.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
