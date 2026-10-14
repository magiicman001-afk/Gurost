"use strict";
/**
 * urgent (clinic, real 3D): a bold red-and-white same-day emergency layout. A live open or closed banner (from the visitor's clock
 * and the opening hours), a turnable 3D medical cross and a "is it an emergency?" checklist that tells the visitor to call now or
 * book the next slot. Fonts: Big Shoulders + Work Sans (SIL OFL). Two pages.
 */
const R = require("./rest-kit");
const FONTS = [["BigShoulders-Bold.ttf", "BigShoulders-Bold.ttf"], ["WorkSans-Regular.ttf", "WorkSans-Regular.ttf"], ["WorkSans-Bold.ttf", "WorkSans-Bold.ttf"], ["BigShoulders-OFL.txt", "OFL-BigShoulders.txt"], ["WorkSans-OFL.txt", "OFL-WorkSans.txt"]];
const css = `
@font-face{font-family:"Big Shoulders";src:url(fonts/BigShoulders-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Regular.ttf) format("truetype");font-weight:400;font-display:swap}
@font-face{font-family:"Work Sans";src:url(fonts/WorkSans-Bold.ttf) format("truetype");font-weight:700;font-display:swap}
h1,h2,h3{font-family:var(--display);font-weight:700;text-transform:uppercase;letter-spacing:.005em}h1{font-size:clamp(3.2rem,9vw,8rem);line-height:.9}h2{font-size:clamp(2.4rem,5.4vw,4.4rem);line-height:.95}h3{font-size:1.6rem}
h1 em,h2 em{font-style:normal;color:var(--accent)}.eyebrow{color:var(--accent);letter-spacing:.16em}
.opnow{box-sizing:border-box;max-width:100%;overflow:hidden;position:fixed;top:0;left:0;right:0;z-index:60;display:flex;gap:.8rem;align-items:center;justify-content:center;flex-wrap:wrap;background:var(--ink);color:#fff;padding:.55rem var(--gut);font:700 .9rem var(--sans);text-align:center}.opnow i{width:.7rem;height:.7rem;border-radius:50%;background:#7A8793;flex:none}.opnow.open i{background:#3FD17F;box-shadow:0 0 0 4px rgba(63,209,127,.3)}.opnow a{color:#fff;text-decoration:underline}
.site-header{top:var(--lh,2.4rem)!important}.hero{padding:clamp(160px,16vw,200px) 0 clamp(30px,5vw,60px)}.hero .wrap{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:20px;align-items:center}.hero h1{margin:1rem 0 1.2rem}.cta-row{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:1.6rem}.hero .gl3d{max-width:400px;justify-self:center;filter:drop-shadow(0 24px 26px rgba(150,20,20,.35))}.call{font:700 clamp(1.6rem,3.4vw,2.4rem) var(--display);letter-spacing:.02em}
@media(max-width:820px){.hero .wrap{grid-template-columns:minmax(0,1fr)}}
.tr{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(18px,4vw,56px);align-items:start;border:3px solid var(--ink);border-radius:24px;padding:clamp(20px,4vw,50px);background:var(--surface)}.tr ul{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}.tr label{display:flex;gap:.8rem;align-items:center;border:2px solid var(--line);border-radius:14px;padding:.9rem 1rem;cursor:pointer;font-weight:700;background:#fff;transition:border-color .2s,background .2s}.tr label:has(input:checked){border-color:var(--accent);background:#FFECEA}.tr input{width:1.3rem;height:1.3rem;accent-color:var(--accent);flex:none}
.tr .ans{grid-column:1/-1;border-radius:18px;padding:1.2rem 1.4rem;display:grid;gap:.5rem}.tr .ans.red{background:var(--accent);color:#fff}.tr .ans.ok{background:#E7F6EC;color:#14502B}.tr .ans h3{margin:0;color:inherit}.tr .ans p{margin:0}.tr .ans .btn{justify-self:start}.tr .ans.red .btn{background:#fff;color:var(--accent);border-color:#fff}
@media(max-width:820px){.tr{grid-template-columns:minmax(0,1fr)}}
.sp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sp div{background:var(--ink);color:#fff;border-radius:22px;padding:1.5rem}.sp img{width:72px;height:72px;object-fit:contain;float:right}.sp .n{font:700 3.4rem/1 var(--display);color:#FF8A7E}.sp h3{color:#fff;margin:.4rem 0}.sp p{margin:0;color:#D6D0D0}@media(max-width:820px){.sp{grid-template-columns:minmax(0,1fr)}}
.sv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,24px)}.sv a{display:grid;grid-template-columns:100px minmax(0,1fr);gap:1rem;align-items:center;text-decoration:none;color:inherit;border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:1rem}.sv img{width:100px;height:100px;object-fit:contain}.sv p{margin:.2rem 0 0;color:var(--muted);font-size:.92rem}@media(max-width:760px){.sv{grid-template-columns:minmax(0,1fr)}}
`;
const JS = `
(function () {
  var b = document.querySelector("[data-hours]"); if (b) {
    document.documentElement.style.setProperty("--lh", b.offsetHeight + "px");
    var H = JSON.parse(b.getAttribute("data-hours")), n = new Date(), d = n.getDay(), h = n.getHours() + n.getMinutes() / 60, today = H[d], txt, open = false;
    function t(x) { var hr = Math.floor(x), m = Math.round((x - hr) * 60); return (hr % 12 || 12) + (m ? ":" + ("0" + m).slice(-2) : "") + (hr >= 12 ? "pm" : "am"); }
    if (today && h >= today[0] && h < today[1]) { open = true; txt = "Open now, until " + t(today[1]); }
    else { var k = 1, nd = null; if (today && h < today[0]) { nd = today; txt = "Closed, opens today at " + t(today[0]); } else { for (; k <= 7; k++) { nd = H[(d + k) % 7]; if (nd) break; } txt = "Closed, opens " + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][(d + k) % 7] + " at " + t(nd[0]); } }
    b.classList.toggle("open", open); b.querySelector("[data-st]").textContent = txt; document.documentElement.style.setProperty("--lh", b.offsetHeight + "px"); window.addEventListener("resize", function () { document.documentElement.style.setProperty("--lh", b.offsetHeight + "px"); });
  }
  var tr = document.querySelector("[data-triage]"); if (!tr) return; var ans = tr.querySelector(".ans");
  function u() { var any = tr.querySelectorAll("input:checked").length > 0; ans.className = "ans " + (any ? "red" : "ok"); ans.querySelector("h3").textContent = any ? "Call us now" : "Book the next free slot"; ans.querySelector("p").textContent = any ? "These can be urgent. Ring the number above straight away. If you cannot breathe or swallow, call 999." : "It sounds like it can wait a little, but do not leave pain too long. Send us a request and we will find you the earliest time."; ans.querySelector(".btn span").textContent = any ? "Call {{phone}}" : "Request a slot"; ans.querySelector(".btn").setAttribute("href", any ? "tel:{{phone_href}}" : "#order"); }
  tr.addEventListener("change", u); u();
})();
`;
module.exports = R.make({
  name: "urgent", themeColor: "#FFFFFF", fonts: FONTS, preload: ["assets/fonts/BigShoulders-Bold.ttf"], js: JS,
  vars: { bg: "#FFFFFF", surface: "#F7F4F2", ink: "#1A1214", muted: "#5F5456", line: "rgba(26,18,20,.16)", accent: "#D32F2F", onaccent: "#FFFFFF", c1: "#D32F2F", c2: "#FF8A7E", c3: "#8E1B1B", rad: "12px", display: '"Big Shoulders",Impact,sans-serif', sans: '"Work Sans",system-ui,sans-serif', header: "rgba(255,255,255,.94)" },
  css,
  home(pack, { B, K, img, model3d }) {
    const X = pack.copy.atelier, t = B.t;
    const hours = JSON.stringify({ 0: null, 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [9, 14] });
    const sym = ["Swelling in the face or jaw", "A knocked-out or broken tooth", "Bleeding that will not stop", "Severe pain that keeps you awake", "A fever with a toothache"].map((s) => `<li><label><input type="checkbox"> ${s}</label></li>`).join("");
    const steps = [["1", "Call us", "chair", "Ring and a real person answers. Tell us what has happened."], ["2", "Seen fast", "tooth", "Most emergency patients are in the chair within the hour."], ["3", "Pain eased", "smile", "We relieve the pain first, then explain your options and the price."]].map(([n, h, a, p]) => `<div data-reveal>${img(a, h, { w: 120, h: 120, hint: "a friendly cartoon " + a })}<span class="n">${n}</span><h3>${h}</h3><p>${p}</p></div>`).join("");
    const sv = pack.cats.filter((c) => ["urgent", "treat"].includes(c.id)).map((c) => `<a href="menu.html#${c.id}" data-reveal>${img(c.art, c.name, { w: 220, h: 220, hint: B.hintOf(pack, c) })}<div><h3>${c.name}</h3><p>${c.blurb}</p></div></a>`).join("");
    return `<div class="opnow" data-hours='${hours}'><i></i><span data-st>Check our opening hours</span><span>&middot; Emergency line <a href="tel:{{phone_href}}">{{phone}}</a></span></div>
<section class="hero"><div class="wrap"><div><span class="eyebrow">${X.heroEyebrow}</span><h1>Toothache? <em>Seen today.</em></h1><p class="lead">${t("tagline")}</p><div class="cta-row"><a class="btn btn-primary" href="tel:{{phone_href}}"><span>Call {{phone}}</span></a><a class="btn" href="#order"><span>${X.cta1}</span></a></div></div>${model3d(pack, "cross", "shield", "A medical cross you can turn", { c1: "#D32F2F", c2: "#FF8A7E", lum: 1.2, hint: "a health shield" })}</div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="tr" data-triage data-reveal><div><span class="eyebrow">Is it an emergency?</span><h2 style="margin-top:.8rem">Tick <em>anything</em> that fits</h2><p class="lead">Not sure how urgent it is? This quick check points you the right way.</p></div><ul>${sym}</ul><div class="ans ok"><h3></h3><p></p><a class="btn btn-primary" href="#order"><span></span></a></div></div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sp">${steps}</div></div></section>
<section class="sec" style="padding-top:0"><div class="wrap"><div class="sh" data-reveal><div><span class="eyebrow">${X.collection[0]}</span><h2 style="margin-top:.8rem">Care <em>when it counts</em></h2></div><a class="btn" href="menu.html"><span>${X.collection[2]}</span></a></div><div class="sv">${sv}</div></div></section>`;
  },
});
