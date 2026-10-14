/*
 * Marble steps (Marble Animation v2): the eight real bot marbles roll down a cartoon staircase while a build runs.
 * Same use as shared/marble-loader.js (v1), so the builder page can swap one for the other:
 *
 *   const m = MarbleSteps.create(hostElement, { shouldShow: () => true, hasSnippet: () => false, label: "Building…" });
 *   m.start(); m.setProgress(45); m.stop();
 *
 * Scene: a cartoon dusk-to-day valley (night sky, moon, stars, fireflies that turn into day with the build progress, dunes, lanterns) with chunky coloured steps that
 * zig-zag down the panel. The marbles drop in at the top, roll along each step, hop down to the next (one small bounce each),
 * turn round at the landing, and roll into the glass jar at the bottom, one after another. Down means progress.
 * Everything is drawn here with plain SVG shapes: no pictures except the eight marbles, no network, no HTML strings.
 * Reduced motion: the same scene, still, with the marbles resting on the steps. If a marble picture fails to load, or anything
 * throws, a plain spinner with the same progress text shows. It is never blank.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MarbleSteps = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BOTS = [
    { name: "Planner", file: "planner.png" }, { name: "Designer", file: "designer.png" },
    { name: "Industry", file: "industry.png" }, { name: "Builder", file: "builder.png" },
    { name: "Pulse", file: "pulse.png" }, { name: "Research", file: "research.png" },
    { name: "Review", file: "review.png" }, { name: "Launch", file: "launch.png" }
  ];
  var BASE = "/marbles/";
  var SNIPPET_EVERY_MS = 10000, SNIPPET_SHOW_MS = 3000;
  var OUTLINE = "#1B1038";
  var STEP_COLOURS = ["#F7A8D8", "#7FE0D0", "#FFD98A", "#B79CFF", "#8FD3FF", "#FF9F8A"];
  var GRAVITY = 900, BOUNCE = 0.46, GAP_S = 1.15;

  // ------------------------------------------------------------------ the course (pure; tested in Node)
  // Two flights of steps that zig-zag: the first runs left to right, the second right to left, joined by a wider landing.
  function buildCourse(w, h, noteH) {
    var pad = 8;
    var ground = Math.max(14, Math.round(h * 0.07));
    var floorY = h - ground; // top of the grass
    var best = null, bestSmall = null;
    for (var S = 9; S >= 3; S--) { // as many steps as still leave room for a marble of at least 40 px: more steps read as stairs
      var tw = (w - 2 * pad) / (S + 0.65);
      var T = 2 * S;
      var topY = 40;
      var dEst = Math.min(tw * 0.4, 18);
      var gap = dEst + 26; // between the two flights: room for a marble to roll along the landing UNDER the end of the first flight
      var rise = (floorY - 48 - topY - gap) / (T - 2); // the last step stops about 48 px above the grass, leaving room for the finish flag
      var d = Math.max(0, Math.min(dEst, rise * 1.5));
      if (rise < 16) continue;
      var cand = { S: S, tw: tw, T: T, topY: topY, rise: rise, d: d, gap: gap };
      if (d >= 40 && !best) best = cand;
      if (!bestSmall || d > bestSmall.d + 0.5) bestSmall = cand;
    }
    if (!best) best = bestSmall;
    if (!best) best = { S: 3, tw: (w - 2 * pad) / 3.65, T: 6, topY: 30, rise: Math.max(8, (floorY - 36 - 40 - 54) / 4), d: 28, gap: 54 };
    var d2 = Math.max(14, Math.min(18, Math.round(best.d)));
    var r = d2 / 2, S2 = best.S, tw2 = best.tw;
    var thick = Math.min(best.rise * 0.85, 22);
    var treads = [];
    var x1 = pad; // flight 1 goes right
    for (var j = 0; j < S2; j++) treads.push({ x0: x1 + j * tw2, x1: x1 + (j + 1) * tw2, y: best.topY + j * best.rise, dir: 1 });
    var landL = x1 + S2 * tw2 - 0.35 * tw2; // the landing: the first tread of flight 2 reaches past the end of flight 1
    for (var k = 0; k < S2; k++) {
      var right = k === 0 ? landL + tw2 : landL - (k - 1) * tw2;
      var left = k === 0 ? landL : landL - k * tw2;
      treads.push({ x0: left, x1: right, y: best.topY + (S2 - 1 + k) * best.rise + best.gap, dir: -1 });
    }
    return { w: w, h: h, d: d2, r: r, treads: treads, thick: thick, floorY: floorY, ground: ground, rise: best.rise, tw: tw2, S: S2, flagX: Math.max(pad + 18, treads[treads.length - 1].x0 - 26) };
  }

  // One marble. state: wait (not on the course), roll, fall, goal (rolling into the flag then fading), gone
  function newRunner(i) { return { i: i, state: "wait", x: 0, y: -999, vx: 0, vy: 0, rot: 0, tread: 0, squash: 0, fade: 1, spin: 0, k: 1, n: 0 }; }

  function spawn(c, run) {
    var t0 = c.treads[0];
    run.n++; run.k = 0.9 + 0.2 * (((run.i + 1) * 0.6180339 + run.n * 0.37) % 1);
    run.state = "fall"; run.tread = 0; run.fade = 1; run.squash = 0;
    run.x = t0.x0 + c.tw * 0.32; run.y = -c.r - 4; run.vx = speedFor(c) * (run.k || 1); run.vy = 40; run.rot = 0;
  }
  function speedFor(c) { return Math.max(34, Math.min(120, c.tw / 0.95)); }

  function stepRunner(c, run, dt) {
    if (run.state === "wait" || run.state === "gone") return;
    var r = c.r, v = speedFor(c) * (run.k || 1);
    if (run.state === "roll") {
      var t = c.treads[run.tread];
      var dx = t.dir * v * dt;
      run.x += dx; run.rot += dx / r;
      var edge = t.dir > 0 ? run.x >= t.x1 - r * 0.15 : run.x <= t.x0 + r * 0.15;
      if (edge) {
        if (run.tread === c.treads.length - 1) { run.state = "fall"; run.tread = -1; run.vx = -v; run.vy = 0; return; } // off the last step, onto the grass
        var next = c.treads[run.tread + 1];
        run.tread = run.tread + 1;
        run.state = "fall"; run.vx = next.dir === t.dir ? t.dir * v : -t.dir * v * 0.55; run.vy = 0; // at the landing it turns round and drops
        if (next.dir !== t.dir) run.x = Math.min(run.x, t.x1 + r * 0.1) + r * 0.2;
      }
    } else if (run.state === "fall") {
      run.vy += GRAVITY * dt; run.y += run.vy * dt; run.x += run.vx * dt; run.rot += run.vx * dt / r;
      if (run.tread < 0 && run.x < c.flagX - 2) run.x = c.flagX - 2;
      var floor = run.tread < 0 ? c.floorY - r : c.treads[run.tread].y - r;
      if (run.y >= floor) {
        run.y = floor; run.squash = Math.min(0.16, Math.abs(run.vy) / 3000);
        if (Math.abs(run.vy) * BOUNCE < 55) { // too small to bounce again: roll
          run.vy = 0;
          if (run.tread < 0) { run.state = "goal"; run.vx = -v; }
          else {
            run.state = "roll";
            var tt = c.treads[run.tread];
            if (tt.dir !== Math.sign(run.vx || tt.dir)) run.vx = tt.dir * v;
            run.x = Math.max(tt.x0 + r * 0.2, Math.min(tt.x1 - r * 0.2, run.x));
          }
        } else run.vy = -run.vy * BOUNCE;
      }
    } else if (run.state === "goal") {
      var dx2 = -v * 1.15 * dt; run.x += dx2; run.rot += dx2 / r; run.x = Math.max(run.x, c.flagX - 2); // it drops into the jar and stays there while it fades
      if (run.x < c.flagX + 6) { run.fade -= dt * 5; if (run.fade <= 0) { run.fade = 0; run.state = "gone"; } }
    }
    if (run.squash > 0) run.squash = Math.max(0, run.squash - dt * 1.6);
  }

  // The whole show: marbles are let in one every GAP_S seconds; a marble that has finished goes back to wait.
  function createShow(c, n) {
    var runners = []; for (var i = 0; i < n; i++) runners.push(newRunner(i));
    return { c: c, runners: runners, clock: 0, nextSpawn: 0.4, nextIndex: 0 };
  }
  function stepShow(show, dt) {
    dt = Math.min(dt, 0.05);
    show.clock += dt;
    if (show.clock >= show.nextSpawn) {
      for (var k = 0; k < show.runners.length; k++) {
        var cand = show.runners[(show.nextIndex + k) % show.runners.length];
        if (cand.state === "wait" || cand.state === "gone") { spawn(show.c, cand); show.nextIndex = (cand.i + 1) % show.runners.length; show.nextSpawn = show.clock + GAP_S; break; }
      }
      if (show.clock >= show.nextSpawn) show.nextSpawn = show.clock + 0.3;
    }
    for (var i = 0; i < show.runners.length; i++) stepRunner(show.c, show.runners[i], dt);
  }
  // Reduced motion: marbles resting along the steps, one per step, no movement.
  function stillRunners(c, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var k = Math.min(c.treads.length - 1, Math.round(i * (c.treads.length - 1) / Math.max(1, n - 1)));
      var t = c.treads[k];
      out.push({ i: i, state: "roll", x: (t.x0 + t.x1) / 2, y: t.y - c.r, rot: i * 0.9, squash: 0, fade: 1 });
    }
    return out;
  }

  // ------------------------------------------------------------------ drawing (browser)
  var SVGNS = "http://www.w3.org/2000/svg";
  function se(tag, attrs, parent) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function shade(hex, amt) { // lighten (+) or darken (-) a #rrggbb colour
    var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt)))); });
    return "#" + c.map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("");
  }

  var NIGHT = { far: "#6A4C9C", near: "#4B3680", ground: "#2B1B4D", top: "#46C8B4" };
  var DAY = { far: "#F6C9A0", near: "#EFA97A", ground: "#C9825A", top: "#46C8B4" };

  // The backdrop (dunes, lanterns, ground, finish jar) in a palette. Drawn twice: night and day; day fades in over night as the build progresses.
  function drawBackdrop(svg, c, pal, lit) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var w = c.w, h = c.h, fy = c.floorY;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    se("path", { d: "M0 " + (fy - 18) + " C" + w * 0.18 + " " + (fy - 78) + " " + w * 0.34 + " " + (fy - 70) + " " + w * 0.5 + " " + (fy - 30) + " S" + w * 0.82 + " " + (fy - 86) + " " + w + " " + (fy - 34) + " V" + fy + " H0 Z", fill: pal.far }, svg);
    se("path", { d: "M0 " + (fy - 8) + " C" + w * 0.2 + " " + (fy - 44) + " " + w * 0.42 + " " + (fy - 40) + " " + w * 0.6 + " " + (fy - 14) + " S" + w * 0.9 + " " + (fy - 52) + " " + w + " " + (fy - 12) + " V" + fy + " H0 Z", fill: pal.near }, svg);
    [[0.9, 0.7], [0.12, 0.55], [0.55, 0.62]].forEach(function (q) { // lantern posts; the lamps glow only at night
      var tx = w * q[0], ty = fy - 2, k = Math.max(0.7, Math.min(1.2, h / 330)) * q[1] * 1.2;
      se("rect", { x: tx - 1.5 * k, y: ty - 30 * k, width: 3 * k, height: 30 * k, fill: "#2B1B4D" }, svg);
      if (lit) se("circle", { cx: tx, cy: ty - 34 * k, r: 14 * k, fill: "rgba(255,230,140,.28)" }, svg);
      se("rect", { x: tx - 6 * k, y: ty - 42 * k, width: 12 * k, height: 14 * k, rx: 5 * k, fill: lit ? "#FFE48A" : "#E9DDBB", stroke: "#2B1B4D", "stroke-width": 2 }, svg);
    });
    se("rect", { x: 0, y: fy, width: w, height: h - fy, fill: pal.ground }, svg);
    se("rect", { x: 0, y: fy, width: w, height: Math.min(8, c.ground * 0.5), fill: pal.top }, svg);
  }

  // The steps and the finish jar: the same at night and by day.
  function drawSteps(svg, c) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var fy = c.floorY;
    svg.setAttribute("viewBox", "0 0 " + c.w + " " + c.h);
    c.treads.forEach(function (t, k) {
      var col = STEP_COLOURS[k % STEP_COLOURS.length];
      var x = t.x0, y = t.y, ww = t.x1 - t.x0, th = c.thick;
      se("rect", { x: x + 3, y: y + 5, width: ww, height: th, rx: th / 2, fill: "rgba(10,0,30,0.30)" }, svg);
      se("rect", { x: x, y: y, width: ww, height: th, rx: th / 2, fill: col, stroke: OUTLINE, "stroke-width": 3 }, svg);
      for (var q = x + th; q < x + ww - th; q += 14) se("line", { x1: q, y1: y + th - 4, x2: q + 6, y2: y + 4, stroke: shade(col, 0.5), "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
    });
    var land = c.treads[c.S];
    se("rect", { x: land.x1 - 4, y: land.y - c.r * 0.9, width: 8, height: c.r * 0.9 + 6, rx: 4, fill: "#FF9F8A", stroke: OUTLINE, "stroke-width": 2.5 }, svg);
    var fx = c.flagX, jh = Math.min(34, c.r * 3.4), jw = jh * 0.72;
    se("path", { d: "M" + (fx - jw / 2 + 3) + " " + (fy - jh) + " h" + (jw - 6) + " v6 q" + 5 + " 6 " + 5 + " 14 v" + (jh - 26) + " q0 6 -6 6 h-" + (jw - 4) + " q-6 0 -6 -6 v-" + (jh - 26) + " q0 -8 5 -14 Z", fill: "rgba(200,235,255,.35)", stroke: "#E8F6FF", "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
    se("rect", { x: fx - jw / 2 + 1, y: fy - jh - 5, width: jw - 2, height: 6, rx: 3, fill: "#FFD98A", stroke: OUTLINE, "stroke-width": 2 }, svg);
  }

  var CSS = [
    ".mbs{position:absolute;inset:0;z-index:5;overflow:hidden;opacity:1;transition:opacity .5s ease;background:linear-gradient(#241A55 0%,#6A3F9C 55%,#F08AA8 100%)}",
    ".mbs[hidden]{display:none}.mbs.mbs-off{opacity:0;pointer-events:none}",
    ".mbs-svg,.mbs-layer,.mbs-field{position:absolute;left:0;top:0;width:100%}",
    ".mbs-layer{height:100%;pointer-events:none;overflow:hidden}",
    ".mbs-day{opacity:0;transition:opacity 1.6s ease}.mbs-nite{transition:opacity 1.6s ease}",
    ".mbs-sun{position:absolute;right:14px;top:12px;width:32px;height:32px;border-radius:50%;background:#FFD84D;box-shadow:0 0 0 6px rgba(255,216,77,.35),0 0 0 14px rgba(255,216,77,.16);animation:mbs-sun 4s ease-in-out infinite}",
    "@keyframes mbs-sun{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}",
    ".mbs-moon{position:absolute;right:14px;top:12px;width:30px;height:30px;border-radius:50%;background:#FFF3C4;box-shadow:inset -9px -3px 0 0 #E8D48B,0 0 0 8px rgba(255,243,196,.18);animation:mbs-sun 5s ease-in-out infinite}",
    ".mbs-star{position:absolute;border-radius:50%;background:#FFF3C4;animation:mbs-tw 2.6s ease-in-out infinite}",
    "@keyframes mbs-tw{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}",
    ".mbs-fly{position:absolute;width:4px;height:4px;border-radius:50%;background:#FFEE9A;box-shadow:0 0 8px 3px rgba(255,238,154,.6);animation:mbs-fly 7s ease-in-out infinite}",
    "@keyframes mbs-fly{0%,100%{transform:translate(0,0);opacity:.2}25%{transform:translate(14px,-10px);opacity:1}50%{transform:translate(4px,-22px);opacity:.4}75%{transform:translate(-12px,-8px);opacity:1}}",
    ".mbs-cloud{position:absolute;height:20px;border-radius:20px}",
    ".mbs-cloud::before,.mbs-cloud::after{content:'';position:absolute;border-radius:50%;background:inherit}",
    ".mbs-cloud::before{width:24px;height:24px;left:9px;top:-12px}.mbs-cloud::after{width:17px;height:17px;left:30px;top:-7px}",
    ".mbs-cn{background:#B9A2E8;opacity:.35}.mbs-cd{background:#fff;opacity:.95}",
    "@keyframes mbs-drift{0%{transform:translateX(-90px)}100%{transform:translateX(var(--mbs-w,400px))}}",
    ".mbs-c1{top:34px;width:56px;animation:mbs-drift 46s linear infinite}.mbs-c2{top:78px;width:44px;animation:mbs-drift 62s linear -20s infinite}.mbs-c3{top:18px;width:50px;animation:mbs-drift 54s linear -38s infinite}",
    ".mbs-field{height:100%;pointer-events:none}",
    ".mbs-m{position:absolute;left:0;top:0;display:block;will-change:transform;opacity:0;user-select:none}",
    ".mbs-m img{display:block;width:100%;height:100%;max-width:none;-webkit-user-drag:none}",
    ".mbs-gl{position:absolute;left:24%;top:14%;width:26%;height:17%;border-radius:50%;background:rgba(255,255,255,.8);transform:rotate(-32deg);filter:blur(.5px)}",
    ".mbs-sh{position:absolute;left:0;top:0;border-radius:50%;background:rgba(20,0,40,.4);opacity:0;will-change:transform}",
    ".mbs-spin{display:none;position:absolute;left:50%;top:40%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:4px solid rgba(255,140,0,.25);border-top-color:#FF8C00;animation:mbs-rot 1s linear infinite}",
    "@keyframes mbs-rot{to{transform:rotate(360deg)}}",
    ".mbs-fallback .mbs-spin{display:block}.mbs-fallback .mbs-m,.mbs-fallback .mbs-sh,.mbs-fallback .mbs-svg,.mbs-fallback .mbs-layer{display:none}",
    ".mbs-note{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);max-width:92%;display:flex;flex-direction:column;align-items:center;gap:6px;padding:7px 14px 8px;border-radius:14px;background:rgba(255,255,255,.93);border:2px solid " + OUTLINE + ";font:600 13px/1.2 Inter,system-ui,sans-serif;color:#1A1A2E;white-space:nowrap}",
    ".mbs-bar{width:150px;height:6px;border-radius:3px;background:#FFE3BD;overflow:hidden}.mbs-bar i{display:block;height:100%;width:0;background:#FF8C00;border-radius:3px;transition:width .6s ease}",
    ".mbs-bar.mbs-ind i{width:35%;animation:mbs-ind 1.4s ease-in-out infinite}@keyframes mbs-ind{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}",
    "@media (prefers-reduced-motion: reduce){.mbs-cloud,.mbs-sun,.mbs-moon,.mbs-star,.mbs-fly{animation:none}.mbs-day,.mbs-nite{transition:none}.mbs-bar.mbs-ind i{animation:none;width:35%}}"
  ].join("\n");

  function create(host, opts) {
    opts = opts || {};
    var shouldShow = opts.shouldShow || function () { return true; };
    var hasSnippet = opts.hasSnippet || function () { return false; };
    var label = opts.label || "Building…";
    var base = opts.base || BASE;
    var state = { running: false, raf: 0, last: 0, show: null, still: null, course: null, snippetTimer: 0, backTimer: 0, pollTimer: 0, hiddenForSnippet: false, fallback: false, ro: null, loaded: 0, progress: null, startedAt: 0 };

    if (!document.getElementById("marble-steps-css")) { var st = document.createElement("style"); st.id = "marble-steps-css"; st.textContent = CSS; document.head.appendChild(st); }
    var el = document.createElement("div"); el.className = "mbs"; el.hidden = true; el.setAttribute("role", "status");
    function mk(tag, cls, parent) { var e = document.createElement(tag); e.className = cls; if (parent) parent.appendChild(e); return e; }
    var svgN = document.createElementNS(SVGNS, "svg"); svgN.setAttribute("class", "mbs-svg"); svgN.setAttribute("aria-hidden", "true");
    var day = mk("div", "mbs-layer mbs-day");
    var svgD = document.createElementNS(SVGNS, "svg"); svgD.setAttribute("class", "mbs-svg"); svgD.setAttribute("aria-hidden", "true");
    var dayBg = mk("div", "mbs-layer", day);
    day.insertBefore(dayBg, day.firstChild);
    day.appendChild(svgD);
    ["mbs-c1", "mbs-c2", "mbs-c3"].forEach(function (cl) { mk("div", "mbs-cloud mbs-cd " + cl, day); });
    mk("div", "mbs-sun", day);
    var nite = mk("div", "mbs-layer mbs-nite");
    [[0.08, 0.1], [0.22, 0.2], [0.4, 0.08], [0.55, 0.22], [0.68, 0.1], [0.8, 0.3], [0.93, 0.18], [0.33, 0.34], [0.15, 0.4], [0.62, 0.38]].forEach(function (q, i) {
      var st = mk("div", "mbs-star", nite); var z = i % 3 ? 3 : 4; st.style.cssText = "left:" + (q[0] * 100) + "%;top:" + (q[1] * 60) + "%;width:" + z + "px;height:" + z + "px;animation-delay:-" + (i * 0.7).toFixed(1) + "s";
    });
    ["mbs-c1", "mbs-c2", "mbs-c3"].forEach(function (cl) { mk("div", "mbs-cloud mbs-cn " + cl, nite); });
    mk("div", "mbs-moon", nite);
    var flies = [];
    [[0.18, 0.62], [0.5, 0.68], [0.78, 0.6], [0.35, 0.72]].forEach(function (q, i) { var f = mk("div", "mbs-fly", nite); f.style.cssText = "left:" + (q[0] * 100) + "%;animation-delay:-" + (i * 1.8).toFixed(1) + "s"; f.dataset.y = q[1]; flies.push(f); });
    var svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "mbs-svg"); svg.setAttribute("aria-hidden", "true"); svg.style.height = "100%";
    var field = document.createElement("div"); field.className = "mbs-field";
    var spin = document.createElement("div"); spin.className = "mbs-spin";
    var note = document.createElement("div"); note.className = "mbs-note";
    var txt = document.createElement("span"); txt.textContent = label;
    var bar = document.createElement("div"); bar.className = "mbs-bar mbs-ind"; var fill = document.createElement("i"); bar.appendChild(fill);
    note.appendChild(txt); note.appendChild(bar);
    el.appendChild(svgN); el.appendChild(day); el.appendChild(nite); el.appendChild(svg); el.appendChild(field); el.appendChild(spin); el.appendChild(note);
    host.appendChild(el);

    var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = function () { return !!(mq && mq.matches); };

    function useFallback(err) {
      state.fallback = true; el.classList.add("mbs-fallback");
      if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0;
      if (err && window.console) console.warn("[marble-steps] using the plain spinner:", err.message || err);
    }

    var imgs = [], inner = [], shadows = [];
    BOTS.forEach(function (b) {
      var sh = mk("div", "mbs-sh", field); shadows.push(sh);
      var wrap = mk("div", "mbs-m", field);
      var im = new Image(); im.alt = ""; im.draggable = false; im.decoding = "async";
      im.onload = function () { state.loaded++; if (state.running && !state.fallback) { if (reduced()) paintStill(); else paintFrame(); } };
      im.onerror = function () { useFallback(new Error("marble picture missing: " + b.file)); };
      im.src = base + b.file;
      wrap.appendChild(im); mk("div", "mbs-gl", wrap); // the glint stays put while the marble turns under it
      imgs.push(wrap); inner.push(im);
    });

    function build() {
      var w = host.clientWidth, full = host.clientHeight;
      if (!w || full < 120) return false;
      var stageH = full - (note.offsetHeight + 14); // the steps and grass sit above the progress text
      var c = buildCourse(w, Math.max(110, stageH));
      state.course = c;
      el.style.setProperty("--mbs-w", w + "px");
      [svgN, svgD, svg].forEach(function (g) { g.setAttribute("width", w); g.setAttribute("height", c.h); g.style.width = w + "px"; g.style.height = c.h + "px"; });
      field.style.height = c.h + "px";
      // below the grass: ground all the way down behind the text
      el.style.backgroundImage = "linear-gradient(#241A55 0%,#6A3F9C " + Math.round(c.floorY * 0.7) + "px,#F08AA8 " + c.floorY + "px," + NIGHT.ground + " " + c.floorY + "px)";
      dayBg.style.backgroundImage = "linear-gradient(#6EC6FF 0%,#BDE8FF " + Math.round(c.floorY * 0.7) + "px,#FFE9C2 " + c.floorY + "px," + DAY.ground + " " + c.floorY + "px)";
      flies.forEach(function (f) { f.style.top = Math.round(c.floorY * parseFloat(f.dataset.y)) + "px"; });
      drawBackdrop(svgN, c, NIGHT, true); drawBackdrop(svgD, c, DAY, false); drawSteps(svg, c);
      imgs.forEach(function (im, i) { im.style.width = im.style.height = c.d + "px"; shadows[i].style.width = c.d * 0.9 + "px"; shadows[i].style.height = Math.max(3, c.d * 0.22) + "px"; });
      applyDay();
      state.show = createShow(c, BOTS.length);
      state.still = stillRunners(c, BOTS.length);
      return true;
    }

    function place(list) {
      var c = state.course; if (!c || !list) return;
      for (var i = 0; i < imgs.length; i++) {
        var p = list[i], im = imgs[i], sh = shadows[i];
        var vis = p.state !== "wait" && p.state !== "gone" && p.y > -c.d;
        var ok = vis && state.loaded === BOTS.length;
        im.style.opacity = ok ? String(p.fade) : "0";
        if (!vis) { sh.style.opacity = "0"; continue; }
        var sq = p.squash || 0;
        im.style.transform = "translate3d(" + (p.x - c.r).toFixed(1) + "px," + (p.y - c.r + sq * c.r).toFixed(1) + "px,0) scale(" + (1 + sq).toFixed(3) + "," + (1 - sq).toFixed(3) + ")";
        inner[i].style.transform = "rotate(" + p.rot.toFixed(3) + "rad)";
        // contact shadow on the step below: darker and tighter the closer the marble is
        var tr = p.tread >= 0 ? c.treads[p.tread] : null, surf = tr ? tr.y : c.floorY;
        var inSpan = !tr || (p.x >= tr.x0 - c.r * 0.3 && p.x <= tr.x1 + c.r * 0.3);
        var gap = surf - (p.y + c.r);
        if (ok && inSpan && gap > -2) { sh.style.opacity = String(Math.max(0, 0.5 - gap / 160) * p.fade); sh.style.transform = "translate3d(" + (p.x - c.d * 0.45).toFixed(1) + "px," + (surf - 2).toFixed(1) + "px,0) scale(" + Math.max(0.5, 1 - gap / 140).toFixed(2) + ",1)"; }
        else sh.style.opacity = "0";
      }
    }
    function paintFrame() { if (state.show) place(state.show.runners); }
    function paintStill() { try { if (!state.course && !build()) return; place(state.still); } catch (err) { useFallback(err); } }

    function frame(now) {
      state.raf = 0;
      if (!state.running || state.fallback) return;
      try {
        var dt = state.last ? (now - state.last) / 1000 : 0.016; state.last = now;
        if (!state.hiddenForSnippet && state.show) { stepShow(state.show, dt); paintFrame(); }
        state.raf = requestAnimationFrame(frame);
      } catch (err) { useFallback(err); }
    }

    function applyVisibility() { el.classList.toggle("mbs-off", !(state.running && !state.hiddenForSnippet && shouldShow())); }
    function snippet() {
      if (!state.running || !shouldShow() || !hasSnippet()) return;
      state.hiddenForSnippet = true; applyVisibility();
      clearTimeout(state.backTimer);
      state.backTimer = setTimeout(function () { state.hiddenForSnippet = false; state.last = 0; applyVisibility(); }, SNIPPET_SHOW_MS);
    }
    function onResize() { if (!state.running) return; try { if (build() && reduced()) paintStill(); } catch (err) { useFallback(err); } }

    function start() {
      if (state.running) return;
      state.running = true; state.startedAt = Date.now(); state.hiddenForSnippet = false; el.hidden = false; applyDay();
      requestAnimationFrame(function () { applyVisibility(); });
      try {
        if (!build()) setTimeout(function () { if (state.running && !state.fallback) { try { build(); if (reduced()) paintStill(); } catch (e) { useFallback(e); } } }, 120);
        if (reduced()) paintStill(); else { state.last = 0; state.raf = requestAnimationFrame(frame); }
      } catch (err) { useFallback(err); }
      if (window.ResizeObserver) { state.ro = new ResizeObserver(onResize); state.ro.observe(host); }
      state.snippetTimer = setInterval(snippet, SNIPPET_EVERY_MS);
      state.pollTimer = setInterval(function () { applyVisibility(); applyDay(); }, 500);
    }
    function stop() {
      if (!state.running) return;
      state.running = false;
      clearInterval(state.snippetTimer); clearInterval(state.pollTimer); clearTimeout(state.backTimer);
      if (state.raf) cancelAnimationFrame(state.raf); state.raf = 0;
      if (state.ro) { state.ro.disconnect(); state.ro = null; }
      el.classList.add("mbs-off");
      setTimeout(function () { if (!state.running) el.hidden = true; }, 600);
    }
    function applyDay() {
      var elapsed = state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0;
      var t = state.progress != null ? state.progress / 100 : Math.min(0.85, elapsed / 120); // no percentage known: dawn slowly over two minutes
      t = Math.max(0, Math.min(1, t));
      day.style.opacity = String(t); nite.style.opacity = String(1 - t);
    }
    function setProgress(p) {
      var v = typeof p === "number" && isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : null;
      state.progress = v; applyDay();
      if (v == null) { bar.classList.add("mbs-ind"); fill.style.width = ""; txt.textContent = label; return; }
      bar.classList.remove("mbs-ind"); fill.style.width = v + "%";
      txt.textContent = label.replace("…", "") + "… " + v + "%";
    }

    return { start: start, stop: stop, setProgress: setProgress, isFallback: function () { return state.fallback; }, element: el };
  }

  return { create: create, BOTS: BOTS, buildCourse: buildCourse, createShow: createShow, stepShow: stepShow, stillRunners: stillRunners, SNIPPET_EVERY_MS: SNIPPET_EVERY_MS };
});
