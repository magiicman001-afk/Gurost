"use strict";
/**
 * Shared pieces of the salon-only layouts: live borders (a colour ring that circles a card), shimmering image frames, and the
 * enquiry block, footer and filter chips every salon layout ends with. Colours come from CSS variables each layout defines:
 *   --surface (card fill)  --ink  --muted  --line  --accent  --c1 --c2 --c3 (live border colours)  --rad (corner radius)
 */
const B = require("./plus-base");
const { t, footerBits } = B;

/** Live borders and shine. @property lets the browser animate the angle; without it the ring simply stays still. */
const FX = `
@property --ang{syntax:"<angle>";initial-value:0deg;inherits:false}
.live{position:relative;border-radius:var(--rad,24px)}
.live::before{content:"";position:absolute;inset:-2px;border-radius:calc(var(--rad,24px) + 2px);padding:2px;background:conic-gradient(from var(--ang),var(--c1,#B8476B),var(--c2,#F2B8C6),var(--c3,#D9B25A),var(--c1,#B8476B));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);animation:ang 6s linear infinite;pointer-events:none;z-index:2}
.live.halo::after{content:"";position:absolute;inset:-6px;border-radius:calc(var(--rad,24px) + 6px);background:conic-gradient(from var(--ang),var(--c1,#B8476B),var(--c2,#F2B8C6),var(--c3,#D9B25A),var(--c1,#B8476B));filter:blur(18px);opacity:.38;animation:ang 6s linear infinite;z-index:-1;pointer-events:none}
@keyframes ang{to{--ang:360deg}}
.shine{position:relative;overflow:hidden}.shine::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.5) 50%,transparent 62%);transform:translateX(-130%);animation:sheen 6s ease-in-out infinite;pointer-events:none}
@keyframes sheen{0%,55%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
@media(prefers-reduced-motion:reduce){.live::before,.live.halo::after,.shine::after{animation:none}}
`;

/** Rules every salon layout shares: the enquiry block, the footer, filter chips. */
const COMMON_CSS = `
.order{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(24px,5vw,72px);padding:clamp(22px,4vw,56px);background:var(--surface);border-radius:var(--rad,24px)}.order .hours{margin:1.4rem 0}.order address{font-style:normal;color:var(--muted)}@media(max-width:860px){.order{grid-template-columns:1fr}}
.foot{padding:56px 0 30px;margin-top:clamp(56px,8vw,110px);border-top:1px solid var(--line);font-size:1rem}.foot .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:2rem}.foot .brand{display:block;font-size:clamp(1.8rem,3.2vw,2.6rem);margin-bottom:.6rem}.foot p,.foot address{color:var(--muted);font-style:normal;margin:0}
.foot .col{display:grid;gap:.4rem;align-content:start}.foot .col b{font:700 .72rem/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:.4rem}.foot .col a,.foot .col button{width:fit-content}.foot .base{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:2.2rem;padding-top:1.1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.86rem}
@media(max-width:820px){.foot .grid{grid-template-columns:1fr 1fr}.foot .grid>:first-child{grid-column:1/-1}}
.chips{display:flex;gap:.5rem;flex-wrap:wrap;margin:1.5rem 0 0}.chips button{font:700 .86rem/1 var(--sans);padding:.9em 1.3em;border-radius:99px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;transition:.25s}.chips button:hover{border-color:var(--accent)}.chips button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:var(--onaccent,#fff)}
.hours tr.is-today th,.hours tr.is-today td{color:var(--accent)}
`;

const order = (pack, h) => `<section class="sec" id="order" style="padding-bottom:0"><div class="wrap"><div class="order live" data-reveal><div><span class="eyebrow">${pack.order.eyebrow}</span><h2 style="margin:1rem 0 .8rem">${h}</h2><p class="lead" style="margin:0">${pack.copy.atelier.orderLead}</p>
${B.C.hoursRows()}<address>${t("address_line1")}, ${t("address_line2")}<br><a href="tel:${t("phone_href")}">${t("phone")}</a></address></div><div>${pack.form(pack.order.submit)}</div></div></div></section>`;

function foot() {
  const f = footerBits();
  return `<footer class="foot"><div class="wrap"><div class="grid"><div><a class="brand" href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></div>
<div class="col"><b>Visit</b>${f.contact}</div><div class="col"><b>Follow</b>${f.social}</div><div class="col"><b>Legal</b>${f.legal}</div></div>
<div class="base"><span>${f.copy}</span><span data-today></span></div></div></footer>`;
}

const chips = (pack) => `<button type="button" data-filter="all" aria-pressed="true">All</button>` + pack.cats.map((c) => `<button type="button" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("");
const pad = (n) => String(n).padStart(2, "0");
const strip = (s) => String(s).replace(/&middot;/g, "·");
/** Every treatment with its category: [{...item, art, cid, cname}] */
const items = (pack) => pack.cats.flatMap((c) => c.items.map((i) => ({ ...i, art: i.art || c.art, cid: c.id, cname: c.name })));

module.exports = { FX, COMMON_CSS, order, foot, chips, pad, strip, items };
