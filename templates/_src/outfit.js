"use strict";
/**
 * outfit (fashion and online shop, real 3D): a playful, colourful look with a turnable 3D pair of sunglasses and an "build your outfit"
 * mannequin: pick colours for the top, trousers and shoes and switch a hat and a bag on or off; the figure repaints at once, the
 * 3D sunglasses take the top colour, and the tool adds up the price with a "complete the look" discount for three or more pieces.
 * Pre-fills the question form. Fonts: Bricolage Grotesque + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.025em}h1{font-size:clamp(2.8rem,7.6vw,6.2rem);line-height:.98}h2{font-size:clamp(2rem,4.4vw,3.4rem);line-height:1.04}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;background:var(--c2);padding:0 .15em;border-radius:.2em;color:var(--ink)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:420px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.of{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(18px,4vw,50px);align-items:center;background:#FFFFFF;border:3px solid var(--ink);border-radius:24px;padding:clamp(18px,3vw,36px);box-shadow:8px 8px 0 var(--ink)}.of .stage{background:linear-gradient(180deg,#FFE9A8,#FFD27A);border-radius:18px;padding:12px;display:grid;place-items:center}.of svg{width:100%;max-width:280px;height:auto;display:block}.of svg [id]{transition:fill .35s}
.of .ctl{display:grid;gap:1.1rem}.of .lb{display:grid;gap:.5rem;font:700 .76rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.of .sw{display:flex;gap:.55rem;flex-wrap:wrap}.of .sw button{width:42px;height:42px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px var(--line);cursor:pointer;padding:0}.of .sw button[aria-pressed=true]{box-shadow:0 0 0 3px var(--ink)}
.of .tg{display:flex;gap:.5rem;flex-wrap:wrap}.of .tg button{font:700 .9rem var(--sans);border:2px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);padding:.55rem 1rem;cursor:pointer}.of .tg button[aria-pressed=true]{background:var(--ink);color:#fff}
.of .tot{border-top:2px dashed var(--line);padding-top:1rem;display:flex;gap:1rem;align-items:end;justify-content:space-between;flex-wrap:wrap}.of .big{font:700 clamp(2.6rem,7vw,3.8rem)/1 var(--display);color:var(--accent)}.of .big small{display:block;font:400 .82rem var(--sans);color:var(--muted)}.of .note{display:block;font-size:.76rem;color:var(--muted)}
@media(max-width:860px){.of{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--ink);border-radius:18px;background:#fff;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-outfit]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-outfit")), st = { top: 0, bot: 0, shoe: 0, hat: 0, bag: 0 }, line = "", g = document.querySelector(".hero .gl3d");
  var fill = { top: ["o-top", "o-sl1", "o-sl2"], bot: ["o-leg1", "o-leg2"], shoe: ["o-sh1", "o-sh2"] };
  function money(n) { return "\\u00A3" + n; }
  function calc() {
    var names = [], sum = 0, n = 0;
    ["top", "bot", "shoe"].forEach(function (k) { var o = D[k].o[st[k]]; fill[k].forEach(function (id) { c.querySelector("#" + id).setAttribute("fill", o.c); }); sum += D[k].p; n++; names.push(o.n + " " + D[k].n.toLowerCase()); });
    ["hat", "bag"].forEach(function (k) { var on = st[k] === 1; c.querySelector("#o-" + k).style.display = on ? "" : "none"; if (on) { sum += D[k].p; n++; names.push(D[k].n.toLowerCase()); } });
    var disc = n >= 4 ? .15 : n >= 3 ? .1 : 0, tot = Math.round(sum * (1 - disc));
    c.querySelector(".big").firstChild.nodeValue = money(tot); c.querySelector("[data-d]").textContent = disc ? "You save " + money(Math.round(sum * disc)) + " (" + Math.round(disc * 100) + "% complete-the-look)" : "Add a piece to unlock 10% off";
    line = "Outfit enquiry: " + names.join(", ") + ". Estimate " + money(tot) + ". My question: ";
    if (g) { var col = D.top.o[st.top].c; g.setAttribute("data-c1", col); if (g.gl3d) g.gl3d.colors(col); }
  }
  [].forEach.call(c.querySelectorAll("[data-k]"), function (grp) { var k = grp.getAttribute("data-k"), bs = [].slice.call(grp.querySelectorAll("button")); bs.forEach(function (b, i) { b.addEventListener("click", function () { st[k] = (k === "hat" || k === "bag") ? (st[k] ? 0 : 1) : i; if (k === "hat" || k === "bag") b.setAttribute("aria-pressed", st[k] ? "true" : "false"); else bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); calc(); }); }); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const D = {
  top: { n: "Top", p: 58, o: [{ n: "Sage", c: "#8FB59B" }, { n: "Sand", c: "#E2CFA8" }, { n: "Navy", c: "#2B3A67" }, { n: "Rust", c: "#C0603A" }] },
  bot: { n: "Trousers", p: 72, o: [{ n: "Ink", c: "#25272E" }, { n: "Stone", c: "#CFC8B8" }, { n: "Denim", c: "#4F77A8" }, { n: "Olive", c: "#6B7646" }] },
  shoe: { n: "Trainers", p: 55, o: [{ n: "White", c: "#F6F4EE" }, { n: "Black", c: "#1D1E22" }, { n: "Tan", c: "#B98B5B" }] },
  hat: { n: "Sun hat", p: 34 }, bag: { n: "Leather bag", p: 129 },
};
const sw = (k) => `<div class="lb">${D[k].n}<div class="sw" data-k="${k}">${D[k].o.map((o, i) => `<button type="button" style="background:${o.c}" aria-label="${o.n}" aria-pressed="${i === 0}"></button>`).join("")}</div></div>`;
const man = `<svg viewBox="0 0 240 420" role="img" aria-label="A mannequin wearing the chosen outfit"><ellipse cx="120" cy="406" rx="70" ry="8" fill="#000" opacity=".12"/><circle cx="120" cy="52" r="26" fill="#F0C7A5"/><path d="M104 74 H136 V92 H104 Z" fill="#E6B793"/><path id="o-sl1" d="M82 98 L52 150 L66 160 L90 126 Z" fill="#8FB59B"/><path id="o-sl2" d="M158 98 L188 150 L174 160 L150 126 Z" fill="#8FB59B"/><path id="o-top" d="M86 92 Q120 106 154 92 L162 214 H78 Z" fill="#8FB59B"/><path d="M52 150 L66 160 L62 192 L48 188 Z" fill="#F0C7A5"/><path d="M188 150 L174 160 L178 192 L192 188 Z" fill="#F0C7A5"/><path id="o-leg1" d="M78 212 H120 L116 372 H86 Z" fill="#25272E"/><path id="o-leg2" d="M120 212 H162 L154 372 H124 Z" fill="#25272E"/><path id="o-sh1" d="M80 370 H118 Q122 392 112 396 H72 Q68 380 80 370 Z" fill="#F6F4EE"/><path id="o-sh2" d="M122 370 H160 Q172 380 168 396 H128 Q118 392 122 370 Z" fill="#F6F4EE"/><g id="o-hat" style="display:none"><ellipse cx="120" cy="34" rx="50" ry="10" fill="#EBD9A8"/><path d="M92 34 Q92 8 120 8 Q148 8 148 34 Z" fill="#F4E6BC"/><path d="M93 30 H147 V36 H93 Z" fill="#C0603A"/></g><g id="o-bag" style="display:none"><path d="M168 196 Q196 190 198 214" stroke="#6B4329" stroke-width="5" fill="none"/><path d="M164 214 H206 L210 262 H160 Z" fill="#8A5A3C"/><path d="M164 214 H206 L207 224 H163 Z" fill="#6B4329"/><circle cx="185" cy="228" r="4" fill="#D7A93E"/></g></svg>`;
module.exports = R.make({
  name: "outfit", themeColor: "#FFF4D6", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#FFF4D6", surface: "#FFFFFF", ink: "#1D1E22", muted: "#66625A", line: "#E8DDBB", accent: "#C0402A", onaccent: "#FFFFFF", c1: "#8FB59B", c2: "#FFD27A", c3: "#1D1E22", rad: "14px", display: '"Bricolage Grotesque",system-ui,sans-serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(255,244,214,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const tg = (k) => `<div class="tg" data-k="${k}"><button type="button" aria-pressed="false">Add ${D[k].n.toLowerCase()} (&pound;${D[k].p})</button></div>`;
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Dress it <em>your way</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#build"><span>Build an outfit</span></a><a class="btn" href="menu.html"><span>${X.cta1}</span></a></div></div>${model3d(pack, "shades", "glasses", "Sunglasses you can turn", { c1: "#8FB59B", c2: "#3A4658", c3: "#1D1E22", hint: "sunglasses" })}</div></section>
<section class="sec" id="build" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Outfit builder</span><h2 style="margin-top:.8rem">Mix it <em>until it feels right</em></h2></div></div><div class="of" data-outfit='${JSON.stringify(D)}' data-reveal><div class="stage">${man}</div><div class="ctl">${sw("top")}${sw("bot")}${sw("shoe")}<div class="lb">Finishing touches<div style="display:flex;gap:.5rem;flex-wrap:wrap">${tg("hat")}${tg("bag")}</div></div><div class="tot"><div class="big">&pound;0<small data-d></small></div><button type="button" class="btn btn-primary" data-book><span>Ask about this look</span></button></div><span class="note">Example prices. Colours on screen may differ slightly from the fabric.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
