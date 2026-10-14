"use strict";
/**
 * bakery-minimal: calm, airy, lots of white space. Soft serif headlines, hairlines, arch-shaped frames, line art.
 * Fonts: Instrument Serif + Instrument Sans (SIL Open Font License, shipped with the template).
 */
const C = require("./common");
const { art } = require("./illustrations");
const { t, esc } = C;

const P = { bg: "#F7F3EC", ink: "#1D1A17", crust: "#F7F3EC", crustDark: "#B5502D", light: "#E8E1D5", cream: "#FBF8F2", accent: "#B5502D", accent2: "#F7F3EC", sw: 2.4, shadow: "rgba(29,26,23,.07)", plate: "#FBF8F2" };

const FONTS = [
  ["InstrumentSerif-Regular.ttf", "InstrumentSerif-Regular.ttf"],
  ["InstrumentSerif-Italic.ttf", "InstrumentSerif-Italic.ttf"],
  ["InstrumentSans-Regular.ttf", "InstrumentSans-Regular.ttf"],
  ["InstrumentSans-Bold.ttf", "InstrumentSans-Bold.ttf"],
  ["InstrumentSans-OFL.txt", "OFL-InstrumentSans.txt"],
];

const CSS = `
@font-face{font-family:"Instrument Serif";src:url(fonts/InstrumentSerif-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Instrument Serif";src:url(fonts/InstrumentSerif-Italic.ttf) format("truetype");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Regular.ttf) format("truetype");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:"Instrument Sans";src:url(fonts/InstrumentSans-Bold.ttf) format("truetype");font-weight:700;font-style:normal;font-display:swap}
:root{--bg:#F7F3EC;--paper:#FBF8F2;--stone:#EBE4D7;--ink:#1D1A17;--muted:#6B6258;--line:#DCD3C4;--accent:#B5502D;--accent-d:#923D20;--serif:"Instrument Serif",Georgia,"Times New Roman",serif;--sans:"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(20px,5vw,56px);--max:1240px;--ease:cubic-bezier(.2,.7,.2,1)}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.65 var(--sans);-webkit-font-smoothing:antialiased;font-synthesis:none;overflow-x:hidden}
img,svg{display:block;max-width:100%}a{color:inherit}
h1,h2,h3{font-family:var(--serif);font-weight:400;line-height:1;letter-spacing:-.015em;margin:0}
h1{font-size:clamp(3rem,9.2vw,6.8rem)}h2{font-size:clamp(2.2rem,5.4vw,3.9rem)}h3{font-size:1.65rem}
h1 em,h2 em{font-style:italic;color:var(--accent)}
p{margin:0 0 1em}.lead{font-size:clamp(1.1rem,2.2vw,1.3rem);color:var(--muted);max-width:34em}
.eyebrow{display:inline-flex;align-items:center;gap:.6em;font:700 .74rem/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent)}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding:0 var(--gut)}
.skip{position:absolute;left:-999px;top:8px;background:var(--ink);color:#fff;padding:.6em 1em;border-radius:8px;z-index:100}.skip:focus{left:8px}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px}
section{position:relative}.sec{padding:clamp(72px,11vw,150px) 0}

/* header */
.site-header{position:fixed;inset:0 0 auto 0;z-index:50;transition:background .3s,box-shadow .3s}
.site-header.is-stuck{background:rgba(247,243,236,.86);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px);box-shadow:0 1px 0 var(--line)}
.bar{display:flex;align-items:center;justify-content:space-between;height:76px}
.brand{font:italic 400 1.7rem/1 var(--serif);text-decoration:none;letter-spacing:-.01em}
.brand span{color:var(--accent)}
.nav{display:flex;gap:2.2rem}.nav a{text-decoration:none;font-size:.95rem;position:relative;padding:.3em 0}
.nav a::after{content:"";position:absolute;left:0;bottom:0;height:1px;width:100%;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .35s var(--ease)}
.nav a:hover::after,.nav a[aria-current=page]::after{transform:scaleX(1)}
.bar .btn{padding:.7em 1.3em;font-size:.9rem}
.burger{display:none;width:44px;height:44px;border:1px solid var(--line);border-radius:50%;background:transparent;cursor:pointer;position:relative}
.burger i,.burger i::before{position:absolute;left:13px;width:16px;height:1.5px;background:var(--ink);transition:transform .3s var(--ease)}
.burger i{top:20px}.burger i::before{content:"";left:0;top:6px}
.menu-open .burger i{transform:translateY(3px) rotate(45deg)}.menu-open .burger i::before{transform:translateY(-6px) rotate(-90deg)}
.drawer{position:fixed;inset:0;z-index:40;background:var(--bg);display:flex;flex-direction:column;justify-content:center;padding:90px var(--gut) 40px;gap:.4rem;opacity:0;visibility:hidden;transition:opacity .3s,visibility .3s}
.drawer a{font:400 2.6rem/1.2 var(--serif);text-decoration:none}.drawer .meta{margin-top:2rem;color:var(--muted);font-size:.95rem}
.menu-open .drawer{opacity:1;visibility:visible}.menu-open{overflow:hidden}
@media(max-width:820px){.nav,.bar .btn{display:none}.burger{display:block}}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.6em;font:700 .95rem/1 var(--sans);padding:1.05em 1.7em;border-radius:999px;border:1.5px solid var(--ink);text-decoration:none;cursor:pointer;background:transparent;color:var(--ink);transition:background .3s,color .3s,transform .3s var(--ease)}
.btn:hover{transform:translateY(-2px)}.btn-primary{background:var(--ink);color:var(--bg)}.btn-primary:hover{background:var(--accent);border-color:var(--accent)}
.btn-ghost:hover{background:var(--ink);color:var(--bg)}
.arrow-link{display:inline-flex;gap:.5em;align-items:center;font-weight:700;text-decoration:none;border-bottom:1.5px solid var(--ink);padding-bottom:.15em}
.arrow-link span{transition:transform .3s var(--ease)}.arrow-link:hover span{transform:translateX(5px)}

/* hero */
.hero{padding:calc(76px + clamp(36px,7vw,90px)) 0 clamp(56px,8vw,110px)}
.hero-grid{display:grid;gap:clamp(36px,6vw,80px);grid-template-columns:1.08fr .92fr;align-items:center}
.hero h1{margin:.28em 0 .32em}.hero .actions{display:flex;flex-wrap:wrap;gap:1rem 1.6rem;align-items:center;margin:2rem 0 3rem}
.facts{display:flex;gap:0;border-top:1px solid var(--line);padding-top:1.4rem;flex-wrap:wrap}
.facts div{padding-right:2rem;margin-right:2rem;border-right:1px solid var(--line)}.facts div:last-child{border:0;margin:0;padding:0}
.facts b{display:block;font:400 2rem/1 var(--serif)}.facts span{font-size:.85rem;color:var(--muted)}
.arch{position:relative;aspect-ratio:4/5;border-radius:999px 999px 28px 28px;background:var(--stone);overflow:hidden;isolation:isolate}
.arch::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.7) 0 26%,transparent 27%),radial-gradient(circle at 50% 38%,transparent 0 40%,rgba(181,80,45,.09) 41% 42%,transparent 43% 54%,rgba(181,80,45,.07) 55% 56%,transparent 57%);z-index:-1}
.arch .piece{position:absolute;inset:auto 10% 9% 10%}
.arch .sun{position:absolute;top:10%;right:12%;width:20%;aspect-ratio:1;border-radius:50%;background:var(--accent);opacity:.92;animation:float 7s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-10px)}}
.badge{position:absolute;left:-4%;bottom:7%;width:clamp(96px,15vw,132px);aspect-ratio:1;border-radius:50%;background:var(--paper);display:grid;place-items:center;box-shadow:0 12px 34px rgba(29,26,23,.12)}
.badge svg.ring{position:absolute;inset:0;width:100%;height:100%;animation:spin 22s linear infinite}.badge .core{width:34%}
@keyframes spin{to{transform:rotate(360deg)}}
.hero-art{position:relative}
.tag{position:absolute;right:-3%;top:44%;background:var(--paper);border-radius:14px;padding:.8rem 1rem;box-shadow:0 12px 34px rgba(29,26,23,.12);font-size:.85rem;line-height:1.3;display:flex;gap:.7rem;align-items:center}
.tag i{width:9px;height:9px;border-radius:50%;background:#3E9B5F;box-shadow:0 0 0 0 rgba(62,155,95,.5);animation:pulse 2s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 10px rgba(62,155,95,0)}100%{box-shadow:0 0 0 0 rgba(62,155,95,0)}}
@media(max-width:560px){.facts{display:grid;grid-template-columns:repeat(3,auto);justify-content:start}.facts div{padding-right:1rem;margin-right:1rem}.facts b{font-size:1.6rem}.facts span{font-size:.78rem}}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr}.hero-art{max-width:480px;margin:0 auto;width:100%}.badge{left:2%}.tag{right:2%}}

/* marquee */
.marquee{border-block:1px solid var(--line);overflow:hidden;padding:1.1rem 0;background:var(--paper)}
.track{display:flex;width:max-content;animation:slide 34s linear infinite}
.track span{font:italic 400 clamp(1.5rem,3.6vw,2.4rem)/1 var(--serif);white-space:nowrap;display:flex;align-items:center}
.track span::after{content:"";width:.5em;height:.5em;margin:0 1.4rem;background:var(--accent);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)}
@keyframes slide{to{transform:translateX(-50%)}}

/* section heads */
.head{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;flex-wrap:wrap;margin-bottom:clamp(36px,5vw,64px)}
.head h2{margin-top:.4em}

/* bakes */
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,2.4vw,32px)}
.card{display:block;text-decoration:none}
.frame{aspect-ratio:4/5;background:var(--stone);border-radius:999px 999px 18px 18px;display:grid;place-items:center;padding:14% 7% 4%;overflow:hidden;position:relative;transition:background .4s}
.frame svg{width:100%;transition:transform .6s var(--ease)}
.card:hover .frame{background:#E4DACA}.card:hover .frame svg{transform:scale(1.07) rotate(-2deg)}
.card .row{display:flex;justify-content:space-between;gap:1rem;align-items:baseline;margin-top:1rem}
.card h3{font-size:1.5rem}.price{font:400 1.25rem/1 var(--serif);color:var(--accent)}.card p{color:var(--muted);font-size:.93rem;margin:.35rem 0 0}
@media(max-width:980px){.cards{grid-template-columns:repeat(2,1fr)}}

/* story */
.story{background:var(--paper)}
.story-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(36px,7vw,110px)}
.story h2{position:sticky;top:120px;align-self:start}
.story .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4rem;margin-top:2.6rem;border-top:1px solid var(--line);padding-top:2rem}
.stat b{display:block;font:400 clamp(2.4rem,5vw,3.6rem)/1 var(--serif);color:var(--accent)}.stat span{font-size:.88rem;color:var(--muted);display:block;margin-top:.4rem;line-height:1.35}
@media(max-width:860px){.story-grid{grid-template-columns:1fr}.story h2{position:static}}

/* process */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,3vw,48px);counter-reset:s}
.step{border-top:1px solid var(--ink);padding-top:1.3rem}.step::before{counter-increment:s;content:"0" counter(s);font:italic 400 1.1rem var(--serif);color:var(--accent)}
.step h3{margin:.6rem 0 .5rem}.step p{color:var(--muted);margin:0}
@media(max-width:780px){.steps{grid-template-columns:1fr}}

/* quote */
.quote{text-align:center;background:var(--stone)}
.quote blockquote{margin:0 auto;max-width:880px;font:italic 400 clamp(1.8rem,4.6vw,3.2rem)/1.15 var(--serif);letter-spacing:-.01em}
.quote cite{display:block;margin-top:1.8rem;font:700 .8rem var(--sans);letter-spacing:.16em;text-transform:uppercase;font-style:normal;color:var(--muted)}
.quote .wheat{width:46px;margin:0 auto 1.6rem}

/* visit */
.visit{background:var(--paper);border-radius:32px;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;border:1px solid var(--line)}
.visit .info{padding:clamp(28px,5vw,64px)}.visit .map{background:var(--stone);min-height:340px;position:relative}
.visit .map>svg{width:100%;height:100%;position:absolute;inset:0}
.pin{position:absolute;left:52%;top:46%;transform:translate(-50%,-100%);width:34px}.pin::after{content:"";position:absolute;left:50%;bottom:-6px;width:26px;height:8px;margin-left:-13px;background:rgba(0,0,0,.14);border-radius:50%;filter:blur(2px)}
.addr{font:400 1.6rem/1.25 var(--serif);margin:1rem 0 1.4rem}
table.hours{border-collapse:collapse;width:100%;margin:0 0 1.6rem}table.hours th,table.hours td{padding:.75rem 0;border-bottom:1px solid var(--line);text-align:left;font-weight:400}
table.hours td{text-align:right}table.hours tr.is-today{color:var(--accent);font-weight:700}table.hours tr.is-today th,table.hours tr.is-today td{font-weight:700}
@media(max-width:820px){.visit{grid-template-columns:1fr}.visit .map{min-height:260px}}

/* cta */
.cta{background:var(--ink);color:var(--bg);text-align:center;overflow:hidden}
.cta h2{max-width:14em;margin:.5em auto .5em}.cta p{color:#CFC6B8;max-width:30em;margin:0 auto 2rem}
.cta .btn{border-color:var(--bg);color:var(--bg)}.cta .btn-primary{background:var(--bg);color:var(--ink)}.cta .btn-primary:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.cta .ring{position:absolute;left:50%;top:50%;width:min(130vw,900px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid rgba(255,255,255,.08);box-shadow:0 0 0 90px rgba(255,255,255,.02),0 0 0 190px rgba(255,255,255,.015)}
.cta .wrap{position:relative}

/* page hero (inner pages) */
.phero{padding:calc(76px + clamp(48px,8vw,110px)) 0 clamp(36px,5vw,70px)}.phero h1{margin:.3em 0 .3em;font-size:clamp(3rem,8vw,6rem)}

/* menu page */
.chips{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:clamp(30px,4vw,56px)}
.chip{font:700 .88rem var(--sans);padding:.7em 1.3em;border-radius:999px;border:1.5px solid var(--line);background:transparent;cursor:pointer;color:var(--ink);transition:all .25s}
.chip:hover{border-color:var(--ink)}.chip[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.cat{display:grid;grid-template-columns:260px 1fr;gap:clamp(24px,5vw,80px);padding:clamp(36px,5vw,64px) 0;border-top:1px solid var(--line)}
.cat[hidden]{display:none}.cat-head svg{width:96px;margin-bottom:1rem}.cat-head h2{font-size:2.6rem}.cat-head p{color:var(--muted);margin:.5rem 0 0;font-size:.95rem}
.items{display:grid;grid-template-columns:1fr 1fr;gap:1.6rem clamp(24px,4vw,56px)}
.item .top{display:flex;align-items:baseline;gap:.7rem}.item h3{font-size:1.45rem;white-space:nowrap}.item .dots{flex:1;border-bottom:1.5px dotted #B9AE9D;transform:translateY(-4px);min-width:20px}
.item p{color:var(--muted);margin:.25rem 0 .4rem;font-size:.95rem}.tags{display:flex;gap:.4rem}.tags b{font:700 .66rem/1 var(--sans);letter-spacing:.08em;border:1px solid var(--line);border-radius:999px;padding:.4em .7em;color:var(--muted)}
.note{margin-top:2rem;padding:1.4rem 1.6rem;background:var(--paper);border-radius:16px;border:1px solid var(--line);color:var(--muted);font-size:.93rem}
@media(max-width:900px){.cat{grid-template-columns:1fr}.items{grid-template-columns:1fr}.cat-head{display:flex;gap:1.2rem;align-items:center}.cat-head svg{width:64px;margin:0}}

/* about */
.split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,96px);align-items:center}
.split .arch{max-width:460px}
@media(max-width:860px){.split{grid-template-columns:1fr}.split .arch{max-width:360px;margin:0 auto;width:100%}}
.values{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.4vw,32px)}
.value{background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:clamp(24px,3vw,40px)}.value svg{width:56px;margin-bottom:1.2rem}.value h3{margin-bottom:.5rem}.value p{color:var(--muted);margin:0}
.team{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.4vw,32px)}.person{text-align:center}
.mono{width:128px;aspect-ratio:1;border-radius:50%;background:var(--stone);display:grid;place-items:center;margin:0 auto 1rem;font:italic 400 2.6rem var(--serif);color:var(--accent)}
.person h3{font-size:1.4rem}.person p{color:var(--muted);margin:.2rem 0 0;font-size:.93rem}
@media(max-width:780px){.values,.team{grid-template-columns:1fr}}

/* contact */
.contact-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(30px,6vw,96px);align-items:start}
.detail{padding:1.2rem 0;border-bottom:1px solid var(--line)}.detail small{display:block;font:700 .72rem var(--sans);letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.35rem}.detail a,.detail span{font:400 1.45rem/1.3 var(--serif);text-decoration:none}.detail a:hover{color:var(--accent)}
.tabs{display:inline-flex;background:var(--stone);border-radius:999px;padding:5px;margin-bottom:1.6rem}.tabs button{border:0;background:transparent;font:700 .9rem var(--sans);padding:.75em 1.4em;border-radius:999px;cursor:pointer;color:var(--ink)}.tabs button[aria-selected=true]{background:var(--ink);color:var(--bg)}
.panel[hidden]{display:none}
.f{display:grid;gap:1.1rem}.f-row{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem}.f-field{display:grid;gap:.4rem}
.f label{font:700 .78rem var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.f input,.f textarea{width:100%;font:400 1rem var(--sans);padding:.9em 1em;background:var(--paper);border:1.5px solid var(--line);border-radius:14px;color:var(--ink);transition:border-color .2s,box-shadow .2s}
.f input:focus,.f textarea:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 4px rgba(181,80,45,.13)}
.f textarea{resize:vertical;min-height:130px}.f-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.f .btn{justify-self:start}.f-status{margin:0;min-height:1.6em;font-size:.95rem}.f-status.ok{color:#2D7A4A}.f-status.bad{color:#B4281B}
@media(max-width:860px){.contact-grid{grid-template-columns:1fr}.f-row{grid-template-columns:1fr}}

/* footer */
.site-footer{background:var(--bg);border-top:1px solid var(--line);padding:clamp(56px,8vw,100px) 0 28px}
.fgrid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:2.4rem}.fgrid h4{font:700 .74rem var(--sans);letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin:0 0 1rem}
.fgrid a{display:block;text-decoration:none;padding:.22em 0;color:var(--ink)}.fgrid a:hover{color:var(--accent)}.fgrid p{color:var(--muted);max-width:22em}
.fbrand{font:italic 400 clamp(2.4rem,5vw,3.4rem)/1 var(--serif);margin-bottom:1rem}
.fbottom{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-top:3rem;padding-top:1.4rem;border-top:1px solid var(--line);font-size:.86rem;color:var(--muted)}.fbottom a{display:inline;margin-left:1.4rem;color:var(--muted)}
@media(max-width:860px){.fgrid{grid-template-columns:1fr 1fr}.fgrid>:first-child,.fgrid>:last-child{grid-column:1/-1}}

/* legal */
.legal{max-width:720px}.legal h2{font-size:1.9rem;margin:2em 0 .4em}

/* motion */
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .9s var(--ease),transform .9s var(--ease)}[data-reveal].in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}[data-reveal]{opacity:1;transform:none}html{scroll-behavior:auto}}
`;

const star = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path fill="currentColor" d="M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/></svg>';

function header(active) {
  const links = C.nav(active);
  return `<header class="site-header"><div class="wrap bar">
<a class="brand" href="index.html" aria-label="${t("business_name")} home">${t("business_name")}</a>
<nav class="nav" aria-label="Main">${links.map((l) => `<a href="${l.href}"${l.current ? ' aria-current="page"' : ""}>${l.label}</a>`).join("")}</nav>
<a class="btn btn-ghost" href="contact.html#preorder">Pre-order</a>
<button class="burger" type="button" aria-label="Menu" aria-expanded="false" data-menu-toggle><i></i></button>
</div></header>
<div class="drawer" data-menu aria-label="Menu">${links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}<a href="contact.html#preorder">Pre-order</a><div class="meta">${t("address_line1")}, ${t("city")}<br>${t("phone")}</div></div>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap">
<div class="fgrid">
<div><div class="fbrand">${t("business_name")}</div><p>${t("tagline")}</p></div>
<div><h4>Explore</h4><a href="index.html">Home</a><a href="menu.html">Menu</a><a href="about.html">About</a><a href="contact.html">Contact</a></div>
<div><h4>Visit</h4><a href="${t("maps_url")}" rel="noopener">${t("address_line1")}</a><a href="${t("maps_url")}" rel="noopener">${t("address_line2")}</a><a href="tel:${t("phone_href")}">${t("phone")}</a><a href="mailto:${t("email")}">${t("email")}</a></div>
<div><h4>Hours</h4><p style="margin:0">Mon to Fri<br>${t("hours_weekdays")}</p><p>Sat ${t("hours_saturday")}<br>Sun ${t("hours_sunday")}</p><h4>Follow</h4><a href="${t("instagram_url")}" rel="noopener">Instagram</a><a href="${t("facebook_url")}" rel="noopener">Facebook</a></div>
</div>
<div class="fbottom"><span>© <span data-year>2026</span> ${t("business_name")}</span><span><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms of service</a></span></div>
</div></footer>
<script src="assets/site.js"></script></body></html>`;
}

const shell = (page, title, desc, active, main) =>
  C.head({ title, desc, page, fontsPreload: ["assets/fonts/InstrumentSerif-Regular.ttf"] }).replace('"assets/fonts/', '"assets/fonts/') + header(active) + `<main id="main">${main}</main>` + footer();

const bakeCards = () => {
  const picks = C.MENU.flatMap((c) => c.items.filter((i) => i.star).map((i) => ({ ...i, cat: c.name })));
  return picks.slice(0, 4).map((i, k) => `<a class="card" href="menu.html#${esc(i.n.toLowerCase().replace(/[^a-z]+/g, "-"))}" data-reveal data-delay="${k * 90}"><div class="frame" data-photo="${esc(i.n)}">${art(i.art || "loaf", P)}</div><div class="row"><h3>${i.n}</h3><span class="price">£${i.p}</span></div><p>${i.d}</p></a>`).join("");
};

function home() {
  const main = `
<section class="hero"><div class="wrap hero-grid">
<div>
<span class="eyebrow" data-reveal>Artisan bakery · ${t("city")}</span>
<h1 data-reveal data-delay="80">Bread, baked <em>slowly.</em></h1>
<p class="lead" data-reveal data-delay="160">${t("tagline")}</p>
<div class="actions" data-reveal data-delay="240"><a class="btn btn-primary" href="menu.html">See today's bakes</a><a class="arrow-link" href="contact.html#preorder">Pre-order for tomorrow <span>→</span></a></div>
<div class="facts" data-reveal data-delay="320"><div><b>${t("years_baking")}</b><span>years of baking</span></div><div><b>5am</b><span>first loaves out</span></div><div><b>36h</b><span>slow fermentation</span></div></div>
</div>
<div class="hero-art" data-reveal data-delay="200">
<div class="arch" data-photo="hero"><div class="sun"></div><div class="piece" data-parallax="0.05">${art("loaf", P)}</div></div>
<div class="badge"><svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="c" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1 -92 0"/></defs><text font-family="Instrument Sans,sans-serif" font-size="11" font-weight="700" letter-spacing="3.2" fill="#1D1A17"><textPath href="#c">FRESH FROM THE OVEN · EVERY DAY · </textPath></text></svg><div class="core">${art("wheat", P)}</div></div>
<div class="tag"><i></i><span><b>Fresh batch</b><br>out at 8:00 today</span></div>
</div>
</div></section>

<div class="marquee" aria-hidden="true"><div class="track"><span>Sourdough</span><span>Butter croissants</span><span>Seasonal tarts</span><span>Cinnamon rolls</span><span>Good coffee</span><span>Baguettes</span><span>Sourdough</span><span>Butter croissants</span><span>Seasonal tarts</span><span>Cinnamon rolls</span><span>Good coffee</span><span>Baguettes</span></div></div>

<section class="sec"><div class="wrap">
<div class="head"><div data-reveal><span class="eyebrow">Fresh today</span><h2>From the <em>oven</em></h2></div><a class="arrow-link" href="menu.html" data-reveal>View the full menu <span>→</span></a></div>
<div class="cards">${bakeCards()}</div>
</div></section>

<section class="sec story"><div class="wrap story-grid">
<h2 data-reveal>Good bread takes <em>time.</em> So we give it plenty.</h2>
<div data-reveal data-delay="120">
<p class="lead">${t("business_name")} began with one oven and a jar of starter. Today the recipe is the same: slow dough, honest ingredients, and nothing rushed.</p>
<p>We mill nothing ourselves, but we know the farmers who do. Every loaf rests overnight, every croissant is folded by hand, and everything that is not sold by closing goes to people who can use it.</p>
<p><a class="arrow-link" href="about.html">Read our story <span>→</span></a></p>
<div class="stats"><div class="stat"><b data-count="36" data-suffix="h">36h</b><span>from mixing to your table</span></div><div class="stat"><b data-count="100" data-suffix="%">100%</b><span>British stoneground flour</span></div><div class="stat"><b data-count="0">0</b><span>additives or improvers</span></div></div>
</div></div></section>

<section class="sec"><div class="wrap">
<div class="head"><div data-reveal><span class="eyebrow">How we bake</span><h2>Three simple <em>steps</em></h2></div></div>
<div class="steps">
<div class="step" data-reveal><h3>Mix &amp; rest</h3><p>Flour, water, salt and starter are mixed by hand, then left alone to build flavour overnight.</p></div>
<div class="step" data-reveal data-delay="100"><h3>Shape &amp; prove</h3><p>Each loaf is shaped one at a time and given the time it needs, never a minute less.</p></div>
<div class="step" data-reveal data-delay="200"><h3>Bake at dawn</h3><p>Loaves go onto the hot stone before sunrise, so they are warm when you walk in.</p></div>
</div></div></section>

<section class="sec quote"><div class="wrap" data-reveal><div class="wheat">${art("wheat", P)}</div><blockquote>“The best sourdough in the city. I plan my mornings around the 8 o'clock batch.”</blockquote><cite>A regular, every Saturday</cite></div></section>

<section class="sec"><div class="wrap"><div class="visit" data-reveal>
<div class="info"><span class="eyebrow">Come and say hello</span><div class="addr">${t("address_line1")}<br>${t("address_line2")}</div>${C.hoursRows()}<a class="btn btn-primary" href="${t("maps_url")}" rel="noopener">Get directions</a></div>
<div class="map" aria-hidden="true"><svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><rect width="400" height="400" fill="#EBE4D7"/><g stroke="#FBF8F2" stroke-width="16" fill="none" stroke-linecap="round"><path d="M-10 120 L410 90"/><path d="M-10 290 L410 330"/><path d="M110 -10 L150 410"/><path d="M300 -10 L270 410"/></g><g stroke="#FBF8F2" stroke-width="7" fill="none"><path d="M-10 200 L410 210"/><path d="M200 -10 L205 410"/></g><path d="M0 360 C80 330 120 380 200 360 S340 330 400 370 V400 H0Z" fill="#D5DCC8"/><rect x="226" y="130" width="52" height="38" rx="6" fill="#DCD3C4"/><rect x="60" y="230" width="62" height="44" rx="6" fill="#DCD3C4"/><circle cx="330" cy="250" r="26" fill="#D5DCC8"/></svg><div class="pin"><svg viewBox="0 0 34 44"><path d="M17 0C7.6 0 0 7.4 0 16.6 0 29 17 44 17 44s17-15 17-27.4C34 7.4 26.4 0 17 0z" fill="#B5502D"/><circle cx="17" cy="16.5" r="6.5" fill="#FBF8F2"/></svg></div></div>
</div></div></section>

<section class="sec cta"><div class="ring"></div><div class="wrap" data-reveal><span class="eyebrow" style="color:#CFC6B8">Skip the queue</span><h2>Order ahead for tomorrow's <em style="color:#F0B79F">batch</em></h2><p>Tell us what you would like and when you will collect it. We will have it wrapped and waiting.</p><a class="btn btn-primary" href="contact.html#preorder">Pre-order now</a></div></section>`;
  return shell("home", "Artisan bakery", `${t("tagline")}`, "home", main);
}

function menu() {
  const cats = C.MENU.map((c) => `<div class="cat" data-cat="${c.id}" id="${c.id}"><div class="cat-head" data-reveal>${art(c.art, P)}<div><h2>${c.name}</h2><p>${c.blurb}</p></div></div><div class="items">${c.items.map((i, k) => `<div class="item" id="${esc(i.n.toLowerCase().replace(/[^a-z]+/g, "-"))}" data-reveal data-delay="${k * 60}"><div class="top"><h3>${i.n}</h3><span class="dots"></span><span class="price">£${i.p}</span></div><p>${i.d}</p><div class="tags">${i.tags.map((g) => `<b title="${C.TAGS[g]}">${g}</b>`).join("")}</div></div>`).join("")}</div></div>`).join("");
  const main = `<section class="phero"><div class="wrap"><span class="eyebrow" data-reveal>The menu</span><h1 data-reveal data-delay="80">Everything we <em>bake</em></h1><p class="lead" data-reveal data-delay="160">Made fresh every morning, in small batches. When it is gone, it is gone.</p></div></section>
<section class="wrap" style="padding-bottom:clamp(60px,9vw,120px)"><div class="chips" role="group" aria-label="Filter the menu"><button class="chip" data-filter="all" aria-pressed="true">All</button>${C.MENU.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("")}</div>${cats}
<div class="note"><b>V</b> vegetarian · <b>VG</b> vegan · <b>GF</b> made without gluten ingredients (made in a kitchen that handles gluten). Please tell us about allergies when you order. Prices include VAT.</div></section>
<section class="sec cta"><div class="ring"></div><div class="wrap"><h2>Want it <em style="color:#F0B79F">waiting</em> for you?</h2><p>Pre-order and skip the queue.</p><a class="btn btn-primary" href="contact.html#preorder">Pre-order now</a></div></section>`;
  return shell("menu", "Menu", "Fresh bread, pastries, cakes and coffee, baked every morning.", "menu", main);
}

function about() {
  const main = `<section class="phero"><div class="wrap split"><div><span class="eyebrow" data-reveal>Our story</span><h1 data-reveal data-delay="80">Flour, water, salt and <em>patience.</em></h1><p class="lead" data-reveal data-delay="160">${t("business_name")} started in ${t("year_founded")} with a small oven and a jar of starter. We are still small, and we like it that way.</p></div><div class="arch" data-reveal data-delay="160" data-photo="about"><div class="sun"></div><div class="piece" data-parallax="0.04">${art("croissant", P)}</div></div></div></section>
<section class="sec story" style="padding-block:clamp(60px,9vw,120px)"><div class="wrap story-grid"><h2 data-reveal>We bake what we would <em>want to eat.</em></h2><div data-reveal data-delay="100"><p class="lead">Everything starts with a question: would we serve this to the people we love?</p><p>That is why the dough rests for a day and a half, why the butter is the real thing, and why we say no to shortcuts. Our flour comes from British mills, our eggs from a farm down the road, and our coffee from a roaster who pays growers properly.</p><p>${t("owner_name")} still opens the bakery most mornings. Come early and you might get the first loaf.</p></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><div data-reveal><span class="eyebrow">What we care about</span><h2>Three <em>promises</em></h2></div></div>
<div class="values"><div class="value" data-reveal>${art("loaf", P)}<h3>Time, not shortcuts</h3><p>Slow fermentation gives better flavour and bread that keeps. We never rush it.</p></div><div class="value" data-reveal data-delay="100">${art("wheat", P)}<h3>Honest ingredients</h3><p>Short ingredient lists you can read. British flour, real butter, free-range eggs.</p></div><div class="value" data-reveal data-delay="200">${art("coffee", P)}<h3>A warm welcome</h3><p>Stay for a coffee or take it away. Either way, you are always welcome here.</p></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="head"><div data-reveal><span class="eyebrow">The people</span><h2>Meet the <em>bakers</em></h2></div></div>
<div class="team"><div class="person" data-reveal><div class="mono">A</div><h3>Head baker</h3><p>Opens up at 4am and tastes everything.</p></div><div class="person" data-reveal data-delay="100"><div class="mono">M</div><h3>Pastry chef</h3><p>Folds every croissant by hand.</p></div><div class="person" data-reveal data-delay="200"><div class="mono">J</div><h3>Front of house</h3><p>Knows your order before you do.</p></div></div></div></section>
<section class="sec cta"><div class="ring"></div><div class="wrap" data-reveal><h2>Come and <em style="color:#F0B79F">taste</em> the difference</h2><p>We open early and bake all morning. The best time to visit is the moment the first tray comes out.</p><a class="btn btn-primary" href="contact.html">Find us</a></div></section>`;
  return shell("about", "Our story", `The story behind ${t("business_name")}: slow dough, honest ingredients and a warm welcome.`, "about", main);
}

function contact() {
  const main = `<section class="phero"><div class="wrap"><span class="eyebrow" data-reveal>Get in touch</span><h1 data-reveal data-delay="80">Say <em>hello</em></h1><p class="lead" data-reveal data-delay="160">Pre-order for tomorrow, ask about a celebration cake or just tell us what you think.</p></div></section>
<section class="wrap" style="padding-bottom:clamp(60px,9vw,130px)"><div class="contact-grid">
<div data-reveal><div class="detail"><small>Visit</small><a href="${t("maps_url")}" rel="noopener">${t("address_line1")}, ${t("address_line2")}</a></div><div class="detail"><small>Call</small><a href="tel:${t("phone_href")}">${t("phone")}</a></div><div class="detail"><small>Email</small><a href="mailto:${t("email")}">${t("email")}</a></div><div class="detail"><small>Opening hours</small>${C.hoursRows()}</div><div class="detail" style="border:0"><small>Follow</small><a href="${t("instagram_url")}" rel="noopener">Instagram</a> &nbsp;·&nbsp; <a href="${t("facebook_url")}" rel="noopener">Facebook</a></div></div>
<div id="preorder" data-reveal data-delay="120"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="order">Pre-order</button><button role="tab" aria-selected="false" data-tab="contact">Send a message</button></div>
<div class="panel" data-panel="order">${C.form("order", { submit: "Place pre-order" })}</div><div class="panel" data-panel="contact" hidden>${C.form("contact", { submit: "Send message" })}</div></div>
</div></section>
<script>(function(){var tabs=[].slice.call(document.querySelectorAll("[data-tab]")),ps=[].slice.call(document.querySelectorAll("[data-panel]"));function show(k){tabs.forEach(function(t){t.setAttribute("aria-selected",t.getAttribute("data-tab")===k?"true":"false")});ps.forEach(function(p){p.hidden=p.getAttribute("data-panel")!==k})}tabs.forEach(function(t){t.addEventListener("click",function(){show(t.getAttribute("data-tab"))})});if(location.hash==="#message")show("contact")})();</script>`;
  return shell("contact", "Contact and pre-orders", `Pre-order, ask a question or find ${t("business_name")}.`, "contact", main);
}

function legalPage(kind) {
  const L = C.legal(kind);
  return shell(kind, L.title, L.title, "", `<section class="phero"><div class="wrap legal"><span class="eyebrow">Legal</span><h1>${L.title}</h1><div style="margin-top:2rem">${L.body}</div></div></section>`);
}

function build() {
  return {
    name: "minimal",
    themeColor: "#F7F3EC",
    fonts: FONTS,
    files: {
      "index.html": home(), "menu.html": menu(), "about.html": about(), "contact.html": contact(),
      "privacy.html": legalPage("privacy"), "terms.html": legalPage("terms"),
      "assets/style.css": CSS, "assets/site.js": C.SITE_JS,
    },
  };
}

module.exports = { build };
