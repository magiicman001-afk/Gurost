"use strict";
/**
 * swatch (premium plus, built for beauty and tanning salons): a shade picker that retints the whole page. Six round swatches
 * (blush, coral, honey, mint, lilac, bronze) sit in the hero; tap one and the colour blocks, borders and buttons change with a
 * soft sweep, like holding a shade card against your skin. Chunky colour-block tiles, a bento of treatments, a price board and
 * numbered steps. The second page is the full price board by category. Two pages: Home and Treatments.
 * Fonts: Bricolage Grotesque + Instrument Sans (SIL OFL). Pictures from the "gallery" set. No hero loop: the swatches are the motion.
 */
const B = require("./plus-base");
const K = require("./beauty-kit");
const { t, img } = B;

const FONTS = [
  ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"], ["BricolageGrotesque-Regular.ttf", "BricolageGrotesque-Regular.ttf"],
  ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];
const PRELOAD = ["assets/fonts/BricolageGrotesque-Bold.ttf"];
/** name, main colour, pale tint, deeper tone */
const SHADES = [["Blush", "#F2A0B6", "#FFE6EC", "#C9577A"], ["Coral", "#FF8062", "#FFE5DD", "#D14A2C"], ["Honey", "#F5BB45", "#FFF2D2", "#B57A06"], ["Mint", "#6FD3A8", "#DFF7EC", "#1E9A6B"], ["Lilac", "#AD93FF", "#ECE6FF", "#6A4FD6"], ["Bronze", "#DB9A5E", "#F9E6D2", "#9A5A22"]];

const CSS = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--sh:${SHADES[0][1]};--shl:${SHADES[0][2]};--shd:${SHADES[0][3]};--bg:var(--shl);--surface:#FFFFFF;--ink:#1F1219;--muted:#5D4A54;--line:rgba(31,18,25,.16);--accent:#1F1219;--onaccent:#FFFFFF;--c1:var(--sh);--c2:#FFFFFF;--c3:var(--shd);--rad:28px;--display:"Bricolage Grotesque",system-ui,sans-serif;--sans:"Instrument Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,52px);--max:1280px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
${K.FX}
${K.COMMON_CSS}
body{background:var(--bg);color:var(--ink);transition:background .6s var(--ease)}
h1,h2,h3{font-weight:700;letter-spacing:-.03em}h1{font-size:clamp(3.2rem,9vw,8rem);line-height:.92}h2{font-size:clamp(2.2rem,5.4vw,4.4rem);line-height:.98}h3{font-size:1.25rem;letter-spacing:-.01em}
.lead{font-size:clamp(1.05rem,1.4vw,1.22rem);color:var(--muted);max-width:30em}.eyebrow{color:var(--ink);opacity:.7}
.site-header.is-stuck,.mpanel{background:color-mix(in srgb,var(--shl) 92%,#fff)}.site-header .btn-primary,.btn-primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.chips button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:#fff}.hours tr.is-today th,.hours tr.is-today td{color:var(--shd)}
.hero{padding:clamp(96px,12vw,140px) 0 clamp(24px,4vw,50px)}.hero .blk{position:relative;background:var(--sh);border-radius:clamp(28px,4vw,56px);padding:clamp(26px,5vw,72px);display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(20px,4vw,60px);align-items:center;overflow:hidden;transition:background .6s var(--ease)}
.hero .blk::before{content:"";position:absolute;right:-12%;top:-30%;width:70%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.55),transparent 65%);pointer-events:none}
.hero h1{margin:1rem 0 1.2rem}.hero .lead{color:#1F1219;opacity:.78}.hero .eyebrow{opacity:.8}.hero .cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin:1.6rem 0 0}.hero .btn:not(.btn-primary){background:rgba(255,255,255,.55)}
.hero .fr{--rad:30px;background:#fff;padding:10px;position:relative;z-index:1;transform:rotate(2.5deg);box-shadow:0 30px 50px -28px rgba(31,18,25,.45)}.hero .fr .ph{aspect-ratio:4/5;border-radius:22px;overflow:hidden;background:var(--shl)}.hero .fr img{width:100%;height:100%;object-fit:cover}
.pick{display:flex;align-items:center;gap:.9rem;flex-wrap:wrap;margin-top:1.8rem;position:relative;z-index:1}.pick .lbl{font:700 .74rem var(--sans);letter-spacing:.12em;text-transform:uppercase}.pick .sw{display:flex;gap:.55rem}.pick button{width:42px;height:42px;border-radius:50%;border:3px solid #fff;background:var(--s);cursor:pointer;box-shadow:0 4px 10px rgba(31,18,25,.18);transition:transform .3s var(--ease)}.pick button:hover{transform:scale(1.12)}.pick button[aria-pressed=true]{outline:3px solid var(--ink);outline-offset:2px}.pick output{font:700 1rem var(--display);min-width:4.5em}
@media(max-width:820px){.hero .blk{grid-template-columns:1fr}.hero .fr{max-width:380px;justify-self:center;width:100%}}
.sh{display:flex;justify-content:space-between;align-items:end;gap:1rem;flex-wrap:wrap;margin-bottom:clamp(22px,3.4vw,44px)}
/* bento */
.bn{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(12px,1.6vw,20px)}.bt{position:relative;border-radius:var(--rad);padding:clamp(18px,2.4vw,30px);display:grid;align-content:space-between;gap:1.2rem;min-height:300px;overflow:hidden;background:var(--surface);transition:transform .5s var(--ease),background .6s var(--ease)}.bt,.bt:hover{text-decoration:none;color:inherit}.bt:nth-child(4)>div:first-child{max-width:62%}.bt:nth-child(2),.bt:nth-child(3){min-height:400px}.bt:hover{transform:translateY(-6px) rotate(-.6deg)}
.bt:nth-child(1){grid-column:span 2;grid-row:span 2;background:var(--sh)}.bt:nth-child(4){grid-column:span 2;background:var(--shd);color:#fff!important}.bt:nth-child(4) p,.bt:nth-child(4) .n{color:rgba(255,255,255,.85)}
.bt .n{font:700 .78rem var(--sans);letter-spacing:.12em;color:var(--muted)}.bt h3{font-size:clamp(1.6rem,2.6vw,2.4rem);line-height:1;margin:.6rem 0 .5rem}.bt p{margin:0;color:var(--muted);max-width:24em}.bt:nth-child(1) p{color:#1F1219;opacity:.78}
.bt .ph{position:absolute;right:-8px;bottom:-8px;width:clamp(140px,50%,230px);aspect-ratio:1;border-radius:50%;overflow:hidden;border:6px solid #fff;background:var(--shl)}.bt .ph img{width:100%;height:100%;object-fit:cover}.bt:nth-child(1) .ph{width:50%}
.bt ul{list-style:none;margin:.8rem 0 0;padding:0;display:grid;gap:.3rem;position:relative;z-index:1;max-width:60%}.bt li{font:700 .9rem var(--sans)}.bt li span{font-weight:400;opacity:.75;display:block;font-size:.8rem}
@media(max-width:900px){.bn{grid-template-columns:1fr 1fr}.bt:nth-child(1),.bt:nth-child(4){grid-column:span 2}.bt:nth-child(1){grid-row:auto}}@media(max-width:560px){.bn{grid-template-columns:1fr}.bt:nth-child(n){grid-column:auto}.bt{min-height:260px}}
/* favourites strip */
.fv{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,2vw,26px)}.fc{background:var(--surface);padding:10px;--rad:30px}.fc .ph{aspect-ratio:1;border-radius:22px;overflow:hidden;background:var(--shl)}.fc img{width:100%;height:100%;object-fit:cover}.fc .tx{padding:1rem .6rem .6rem}.fc h3{display:flex;justify-content:space-between;gap:.6rem;align-items:baseline;font-size:1.4rem}.fc h3 span{font:700 .8rem var(--sans);background:var(--sh);padding:.4em .7em;border-radius:99px;white-space:nowrap;transition:background .6s}.fc p{margin:.5rem 0 0;color:var(--muted)}@media(max-width:860px){.fv{grid-template-columns:1fr}}
.nm{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,22px)}.nm div{background:var(--surface);border-radius:var(--rad);padding:clamp(18px,3vw,36px) 1rem;text-align:center}.nm b{display:block;font:700 clamp(1.9rem,6vw,5rem)/1 var(--display);letter-spacing:-.04em;color:var(--shd);transition:color .6s}.nm span{font:700 .72rem var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.sy{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,6vw,90px);align-items:center}.sy .ph{aspect-ratio:1;border-radius:50% 50% var(--rad) var(--rad);overflow:hidden;background:var(--sh);transition:background .6s}.sy img{width:100%;height:100%;object-fit:cover}.sy h2{margin:1rem 0 1.2rem}@media(max-width:820px){.sy{grid-template-columns:1fr}.sy .ph{max-width:420px}}
.stp{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(12px,2vw,24px)}.st{background:var(--surface);border-radius:var(--rad);padding:1.6rem}.st .n{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--sh);font:700 1.2rem var(--display);transition:background .6s}.st h3{margin:1rem 0 .3rem}.st p{margin:0;color:var(--muted)}@media(max-width:760px){.stp{grid-template-columns:1fr}}
/* price board */
.cg{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(12px,2vw,24px)}.board{background:var(--surface);border-radius:var(--rad);padding:clamp(20px,3vw,36px)}.board:nth-child(odd){background:color-mix(in srgb,var(--sh) 55%,#fff)}.board h2{font-size:clamp(1.8rem,3.4vw,2.8rem)}.board .bl{color:var(--muted);margin:.4rem 0 1.2rem}.board ul{list-style:none;margin:0;padding:0;display:grid;gap:.9rem}.board li{border-top:1px solid var(--line);padding-top:.8rem}.board .r{display:flex;justify-content:space-between;gap:1rem;align-items:baseline}.board .r b{font:700 1.15rem var(--display)}.board .r span{font:700 .84rem var(--sans);white-space:nowrap}.board p{margin:.2rem 0 0;color:var(--muted);font-size:.95rem}.board .tags{display:flex;gap:.35rem;margin-top:.5rem;flex-wrap:wrap}.tg{font:700 .64rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:var(--ink);color:#fff}
@media(max-width:760px){.cg{grid-template-columns:1fr}}
.mh{padding:clamp(120px,14vw,170px) 0 clamp(20px,4vw,40px)}.mh h1{margin:1rem 0}
.order{--rad:36px}
`;

const JS = `
(function () {
  var pk = document.querySelector("[data-pick]"); if (!pk) return;
  var out = pk.querySelector("output"), root = document.documentElement, btns = pk.querySelectorAll("button");
  function apply(b) {
    root.style.setProperty("--sh", b.dataset.m); root.style.setProperty("--shl", b.dataset.l); root.style.setProperty("--shd", b.dataset.d);
    btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); out.textContent = b.dataset.n;
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", b.dataset.l);
  }
  btns.forEach(function (b) { b.addEventListener("click", function () { apply(b); }); });
})();
`;

const picker = () => `<div class="pick" data-pick><span class="lbl">Try a shade</span><div class="sw" role="group" aria-label="Pick a shade to recolour this page">${SHADES.map(([n, m, l, d], i) => `<button type="button" style="--s:${m}" data-n="${n}" data-m="${m}" data-l="${l}" data-d="${d}" aria-label="${n}" aria-pressed="${i === 0}"></button>`).join("")}</div><output aria-live="polite">${SHADES[0][0]}</output></div>`;

function home(pack) {
  const X = pack.copy.atelier, all = K.items(pack), star = all.filter((i) => i.star).slice(0, 3), lead = star[0] || all[0];
  const tiles = pack.cats.map((c, k) => `<a class="bt" href="menu.html#${c.id}" data-reveal data-delay="${k * 80}"><div><span class="n">${K.pad(k + 1)}</span><h3>${c.name}</h3><p>${c.blurb}</p>${k === 0 ? `<ul>${c.items.slice(0, 3).map((i) => `<li>${i.n}<span>${K.strip(i.meta)}</span></li>`).join("")}</ul>` : ""}</div><div class="ph">${img(c.art, c.name, { w: 520, h: 520, hint: B.hintOf(pack, c) })}</div></a>`).join("");
  const fav = star.map((i) => `<article class="fc live" data-reveal><div class="ph">${img(i.art, i.n, { w: 700, h: 700, hint: B.hintOf(pack, i) })}</div><div class="tx"><h3>${i.n}<span>${K.strip(i.meta)}</span></h3><p>${i.d}</p></div></article>`).join("");
  const body = `<section class="hero"><div class="wrap"><div class="blk"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>${X.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="${X.cta1Href || "#order"}"><span>${X.cta1}</span></a><a class="btn" href="${X.cta2Href || "menu.html"}"><span>${X.cta2}</span></a></div>${picker()}</div>
<div class="fr live"><div class="ph shine">${img(lead.art, lead.n, { role: "featured", w: 900, h: 1100, hint: B.hintOf(pack, lead), lazy: false })}</div></div></div></div></section>
<section class="sec"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="bn">${tiles}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.fav[0]}</span><h2 style="margin-top:.8rem">${X.fav[1]}</h2></div></div><div class="fv">${fav}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="nm">${X.stats.map(([v, s, l]) => `<div data-reveal><b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b><span>${l}</span></div>`).join("")}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sy"><div class="ph" data-reveal>${img(X.story.art, X.story.alt, { role: "featured", w: 900, h: 900, hint: X.story.hint })}</div><div data-reveal><span class="eyebrow">${X.story.eyebrow}</span><h2>${X.story.h2}</h2><p class="lead">${X.story.lead}</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.process[0]}</span><h2 style="margin-top:.8rem">${X.process[1]}</h2></div></div><div class="stp">${X.process[2].map(([h, p], i) => `<div class="st" data-reveal data-delay="${i * 100}"><span class="n">${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${K.order(pack, X.orderHome)}
${K.foot()}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const X = pack.copy.atelier;
  const grp = pack.cats.map((c) => `<section class="board" id="${c.id}" data-cat="${c.id}" data-reveal><h2>${c.name}</h2><p class="bl">${c.blurb}</p><ul>${c.items.map((i) => `<li><div class="r"><b>${i.n}</b><span>${K.strip(i.meta)}</span></div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tg">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("")}</div></li>`).join("")}</ul></section>`).join("");
  const body = `<section class="mh"><div class="wrap"><span class="eyebrow">${X.menuHero[0]}</span><h1>${X.menuHero[1]}</h1><p class="lead">${X.menuHero[2]}</p>${picker()}<div class="chips">${K.chips(pack)}</div></div></section>
<div class="wrap"><div class="cg">${grp}</div></div><div style="height:clamp(30px,5vw,70px)"></div>
${K.order(pack, X.orderMenu)}
${K.foot()}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/beauty")) {
  return { name: "swatch", themeColor: SHADES[0][2], fonts: FONTS, media: B.mediaFor(pack, "swatch", "gallery", "gallery").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.swatch || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
