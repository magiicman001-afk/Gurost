// Hands-free voice conversation with a department bot: listen, think, speak,
// and stop talking the moment the user speaks over it.
//
// createVoiceSession() holds the flow and takes every browser piece as an
// input (microphone, recorder, speaker, timers), so it is tested with fakes.
// browserEnv() connects it to the real microphone and speaker.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostVoice = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var TICK_MS = 50;
  var IDLE_RECORDER_MS = 8000;   // a recorder that has heard nothing is restarted, so a long wait never sends a huge file
  var MIN_BLOB_BYTES = 1000;     // anything smaller is not a real recording
  var MAX_FAILURES_IN_A_ROW = 3;

  /**
   * env:   getUserMedia() -> stream; stopStream(stream); createAnalyser(stream) -> { readLevel(), close() };
   *        createRecorder(stream) -> { start(), stop() -> Promise<Blob>, discard() };
   *        playAudio(base64) -> { stop(), onended(fn), onerror(fn) }; createVad(); setInterval; clearInterval; now()
   * hooks: send(blob) -> Promise<result>; onStatus(state); onUser(text); onResult(result); onError(message)
   * states: off | listening | thinking | speaking
   */
  function createVoiceSession(env, hooks) {
    var state = "off", vad = null, stream = null, analyser = null, recorder = null, timer = null;
    var player = null, recStartedAt = 0, failures = 0, generation = 0;

    function setState(next) { state = next; if (hooks.onStatus) hooks.onStatus(next); }

    function newRecorder() {
      if (recorder) recorder.discard();
      recorder = env.createRecorder(stream);
      recorder.start();
      recStartedAt = env.now();
    }

    function resume() {
      if (state === "off") return;
      vad.setBotSpeaking(false);
      vad.listenAgain();
      newRecorder();
      setState("listening");
    }

    function speak(base64) {
      setState("speaking");
      vad.listenAgain();
      vad.setBotSpeaking(true);   // a higher bar, so the bot's own sound does not cut it off
      newRecorder();              // keeps listening, so an interruption is captured from its start
      var mine = generation;
      try {
        player = env.playAudio(base64);
        player.onended(function () { if (mine === generation && state === "speaking") { player = null; resume(); } });
        player.onerror(function () { if (mine === generation && state === "speaking") { player = null; resume(); } });
      } catch (e) { player = null; resume(); }
    }

    async function finishTurn() {
      var mine = generation;
      setState("thinking");
      var rec = recorder; recorder = null;
      var blob = null;
      try { blob = rec ? await rec.stop() : null; } catch (e) { blob = null; }
      if (mine !== generation) return;
      if (!blob || blob.size < MIN_BLOB_BYTES) { resume(); return; }
      var result;
      try {
        result = await hooks.send(blob);
      } catch (err) {
        if (mine !== generation) return;
        failures++;
        if (hooks.onError) hooks.onError(err && err.message ? err.message : "Something went wrong.");
        if (failures >= MAX_FAILURES_IN_A_ROW) { stop(); return; }
        resume();
        return;
      }
      if (mine !== generation) return;
      failures = 0;
      if (!result || result.noSpeech) { resume(); return; }
      if (hooks.onUser) hooks.onUser(result.transcript);
      if (hooks.onResult) hooks.onResult(result);
      if (result.audioBase64) speak(result.audioBase64); else resume();
    }

    function tick() {
      if (state !== "listening" && state !== "speaking") return;
      var events = vad.push(analyser.readLevel(), env.now());
      for (var i = 0; i < events.length; i++) {
        var e = events[i];
        if (e.type === "barge_in" && state === "speaking") {
          if (player) { player.stop(); player = null; }
          vad.setBotSpeaking(false);
          setState("listening");
        } else if (e.type === "speech_end" && state === "listening") {
          finishTurn();
          return;
        }
      }
      // Nothing heard for a while: start a fresh recorder (unless speech may be starting).
      if (vad.state === "idle" && !vad.pending && env.now() - recStartedAt > IDLE_RECORDER_MS) newRecorder();
    }

    async function start() {
      if (state !== "off") return;
      generation++;
      failures = 0;
      stream = await env.getUserMedia();
      analyser = env.createAnalyser(stream);
      vad = env.createVad();
      setState("listening");
      newRecorder();
      timer = env.setInterval(tick, TICK_MS);
    }

    function stop() {
      if (state === "off") return;
      generation++;
      env.clearInterval(timer); timer = null;
      if (player) { player.stop(); player = null; }
      if (recorder) { recorder.discard(); recorder = null; }
      if (analyser) { analyser.close(); analyser = null; }
      if (stream) { env.stopStream(stream); stream = null; }
      setState("off");
    }

    return { start: start, stop: stop, get state() { return state; } };
  }

  // ---- the real browser ------------------------------------------------------
  function pickMime() {
    var options = ["audio/webm", "audio/mp4", "audio/ogg"]; // the browser picks its own codec for each
    for (var i = 0; i < options.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(options[i])) return options[i];
    return "";
  }

  function browserSupported() {
    return !!(typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== "undefined" && (window.AudioContext || window.webkitAudioContext));
  }

  function browserEnv() {
    var ctx = null;
    return {
      // The browser's own echo cancellation and noise suppression, on top of the detector's learning.
      getUserMedia: function () { return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); },
      stopStream: function (s) { s.getTracks().forEach(function (t) { t.stop(); }); },
      createAnalyser: function (s) {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = ctx || new AC();
        if (ctx.state === "suspended") ctx.resume();
        var src = ctx.createMediaStreamSource(s), an = ctx.createAnalyser();
        an.fftSize = 1024; src.connect(an);
        var buf = new Float32Array(an.fftSize);
        return {
          readLevel: function () { an.getFloatTimeDomainData(buf); return window.GurostVad.rmsOf(buf); },
          close: function () { try { src.disconnect(); } catch (e) {} }
        };
      },
      createRecorder: function (s) {
        var mime = pickMime(), chunks = [], rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined), dropped = false;
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        return {
          start: function () { rec.start(); },
          stop: function () {
            return new Promise(function (resolve) {
              rec.onstop = function () { resolve(dropped ? null : new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" })); };
              if (rec.state !== "inactive") rec.stop(); else rec.onstop();
            });
          },
          discard: function () { dropped = true; rec.ondataavailable = null; rec.onstop = null; if (rec.state !== "inactive") { try { rec.stop(); } catch (e) {} } }
        };
      },
      playAudio: function (base64) {
        var a = new Audio("data:audio/mp3;base64," + base64), end = function () {}, fail = function () {};
        a.addEventListener("ended", function () { end(); });
        a.addEventListener("error", function () { fail(); });
        a.play().catch(function () { fail(); });
        return { stop: function () { a.pause(); a.src = ""; }, onended: function (f) { end = f; }, onerror: function (f) { fail = f; } };
      },
      createVad: function () { return window.GurostVad.createVad(); },
      setInterval: function (f, ms) { return window.setInterval(f, ms); },
      clearInterval: function (t) { window.clearInterval(t); },
      now: function () { return Date.now(); }
    };
  }

  return { createVoiceSession: createVoiceSession, browserEnv: browserEnv, browserSupported: browserSupported };
});
