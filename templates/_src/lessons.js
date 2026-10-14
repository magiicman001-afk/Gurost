"use strict";
/**
 * lessons (tutoring, real 3D): a lined-notepad look in warm paper yellow and indigo ink with a turnable 3D pencil and a "price your
 * lessons" calculator: level, lesson length, lessons a week, online or at home and a 4 or 12 week block (with a block discount), shown
 * as a per-lesson, weekly and total price that pre-fills the enquiry. Fonts: Young Serif + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["YoungSerif-Regular.ttf", "YoungSerif-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["YoungSerif-OFL.txt", "OFL-YoungSerif.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Young Serif";src:url(fonts/YoungSerif-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
body{background-image:linear-gradient(transparent 31px,rgba(68,72,184,.13) 32px);background-size:100% 32px}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(2.7rem,7vw,5.8rem);line-height:1.02}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.1}h3{font-size:1.25rem}
h1 em,h2 em{font-style:normal;color:var(--accent);background:linear-gradient(transparent 62%,rgba(255,200,61,.6) 62%)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(40,40,120,.25))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.lc{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(18px,4vw,50px);align-items:start;border:2px solid var(--ink);border-radius:20px;background:#FFFDF2;padding:clamp(18px,3vw,36px);box-shadow:8px 8px 0 var(--ink)}.lc .ctl{display:grid;gap:1.2rem}.lc .lb{display:grid;gap:.45rem;font:700 .76rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:700 .95rem var(--sans);border:2px solid var(--ink);border-radius:12px;background:transparent;color:var(--ink);padding:.6rem 1rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--ink);color:#FFFDF2}
.lc .out{border:2px dashed var(--ink);border-radius:16px;padding:clamp(16px,3vw,28px);background:#FFF6D6}.lc .big{font:400 clamp(3rem,8vw,4.6rem)/1 var(--display);color:var(--accent)}.lc .big small{font:700 1rem var(--sans);color:var(--muted);margin-left:.4rem}.lc dl{margin:1rem 0 0;display:grid;gap:.5rem}.lc dl div{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px solid rgba(30,33,66,.2);padding-bottom:.4rem}.lc dt{color:var(--muted)}.lc dd{margin:0;font-weight:700}.lc .btn{width:100%;justify-content:center;margin-top:1rem}.lc .note{display:block;margin-top:.8rem;font-size:.78rem;color:var(--muted)}
@media(max-width:860px){.lc{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:3px solid var(--accent);padding-top:1rem}.th b{display:block;font:400 2.8rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:2px solid var(--ink);border-radius:16px;background:#FFFDF2;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-lessons]"); if (!c) return;
  var G = c.querySelectorAll("[data-g]"), st = { lvl: 0, len: 60, wk: 1, mode: 0, term: 4 }, L = JSON.parse(c.getAttribute("data-lessons")), line = "";
  function set(k, v) { c.querySelector("[data-" + k + "]").textContent = v; }
  function calc() {
    var rate = L[st.lvl].p, per = Math.round(rate * st.len / 60 + (st.mode ? 6 : 0)), disc = st.term === 12 ? .05 : 0, wkc = per * st.wk, tot = Math.round(wkc * st.term * (1 - disc));
    c.querySelector(".big").firstChild.nodeValue = "\\u00A3" + per; set("wk", "\\u00A3" + wkc); set("n", st.wk * st.term + " lessons"); set("disc", disc ? "5% off, saves \\u00A3" + Math.round(wkc * st.term * disc) : "none (12 weeks saves 5%)"); set("tot", "\\u00A3" + tot);
    line = "Tuition enquiry: " + L[st.lvl].n + ", " + st.len + " minute lessons, " + st.wk + " a week, " + (st.mode ? "at home" : "online") + ", " + st.term + " weeks. Estimate \\u00A3" + tot + ".";
  }
  [].forEach.call(G, function (g) { var k = g.getAttribute("data-g"), bs = [].slice.call(g.querySelectorAll("button")); bs.forEach(function (b, i) { b.addEventListener("click", function () { st[k] = k === "lvl" || k === "mode" ? i : +b.getAttribute("data-v"); bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); calc(); }); }); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const grp = (key, items, sel) => `<div class="lb">${key[1]}<div class="opt" data-g="${key[0]}">${items.map(([l, v], i) => `<button type="button" data-v="${v}" aria-pressed="${i === sel}">${l}</button>`).join("")}</div></div>`;
module.exports = R.make({
  name: "lessons", themeColor: "#FFF6D6", fonts: FONTS, preload: ["assets/fonts/YoungSerif-Regular.ttf"], js: JS,
  vars: { bg: "#FFF6D6", surface: "#FFFDF2", ink: "#1E2142", muted: "#5D6082", line: "rgba(30,33,66,.2)", accent: "#4448B8", onaccent: "#FFFFFF", c1: "#4448B8", c2: "#FFC83D", c3: "#1E2142", rad: "12px", display: '"Young Serif",Georgia,serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(255,246,214,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const L = [{ n: "Primary", p: 32 }, { n: "GCSE", p: 40 }, { n: "A-level", p: 50 }, { n: "SEN support", p: 45 }];
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Help that <em>fits your week</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#price"><span>Price my lessons</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "pencil", "pencil", "A pencil you can turn", { c1: "#4448B8", c2: "#FFC83D", c3: "#1E2142", hint: "a pencil" })}</div></section>
<section class="sec" id="price" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Lesson calculator</span><h2 style="margin-top:.8rem">What will it <em>cost each week</em>?</h2></div></div><div class="lc" data-lessons='${JSON.stringify(L)}' data-reveal><div class="ctl">${grp(["lvl", "Level"], L.map((l, i) => [l.n, i]), 1)}${grp(["len", "Lesson length"], [["45 min", 45], ["60 min", 60], ["90 min", 90]], 1)}${grp(["wk", "Lessons a week"], [["1", 1], ["2", 2], ["3", 3]], 0)}${grp(["mode", "Where"], [["Online", 0], ["At home", 1]], 0)}${grp(["term", "Block"], [["4 weeks", 4], ["12 weeks", 12]], 0)}</div><div class="out"><div class="big">&pound;0<small>a lesson</small></div><dl><div><dt>Each week</dt><dd data-wk></dd></div><div><dt>Lessons in the block</dt><dd data-n></dd></div><div><dt>Block discount</dt><dd data-disc></dd></div><div><dt>Total for the block</dt><dd data-tot></dd></div></dl><button type="button" class="btn btn-primary" data-book><span>Send this to a tutor</span></button><span class="note">Example prices. Your first 30 minute lesson is free. Home lessons add &pound;6 for travel.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
