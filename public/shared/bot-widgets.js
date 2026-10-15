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
    { id: "planner", rate: 0.96, name: "Planner", img: "planner", color: "#3b6fd4", role: "Plans the work and the next step", opens: "Right, let me think about this properly." },
    { id: "designer", rate: 1.04, name: "Designer", img: "designer", color: "#fb7185", role: "Look, layout and colour", opens: "Oh, I've got ideas for this." },
    { id: "industry", rate: 1.0, name: "Industry", img: "industry", color: "#2dd4bf", role: "Knows your kind of business", opens: "I know this industry." },
    { id: "builder", rate: 1.04, name: "Builder", img: "builder", color: "#fb923c", role: "Builds and fixes the pages", opens: "Let's build it." },
    { id: "pulse", rate: 0.94, name: "Pulse", img: "pulse", color: "#fbbf24", role: "Watches for problems", opens: "I'm watching. All good." },
    { id: "research", rate: 1.06, name: "Research", img: "research", color: "#a78bfa", role: "Finds things out", opens: "Give me a minute, I'll find it." },
    { id: "review", rate: 0.98, name: "Review", img: "review", color: "#f87171", role: "Checks the quality", opens: "Let me check this properly." },
    { id: "launch", rate: 1.02, name: "Launch", img: "launch", color: "#4ade80", role: "Gets you live", opens: "Ready when you are." }
  ];
  var STATES = ["idle", "working", "speaking", "alert"];
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

  // The default conversation: this bot's own chat route (its personality, drafts and advice only). Every failure is
  // shown in plain words, never swallowed. A project is optional: it adds context when the page has one.
  async function defaultReply(bot, text, history) {
    if (!window.GurostAPI || !window.GurostAPI.call) throw new Error("Chat is not connected on this page yet. Open the builder or your dashboard.");
    var body = { message: text, history: history || [] };
    var pid = projectIdNow();
    if (pid) body.projectId = pid;
    var data = await window.GurostAPI.call("/api/bots/" + bot.id + "/chat", { method: "POST", body: body });
    if (!data || !data.reply) throw new Error("I got an empty answer. Please try again.");
    return { reply: String(data.reply), catchphrase: data.catchphrase ? String(data.catchphrase) : "", memoryUsed: Number(data.memoryUsed) || 0, memoryPaused: data.memoryPaused === true };
  }

  var audioNow = null;
  // Speaks text in the bot's own voice (the server picks the voice). Resolves when it ends; rejects with a plain message.
  async function speakAs(bot, text, onStart) {
    var f = (window.GurostAPI && window.GurostAPI.fetch) || window.fetch.bind(window);
    var res = await f("/api/bots/" + bot.id + "/speak", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ text: text }) });
    if (!res.ok) {
      var msg = "I could not speak just now. You can read the answer instead.";
      try { var j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }
    var url = URL.createObjectURL(await res.blob());
    if (audioNow) { try { audioNow.pause(); } catch (e) {} }
    var a = new Audio(url);
    audioNow = a;
    a.playbackRate = bot.rate || 1;
    if ("preservesPitch" in a) a.preservesPitch = false; // pitch follows the bot's rate: a slower bot sounds lower
    return new Promise(function (resolve, reject) {
      a.onended = function () { URL.revokeObjectURL(url); resolve(); };
      a.onerror = function () { URL.revokeObjectURL(url); reject(new Error("I could not play that. You can read the answer instead.")); };
      a.play().then(function () { if (onStart) onStart(); }).catch(function () { reject(new Error("Your browser blocked the sound. Tap Listen again.")); });
    });
  }

  function mount(opts) {
    opts = opts || {};
    if (document.getElementById("gurostBotWidgets")) return null;
    var storage = null;
    try { storage = window.localStorage; } catch (e) {}
    var state = loadState(storage);
    var openId = null;
    var states = {}; // botId -> "working" | "speaking" | "alert" (idle when absent)
    var alerts = {}; // botId -> { text, why, id } waiting for the person
    var notes = {}; // botId -> true while a quiet note is waiting
    var histories = {}; // botId -> last messages, for the model

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
        btn.dataset.state = states[b.id] || "idle";
        if (notes[b.id]) btn.dataset.note = "1";
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

    function setState(id, st) {
      if (STATES.indexOf(st) < 0 || !botById(id)) return false;
      if (st === "idle") delete states[id]; else states[id] = st;
      var b = list.querySelector('[data-bot="' + id + '"]');
      if (b) b.dataset.state = st;
      return true;
    }
    // A bot speaks up: its avatar flashes (or, for a quiet note, shows a steady dot) until the person opens it, and the
    // message waits inside. opts: { why: "the evidence line", id: "nudge id", soft: true for a quiet note }.
    function alertBot(id, text, opts) {
      opts = opts || {};
      if (!botById(id)) return false;
      if (state.hidden.indexOf(id) >= 0) { state.hidden.splice(state.hidden.indexOf(id), 1); persist(); renderStrip(); }
      alerts[id] = { text: String(text || botById(id).opens).slice(0, 500), why: opts.why ? String(opts.why).slice(0, 300) : "", id: opts.id || null };
      var b = list.querySelector('[data-bot="' + id + '"]');
      if (opts.soft) { notes[id] = true; if (b) b.dataset.note = "1"; }
      else setState(id, "alert");
      return true;
    }

    function closePanel() { openId = null; panel.hidden = true; panel.textContent = ""; renderStrip(); }

    function toggleBot(id) {
      if (openId === id) { closePanel(); return; }
      openId = id;
      var pending = alerts[id]; delete alerts[id]; delete notes[id];
      if (states[id] === "alert") setState(id, "idle");
      openPanel(botById(id), pending);
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

    // ---- proactive nudges (phase 4): ask the server every minute whether a bot has something to say ----
    var nudgeMode = "normal", knownNudges = {};
    function nudgeOk() { try { return !!(window.GurostAPI && window.GurostAPI.call && /(?:^|;\s*)gurost_li=1(?:;|$)/.test(document.cookie)); } catch (e) { return false; } }
    function nudgeCall(path, method, body) { if (!nudgeOk()) return Promise.resolve(null); return window.GurostAPI.call(path, { method: method || "GET", body: body }).catch(function () { return null; }); }
    function pollNudges() {
      if (!nudgeOk() || document.visibilityState === "hidden") return;
      var pid = projectIdNow();
      nudgeCall("/api/bots/nudges" + (pid ? "?projectId=" + encodeURIComponent(pid) : "")).then(function (r) {
        if (!r) return;
        if (r.mode) nudgeMode = r.mode;
        (r.nudges || []).forEach(function (n) {
          if (!n || !n.id || knownNudges[n.id]) return;
          knownNudges[n.id] = true;
          alertBot(n.bot, n.text, { why: n.why, id: n.id, soft: n.severity !== "alert" });
        });
      });
    }
    setTimeout(pollNudges, 3000);
    setInterval(pollNudges, 60000);

    // ---- memory (phase 5): earlier conversation with this bot, and the person's controls ----
    var earlierShown = {};
    function loadEarlier(bot, log) {
      if (earlierShown[bot.id] || (histories[bot.id] || []).length || !nudgeOk()) return;
      earlierShown[bot.id] = true;
      var pid = projectIdNow();
      nudgeCall("/api/bots/memory?bot=" + bot.id + (pid ? "&projectId=" + encodeURIComponent(pid) : "")).then(function (r) {
        if (!r || !r.turns || !r.turns.length || openId !== bot.id || (histories[bot.id] || []).length) return;
        histories[bot.id] = r.turns.map(function (t) { return { role: t.role, content: t.content }; });
        var first = log.firstChild, bar = el("div", "gbw-earlier", "Earlier with " + bot.name);
        log.insertBefore(bar, first ? first.nextSibling : null);
        var anchor = bar.nextSibling;
        r.turns.forEach(function (t) {
          var m = el("div", "gbw-msg gbw-old " + (t.role === "user" ? "gbw-me-msg" : "gbw-bot-msg"));
          m.appendChild(el("span", "gbw-who", t.role === "user" ? "You" : bot.name)); m.appendChild(el("p", "", String(t.content)));
          log.insertBefore(m, anchor);
        });
      });
    }
    function openMemory(bot) {
      var m = document.createElement("div"); m.className = "gbc-back";
      var box = el("div", "gbc-box gbw-mem"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "What " + bot.name + " remembers");
      m.appendChild(box); document.body.appendChild(m);
      function close() { if (m.parentNode) m.parentNode.removeChild(m); }
      m.addEventListener("click", function (e) { if (e.target === m) close(); });
      var h = el("h2", "", "What " + bot.name + " remembers"); box.appendChild(h);
      box.appendChild(el("p", "gbc-small", "Notes the team uses to avoid starting cold. You are in charge: forget any of it, or pause memory. Recent chats are kept 30 days, lasting facts a year."));
      var pausedRow = el("label", "gbc-check"), pcb = el("input"); pcb.type = "checkbox";
      pausedRow.appendChild(pcb); pausedRow.appendChild(el("span", "", "Pause memory (nothing is read or saved while this is on)"));
      box.appendChild(pausedRow);
      var listEl = el("div", "gbw-mem-list"); box.appendChild(listEl);
      var actions = el("div", "gbc-actions");
      var forgetBot = el("button", "gbc-btn gbc-ghost", "Forget everything " + bot.name + " knows"), forgetAll = el("button", "gbc-btn gbc-ghost", "Forget everything the team knows"), done = el("button", "gbc-btn gbc-go", "Done");
      [forgetBot, forgetAll, done].forEach(function (b) { b.type = "button"; });
      actions.appendChild(forgetBot); actions.appendChild(forgetAll); actions.appendChild(done); box.appendChild(actions);
      done.addEventListener("click", close);
      var scopeWord = { shared: "Team", bot: bot.name, project: "This project" };
      function render(items, msg) {
        listEl.textContent = "";
        if (msg) { listEl.appendChild(el("p", "gbc-small", msg)); return; }
        if (!items.length) { listEl.appendChild(el("p", "gbc-small", "Nothing saved yet.")); return; }
        items.forEach(function (it) {
          var row = el("div", "gbw-mem-row"), t = el("div", "gbw-mem-text");
          t.appendChild(el("b", "", scopeWord[it.scope] || "Team")); t.appendChild(document.createTextNode(" " + String(it.key).replace(/^said:/, "I told you: ") + ": " + it.value));
          var f = el("button", "gbc-btn gbc-ghost gbw-mem-x", "Forget"); f.type = "button"; f.setAttribute("aria-label", "Forget this note");
          f.addEventListener("click", function () { f.disabled = true; nudgeCall("/api/bots/memory/" + it.id, "DELETE").then(function (r) { if (r) row.parentNode.removeChild(row); else f.disabled = false; }); });
          row.appendChild(t); row.appendChild(f); listEl.appendChild(row);
        });
      }
      function reload() {
        var pid = projectIdNow();
        render([], "Loading\u2026");
        nudgeCall("/api/bots/memory?bot=" + bot.id + (pid ? "&projectId=" + encodeURIComponent(pid) : "")).then(function (r) {
          if (!r) { render([], "I could not load this just now. Please try again."); return; }
          pcb.checked = r.paused === true;
          render(r.items || [], r.paused ? "Memory is paused, so nothing is shown or used." : r.notReady ? "Memory is not switched on yet." : "");
        });
      }
      pcb.addEventListener("change", function () { nudgeCall("/api/memory/settings", "PUT", { paused: pcb.checked }).then(function (r) { if (!r) pcb.checked = !pcb.checked; else reload(); }); });
      forgetBot.addEventListener("click", function () { nudgeCall("/api/bots/memory?bot=" + bot.id, "DELETE").then(function (r) { if (r) { histories[bot.id] = []; reload(); } }); });
      forgetAll.addEventListener("click", function () { nudgeCall("/api/bots/memory", "DELETE").then(function (r) { if (r) { histories = {}; reload(); } }); });
      reload(); done.focus();
    }

    // A small Listen button under a bot message: plays it in that bot's own voice.
    function listenable(m, bot) {
      var b = el("button", "gbw-listen", "Listen");
      b.type = "button";
      b.setAttribute("aria-label", "Listen to " + bot.name);
      b.addEventListener("click", function () {
        b.disabled = true; setState(bot.id, "working");
        speakAs(bot, m.querySelector("p").textContent, function () { setState(bot.id, "speaking"); })
          .catch(function (err) { var e2 = el("span", "gbw-listen-err", (err && err.message) || "I could not speak just now."); m.appendChild(e2); })
          .then(function () { b.disabled = false; setState(bot.id, "idle"); });
      });
      m.appendChild(b);
    }

    // The call screen lives in its own script, loaded only when someone taps "Video call".
    function startCall(bot) {
      function go() { window.GurostBotCall.start(bot, { setState: setState }); }
      if (window.GurostBotCall) return go();
      var sc = document.createElement("script");
      sc.src = "/shared/bot-video-call.js";
      sc.onload = go;
      sc.onerror = function () { var log = panel.querySelector(".gbw-log"); if (log) addMsg(log, bot.name, "I could not load the call screen. Please try again.", "gbw-bot-msg gbw-err"); };
      document.head.appendChild(sc);
    }

    function openPanel(bot, pending) {
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
      var vc = el("button", "gbw-call", "Video call"); vc.type = "button"; vc.setAttribute("aria-label", "Start a video call with " + bot.name);
      vc.addEventListener("click", function () { startCall(bot); });
      head.appendChild(img); head.appendChild(t); head.appendChild(vc); head.appendChild(x);
      var log = el("div", "gbw-log");
      // A waiting alert replaces the opener: "I'm watching. All good." must never sit above a problem.
      if (!pending) addMsg(log, bot.name, bot.opens, "gbw-bot-msg");
      if (pending) {
        var fm = addMsg(log, bot.name, pending.text, "gbw-bot-msg gbw-flagged");
        if (pending.why) fm.appendChild(el("span", "gbw-why", "Because: " + pending.why));
        listenable(fm, bot);
        if (pending.id) {
          nudgeCall("/api/bots/nudges/" + pending.id + "/seen", "POST");
          var gotit = el("button", "gbw-listen", "Got it"); gotit.type = "button";
          gotit.addEventListener("click", function () { nudgeCall("/api/bots/nudges/" + pending.id + "/dismissed", "POST"); gotit.disabled = true; gotit.textContent = "Noted"; });
          fm.appendChild(gotit);
        }
      }
      (histories[bot.id] || []).forEach(function (h) { var m = addMsg(log, h.role === "user" ? "You" : bot.name, h.content, h.role === "user" ? "gbw-me-msg" : "gbw-bot-msg"); if (h.role !== "user") listenable(m, bot); });
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
        var wait = addMsg(log, bot.name, "Working on it\u2026", "gbw-bot-msg gbw-wait");
        host.classList.add("gbw-busy"); setState(bot.id, "working");
        var hist = (histories[bot.id] = histories[bot.id] || []);
        Promise.resolve().then(function () { return (handlers[bot.id] || function (t2) { return defaultReply(bot, t2, hist.slice(-10)); })(text); })
          .then(function (r) {
            var reply = r && typeof r === "object" ? String(r.reply) : String(r);
            wait.classList.remove("gbw-wait"); wait.lastChild.textContent = reply;
            hist.push({ role: "user", content: text }, { role: "assistant", content: reply });
            if (hist.length > 20) hist.splice(0, hist.length - 20);
            if (r && r.catchphrase) wait.appendChild(el("span", "gbw-catch", r.catchphrase));
            if (r && r.memoryUsed > 0) wait.appendChild(el("span", "gbw-why", "Used " + r.memoryUsed + " saved note" + (r.memoryUsed === 1 ? "" : "s") + " (see What I remember)."));
            else if (r && r.memoryPaused) wait.appendChild(el("span", "gbw-why", "Memory is paused: nothing was read or saved."));
            listenable(wait, bot);
          })
          .catch(function (err) { wait.classList.remove("gbw-wait"); wait.classList.add("gbw-err"); wait.lastChild.textContent = (err && err.message) || "That did not work. Please try again."; if (state.hidden.indexOf(bot.id) < 0) setState(bot.id, "alert"); setTimeout(function () { if (states[bot.id] === "alert" && !alerts[bot.id]) setState(bot.id, "idle"); }, 1800); })
          .then(function () { send.disabled = false; host.classList.remove("gbw-busy"); if (states[bot.id] === "working") setState(bot.id, "idle"); log.scrollTop = log.scrollHeight; });
      });
      var speak = el("label", "gbw-speak"), sel = el("select");
      speak.appendChild(el("span", "", "Speak up unasked:"));
      [["normal", "Normal"], ["quiet", "Quiet"], ["off", "Off"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; if (o[0] === nudgeMode) op.selected = true; sel.appendChild(op); });
      sel.setAttribute("aria-label", "How often the assistants speak up on their own");
      sel.addEventListener("change", function () { nudgeMode = sel.value; nudgeCall("/api/bots/nudges/settings", "PUT", { mode: sel.value }); });
      speak.appendChild(sel);
      var memBtn = el("button", "gbw-call", "What I remember"); memBtn.type = "button"; memBtn.addEventListener("click", function () { openMemory(bot); });
      speak.insertBefore(memBtn, speak.firstChild);
      panel.appendChild(head); panel.appendChild(log); panel.appendChild(form); panel.appendChild(speak);
      loadEarlier(bot, log);
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
    return { host: host, setState: setState, alert: alertBot, open: toggleBot, close: closePanel, restore: restoreAll, state: function () { return JSON.parse(JSON.stringify(state)); } };
  }

  var api = null;
  function autoMount() {
    function go() { try { api.instance = mount(); } catch (e) { if (window.console) console.warn("[bot-widgets] could not start: " + e.message); } }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }

  api = { BOTS: BOTS, STORE_KEY: STORE_KEY, clampTop: clampTop, loadState: loadState, saveState: saveState, gesture: gesture, visibleBots: visibleBots, STATES: STATES, mount: mount, setHandler: setHandler, autoMount: autoMount,
    // For other scripts (phase 4 proactive engine): make a bot flash and speak up, or change its animation state.
    alert: function (id, text, opts) { return api.instance ? api.instance.alert(id, text, opts) : false; },
    setState: function (id, st) { return api.instance ? api.instance.setState(id, st) : false; } };
  return api;
});
