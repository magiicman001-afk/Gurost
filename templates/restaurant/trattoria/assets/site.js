(function () {
  "use strict";
  var d = document, w = window, reduce = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  // header: stuck state and the phone menu
  var header = $(".site-header"), toggle = $("[data-menu-toggle]"), menu = $("[data-menu]");
  function onScroll() { if (header) header.classList.toggle("is-stuck", w.scrollY > 12); }
  onScroll(); w.addEventListener("scroll", onScroll, { passive: true });
  if (toggle && menu) {
    var setMenu = function (open) { toggle.setAttribute("aria-expanded", open ? "true" : "false"); d.documentElement.classList.toggle("menu-open", open); };
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  // things fade up as they arrive
  var reveal = $$("[data-reveal]");
  if (reduce || !("IntersectionObserver" in w)) reveal.forEach(function (e) { e.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (list) {
      list.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveal.forEach(function (e, i) { e.style.transitionDelay = (e.getAttribute("data-delay") || 0) + "ms"; io.observe(e); });
  }

  // numbers count up once
  var counters = $$("[data-count]");
  function run(el) {
    var end = parseFloat(el.getAttribute("data-count")), dur = 1300, t0 = null, suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = end + suffix; return; }
    (function step(ts) { t0 = t0 || ts; var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e) + suffix; if (p < 1) w.requestAnimationFrame(step); })(w.performance.now());
  }
  if ("IntersectionObserver" in w && counters.length) {
    var co = new IntersectionObserver(function (l) { l.forEach(function (en) { if (en.isIntersecting) { run(en.target); co.unobserve(en.target); } }); }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else counters.forEach(run);

  // gentle parallax on marked pieces
  var par = $$("[data-parallax]");
  if (par.length && !reduce) {
    var tick = false;
    var upd = function () { tick = false; var h = w.innerHeight; par.forEach(function (e) { var r = e.getBoundingClientRect(); if (r.bottom < -50 || r.top > h + 50) return; var k = parseFloat(e.getAttribute("data-parallax")) || 0.08; e.style.transform = "translate3d(0," + ((r.top + r.height / 2 - h / 2) * -k).toFixed(1) + "px,0)"; }); };
    w.addEventListener("scroll", function () { if (!tick) { tick = true; w.requestAnimationFrame(upd); } }, { passive: true }); upd();
  }

  // today's opening hours
  var day = new Date().getDay();
  $$("table.hours tr").forEach(function (tr) { if ((tr.getAttribute("data-days") || "").split(",").indexOf(String(day)) > -1) tr.classList.add("is-today"); });

  // menu filter
  var chips = $$("[data-filter]");
  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.getAttribute("data-filter");
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === c ? "true" : "false"); });
      $$("[data-cat]").forEach(function (s) { s.hidden = !(f === "all" || s.getAttribute("data-cat") === f); });
    });
  });

  // forms: send to the Gurost form handler (JSON), or show a friendly demo message when no endpoint is set
  $$("form[data-form]").forEach(function (f) {
    var status = $(".f-status", f), btn = $("button[type=submit]", f);
    var say = function (msg, ok) { status.textContent = msg; status.className = "f-status " + (ok ? "ok" : "bad"); };
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = {}, hp = "";
      $$("input,textarea,select", f).forEach(function (i) { if (!i.name) return; if (i.name === "website") { hp = i.value; return; } if (i.value && String(i.value).trim()) fields[i.name] = String(i.value).trim(); });
      var need = $$("[required]", f).filter(function (i) { return !String(i.value || "").trim(); });
      if (need.length) { say("Please fill in the highlighted fields.", false); need[0].focus(); return; }
      if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email)) { say("Please check your email address.", false); return; }
      var url = f.getAttribute("data-endpoint") || "";
      btn.disabled = true; say("Sending…", true);
      var done = function () { f.reset(); btn.disabled = false; say(f.getAttribute("data-form-kind") === "order" ? "Thank you. Your pre-order is in and we will confirm by email." : "Thank you. We have your message and will reply soon.", true); };
      if (!/^https:\/\//.test(url)) { w.setTimeout(done, 500); return; }
      w.fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: f.getAttribute("data-form-kind"), fields: fields, website: hp }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Something went wrong."); done(); }); })
        .catch(function (err) { btn.disabled = false; say((err && err.message) || "Could not send. Please call us instead.", false); });
    });
  });
  // a big wordmark that always fits its line, whatever the business is called
  var fits = $$("[data-fit]");
  function fit() { fits.forEach(function (box) { var span = box.firstElementChild; if (!span) return; box.style.fontSize = "100px"; var k = box.clientWidth / Math.max(1, span.offsetWidth); box.style.fontSize = Math.max(26, Math.min(220, 100 * k * 0.985)).toFixed(1) + "px"; }); }
  if (fits.length) { fit(); w.addEventListener("resize", fit); if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit); }
  var td = $("[data-today]"); if (td) { try { td.textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch (e) {} }
  var y = $("[data-year]"); if (y) y.textContent = new Date().getFullYear();
})();

(function () {
  "use strict";
  var d = document, w = window, reduce = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  $$("[data-legal]").forEach(function (b) { b.addEventListener("click", function () { var dlg = $("#legal-" + b.getAttribute("data-legal")); if (dlg && dlg.showModal) dlg.showModal(); }); });
  $$("dialog.legal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.hasAttribute("data-close")) dlg.close(); });
  });
  $$("video[data-hero-video]").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.pause(); return; }
    var p = v.play && v.play(); if (p && p.catch) p.catch(function () {});
    if ("IntersectionObserver" in w) new IntersectionObserver(function (l) { l.forEach(function (en) { if (en.isIntersecting) { var q = v.play(); if (q && q.catch) q.catch(function () {}); } else v.pause(); }); }, { threshold: 0.05 }).observe(v);
  });
  $$("[data-rail]").forEach(function (rail) {
    var box = rail.parentNode, step = function (dir) { rail.scrollBy({ left: dir * Math.max(280, rail.clientWidth * 0.7), behavior: reduce ? "auto" : "smooth" }); };
    var prev = $("[data-rail-prev]", box), next = $("[data-rail-next]", box);
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
    var down = false, sx = 0, sl = 0;
    rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add("drag"); });
    w.addEventListener("pointerup", function () { down = false; rail.classList.remove("drag"); });
    w.addEventListener("pointermove", function (e) { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
  });
  if (!reduce && w.matchMedia("(hover: hover)").matches) {
    $$("[data-tilt]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; el.style.transform = "perspective(900px) rotateY(" + (x * 8).toFixed(2) + "deg) rotateX(" + (-y * 8).toFixed(2) + "deg) translateZ(0)"; });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }
  // poster headline: every line as wide as the page, whatever the words are
  var fl = $$("[data-fitlines]");
  function fitLines() { fl.forEach(function (h) { var spans = $$("span", h), box = h.parentNode, cs = w.getComputedStyle(box), inner = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); h.style.fontSize = "100px"; var widest = 1; spans.forEach(function (s) { widest = Math.max(widest, s.offsetWidth); }); h.style.fontSize = Math.min(520, 100 * inner / widest * 0.99).toFixed(1) + "px"; }); }
  if (fl.length) { fitLines(); w.addEventListener("resize", fitLines); if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitLines); }
  var pv = $("[data-preview-img]");
  if (pv) $$("[data-preview]").forEach(function (row) {
    var set = function () { pv.src = row.getAttribute("data-preview"); pv.parentNode.classList.add("on"); $$("[data-preview]").forEach(function (x) { x.classList.toggle("act", x === row); }); };
    row.addEventListener("mouseenter", set); row.addEventListener("focusin", set);
  });
})();


(function () {
  "use strict";
  var M = {"dumbbell":0,"kettlebell":1,"wineglass":2,"cloche":3,"coupe":4,"pizza":5,"stopwatch":6,"bulb":7,"house":8,"wrench":9,"key":10,"tower":11,"tooth":12,"cross":13}, CAM = {"dumbbell":[0.3,-0.2,5.4],"kettlebell":[0.28,-0.08,5],"wineglass":[0.2,0.02,4.7],"cloche":[0.28,-0.3,5.5],"coupe":[0.26,-0.1,4.6],"pizza":[0.78,-0.9,4.8],"stopwatch":[0.2,-0.1,5],"bulb":[0.16,-0.05,4.5],"house":[0.42,-0.25,5],"wrench":[0.2,0,4.5],"key":[0.18,0,4.6],"tower":[0.3,0.1,6],"tooth":[0.2,-0.1,4.8],"cross":[0.15,0,4.6]};
  var FRAG = "\nprecision highp float;\nuniform vec2 uRes; uniform float uYaw, uPitch, uTy, uDist, uTime, uLum;\nuniform vec3 uC1, uC2, uC3;\nout vec4 oc;\n\nfloat sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }\nfloat sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }\nfloat sdCylY(vec3 p, float h, float r, float rd){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r-rd,h-rd); return min(max(d.x,d.y),0.)+length(max(d,0.))-rd; }\nfloat sdEll(vec3 p, vec3 r){ float k0=length(p/r), k1=length(p/(r*r)); return k0*(k0-1.)/k1; }\nfloat smin(float a, float b, float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }\nvec2 U(vec2 a, vec2 b){ return a.x<b.x?a:b; }\nmat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }\nfloat sdRB(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }\nfloat ex(float d, float z, float h){ vec2 w=vec2(d,abs(z)-h); return min(max(w.x,w.y),0.)+length(max(w,0.)); }\nfloat hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }\n\n/* materials: 0 steel, 1 paint (c1), 2 glass, 3 liquid (c2), 4 gold, 5 ceramic, 6 crust, 7 cheese, 8 herb, 9 rubber */\nconst vec2 P_W[5]=vec2[5](vec2(0.550,-1.000),vec2(0.470,-0.960),vec2(0.070,-0.900),vec2(0.040,-0.620),vec2(0.040,-0.120));const vec2 P_C[5]=vec2[5](vec2(0.550,-1.000),vec2(0.470,-0.960),vec2(0.070,-0.900),vec2(0.035,-0.600),vec2(0.035,-0.040));float bwR(float t){ float k=min(1.,t*1.35); return .05+.6*sin(k*1.5707963)*(1.-.2*pow(max(0.,(t-.55)/.45),1.5)); }float bcR(float t){ return .04+pow(sin(t*1.5708),.72); }float latheW(vec2 q){ float d=1e5; for(int i=0;i<4;i++) d=min(d,sdSeg(q,P_W[i],P_W[i+1])); float t=clamp((q.y+.1)/1.1,0.,1.), R=bwR(t), s=(bwR(min(t+.02,1.))-bwR(max(t-.02,0.)))/(.04*1.1); float e=abs(q.x-R)/sqrt(1.+s*s); d=min(d,length(vec2(e,max(max(-.1-q.y,q.y-1.),0.)))); return d-.02; }float latheC(vec2 q){ float d=1e5; for(int i=0;i<4;i++) d=min(d,sdSeg(q,P_C[i],P_C[i+1])); float t=clamp((q.y+.04)/.72,0.,1.), R=bcR(t), s=(bcR(min(t+.02,1.))-bcR(max(t-.02,0.)))/(.04*.72); float e=abs(q.x-R)/sqrt(1.+s*s); d=min(d,length(vec2(e,max(max(-.04-q.y,q.y-.68),0.)))); return d-.02; }\n\nvec2 map(vec3 p){\n#if MODEL==0\n  p.y+=.2; p.xz=rot(.5)*p.xz; vec3 q=p;\n  float bar=sdCap(q,vec3(-1.7,0,0),vec3(1.7,0,0),.12)-.004*sin(q.x*70.)*step(abs(q.x),1.1);\n  vec2 r=vec2(bar,0.);\n  for(int s=-1;s<=1;s+=2){\n    float fs=float(s); vec3 w=vec3(q.y,q.x-fs*1.02,q.z).yxz; w=vec3(q.x-fs*1.0,q.y,q.z);\n    vec3 c=vec3(w.y,w.x,w.z); // cylinder axis along x\n    r=U(r,vec2(sdCylY(c,.17,.8,.06),1.));\n    vec3 c2=vec3(q.y,q.x-fs*1.34,q.z);\n    r=U(r,vec2(sdCylY(c2,.1,.64,.05),9.));\n    vec3 c3=vec3(q.y,q.x-fs*.7,q.z);\n    r=U(r,vec2(sdCylY(c3,.07,.2,.02),0.));\n  }\n  return r;\n#elif MODEL==1\n  vec3 q=p; q.y+=.15;\n  float body=max(sdEll(q,vec3(.9,.86,.9)),-(q.y+.82));\n  vec3 h=p-vec3(0,.62,0); float arch=length(vec2(length(h.xy)-.5,h.z))-.115; arch=max(arch,-h.y+.0);\n  float l1=sdCap(p,vec3(.5,.4,0),vec3(.5,.62,0),.115), l2=sdCap(p,vec3(-.5,.4,0),vec3(-.5,.62,0),.115);\n  float d=smin(body,min(arch,min(l1,l2)),.09);\n  return vec2(d,1.);\n#elif MODEL==2\n  vec2 q=vec2(length(p.xz),p.y);\n  float g=latheW(q);\n  vec3 lp=p-vec3(0,.3,0); float liq=sdEll(lp,vec3(.58,.42,.58)); liq=max(liq,p.y-.46);\n  return U(vec2(g,2.),vec2(liq,3.));\n#elif MODEL==3\n  vec3 q=p+vec3(0,.9,0); float sc=1.35;\n  float dome=(length(vec3(q.x,q.y/sc,q.z))-1.1)*.88; dome=abs(dome)-.03; dome=max(dome,-q.y+.02);\n  vec2 r=vec2(dome,0.);\n  r=U(r,vec2(sdCylY(p-vec3(0,-.93,0),.045,1.42,.03),5.));\n  r=U(r,vec2(length(vec2(length(q.xz)-1.1,q.y))-.04,0.));\n  r=U(r,vec2(length(p-vec3(0,.66,0))-.11,4.));\n  r=U(r,vec2(sdCylY(p-vec3(0,.57,0),.05,.05,.01),4.));\n  return r;\n#elif MODEL==4\n  vec2 q=vec2(length(p.xz),p.y);\n  float g=latheC(q);\n  vec3 lp=p-vec3(0,.4,0); float liq=sdEll(lp,vec3(.95,.2,.95)); liq=max(liq,p.y-.46);\n  vec2 r=U(vec2(g,2.),vec2(liq,3.));\n  r=U(r,vec2(sdCap(p,vec3(-.35,.38,.1),vec3(.38,.9,-.1),.014),0.));\n  r=U(r,vec2(length(p-vec3(.0,.58,.0))-.13,8.));\n  return r;\n#elif MODEL==5\n  vec3 q=p-vec3(0,-.92,0);\n  float base=sdCylY(q,.05,1.1,.04);\n  float rim=length(vec2(length(q.xz)-1.06,q.y-.02))-.1;\n  vec2 r=vec2(smin(base,rim,.06),6.);\n  r=U(r,vec2(sdCylY(q-vec3(0,.052,0),.012,.98,.01),7.));\n  for(int i=0;i<7;i++){ float fi=float(i); vec2 c=vec2(cos(fi*2.4),sin(fi*2.4))*(.2+.62*fract(fi*.37+.2)); r=U(r,vec2(sdCylY(q-vec3(c.x,.085,c.y),.03,.2,.012),1.)); }\n  for(int i=0;i<5;i++){ float fi=float(i); vec2 c=vec2(cos(fi*1.7+1.),sin(fi*1.7+1.))*(.3+.5*fract(fi*.53)); vec3 e=q-vec3(c.x,.07,c.y); e.xz=rot(fi*1.3)*e.xz; r=U(r,vec2(sdEll(e,vec3(.16,.025,.08)),8.)); }\n  return r;\n#elif MODEL==7\n  float gl=length(p-vec3(0,.32,0))-.82; float nk=sdCylY(p-vec3(0,-.3,0),.34,.3,.12); float sh=abs(smin(gl,nk,.35))-.026; sh=max(sh,-(p.y+.62));\n  vec2 r=vec2(sh,2.);\n  float sc=sdCylY(p-vec3(0,-.84,0),.24,.33-.012*sin(p.y*44.),.03); r=U(r,vec2(sc,0.));\n  r=U(r,vec2(sdCylY(p-vec3(0,-1.1,0),.07,.2,.04),4.));\n  r=U(r,vec2(sdCap(p,vec3(-.1,-.5,0),vec3(-.1,.12,0),.012),0.)); r=U(r,vec2(sdCap(p,vec3(.1,-.5,0),vec3(.1,.12,0),.012),0.));\n  r=U(r,vec2(sdCap(p,vec3(-.1,.14,0),vec3(.1,.14,0),.05+.008*sin(p.x*90.)),10.)); r=U(r,vec2(length(p-vec3(0,.3,0))-.3,10.));\n  return r;\n#elif MODEL==8\n  vec2 r=vec2(sdRB(p-vec3(0,-.35,0),vec3(.85,.45,.65))-.03,5.);\n  vec2 hp=vec2(abs(p.x),p.y); float rf=max(max(dot(hp,vec2(.6,.8))-.68-.05,.1-p.y),abs(p.z)-.82); r=U(r,vec2(rf,1.));\n  r=U(r,vec2(sdRB(p-vec3(.55,.6,-.2),vec3(.1,.3,.1))-.01,5.));\n  r=U(r,vec2(sdRB(p-vec3(0,-.55,.66),vec3(.18,.34,.03))-.01,3.)); r=U(r,vec2(length(p-vec3(.1,-.55,.71))-.025,4.));\n  for(int i=-1;i<=1;i+=2){ vec3 w=p-vec3(float(i)*.5,-.22,.66); r=U(r,vec2(sdRB(w,vec3(.2,.18,.025))-.005,9.)); r=U(r,vec2(min(sdRB(w,vec3(.2,.012,.04)),sdRB(w,vec3(.012,.18,.04))),5.)); }\n  r=U(r,vec2(sdCylY(p-vec3(0,-.85,0),.05,1.55,.03),8.));\n  return r;\n#elif MODEL==9\n  p.xy=rot(.55)*p.xy;\n  vec2 r=vec2(sdRB(p-vec3(0,-.05,0),vec3(.085,.8,.045))-.02,0.);\n  r=U(r,vec2(sdRB(p-vec3(0,-.55,0),vec3(.12,.34,.07))-.03,1.));\n  float dd=length(p.xy-vec2(0,.95))-.42; dd=max(dd,-sdRB(vec3(p.xy-vec2(0,1.25),0.),vec3(.17,.32,1.)));\n  r=U(r,vec2(ex(dd,p.z,.055)-.012,0.));\n  float he=length(p.xy-vec2(0,-1.0)); r=U(r,vec2(ex(max(he-.22,-(he-.09)),p.z,.05)-.01,0.));\n  return r;\n#elif MODEL==10\n  p.xy=rot(.5)*p.xy;\n  float rg=length(vec2(length(p.xy-vec2(0,.92))-.36,p.z))-.085; vec2 r=vec2(rg,4.);\n  r=U(r,vec2(length(vec2(length(p.xy-vec2(0,.92))-.17,p.z))-.035,4.));\n  r=U(r,vec2(sdCap(p,vec3(0,.55,0),vec3(0,-1.05,0),.075),4.));\n  r=U(r,vec2(sdRB(p-vec3(.15,-.78,0),vec3(.11,.07,.04))-.01,4.)); r=U(r,vec2(sdRB(p-vec3(.12,-.97,0),vec3(.09,.06,.04))-.01,4.)); r=U(r,vec2(sdRB(p-vec3(.13,-.56,0),vec3(.08,.05,.04))-.01,4.));\n  r=U(r,vec2(sdRB(p-vec3(0,.2,0),vec3(.095,.05,.095))-.01,1.));\n  return r;\n#elif MODEL==11\n  vec2 r=vec2(sdRB(p-vec3(0,.15,0),vec3(.5,1.0,.5))-.015,5.);\n  r=U(r,vec2(sdRB(p-vec3(.1,-.88,.1),vec3(.85,.28,.6))-.015,5.));\n  r=U(r,vec2(sdRB(p-vec3(.1,-.58,.1),vec3(.88,.03,.63)),1.));\n  r=U(r,vec2(sdCap(p,vec3(0,1.15,0),vec3(0,1.6,0),.02),0.));\n  r=U(r,vec2(sdRB(p-vec3(0,1.17,0),vec3(.56,.04,.56)),1.));\n  vec3 wz=vec3(mod(p.x+.25,.25)-.125,mod(p.y+.1,.27)-.135,p.z-.5); float wl=sdRB(wz,vec3(.07,.085,.02))-.004; wl=max(wl,max(abs(p.x)-.44,abs(p.y-.1)-.9));\n  vec3 wx=vec3(mod(p.z+.25,.25)-.125,mod(p.y+.1,.27)-.135,p.x-.5); float wl2=sdRB(wx,vec3(.07,.085,.02))-.004; wl2=max(wl2,max(abs(p.z)-.44,abs(p.y-.1)-.9));\n  r=U(r,vec2(min(wl,wl2),9.));\n  return r;\n#elif MODEL==12\n  float cr=sdEll(p-vec3(0,.42,0),vec3(.76,.52,.64)); cr=smin(cr,sdRB(p-vec3(0,.28,0),vec3(.4,.3,.36))-.2,.3);\n  cr=smin(cr,-sdEll(p-vec3(0,1.12,0),vec3(.2,.24,1.2)),-.07); cr=max(cr,-(length(p-vec3(.46,.98,.1))-.16));\n  float tt=clamp((.15-p.y)/1.0,0.,1.), rr=mix(.25,.09,tt);\n  float r1=sdCap(p,vec3(-.36,.15,0),vec3(-.24,-.95,.02),rr), r2=sdCap(p,vec3(.36,.15,0),vec3(.24,-.95,-.02),rr);\n  return vec2(smin(cr,min(r1,r2),.2),5.);\n#elif MODEL==13\n  vec2 r=vec2(sdRB(p,vec3(.24,.78,.1))-.12,1.);\n  r=U(r,vec2(sdRB(p,vec3(.78,.24,.1))-.12,1.));\n  float bar=min(sdRB(p-vec3(0,0,.17),vec3(.1,.55,.01))-.012,sdRB(p-vec3(0,0,.17),vec3(.55,.1,.01))-.012);\n  r=U(r,vec2(bar,5.));\n  return r;\n#else\n  vec3 q=p+vec3(0,.1,0);\n  float body=sdCylY(q.xzy,.14,.9,.05);\n  float bez=length(vec2(length(q.xy)-.88,q.z-.06))-.07; bez=min(bez,length(vec2(length(q.xy)-.88,q.z+.06))-.07);\n  vec2 r=vec2(body,1.);\n  r=U(r,vec2(bez,0.));\n  r=U(r,vec2(sdCylY(q.xzy-vec3(0,.135,0),.012,.8,.005),5.));\n  r=U(r,vec2(sdCylY(vec3(q.x,q.y-1.02,q.z),.08,.1,.02),0.));\n  r=U(r,vec2(sdCylY(vec3(q.x,q.y-.95,q.z),.05,.16,.02),4.));\n  for(int i=0;i<12;i++){ float a=float(i)*.5236; vec2 c=vec2(sin(a),cos(a))*.68; r=U(r,vec2(length(q-vec3(c,.15))-(mod(float(i),3.)<.5?.045:.028),9.)); }\n  r=U(r,vec2(sdCap(q,vec3(0,0,.16),vec3(0,.5,.16),.035),9.));\n  r=U(r,vec2(sdCap(q,vec3(0,0,.17),vec3(.34,-.2,.17),.026),1.));\n  r=U(r,vec2(length(q-vec3(0,0,.17))-.065,9.));\n  return r;\n#endif\n}\n\nvec3 nor(vec3 p){ vec2 e=vec2(.0012,-.0012); return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x); }\nvec3 env(vec3 d){\n  vec3 c=mix(vec3(.16,.12,.1),vec3(.9,.94,1.),smoothstep(-.3,.9,d.y));\n  c+=vec3(1.,.96,.9)*3.2*smoothstep(.9,.985,dot(d,normalize(vec3(.5,.75,.4))));\n  c+=mix(uC2,vec3(1.),.3)*1.7*smoothstep(.9,.98,dot(d,normalize(vec3(-.8,.25,-.4))));\n  c+=vec3(.55,.72,1.)*1.3*smoothstep(.88,.97,dot(d,normalize(vec3(-.6,.5,.7))));\n  float az=atan(d.z,d.x); c+=vec3(1.,.97,.93)*.9*smoothstep(.62,.92,sin(az*3.+.6))*smoothstep(.0,.35,d.y)*smoothstep(1.,.5,d.y);\n  c-=vec3(.08)*smoothstep(.5,.9,sin(az*2.+2.))*smoothstep(.3,-.2,d.y);\n  return max(c,0.);\n}\nfloat shadow(vec3 ro, vec3 rd){ float res=1., t=.05; for(int i=0;i<26;i++){ vec2 h=map(ro+rd*t); float d=h.y==2.?.3:h.x; res=min(res,9.*d/t); t+=clamp(d,.03,.35); if(res<.002||t>5.) break; } return clamp(res,0.,1.); }\nfloat ao(vec3 p, vec3 n){ float o=0., s=1.; for(int i=1;i<=4;i++){ float h=.06*float(i); o+=(h-map(p+n*h).x)*s; s*=.62; } return clamp(1.-1.5*o,0.,1.); }\nvec2 march(vec3 ro, vec3 rd, float t0, float t1){ float t=t0; for(int i=0;i<110;i++){ vec2 h=map(ro+rd*t); if(h.x<.0012*t) return vec2(t,h.y); t+=h.x*.88; if(t>t1) break; } return vec2(t1+1.,-1.); }\n\nvec3 shade(vec3 p, vec3 n, vec3 rd, float m){\n  vec3 L=normalize(vec3(.55,.8,.45)); vec3 H=normalize(L-rd); vec3 rf=reflect(rd,n);\n  float dif=max(dot(n,L),0.); float sh=shadow(p+n*.02,L); float occ=ao(p,n);\n  float fr=pow(1.-max(dot(n,-rd),0.),4.); float sp=pow(max(dot(n,H),0.),64.);\n  vec3 amb=mix(vec3(.18,.14,.12),vec3(.45,.5,.58),.5+.5*n.y);\n  vec3 base; float refl=.1, spec=.5;\n  if(m>9.5){ float fc=pow(max(dot(n,-rd),0.),.6); return mix(uC2,vec3(1.,.95,.8),.25)*(1.1+1.3*fc); }\n  if(m<.5){ vec3 e=env(rf); return (e*vec3(.9,.93,.98)*(.55+.45*occ)+sp*sh*1.2)*(.55+.45*sh); }\n  else if(m<1.5){ base=uC1; refl=.22; }\n  else if(m<3.5){ vec3 e=env(rf); base=uC2; vec3 deep=base*base*.5; vec3 c=mix(deep,base,.35+.65*dif*sh)*occ+e*.18*fr+sp*sh*.8; return c; }\n  else if(m<4.5){ vec3 e=env(rf); return e*vec3(1.,.78,.36)*(.7+.3*occ)+sp*sh; }\n  else if(m<5.5){ base=vec3(.96,.95,.93); refl=.12; }\n  else if(m<6.5){ base=mix(uC2*vec3(1.),vec3(.95,.72,.38),.5)*(.82+.28*hash(floor(p.xz*18.))); spec=.1; }\n  else if(m<7.5){ base=mix(vec3(.98,.82,.45),vec3(.95,.55,.25),.35*hash(floor(p.xz*9.))); refl=.05; }\n  else if(m<8.5){ base=vec3(.28,.55,.25); }\n  else { base=vec3(.07,.07,.08); refl=.06; spec=.2; }\n  vec3 c=base*(amb*occ+dif*sh*vec3(1.,.95,.88)*1.15);\n  c+=env(rf)*refl*(.4+fr*1.6)*occ+sp*sh*spec;\n  return c;\n}\n\nvoid main(){\n  vec2 uv=(2.*gl_FragCoord.xy-uRes)/uRes.y;\n  vec3 ta=vec3(0.,uTy,0.); float cp=cos(uPitch), sp=sin(uPitch);\n  vec3 ro=ta+uDist*vec3(cp*sin(uYaw),sp,cp*cos(uYaw));\n  vec3 ww=normalize(ta-ro), uu=normalize(cross(ww,vec3(0,1,0))), vv=cross(uu,ww);\n  vec3 rd=normalize(uv.x*uu+uv.y*vv+2.7*ww);\n  float b=dot(ro,rd), cc=dot(ro,ro)-9.; float disc=b*b-cc; float t0=0., t1=0.;\n  float tf=rd.y<-.0001?(-1.-ro.y)/rd.y:1e5;\n  vec3 col=vec3(0.); float a=0.;\n  vec2 h=vec2(1e5,-1.);\n  if(disc>0.){ float s=sqrt(disc); t0=max(-b-s,0.); t1=-b+s; h=march(ro,rd,t0,min(t1,tf)); }\n  if(h.y>=0.){\n    vec3 p=ro+rd*h.x, n=nor(p);\n    if(h.y>1.5&&h.y<2.5){\n      float fr=pow(1.-max(dot(n,-rd),0.),3.); vec3 ge=env(reflect(rd,n)); vec3 gc=mix(max(ge-.6,0.)*1.5+ge*.12,ge*vec3(.12,.2,.17),smoothstep(.25,.8,fr)*.75*(2.-min(uLum,2.)))*uLum+vec3(.5,.45,.4)*(uLum-1.)*pow(fr,1.5); float F=(.015+.8*fr)*(1.+(uLum-1.)*.8)+(uLum-1.)*.05+.5*smoothstep(.8,2.,max(ge.r,max(ge.g,ge.b)));\n      vec3 inner=vec3(0.); float ia=0.;\n      vec2 h2=march(p+rd*.062,rd,0.,min(t1,tf)-h.x);\n      if(h2.y>=0.){ vec3 p2=p+rd*(.062+h2.x), n2=nor(p2); if(h2.y>1.5&&h2.y<2.5){ inner=env(reflect(rd,n2)); ia=.07; } else { inner=shade(p2,n2,rd,h2.y); ia=1.; } }\n      float lg=max(max(gc.r,gc.g),gc.b); float Fa=mix(F,clamp(F*(lg*1.8+.04),0.,.95),step(1.5,uLum)); a=Fa+ia*(1.-Fa); col=(gc*Fa+inner*ia*(1.-Fa))/max(a,.001);\n    } else { col=shade(p,n,rd,h.y); a=1.; }\n  } else if(tf<1e4){\n    vec3 p=ro+rd*tf; vec3 L=normalize(vec3(.55,.8,.45));\n    float s=shadow(p+vec3(0.,.01,0.),L); float c=1.-clamp(map(p+vec3(0.,.14,0.)).x*1.7,0.,1.);\n    vec2 fq=gl_FragCoord.xy/uRes; float ed=min(min(fq.x,1.-fq.x),min(fq.y,1.-fq.y)); float fade=smoothstep(2.6,.6,length(p.xz))*smoothstep(0.,.14,ed); a=((1.-s)*.5+c*.4)*fade; col=vec3(.03,.015,.01)*a;\n    // faint mirror of the model in the floor\n    vec3 r2=vec3(rd.x,-rd.y,rd.z); vec2 hr=march(p+vec3(0.,.02,0.),r2,0.,3.5);\n    if(hr.y>=0.&&hr.y!=2.){ vec3 pr=p+vec3(0.,.02,0.)+r2*hr.x; vec3 nr=nor(pr); vec3 cr=shade(pr,nr,r2,hr.y); float rf=.11*fade; col+=cr*rf; a=max(a,rf); }\n  }\n  col=1.-exp(-col*1.15); col=pow(col,vec3(.4545));\n  oc=vec4(col*a,a);\n}";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function hex(h) { h = (h || "#888888").replace("#", ""); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
  function mount(el) {
    var name = el.getAttribute("data-gl3d"); if (!(name in M)) return;
    var cv = document.createElement("canvas"); cv.className = "gl3d-cv"; cv.setAttribute("aria-hidden", "true");
    var gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return;
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn("gl3d", gl.getShaderInfoLog(s)); return null; } return s; }
    var vs = sh(gl.VERTEX_SHADER, "#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.,1.);}");
    var fs = sh(gl.FRAGMENT_SHADER, "#version 300 es\n#define MODEL " + M[name] + "\n" + FRAG);
    if (!vs || !fs) return;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ["uLum", "uRes", "uYaw", "uPitch", "uTy", "uDist", "uTime", "uC1", "uC2", "uC3"].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    var cam = CAM[name], c1 = hex(el.getAttribute("data-c1")), c2 = hex(el.getAttribute("data-c2")), c3 = hex(el.getAttribute("data-c3"));
    var yaw = +(el.getAttribute("data-yaw") || .6), pitch = cam[0], vel = 0, drag = false, lx = 0, hov = 0, auto = !reduce, vis = false, raf = 0, t0 = performance.now(), last = t0, ready = false;
    var q = +(el.getAttribute("data-q") || 1), lum = +(el.getAttribute("data-lum") || 1), sc = el.hasAttribute("data-scroll"), so = 0; if (sc) auto = false;
    function size() {
      var r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5) * q, w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
      var mx = 720; if (w > mx) { h = Math.round(h * mx / w); w = mx; }
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    function draw(now) {
      size(); var dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!drag) { vel *= .94; yaw += vel; if (auto) yaw += dt * .32; yaw += (hov - 0) * 0; }
      gl.uniform2f(U.uRes, cv.width, cv.height); gl.uniform1f(U.uYaw, yaw + so + hov * .6); gl.uniform1f(U.uPitch, pitch); gl.uniform1f(U.uTy, cam[1]); gl.uniform1f(U.uDist, cam[2]); gl.uniform1f(U.uTime, (now - t0) / 1000); gl.uniform1f(U.uLum, lum);
      gl.uniform3f(U.uC1, c1[0], c1[1], c1[2]); gl.uniform3f(U.uC2, c2[0], c2[1], c2[2]); gl.uniform3f(U.uC3, c3[0], c3[1], c3[2]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!ready) { ready = true; el.classList.add("gl-on"); }
    }
    function loop(now) { if (!vis) { raf = 0; return; } draw(now); raf = requestAnimationFrame(loop); }
    function start() { if (reduce) { requestAnimationFrame(draw); return; } if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    el.gl3d = { colors: function (a, b, c) { if (a) c1 = hex(a); if (b) c2 = hex(b); if (c) c3 = hex(c); if (reduce || !raf) requestAnimationFrame(draw); }, spin: function (v) { vel += v; } };
    if (sc) { var onS = function () { var r = el.getBoundingClientRect(), k = (r.top + r.height / 2) / (window.innerHeight || 1); so = k * 4.2; if (reduce || !raf) requestAnimationFrame(draw); }; window.addEventListener("scroll", onS, { passive: true }); onS(); }
    el.insertBefore(cv, el.firstChild);
    el.addEventListener("pointerdown", function (e) { drag = true; lx = e.clientX; vel = 0; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
    el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); if (drag) { var d = (e.clientX - lx) * .012; yaw += d; vel = d * .5; lx = e.clientX; if (reduce) requestAnimationFrame(draw); } else if (e.pointerType === "mouse") { hov = ((e.clientX - r.left) / r.width - .5) * 1.2; if (reduce) requestAnimationFrame(draw); } });
    function up() { drag = false; }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("pointerleave", function () { hov = 0; });
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) start(); }, { rootMargin: "100px" }).observe(el); } else { vis = true; start(); }
    el.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { yaw -= .25; if (reduce) requestAnimationFrame(draw); } if (e.key === "ArrowRight") { yaw += .25; if (reduce) requestAnimationFrame(draw); } });
  }
  [].slice.call(document.querySelectorAll("[data-gl3d]")).forEach(function (el) { try { mount(el); } catch (e) { if (window.console) console.warn("gl3d", e); } });
})();

