"use strict";
/**
 * kindred (premium plus, built for rescue and adoption sites): a profile finder. The home page opens on a stack of animal
 * profile cards, then a live finder (kind of animal + "good with" switches) filters every animal on the page. Each card opens
 * a profile pop-up with an "Ask about me" button that pre-fills the enquiry form. A rescue story strip, a connected
 * adoption path and the form follow. The second page lists every animal by kind. Two pages: Home and Our animals.
 * Fonts: Young Serif + Work Sans (SIL OFL). Pictures from the "gallery" set, the pictures of the animals, no hero loop (the
 * animals are the hero). Industry words come from the pack.
 */
const B = require("./plus-base");
const { t, img, footerBits } = B;

const FONTS = [
  ["YoungSerif-Regular.ttf", "YoungSerif-Regular.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"],
  ["WorkSans-Italic.ttf", "WorkSans-Italic.ttf"], ["YoungSerif-OFL.txt", "OFL-YoungSerif.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"],
];
const PRELOAD = ["assets/fonts/YoungSerif-Regular.ttf"];

const CSS = `
@font-face{font-family:"Young Serif";src:url(fonts/YoungSerif-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-style:normal;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
:root{--ink:#22302A;--muted:#5C685F;--line:#E4DCCB;--soft:#F5EFE3;--paper:#FBF8F1;--accent:#BF4F36;--deep:#21382F;--display:"Young Serif",Georgia,serif;--sans:"Work Sans",system-ui,sans-serif;--gut:clamp(18px,4vw,48px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
body{background:var(--paper)}
h1{font-size:clamp(2.7rem,7.2vw,6rem);line-height:.98;letter-spacing:-.02em}h2{font-size:clamp(2rem,4.4vw,3.6rem);line-height:1.04;letter-spacing:-.015em}h3{font-size:1.45rem;line-height:1.12}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,1.5vw,1.28rem);color:var(--muted);max-width:30em}
.site-header.is-stuck,.mpanel{background:rgba(251,248,241,.92)}
.btn{border-radius:14px}.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn-primary:hover{background:var(--deep);border-color:var(--deep)}
.f input,.f textarea{border-radius:12px;background:#fff}
/* hero */
.hero{padding:clamp(104px,12vw,150px) 0 clamp(48px,7vw,96px);overflow:hidden}.hero .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(28px,5vw,72px);align-items:center}
.hero h1{margin:1.1rem 0 1.3rem}.hero .lead{margin:0 0 2rem}.cta-row{display:flex;flex-wrap:wrap;gap:.7rem}
.note{display:flex;align-items:center;gap:.8rem;margin-top:2.2rem;color:var(--muted);font-size:.95rem}.note i{width:10px;height:10px;border-radius:50%;background:#3FA46A;box-shadow:0 0 0 0 rgba(63,164,106,.5);animation:ping 2.2s infinite}
@keyframes ping{70%{box-shadow:0 0 0 12px rgba(63,164,106,0)}100%{box-shadow:0 0 0 0 rgba(63,164,106,0)}}
.stack{position:relative;aspect-ratio:1/1.02}
.pc{position:absolute;width:55%;background:#fff;border-radius:22px;padding:10px 10px 0;box-shadow:0 24px 60px -18px rgba(34,48,42,.35),0 2px 0 rgba(34,48,42,.04);animation:bob 7s ease-in-out infinite;will-change:transform}
.pc .ph{aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:var(--soft)}.pc img{width:100%;height:100%;object-fit:cover}.pc .cp{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;padding:.8rem .4rem .9rem}.pc b{font:400 1.2rem/1 var(--display)}.pc span{font-size:.82rem;color:var(--muted)}
.pc1{left:0;top:7%;--r:-5deg;transform:rotate(var(--r))}.pc2{right:0;top:0;--r:4deg;transform:rotate(var(--r));animation-delay:-2.4s}.pc3{left:23%;bottom:0;--r:-1.5deg;transform:rotate(var(--r));animation-delay:-4.6s;z-index:2}
@keyframes bob{50%{transform:translateY(-10px) rotate(var(--r))}}
.pc .badge{position:absolute;right:-10px;top:-12px;background:var(--accent);color:#fff;font:700 .72rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.55em .8em;border-radius:99px;transform:rotate(6deg)}
@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}.stack{max-width:520px;width:100%;margin:0 auto}}
/* finder */
.finder{padding:clamp(48px,7vw,96px) 0;background:var(--soft);border-block:1px solid var(--line)}
.fhead{display:flex;justify-content:space-between;align-items:end;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.6rem}.fhead p{margin:.6rem 0 0;color:var(--muted)}
.ctl{display:grid;gap:.9rem;margin-bottom:clamp(22px,3vw,36px)}.row2{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}.row2 .lab{font:700 .74rem/1 var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-right:.5rem;min-width:6.5rem}
.pill{font:700 .9rem/1 var(--sans);padding:.8em 1.2em;border-radius:99px;border:1.5px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;transition:.25s var(--ease)}.pill:hover{border-color:var(--ink)}.pill[aria-pressed=true]{background:var(--deep);border-color:var(--deep);color:#fff}
.count{margin:0;font-size:.95rem;color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,24px)}
.card{position:relative;background:#fff;border-radius:20px;overflow:hidden;border:1px solid var(--line);display:flex;flex-direction:column;transition:transform .5s var(--ease),box-shadow .5s var(--ease)}.card[hidden]{display:none}
.card:hover{transform:translateY(-6px);box-shadow:0 26px 50px -22px rgba(34,48,42,.38)}.card .ph{aspect-ratio:1;overflow:hidden;background:var(--soft)}.card .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.1s var(--ease)}.card:hover .ph img{transform:scale(1.06)}
.card .tx{padding:1rem 1.1rem 1.2rem;display:flex;flex-direction:column;gap:.5rem;flex:1}.card h3{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem}.card .meta{font-size:.86rem;color:var(--muted)}.card p{font-size:.95rem;margin:0;color:var(--muted)}
.card .tags{display:flex;flex-wrap:wrap;gap:.35rem}.tg{font:700 .68rem/1 var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:var(--soft);color:var(--deep)}.tg.star{background:var(--accent);color:#fff}
.card .meet{margin-top:auto;align-self:flex-start;font:700 .9rem/1 var(--sans);background:none;border:0;border-bottom:2px solid var(--accent);padding:.3em 0;color:var(--ink);cursor:pointer}.card .meet:hover{color:var(--accent)}
.card .meet::after{content:"";position:absolute;inset:0}
.pop{animation:pop .55s var(--ease) both}@keyframes pop{from{opacity:0;transform:translateY(14px) scale(.97)}}
@media(max-width:1020px){.cards{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.cards{grid-template-columns:repeat(2,1fr)}.card .tx p{display:none}}
@media(max-width:480px){.cards{grid-template-columns:1fr}.card{flex-direction:row}.card .ph{aspect-ratio:1;width:38%;flex:none}.card .tx{padding:.9rem}.row2 .lab{width:100%}}
/* profile pop-up */
dialog.pdlg{max-width:760px}.pdlg .legal-in{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(18px,3vw,34px);padding:clamp(18px,3vw,32px);align-items:start}.pdlg .ph{aspect-ratio:1;border-radius:16px;overflow:hidden;background:var(--soft)}.pdlg img{width:100%;height:100%;object-fit:cover}
.pdlg h2{font-size:2.3rem;margin:.2rem 0 .3rem}.pdlg .meta{color:var(--muted);margin:0 0 1rem}.pdlg .tags{display:flex;gap:.4rem;flex-wrap:wrap;margin:0 0 1.2rem}.pdlg .btn{font-size:.9rem}
.pdlg dl{margin:0 0 1.3rem;display:grid;gap:.5rem;font-size:.95rem}.pdlg dt{font:700 .7rem/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.pdlg dd{margin:0}
@media(max-width:620px){.pdlg .legal-in{grid-template-columns:1fr}.pdlg .ph{aspect-ratio:16/10}}
/* rescue story */
.rescue{background:var(--deep);color:#F2EDE0;padding:clamp(56px,8vw,110px) 0;position:relative;overflow:hidden}.rescue::before{content:"";position:absolute;width:640px;height:640px;border-radius:50%;right:-180px;top:-260px;background:radial-gradient(circle,rgba(191,79,54,.35),transparent 65%)}
.rescue .wrap{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(28px,6vw,90px);align-items:center}.rescue h2 em{color:#F0A58F}.rescue .eyebrow{color:#C9D3C8}.rescue .lead{color:#D2DAD0}
.rs{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-top:2rem}.rs div{border-top:1px solid rgba(255,255,255,.25);padding-top:.9rem}.rs b{display:block;font:400 clamp(2.2rem,4.4vw,3.4rem)/1 var(--display)}.rs span{font-size:.82rem;color:#BAC6B9}
.rescue .ph{aspect-ratio:5/6;border-radius:26px;overflow:hidden;background:#2E4A3F;transform:rotate(1.5deg);box-shadow:0 30px 60px -20px rgba(0,0,0,.5)}.rescue img{width:100%;height:100%;object-fit:cover}
@media(max-width:860px){.rescue .wrap{grid-template-columns:1fr}.rescue .ph{aspect-ratio:4/3}}
/* path */
.path{padding:clamp(60px,9vw,120px) 0}.pathhead{max-width:40rem;margin-bottom:clamp(30px,5vw,60px)}
.ps{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,40px)}.ps::before{content:"";position:absolute;left:0;right:0;top:27px;height:2px;background:var(--line)}.ps::after{content:"";position:absolute;left:0;top:27px;height:2px;width:var(--w,0%);background:var(--accent);transition:width 1.6s var(--ease)}
.ps.in::after{--w:100%}.st{position:relative;padding-top:4.2rem}.st .n{position:absolute;left:0;top:0;width:56px;height:56px;border-radius:50%;background:var(--paper);border:2px solid var(--accent);color:var(--accent);display:grid;place-items:center;font:400 1.4rem/1 var(--display);z-index:1}.st h3{margin-bottom:.4rem}.st p{color:var(--muted);margin:0;max-width:22em}
@media(max-width:720px){.ps{grid-template-columns:1fr;gap:1.6rem}.ps::before,.ps::after{left:27px;right:auto;top:0;bottom:0;width:2px;height:auto}.ps::after{height:var(--w,0%);width:2px}.st{padding:.2rem 0 0 4.6rem}}
/* order */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(26px,5vw,72px);background:#fff;border:1px solid var(--line);border-radius:28px;padding:clamp(22px,4vw,56px)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{background:var(--deep);color:#E9E4D6;padding:56px 0 30px;font-size:1rem;margin-top:clamp(60px,9vw,120px)}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:2rem;margin-bottom:.6rem}.foot p{color:#B8C4B8;margin:0}.foot address{font-style:normal;color:#B8C4B8}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:700 .72rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:#F0A58F;margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}
.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.1rem;border-top:1px solid rgba(255,255,255,.15);color:#9BA99B;font-size:.86rem}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* animals page */
.mhero{padding:clamp(110px,13vw,160px) 0 clamp(20px,3vw,36px)}.mhero h1{font-size:clamp(2.6rem,6vw,5rem);margin:1rem 0 1rem}.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.6rem 0 0}.chips button{font:700 .9rem/1 var(--sans);padding:.8em 1.2em;border-radius:99px;border:1.5px solid var(--line);background:#fff;cursor:pointer;transition:.25s}.chips button[aria-pressed=true]{background:var(--deep);border-color:var(--deep);color:#fff}
.kind{padding:clamp(30px,5vw,60px) 0 0}.kind[hidden]{display:none}.khead{display:flex;align-items:end;justify-content:space-between;gap:1.4rem;flex-wrap:wrap;border-bottom:2px solid var(--ink);padding-bottom:.9rem;margin-bottom:1.4rem}.khead p{margin:0;color:var(--muted);max-width:30em}
`;

const JS = `(function () {
  "use strict";
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var cards = $$("[data-card]"), kinds = $$("[data-find]"), tags = $$("[data-need]"), out = $("[data-count-out]");
  if (kinds.length || tags.length) {
    var kind = "all", need = [];
    var run = function () {
      var n = 0;
      cards.forEach(function (c) {
        var have = (c.getAttribute("data-t") || "").split(" ");
        var ok = (kind === "all" || c.getAttribute("data-c") === kind) && need.every(function (x) { return have.indexOf(x) > -1; });
        c.hidden = !ok;
        if (ok) { n++; c.classList.remove("pop"); c.style.animationDelay = Math.min(n, 12) * 35 + "ms"; void c.offsetWidth; c.classList.add("pop"); }
      });
      if (out) out.textContent = n ? "Showing " + n + (n === 1 ? " animal" : " animals") : "No match yet. Try fewer switches, or ask us: new animals arrive every week.";
    };
    kinds.forEach(function (b) { b.addEventListener("click", function () { kind = b.getAttribute("data-find"); kinds.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); run(); }); });
    tags.forEach(function (b) { b.addEventListener("click", function () { var v = b.getAttribute("data-need"), on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on ? "true" : "false"); need = need.filter(function (x) { return x !== v; }); if (on) need.push(v); run(); }); });
  }
  $$("[data-pet]").forEach(function (b) { b.addEventListener("click", function () { var dlg = d.getElementById(b.getAttribute("data-pet")); if (dlg && dlg.showModal) dlg.showModal(); }); });
  $$("[data-ask]").forEach(function (a) { a.addEventListener("click", function () {
    var dlg = a.closest("dialog"); if (dlg) dlg.close();
    var ta = $("#order textarea"); if (ta && !ta.value) ta.value = "Hello, I would like to hear more about " + a.getAttribute("data-ask") + ".";
  }); });
})();
`;

const pad = (n) => String(n).padStart(2, "0");
const stat = ([v, s]) => `<b data-count="${v}"${s ? ` data-suffix="${s}"` : ""}>${v}${s}</b>`;
const animals = (pack) => pack.cats.flatMap((c) => c.items.map((i) => ({ ...i, art: i.art || c.art, cat: c.id })));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function card(pack, i) {
  const id = "pet-" + slug(i.n);
  const names = i.tags.map((x) => `<span class="tg" title="${pack.tags[x]}">${x}</span>`).join("");
  return `<article class="card" data-card data-c="${i.cat}" data-t="${i.tags.join(" ")}"><div class="ph">${img(i.art, i.n, { w: 640, h: 640, hint: B.hintOf(pack, i) })}</div>
<div class="tx"><h3>${i.n}</h3><span class="meta">${i.meta}</span><p>${i.d}</p><div class="tags">${i.star ? '<span class="tg star">Favourite</span>' : ""}${names}</div><button class="meet" type="button" data-pet="${id}" aria-label="Meet ${i.n}">Meet ${i.n}</button></div></article>`;
}
function dialog(pack, i) {
  const id = "pet-" + slug(i.n);
  const full = i.tags.map((x) => pack.tags[x]).join(" &middot; ") || "&nbsp;";
  return `<dialog class="legal pdlg" id="${id}" aria-labelledby="${id}-t"><button class="legal-x" type="button" data-close aria-label="Close">&times;</button><div class="legal-in"><div class="ph">${img(i.art, i.n, { w: 640, h: 640, hint: B.hintOf(pack, i) })}</div>
<div><span class="eyebrow">${pack.copy.atelier.fav[0]}</span><h2 id="${id}-t">${i.n}</h2><p class="meta">${i.meta}</p><p>${i.d}</p><dl><dt>Good to know</dt><dd>${full}</dd></dl><a class="btn btn-primary" href="#order" data-ask="${i.n}"><span>Ask about ${i.n}</span></a></div></div></dialog>`;
}

const ORDER = (pack, h) => `<section class="sec" id="order" style="padding-bottom:0"><div class="wrap"><div class="order" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

function home(pack) {
  const K = pack.copy.atelier, all = animals(pack), kinds = pack.cats;
  const star = all.filter((i) => i.star).slice(0, 3);
  const stack = star.map((i, k) => `<div class="pc pc${k + 1}">${k === 2 ? '<span class="badge">Meet me</span>' : ""}<div class="ph">${img(i.art, i.n, { role: "featured", w: 640, h: 800, hint: B.hintOf(pack, i), lazy: k > 0 })}</div><div class="cp"><b>${i.n}</b><span>${i.meta}</span></div></div>`).join("");
  const finder = `<div class="ctl"><div class="row2" role="group" aria-label="Kind of animal"><span class="lab">I am looking for</span><button class="pill" type="button" data-find="all" aria-pressed="true">All</button>${kinds.map((c) => `<button class="pill" type="button" data-find="${c.id}" aria-pressed="false">${c.name}</button>`).join("")}</div>
<div class="row2" role="group" aria-label="Good with"><span class="lab">It should be</span>${Object.keys(pack.tags).map((x) => `<button class="pill" type="button" data-need="${x}" aria-pressed="false" title="${pack.tags[x]}">${pack.tags[x]}</button>`).join("")}</div><p class="count" data-count-out aria-live="polite">Showing ${all.length} animals</p></div>`;
  const body = `
<section class="hero"><div class="wrap"><div><span class="eyebrow">${K.heroEyebrow}</span><h1>${K.heroH1}</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="#meet"><span>${K.collection[2]}</span></a><a class="btn" href="${K.cta2Href || "menu.html"}"><span>${K.cta2}</span></a></div>
<p class="note"><i></i>${K.glass[2]}</p></div><div class="stack" aria-hidden="false">${stack}</div></div></section>
<section class="finder" id="meet"><div class="wrap"><div class="fhead" data-reveal><div><span class="eyebrow">${K.fav[0]}</span><h2 style="margin-top:.8rem">${K.fav[1]}</h2></div><a class="btn" href="menu.html"><span>${K.collection[2]}</span></a></div>
${finder}<div class="cards">${all.map((i) => card(pack, i)).join("")}</div></div></section>
<section class="rescue"><div class="wrap"><div data-reveal><span class="eyebrow">${K.story.eyebrow}</span><h2 style="margin:1rem 0 1.2rem">${K.story.h2}</h2><p class="lead">${K.story.lead}</p><div class="rs">${K.stats.map((x) => `<div>${stat(x)}<span>${x[2]}</span></div>`).join("")}</div></div>
<div class="ph" data-reveal data-delay="150">${img(K.story.art, K.story.alt, { role: "featured", w: 900, h: 1080, hint: K.story.hint })}</div></div></section>
<section class="path"><div class="wrap"><div class="pathhead" data-reveal><span class="eyebrow">${K.process[0]}</span><h2 style="margin-top:.8rem">${K.process[1]}</h2></div>
<div class="ps" data-reveal>${K.process[2].map(([h, p], i) => `<div class="st"><span class="n">${i + 1}</span><h3>${h}</h3><p>${p}</p></div>`).join("")}</div></div></section>
${ORDER(pack, K.orderHome)}
${foot()}
${all.map((i) => dialog(pack, i)).join("\n")}`;
  return B.page({ title: pack.seo.home.title, desc: pack.seo.home.desc, key: "home", body, preload: PRELOAD, pack });
}

function menu(pack) {
  const K = pack.copy.atelier, kinds = pack.cats;
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + kinds.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const sec = kinds.map((c) => `<section class="kind" id="${c.id}" data-cat="${c.id}"><div class="khead"><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="cards">${c.items.map((i) => card(pack, { ...i, art: i.art || c.art, cat: c.id })).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">${K.menuHero[0]}</span><h1>${K.menuHero[1]}</h1><p class="lead">${K.menuHero[2]}</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${sec}</div>
${ORDER(pack, K.orderMenu)}
${foot()}
${animals(pack).map((i) => dialog(pack, i)).join("\n")}`;
  return B.page({ title: pack.seo.menu.title, desc: pack.seo.menu.desc, key: "menu", body, preload: PRELOAD, pack });
}

function build(pack = require("./packs/sanctuary")) {
  return { name: "kindred", themeColor: "#FBF8F1", fonts: FONTS, media: B.mediaFor(pack, "kindred", "gallery", "gallery").filter(([, to]) => !/^video\//.test(to)), files: { "index.html": home(pack), "menu.html": menu(pack), "assets/style.css": CSS + (pack.css.kindred || ""), "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS + "\n" + JS } };
}
module.exports = { build };
