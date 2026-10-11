/* Gurost section motion: scroll reveals, stagger, number count-up, subtle parallax and (optionally) GSAP and Lenis.
   One small script, no dependencies. It does nothing for visitors who ask for reduced motion.
   GSAP + ScrollTrigger and Lenis are used only if the page loaded them (assemble option motion.libs); otherwise the
   built-in engine below does the same job. Any failure leaves the page fully visible. */
(function () {
  var d = document;
  var root = d.documentElement;
  var win = window;
  var reduce = win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  // once an element has arrived its reveal styling is dropped, so hover lifts and other transitions behave normally
  function finish(el) {
    var wait = 1300 + (Number(el.style.getPropertyValue("--g-i")) || 0) * 70;
    win.setTimeout(function () {
      el.removeAttribute("data-g-reveal");
      el.classList.remove("is-in", "is-instant");
      el.style.removeProperty("--g-i");
    }, wait);
  }

  function start() {
    try {
      var els = [].slice.call(d.querySelectorAll("[data-g-reveal]"));
      var hasIO = "IntersectionObserver" in win;
      var gsap = win.gsap && win.ScrollTrigger ? win.gsap : null;

      // stagger index: position among the staggered siblings of the same parent (capped so long lists stay quick)
      var seen = new Map();
      els.forEach(function (el) {
        if (!el.hasAttribute("data-g-stagger")) return;
        var p = el.parentNode;
        var i = seen.get(p) || 0;
        seen.set(p, i + 1);
        el.style.setProperty("--g-i", String(Math.min(i, 6)));
      });

      var counters = [].slice.call(d.querySelectorAll(".g-stats__value")).map(prepCounter).filter(Boolean);

      if (!hasIO && !gsap) return; // nothing is hidden, nothing to do

      root.classList.add("g-motion");
      if (gsap) {
        root.classList.add("g-gsap");
        gsap.registerPlugin(win.ScrollTrigger);
        els.forEach(function (el) {
          var y = el.hasAttribute("data-gsap-slide") ? 26 : el.hasAttribute("data-gsap-fade") ? 10 : 18;
          var idx = Number(el.style.getPropertyValue("--g-i")) || 0;
          gsap.fromTo(el, { opacity: 0, y: y }, {
            opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: idx * 0.07, clearProps: "opacity,transform",
            scrollTrigger: { trigger: el, start: "top 90%", once: true, onEnter: function () { el.classList.add("is-in"); finish(el); } }
          });
        });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var el = e.target;
            if (e.isIntersecting) {
              el.classList.add("is-in");
              finish(el);
              io.unobserve(el);
            } else if (e.boundingClientRect.top < 0) {
              el.classList.add("is-instant", "is-in"); // scrolled past (jump link): no animation
              finish(el);
              io.unobserve(el);
            }
          });
        }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
        els.forEach(function (el) { io.observe(el); });
        // a jump link can move items from "below the screen" to "above it" without ever crossing it, which the observer
        // does not report: on scroll, anything now wholly above the screen is shown at once
        var sweeping = false;
        var sweep = function () {
          sweeping = false;
          els.forEach(function (el) {
            if (el.classList.contains("is-in") || !el.hasAttribute("data-g-reveal")) return;
            if (el.getBoundingClientRect().bottom < 0) {
              el.classList.add("is-instant", "is-in");
              finish(el);
              io.unobserve(el);
            }
          });
        };
        win.addEventListener("scroll", function () {
          if (!sweeping) { sweeping = true; win.requestAnimationFrame(sweep); }
        }, { passive: true });
      }

      if (hasIO) {
        var cio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            cio.unobserve(e.target);
            e.target.__gCount && e.target.__gCount();
          });
        }, { threshold: 0.4 });
        counters.forEach(function (c) { cio.observe(c); });
        parallax(hasIO);
      }
      lenis(gsap);
    } catch (err) {
      root.classList.remove("g-motion", "g-gsap");
      [].forEach.call(d.querySelectorAll("[data-g-reveal]"), function (el) { el.classList.add("is-in"); });
    }
  }

  // "1,200+" -> prefix "", number 1200, suffix "+"; anything without a plain number (e.g. a placeholder) is left alone
  function prepCounter(el) {
    var text = (el.textContent || "").trim();
    var m = text.match(/^([^\d]{0,3})(\d[\d,]*(?:\.\d+)?)(\D{0,6})$/);
    if (!m) return null;
    var raw = m[2];
    var target = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(target) || target === 0 || target > 1e9) return null;
    var dec = (raw.split(".")[1] || "").length;
    var grouped = raw.indexOf(",") > -1;
    var fmt = function (n) {
      var s = n.toFixed(dec);
      return grouped ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
    };
    el.textContent = "";
    var shown = d.createElement("span");
    shown.setAttribute("aria-hidden", "true");
    shown.textContent = text;
    var real = d.createElement("span");
    real.className = "g-sr-only";
    real.textContent = text;
    el.appendChild(shown);
    el.appendChild(real);
    el.__gCount = function () {
      var t0 = null;
      var dur = 1100;
      function frame(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        shown.textContent = m[1] + fmt(target * e) + m[3];
        if (k < 1) win.requestAnimationFrame(frame);
        else shown.textContent = text;
      }
      shown.textContent = m[1] + fmt(0) + m[3];
      win.requestAnimationFrame(frame);
    };
    return el;
  }

  // subtle parallax on desktop only: the picture inside the box drifts a few pixels against the scroll
  function parallax() {
    var wide = win.matchMedia && win.matchMedia("(min-width: 880px)");
    var boxes = [].slice.call(d.querySelectorAll("[data-g-parallax]"));
    if (!boxes.length) return;
    var live = new Set();
    var ticking = false;
    var po = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? live.add(e.target) : live.delete(e.target); });
      update();
    });
    boxes.forEach(function (b) { po.observe(b); });
    function update() {
      ticking = false;
      var vh = win.innerHeight || 1;
      live.forEach(function (b) {
        var t = b.querySelector("img") || b.firstElementChild;
        if (!t) return;
        if (!wide || !wide.matches) { t.style.transform = ""; return; }
        var r = b.getBoundingClientRect();
        var k = ((r.top + r.height / 2) - vh / 2) / vh; // -1 .. 1 around the middle of the screen
        t.style.transform = "translate3d(0," + (-k * 22).toFixed(1) + "px,0) scale(1.08)";
      });
    }
    win.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; win.requestAnimationFrame(update); }
    }, { passive: true });
    win.addEventListener("resize", update);
  }

  // smooth scrolling, only when the Lenis library was loaded
  function lenis(gsap) {
    if (!win.Lenis) return;
    try {
      var l = new win.Lenis({ lerp: 0.1, anchors: true });
      if (gsap) {
        l.on("scroll", win.ScrollTrigger.update);
        gsap.ticker.add(function (t) { l.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        var raf = function (t) { l.raf(t); win.requestAnimationFrame(raf); };
        win.requestAnimationFrame(raf);
      }
      root.classList.add("g-lenis");
    } catch (e) {}
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", start);
  else start();
})();
