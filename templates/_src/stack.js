"use strict";
/**
 * stack (tech agency and SaaS, real 3D): a dark terminal look (near-black, mint green) with a turnable 3D microchip and a "pick your
 * tech stack" tool: choose what you are building and how many users you expect, and the tool prints the matching command line and lays
 * out the layers (front end, back end, data, extras, hosting) with a plain-English reason for each, a build time and a monthly hosting
 * cost. Pre-fills the call request. Fonts: Geist Mono + Instrument Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["GeistMono-Regular.ttf", "GeistMono-Regular.ttf"], ["GeistMono-Bold.ttf", "GeistMono-Bold.ttf"], ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"], ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"], ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"], ["GeistMono-OFL.txt", "OFL-GeistMono.txt"]];
const css = `
@font-face{font-family:"Geist Mono";src:url(fonts/GeistMono-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Geist Mono";src:url(fonts/GeistMono-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.04em}h1{font-size:clamp(2.6rem,7vw,5.6rem);line-height:1}h2{font-size:clamp(1.9rem,4.2vw,3.1rem);line-height:1.06}h3{font-size:1.15rem;letter-spacing:-.02em}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{font-family:var(--mono);color:var(--accent);letter-spacing:.08em}.eyebrow:before{content:"> "}
.hero{padding:clamp(110px,12vw,150px) 0 clamp(26px,4vw,56px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:440px;justify-self:center}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.sk{border:1px solid #243028;border-radius:14px;background:#0A0F0C;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45)}.sk .bar{display:flex;gap:6px;align-items:center;padding:.7rem 1rem;background:#111A14;border-bottom:1px solid #243028;font:400 .74rem var(--mono);color:#7E9A88}.sk .bar i{width:10px;height:10px;border-radius:50%;background:#2B3A31}.sk .bar span{margin-left:.6rem}
.sk .in{padding:clamp(16px,3vw,30px);display:grid;gap:1.2rem}.sk .lb{display:grid;gap:.5rem;font:400 .74rem var(--mono);color:#7E9A88;text-transform:uppercase;letter-spacing:.08em}.opt{display:flex;gap:.5rem;flex-wrap:wrap}.opt button{font:400 .85rem var(--mono);border:1px solid #2C3C32;border-radius:6px;background:#0E1511;color:#CFE6D8;padding:.55rem .9rem;cursor:pointer}.opt button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#04140A;font-weight:700}
.sk .cmd{font:400 clamp(.78rem,2.2vw,.95rem) var(--mono);color:#CFE6D8;background:#060A08;border:1px solid #1D2A22;border-radius:8px;padding:.9rem 1rem;overflow-wrap:anywhere}.sk .cmd b{color:var(--accent)}.sk .cmd:after{content:"\\2588";color:var(--accent);animation:bl 1s steps(2) infinite;margin-left:.2rem}@keyframes bl{50%{opacity:0}}
.sk .layers{display:grid;gap:0}.sk .ly{display:grid;grid-template-columns:7.5rem minmax(0,1fr);gap:1rem;align-items:start;border:1px solid #243028;background:#0E1511;padding:.85rem 1rem;border-radius:8px;position:relative}.sk .ly+.ly{margin-top:18px}.sk .ly+.ly:before{content:"";position:absolute;left:3.7rem;top:-19px;height:18px;width:2px;background:var(--accent);opacity:.6}.sk .ly em{font:400 .72rem var(--mono);font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:#7E9A88;padding-top:.15rem}.sk .ly b{display:block;color:#EAFBF1;font:700 1rem var(--sans)}.sk .ly span{display:block;color:#9DB8A8;font-size:.86rem;margin-top:.15rem}
@media(max-width:600px){.sk .ly{grid-template-columns:minmax(0,1fr);gap:.2rem}.sk .ly+.ly:before{left:1.2rem}}
.sk .sum{display:grid;grid-template-columns:repeat(2,minmax(0,1fr)) auto;gap:clamp(10px,2vw,22px);align-items:end}.sk .sum b{display:block;font:700 clamp(1.4rem,4vw,2rem)/1 var(--mono);color:var(--accent)}.sk .sum>div span{font:400 .72rem var(--mono);color:#7E9A88;text-transform:uppercase;letter-spacing:.08em}.sk .note{font-size:.76rem;color:#7E9A88}
@media(max-width:640px){.sk .sum{grid-template-columns:repeat(2,minmax(0,1fr))}.sk .sum .btn{grid-column:1/-1;justify-content:center}}
.th{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(10px,2vw,24px)}.th div{border-top:2px solid var(--accent);padding-top:1rem}.th b{display:block;font:700 3rem/1 var(--display);color:var(--accent)}.th p{margin:.3rem 0 0;color:var(--muted)}@media(max-width:760px){.th{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:110px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid #243028;border-radius:12px;background:#0E1511;padding:1rem}.sv img{width:110px;height:110px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.9rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var c = document.querySelector("[data-stack]"); if (!c) return;
  var D = JSON.parse(c.getAttribute("data-stack")), st = { k: 0, s: 1 }, line = "";
  function calc() {
    var K = D.kinds[st.k], S = D.scales[st.s];
    c.querySelector(".cmd").innerHTML = "<b>$</b> stack --build " + K.id + " --users " + S.id;
    c.querySelector(".layers").innerHTML = K.l.concat([[ "Hosting", S.host, S.why ]]).map(function (l) { return '<div class="ly"><em>' + l[0] + '</em><div><b>' + l[1] + '</b><span>' + l[2] + '</span></div></div>'; }).join("");
    var wk = K.wk + S.wk; c.querySelector("[data-wk]").textContent = wk + " to " + (wk + 3) + " wks"; c.querySelector("[data-cost]").textContent = "\\u00A3" + S.cost.toLocaleString("en-GB") + "/mo";
    line = "Tech stack: " + K.n + " for " + S.n + " users. Suggested: " + K.l.map(function (l) { return l[1]; }).join(", ") + "; hosting " + S.host + ". About " + wk + " weeks. About my project: ";
  }
  [].forEach.call(c.querySelectorAll("[data-g]"), function (g) { var k = g.getAttribute("data-g"), bs = [].slice.call(g.querySelectorAll("button")); bs.forEach(function (b, i) { b.addEventListener("click", function () { st[k] = i; bs.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); calc(); }); }); }); calc();
  c.querySelector("[data-book]").addEventListener("click", function () { var ta = document.querySelector("#order textarea"); if (ta) ta.value = line; var o = document.getElementById("order"); if (o) o.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
`;
const D = {
  kinds: [
    { id: "marketing-site", n: "A marketing website", wk: 3, l: [["Front end", "Astro", "Ships almost no JavaScript, so pages load instantly."], ["Content", "Headless CMS", "You edit pages without touching code."], ["Extras", "Forms and analytics", "Lead capture and privacy-friendly stats."]] },
    { id: "online-shop", n: "An online shop", wk: 6, l: [["Front end", "Next.js", "Fast product pages that rank well on Google."], ["Back end", "Node.js API", "Orders, stock and customer accounts."], ["Data", "PostgreSQL", "Reliable storage for products and orders."], ["Extras", "Stripe payments", "Cards, Apple Pay and Google Pay."]] },
    { id: "booking-app", n: "A booking app", wk: 10, l: [["Front end", "React Native", "One codebase for iPhone and Android."], ["Back end", "Node.js API", "Availability, bookings and reminders."], ["Data", "PostgreSQL", "Accurate, conflict-free schedules."], ["Extras", "Push notifications", "Reminders that bring people back."]] },
    { id: "internal-tool", n: "An internal team tool", wk: 8, l: [["Front end", "React", "A fast, familiar dashboard for your team."], ["Back end", "Node.js API", "Your rules and workflows, in code."], ["Data", "PostgreSQL", "One trusted source of truth."], ["Extras", "Single sign-on", "Staff log in with their work account."]] },
    { id: "marketplace", n: "A marketplace", wk: 14, l: [["Front end", "Next.js", "Search-friendly listings and profiles."], ["Back end", "Node.js API", "Listings, messaging and reviews."], ["Data", "PostgreSQL + search", "Fast filtering over many listings."], ["Extras", "Stripe Connect", "Pay sellers and take a commission."]] },
  ],
  scales: [
    { id: "hundreds", n: "hundreds of", host: "One managed server", why: "Simple, cheap and easy to look after.", cost: 35, wk: 0 },
    { id: "thousands", n: "thousands of", host: "Managed cloud with autoscaling", why: "Grows by itself when traffic spikes.", cost: 220, wk: 2 },
    { id: "millions", n: "millions of", host: "Multi-region cloud cluster", why: "Stays fast worldwide and survives an outage.", cost: 1600, wk: 6 },
  ],
};
module.exports = R.make({
  name: "stack", themeColor: "#070B09", fonts: FONTS, preload: ["assets/fonts/InstrumentSans-Bold.ttf"], js: JS,
  vars: { bg: "#070B09", surface: "#0E1511", ink: "#E4F4EA", muted: "#97B0A1", line: "#243028", accent: "#4ADE80", onaccent: "#04140A", c1: "#4ADE80", c2: "#FDE047", c3: "#070B09", rad: "8px", display: '"Instrument Sans",system-ui,sans-serif', sans: '"Instrument Sans",system-ui,sans-serif', mono: '"Geist Mono",ui-monospace,monospace', header: "rgba(7,11,9,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const sv = pack.cats.map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    const nums = X.stats.map(([v, s, l]) => `<div data-reveal><b>${v}${s}</b><p>${l}</p></div>`).join("");
    const kb = D.kinds.map((k, i) => `<button type="button" aria-pressed="${i === 0}">${k.id.replace(/-/g, " ")}</button>`).join("");
    const sb = D.scales.map((s, i) => `<button type="button" aria-pressed="${i === 1}">${s.id}</button>`).join("");
    return `<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>The right tech, <em>chosen for you</em>.</h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="#stack"><span>Pick my stack</span></a><a class="btn" href="menu.html"><span>${X.cta2}</span></a></div></div>${model3d(pack, "chip", "gear", "A microchip you can turn", { c1: "#4ADE80", c2: "#FDE047", c3: "#070B09", hint: "a microchip" })}</div></section>
<section class="sec" id="stack" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">Stack picker</span><h2 style="margin-top:.8rem">Tell us the goal. <em>We pick the tools.</em></h2></div></div><div class="sk" data-stack='${JSON.stringify(D)}' data-reveal><div class="bar"><i></i><i></i><i></i><span>stack.sh</span></div><div class="in"><div class="lb">What are you building?<div class="opt" data-g="k">${kb}</div></div><div class="lb">How many users?<div class="opt" data-g="s">${sb}</div></div><div class="cmd"></div><div class="layers"></div><div class="sum"><div><b data-wk></b><span>build time</span></div><div><b data-cost></b><span>hosting</span></div><button type="button" class="btn btn-primary" data-book><span>Discuss this stack</span></button></div><span class="note">A starting point. We confirm the right tools after a free discovery call.</span></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="th">${nums}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">${X.collection[1]}</h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
