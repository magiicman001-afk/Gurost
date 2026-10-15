/* GUROST bot video call (Business Assistant 2.0, phase 3).
   Paid plans only (the server decides). The room is LiveKit's: your camera, microphone and screen share go into it.
   The bot is not inside the room. This page listens to you (browser microphone), sends what you said to the bot's own
   chat route, and plays the bot's own voice back, with its avatar glowing while it speaks. Nothing here uploads audio
   or video anywhere except the short speech clips sent to be turned into text (the same service as the Pulse mic).
   Recording is OFF unless you agree in the box that appears first, and the file is saved on YOUR device only.
   Pure helpers are exported for tests; all text is added with textContent. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GurostBotCall = api;
})(typeof self !== "undefined" ? self : this, function () {
  var LIVEKIT_SRC = "https://cdn.jsdelivr.net/npm/livekit-client@2.5.7/dist/livekit-client.umd.js";
  var SPEECH_LEVEL = 0.03;     // microphone level (0 to 1) that counts as speaking
  var SILENCE_MS = 1000;       // this long quiet after speech = you finished your turn
  var MIN_SPEECH_MS = 350;     // shorter than this is a cough, not a turn
  var WARN_SECONDS = 60;

  function isSpeech(level) { return typeof level === "number" && level >= SPEECH_LEVEL; }
  /** Has the person finished a turn? speechMs of speech so far, quietMs of quiet since. */
  function turnFinished(speechMs, quietMs) { return speechMs >= MIN_SPEECH_MS && quietMs >= SILENCE_MS; }
  function clock(sec) { sec = Math.max(0, Math.floor(sec || 0)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); }
  /** Seconds left in the call, from the server's minutes (the smaller of the monthly minutes left and the per-call limit). */
  function allowedSeconds(minutesLeft, maxCallMinutes) { return Math.max(0, Math.min(Number(minutesLeft) || 0, Number(maxCallMinutes) || 0)) * 60; }
  function recorderMime(MR) {
    var list = ["audio/webm", "audio/mp4", "audio/ogg"];
    if (!MR || !MR.isTypeSupported) return "";
    for (var i = 0; i < list.length; i++) if (MR.isTypeSupported(list[i])) return list[i];
    return "";
  }
  function fileNameFor(botName, date) { return "gurost-call-" + String(botName).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + date.toISOString().slice(0, 16).replace(/[:T]/g, "-") + ".webm"; }

  // ---- browser part ------------------------------------------------------------------------------------------

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function call(path, opts) { return window.GurostAPI.call(path, opts); }
  function apiFetch() { return (window.GurostAPI && window.GurostAPI.fetch) || window.fetch.bind(window); }

  var loading = null;
  function loadLiveKit() {
    if (window.LivekitClient) return Promise.resolve(window.LivekitClient);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = LIVEKIT_SRC; s.async = true;
      s.onload = function () { window.LivekitClient ? resolve(window.LivekitClient) : reject(new Error("The call tool did not load.")); };
      s.onerror = function () { loading = null; reject(new Error("I could not load the call tool. Check your connection and try again.")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  var active = null;

  /** Shows the reason in a small notice if calls are not available; otherwise opens the call screen. */
  async function start(bot, hooks) {
    hooks = hooks || {};
    if (active) return false;
    var st;
    try { st = await call("/api/bots/call/status"); }
    catch (e) { notice(bot, (e && e.message) || "I could not check calls just now."); return false; }
    if (!st.available) { notice(bot, st.message || "Video calls are not available right now."); return false; }
    var consent = await askConsent(bot, st);
    if (!consent) return false;
    return begin(bot, st, consent, hooks);
  }

  function modal(cls) {
    var back = el("div", "gbc-back"), box = el("div", "gbc-box " + (cls || ""));
    box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
    back.appendChild(box); document.body.appendChild(back);
    return { back: back, box: box, close: function () { if (back.parentNode) back.parentNode.removeChild(back); } };
  }
  function notice(bot, text) {
    var m = modal("gbc-notice");
    m.box.setAttribute("aria-label", bot.name + " call");
    m.box.appendChild(el("p", "", text));
    var ok = el("button", "gbc-btn", "OK"); ok.type = "button"; ok.addEventListener("click", m.close);
    m.box.appendChild(ok); ok.focus();
  }

  // Before anything starts: what the call is, what is kept, and the recording choice (off unless ticked).
  function askConsent(bot, st) {
    return new Promise(function (resolve) {
      var m = modal("gbc-consent");
      m.box.setAttribute("aria-label", "Start a call with " + bot.name);
      m.box.appendChild(el("h2", "", "Call " + bot.name));
      m.box.appendChild(el("p", "", "Your browser will ask to use your microphone (and your camera, if you turn it on). " + bot.name + " is an AI: what you say is turned into text to answer you."));
      m.box.appendChild(el("p", "gbc-small", "You have " + st.minutesLeft + " call minutes left this month. One call lasts up to " + st.maxCallMinutes + " minutes. We keep who you called and for how long, never the audio, video or words."));
      var row = el("label", "gbc-check"), cb = el("input"); cb.type = "checkbox";
      row.appendChild(cb); row.appendChild(el("span", "", "Record this call. The recording is saved on this device only. I understand it will include my voice and the bot's voice."));
      m.box.appendChild(row);
      var go = el("button", "gbc-btn gbc-go", "Start call"), no = el("button", "gbc-btn gbc-ghost", "Not now");
      go.type = "button"; no.type = "button";
      go.addEventListener("click", function () { m.close(); resolve({ record: cb.checked }); });
      no.addEventListener("click", function () { m.close(); resolve(null); });
      var actions = el("div", "gbc-actions"); actions.appendChild(go); actions.appendChild(no); m.box.appendChild(actions);
      go.focus();
    });
  }

  async function begin(bot, st, consent, hooks) {
    var set = function (s) { try { if (hooks.setState) hooks.setState(bot.id, s); else if (window.GurostBotWidgets) window.GurostBotWidgets.setState(bot.id, s); } catch (e) {} };
    var info;
    try { info = await call("/api/bots/" + bot.id + "/call/start", { method: "POST", body: { recordingConsent: consent.record === true } }); }
    catch (e) { notice(bot, (e && e.message) || "I could not start the call."); return false; }

    var ui = buildScreen(bot);
    var c = { bot: bot, info: info, ui: ui, room: null, ended: false, listening: false, busy: false, history: [], recorder: null, chunks: [], recording: false, startedAt: Date.now(), limit: allowedSeconds(info.minutesLeft, info.maxCallMinutes), set: set, tracks: [], ctx: null };
    active = c;
    ui.status("Connecting…");
    try {
      var LK = await loadLiveKit();
      c.room = new LK.Room({ adaptiveStream: true, dynacast: true });
      await c.room.connect(info.url, info.token);
      await c.room.localParticipant.setMicrophoneEnabled(true);
    } catch (e) {
      ui.status((e && e.message) || "I could not connect the call.");
      await finish(c);
      notice(bot, (e && e.message) || "I could not connect the call.");
      return false;
    }
    wireControls(c);
    c.timer = setInterval(function () { tick(c); }, 1000);
    window.addEventListener("pagehide", c.onHide = function () { try { navigator.sendBeacon("/api/bots/call/" + info.callId + "/end"); } catch (e) {} });
    try { await startListening(c); } catch (e) { ui.caption("system", (e && e.message) || "I cannot hear your microphone."); }
    if (consent.record) startRecording(c);
    ui.status("Connected");
    say(c, bot.opens);
    return true;
  }

  function buildScreen(bot) {
    var root = el("div", "gbc-screen");
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-label", "Call with " + bot.name);
    root.style.setProperty("--gbc-c", bot.color);
    var top = el("div", "gbc-top"), title = el("strong", "", bot.name), timer = el("span", "gbc-timer", "0:00"), rec = el("span", "gbc-rec", "REC");
    rec.hidden = true; top.appendChild(title); top.appendChild(timer); top.appendChild(rec);
    var stage = el("div", "gbc-stage"), ring = el("div", "gbc-ring"), img = el("img"); img.src = "/avatars/" + bot.img + ".png"; img.alt = ""; img.width = 160; img.height = 160;
    ring.appendChild(img); stage.appendChild(ring);
    var status = el("div", "gbc-status", ""); status.setAttribute("aria-live", "polite"); stage.appendChild(status);
    var self = el("div", "gbc-self"); self.hidden = true;
    var caps = el("div", "gbc-caps"); caps.setAttribute("aria-live", "polite");
    var bar = el("div", "gbc-bar");
    root.appendChild(top); root.appendChild(stage); root.appendChild(self); root.appendChild(caps); root.appendChild(bar);
    document.body.appendChild(root);
    document.body.classList.add("gbc-open");
    return {
      root: root, bar: bar, self: self, ring: ring, timer: timer, rec: rec,
      status: function (t) { status.textContent = t; },
      level: function (v) { ring.style.setProperty("--gbc-level", String(Math.min(1, v * 4).toFixed(2))); },
      speaking: function (on) { root.classList.toggle("gbc-speaking", !!on); },
      caption: function (who, text) {
        var p = el("p", "gbc-cap gbc-cap-" + who); p.appendChild(el("b", "", who === "you" ? "You" : who === "bot" ? bot.name : "Note")); p.appendChild(document.createTextNode(" " + text));
        caps.appendChild(p); while (caps.children.length > 6) caps.removeChild(caps.firstChild); caps.scrollTop = caps.scrollHeight;
      }
    };
  }

  function button(label, aria) { var b = el("button", "gbc-ctl", label); b.type = "button"; b.setAttribute("aria-label", aria || label); return b; }

  function wireControls(c) {
    var ui = c.ui, room = c.room;
    var mic = button("Mute", "Mute microphone"), cam = button("Camera on", "Turn camera on"), scr = button("Share screen", "Share your screen"), rec = button("Record", "Record this call"), end = button("End call", "End the call");
    end.classList.add("gbc-end"); [mic, cam, scr, rec].forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
    c.mic = mic; c.recBtn = rec;
    mic.addEventListener("click", async function () {
      var on = mic.getAttribute("aria-pressed") !== "true"; // pressed = muted
      try { await room.localParticipant.setMicrophoneEnabled(!on); } catch (e) {}
      c.muted = on; mic.setAttribute("aria-pressed", String(on)); mic.textContent = on ? "Unmute" : "Mute";
    });
    cam.addEventListener("click", async function () {
      var on = cam.getAttribute("aria-pressed") !== "true";
      try {
        await room.localParticipant.setCameraEnabled(on);
        cam.setAttribute("aria-pressed", String(on)); cam.textContent = on ? "Camera off" : "Camera on";
        ui.self.textContent = ""; ui.self.hidden = !on;
        if (on) { var pub = room.localParticipant.getTrackPublication && room.localParticipant.getTrackPublication("camera"); if (pub && pub.track && pub.track.attach) { var v = pub.track.attach(); v.muted = true; v.setAttribute("aria-label", "Your camera"); ui.self.appendChild(v); } }
      } catch (e) { ui.caption("system", "I could not turn the camera on. Check your browser's camera permission."); }
    });
    scr.addEventListener("click", async function () {
      var on = scr.getAttribute("aria-pressed") !== "true";
      try { await room.localParticipant.setScreenShareEnabled(on); scr.setAttribute("aria-pressed", String(on)); scr.textContent = on ? "Stop sharing" : "Share screen"; }
      catch (e) { ui.caption("system", "Screen sharing did not start. Your browser may have blocked it, and phones often cannot share a screen."); }
    });
    rec.addEventListener("click", function () {
      if (c.recording) { stopRecording(c, true); return; }
      var m = modal("gbc-consent");
      m.box.appendChild(el("h2", "", "Record this call?"));
      m.box.appendChild(el("p", "", "The recording includes your voice and " + c.bot.name + "'s voice. It is saved on this device only, when you stop or end the call."));
      var yes = el("button", "gbc-btn gbc-go", "Start recording"), no = el("button", "gbc-btn gbc-ghost", "Cancel"); yes.type = "button"; no.type = "button";
      yes.addEventListener("click", function () { m.close(); startRecording(c); }); no.addEventListener("click", m.close);
      var a = el("div", "gbc-actions"); a.appendChild(yes); a.appendChild(no); m.box.appendChild(a); yes.focus();
    });
    end.addEventListener("click", function () { finish(c); });
    [mic, cam, scr, rec, end].forEach(function (b) { ui.bar.appendChild(b); });
  }

  function tick(c) {
    var secs = (Date.now() - c.startedAt) / 1000, left = c.limit - secs;
    c.ui.timer.textContent = clock(secs) + " / " + clock(c.limit);
    if (left <= WARN_SECONDS && !c.warned) { c.warned = true; c.ui.caption("system", "One minute left on this call."); }
    if (left <= 0) { c.ui.caption("system", "That is the time limit for this call."); finish(c); }
  }

  // ---- listening: the person's turn ---------------------------------------------------------------------------
  async function ensureAudio(c) {
    if (c.ctx) return c.ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    c.ctx = new AC();
    c.mixDest = c.ctx.createMediaStreamDestination && c.ctx.createMediaStreamDestination();
    return c.ctx;
  }

  async function startListening(c) {
    var ctx = await ensureAudio(c);
    var pub = c.room.localParticipant.getTrackPublication && c.room.localParticipant.getTrackPublication("microphone");
    var track = pub && pub.track && pub.track.mediaStreamTrack;
    var stream = track ? new MediaStream([track]) : await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!track) c.ownStream = stream;
    var src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 1024;
    src.connect(an);
    if (c.mixDest) src.connect(c.mixDest);
    var buf = new Float32Array(an.fftSize), speechMs = 0, quietMs = 0, last = performance.now(), rec = null, parts = [];
    var mime = recorderMime(window.MediaRecorder);
    c.listening = true;
    c.loop = setInterval(function () {
      if (c.ended) return;
      var now = performance.now(), dt = now - last; last = now;
      if (c.busy || c.muted) { speechMs = 0; quietMs = 0; if (rec && rec.state === "recording") { rec.onstop = null; try { rec.stop(); } catch (e) {} rec = null; parts = []; } return; }
      an.getFloatTimeDomainData(buf);
      var sum = 0; for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      var level = Math.sqrt(sum / buf.length);
      c.ui.level(level);
      if (isSpeech(level)) {
        speechMs += dt; quietMs = 0;
        if (!rec && window.MediaRecorder) { parts = []; rec = new MediaRecorder(new MediaStream([stream.getAudioTracks()[0]]), mime ? { mimeType: mime } : undefined); rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); }; rec.start(); c.set("working"); }
      } else if (rec) {
        quietMs += dt;
        if (turnFinished(speechMs, quietMs)) {
          var r = rec, type = r.mimeType || mime || "audio/webm"; rec = null; speechMs = 0; quietMs = 0; c.busy = true;
          r.onstop = function () { var blob = new Blob(parts, { type: type }); parts = []; turn(c, blob); };
          try { r.stop(); } catch (e) { c.busy = false; }
        } else if (quietMs >= SILENCE_MS * 2) { rec.onstop = null; try { rec.stop(); } catch (e) {} rec = null; speechMs = 0; quietMs = 0; parts = []; c.set("idle"); }
      }
    }, 80);
  }

  // One turn: your clip -> text -> the bot's answer -> the bot's voice.
  async function turn(c, blob) {
    var ui = c.ui;
    try {
      ui.status("Listening… got it, thinking");
      var res = await apiFetch()("/api/voice/transcribe", { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, credentials: "include", body: blob });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "I could not make out that recording.");
      var text = String(data.transcript || "").trim();
      if (!text) { ui.status("I did not catch that. Try again."); return; }
      ui.caption("you", text);
      var out = await call("/api/bots/" + c.bot.id + "/chat", { method: "POST", body: { message: text, history: c.history.slice(-10) } });
      c.history.push({ role: "user", content: text }, { role: "assistant", content: out.reply });
      if (c.history.length > 20) c.history.splice(0, c.history.length - 20);
      await say(c, out.reply);
    } catch (e) {
      ui.caption("system", (e && e.message) || "That did not work. Please try again.");
      ui.status("Connected");
    } finally { c.busy = false; if (!c.ended) { c.set("idle"); } }
  }

  // The bot speaks: its own voice from the server, played through the same audio graph so it can be recorded and measured.
  async function say(c, text) {
    var ui = c.ui, bot = c.bot;
    ui.caption("bot", text);
    c.busy = true;
    try {
      var res = await apiFetch()("/api/bots/" + bot.id + "/speak", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ text: text }) });
      if (!res.ok) { var j = await res.json().catch(function () { return {}; }); throw new Error(j.error || "I could not speak just now. You can read my answer."); }
      var url = URL.createObjectURL(await res.blob()), a = new Audio(url);
      a.playbackRate = bot.rate || 1; if ("preservesPitch" in a) a.preservesPitch = false;
      var ctx = await ensureAudio(c), node = ctx.createMediaElementSource(a), an = ctx.createAnalyser(); an.fftSize = 512;
      node.connect(an); an.connect(ctx.destination); if (c.mixDest) an.connect(c.mixDest);
      var buf = new Float32Array(an.fftSize);
      c.set("speaking"); ui.speaking(true); ui.status(bot.name + " is speaking");
      var meter = setInterval(function () { an.getFloatTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i]; ui.level(Math.sqrt(s / buf.length)); }, 60);
      await new Promise(function (resolve, reject) { a.onended = resolve; a.onerror = function () { reject(new Error("I could not play that. You can read my answer.")); }; a.play().catch(function () { reject(new Error("Your browser blocked the sound. Tap the screen and try again.")); }); });
      clearInterval(meter); URL.revokeObjectURL(url);
    } catch (e) { ui.caption("system", (e && e.message) || "I could not speak just now."); }
    finally { ui.speaking(false); ui.level(0); ui.status("Connected"); c.set("idle"); c.busy = false; }
  }

  // ---- recording (on this device only) ------------------------------------------------------------------------
  function startRecording(c) {
    if (c.recording || !window.MediaRecorder || !c.mixDest) { if (!c.recording) c.ui.caption("system", "This browser cannot record the call."); return; }
    try {
      var mime = recorderMime(window.MediaRecorder);
      c.chunks = []; c.recorder = new MediaRecorder(c.mixDest.stream, mime ? { mimeType: mime } : undefined);
      c.recorder.ondataavailable = function (e) { if (e.data && e.data.size) c.chunks.push(e.data); };
      c.recorder.start(1000);
      c.recording = true; c.ui.rec.hidden = false; c.recBtn.setAttribute("aria-pressed", "true"); c.recBtn.textContent = "Stop recording";
      c.ui.caption("system", "Recording started. It will be saved on this device only.");
    } catch (e) { c.ui.caption("system", "I could not start the recording."); }
  }
  function stopRecording(c, announce) {
    if (!c.recording || !c.recorder) return Promise.resolve();
    return new Promise(function (resolve) {
      c.recorder.onstop = function () {
        c.recording = false; c.ui.rec.hidden = true; c.recBtn.setAttribute("aria-pressed", "false"); c.recBtn.textContent = "Record";
        if (c.chunks.length) {
          var blob = new Blob(c.chunks, { type: c.recorder.mimeType || "audio/webm" }), url = URL.createObjectURL(blob);
          var a = document.createElement("a"); a.href = url; a.download = fileNameFor(c.bot.name, new Date()); document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
          if (announce) c.ui.caption("system", "Recording saved to this device.");
        }
        c.chunks = []; resolve();
      };
      try { c.recorder.stop(); } catch (e) { resolve(); }
    });
  }

  // ---- hanging up ----------------------------------------------------------------------------------------------
  async function finish(c) {
    if (c.ended) return;
    c.ended = true;
    clearInterval(c.timer); clearInterval(c.loop);
    if (c.onHide) window.removeEventListener("pagehide", c.onHide);
    await stopRecording(c, false);
    try { if (c.room) await c.room.disconnect(); } catch (e) {}
    try { if (c.ownStream) c.ownStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { if (c.ctx) await c.ctx.close(); } catch (e) {}
    c.set("idle");
    var secs = null;
    try { var r = await call("/api/bots/call/" + c.info.callId + "/end", { method: "POST", body: {} }); secs = r && r.seconds; } catch (e) { /* the server closes stale calls itself */ }
    if (c.ui.root.parentNode) c.ui.root.parentNode.removeChild(c.ui.root);
    document.body.classList.remove("gbc-open");
    active = null;
    return secs;
  }

  return { start: start, isSpeech: isSpeech, turnFinished: turnFinished, clock: clock, allowedSeconds: allowedSeconds, recorderMime: recorderMime, fileNameFor: fileNameFor, LIVEKIT_SRC: LIVEKIT_SRC, active: function () { return !!active; } };
});
