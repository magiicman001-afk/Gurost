"use strict";
/**
 * bakery-editorial: a food magazine. Masthead, rules, columns, drop caps, numbered departments, two-colour art.
 * Fonts: Gloock + Crimson Pro (SIL Open Font License, shipped with the template).
 */
const C = require("./common");
const { art } = require("./illustrations");
const { t, esc } = C;

const P = { bg: "#F2EDE3", ink: "#151210", crust: "#D8431F", crustDark: "#151210", light: "#EADFCC", cream: "#EADFCC", accent: "#151210", accent2: "#151210", sw: 2.2, shadow: "rgba(21,18,16,.12)", plate: "#EADFCC" };

const FONTS = [
  ["Gloock-Regular.ttf", "Gloock-Regular.ttf"],
  ["CrimsonPro-Regular.ttf", "CrimsonPro-Regular.ttf"],
  ["CrimsonPro-Italic.ttf", "CrimsonPro-Italic.ttf"],
  ["CrimsonPro-Bold.ttf", "CrimsonPro-Bold.ttf"],
  ["Gloock-OFL.txt", "OFL-Gloock.txt"],
  ["CrimsonPro-OFL.txt", "OFL-CrimsonPro.txt"],
];

const CSS = `
@font-face{font-family:"Gloock";src:url(fonts/Gloock-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Crimson Pro";src:url(fonts/CrimsonPro-Bold.ttf) format("truetype");font-weight:700;font-style:normal;font-display:swap}
:root{--paper:#F2EDE3;--tan:#E7DDC9;--ink:#151210;--red:#D8431F;--muted:#5E554B;--rule:#151210;--disp:"Gloock",Georgia,"Times New Roman",serif;--serif:"Crimson Pro",Georgia,"Times New Roman",serif;--gut:clamp(18px,4.5vw,56px);--max:1280px;--ease:cubic-bezier(.2,.7,.2,1)}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:400 clamp(18px,1.25vw + 12px,21px)/1.55 var(--serif);-webkit-font-smoothing:antialiased;font-synthesis:none;overflow-x:hidden}
svg,img{display:block;max-width:100%}a{color:inherit}p{margin:0 0 1em}
h1,h2,h3{font-family:var(--disp);font-weight:400;line-height:1.02;letter-spacing:-.015em;margin:0;text-wrap:balance}
h1{font-size:clamp(2.9rem,8.4vw,7rem)}h2{font-size:clamp(2.1rem,5vw,3.8rem)}h3{font-size:1.55rem;line-height:1.1}
em{font-style:italic}h1 em,h2 em{color:var(--red)}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding:0 var(--gut)}
.skip{position:absolute;left:-999px;top:8px;background:var(--ink);color:#fff;padding:.6em 1em;z-index:100}.skip:focus{left:8px}
:focus-visible{outline:2px solid var(--red);outline-offset:3px}
.label{font:700 .72rem/1 var(--serif);letter-spacing:.2em;text-transform:uppercase}.label.red{color:var(--red)}
.rule{border:0;border-top:1px solid var(--rule);margin:0}.rule.thick{border-top-width:3px}.rule.dbl{border-top:3px double var(--rule)}
.sec{padding:clamp(52px,8vw,110px) 0}

/* masthead */
.topline{border-bottom:1px solid var(--rule);font:700 .7rem/1 var(--serif);letter-spacing:.18em;text-transform:uppercase}
.topline .wrap{display:flex;justify-content:space-between;gap:1rem;padding-block:.75rem}
.topline span:nth-child(2){text-align:center}@media(max-width:640px){.topline span:nth-child(2){display:none}}
.mast{text-align:center;padding:clamp(22px,4vw,44px) 0 clamp(16px,2.6vw,28px)}
.mast a{text-decoration:none;font:400 clamp(3rem,10.5vw,8.6rem)/.9 var(--disp);letter-spacing:-.035em;display:block}
.mast p{margin:.8rem 0 0;font:italic 400 clamp(1rem,1.6vw,1.25rem)/1.2 var(--serif);color:var(--muted)}
.navbar{position:sticky;top:0;z-index:50;background:var(--paper);border-block:3px double var(--rule)}
.navbar .wrap{display:flex;justify-content:center;align-items:center;gap:clamp(1.2rem,4vw,3.2rem);height:54px;position:relative}
.navbar a.l{font:700 .78rem/1 var(--serif);letter-spacing:.2em;text-transform:uppercase;text-decoration:none;padding:.5rem 0;position:relative}
.navbar a.l::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--red);transform:scaleX(0);transition:transform .3s var(--ease)}
.navbar a.l:hover::after,.navbar a.l[aria-current=page]::after{transform:scaleX(1)}
.navbar .mini{position:absolute;left:var(--gut);font:400 1.5rem/1 var(--disp);text-decoration:none;opacity:0;transform:translateY(6px);transition:all .3s;pointer-events:none}.is-stuck .mini{opacity:1;transform:none;pointer-events:auto}
.navbar .cta{position:absolute;right:var(--gut);font:700 .74rem/1 var(--serif);letter-spacing:.18em;text-transform:uppercase;text-decoration:none;background:var(--red);color:#fff;padding:.8em 1.2em;transition:background .2s}.navbar .cta:hover{background:var(--ink)}
.burger{display:none;position:absolute;right:var(--gut);width:44px;height:44px;border:1px solid var(--rule);background:transparent;cursor:pointer}
.burger i,.burger i::before,.burger i::after{position:absolute;left:11px;width:20px;height:2px;background:var(--ink);transition:transform .25s}.burger i{top:21px}.burger i::before,.burger i::after{content:"";left:0}.burger i::before{top:-6px}.burger i::after{top:6px}
.menu-open .burger i{background:transparent}.menu-open .burger i::before{transform:translateY(6px) rotate(45deg)}.menu-open .burger i::after{transform:translateY(-6px) rotate(-45deg)}
.drawer{position:fixed;inset:0;z-index:40;background:var(--paper);padding:130px var(--gut) 40px;display:flex;flex-direction:column;gap:.2rem;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
.drawer a{font:400 2.8rem/1.2 var(--disp);text-decoration:none;border-bottom:1px solid var(--rule);padding:.4rem 0}.drawer a:hover{color:var(--red)}
.menu-open .drawer{opacity:1;visibility:visible}.menu-open{overflow:hidden}
@media(max-width:860px){.navbar a.l,.navbar .cta{display:none}.burger{display:block}.navbar .wrap{justify-content:flex-start}.navbar .mini{position:static;opacity:1;transform:none;pointer-events:auto}.mast{display:none}}
@media(min-width:861px){.navbar .wrap{justify-content:center}}

/* cover */
.cover{display:grid;grid-template-columns:1.7fr 1fr;gap:clamp(24px,4vw,64px);padding:clamp(28px,5vw,64px) 0 clamp(40px,6vw,80px)}
.cover h1{margin:.3em 0 .35em}.deck{font:italic 400 clamp(1.3rem,2.4vw,1.8rem)/1.3 var(--serif);color:var(--muted);max-width:30em;margin-bottom:1.6rem}
.byline{display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap;font-size:.95rem;border-top:1px solid var(--rule);padding-top:1rem;margin-top:1.6rem}.byline b{font:700 .72rem var(--serif);letter-spacing:.2em;text-transform:uppercase}
.fig{margin:0}.fig .plate{background:var(--tan);border-block:3px solid var(--ink);aspect-ratio:4/5;display:grid;place-items:center;padding:8%;position:relative;overflow:hidden}
.fig .plate::before{content:"";position:absolute;inset:14px;border:1px solid var(--ink);opacity:.35}.fig svg{width:118%;max-width:none;transition:transform .8s var(--ease)}.fig:hover svg{transform:rotate(-3deg) scale(1.04)}
.fig figcaption{font:italic 400 .95rem/1.35 var(--serif);color:var(--muted);margin-top:.7rem}.fig figcaption b{font:700 .7rem var(--serif);letter-spacing:.2em;text-transform:uppercase;font-style:normal;color:var(--ink)}
.toc{margin-top:2rem;border-top:3px solid var(--ink)}.toc a{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;text-decoration:none;padding:.8rem 0;border-bottom:1px solid var(--rule);transition:padding .25s var(--ease),color .2s}
.toc a:hover{padding-left:.6rem;color:var(--red)}.toc span{font:400 1.45rem/1.1 var(--disp)}.toc i{font-size:.9rem;color:var(--muted)}
@media(max-width:900px){.cover{grid-template-columns:1fr}.fig{max-width:440px}}

/* strip */
.strip{border-block:1px solid var(--rule);background:var(--tan)}.strip .wrap{display:flex;gap:1.6rem;align-items:center;overflow-x:auto;padding-block:.9rem;scrollbar-width:none}.strip .wrap::-webkit-scrollbar{display:none}
.strip .label{color:var(--red);white-space:nowrap}.strip span.it{white-space:nowrap;font-size:1rem}.strip span.it b{font-weight:700}.strip .sep{width:5px;height:5px;background:var(--ink);transform:rotate(45deg);flex:none}

/* departments */
.dept{display:grid;grid-template-columns:200px 1fr;gap:clamp(20px,4vw,64px)}
.dept-n{border-top:3px solid var(--ink);padding-top:.9rem}.dept-n b{display:block;font:400 clamp(3.6rem,7vw,5.6rem)/.9 var(--disp);color:var(--red)}.dept-n .label{display:block;margin-top:.8rem}
@media(max-width:820px){.dept{grid-template-columns:1fr;gap:1rem}.dept-n b{display:inline-block;margin-right:1rem}.dept-n .label{display:inline}}
.counter{display:grid;grid-template-columns:1.25fr 1fr;gap:clamp(24px,5vw,72px);align-items:start;margin-top:1rem}
.list{list-style:none;margin:0;padding:0}.list li{padding:.9rem 0;border-bottom:1px solid var(--rule)}
.row{display:flex;align-items:baseline;gap:.7rem}.row h3{font-size:1.45rem}.row .dots{flex:1;border-bottom:2px dotted var(--ink);opacity:.4;transform:translateY(-5px);min-width:16px}.row .pr{font:400 1.35rem/1 var(--disp);color:var(--red)}
.list p{margin:.2rem 0 0;color:var(--muted);font-style:italic;font-size:1rem}
@media(max-width:860px){.counter{grid-template-columns:1fr}}

/* article */
.article{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(24px,3.4vw,52px)}
.article p{text-align:justify;hyphens:auto;-webkit-hyphens:auto}.drop::first-letter{float:left;font:400 5.2rem/.8 var(--disp);color:var(--red);padding:.08em .12em 0 0}
.pull{grid-column:1/-1;text-align:center;padding:2rem 0;border-block:3px double var(--ink);margin:.4rem 0}.pull q{font:italic 400 clamp(1.8rem,4.4vw,3.2rem)/1.12 var(--serif);quotes:"“" "”";display:block;max-width:20em;margin:0 auto;color:var(--red)}
.pull cite{display:block;margin-top:1rem;font:700 .72rem var(--serif);letter-spacing:.2em;text-transform:uppercase;font-style:normal;color:var(--ink)}
@media(max-width:860px){.article{grid-template-columns:1fr}.article p{text-align:left}}
.nums{display:grid;grid-template-columns:repeat(4,1fr);border-block:3px solid var(--ink);margin-top:clamp(32px,5vw,64px)}
.num{padding:1.6rem 1rem;border-left:1px solid var(--rule);text-align:center}.num:first-child{border-left:0}.num b{display:block;font:400 clamp(2.6rem,5vw,4rem)/1 var(--disp);color:var(--red)}.num span{font:700 .7rem var(--serif);letter-spacing:.18em;text-transform:uppercase}
@media(max-width:700px){.nums{grid-template-columns:1fr 1fr}.num:nth-child(3){border-left:0}.num:nth-child(n+3){border-top:1px solid var(--rule)}}

/* method */
.method{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(24px,3.4vw,52px)}.step{border-top:3px solid var(--ink);padding-top:1rem}.step b{font:italic 400 3.2rem/1 var(--serif);color:var(--red);display:block}.step h3{margin:.3rem 0 .5rem}.step p{color:var(--muted);margin:0}
@media(max-width:780px){.method{grid-template-columns:1fr}}

/* visit (inverted) */
.visit{background:var(--ink);color:var(--paper)}.visit h2{color:var(--paper)}.visit h2 em{color:#F08A6D}
.vgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:clamp(24px,4vw,64px);margin-top:2.4rem;border-top:1px solid rgba(242,237,227,.35);padding-top:2rem}
.vgrid .label{color:#F08A6D;display:block;margin-bottom:.8rem}.vgrid a{text-decoration:none}.vgrid a:hover{color:#F08A6D}
.visit table.hours{border-collapse:collapse;width:100%}.visit table.hours th,.visit table.hours td{padding:.55rem 0;border-bottom:1px solid rgba(242,237,227,.25);text-align:left;font-weight:400}.visit table.hours td{text-align:right}
table.hours tr.is-today th,table.hours tr.is-today td{color:var(--red);font-weight:700}.visit table.hours tr.is-today th,.visit table.hours tr.is-today td{color:#F08A6D}
@media(max-width:860px){.vgrid{grid-template-columns:1fr}}
.btn{display:inline-block;font:700 .78rem/1 var(--serif);letter-spacing:.2em;text-transform:uppercase;text-decoration:none;padding:1.15em 1.8em;background:var(--red);color:#fff;border:0;cursor:pointer;transition:background .2s,transform .2s var(--ease)}.btn:hover{background:var(--ink);transform:translateY(-2px)}
.visit .btn{background:var(--paper);color:var(--ink)}.visit .btn:hover{background:#F08A6D}
.btn.line{background:transparent;color:var(--ink);border:1px solid var(--ink)}.btn.line:hover{background:var(--ink);color:var(--paper)}
.callout{border:3px double var(--ink);padding:clamp(26px,5vw,64px);text-align:center}.callout h2{max-width:14em;margin:.4rem auto 1rem}.callout p{max-width:30em;margin:0 auto 1.6rem;color:var(--muted)}

/* page head */
.phead{padding:clamp(34px,6vw,80px) 0 clamp(24px,3vw,44px);border-bottom:3px double var(--ink)}.phead h1{margin:.25em 0 .25em;font-size:clamp(3rem,9vw,7.4rem)}

/* menu page */
.menu-grid{display:grid;grid-template-columns:230px 1fr;gap:clamp(24px,5vw,80px);padding:clamp(30px,4vw,56px) 0 clamp(60px,9vw,120px)}
.side{position:sticky;top:90px;align-self:start}.side .toc{margin-top:.8rem}.side .chipbox{display:flex;flex-direction:column}
.chip{font:400 1.35rem/1.1 var(--disp);text-align:left;padding:.75rem 0;border:0;border-bottom:1px solid var(--rule);background:transparent;cursor:pointer;color:var(--ink);transition:padding .25s var(--ease),color .2s}.chip:hover{padding-left:.5rem;color:var(--red)}.chip[aria-pressed=true]{color:var(--red);padding-left:.5rem}.chip[aria-pressed=true]::before{content:"→ "}
.cat{padding-bottom:clamp(30px,4vw,56px);margin-bottom:clamp(30px,4vw,56px);border-bottom:1px solid var(--rule)}.cat[hidden]{display:none}.cat:last-of-type{border:0}
.cat-h{display:grid;grid-template-columns:150px 1fr;gap:1.4rem;align-items:end;border-top:3px solid var(--ink);padding-top:1rem;margin-bottom:1.2rem}.cat-h svg{width:130px}.cat-h h2{font-size:clamp(2.2rem,4.6vw,3.4rem)}.cat-h p{margin:.4rem 0 0;font-style:italic;color:var(--muted)}
.cols{columns:2;column-gap:clamp(24px,4vw,56px)}.cols li{break-inside:avoid}
.tags{display:inline-flex;gap:.4rem;margin-left:.4rem}.tags b{font:700 .62rem/1 var(--serif);letter-spacing:.12em;border:1px solid var(--ink);padding:.3em .5em}
.note{font-style:italic;color:var(--muted);border-top:3px double var(--ink);padding-top:1rem}
@media(max-width:900px){.menu-grid{grid-template-columns:1fr}.side{position:static}.side .chipbox{flex-direction:row;flex-wrap:wrap;gap:.4rem}.chip{border:1px solid var(--rule);padding:.5rem .9rem;font-size:1.1rem}.chip[aria-pressed=true]{background:var(--ink);color:var(--paper)}.chip[aria-pressed=true]::before{content:""}.cols{columns:1}.cat-h{grid-template-columns:90px 1fr}.cat-h svg{width:80px}}

/* about + contact */
.two{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,80px);align-items:start}.two .fig{max-width:460px}@media(max-width:860px){.two{grid-template-columns:1fr}}
.people{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,3vw,44px)}.person{border-top:3px solid var(--ink);padding-top:1rem}.mono{width:88px;aspect-ratio:1;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center;font:400 2.2rem var(--disp);margin-bottom:1rem}.person p{margin:.2rem 0 0;color:var(--muted);font-style:italic}
@media(max-width:780px){.people{grid-template-columns:1fr}}
.contact-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(24px,5vw,80px);padding:clamp(30px,4vw,56px) 0 clamp(60px,9vw,120px)}
.det{padding:1rem 0;border-bottom:1px solid var(--rule)}.det .label{display:block;margin-bottom:.35rem;color:var(--red)}.det a,.det span.v{font:400 1.5rem/1.25 var(--disp);text-decoration:none;overflow-wrap:anywhere}.det a:hover{color:var(--red)}
.tabs{display:flex;gap:1.6rem;border-bottom:3px double var(--ink);margin-bottom:1.6rem}.tabs button{font:700 .78rem var(--serif);letter-spacing:.2em;text-transform:uppercase;border:0;background:none;padding:.9rem 0;cursor:pointer;color:var(--muted);position:relative}.tabs button[aria-selected=true]{color:var(--ink)}.tabs button[aria-selected=true]::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:3px;background:var(--red)}
.panel[hidden]{display:none}
.f{display:grid;gap:1.3rem}.f-row{display:grid;grid-template-columns:1fr 1fr;gap:1.3rem}.f-field{display:grid;gap:.2rem}.f label{font:700 .68rem var(--serif);letter-spacing:.2em;text-transform:uppercase;color:var(--muted)}
.f input,.f textarea{width:100%;font:400 1.2rem var(--serif);padding:.5em 0;background:transparent;border:0;border-bottom:1.5px solid var(--ink);border-radius:0;color:var(--ink);transition:border-color .2s,background .2s}
.f input:focus,.f textarea:focus{outline:0;border-bottom-color:var(--red);background:rgba(216,67,31,.05)}.f textarea{resize:vertical;min-height:120px;border:1.5px solid var(--ink);padding:.6em .8em;margin-top:.3rem}.f-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.f .btn{justify-self:start}.f-status{margin:0;min-height:1.5em;font-style:italic}.f-status.ok{color:#1F7A44}.f-status.bad{color:#B4281B}
@media(max-width:860px){.contact-grid{grid-template-columns:1fr}.f-row{grid-template-columns:1fr}}

/* footer */
.site-footer{border-top:3px double var(--ink);padding:clamp(44px,6vw,80px) 0 26px}
.fgrid{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:2rem}.fbrand{font:400 clamp(2.2rem,4vw,3rem)/.95 var(--disp);margin-bottom:.8rem}.fgrid .label{display:block;margin-bottom:.8rem;color:var(--red)}.fgrid a{display:block;text-decoration:none;padding:.15em 0}.fgrid a:hover{color:var(--red)}.fgrid p{color:var(--muted);font-style:italic;max-width:20em}
.fbottom{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-top:2.6rem;padding-top:1.2rem;border-top:1px solid var(--rule);font-size:.9rem;color:var(--muted)}.fbottom a{margin-left:1.4rem;display:inline}
@media(max-width:860px){.fgrid{grid-template-columns:1fr 1fr}.fgrid>:first-child,.fgrid>:last-child{grid-column:1/-1}}
.legal{max-width:720px}.legal h2{font-size:1.9rem;margin:1.6em 0 .4em}

/* motion */
[data-reveal]{opacity:0;transform:translateY(22px);transition:opacity .9s var(--ease),transform .9s var(--ease)}[data-reveal].in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}[data-reveal]{opacity:1;transform:none}html{scroll-behavior:auto}}
`;

const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, "-");

function header(active) {
  const links = C.nav(active);
  return `<div class="topline"><div class="wrap"><span>Est. ${t("year_founded")}</span><span data-today>Fresh every morning</span><span>${t("city")}</span></div></div>
<header class="mast"><a href="index.html">${t("business_name")}</a><p>${t("tagline")}</p></header>
<nav class="navbar" aria-label="Main"><div class="wrap"><a class="mini" href="index.html">${t("business_name")}</a>${links.map((l) => `<a class="l" href="${l.href}"${l.current ? ' aria-current="page"' : ""}>${l.label}</a>`).join("")}<a class="cta" href="contact.html#preorder">Pre-order</a><button class="burger" type="button" aria-label="Menu" aria-expanded="false" data-menu-toggle><i></i></button></div></nav>
<div class="drawer" data-menu aria-label="Menu">${links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}<a href="contact.html#preorder" style="color:var(--red)">Pre-order</a></div>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap">
<div class="fgrid">
<div><div class="fbrand">${t("business_name")}</div><p>${t("tagline")}</p></div>
<div><span class="label">Contents</span><a href="index.html">Home</a><a href="menu.html">Menu</a><a href="about.html">About</a><a href="contact.html">Contact</a></div>
<div><span class="label">Visit</span><a href="${t("maps_url")}" rel="noopener">${t("address_line1")}</a><a href="${t("maps_url")}" rel="noopener">${t("address_line2")}</a><a href="tel:${t("phone_href")}">${t("phone")}</a><a href="mailto:${t("email")}">${t("email")}</a></div>
<div><span class="label">Hours</span><p style="margin:0;font-style:normal;color:var(--ink)">Mon to Fri ${t("hours_weekdays")}<br>Sat ${t("hours_saturday")}<br>Sun ${t("hours_sunday")}</p><span class="label" style="margin-top:1rem">Follow</span><a href="${t("instagram_url")}" rel="noopener">Instagram</a><a href="${t("facebook_url")}" rel="noopener">Facebook</a></div>
</div>
<div class="fbottom"><span>© <span data-year>2026</span> ${t("business_name")}</span><span><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms of service</a></span></div>
</div></footer>
<script src="assets/site.js"></script>
<script>(function(){var n=document.querySelector(".navbar");if(!n)return;function s(){n.classList.toggle("is-stuck",window.scrollY>140)}s();window.addEventListener("scroll",s,{passive:true})})();</script></body></html>`;
}

const shell = (page, title, desc, active, main) => C.head({ title, desc, page, fontsPreload: ["assets/fonts/Gloock-Regular.ttf"] }) + header(active) + `<main id="main">${main}</main>` + footer();

const listItem = (i, preview = false) => `<li id="${slug(i.n)}"><div class="row"><h3>${i.n}${preview ? "" : `<span class="tags">${i.tags.map((g) => `<b title="${C.TAGS[g]}">${g}</b>`).join("")}</span>`}</h3><span class="dots"></span><span class="pr">£${i.p}</span></div><p>${i.d}</p></li>`;

function home() {
  const preview = C.MENU.flatMap((c) => c.items).filter((i) => i.star).concat(C.MENU[2].items.slice(0, 1), C.MENU[3].items.slice(1, 2)).slice(0, 6);
  const today = C.MENU.flatMap((c) => c.items).filter((i) => i.star).slice(0, 4);
  const main = `
<div class="wrap"><section class="cover">
<div>
<span class="label red" data-reveal>The cover story</span>
<h1 data-reveal data-delay="60">The <em>slow art</em> of proper bread</h1>
<p class="deck" data-reveal data-delay="120">${t("tagline")} A bakery where every loaf is given the time it needs, and nothing leaves the oven before it is ready.</p>
<div data-reveal data-delay="180" style="display:flex;gap:1rem;flex-wrap:wrap"><a class="btn" href="menu.html">Read the menu</a><a class="btn line" href="contact.html#preorder">Pre-order</a></div>
<div class="byline" data-reveal data-delay="240"><b>Words by</b> ${t("owner_name")} <span style="opacity:.4">·</span> <b>Baked in</b> ${t("city")} <span style="opacity:.4">·</span> <b>Reading time</b> 2 minutes</div>
</div>
<div data-reveal data-delay="140"><figure class="fig"><div class="plate" data-photo="hero">${art("loaf", P)}</div><figcaption><b>Fig. 1</b> &nbsp;The country sourdough, thirty-six hours in the making.</figcaption></figure>
<div class="toc"><a href="menu.html"><span>The menu</span><i>p. 02</i></a><a href="about.html"><span>Our story</span><i>p. 03</i></a><a href="contact.html"><span>Visit &amp; pre-order</span><i>p. 04</i></a></div></div>
</section></div>

<div class="strip"><div class="wrap"><span class="label">Out today</span>${today.map((i, k) => `<span class="it"><b>${i.n}</b> £${i.p}</span>${k < today.length - 1 ? '<i class="sep"></i>' : ""}`).join("")}</div></div>

<section class="sec"><div class="wrap"><div class="dept">
<div class="dept-n" data-reveal><b>01</b><span class="label">The counter</span></div>
<div><h2 data-reveal>What's on the <em>counter</em> this morning</h2>
<div class="counter"><ul class="list" data-reveal>${preview.map((i) => listItem(i, true)).join("")}</ul>
<figure class="fig" data-reveal data-delay="120"><div class="plate" data-photo="counter">${art("croissant", P)}</div><figcaption><b>Fig. 2</b> &nbsp;Butter croissants, folded by hand every morning.</figcaption></figure></div>
<p style="margin-top:1.6rem"><a class="btn line" href="menu.html">See the full menu</a></p></div>
</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap"><div class="dept"><div class="dept-n" data-reveal><b>02</b><span class="label">The method</span></div>
<div><h2 data-reveal>Three things we <em>never</em> rush</h2>
<div class="method" style="margin-top:2rem"><div class="step" data-reveal><b>i.</b><h3>The dough</h3><p>Mixed by hand and left overnight to build flavour. Nothing is hurried.</p></div><div class="step" data-reveal data-delay="100"><b>ii.</b><h3>The butter</h3><p>Real butter, folded into every croissant, twenty-seven layers at a time.</p></div><div class="step" data-reveal data-delay="200"><b>iii.</b><h3>The bake</h3><p>Loaves go onto a hot stone before sunrise, so they are warm when you arrive.</p></div></div></div></div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap">
<div class="article" data-reveal>
<p class="drop">${t("business_name")} began with a single oven and a jar of starter, and a simple idea: that bread should taste of something. Every morning we mix, shape and bake in small batches, using British flour from mills we know by name.</p>
<p>We mill nothing ourselves, but we care where it comes from. The butter is the real thing, the eggs come from a farm down the road, and the coffee from a roaster who pays growers fairly.</p>
<p>What is not sold by closing goes to people who can use it. It is a small bakery with a long way of doing things, and we would not change a minute of it.</p>
<div class="pull"><q>Good bread takes time. We simply give it plenty.</q><cite>${t("owner_name")}, head baker</cite></div>
</div>
<div class="nums" data-reveal><div class="num"><b data-count="36" data-suffix="h">36h</b><span>Slow fermentation</span></div><div class="num"><b data-count="100" data-suffix="%">100%</b><span>British flour</span></div><div class="num"><b>5am</b><span>First loaves out</span></div><div class="num"><b data-count="27">27</b><span>Layers per croissant</span></div></div>
</div></section>

<section class="sec visit"><div class="wrap"><span class="label" style="color:#F08A6D" data-reveal>Visit</span><h2 data-reveal>Come in, we're <em>open</em></h2>
<div class="vgrid" data-reveal><div><span class="label">Find us</span><p style="font:400 1.9rem/1.2 var(--disp);margin:0 0 1.4rem">${t("address_line1")}<br>${t("address_line2")}</p><a class="btn" href="${t("maps_url")}" rel="noopener">Get directions</a></div><div><span class="label">Hours</span>${C.hoursRows()}</div><div><span class="label">Get in touch</span><p><a href="tel:${t("phone_href")}">${t("phone")}</a><br><a href="mailto:${t("email")}" style="overflow-wrap:anywhere">${t("email")}</a></p></div></div></div></section>

<section class="sec"><div class="wrap"><div class="callout" data-reveal><span class="label red">Skip the queue</span><h2>Order ahead for <em>tomorrow's</em> bake</h2><p>Tell us what you would like and when you will collect it. We will have it wrapped and waiting.</p><a class="btn" href="contact.html#preorder">Pre-order now</a></div></div></section>`;
  return shell("home", "Artisan bakery", t("tagline"), "home", main);
}

function menu() {
  const cats = C.MENU.map((c, n) => `<div class="cat" data-cat="${c.id}" id="${c.id}"><div class="cat-h" data-reveal>${art(c.art, P)}<div><span class="label red">Dept. ${String(n + 1).padStart(2, "0")}</span><h2>${c.name}</h2><p>${c.blurb}</p></div></div><ul class="list cols">${c.items.map((i) => listItem(i)).join("")}</ul></div>`).join("");
  const main = `<div class="wrap"><section class="phead"><span class="label red" data-reveal>The menu</span><h1 data-reveal data-delay="60">Everything we <em>bake</em></h1><p class="deck" data-reveal data-delay="120">Made fresh every morning in small batches. When it is gone, it is gone.</p></section>
<div class="menu-grid"><aside class="side"><span class="label">Departments</span><div class="chipbox" role="group" aria-label="Filter the menu"><button class="chip" data-filter="all" aria-pressed="true">All</button>${C.MENU.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("")}</div></aside>
<div>${cats}<p class="note"><b>V</b> vegetarian · <b>VG</b> vegan · <b>GF</b> no gluten ingredients (made in a kitchen that handles gluten). Please tell us about allergies when you order. Prices include VAT.</p></div></div></div>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="callout"><span class="label red">Skip the queue</span><h2>Have it <em>waiting</em> for you</h2><a class="btn" href="contact.html#preorder">Pre-order now</a></div></div></section>`;
  return shell("menu", "Menu", "Fresh bread, pastries, cakes and coffee, baked every morning.", "menu", main);
}

function about() {
  const main = `<div class="wrap"><section class="phead"><span class="label red" data-reveal>Our story</span><h1 data-reveal data-delay="60">Flour, water, salt and <em>patience</em></h1><p class="deck" data-reveal data-delay="120">${t("business_name")} began in ${t("year_founded")} with one oven and a jar of starter. We are still small, and we like it that way.</p></section></div>
<section class="sec"><div class="wrap two"><figure class="fig" data-reveal><div class="plate" data-photo="about">${art("wheat", P)}</div><figcaption><b>Fig. 1</b> &nbsp;Wheat from the mill we buy from.</figcaption></figure>
<div data-reveal data-delay="100"><p class="drop">Everything starts with a question: would we serve this to the people we love? That is why the dough rests for a day and a half, why the butter is the real thing, and why we say no to shortcuts.</p><p>Our flour comes from British mills, our eggs from a farm down the road, and our coffee from a roaster who pays growers properly. We keep the menu short so that everything on it is as good as we can make it.</p><p>${t("owner_name")} still opens the bakery most mornings. Come early and you might get the first loaf.</p><div class="pull" style="padding:1.4rem 0"><q style="font-size:clamp(1.5rem,3vw,2.2rem)">We bake what we would want to eat.</q></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="dept"><div class="dept-n" data-reveal><b>01</b><span class="label">The people</span></div><div><h2 data-reveal>Meet the <em>bakers</em></h2><div class="people" style="margin-top:2rem"><div class="person" data-reveal><div class="mono">A</div><h3>Head baker</h3><p>Opens up at 4am and tastes everything.</p></div><div class="person" data-reveal data-delay="100"><div class="mono">M</div><h3>Pastry chef</h3><p>Folds every croissant by hand.</p></div><div class="person" data-reveal data-delay="200"><div class="mono">J</div><h3>Front of house</h3><p>Knows your order before you do.</p></div></div></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="callout" data-reveal><span class="label red">Visit</span><h2>Come and <em>taste</em> the difference</h2><p>We open early and bake all morning. The best time to visit is the moment the first tray comes out.</p><a class="btn" href="contact.html">Find us</a></div></div></section>`;
  return shell("about", "Our story", `The story behind ${t("business_name")}: slow dough, honest ingredients and a warm welcome.`, "about", main);
}

function contact() {
  const main = `<div class="wrap"><section class="phead"><span class="label red" data-reveal>Correspondence</span><h1 data-reveal data-delay="60">Write to <em>us</em></h1><p class="deck" data-reveal data-delay="120">Pre-order for tomorrow, ask about a celebration cake or simply tell us what you think.</p></section>
<div class="contact-grid"><div data-reveal><div class="det"><span class="label">Visit</span><a href="${t("maps_url")}" rel="noopener">${t("address_line1")}, ${t("address_line2")}</a></div><div class="det"><span class="label">Telephone</span><a href="tel:${t("phone_href")}">${t("phone")}</a></div><div class="det"><span class="label">Email</span><a href="mailto:${t("email")}">${t("email")}</a></div><div class="det"><span class="label">Opening hours</span>${C.hoursRows()}</div><div class="det" style="border:0"><span class="label">Follow</span><a href="${t("instagram_url")}" rel="noopener" style="display:inline">Instagram</a> &nbsp;·&nbsp; <a href="${t("facebook_url")}" rel="noopener" style="display:inline">Facebook</a></div></div>
<div id="preorder" data-reveal data-delay="100"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="order">Pre-order</button><button role="tab" aria-selected="false" data-tab="contact">Send a message</button></div>
<div class="panel" data-panel="order">${C.form("order", { submit: "Place pre-order" })}</div><div class="panel" data-panel="contact" hidden>${C.form("contact", { submit: "Send message" })}</div></div></div></div>
<script>(function(){var tabs=[].slice.call(document.querySelectorAll("[data-tab]")),ps=[].slice.call(document.querySelectorAll("[data-panel]"));function show(k){tabs.forEach(function(t){t.setAttribute("aria-selected",t.getAttribute("data-tab")===k?"true":"false")});ps.forEach(function(p){p.hidden=p.getAttribute("data-panel")!==k})}tabs.forEach(function(t){t.addEventListener("click",function(){show(t.getAttribute("data-tab"))})});if(location.hash==="#message")show("contact")})();</script>`;
  return shell("contact", "Contact and pre-orders", `Pre-order, ask a question or find ${t("business_name")}.`, "contact", main);
}

function legalPage(kind) {
  const L = C.legal(kind);
  return shell(kind, L.title, L.title, "", `<div class="wrap"><section class="phead legal" style="border:0"><span class="label red">Legal</span><h1 style="font-size:clamp(2.4rem,7vw,4.6rem)">${L.title}</h1><div style="margin-top:2rem">${L.body}</div></section></div>`);
}

function build() {
  return {
    name: "editorial",
    themeColor: "#F2EDE3",
    fonts: FONTS,
    files: {
      "index.html": home(), "menu.html": menu(), "about.html": about(), "contact.html": contact(),
      "privacy.html": legalPage("privacy"), "terms.html": legalPage("terms"),
      "assets/style.css": CSS, "assets/site.js": C.SITE_JS,
    },
  };
}

module.exports = { build };
