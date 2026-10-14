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
  var s = document.querySelector("[data-story]"); if (!s) return;
  var sl = [].slice.call(s.querySelectorAll(".sl")), bars = [].slice.call(s.querySelectorAll(".bars i")), cur = 0, tm = null, t0 = 0, left = 0, DUR = 5000;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go(n) {
    cur = (n + sl.length) % sl.length;
    sl.forEach(function (x, k) { x.classList.toggle("on", k === cur); x.setAttribute("aria-hidden", k === cur ? "false" : "true"); });
    bars.forEach(function (b, k) { b.classList.remove("on", "dn"); void b.offsetWidth; if (k < cur) b.classList.add("dn"); if (k === cur) b.classList.add("on"); });
    left = DUR; run();
  }
  function run() { clearTimeout(tm); if (reduce || s.classList.contains("hold")) return; t0 = Date.now(); tm = setTimeout(function () { go(cur + 1); }, left); }
  function hold(on) { if (on) { left -= Date.now() - t0; clearTimeout(tm); s.classList.add("hold"); } else { s.classList.remove("hold"); run(); } }
  s.querySelector(".nv.p").addEventListener("click", function () { go(cur - 1); });
  s.querySelector(".nv.n").addEventListener("click", function () { go(cur + 1); });
  s.addEventListener("mouseenter", function () { hold(true); }); s.addEventListener("mouseleave", function () { hold(false); });
  s.addEventListener("focusin", function () { hold(true); }); s.addEventListener("focusout", function () { hold(false); });
  go(0);
})();
