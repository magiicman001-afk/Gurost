"use strict";
/**
 * rooms (hotel, real 3D): warm ivory and terracotta with a turnable 3D reception bell and a "price your stay" calculator: pick a room,
 * arrival date, nights, guests and breakfast, and a hotel-bill style receipt adds up the nights (with a weekend supplement), the
 * breakfasts and the departure date, then pre-fills the enquiry. Fonts: Italiana + Lora (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["Italiana-Regular.ttf", "Italiana-Regular.ttf"], ["Lora-Regular.ttf", "Lora-Regular.ttf"], ["Lora-Bold.ttf", "Lora-Bold.ttf"], ["Italiana-OFL.txt", "OFL-Italiana.txt"], ["Lora-OFL.txt", "OFL-Lora.txt"]];
const css = `
@font-face{font-family:"Italiana";src:url(fonts/Italiana-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Lora";src:url(fonts/Lora-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em}h1{font-size:clamp(3rem,8vw,6.6rem);line-height:.98}h2{font-size:clamp(2.1rem,4.6vw,3.6rem);line-height:1.05}h3{font-size:1.5rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;filter:drop-shadow(0 24px 28px rgba(80,40,20,.28))}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.st{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:clamp(18px,4vw,50px);align-items:start}.st .ctl{display:grid;gap:1.2rem}.st label,.st .lb{display:grid;gap:.4rem;font:700 .76rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.rm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.rm button{display:grid;gap:.15rem;text-align:left;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);padding:.8rem .9rem;cursor:pointer;font:700 .95rem var(--sans)}.rm button small{font:400 .8rem var(--sans);color:var(--muted)}.rm button[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset;background:#FFF8F2}
.st input[type=date],.st select{width:100%;min-width:0;font:700 1rem var(--sans);color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.8rem .9rem}.row2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.ns{display:flex;align-items:center;gap:.6rem}.ns button{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--surface);font:700 1.3rem var(--sans);color:var(--ink);cursor:pointer}.ns b{min-width:3.6rem;text-align:center;font:700 1.1rem var(--sans);color:var(--ink);letter-spacing:0;text-transform:none}.chk{display:flex;gap:.7rem;align-items:center;text-transform:none;letter-spacing:0;font:400 1rem var(--sans);color:var(--ink)}.chk input{width:22px;height:22px;accent-color:var(--accent)}
.bill{border:1px solid var(--line);border-radius:6px;background:#FFFEFB;padding:clamp(18px,3vw,30px);box-shadow:0 16px 36px rgba(80,50,20,.1);position:sticky;top:96px}.bill h3{text-align:center;margin:0 0 .3rem}.bill .sub{text-align:center;color:var(--muted);margin:0 0 1rem;font-style:italic}.bill dl{margin:0;display:grid;gap:.55rem}.bill dl div{display:flex;justify-content:space-between;gap:1rem;border-bottom:1px dashed var(--line);padding-bottom:.5rem}.bill dt{color:var(--muted)}.bill dd{margin:0;font-weight:700;text-align:right}.bill .tot{display:flex;justify-content:space-between;align-items:baseline;margin-top:1rem}.bill .tot b{font:400 2.6rem var(--display);color:var(--accent)}.bill .btn{width:100%;margin-top:1rem;justify-content:center}.bill .note{display:block;margin-top:.8rem;font-size:.78rem;color:var(--muted);text-align:center}
@media(max-width:860px){.st{grid-template-columns:minmax(0,1fr)}.bill{position:static}}
.pr3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,26px)}.pr3 div{border-top:1px solid var(--ink);padding-top:1rem}.pr3 .n{font:400 3rem/1 var(--display);color:var(--accent)}.pr3 p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.pr3{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-stay]"); if (!c) return;
  var R = JSON.parse(c.getAttribute("data-stay")), rb = [].slice.call(c.querySelectorAll(".rm button")), di = c.querySelector("[data-in]"), nv = c.querySelector("[data-n]"), gs = c.querySelector("[data-g]"), bf = c.querySelector("[data-bf]"), bill = c.querySelector(".bill"), cur = 0, n = 2, line = "";
  var t = new Date(); t.setDate(t.getDate() + 14); di.value = t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
  function fmt(d) { return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" }); }
  function set(k, v) { bill.querySelector("[data-" + k + "]").textContent = v; }
  function calc() {
    var p = di.value.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]); if (isNaN(d)) return;
    var sur = 0, e = new Date(d); for (var i = 0; i < n; i++) { var w = e.getDay(); if (w === 5 || w === 6) sur += 20; e.setDate(e.getDate() + 1); }
    var g = +gs.value, rate = R[cur].p, rooms = rate * n, br = bf.checked ? 14 * g * n : 0, tot = rooms + sur + br;
    set("in", fmt(d)); set("out", fmt(e)); set("room", R[cur].n); set("nights", n + (n === 1 ? " night" : " nights")); set("rooms", "\\u00A3" + rooms); set("sur", sur ? "\\u00A3" + sur : "none"); set("bfast", bf.checked ? "\\u00A3" + br : "not added"); set("tot", "\\u00A3" + tot);
    nv.textContent = n; line = "Stay enquiry: " + R[cur].n + ", " + fmt(d) + " for " + n + (n === 1 ? " night" : " nights") + ", " + g + (g === 1 ? " guest" : " guests") + (bf.checked ? ", with breakfast" : "") + ". Estimate \\u00A3" + tot + ".";
  }
  rb.forEach(function (b, i) { b.addEventListener("click", function () { cur = i; rb.forEach(function (x, k) { x.setAttribute("aria-pressed", k === i ? "true" : "false"); }); calc(); }); });
  c.querySelector("[data-dec]").addEventListener("click", function () { n = Math.max(1, n - 1); calc(); }); c.querySelector("[data-inc]").addEventListener("click", function () { n = Math.min(14, n + 1); calc(); });
  [di, gs, bf].forEach(function (x) { x.addEventListener("input", calc); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
module.exports = R.make({
  name: "rooms", themeColor: "#F7F1E6", fonts: FONTS, preload: ["assets/fonts/Italiana-Regular.ttf"], js: JS,
  vars: { bg: "#F7F1E6", surface: "#FFFFFF", ink: "#22302F", muted: "#6A7472", line: "rgba(34,48,47,.16)", accent: "#B5532F", onaccent: "#FFFFFF", c1: "#C75B39", c2: "#F0C27B", c3: "#22302F", rad: "12px", display: '"Italiana",Georgia,serif', sans: '"Lora",Georgia,serif', header: "rgba(247,241,230,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const rooms = [{ n: "Classic double", p: 129 }, { n: "Garden view room", p: 159 }, { n: "Family suite", p: 219 }, { n: "The Tower suite", p: 329 }];
    const rb = rooms.map((r, i) => `<button type="button" aria-pressed="${i === 0}">${r.n}<small>from &pound;${r.p} a night</small></button>`).join("");
    const gopt = [1, 2, 3, 4].map((g) => `<option value="${g}"${g === 2 ? " selected" : ""}>${g} guest${g > 1 ? "s" : ""}</option>`).join("");
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><span class="n">${v}${s}</span><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#stay"><span>Price my stay</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "bell", "bed", "A reception bell you can turn", { c1: "#C75B39", c2: "#F0C27B", c3: "#22302F", hint: "a brass reception bell" })}</div></section>
<section class="sec" id="stay" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Price your stay</span><h2 style="margin-top:.8rem">See the <em>total</em> before you ask</h2></div></div><div class="st" data-stay='${JSON.stringify(rooms)}' data-reveal><div class="ctl"><div class="lb">Room<div class="rm">${rb}</div></div><div class="row2"><label>Arrival<input type="date" data-in></label><label>Guests<select data-g>${gopt}</select></label></div><div class="lb">Nights<div class="ns"><button type="button" data-dec aria-label="One night fewer">&minus;</button><b data-n>2</b><button type="button" data-inc aria-label="One night more">+</button></div></div><label class="chk"><input type="checkbox" data-bf checked> Add cooked breakfast, &pound;14 each a day</label></div><div class="bill"><h3>Your stay</h3><p class="sub">An estimate, not a booking</p><dl><div><dt>Room</dt><dd data-room></dd></div><div><dt>Arrive</dt><dd data-in></dd></div><div><dt>Leave</dt><dd data-out></dd></div><div><dt>Length</dt><dd data-nights></dd></div><div><dt>Room total</dt><dd data-rooms></dd></div><div><dt>Fri and Sat supplement</dt><dd data-sur></dd></div><div><dt>Breakfast</dt><dd data-bfast></dd></div></dl><div class="tot"><span>Total</span><b data-tot></b></div><button type="button" class="btn btn-primary" data-book><span>Send this to the hotel</span></button><span class="note">Example prices. We confirm the exact price and availability by email.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="pr3">${nums}</div></div></section>`;
  },
});
