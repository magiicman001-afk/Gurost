"use strict";
/**
 * quoter (trades, real 3D): a blueprint-paper layout with a turnable 3D spanner and an instant quote estimator: pick a job and how
 * soon, see a price range, and send it to the form. Fonts: IBM Plex Mono + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["IBMPlexMono-Regular.ttf", "IBMPlexMono-Regular.ttf"], ["IBMPlexMono-Bold.ttf", "IBMPlexMono-Bold.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["IBMPlexMono-OFL.txt", "OFL-IBMPlexMono.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"]];
const css = `
@font-face{font-family:"IBM Plex Mono";src:url(fonts/IBMPlexMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"IBM Plex Mono";src:url(fonts/IBMPlexMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
body{background-image:linear-gradient(rgba(20,60,140,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(20,60,140,.07) 1px,transparent 1px);background-size:32px 32px}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.03em;text-transform:uppercase}h1{font-size:clamp(2.8rem,7.6vw,6.6rem);line-height:.96}h2{font-size:clamp(2rem,4.4vw,3.6rem);line-height:1}h3{font-size:1.2rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--display);color:var(--accent);letter-spacing:.1em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(30px,5vw,60px)}.hero .wrap{display:grid;grid-template-columns:1.2fr .8fr;gap:20px;align-items:center}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center;border:1px dashed rgba(20,60,140,.4);border-radius:8px;background:rgba(255,255,255,.5)}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.dim{display:flex;align-items:center;gap:.8rem;font:400 .75rem var(--display);color:rgba(20,60,140,.7);margin:1.4rem 0 0}.dim::before,.dim::after{content:"";height:1px;flex:1;background:rgba(20,60,140,.4)}
.est{display:grid;grid-template-columns:1.1fr .9fr;border:2px solid var(--ink);background:var(--surface)}.est .l{padding:clamp(18px,3.4vw,40px);display:grid;gap:1.1rem;align-content:start}.est .r{background:var(--ink);color:#fff;padding:clamp(18px,3.4vw,40px);display:grid;gap:.6rem;align-content:center}
.est label{display:grid;gap:.4rem;font:700 .8rem var(--display);letter-spacing:.1em;text-transform:uppercase}.est select,.est input[type=range]{font:400 1rem var(--sans);padding:.7rem;border:1px solid var(--ink);border-radius:0;background:#fff;color:var(--ink);width:100%}
.est .seg{display:flex;flex-wrap:wrap;gap:.5rem}.est .seg button{font:700 .85rem var(--display);border:1px solid var(--ink);background:#fff;color:var(--ink);padding:.6rem .9rem;cursor:pointer}.est .seg button[aria-pressed=true]{background:var(--ink);color:#fff}
.est .r small{font:400 .75rem var(--display);letter-spacing:.14em;text-transform:uppercase;opacity:.7}.est .r b{font:700 clamp(2.6rem,6vw,4.6rem)/1 var(--display);color:#FFD34D}.est .r p{margin:0;opacity:.8}.est .r .btn{margin-top:.6rem;justify-self:start}
@media(max-width:820px){.est{grid-template-columns:1fr}}
.tbl{width:100%;border-collapse:collapse;font-size:.98rem}.tbl th,.tbl td{border-bottom:1px solid var(--ink);padding:.8rem .5rem;text-align:left}.tbl th{font:700 .75rem var(--display);letter-spacing:.12em;text-transform:uppercase}.tbl td:last-child{font:700 1rem var(--display);white-space:nowrap}.tblw{overflow-x:auto}
.ph4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,20px)}.ph4 div{border:1px solid var(--ink);background:#fff;padding:.8rem;text-align:center}.ph4 img{width:100%;aspect-ratio:1;object-fit:contain}.ph4 b{display:block;font:700 .8rem var(--display);letter-spacing:.1em;text-transform:uppercase;margin-top:.4rem}@media(max-width:600px){.ph4{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
const JS = `
(function () {
  var e = document.querySelector("[data-est]"); if (!e) return; var sel = e.querySelector("select"), out = e.querySelector(".r b"), note = e.querySelector(".r p"), mult = 1, label = "Planned visit";
  function u() { var o = sel.options[sel.selectedIndex], lo = +o.getAttribute("data-lo"), hi = +o.getAttribute("data-hi"); var a = Math.round(lo * mult / 5) * 5, b = Math.round(hi * mult / 5) * 5; out.textContent = o.getAttribute("data-q") ? "Quote" : "\\u00a3" + a + (b > a ? "\\u2013" + b : ""); note.textContent = (o.getAttribute("data-q") ? "Free survey, then a fixed price." : "Typical price, " + label.toLowerCase() + ". Your fixed quote is confirmed before we start."); var m = document.querySelector("textarea"); if (m) m.value = "Quote request: " + o.text + " (" + label + ")"; }
  sel.addEventListener("change", u);
  [].slice.call(e.querySelectorAll(".seg button")).forEach(function (b) { b.addEventListener("click", function () { [].slice.call(e.querySelectorAll(".seg button")).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); mult = +b.getAttribute("data-m"); label = b.textContent; u(); }); });
  u();
})();
`;
module.exports = R.make({
  name: "quoter", themeColor: "#F2F5FA", fonts: FONTS, preload: ["assets/fonts/IBMPlexMono-Bold.ttf"], js: JS,
  vars: { bg: "#F2F5FA", surface: "#FFFFFF", ink: "#0F2A52", muted: "#4B5C78", line: "rgba(15,42,82,.2)", accent: "#E5482A", onaccent: "#FFFFFF", c2: "#FFD34D", c3: "#E5482A", rad: "0", display: '"IBM Plex Mono",ui-monospace,monospace', sans: '"Instrument Sans",system-ui,sans-serif', header: "rgba(242,245,250,.94)" },
  css: css + ".btn,.btn-primary{border-radius:0}",
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const quotable = pack.cats.flatMap((c) => c.items).filter((i) => !/free/.test(i.meta));
    const num = (m) => (String(m).match(/[\d,]+/) || ["0"])[0].replace(/,/g, "");
    const opts = quotable.map((i) => { const n = +num(i.meta) || 0, q = /quote/.test(i.meta); return `<option data-lo="${n}" data-hi="${Math.round(n * 1.35)}"${q ? ' data-q="1"' : ""}>${i.n}</option>`; }).join("");
    const rows = pack.cats.flatMap((c) => c.items.slice(0, 2)).map((i) => `<tr><td>${i.n}</td><td>${i.d.split(".")[0]}.</td><td>${K.strip(i.meta)}</td></tr>`).join("");
    const tiles = pack.cats.map((c) => `<div data-reveal>${img(c.art, c.name, { w: 360, h: 360, hint: B.hintOf(pack, c) })}<b>${c.name}</b></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "wrench", "wrench", "A steel spanner", { c1: "#E5482A", c2: "#FFD34D", hint: "a spanner" })}</div><div class="wrap"><p class="dim">Fixed price, agreed before we start</p></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="est" data-est data-reveal><div class="l"><span class="eyebrow">Instant estimate</span><h2>What will <em>it cost</em>?</h2><label>The job<select>${opts}</select></label><label>How soon<div class="seg"><button type="button" data-m="1" aria-pressed="true">Planned visit</button><button type="button" data-m="1.25" aria-pressed="false">Next day</button><button type="button" data-m="1.6" aria-pressed="false">Out of hours</button></div></label></div><div class="r"><small>Typical price</small><b>&pound;0</b><p></p><a class="btn btn-primary" href="#order"><span>Send me this quote</span></a></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Price guide</span><h2 style="margin-top:.8rem">Popular <em>prices</em></h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="tblw"><table class="tbl"><thead><tr><th>Job</th><th>What is included</th><th>From</th></tr></thead><tbody>${rows}</tbody></table></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="ph4">${tiles}</div></div></section>`;
  },
});
