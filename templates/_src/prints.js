"use strict";
/**
 * prints (photography and weddings, real 3D): a quiet gallery-wall look (cream, deep teal) with a turnable 3D picture frame that
 * repaints to the chosen frame colour, and a "see it on your wall" print sizer: pick a size, a frame (none, oak, black, white) and
 * whether to add a mount, and the print is drawn to scale above a sofa so you can judge the size, with the price and a pre-filled
 * enquiry. Fonts: Arsenal SC + Outfit (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["ArsenalSC-Regular.ttf", "ArsenalSC-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"], ["ArsenalSC-OFL.txt", "OFL-ArsenalSC.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"]];
const css = `
@font-face{font-family:"Arsenal SC";src:url(fonts/ArsenalSC-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:.01em}h1{font-size:clamp(2.7rem,7vw,5.6rem);line-height:1.02}h2{font-size:clamp(1.9rem,4vw,3.1rem);line-height:1.1}h3{font-size:1.3rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.2em}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:380px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.pr{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:clamp(18px,3.5vw,44px);align-items:start}.pr .wall{position:relative;aspect-ratio:110/90;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#E7E2D8 0,#E7E2D8 89%,#B79F83 89%,#A38A6C 100%);box-shadow:0 18px 40px rgba(31,42,48,.14)}
.pr .sofa{position:absolute;left:50%;bottom:11.1%;transform:translateX(-50%);width:76.4%;height:35.6%}.pr .sofa i{position:absolute;display:block}.pr .sofa .bk{left:6%;right:6%;top:0;bottom:30%;background:#5F7F82;border-radius:14px 14px 4px 4px}.pr .sofa .sd{left:0;width:10%;top:22%;bottom:12%;background:#4D6B6E;border-radius:10px}.pr .sofa .sd.r{left:auto;right:0}.pr .sofa .st{left:8%;right:8%;top:46%;bottom:12%;background:#6C8E91;border-radius:8px}.pr .sofa .lg{left:10%;width:3%;bottom:0;height:12%;background:#3B2F26}.pr .sofa .lg.r{left:auto;right:10%}
.pr .art{position:absolute;left:50%;transform:translateX(-50%);box-shadow:0 8px 18px rgba(0,0,0,.25);transition:all .35s cubic-bezier(.2,.7,.2,1)}.pr .art .mt{width:100%;height:100%;display:grid;place-items:center;background:#FFFEFA}.pr .art .im{background:radial-gradient(circle at 70% 30%,#FFE3A8 0 7%,transparent 8%),linear-gradient(180deg,#8FB6DB 0,#F6C9A0 60%,#F7A982 100%);position:relative;overflow:hidden}.pr .art .im:after{content:"";position:absolute;left:-10%;right:-10%;bottom:-8%;height:46%;background:radial-gradient(ellipse at 30% 100%,#5C8F58 0 55%,transparent 56%),radial-gradient(ellipse at 80% 100%,#6F9F66 0 50%,transparent 51%)}
.pr .rule{position:absolute;font:700 .7rem var(--sans);color:var(--muted);background:rgba(255,255,255,.8);padding:.15rem .45rem;border-radius:99px;left:50%;transform:translateX(-50%);white-space:nowrap}
.pr .ctl{display:grid;gap:1.2rem}.pr .lb{display:grid;gap:.5rem;font:700 .74rem var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:700 .9rem var(--sans);border:1px solid var(--ink);border-radius:10px;background:transparent;color:var(--ink);padding:.55rem .9rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
.pr .sw button{display:inline-flex;gap:.5rem;align-items:center}.pr .sw i{display:inline-block;width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.3)}
.pr .out{border-top:1px solid var(--ink);padding-top:1rem}.pr .big{font:400 clamp(2.8rem,7vw,4rem)/1 var(--display);color:var(--accent)}.pr .big small{font:400 .9rem var(--sans);color:var(--muted);margin-left:.4rem}.pr .sz{margin:.4rem 0 0;color:var(--muted);font-size:.9rem}.pr .btn{width:100%;justify-content:center;margin-top:1rem}.pr .note{display:block;margin-top:.7rem;font-size:.76rem;color:var(--muted)}
@media(max-width:860px){.pr{grid-template-columns:minmax(0,1fr)}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:400 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-prints]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-prints")), st = { s: 1, f: 1, m: 1 }, wall = c.querySelector(".wall"), art = c.querySelector(".art"), mt = art.firstElementChild, im = mt.firstElementChild, rl = c.querySelector(".rule"), g = document.querySelector(".hero .gl3d"), line = "";
  function draw() {
    var s = D.sizes[st.s], F = D.frames[st.f], u = wall.clientWidth / 110, fw = st.f ? 1.3 : 0, mw = st.m ? 2 : 0.4, w = s.w + 2 * (mw + fw), h = s.h + 2 * (mw + fw);
    art.style.width = w * u + "px"; art.style.height = h * u + "px"; art.style.bottom = 50 / 90 * 100 + "%";
    art.style.border = fw * u + "px solid " + F.c; art.style.background = F.c; mt.style.padding = mw * u + "px"; mt.style.background = st.m ? "#FFFEFA" : "#2b2b2b";
    im.style.width = "100%"; im.style.height = "100%"; if (!st.m) mt.style.padding = "0";
    rl.textContent = s.w + " x " + s.h + " in"; rl.style.top = "auto"; rl.style.bottom = "calc(" + (50 / 90 * 100) + "% - 24px)";
    var price = s.p + (st.f ? Math.round(s.p * .55) : 0) + (st.m ? Math.round(s.p * .15) : 0);
    c.querySelector(".big").firstChild.nodeValue = "\\u00A3" + price; c.querySelector("[data-sz]").textContent = s.w + " x " + s.h + " inches, " + (F.n === "No frame" ? "unframed" : F.n.toLowerCase() + " frame") + (st.m ? ", with mount" : ", no mount") + ". About " + Math.round(s.w * 2.54) + " x " + Math.round(s.h * 2.54) + " cm.";
    if (g && st.f && g.gl3d) { g.setAttribute("data-c1", F.h || F.c); g.gl3d.colors(F.h || F.c); }
    line = "Print enquiry: " + s.w + " x " + s.h + " in, " + F.n.toLowerCase() + (st.m ? ", with mount" : "") + ". Estimate \\u00A3" + price + ". Which photograph: ";
  }
  [].forEach.call(c.querySelectorAll("[data-g]"), function (gr) { var k = gr.getAttribute("data-g"), bs = [].slice.call(gr.querySelectorAll("button")); bs.forEach(function (b, i) { b.addEventListener("click", function () { st[k] = i; bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); draw(); }); }); });
  window.addEventListener("resize", draw); draw();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const D = { sizes: [{ w: 10, h: 8, p: 35 }, { w: 16, h: 12, p: 65 }, { w: 20, h: 16, p: 95 }, { w: 30, h: 20, p: 145 }, { w: 36, h: 24, p: 210 }], frames: [{ n: "No frame", c: "transparent" }, { n: "Oak", c: "#C8A06A" }, { n: "Black", c: "#1E1E1E", h: "#2A2A2E" }, { n: "White", c: "#F7F5F0", h: "#EFEAE2" }] };
const btn = (arr, sel, fn) => arr.map((x, i) => `<button type="button" aria-pressed="${i === sel}">${fn(x)}</button>`).join("");
module.exports = R.make({
  name: "prints", themeColor: "#F2EFE9", fonts: FONTS, preload: ["assets/fonts/ArsenalSC-Regular.ttf"], js: JS,
  vars: { bg: "#F2EFE9", surface: "#FBF9F5", ink: "#1F2A30", muted: "#5F6B70", line: "#DAD5CA", accent: "#2F6F73", onaccent: "#FFFFFF", c1: "#C8A06A", c2: "#E8C46A", c3: "#1F2A30", rad: "10px", display: '"Arsenal SC",Georgia,serif', sans: '"Outfit",system-ui,sans-serif', header: "rgba(242,239,233,.93)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Hang <em>your best day</em> on the wall.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#wall"><span>Size my print</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "frame", "polaroid", "A picture frame you can turn", { c1: "#C8A06A", c2: "#E8C46A", c3: "#1F2A30", hint: "a picture frame" })}</div></section>
<section class="sec" id="wall" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Print sizer</span><h2 style="margin-top:.8rem">See it <em>on your wall</em></h2></div></div><div class="pr" data-prints='${JSON.stringify(D)}' data-reveal><div class="wall"><div class="sofa"><i class="sd"></i><i class="sd r"></i><i class="bk"></i><i class="st"></i><i class="lg"></i><i class="lg r"></i></div><div class="art"><div class="mt"><div class="im"></div></div></div><span class="rule"></span></div><div class="ctl"><div class="lb">Size<div class="opt" data-g="s">${btn(D.sizes, 1, (s) => `${s.w}&times;${s.h}`)}</div></div><div class="lb">Frame<div class="opt sw" data-g="f">${btn(D.frames, 1, (f) => `${f.c === "transparent" ? "" : `<i style="background:${f.c}"></i>`}${f.n}`)}</div></div><div class="lb">Mount<div class="opt" data-g="m">${btn([0, 1], 1, (v) => (v ? "With mount" : "No mount"))}</div></div><div class="out"><div class="big">&pound;0<small>each</small></div><p class="sz" data-sz></p><button type="button" class="btn btn-primary" data-book><span>Order this print</span></button><span class="note">Example prices. The sofa is about 84 inches wide, so you can judge the size.</span></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
