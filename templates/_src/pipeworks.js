"use strict";
/**
 * pipeworks (trades, real 3D): a plumber's page in deep teal with an animated water wave, a turnable 3D spanner, and an "is it an
 * emergency?" checker that answers call-now or book-online. Fonts: Bricolage Grotesque (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Regular.ttf"], ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"]];
const css = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.025em}h1{font-size:clamp(3rem,8.6vw,7.6rem);line-height:.94}h2{font-size:clamp(2.2rem,5vw,4.2rem);line-height:1}h3{font-size:1.4rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.hero{position:relative;overflow:hidden;padding:clamp(110px,12vw,150px) 0 0;background:linear-gradient(180deg,#06303A 0%,#0A4A57 100%)}
.hero .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:center;position:relative;z-index:2}.hero h1{margin:1rem 0 1.4rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:480px;justify-self:center;filter:drop-shadow(0 24px 30px rgba(0,0,0,.4))}
@media(max-width:820px){.hero .wrap{grid-template-columns:1fr}}
.waves{display:block;width:100%;height:clamp(70px,10vw,130px);margin-top:-10px;position:relative;z-index:1}.waves path{animation:sway 9s ease-in-out infinite alternate}.waves path:nth-child(2){animation-duration:13s;animation-direction:alternate-reverse}@keyframes sway{to{transform:translateX(-90px)}}
@media(prefers-reduced-motion:reduce){.waves path{animation:none}}
.chk{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(20px,5vw,70px);background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:clamp(20px,4vw,50px);align-items:start}.chk h2{margin:.8rem 0 1rem}
.q{display:grid;gap:.9rem}.q fieldset{border:0;margin:0;padding:0}.q legend{font-weight:700;margin-bottom:.4rem}.q label{display:flex;gap:.7rem;align-items:center;border:1px solid var(--line);border-radius:12px;padding:.7rem .9rem;margin:.35rem 0;cursor:pointer}.q input{accent-color:var(--accent);width:1.1rem;height:1.1rem}
.res{margin-top:.4rem;border-radius:14px;padding:1.2rem;background:rgba(255,255,255,.06);border:1px solid var(--line)}.res b{display:block;font:700 1.5rem var(--display)}.res.hot{background:#D9421F;border-color:#D9421F;color:#fff}.res.hot a{color:#fff}.res p{margin:.4rem 0 0}
@media(max-width:820px){.chk{grid-template-columns:1fr}}
.dl{display:grid;gap:0;border-top:1px solid var(--line)}.dl a{display:grid;grid-template-columns:3rem 1fr auto;gap:1rem;align-items:center;padding:1.1rem 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit}.dl a:hover h3{color:var(--accent)}.dl .n{color:var(--accent);font-weight:700}.dl p{margin:.2rem 0 0;color:var(--muted)}.dl em{font-style:normal;font-weight:700;white-space:nowrap}
@media(max-width:600px){.dl a{grid-template-columns:2rem 1fr}.dl em{grid-column:2}}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(10px,2vw,22px);margin-top:clamp(24px,4vw,44px)}.tiles a{text-decoration:none;color:inherit;text-align:center;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:1rem}.tiles img{width:100%;aspect-ratio:1;object-fit:contain}.tiles b{display:block;margin-top:.4rem}@media(max-width:600px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pill{display:flex;flex-wrap:wrap;gap:.6rem}.pill span{border:1px solid var(--line);border-radius:99px;padding:.5rem 1rem;color:var(--muted)}
.rv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.rv blockquote{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:1.4rem}.rv p{margin:0 0 .8rem;font-size:1.05rem}.rv cite{font-style:normal;color:var(--muted);font-size:.85rem}@media(max-width:820px){.rv{grid-template-columns:1fr}}
`;
const JS = `
(function () {
  var f = document.querySelector("[data-chk]"); if (!f) return; var out = f.querySelector(".res");
  function u() {
    var v = function (n) { var c = f.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ""; };
    if (!v("a") || !v("b")) { out.className = "res"; out.innerHTML = "<b>Answer both questions</b><p>We will tell you what to do next.</p>"; return; }
    if (v("a") === "y" || v("b") === "y") { out.className = "res hot"; out.innerHTML = '<b>Call us now</b><p>Turn off the water at the stopcock if you can, then call <a href="tel:' + f.getAttribute("data-tel") + '">' + f.getAttribute("data-phone") + "</a>. An engineer will be on the road within the hour.</p>"; }
    else { out.className = "res"; out.innerHTML = "<b>Book online</b><p>This can wait for a planned visit. Request a free quote below and we will call you back within the hour.</p>"; }
  }
  f.addEventListener("change", u); u();
})();
`;
module.exports = R.make({
  name: "pipeworks", themeColor: "#06303A", fonts: FONTS, preload: ["assets/fonts/BricolageGrotesque-Bold.ttf"], js: JS,
  vars: { bg: "#06303A", surface: "#0A3F4C", ink: "#F0FAFB", muted: "#A9CBD1", line: "rgba(240,250,251,.18)", accent: "#4FD1E8", onaccent: "#032229", c2: "#FFD166", c3: "#4FD1E8", display: '"Bricolage Grotesque","Arial Narrow",system-ui,sans-serif', sans: '"Bricolage Grotesque",system-ui,sans-serif', header: "rgba(6,48,58,.92)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const plumb = pack.cats.find((c) => c.id === "plumbing");
    const dl = pack.cats.flatMap((c) => c.items.filter((i) => i.star)).map((i, k) => `<a href="menu.html" data-reveal><span class="n">${K.pad(k + 1)}</span><div><h3>${i.n}</h3><p>${i.d}</p></div><em>${K.strip(i.meta)}</em></a>`).join("");
    const rv = pack.reviews.map((r) => `<blockquote data-reveal><p>&ldquo;${r.q}&rdquo;</p><cite>${r.by}</cite></blockquote>`).join("");
    const gallery = `<div class="tiles">${pack.cats.map((c) => `<a href="menu.html#${c.id}">${img(c.art, c.name, { w: 300, h: 300, hint: B.hintOf(pack, c) })}<b>${c.name}</b></a>`).join("")}</div>`;
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#order"><span>${X.cta1}</span></a><a class="btn" href="tel:${t("phone_href")}"><span>Call ${t("phone")}</span></a></div></div>${model3d(pack, "wrench", "wrench", "A steel spanner", { c1: "#4FD1E8", c2: "#FFD166", lum: 1, hint: "a spanner" })}</div><svg class="waves" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path d="M-90 60 C 100 10, 260 110, 450 60 S 800 10, 990 60 S 1340 110, 1540 60 V120 H-90 Z" fill="rgba(79,209,232,.35)"/><path d="M-90 80 C 120 40, 300 120, 500 80 S 860 40, 1060 80 S 1380 120, 1560 80 V120 H-90 Z" fill="#06303A"/></svg></section>
<section class="sec"><div class="wrap"><div class="chk" data-chk data-tel="${t("phone_href")}" data-phone="${t("phone")}" data-reveal><div><span class="eyebrow">Quick check</span><h2>Is it an <em>emergency</em>?</h2><p class="lead">Two questions, and we will tell you whether to call now or book online.</p></div><div class="q"><fieldset><legend>Is water or power spreading into the house?</legend><label><input type="radio" name="a" value="y"> Yes, it is getting worse</label><label><input type="radio" name="a" value="n"> No, it is contained</label></fieldset><fieldset><legend>Is there no heat, hot water or power at all?</legend><label><input type="radio" name="b" value="y"> Yes, nothing works</label><label><input type="radio" name="b" value="n"> No, it mostly works</label></fieldset><div class="res" aria-live="polite"></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.fav[0]}</span><h2 style="margin-top:.8rem">${X.fav[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="dl">${dl}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="rv">${rv}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><span class="eyebrow">Areas we cover</span><h2 style="margin:.8rem 0 1.2rem">All across <em>${t("city")}</em></h2><div class="pill">${pack.areas.map((a) => `<span>${a}</span>`).join("")}</div>${gallery}</div></section>`;
  },
});
