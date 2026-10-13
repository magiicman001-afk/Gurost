/*
 * Marble loader: eight glossy marbles, one per helper bot, roll and bounce while a build runs.
 * Spec: docs/MARBLE_PREVIEW_ANIMATION_SPEC.md. No dependencies. Works in the browser and (for the physics) in Node tests.
 *
 *   const m = MarbleLoader.create(hostElement, { shouldShow: () => true, hasSnippet: () => false });
 *   m.start(); m.setProgress(45); m.stop();
 *
 * Drawing: each marble is painted ONCE into a small picture (soft colour blobs along a spiral, so no blur filter is needed,
 * which iOS Safari handles badly). Every frame only moves, rotates and stamps those pictures: cheap, 60 frames a second.
 * The light stays fixed (highlight and shadow do not rotate), only the swirl rolls, which is what makes it look like glass.
 * If anything fails, a plain spinner with the same progress text shows. It is never blank.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MarbleLoader = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Same eight bots as shared/bot-conversation.js (BOT_FACES), in deeper tones that read on a cream background.
  var BOTS = [
    { name: "Planner", color: "#2563EB" },
    { name: "Designer", color: "#FB7185" },
    { name: "Industry", color: "#0D9488" },
    { name: "Builder", color: "#F97316" },
    { name: "Pulse", color: "#F59E0B" },
    { name: "Research", color: "#8B5CF6" },
    { name: "Review", color: "#EF4444" },
    { name: "Launch", color: "#22C55E" }
  ];
  var ACCENTS = ["#F97316", "#FB7185", "#0D9488"]; // the reference marble's swirl colours: orange, coral, teal
  var SNIPPET_EVERY_MS = 10000;
  var SNIPPET_SHOW_MS = 3000;
  var CREAM = "#FAF7F2";

  // ------------------------------------------------------------------ physics (pure, tested in Node)
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
    return Math.max(40, Math.min(80, Math.min(w, h) / 5.2));
  }

  function createWorld(n, w, h, r, seed) {
    var rnd = mulberry32(seed || 7);
    var marbles = [];
    var cols = Math.ceil(Math.sqrt(n * (w / Math.max(h, 1))));
    var rows = Math.ceil(n / cols);
    for (var i = 0; i < n; i++) {
      var cx = ((i % cols) + 0.5) / cols, cy = (Math.floor(i / cols) + 0.5) / rows;
      var a = rnd() * Math.PI * 2, sp = 60 + rnd() * 50;
      marbles.push({
        x: Math.min(Math.max(cx * w, r), w - r), y: Math.min(Math.max(cy * h, r), h - r),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rnd() * Math.PI * 2
      });
    }
    return { w: w, h: h, r: r, marbles: marbles, rnd: rnd, vmin: 55, vmax: 120 };
  }

  /** Advance the world by dt seconds (clamped). Bounce off walls and each other; keep speeds in a lively band. */
  function stepWorld(world, dt) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    var m = world.marbles, r = world.r, i, j;
    for (i = 0; i < m.length; i++) {
      var p = m[i];
      // a tiny wander, so paths never settle into a repeating loop
      var turn = (world.rnd() - 0.5) * 0.9 * dt;
      var c = Math.cos(turn), s = Math.sin(turn), vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
      p.vx = vx; p.vy = vy;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx); }
      if (p.x > world.w - r) { p.x = world.w - r; p.vx = -Math.abs(p.vx); }
      if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy); }
      if (p.y > world.h - r) { p.y = world.h - r; p.vy = -Math.abs(p.vy); }
    }
    for (i = 0; i < m.length; i++) {
      for (j = i + 1; j < m.length; j++) {
        var a = m[i], b = m[j];
        var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = 2 * r;
        if (d2 >= min * min) continue;
        var d = Math.sqrt(d2) || 0.0001, nx = dx / d, ny = dy / d;
        var push = (min - d) / 2;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        var rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; // equal masses: swap the speed along the line between them
        if (rel < 0) { a.vx += rel * nx; a.vy += rel * ny; b.vx -= rel * nx; b.vy -= rel * ny; }
      }
    }
    for (i = 0; i < m.length; i++) { // pushing apart can nudge a marble through a wall in a tight box: put it back
      var w2 = m[i];
      if (w2.x < r) w2.x = r; else if (w2.x > world.w - r) w2.x = world.w - r;
      if (w2.y < r) w2.y = r; else if (w2.y > world.h - r) w2.y = world.h - r;
    }
    for (i = 0; i < m.length; i++) {
      var q = m[i], sp = Math.sqrt(q.vx * q.vx + q.vy * q.vy);
      if (sp < world.vmin) { var k = world.vmin / (sp || 1); if (sp < 0.01) { q.vx = world.vmin; q.vy = 0; } else { q.vx *= k; q.vy *= k; } }
      else if (sp > world.vmax) { q.vx *= world.vmax / sp; q.vy *= world.vmax / sp; }
      // rolling without slipping: the swirl turns by distance travelled / radius
      q.rot += (Math.sqrt(q.vx * q.vx + q.vy * q.vy) / r) * dt * (q.vx >= 0 ? 1 : -1);
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

  // ------------------------------------------------------------------ painting (browser only)
  function mix(hex, to, t) {
    var n = parseInt(hex.slice(1), 16), tn = parseInt(to.slice(1), 16), o = 0;
    for (var s = 16; s >= 0; s -= 8) {
      var a = (n >> s) & 255, b = (tn >> s) & 255;
      o = (o << 8) | Math.round(a + (b - a) * t);
    }
    return "#" + ("000000" + o.toString(16)).slice(-6);
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function blob(ctx, x, y, rad, color, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }

  /** The rolling part: body colour with swirls of the brand colours. Square picture, marble centred. */
  function paintBody(size, base, index) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = size;
    var ctx = cv.getContext("2d");
    if (!ctx) throw new Error("no 2d canvas");
    var R = size / 2 - 1, C = size / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2); ctx.clip();
    var g = ctx.createRadialGradient(C - R * 0.25, C - R * 0.3, R * 0.1, C, C, R);
    g.addColorStop(0, mix(base, "#FFFFFF", 0.3)); g.addColorStop(0.6, base); g.addColorStop(1, mix(base, "#000000", 0.38));
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    var accents = ACCENTS.filter(function (a) { return a.toLowerCase() !== base.toLowerCase(); });
    accents.push("#FFFFFF");
    var N = 34, turns = 1.8, off = index * 1.3;
    for (var arm = 0; arm < 2; arm++) {
      for (var i = 0; i < N; i++) {
        var t = i / (N - 1), ang = off + arm * Math.PI + t * turns * Math.PI;
        var rad = R * (0.08 + 0.92 * t);
        var col = accents[(Math.floor(t * 3) + arm + index) % accents.length];
        blob(ctx, C + Math.cos(ang) * rad, C + Math.sin(ang) * rad, R * (0.16 + 0.16 * Math.sin(t * Math.PI)), col, col === "#FFFFFF" ? 0.28 : 0.45);
      }
    }
    ctx.restore();
    return cv;
  }

  /** The fixed light: soft top-left highlight, small bright dot, faint bottom-right bounce light, glassy rim. */
  function paintGloss(size) {
    var cv = document.createElement("canvas");
    cv.width = cv.height = size;
    var ctx = cv.getContext("2d");
    var R = size / 2 - 1, C = size / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(C, C, R, 0, Math.PI * 2); ctx.clip();
    ctx.save();
    ctx.translate(C - R * 0.34, C - R * 0.42); ctx.scale(1.25, 0.8); ctx.rotate(-0.5);
    blob(ctx, 0, 0, R * 0.42, "#FFFFFF", 0.85);
    ctx.restore();
    blob(ctx, C - R * 0.42, C - R * 0.5, R * 0.09, "#FFFFFF", 1);
    blob(ctx, C + R * 0.38, C + R * 0.45, R * 0.45, "#FFFFFF", 0.2);
    ctx.restore();
    ctx.lineWidth = Math.max(1, size * 0.012);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.arc(C, C, R - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
    return cv;
  }

  // ------------------------------------------------------------------ the widget
  var CSS = "" +
    ".mbl{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden;opacity:1;transition:opacity .5s ease;" +
    "background:radial-gradient(ellipse at 50% 40%,#FFFDF9 0%," + CREAM + " 70%,#F3EDE3 100%)}" +
    ".mbl[hidden]{display:none}.mbl.mbl-off{opacity:0}" +
    ".mbl canvas{position:absolute;inset:0;width:100%;height:100%}" +
    ".mbl-note{position:absolute;left:0;right:0;bottom:14px;display:flex;flex-direction:column;align-items:center;gap:8px;" +
    "font:600 13px/1.2 Inter,system-ui,sans-serif;color:#7A5A3A}" +
    ".mbl-bar{width:min(220px,60%);height:6px;border-radius:99px;background:rgba(249,115,22,.16);overflow:hidden}" +
    ".mbl-bar>i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#F97316,#FB7185);transition:width .6s ease}" +
    ".mbl-bar.mbl-ind>i{width:35%;animation:mblind 1.4s ease-in-out infinite}" +
    "@keyframes mblind{0%{margin-left:-35%}100%{margin-left:100%}}" +
    ".mbl-spin{position:absolute;left:50%;top:42%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;" +
    "border:4px solid rgba(249,115,22,.2);border-top-color:#F97316;animation:mblspin 1s linear infinite;display:none}" +
    ".mbl.mbl-fallback .mbl-spin{display:block}.mbl.mbl-fallback canvas{display:none}" +
    "@keyframes mblspin{to{transform:rotate(360deg)}}" +
    "@media (prefers-reduced-motion:reduce){.mbl,.mbl-bar>i{transition:none}.mbl-bar.mbl-ind>i{animation:none;width:100%}.mbl-spin{animation:none}}";

  function create(host, opts) {
    opts = opts || {};
    var shouldShow = opts.shouldShow || function () { return true; };
    var hasSnippet = opts.hasSnippet || function () { return false; };
    var label = opts.label || "Building…";
    var state = { running: false, raf: 0, last: 0, world: null, sprites: null, snippetTimer: 0, backTimer: 0, pollTimer: 0, hiddenForSnippet: false, progress: null, fallback: false, ro: null, d: 0, dpr: 1 };

    if (!document.getElementById("marble-loader-css")) {
      var st = document.createElement("style"); st.id = "marble-loader-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    var el = document.createElement("div");
    el.className = "mbl"; el.hidden = true; el.setAttribute("role", "status");
    var cv = document.createElement("canvas");
    var spin = document.createElement("div"); spin.className = "mbl-spin";
    var note = document.createElement("div"); note.className = "mbl-note";
    var txt = document.createElement("span"); txt.textContent = label;
    var bar = document.createElement("div"); bar.className = "mbl-bar mbl-ind";
    var fill = document.createElement("i"); bar.appendChild(fill);
    note.appendChild(txt); note.appendChild(bar);
    el.appendChild(cv); el.appendChild(spin); el.appendChild(note);
    host.appendChild(el);

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = function () { return !!(mq && mq.matches); };

    function useFallback(err) {
      state.fallback = true; el.classList.add("mbl-fallback");
      if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0;
      if (err && window.console) console.warn("[marble-loader] using the plain spinner:", err.message || err);
    }

    function build() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return false;
      var d = diameterFor(w, h), r = d / 2;
      state.dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * state.dpr); cv.height = Math.round(h * state.dpr);
      var px = Math.round(d * state.dpr);
      var gloss = paintGloss(px);
      state.sprites = BOTS.map(function (b, i) { return { body: paintBody(px, b.color, i), gloss: gloss }; });
      state.d = d;
      if (!state.world) state.world = createWorld(BOTS.length, w, h, r, 11);
      else { state.world.w = w; state.world.h = h; state.world.r = r; state.world.marbles.forEach(function (p) { p.x = Math.min(Math.max(p.x, r), w - r); p.y = Math.min(Math.max(p.y, r), h - r); }); }
      return true;
    }

    function draw(list) {
      var ctx = cv.getContext("2d");
      var k = state.dpr, r = state.d / 2, d = state.d;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var i, p, sh;
      for (i = 0; i < list.length; i++) { // soft shadows first, so every marble sits on the floor
        p = list[i];
        ctx.save(); ctx.translate(p.x * k, (p.y + r * 0.9) * k); ctx.scale(1, 0.24);
        sh = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.95 * k);
        sh.addColorStop(0, "rgba(90,60,30,.28)"); sh.addColorStop(1, "rgba(90,60,30,0)");
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, r * 0.95 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      for (i = 0; i < list.length; i++) {
        p = list[i];
        ctx.save(); ctx.translate(p.x * k, p.y * k); ctx.rotate(p.rot);
        ctx.drawImage(state.sprites[i].body, -d * k / 2, -d * k / 2, d * k, d * k);
        ctx.restore();
        ctx.drawImage(state.sprites[i].gloss, (p.x - r) * k, (p.y - r) * k, d * k, d * k);
      }
    }

    function frame(now) {
      state.raf = 0;
      if (!state.running || state.fallback) return;
      try {
        var dt = state.last ? (now - state.last) / 1000 : 0.016;
        state.last = now;
        if (!state.hiddenForSnippet) { stepWorld(state.world, dt); draw(state.world.marbles); }
        state.raf = requestAnimationFrame(frame);
      } catch (err) { useFallback(err); }
    }

    function paintStill() {
      try {
        if (!state.sprites && !build()) return;
        draw(layoutStatic(BOTS.length, host.clientWidth, host.clientHeight, state.d / 2));
      } catch (err) { useFallback(err); }
    }

    function applyVisibility() {
      var show = state.running && !state.hiddenForSnippet && shouldShow();
      el.classList.toggle("mbl-off", !show);
    }

    function snippet() {
      if (!state.running || !shouldShow() || !hasSnippet()) return;
      state.hiddenForSnippet = true; applyVisibility(); // fade to the real build for a few seconds, simulation paused
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

  return { create: create, BOTS: BOTS, stepWorld: stepWorld, createWorld: createWorld, layoutStatic: layoutStatic, diameterFor: diameterFor, SNIPPET_EVERY_MS: SNIPPET_EVERY_MS };
});
