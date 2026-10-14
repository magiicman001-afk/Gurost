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
