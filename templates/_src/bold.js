"use strict";
/**
 * bakery-bold: warm, loud and friendly. Big type, sticker badges, thick outlines, hard shadows, bright flat art.
 * Fonts: Bricolage Grotesque + Outfit (SIL Open Font License, shipped with the template).
 */
const C = require("./common");
const { art } = require("./illustrations");
const { t, esc } = C;

const P = { bg: "#FFF3D9", ink: "#2B160E", crust: "#F2A33A", crustDark: "#D9701F", light: "#FFD25A", cream: "#FFF3D9", accent: "#E8452C", accent2: "#FF9EB5", sw: 4, shadow: "rgba(43,22,14,.16)", plate: "#FFF3D9" };

const FONTS = [
  ["BricolageGrotesque-Bold.ttf", "BricolageGrotesque-Bold.ttf"],
  ["Outfit-Regular.ttf", "Outfit-Regular.ttf"],
  ["Outfit-Bold.ttf", "Outfit-Bold.ttf"],
  ["BricolageGrotesque-OFL.txt", "OFL-BricolageGrotesque.txt"],
  ["Outfit-OFL.txt", "OFL-Outfit.txt"],
];

const CSS = `
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/BricolageGrotesque-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Outfit";src:url(fonts/Outfit-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
:root{--cream:#FFF3D9;--butter:#FFD23F;--tomato:#E8452C;--pink:#FF9EB5;--orange:#FF8A2B;--mint:#9BE0C4;--cocoa:#2B160E;--head:"Bricolage Grotesque","Arial Black",Impact,sans-serif;--body:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;--gut:clamp(18px,4.5vw,48px);--max:1280px;--b:3px;--ease:cubic-bezier(.3,1.4,.5,1)}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--cocoa);font:400 18px/1.55 var(--body);-webkit-font-smoothing:antialiased;font-synthesis:none;overflow-x:hidden}
svg,img{display:block;max-width:100%}a{color:inherit}p{margin:0 0 1em}
h1,h2,h3{font-family:var(--head);font-weight:700;line-height:.95;letter-spacing:-.035em;margin:0;text-wrap:balance}
h1{font-size:clamp(3.4rem,12.5vw,9.4rem);text-transform:uppercase}h2{font-size:clamp(2.4rem,7vw,5rem);text-transform:uppercase}h3{font-size:1.5rem;letter-spacing:-.02em;line-height:1.05}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding:0 var(--gut)}
.skip{position:absolute;left:-999px;top:8px;background:var(--cocoa);color:#fff;padding:.6em 1em;border-radius:10px;z-index:100}.skip:focus{left:8px}
:focus-visible{outline:3px solid var(--tomato);outline-offset:3px;border-radius:6px}
.sec{padding:clamp(64px,9vw,120px) 0;position:relative}
.lead{font-size:clamp(1.15rem,2.4vw,1.45rem);line-height:1.4;max-width:30em}
.hl{background:linear-gradient(transparent 58%,var(--butter) 58% 94%,transparent 94%);padding:0 .06em}
.hl-p{background:linear-gradient(transparent 58%,var(--pink) 58% 94%,transparent 94%);padding:0 .06em}
.hl-t{color:var(--tomato)}
.kicker{display:inline-block;font:700 .82rem/1 var(--body);letter-spacing:.14em;text-transform:uppercase;background:var(--cocoa);color:var(--butter);padding:.65em 1em;border-radius:999px;transform:rotate(-2deg)}

/* top bar + header */
.promo{background:var(--tomato);color:#fff;overflow:hidden;border-bottom:var(--b) solid var(--cocoa);font:700 .88rem/1 var(--body);letter-spacing:.1em;text-transform:uppercase}
.promo .track{display:flex;width:max-content;animation:slide 30s linear infinite;padding:.8em 0}.promo span{white-space:nowrap;padding:0 1.6rem}
@keyframes slide{to{transform:translateX(-50%)}}
.site-header{position:sticky;top:0;z-index:50;background:var(--cream);border-bottom:var(--b) solid var(--cocoa)}
.bar{display:flex;align-items:center;justify-content:space-between;height:78px;gap:1rem}
.brand{display:flex;align-items:center;gap:.7rem;text-decoration:none;font:700 1.6rem/1 var(--head);letter-spacing:-.03em;text-transform:uppercase}
.brand i{width:46px;height:46px;border-radius:50%;background:var(--butter);border:var(--b) solid var(--cocoa);display:grid;place-items:center;transform:rotate(-8deg);transition:transform .4s var(--ease)}
.brand:hover i{transform:rotate(12deg) scale(1.08)}.brand i svg{width:26px}
.nav{display:flex;gap:.5rem}.nav a{text-decoration:none;font-weight:700;padding:.55em 1.1em;border-radius:999px;border:var(--b) solid transparent;transition:all .2s}
.nav a:hover{border-color:var(--cocoa);background:var(--butter)}.nav a[aria-current=page]{background:var(--cocoa);color:var(--cream)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.6em;font:700 1.05rem/1 var(--body);padding:1em 1.6em;border-radius:999px;border:var(--b) solid var(--cocoa);background:var(--tomato);color:#fff;text-decoration:none;cursor:pointer;box-shadow:4px 4px 0 var(--cocoa);transition:transform .2s var(--ease),box-shadow .2s var(--ease)}
.btn:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--cocoa)}.btn:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--cocoa)}
.btn-butter{background:var(--butter);color:var(--cocoa)}.btn-cream{background:var(--cream);color:var(--cocoa)}.btn-primary{background:var(--tomato)}
.bar .btn{padding:.75em 1.3em;font-size:.95rem}
.burger{display:none;width:50px;height:50px;border-radius:50%;border:var(--b) solid var(--cocoa);background:var(--butter);cursor:pointer;position:relative;box-shadow:3px 3px 0 var(--cocoa)}
.burger i,.burger i::before,.burger i::after{position:absolute;left:12px;width:20px;height:3px;border-radius:2px;background:var(--cocoa);transition:transform .25s}.burger i{top:21px}.burger i::before,.burger i::after{content:"";left:0}.burger i::before{top:-7px}.burger i::after{top:7px}
.menu-open .burger i{background:transparent}.menu-open .burger i::before{transform:translateY(7px) rotate(45deg)}.menu-open .burger i::after{transform:translateY(-7px) rotate(-45deg)}
.drawer{position:fixed;inset:0;z-index:40;background:var(--butter);padding:140px var(--gut) 40px;display:flex;flex-direction:column;gap:.3rem;transform:translateY(-100%);transition:transform .5s var(--ease);visibility:hidden}
.drawer a{font:700 3.2rem/1.1 var(--head);text-transform:uppercase;text-decoration:none;letter-spacing:-.03em}.drawer a:hover{color:var(--tomato)}
.menu-open .drawer{transform:none;visibility:visible}.menu-open{overflow:hidden}
@media(max-width:900px){.nav,.bar .btn{display:none}.burger{display:block}}

/* hero */
.hero{padding:clamp(40px,6vw,80px) 0 clamp(60px,9vw,120px);overflow:hidden}
.hero-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:2rem;align-items:center}
.hero h1{margin:.3em 0 .35em}.hero .actions{display:flex;flex-wrap:wrap;gap:1.2rem;margin-top:2rem}
.stage{position:relative;aspect-ratio:1;max-width:520px;margin-left:auto;width:100%}
.disc{position:absolute;border-radius:50%;border:var(--b) solid var(--cocoa);display:grid;place-items:center;box-shadow:6px 6px 0 var(--cocoa)}
.d1{inset:6% 4% 8% 8%;background:var(--butter)}.d1 svg{width:84%}
.d2{width:36%;aspect-ratio:1;left:-4%;bottom:-2%;background:var(--pink);animation:bob 5s ease-in-out infinite}.d2 svg{width:80%}
.d3{width:30%;aspect-ratio:1;right:-2%;top:-3%;background:var(--tomato);animation:bob 6s ease-in-out -2s infinite}.d3 svg{width:84%}
@keyframes bob{50%{transform:translateY(-12px) rotate(4deg)}}
.stamp{position:absolute;right:2%;bottom:6%;width:30%;aspect-ratio:1;border-radius:50%;background:var(--cream);border:var(--b) solid var(--cocoa);display:grid;place-items:center;text-align:center;font:700 .95rem/1.05 var(--head);text-transform:uppercase;transform:rotate(12deg);animation:wob 4s ease-in-out infinite}
.stamp b{display:block;font-size:2.1rem;color:var(--tomato)}
@keyframes wob{50%{transform:rotate(4deg) scale(1.05)}}
@media(max-width:900px){.hero-grid{grid-template-columns:1fr}.stage{margin:1rem auto 0;max-width:400px}}

/* band */
.band{background:var(--butter);border-block:var(--b) solid var(--cocoa);overflow:hidden;padding:1rem 0}
.band .track{display:flex;width:max-content;animation:slide 28s linear infinite}
.band span{font:700 clamp(2rem,5vw,3.4rem)/1 var(--head);text-transform:uppercase;white-space:nowrap;display:flex;align-items:center;letter-spacing:-.03em}
.band span::after{content:"✺";color:var(--tomato);margin:0 1.4rem;font-size:.8em}

/* heads */
.head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1.4rem;margin-bottom:clamp(30px,4vw,56px)}.head h2{margin-top:.5rem}

/* cards */
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(16px,2.2vw,28px)}
.card{background:var(--c,var(--butter));border:var(--b) solid var(--cocoa);border-radius:28px;padding:1.2rem 1.2rem 1.4rem;box-shadow:6px 6px 0 var(--cocoa);text-decoration:none;position:relative;display:flex;flex-direction:column;transition:transform .3s var(--ease),box-shadow .3s var(--ease)}
.card:hover{transform:translate(-4px,-6px) rotate(-1deg);box-shadow:11px 12px 0 var(--cocoa)}
.card .pic{aspect-ratio:1;display:grid;place-items:center;margin-bottom:.6rem}.card .pic svg{width:88%;transition:transform .5s var(--ease)}.card:hover .pic svg{transform:scale(1.08) rotate(5deg)}
.card h3{margin-bottom:.4rem}.card p{font-size:.95rem;margin:0}
.sticker{position:absolute;top:-16px;right:-12px;min-width:64px;height:64px;padding:0 .4rem;border-radius:50%;background:var(--cream);border:var(--b) solid var(--cocoa);display:grid;place-items:center;font:700 1.25rem/1 var(--head);transform:rotate(10deg);box-shadow:3px 3px 0 var(--cocoa)}
.c1{--c:var(--butter)}.c2{--c:var(--pink)}.c3{--c:var(--mint)}.c4{--c:#FFB347}
@media(max-width:1020px){.cards{grid-template-columns:repeat(2,1fr)}}@media(max-width:520px){.cards{gap:14px}.card{padding:.8rem .8rem 1rem;border-radius:22px}.card h3{font-size:1.15rem}.card p{font-size:.85rem}}

/* why */
.why{background:var(--cocoa);color:var(--cream)}.why h2{color:var(--butter)}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.2vw,28px)}
.tile{border:var(--b) solid var(--cream);border-radius:28px;padding:clamp(22px,3vw,36px);position:relative;overflow:hidden}
.tile b{font:700 clamp(4rem,9vw,7rem)/.85 var(--head);color:var(--tomato);display:block;letter-spacing:-.05em}.tile:nth-child(2) b{color:var(--butter)}.tile:nth-child(3) b{color:var(--pink)}
.tile h3{font-size:1.7rem;margin:.8rem 0 .5rem}.tile p{margin:0;color:#E9D9BA}
@media(max-width:860px){.tiles{grid-template-columns:1fr}}

/* order band */
.order{background:var(--pink);border-block:var(--b) solid var(--cocoa);overflow:hidden}
.order-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:2rem;align-items:center}.order .art{max-width:380px;margin:0 auto;transform:rotate(6deg);animation:bob 6s ease-in-out infinite}
@media(max-width:860px){.order-grid{grid-template-columns:1fr}.order .art{max-width:240px}}

/* reviews */
.reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,2.4vw,30px)}
.rev{background:#fff;border:var(--b) solid var(--cocoa);border-radius:28px 28px 28px 6px;padding:1.6rem;box-shadow:6px 6px 0 var(--cocoa);position:relative}.rev:nth-child(2){transform:rotate(1.4deg);background:var(--butter)}.rev:nth-child(1){transform:rotate(-1.2deg)}.rev:nth-child(3){transform:rotate(-.6deg);background:var(--mint)}
.stars{display:flex;gap:2px;margin-bottom:.8rem}.stars svg{width:22px;color:var(--tomato)}
.rev p{font:700 1.2rem/1.25 var(--head);letter-spacing:-.02em;margin:0 0 1rem}.rev small{font-weight:700;opacity:.75}
@media(max-width:860px){.reviews{grid-template-columns:1fr}.rev{transform:none!important}}

/* visit */
.visit{background:var(--tomato);color:#fff;border:var(--b) solid var(--cocoa);border-radius:36px;box-shadow:9px 9px 0 var(--cocoa);display:grid;grid-template-columns:1.1fr .9fr;overflow:hidden}
.visit .info{padding:clamp(26px,5vw,60px)}.visit h2{margin:.6rem 0 1rem}.visit .addr{font:700 1.5rem/1.2 var(--head);letter-spacing:-.02em;margin-bottom:1.4rem}
.visit .side{background:var(--butter);color:var(--cocoa);border-left:var(--b) solid var(--cocoa);padding:clamp(26px,4vw,48px);display:flex;flex-direction:column;justify-content:center}
table.hours{border-collapse:collapse;width:100%}table.hours th,table.hours td{padding:.7rem 0;border-bottom:2px dashed rgba(43,22,14,.35);text-align:left;font-weight:400}table.hours td{text-align:right;font-weight:700}
table.hours tr.is-today{background:var(--cocoa);color:var(--butter)}table.hours tr.is-today th,table.hours tr.is-today td{padding-inline:.8rem;border-color:transparent;font-weight:700}
.side h3{font-size:2rem;margin-bottom:1rem}
@media(max-width:860px){.visit{grid-template-columns:1fr}.visit .side{border-left:0;border-top:var(--b) solid var(--cocoa)}}

/* page heads */
.phero{padding:clamp(50px,8vw,100px) 0 clamp(30px,4vw,60px);position:relative;overflow:hidden}.phero h1{font-size:clamp(3.4rem,11vw,8rem);margin:.35em 0 .3em}
.phero .corner{position:absolute;right:max(var(--gut),6vw);top:50%;transform:translateY(-50%) rotate(8deg);width:clamp(120px,22vw,300px);animation:bob 6s ease-in-out infinite}
@media(max-width:700px){.phero .corner{opacity:.18;right:-20px}}

/* menu */
.chips{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,52px)}
.chip{font:700 1rem var(--body);padding:.7em 1.3em;border-radius:999px;border:var(--b) solid var(--cocoa);background:var(--cream);cursor:pointer;color:var(--cocoa);box-shadow:3px 3px 0 var(--cocoa);transition:all .15s}
.chip:hover{background:var(--butter)}.chip[aria-pressed=true]{background:var(--cocoa);color:var(--butter);transform:translate(2px,2px);box-shadow:1px 1px 0 var(--cocoa)}
.cat{margin-bottom:clamp(40px,6vw,80px)}.cat[hidden]{display:none}.cat-title{display:flex;align-items:center;gap:1rem;margin-bottom:1.6rem;flex-wrap:wrap}.cat-title h2{font-size:clamp(2.4rem,6vw,4rem)}.cat-title p{margin:0;font-weight:700;background:var(--butter);padding:.4em .9em;border-radius:999px;border:var(--b) solid var(--cocoa);transform:rotate(-1.5deg)}
.menu-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(14px,2vw,24px)}
.mi{display:grid;grid-template-columns:92px 1fr auto;gap:1.1rem;align-items:center;background:#fff;border:var(--b) solid var(--cocoa);border-radius:24px;padding:1rem 1.2rem;box-shadow:5px 5px 0 var(--cocoa);transition:transform .25s var(--ease),box-shadow .25s}
.mi:hover{transform:translate(-3px,-3px);box-shadow:8px 8px 0 var(--cocoa)}.mi .pic{width:92px;aspect-ratio:1;border-radius:18px;background:var(--c);border:var(--b) solid var(--cocoa);display:grid;place-items:center}.mi .pic svg{width:86%}
.mi h3{margin-bottom:.25rem}.mi p{font-size:.93rem;margin:0 0 .4rem;opacity:.85}.mi .pr{font:700 1.5rem/1 var(--head);background:var(--butter);border:var(--b) solid var(--cocoa);border-radius:999px;padding:.4em .7em;transform:rotate(4deg)}
.tags{display:flex;gap:.35rem}.tags b{font:700 .68rem/1 var(--body);border:2px solid var(--cocoa);border-radius:999px;padding:.35em .6em;background:var(--cream)}
.mi:nth-child(4n+1){--c:var(--butter)}.mi:nth-child(4n+2){--c:var(--pink)}.mi:nth-child(4n+3){--c:var(--mint)}.mi:nth-child(4n+4){--c:#FFB347}
.note{margin-top:1rem;padding:1.2rem 1.4rem;border:var(--b) dashed var(--cocoa);border-radius:20px;font-size:.95rem}
@media(max-width:900px){.menu-cards{grid-template-columns:1fr}}@media(max-width:480px){.mi{grid-template-columns:70px 1fr;padding:.9rem}.mi .pic{width:70px}.mi .pr{grid-column:2;justify-self:start;font-size:1.2rem}}

/* about */
.big{font:700 clamp(2rem,5.6vw,4.2rem)/1.02 var(--head);letter-spacing:-.035em;max-width:17em}
.day{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,24px);margin-top:2.4rem}
.slot{background:var(--cream);border:var(--b) solid var(--cocoa);border-radius:26px;padding:1.3rem;box-shadow:5px 5px 0 var(--cocoa)}.slot:nth-child(1){background:var(--butter)}.slot:nth-child(2){background:var(--pink)}.slot:nth-child(3){background:var(--mint)}
.slot b{font:700 2.6rem/1 var(--head);display:block;letter-spacing:-.04em}.slot h3{margin:.4rem 0}.slot p{margin:0;font-size:.95rem}
@media(max-width:900px){.day{grid-template-columns:1fr 1fr}}@media(max-width:520px){.day{grid-template-columns:1fr}}
.team{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.2vw,28px)}.person{text-align:center;background:#fff;border:var(--b) solid var(--cocoa);border-radius:28px;padding:1.6rem;box-shadow:6px 6px 0 var(--cocoa)}
.mono{width:110px;aspect-ratio:1;border-radius:50%;border:var(--b) solid var(--cocoa);background:var(--pink);display:grid;place-items:center;margin:0 auto 1rem;font:700 3rem/1 var(--head)}.person:nth-child(2) .mono{background:var(--butter)}.person:nth-child(3) .mono{background:var(--mint)}
.person p{margin:.2rem 0 0;opacity:.8}@media(max-width:780px){.team{grid-template-columns:1fr}}

/* contact */
.contact-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(24px,4vw,56px);align-items:start}
.cbox{display:grid;gap:14px}.cinfo{background:#fff;border:var(--b) solid var(--cocoa);border-radius:24px;padding:1.1rem 1.3rem;box-shadow:5px 5px 0 var(--cocoa)}.cinfo:nth-child(2){background:var(--butter)}.cinfo:nth-child(3){background:var(--pink)}
.cinfo small{display:block;font:700 .78rem var(--body);letter-spacing:.14em;text-transform:uppercase;opacity:.7}.cinfo a,.cinfo span{overflow-wrap:anywhere;font:700 1.45rem/1.2 var(--head);letter-spacing:-.02em;text-decoration:none}
.formcard{background:#fff;border:var(--b) solid var(--cocoa);border-radius:32px;padding:clamp(22px,4vw,44px);box-shadow:8px 8px 0 var(--cocoa)}
.tabs{display:flex;gap:.6rem;margin-bottom:1.6rem;flex-wrap:wrap}.tabs button{font:700 1rem var(--body);padding:.7em 1.3em;border-radius:999px;border:var(--b) solid var(--cocoa);background:var(--cream);cursor:pointer;color:var(--cocoa)}.tabs button[aria-selected=true]{background:var(--tomato);color:#fff;box-shadow:3px 3px 0 var(--cocoa)}
.panel[hidden]{display:none}
.f{display:grid;gap:1rem}.f-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.f-field{display:grid;gap:.4rem}.f label{font:700 .9rem var(--body)}
.f input,.f textarea{width:100%;font:400 1.05rem var(--body);padding:.85em 1em;background:var(--cream);border:var(--b) solid var(--cocoa);border-radius:16px;color:var(--cocoa)}
.f input:focus,.f textarea:focus{outline:0;background:#fff;box-shadow:4px 4px 0 var(--tomato)}.f textarea{resize:vertical;min-height:120px}.f-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.f .btn{justify-self:start}.f-status{margin:0;min-height:1.5em;font-weight:700}.f-status.ok{color:#17803F}.f-status.bad{color:#C0281B}
@media(max-width:900px){.contact-grid{grid-template-columns:1fr}.f-row{grid-template-columns:1fr}}

/* footer */
.site-footer{background:var(--cocoa);color:var(--cream);padding:clamp(56px,8vw,96px) 0 28px;overflow:hidden}
.mega{font:700 clamp(3.4rem,13vw,13rem)/.85 var(--head);letter-spacing:-.055em;text-transform:uppercase;color:var(--butter);white-space:nowrap;margin:0 0 2.4rem;overflow:hidden}.mega span{display:inline-block}
.fgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:2rem}.fgrid h4{font:700 .85rem var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--pink);margin:0 0 .9rem}
.fgrid a{display:block;text-decoration:none;padding:.2em 0}.fgrid a:hover{color:var(--butter)}.fgrid p{color:#E9D9BA;max-width:22em}
.fbottom{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-top:2.4rem;padding-top:1.4rem;border-top:2px solid rgba(255,243,217,.2);font-size:.9rem;color:#CDBB98}.fbottom a{margin-left:1.4rem;display:inline}
@media(max-width:860px){.fgrid{grid-template-columns:1fr 1fr}.fgrid>:first-child,.fgrid>:last-child{grid-column:1/-1}}
@media(max-width:520px){.stamp{font-size:.7rem}.stamp b{font-size:1.5rem}}
.legal{max-width:720px}.legal h2{font-size:1.9rem;margin:1.6em 0 .4em;text-transform:none}

/* motion */
[data-reveal]{opacity:0;transform:translateY(34px) scale(.97);transition:opacity .6s,transform .7s var(--ease)}[data-reveal].in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}[data-reveal]{opacity:1;transform:none}html{scroll-behavior:auto}}
`;

const star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.5l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.6 5.6 21.2 7 14l-5.3-5 7.2-.9z"/></svg>';
const promo = `<div class="promo" aria-hidden="true"><div class="track">${Array(2).fill('<span>Baked fresh every morning</span><span>✺</span><span>Pre-order by 4pm for next-day pickup</span><span>✺</span><span>Small batches, big flavour</span><span>✺</span>').join("").repeat(2)}</div></div>`;

function header(active) {
  const links = C.nav(active);
  return `${promo}<header class="site-header"><div class="wrap bar">
<a class="brand" href="index.html"><i>${art("wheat", { ...P, sw: 5 })}</i><span>${t("business_name")}</span></a>
<nav class="nav" aria-label="Main">${links.map((l) => `<a href="${l.href}"${l.current ? ' aria-current="page"' : ""}>${l.label}</a>`).join("")}</nav>
<a class="btn" href="contact.html#preorder">Pre-order</a>
<button class="burger" type="button" aria-label="Menu" aria-expanded="false" data-menu-toggle><i></i></button>
</div></header>
<div class="drawer" data-menu aria-label="Menu">${links.map((l) => `<a href="${l.href}">${l.label}</a>`).join("")}<a href="contact.html#preorder" style="color:var(--tomato)">Pre-order</a></div>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap">
<div class="mega" data-fit aria-hidden="true"><span>${t("business_name")}</span></div>
<div class="fgrid">
<div><p style="font-size:1.25rem;color:var(--cream)">${t("tagline")}</p></div>
<div><h4>Explore</h4><a href="index.html">Home</a><a href="menu.html">Menu</a><a href="about.html">About</a><a href="contact.html">Contact</a></div>
<div><h4>Visit</h4><a href="${t("maps_url")}" rel="noopener">${t("address_line1")}</a><a href="${t("maps_url")}" rel="noopener">${t("address_line2")}</a><a href="tel:${t("phone_href")}">${t("phone")}</a><a href="mailto:${t("email")}">${t("email")}</a></div>
<div><h4>Hours</h4><p style="margin:0">Mon to Fri ${t("hours_weekdays")}<br>Sat ${t("hours_saturday")}<br>Sun ${t("hours_sunday")}</p><h4 style="margin-top:1.2rem">Follow</h4><a href="${t("instagram_url")}" rel="noopener">Instagram</a><a href="${t("facebook_url")}" rel="noopener">Facebook</a></div>
</div>
<div class="fbottom"><span>© <span data-year>2026</span> ${t("business_name")}</span><span><a href="privacy.html">Privacy policy</a><a href="terms.html">Terms of service</a></span></div>
</div></footer>
<script src="assets/site.js"></script></body></html>`;
}

const shell = (page, title, desc, active, main) => C.head({ title, desc, page, fontsPreload: ["assets/fonts/BricolageGrotesque-Bold.ttf"] }) + header(active) + `<main id="main">${main}</main>` + footer();
const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, "-");

const cards = () => {
  const picks = C.MENU.flatMap((c) => c.items.filter((i) => i.star)).slice(0, 4);
  return picks.map((i, k) => `<a class="card c${k + 1}" href="menu.html#${slug(i.n)}" data-reveal data-delay="${k * 80}"><span class="sticker">£${i.p}</span><div class="pic" data-photo="${esc(i.n)}">${art(i.art || "loaf", P)}</div><h3>${i.n}</h3><p>${i.d}</p></a>`).join("");
};

function home() {
  const words = ["Sourdough", "Croissants", "Cinnamon rolls", "Fruit tarts", "Fresh coffee", "Baguettes"];
  const main = `
<section class="hero"><div class="wrap hero-grid">
<div>
<span class="kicker" data-reveal>${t("city")}'s friendliest bakery</span>
<h1 data-reveal data-delay="60">Fresh.<br><span class="hl">Warm.</span><br>All <span class="hl-t">day.</span></h1>
<p class="lead" data-reveal data-delay="140">${t("tagline")}</p>
<div class="actions" data-reveal data-delay="220"><a class="btn" href="menu.html">See the menu</a><a class="btn btn-butter" href="contact.html#preorder">Pre-order</a></div>
</div>
<div class="stage" data-reveal data-delay="120" data-photo="hero">
<div class="disc d1">${art("croissant", P)}</div>
<div class="disc d2">${art("cupcake", P)}</div>
<div class="disc d3">${art("roll", P)}</div>
<div class="stamp"><div><b>5am</b>first<br>loaves out</div></div>
</div>
</div></section>

<div class="band" aria-hidden="true"><div class="track">${words.concat(words).concat(words).concat(words).map((w) => `<span>${w}</span>`).join("")}</div></div>

<section class="sec"><div class="wrap">
<div class="head"><div data-reveal><span class="kicker">Fresh today</span><h2>Grab it <span class="hl-p">while it's warm</span></h2></div><a class="btn btn-cream" href="menu.html" data-reveal>Full menu →</a></div>
<div class="cards">${cards()}</div>
</div></section>

<section class="sec why"><div class="wrap">
<div class="head"><div data-reveal><span class="kicker" style="background:var(--butter);color:var(--cocoa)">Why you'll love us</span><h2>Made <span class="hl-t">properly</span></h2></div></div>
<div class="tiles">
<div class="tile" data-reveal><b data-count="36" data-suffix="h">36h</b><h3>Slow dough</h3><p>Long fermentation means big flavour and bread that stays fresh for days.</p></div>
<div class="tile" data-reveal data-delay="100"><b data-count="100" data-suffix="%">100%</b><h3>Real ingredients</h3><p>British flour, proper butter, free-range eggs. If you can't pronounce it, it's not in there.</p></div>
<div class="tile" data-reveal data-delay="200"><b>0</b><h3>Shortcuts</h3><p>Every croissant is folded by hand and every loaf is shaped one at a time.</p></div>
</div></div></section>

<section class="sec order"><div class="wrap order-grid">
<div data-reveal><span class="kicker">Skip the queue</span><h2 style="margin:.5rem 0 1rem">Pre-order. <span class="hl">Pick up.</span> Done.</h2><p class="lead">Tell us what you want and when you'll swing by. We'll have it bagged and waiting with your name on it.</p><a class="btn" href="contact.html#preorder" style="margin-top:1rem">Pre-order now</a></div>
<div class="art" data-reveal>${art("slice", P)}</div>
</div></section>

<section class="sec"><div class="wrap">
<div class="head"><div data-reveal><span class="kicker">Kind words</span><h2>People <span class="hl">talk</span></h2></div></div>
<div class="reviews">
<div class="rev" data-reveal><div class="stars">${star.repeat(5)}</div><p>“The croissants are unreal. Crisp outside, soft inside, buttery all the way through.”</p><small>Happy regular</small></div>
<div class="rev" data-reveal data-delay="100"><div class="stars">${star.repeat(5)}</div><p>“Best sourdough I've had. I'm there every Saturday for the 8am loaf.”</p><small>Saturday queue champion</small></div>
<div class="rev" data-reveal data-delay="200"><div class="stars">${star.repeat(5)}</div><p>“Ordered a cake for my mum's birthday. It was gorgeous and tasted even better.”</p><small>Cake customer</small></div>
</div></div></section>

<section class="sec" style="padding-top:0"><div class="wrap"><div class="visit" data-reveal>
<div class="info"><span class="kicker" style="background:var(--butter);color:var(--cocoa)">Come say hi</span><h2>Find us</h2><div class="addr">${t("address_line1")}<br>${t("address_line2")}</div><a class="btn btn-butter" href="${t("maps_url")}" rel="noopener">Get directions</a></div>
<div class="side"><h3>Opening hours</h3>${C.hoursRows()}</div>
</div></div></section>`;
  return shell("home", "Fresh bakery", t("tagline"), "home", main);
}

function menu() {
  const cats = C.MENU.map((c) => `<div class="cat" data-cat="${c.id}" id="${c.id}"><div class="cat-title" data-reveal><h2>${c.name}</h2><p>${c.blurb}</p></div><div class="menu-cards">${c.items.map((i, k) => `<div class="mi" id="${slug(i.n)}" data-reveal data-delay="${k * 60}"><div class="pic">${art(i.art || c.art, P)}</div><div><h3>${i.n}</h3><p>${i.d}</p><div class="tags">${i.tags.map((g) => `<b title="${C.TAGS[g]}">${g}</b>`).join("")}</div></div><span class="pr">£${i.p}</span></div>`).join("")}</div></div>`).join("");
  const main = `<section class="phero"><div class="wrap"><span class="kicker" data-reveal>The menu</span><h1 data-reveal data-delay="60">Eat <span class="hl">this.</span></h1><p class="lead" data-reveal data-delay="120">Baked fresh every morning. When it's gone, it's gone.</p></div><div class="corner" aria-hidden="true">${art("croissant", P)}</div></section>
<section class="wrap" style="padding-bottom:clamp(60px,9vw,120px)"><div class="chips" role="group" aria-label="Filter the menu"><button class="chip" data-filter="all" aria-pressed="true">All</button>${C.MENU.map((c) => `<button class="chip" data-filter="${c.id}" aria-pressed="false">${c.name}</button>`).join("")}</div>${cats}
<div class="note"><b>V</b> vegetarian · <b>VG</b> vegan · <b>GF</b> no gluten ingredients (made in a kitchen that handles gluten). Tell us about allergies when you order. Prices include VAT.</div></section>
<section class="sec order"><div class="wrap order-grid"><div><span class="kicker">Hungry?</span><h2 style="margin:.5rem 0 1rem">Order it <span class="hl">ahead</span></h2><a class="btn" href="contact.html#preorder">Pre-order now</a></div><div class="art">${art("cupcake", P)}</div></div></section>`;
  return shell("menu", "Menu", "Fresh bread, pastries, cakes and coffee, baked every morning.", "menu", main);
}

function about() {
  const main = `<section class="phero"><div class="wrap"><span class="kicker" data-reveal>Our story</span><h1 data-reveal data-delay="60">Hello, we're <span class="hl-t">bakers.</span></h1></div><div class="corner" aria-hidden="true">${art("loaf", P)}</div></section>
<section class="sec" style="padding-top:20px"><div class="wrap"><p class="big" data-reveal>${t("business_name")} started in ${t("year_founded")} with one oven, a jar of starter and a belief that bread should taste like <span class="hl">something.</span></p>
<p class="lead" style="margin-top:2rem" data-reveal>We're still small, still hands-on and still baking before the sun comes up. ${t("owner_name")} opens up most mornings, so come early and say hi.</p></div></section>
<section class="sec why"><div class="wrap"><div class="head"><div data-reveal><span class="kicker" style="background:var(--butter);color:var(--cocoa)">A day here</span><h2>Up <span class="hl-t">before</span> you</h2></div></div>
<div class="day"><div class="slot" data-reveal style="color:var(--cocoa)"><b>4:00</b><h3>Dough</h3><p>Mixing, shaping and the first proves of the day.</p></div><div class="slot" data-reveal data-delay="80" style="color:var(--cocoa)"><b>6:00</b><h3>Ovens</h3><p>Loaves on the stone, croissants in the oven.</p></div><div class="slot" data-reveal data-delay="160" style="color:var(--cocoa)"><b>7:00</b><h3>Doors open</h3><p>Coffee on, trays out, first customers in.</p></div><div class="slot" data-reveal data-delay="240" style="color:var(--cocoa);background:var(--cream)"><b>Sold out</b><h3>Gone</h3><p>When it's gone, it's gone. Pre-order to be sure.</p></div></div></div></section>
<section class="sec"><div class="wrap"><div class="head"><div data-reveal><span class="kicker">The crew</span><h2>Meet the <span class="hl-p">team</span></h2></div></div>
<div class="team"><div class="person" data-reveal><div class="mono">A</div><h3>Head baker</h3><p>Opens up at 4am and tastes everything.</p></div><div class="person" data-reveal data-delay="100"><div class="mono">M</div><h3>Pastry chef</h3><p>Folds every croissant by hand.</p></div><div class="person" data-reveal data-delay="200"><div class="mono">J</div><h3>Front of house</h3><p>Knows your order before you do.</p></div></div></div></section>
<section class="sec order"><div class="wrap order-grid"><div data-reveal><span class="kicker">Visit</span><h2 style="margin:.5rem 0 1rem">Come and <span class="hl">taste it</span></h2><a class="btn" href="contact.html">Find us</a></div><div class="art" data-reveal>${art("coffee", P)}</div></div></section>`;
  return shell("about", "Our story", `The story behind ${t("business_name")}: slow dough, real ingredients and a warm welcome.`, "about", main);
}

function contact() {
  const main = `<section class="phero"><div class="wrap"><span class="kicker" data-reveal>Get in touch</span><h1 data-reveal data-delay="60">Say <span class="hl">hi!</span></h1><p class="lead" data-reveal data-delay="120">Pre-order for tomorrow, ask about a celebration cake or just tell us what you think.</p></div><div class="corner" aria-hidden="true">${art("cupcake", P)}</div></section>
<section class="wrap" style="padding-bottom:clamp(60px,9vw,130px)"><div class="contact-grid">
<div class="cbox" data-reveal><div class="cinfo"><small>Visit</small><a href="${t("maps_url")}" rel="noopener">${t("address_line1")}, ${t("address_line2")}</a></div><div class="cinfo"><small>Call</small><a href="tel:${t("phone_href")}">${t("phone")}</a></div><div class="cinfo"><small>Email</small><a href="mailto:${t("email")}">${t("email")}</a></div><div class="cinfo" style="background:var(--cream)"><small>Opening hours</small>${C.hoursRows()}</div></div>
<div class="formcard" id="preorder" data-reveal data-delay="100"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="order">Pre-order</button><button role="tab" aria-selected="false" data-tab="contact">Send a message</button></div>
<div class="panel" data-panel="order">${C.form("order", { submit: "Place pre-order" })}</div><div class="panel" data-panel="contact" hidden>${C.form("contact", { submit: "Send message" })}</div></div>
</div></section>
<script>(function(){var tabs=[].slice.call(document.querySelectorAll("[data-tab]")),ps=[].slice.call(document.querySelectorAll("[data-panel]"));function show(k){tabs.forEach(function(t){t.setAttribute("aria-selected",t.getAttribute("data-tab")===k?"true":"false")});ps.forEach(function(p){p.hidden=p.getAttribute("data-panel")!==k})}tabs.forEach(function(t){t.addEventListener("click",function(){show(t.getAttribute("data-tab"))})});if(location.hash==="#message")show("contact")})();</script>`;
  return shell("contact", "Contact and pre-orders", `Pre-order, ask a question or find ${t("business_name")}.`, "contact", main);
}

function legalPage(kind) {
  const L = C.legal(kind);
  return shell(kind, L.title, L.title, "", `<section class="phero"><div class="wrap legal"><span class="kicker">Legal</span><h1 style="font-size:clamp(2.6rem,8vw,5rem)">${L.title}</h1><div style="margin-top:2rem">${L.body}</div></div></section>`);
}

function build() {
  return {
    name: "bold",
    themeColor: "#FFD23F",
    fonts: FONTS,
    files: {
      "index.html": home(), "menu.html": menu(), "about.html": about(), "contact.html": contact(),
      "privacy.html": legalPage("privacy"), "terms.html": legalPage("terms"),
      "assets/style.css": CSS, "assets/site.js": C.SITE_JS,
    },
  };
}

module.exports = { build };
