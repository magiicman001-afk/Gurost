/*
 * Marble loader: eight real glass-marble pictures, one per helper bot, drift around the live preview while a build runs.
 * Spec: docs/MARBLE_PREVIEW_ANIMATION_SPEC.md. No dependencies. Works in the browser and (for the movement) in Node tests.
 *
 *   const m = MarbleLoader.create(hostElement, { shouldShow: () => true, hasSnippet: () => false });
 *   m.start(); m.setProgress(45); m.stop();
 *
 * The pictures are public/marbles/<bot>.png (round cut-outs with a transparent corner area). They are only MOVED by code: left, right,
 * up, down, bounce off the four walls and push apart when they meet (never left overlapping), a slow spin. Each is one <img>
 * moved with a transform, which the phone's graphics chip handles at 60 frames a second.
 * If any picture fails to load, or anything throws, a plain spinner with the same progress text shows. It is never blank.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MarbleLoader = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Same eight bots as shared/bot-conversation.js (BOT_FACES). `file` is the picture in public/marbles/.
  var BOTS = [
    { name: "Planner", file: "planner.png" },
    { name: "Designer", file: "designer.png" },
    { name: "Industry", file: "industry.png" },
    { name: "Builder", file: "builder.png" },
    { name: "Pulse", file: "pulse.png" },
    { name: "Research", file: "research.png" },
    { name: "Review", file: "review.png" },
    { name: "Launch", file: "launch.png" }
  ];
  var BASE = "/marbles/";
  var SNIPPET_EVERY_MS = 10000;
  var SNIPPET_SHOW_MS = 3000;
  var CREAM = "#FAF7F2";

  // ------------------------------------------------------------------ movement (pure, tested in Node)
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function diameterFor(w, h) {
    return Math.max(48, Math.min(88, Math.min(w, h) / 4.6));
  }

  function createWorld(n, w, h, r, seed) {
    var rnd = mulberry32(seed || 7);
    var marbles = [];
    var cols = Math.ceil(Math.sqrt(n * (w / Math.max(h, 1))));
    var rows = Math.ceil(n / cols);
    for (var i = 0; i < n; i++) {
      var cx = ((i % cols) + 0.5) / cols, cy = (Math.floor(i / cols) + 0.5) / rows;
      // a direction that is clearly diagonal-ish (20 to 70 degrees off the walls), any quadrant, so each marble roams the whole box
      var a = (20 + rnd() * 50) * Math.PI / 180, sp = 55 + rnd() * 40;
      var sx = rnd() < 0.5 ? -1 : 1, sy = rnd() < 0.5 ? -1 : 1;
      marbles.push({
        x: Math.min(Math.max(cx * w, r), w - r), y: Math.min(Math.max(cy * h, r), h - r),
        vx: Math.cos(a) * sp * sx, vy: Math.sin(a) * sp * sy,
        rot: rnd() * Math.PI * 2, spin: (0.15 + rnd() * 0.3) * (rnd() < 0.5 ? -1 : 1) // slow turn, radians a second
      });
    }
    return { w: w, h: h, r: r, marbles: marbles, vmin: 50, vmax: 100 };
  }

  /** The box changed size (the preview panel grows after the first layout): keep every marble at the same RELATIVE spot, so they
   *  stay spread out instead of staying bunched in the old, smaller corner. */
  function resizeWorld(world, w, h, r) {
    var sx = w / Math.max(world.w, 1), sy = h / Math.max(world.h, 1);
    world.marbles.forEach(function (p) {
      p.x = Math.min(Math.max(p.x * sx, r), w - r); p.y = Math.min(Math.max(p.y * sy, r), h - r);
    });
    world.w = w; world.h = h; world.r = r;
    return world;
  }

  /** Advance by dt seconds (clamped). Straight lines, bounce off the four walls and off each other (pushed apart, never left
   *  overlapping), slow spin. Speeds are kept in a moderate band so nothing stalls or races. */
  function stepWorld(world, dt) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    var m = world.marbles, r = world.r;
    for (var i = 0; i < m.length; i++) {
      var p = m[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
      if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx); }
      if (p.x > world.w - r) { p.x = world.w - r; p.vx = -Math.abs(p.vx); }
      if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy); }
      if (p.y > world.h - r) { p.y = world.h - r; p.vy = -Math.abs(p.vy); }
    }
    var min = 2 * r, i2, j;
    for (var pass = 0; pass < 3; pass++) { // a few passes, so a pile of three still ends up apart
      for (i2 = 0; i2 < m.length; i2++) {
        for (j = i2 + 1; j < m.length; j++) {
          var a = m[i2], b = m[j];
          var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          var d = Math.sqrt(d2), nx, ny;
          if (d < 0.0001) { nx = 1; ny = 0; d = 0; } else { nx = dx / d; ny = dy / d; } // exactly on top of each other: push sideways
          var push = (min - d) / 2;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; // equal masses: swap the speed along the line between them
          if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; b.vx -= rel * nx; b.vy -= rel * ny; }
        }
      }
      for (i2 = 0; i2 < m.length; i2++) { // pushing apart can nudge a marble through a wall in a tight box: put it back
        var q = m[i2];
        if (q.x < r) q.x = r; else if (q.x > world.w - r) q.x = world.w - r;
        if (q.y < r) q.y = r; else if (q.y > world.h - r) q.y = world.h - r;
      }
    }
    for (i2 = 0; i2 < m.length; i2++) {
      var v = m[i2], sp = Math.sqrt(v.vx * v.vx + v.vy * v.vy);
      if (sp < world.vmin) { var k = world.vmin / (sp || 1); if (sp < 0.01) { v.vx = world.vmin; v.vy = 0; } else { v.vx *= k; v.vy *= k; } }
      else if (sp > world.vmax) { v.vx *= world.vmax / sp; v.vy *= world.vmax / sp; }
    }
    return world;
  }

  /** Still arrangement for people who ask for reduced motion: marbles on an even grid inside the box. */
  function layoutStatic(n, w, h, r) {
    var cols = Math.max(1, Math.min(n, Math.floor(w / (2.4 * r)) || 1)), rows = Math.ceil(n / cols), out = [];
    for (var i = 0; i < n; i++) {
      out.push({
        x: Math.min(Math.max(((i % cols) + 0.5) * (w / cols), r), w - r),
        y: Math.min(Math.max((Math.floor(i / cols) + 0.5) * (h / rows), r), h - r),
        rot: i * 0.9
      });
    }
    return out;
  }

  // ------------------------------------------------------------------ the widget
  var CSS = "" +
    ".mbl{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;opacity:1;transition:opacity .5s ease;" +
    "background:radial-gradient(ellipse at 50% 40%,#FFFDF9 0%," + CREAM + " 70%,#F3EDE3 100%)}" +
    ".mbl[hidden]{display:none}.mbl.mbl-off{opacity:0}" +
    ".mbl-field{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;opacity:0;transition:opacity .4s ease}" +
    ".mbl.mbl-ready .mbl-field{opacity:1}" +
    ".mbl-field img{position:absolute;left:0;top:0;display:block;border-radius:50%;will-change:transform;-webkit-user-drag:none;user-select:none;" +
    "box-shadow:0 7px 12px rgba(90,60,30,.22),0 2px 3px rgba(60,40,20,.2)}" +
    ".mbl-note{position:absolute;left:0;right:0;bottom:14px;display:flex;flex-direction:column;align-items:center;gap:8px;" +
    "font:600 13px/1.2 Inter,system-ui,sans-serif;color:#7A5A3A}" +
    ".mbl-bar{width:min(220px,60%);height:6px;border-radius:99px;background:rgba(249,115,22,.16);overflow:hidden}" +
    ".mbl-bar>i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#F97316,#FB7185);transition:width .6s ease}" +
    ".mbl-bar.mbl-ind>i{width:35%;animation:mblind 1.4s ease-in-out infinite}" +
    "@keyframes mblind{0%{margin-left:-35%}100%{margin-left:100%}}" +
    ".mbl-spin{position:absolute;left:50%;top:42%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;" +
    "border:4px solid rgba(249,115,22,.2);border-top-color:#F97316;animation:mblspin 1s linear infinite}" +
    ".mbl.mbl-ready .mbl-spin{display:none}.mbl.mbl-fallback .mbl-field{display:none}.mbl.mbl-fallback .mbl-spin{display:block}" +
    "@keyframes mblspin{to{transform:rotate(360deg)}}" +
    "@media (prefers-reduced-motion:reduce){.mbl,.mbl-bar>i,.mbl-field{transition:none}.mbl-bar.mbl-ind>i{animation:none;width:100%}.mbl-spin{animation:none}}";

  function create(host, opts) {
    opts = opts || {};
    var shouldShow = opts.shouldShow || function () { return true; };
    var hasSnippet = opts.hasSnippet || function () { return false; };
    var label = opts.label || "Building…";
    var base = opts.base || BASE;
    var state = { running: false, raf: 0, last: 0, world: null, snippetTimer: 0, backTimer: 0, pollTimer: 0, hiddenForSnippet: false, progress: null, fallback: false, ro: null, d: 0, loaded: 0 };

    if (!document.getElementById("marble-loader-css")) {
      var st = document.createElement("style"); st.id = "marble-loader-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    var el = document.createElement("div");
    el.className = "mbl"; el.hidden = true; el.setAttribute("role", "status");
    var field = document.createElement("div"); field.className = "mbl-field";
    var spin = document.createElement("div"); spin.className = "mbl-spin";
    var note = document.createElement("div"); note.className = "mbl-note";
    var txt = document.createElement("span"); txt.textContent = label;
    var bar = document.createElement("div"); bar.className = "mbl-bar mbl-ind";
    var fill = document.createElement("i"); bar.appendChild(fill);
    note.appendChild(txt); note.appendChild(bar);
    el.appendChild(field); el.appendChild(spin); el.appendChild(note);
    host.appendChild(el);

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = function () { return !!(mq && mq.matches); };

    function useFallback(err) {
      state.fallback = true; el.classList.add("mbl-fallback");
      if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0;
      if (err && window.console) console.warn("[marble-loader] using the plain spinner:", err.message || err);
    }

    // one <img> per bot, loaded now so the first build already has them; any failure means the plain spinner
    var imgs = BOTS.map(function (b) {
      var im = new Image();
      im.alt = ""; im.draggable = false; im.decoding = "async";
      im.onload = function () { state.loaded++; if (state.loaded === BOTS.length && !state.fallback) { el.classList.add("mbl-ready"); if (state.running) { if (reduced()) paintStill(); else place(); } } };
      im.onerror = function () { useFallback(new Error("marble picture missing: " + b.file)); };
      im.src = base + b.file;
      field.appendChild(im);
      return im;
    });

    function build() {
      var w = host.clientWidth, full = host.clientHeight, h = full - (note.offsetHeight + 22); // marbles move above the progress text, never under it
      if (!w || h < 60) return false;
      var d = diameterFor(w, h), r = d / 2;
      field.style.bottom = (full - h) + "px"; // the moving area stops above the text
      state.d = d;
      imgs.forEach(function (im) { im.style.width = im.style.height = d + "px"; });
      if (!state.world) state.world = createWorld(BOTS.length, w, h, r, 11);
      else resizeWorld(state.world, w, h, r);
      return true;
    }

    function place(list) {
      list = list || (state.world && state.world.marbles); if (!list) return;
      var r = state.d / 2;
      for (var i = 0; i < imgs.length; i++) {
        var p = list[i];
        imgs[i].style.transform = "translate3d(" + (p.x - r).toFixed(2) + "px," + (p.y - r).toFixed(2) + "px,0) rotate(" + p.rot.toFixed(3) + "rad)";
      }
    }

    function frame(now) {
      state.raf = 0;
      if (!state.running || state.fallback) return;
      try {
        var dt = state.last ? (now - state.last) / 1000 : 0.016;
        state.last = now;
        if (!state.hiddenForSnippet && state.world) { stepWorld(state.world, dt); place(); }
        state.raf = requestAnimationFrame(frame);
      } catch (err) { useFallback(err); }
    }

    function paintStill() {
      try {
        if (!state.world && !build()) return;
        place(layoutStatic(BOTS.length, state.world.w, state.world.h, state.d / 2));
      } catch (err) { useFallback(err); }
    }

    function applyVisibility() {
      var show = state.running && !state.hiddenForSnippet && shouldShow();
      el.classList.toggle("mbl-off", !show);
    }

    function snippet() {
      if (!state.running || !shouldShow() || !hasSnippet()) return;
      state.hiddenForSnippet = true; applyVisibility(); // fade to the real build for a few seconds, movement paused
      clearTimeout(state.backTimer);
      state.backTimer = setTimeout(function () { state.hiddenForSnippet = false; state.last = 0; applyVisibility(); }, SNIPPET_SHOW_MS);
    }

    function onResize() { if (!state.running) return; try { if (build() && reduced()) paintStill(); } catch (err) { useFallback(err); } }

    function start() {
      if (state.running) return;
      state.running = true; state.hiddenForSnippet = false; el.hidden = false;
      requestAnimationFrame(function () { applyVisibility(); });
      try {
        if (!build()) { setTimeout(function () { if (state.running && !state.fallback) { try { build(); if (reduced()) paintStill(); } catch (e) { useFallback(e); } } }, 120); }
        if (reduced()) paintStill();
        else { state.last = 0; state.raf = requestAnimationFrame(frame); }
      } catch (err) { useFallback(err); }
      if (window.ResizeObserver) { state.ro = new ResizeObserver(onResize); state.ro.observe(host); }
      state.snippetTimer = setInterval(snippet, SNIPPET_EVERY_MS);
      state.pollTimer = setInterval(applyVisibility, 500);
    }

    function stop() {
      if (!state.running) return;
      state.running = false;
      clearInterval(state.snippetTimer); clearInterval(state.pollTimer); clearTimeout(state.backTimer);
      if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0;
      if (state.ro) { state.ro.disconnect(); state.ro = null; }
      el.classList.add("mbl-off"); // fade out to the finished site
      setTimeout(function () { if (!state.running) el.hidden = true; }, 600);
    }

    function setProgress(p) {
      state.progress = typeof p === "number" && isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : null;
      if (state.progress == null) { bar.classList.add("mbl-ind"); fill.style.width = ""; txt.textContent = label; return; }
      bar.classList.remove("mbl-ind"); fill.style.width = state.progress + "%";
      txt.textContent = label.replace("…", "") + "… " + state.progress + "%";
    }

    return { start: start, stop: stop, setProgress: setProgress, isFallback: function () { return state.fallback; }, element: el };
  }

  return { create: create, BOTS: BOTS, stepWorld: stepWorld, createWorld: createWorld, resizeWorld: resizeWorld, layoutStatic: layoutStatic, diameterFor: diameterFor, SNIPPET_EVERY_MS: SNIPPET_EVERY_MS };
});
