/* GUROST Business Assistant 2.0, phase 1: the 8 floating bot widgets.
   A slim strip of 8 small avatars on the right edge. Tap one to open its conversation, drag the grip to move the
   strip, swipe an avatar to the right to put it away, tap the grip button to bring them all back. Position and
   put-away bots are remembered in this browser (storage is optional: everything works without it).
   Pure helpers are exported for tests; the DOM part only runs in a browser. All text goes in with textContent. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else {
    root.GurostBotWidgets = api;
    if (typeof document !== "undefined") api.autoMount();
  }
})(typeof self !== "undefined" ? self : this, function () {
  var STORE_KEY = "gurost_bot_widgets";
  var STRIP_W = 52;
  var SWIPE_PX = 56;
  var TAP_SLOP = 8;

  // The 8 faces (public/avatars/<img>.png). `opens` is the first line each one says; phase 2 moves voice and opinions
  // into lib/bot-personalities.js, this table only carries what the widget needs to show.
  var BOTS = [
    { id: "planner", name: "Planner", img: "planner", color: "#3b6fd4", role: "Plans the work and the next step", opens: "Right, let me think about this properly." },
    { id: "designer", name: "Designer", img: "designer", color: "#fb7185", role: "Look, layout and colour", opens: "Oh, I've got ideas for this." },
    { id: "industry", name: "Industry", img: "industry", color: "#2dd4bf", role: "Knows your kind of business", opens: "I know this industry." },
    { id: "builder", name: "Builder", img: "builder", color: "#fb923c", role: "Builds and fixes the pages", opens: "Let's build it." },
    { id: "pulse", name: "Pulse", img: "pulse", color: "#fbbf24", role: "Watches for problems", opens: "I'm watching. All good." },
    { id: "research", name: "Research", img: "research", color: "#a78bfa", role: "Finds things out", opens: "Give me a minute, I'll find it." },
    { id: "review", name: "Review", img: "review", color: "#f87171", role: "Checks the quality", opens: "Let me check this properly." },
    { id: "launch", name: "Launch", img: "launch", color: "#4ade80", role: "Gets you live", opens: "Ready when you are." }
  ];
  var BOT_IDS = BOTS.map(function (b) { return b.id; });

  function defaultState() { return { top: null, hidden: [], collapsed: false }; }

  /** Keeps the strip fully on screen and clear of the Pulse ball (bottom-right, ~72px). */
  function clampTop(top, viewportH, stripH) {
    var minTop = 8;
    var maxTop = Math.max(minTop, viewportH - stripH - 88);
    var t = typeof top === "number" && isFinite(top) ? top : Math.round(viewportH * 0.18);
    return Math.min(Math.max(t, minTop), maxTop);
  }

  function loadState(storage) {
    var s = defaultState();
    try {
      var raw = storage && storage.getItem(STORE_KEY);
      if (!raw) return s;
      var v = JSON.parse(raw);
      if (!v || typeof v !== "object") return s;
      if (typeof v.top === "number" && isFinite(v.top)) s.top = v.top;
      if (Array.isArray(v.hidden)) s.hidden = v.hidden.filter(function (id) { return BOT_IDS.indexOf(id) >= 0; });
      s.collapsed = v.collapsed === true;
    } catch (e) { /* unreadable storage: use the defaults */ }
    return s;
  }
  function saveState(storage, state) {
    try { if (storage) storage.setItem(STORE_KEY, JSON.stringify({ top: state.top, hidden: state.hidden, collapsed: !!state.collapsed })); return true; }
    catch (e) { return false; }
  }

  /** "tap", "dismiss" (swiped right far enough, mostly sideways) or "none". */
  function gesture(dx, dy) {
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax <= TAP_SLOP && ay <= TAP_SLOP) return "tap";
    if (dx >= SWIPE_PX && ax > ay * 1.5) return "dismiss";
    return "none";
  }

  function visibleBots(state) { return BOTS.filter(function (b) { return state.hidden.indexOf(b.id) < 0; }); }
  function botById(id) { for (var i = 0; i < BOTS.length; i++) if (BOTS[i].id === id) return BOTS[i]; return null; }

  // ---- browser part ------------------------------------------------------------------------------------------

  var handlers = {}; // botId -> async function (text) -> reply text
  function setHandler(id, fn) { if (botById(id) && typeof fn === "function") handlers[id] = fn; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function projectIdNow() {
    try { if (window.gurostBuilder && window.gurostBuilder.getProjectId) return window.gurostBuilder.getProjectId() || null; } catch (e) {}
    try { if (window.LastProject) return window.LastProject.recall(window.localStorage); } catch (e) {}
    return null;
  }

  // The default conversation: the Business Assistant route, which needs a paid plan and a project. Every failure is
  // shown in plain words, never swallowed.
  async function defaultReply(bot, text) {
    if (!window.GurostAPI || !window.GurostAPI.call) throw new Error("Chat is not connected on this page yet. Open the builder or your dashboard.");
    var pid = projectIdNow();
    if (!pid) throw new Error("Open a project first, then I can work on it with you.");
    var data = await window.GurostAPI.call("/api/assistant", { method: "POST", body: { projectId: pid, task: "(" + bot.name + ") " + text } });
    var out = data && data.output;
    var reply = out && (out.content || out.text);
    if (!reply) throw new Error("I got an empty answer. Please try again.");
    return typeof reply === "string" ? reply : JSON.stringify(reply);
  }

  function mount(opts) {
    opts = opts || {};
    if (document.getElementById("gurostBotWidgets")) return null;
    var storage = null;
    try { storage = window.localStorage; } catch (e) {}
    var state = loadState(storage);
    var openId = null;

    var host = el("div");
    host.id = "gurostBotWidgets";
    host.setAttribute("role", "region");
    host.setAttribute("aria-label", "Your assistant team");
    var strip = el("div", "gbw-strip");
    var grip = el("button", "gbw-grip");
    grip.type = "button";
    grip.setAttribute("aria-label", "Move or fold the assistant strip. Drag to move, tap to fold.");
    grip.appendChild(el("span", "gbw-grip-dots"));
    var list = el("div", "gbw-list");
    var restore = el("button", "gbw-restore", "+");
    restore.type = "button";
    restore.setAttribute("aria-label", "Bring back all assistants");
    strip.appendChild(grip);
    strip.appendChild(list);
    strip.appendChild(restore);
    var panel = el("section", "gbw-panel");
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");
    host.appendChild(strip);
    host.appendChild(panel);
    document.body.appendChild(host);

    function place() {
      state.top = clampTop(state.top, window.innerHeight, strip.offsetHeight || 420);
      host.style.setProperty("--gbw-top", state.top + "px");
    }
    function persist() { saveState(storage, state); }

    function renderStrip() {
      list.textContent = "";
      visibleBots(state).forEach(function (b, i) {
        var btn = el("button", "gbw-bot");
        btn.type = "button";
        btn.dataset.bot = b.id;
        btn.style.setProperty("--gbw-c", b.color);
        btn.style.setProperty("--gbw-d", (i * 0.35).toFixed(2) + "s");
        btn.setAttribute("aria-label", b.name + ": " + b.role);
        if (openId === b.id) btn.classList.add("gbw-open");
        var img = el("img");
        img.src = "/avatars/" + b.img + ".png";
        img.alt = "";
        img.width = 36; img.height = 36;
        img.draggable = false;
        btn.appendChild(img);
        wireBot(btn, b);
        list.appendChild(btn);
      });
      restore.hidden = state.hidden.length === 0;
      host.classList.toggle("gbw-collapsed", !!state.collapsed);
      grip.setAttribute("aria-expanded", state.collapsed ? "false" : "true");
    }

    function wireBot(btn, bot) {
      var sx = 0, sy = 0, dx = 0, dy = 0, down = false;
      btn.addEventListener("pointerdown", function (e) { down = true; sx = e.clientX; sy = e.clientY; dx = 0; dy = 0; try { btn.setPointerCapture(e.pointerId); } catch (x) {} });
      btn.addEventListener("pointermove", function (e) {
        if (!down) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        if (dx > TAP_SLOP && Math.abs(dx) > Math.abs(dy)) btn.style.transform = "translateX(" + Math.min(dx, 90) + "px)";
      });
      function end() {
        if (!down) return;
        down = false;
        btn.style.transform = "";
        var g = gesture(dx, dy);
        if (g === "tap") toggleBot(bot.id);
        else if (g === "dismiss") dismissBot(bot.id);
      }
      btn.addEventListener("pointerup", end);
      btn.addEventListener("pointercancel", function () { down = false; btn.style.transform = ""; });
      btn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleBot(bot.id); }
        else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); dismissBot(bot.id); }
      });
    }

    function dismissBot(id) {
      if (state.hidden.indexOf(id) < 0) state.hidden.push(id);
      if (openId === id) closePanel();
      persist(); renderStrip(); place();
    }
    function restoreAll() { state.hidden = []; persist(); renderStrip(); place(); }
    restore.addEventListener("click", restoreAll);

    function closePanel() { openId = null; panel.hidden = true; panel.textContent = ""; renderStrip(); }

    function toggleBot(id) {
      if (openId === id) { closePanel(); return; }
      openId = id;
      openPanel(botById(id));
      renderStrip();
    }

    function addMsg(log, who, text, cls) {
      var m = el("div", "gbw-msg " + cls);
      m.appendChild(el("span", "gbw-who", who));
      m.appendChild(el("p", "", text));
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }

    function openPanel(bot) {
      panel.textContent = "";
      panel.hidden = false;
      panel.style.setProperty("--gbw-c", bot.color);
      var head = el("header", "gbw-head");
      var img = el("img"); img.src = "/avatars/" + bot.img + ".png"; img.alt = ""; img.width = 40; img.height = 40;
      var t = el("div", "gbw-title");
      t.appendChild(el("strong", "", bot.name));
      t.appendChild(el("span", "", bot.role));
      var x = el("button", "gbw-x", "×"); x.type = "button"; x.setAttribute("aria-label", "Close " + bot.name);
      x.addEventListener("click", closePanel);
      head.appendChild(img); head.appendChild(t); head.appendChild(x);
      var log = el("div", "gbw-log");
      addMsg(log, bot.name, bot.opens, "gbw-bot-msg");
      var form = el("form", "gbw-form");
      var input = el("input"); input.type = "text"; input.maxLength = 600; input.placeholder = "Ask " + bot.name + "…";
      input.setAttribute("aria-label", "Message to " + bot.name);
      input.autocomplete = "off";
      var send = el("button", "gbw-send", "Send"); send.type = "submit";
      form.appendChild(input); form.appendChild(send);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var text = input.value.trim();
        if (!text) return;
        input.value = ""; send.disabled = true;
        addMsg(log, "You", text, "gbw-me-msg");
        var wait = addMsg(log, bot.name, "Working on it…", "gbw-bot-msg gbw-wait");
        host.classList.add("gbw-busy");
        Promise.resolve().then(function () { return (handlers[bot.id] || function (t2) { return defaultReply(bot, t2); })(text); })
          .then(function (reply) { wait.classList.remove("gbw-wait"); wait.lastChild.textContent = String(reply); })
          .catch(function (err) { wait.classList.remove("gbw-wait"); wait.classList.add("gbw-err"); wait.lastChild.textContent = (err && err.message) || "That did not work. Please try again."; })
          .then(function () { send.disabled = false; host.classList.remove("gbw-busy"); log.scrollTop = log.scrollHeight; });
      });
      panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);
      if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) input.focus();
    }

    // Grip: drag moves the strip up and down, a tap folds it to the grip alone.
    (function wireGrip() {
      var down = false, sy = 0, startTop = 0, moved = 0;
      grip.addEventListener("pointerdown", function (e) { down = true; sy = e.clientY; startTop = state.top; moved = 0; host.classList.add("gbw-dragging"); try { grip.setPointerCapture(e.pointerId); } catch (x) {} });
      grip.addEventListener("pointermove", function (e) {
        if (!down) return;
        var d = e.clientY - sy; moved = Math.max(moved, Math.abs(d));
        state.top = startTop + d; place();
      });
      function end() {
        if (!down) return;
        down = false; host.classList.remove("gbw-dragging");
        if (moved <= TAP_SLOP) { state.collapsed = !state.collapsed; state.top = startTop; if (state.collapsed) closePanel(); renderStrip(); }
        place(); persist();
      }
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", end);
      grip.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp") { e.preventDefault(); state.top -= 24; place(); persist(); }
        else if (e.key === "ArrowDown") { e.preventDefault(); state.top += 24; place(); persist(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); state.collapsed = !state.collapsed; if (state.collapsed) closePanel(); renderStrip(); persist(); }
      });
    })();

    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && openId) closePanel(); });
    window.addEventListener("resize", place);
    renderStrip(); place();
    return { host: host, open: toggleBot, close: closePanel, restore: restoreAll, state: function () { return JSON.parse(JSON.stringify(state)); } };
  }

  function autoMount() {
    function go() { try { mount(); } catch (e) { if (window.console) console.warn("[bot-widgets] could not start: " + e.message); } }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }

  return { BOTS: BOTS, STORE_KEY: STORE_KEY, clampTop: clampTop, loadState: loadState, saveState: saveState, gesture: gesture, visibleBots: visibleBots, mount: mount, setHandler: setHandler, autoMount: autoMount };
});
