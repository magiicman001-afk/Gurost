"use strict";
/**
 * bakery-gallery (premium plus): a bright white gallery feel. A looping video orbit that melts into the page, a scroll-snap rail of
 * favourites, sticky storytelling and a big type statement. Two pages: Home and Menu. Fonts: Young Serif + Outfit (SIL OFL).
 */
const B = require("./plus-base");
const { t, img, video, footerBits, MENU, TAGS } = B;

const FONTS = [
  ["YoungSerif-Regular.ttf", "YoungSerif-Regular.ttf"], ["Outfit-Regular.ttf", "Outfit-Regular.ttf"], ["Outfit-Bold.ttf", "Outfit-Bold.ttf"],
  ["YoungSerif-OFL.txt", "OFL-YoungSerif.txt"], ["Outfit-OFL.txt", "OFL-Outfit.txt"],
];
const MEDIA = [
  ...["croissant", "loaf", "baguettes", "cupcake", "slice", "coffee", "roll", "wheat"].map((n) => [`img/gallery/${n}.webp`, `img/${n}.webp`]),
  ["video/gallery-hero.mp4", "video/gallery-hero.mp4"], ["video/gallery-hero.webm", "video/gallery-hero.webm"], ["video/gallery-poster.webp", "video/gallery-poster.webp"],
];
const PRELOAD = ["assets/fonts/YoungSerif-Regular.ttf"];

const CSS = `
@font-face{font-family:"Young Serif";src:url(fonts/YoungSerif-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--ink:#1F1A14;--muted:#6F665B;--line:#EDE7DD;--soft:#FBF7F0;--accent:#B7790F;--gold:#F2B93B;--display:"Young Serif",Georgia,serif;--sans:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(20px,5vw,56px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
${B.BASE_CSS}
h1{font-size:clamp(2.9rem,7.6vw,6rem);line-height:1;letter-spacing:-.02em}h2{font-size:clamp(2.1rem,4.8vw,3.5rem);line-height:1.06;letter-spacing:-.015em}h3{font-size:1.35rem;line-height:1.2}
h1 em,h2 em{font-style:normal;color:var(--accent)}.lead{font-size:clamp(1.05rem,2vw,1.25rem);color:var(--muted);max-width:32em}
.brand{font-size:1.5rem}
/* hero: copy left, a video that blends into the white page on the right */
.hero{padding:clamp(120px,14vw,170px) 0 clamp(24px,5vw,56px);overflow:hidden}
.hero .wrap{display:grid;grid-template-columns:1fr 1.15fr;gap:clamp(8px,3vw,40px);align-items:center}
.hero .lead{margin:1.4rem 0 2rem}.cta-row{display:flex;flex-wrap:wrap;gap:.8rem}
.vwrap{position:relative;overflow:hidden;aspect-ratio:16/10;margin-right:calc(var(--gut) * -1)}.vwrap video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:multiply;transform:scale(1.2)}
.vwrap::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(closest-side,rgba(255,255,255,0) 62%,#fff 99%)}
.badge{position:absolute;left:6%;bottom:6%;z-index:2;background:#fff;border-radius:99px;padding:.7em 1.1em;box-shadow:0 10px 40px rgba(60,40,10,.14);font-weight:700;font-size:.9rem;display:flex;align-items:center;gap:.6em}
.badge i{width:9px;height:9px;border-radius:50%;background:#2fb764;display:block}
@media(max-width:900px){.hero .wrap{grid-template-columns:1fr}.vwrap{margin:0 calc(var(--gut) * -1);aspect-ratio:4/3}}
/* ticker */
.ticker{border-block:1px solid var(--line);overflow:hidden;padding:1.1rem 0;white-space:nowrap}.ticker div{display:inline-flex;gap:2.4rem;animation:tick 38s linear infinite;font:400 1.5rem/1 var(--display)}
.ticker span::after{content:"\\2726";color:var(--gold);margin-left:2.4rem}@keyframes tick{to{transform:translateX(-50%)}}
/* rail */
.head{display:flex;justify-content:space-between;align-items:end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,48px)}
.arrows{display:flex;gap:.6rem}.arrows button{width:52px;height:52px;border-radius:50%;border:1.5px solid var(--ink);background:#fff;font-size:1.3rem;cursor:pointer;transition:.3s}.arrows button:hover{background:var(--ink);color:#fff}
.railbox{overflow:hidden}.rail{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;--pad:max(var(--gut),calc((100vw - var(--max))/2 + var(--gut)));padding:6px var(--pad) 28px;scroll-padding-left:var(--pad);scrollbar-width:none;cursor:grab;-webkit-overflow-scrolling:touch}.rail::-webkit-scrollbar{display:none}.rail.drag{cursor:grabbing;scroll-snap-type:none}
.pc{flex:0 0 min(78vw,340px);scroll-snap-align:start;border-radius:28px;background:var(--soft);padding:12px 12px 22px;display:grid;gap:1rem;text-decoration:none;transition:transform .5s var(--ease),box-shadow .5s}
.pc:hover{transform:translateY(-6px);box-shadow:0 24px 50px rgba(60,40,10,.12)}.pc .ph{border-radius:20px;overflow:hidden;aspect-ratio:4/5;background:#fff}.pc img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease);-webkit-user-drag:none;user-select:none}.pc:hover img{transform:scale(1.06)}
.pc .row{display:flex;justify-content:space-between;gap:1rem;padding:0 .6rem;align-items:baseline}.pc p{margin:0;padding:0 .6rem;color:var(--muted);font-size:.95rem}.price{font-weight:700;white-space:nowrap}
.pc .add{margin:0 .6rem;font-weight:700;font-size:.9rem;color:var(--accent)}
/* sticky story */
.story{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,7vw,110px);align-items:start}
.story .stick{position:sticky;top:110px}.story .stick .lead{margin:1.2rem 0 2rem}
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;border-top:1px solid var(--line);padding-top:1.6rem}.facts b{display:block;font:400 clamp(2rem,4vw,3rem)/1 var(--display);color:var(--accent)}.facts span{font-size:.9rem;color:var(--muted)}
.panels{display:grid;gap:clamp(18px,3vw,32px)}.panel{border-radius:30px;overflow:hidden;background:var(--soft);display:grid}.panel .ph{aspect-ratio:1/.8;overflow:hidden}.panel img{width:100%;height:100%;object-fit:cover}
.panel div.tx{padding:1.4rem 1.6rem 1.8rem}.panel p{margin:.4rem 0 0;color:var(--muted)}
@media(max-width:860px){.story{grid-template-columns:1fr}.story .stick{position:static}}
/* statement */
.statement{font:400 clamp(2.4rem,7.4vw,6.2rem)/1.04 var(--display);letter-spacing:-.025em;max-width:13em}.statement em{font-style:normal;color:var(--accent)}
.statement span{opacity:.18;transition:opacity .8s var(--ease)}.statement.in span{opacity:1}
.statement.in span:nth-child(2){transition-delay:.15s}.statement.in span:nth-child(3){transition-delay:.3s}.statement.in span:nth-child(4){transition-delay:.45s}.statement.in span:nth-child(5){transition-delay:.6s}
/* order */
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,6vw,90px);padding:clamp(26px,5vw,64px);border-radius:36px;background:var(--soft);border:1px solid var(--line)}
.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
/* footer */
.foot{padding:56px 0 36px;border-top:1px solid var(--line);font-size:.95rem}.foot .grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:1.9rem;margin-bottom:.6rem}.foot p{color:var(--muted);max-width:26em}
.foot address{font-style:normal;color:var(--muted)}.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col a,.foot .col button{width:fit-content}
.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.4rem;padding-top:1.4rem;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
@media(max-width:720px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
/* menu */
.mhero{padding:150px 0 30px}.mhero .lead{margin-top:1.2rem}
.chips{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:2rem}.chips button{font:700 .9rem/1 var(--sans);padding:.85em 1.3em;border-radius:999px;border:1.5px solid var(--line);background:#fff;cursor:pointer;transition:.25s}
.chips button[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.cat{padding:clamp(28px,5vw,56px) 0}.cat[hidden]{display:none}.cat>header{display:flex;align-items:baseline;gap:1.2rem;flex-wrap:wrap;margin-bottom:1.6rem}.cat>header p{margin:0;color:var(--muted)}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.mc{border-radius:26px;background:var(--soft);padding:10px 10px 20px;display:grid;gap:.9rem;align-content:start}.mc .ph{border-radius:18px;overflow:hidden;aspect-ratio:1;background:#fff}.mc img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.mc:hover img{transform:scale(1.06)}
.mc .row{display:flex;justify-content:space-between;gap:.8rem;align-items:baseline;padding:0 .6rem}.mc h3{font-size:1.15rem}.mc p{padding:0 .6rem;margin:0;font-size:.92rem;color:var(--muted)}
.tags{display:flex;gap:.4rem;padding:0 .6rem}.tag{font:700 .66rem/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;padding:.45em .7em;border-radius:99px;background:#fff;color:var(--muted)}.tag.star{background:var(--gold);color:var(--ink)}
@media(max-width:1000px){.grid4{grid-template-columns:repeat(2,1fr)}}@media(max-width:420px){.grid4{gap:12px}.mc h3{font-size:1rem}.mc .row{flex-direction:column;gap:.2rem}}
`;

const ORDER = (h) => `<section class="sec" id="order" style="padding-top:0"><div class="wrap"><div class="order" data-reveal>
<div><span class="eyebrow">Pre-order</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">Pick a day and a time. We bake it, you collect it.</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div>
<div>${B.C.form("order", { submit: "Send my pre-order" })}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid">
<div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div>
<div class="col"><b>Follow</b>${f.social}<b style="margin-top:.8rem">Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

const items = () => MENU.flatMap((c) => c.items.map((i) => ({ ...i, art: i.art || c.art, cat: c.name })));

function home() {
  const stars = items().filter((i) => i.star);
  const cards = stars.map((i) => `<a class="pc" href="index.html#order"><div class="ph">${img(i.art, i.n, { hint: "bakery " + i.n.toLowerCase() })}</div><div class="row"><h3>${i.n}</h3><span class="price">&pound;${i.p}</span></div><p>${i.d}</p><span class="add">Add to pre-order &rarr;</span></a>`).join("");
  const words = MENU.map((c) => c.name).concat(MENU.map((c) => c.name)).map((n) => `<span>${n}</span>`).join("");
  const body = `
<section class="hero"><div class="wrap"><div><span class="eyebrow">${t("city")} &middot; Since ${t("year_founded")}</span><h1 style="margin-top:1.2rem">Bread worth <em>the walk</em>.</h1><p class="lead">${t("tagline")}</p>
<div class="cta-row"><a class="btn btn-primary" href="#order"><span>Pre-order</span></a><a class="btn" href="menu.html"><span>Browse the menu</span></a></div></div>
<div class="vwrap">${video("gallery")}<div class="badge"><i></i>Baking now &middot; open ${t("hours_weekdays")}</div></div></div></section>
<div class="ticker" aria-hidden="true"><div>${words}${words}</div></div>
<section class="sec"><div class="wrap head"><div><span class="eyebrow">Today's best</span><h2 style="margin-top:1rem">Our <em>favourites</em></h2></div><div class="arrows"><button type="button" data-rail-prev aria-label="Previous">&larr;</button><button type="button" data-rail-next aria-label="Next">&rarr;</button></div></div>
<div class="railbox"><div class="rail" data-rail tabindex="0" aria-label="Favourite bakes">${cards}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap story"><div class="stick" data-reveal><span class="eyebrow">Our story</span><h2 style="margin:1rem 0 0">Made by hand, <em>never rushed</em></h2><p class="lead">${t("owner_name")} started ${t("business_name")} in ${t("year_founded")}. Every loaf is mixed, shaped and baked on site, the same way, every day.</p>
<div class="facts"><div><b data-count="${t("years_baking")}">${t("years_baking")}</b><span>years baking</span></div><div><b data-count="36" data-suffix="h">36h</b><span>slow rise</span></div><div><b data-count="100" data-suffix="%">100%</b><span>real butter</span></div></div></div>
<div class="panels"><article class="panel" data-reveal><div class="ph">${img("wheat", "Flour and wheat", { role: "featured", w: 960, h: 660, hint: "bakery flour wheat" })}</div><div class="tx"><h3>Good flour</h3><p>Stoneground and sourced close to home.</p></div></article>
<article class="panel" data-reveal><div class="ph">${img("loaf", "Sourdough loaf", { w: 960, h: 660, hint: "sourdough loaf" })}</div><div class="tx"><h3>Slow fermentation</h3><p>Thirty-six hours for flavour and a better crumb.</p></div></article>
<article class="panel" data-reveal><div class="ph">${img("croissant", "Butter croissant", { w: 960, h: 660, hint: "butter croissant" })}</div><div class="tx"><h3>Out of the oven</h3><p>Warm when you pick it up, as it should be.</p></div></article></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><p class="statement" data-reveal><span>Baked</span> <span>in</span> <span><em>${t("city")}</em></span> <span>every</span> <span>morning.</span></p></div></section>
${ORDER("Order ahead and <em>skip the queue</em>")}
${foot()}`;
  return B.page({ title: "Fresh bakery", desc: "Artisan bakery in {{city}}. Sourdough, pastries and coffee, baked fresh every morning.", key: "home", body, preload: PRELOAD });
}

function menu() {
  const chips = `<button type="button" data-filter="all" aria-pressed="true">All</button>` + MENU.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
  const cats = MENU.map((c) => `<section class="cat" id="${c.id}" data-cat="${c.id}"><header><h2>${c.name}</h2><p>${c.blurb}</p></header><div class="grid4">${c.items.map((i) => `<article class="mc" data-reveal><div class="ph">${img(i.art || c.art, i.n, { hint: "bakery " + i.n.toLowerCase() })}</div><div class="row"><h3>${i.n}</h3><span class="price">&pound;${i.p}</span></div><p>${i.d}</p><div class="tags">${i.star ? '<span class="tag star">Favourite</span>' : ""}${i.tags.map((x) => `<span class="tag" title="${TAGS[x]}">${x}</span>`).join("")}</div></article>`).join("")}</div></section>`).join("");
  const body = `<section class="mhero"><div class="wrap"><span class="eyebrow">Menu</span><h1 style="margin-top:1rem">The <em>full</em> menu</h1><p class="lead">Prices include VAT. V vegetarian, VG vegan, GF gluten free. Ask us about allergens.</p><div class="chips">${chips}</div></div></section>
<div class="wrap">${cats}</div>
${ORDER("Ready to <em>order</em>?")}
${foot()}`;
  return B.page({ title: "Menu", desc: "Our full menu: bread, pastries, cakes and coffee at {{business_name}}, {{city}}.", key: "menu", body, preload: PRELOAD });
}

function build() {
  return { name: "gallery", themeColor: "#FFFFFF", fonts: FONTS, media: MEDIA, files: { "index.html": home(), "menu.html": menu(), "assets/style.css": CSS, "assets/site.js": B.C.SITE_JS + "\n" + B.PLUS_JS } };
}
module.exports = { build };
