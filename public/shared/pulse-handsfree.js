// Hands-free voice for Pulse: press Voice once, then just talk. Pulse listens, runs what you said as a
// normal Pulse edit (so it is undoable), says a short answer back, and listens again. Talking over its
// voice stops it. The microphone is only on between pressing Voice and pressing it again.
//
// The listening / thinking / speaking flow is shared/voice-chat.js (the same one the Business Assistant
// uses). This file connects it to Pulse and holds the plain rules: drop a leading "Core,", ignore noise,
// and decide what Pulse says back. Every browser piece comes in as an input, so it is tested with fakes.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostPulseHandsFree = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // A speech-to-text engine sometimes "hears" these in silence or room noise: never worth acting on.
  var NOISE_WORDS = /^(?:you|thanks|okay|ok|um+|uh+|hmm+|mm+|ah+|oh|yeah|yep|yes|no|bye|the|so|and)$/;

  /** "Hey Core, add testimonials." -> "add testimonials." Only a wake word at the very start goes. */
  function cleanSpoken(text) {
    return String(text || "").trim().replace(/^(?:hey[\s,]+)?core\b[\s,:.\-!]*/i, "").trim();
  }

  var COMMAND = /^(?:please\s+)?(?:save\s+(?:this|it|that|my\s+(?:work|site|project|website)|to\s+github)|(?:turn on|turn off|start|stop|enable|disable)\s+(?:the\s+)?auto[\s-]?save)\b/i;

  /** True when there is nothing to act on: empty, a filler word, or a single word (unless it is a known command). */
  function isNoise(text) {
    var t = String(text || "").trim().toLowerCase().replace(/[.!?,\s]+$/g, "");
    if (!t) return true;
    if (COMMAND.test(t)) return false;
    var words = t.replace(/thank you/g, "thanks").split(/\s+/);
    if (words.length < 2) return true;
    return words.every(function (w) { return NOISE_WORDS.test(w.replace(/[.,!?]/g, "")); });
  }

  /**
   * What Pulse says back. outcome comes from the widget: { ok, kind: "edit" | "build" | "github" | "busy" | "noproject",
   * cmd, unchanged }. Short on purpose: the screen shows the rest.
   */
  function spokenReply(outcome, lines) {
    var L = lines || {};
    if (!outcome) return "";
    if (outcome.kind === "busy") return "One moment, I am still working on the last change.";
    if (outcome.kind === "noproject") return "Enter a web address or upload a file above to get started first.";
    if (!outcome.ok) return L.retry || "That didn't work. Shall we try again?";
    if (outcome.kind === "build") return "Built. Take a look.";
    if (outcome.kind === "github") {
      if (outcome.cmd === "auto-on") return "Auto-save is on.";
      if (outcome.cmd === "auto-off") return "Auto-save is off.";
      return outcome.unchanged ? "GitHub is already up to date." : "Saved to GitHub.";
    }
    return "Done. What next?";
  }

  /**
   * deps:
   *   voice         GurostVoice (createVoiceSession, browserEnv, browserSupported)
   *   transcribe    (blob) -> Promise<string>      speech to text
   *   speak         (text) -> Promise<base64 mp3>  text to speech (may fail: Pulse then stays silent)
   *   run           (text) -> Promise<outcome>     runs the words as a Pulse edit or command
   *   ui            { onStatus(state), onHeard(text), onError(message) }
   *   lines         optional { retry }
   * states passed to onStatus: off | listening | thinking | speaking
   */
  function createHandsFree(deps) {
    var session = null;
    var ui = deps.ui || {};

    function note(fn, arg) { try { if (fn) fn(arg); } catch (e) { /* the screen must never stop the flow */ } }

    async function send(blob) {
      var raw = await deps.transcribe(blob);
      var text = cleanSpoken(raw);
      if (isNoise(text)) return { noSpeech: true };
      note(ui.onHeard, text);
      var outcome;
      try { outcome = await deps.run(text); }
      catch (err) { outcome = { ok: false, kind: "edit", error: err && err.message }; }
      var say = spokenReply(outcome, deps.lines);
      var audio = null;
      if (say) { try { audio = await deps.speak(say); } catch (e) { audio = null; } }
      return { transcript: text, audioBase64: audio, outcome: outcome };
    }

    async function start() {
      if (session) return;
      if (!deps.voice || !deps.voice.browserSupported()) throw new Error("unsupported");
      var s = deps.voice.createVoiceSession(deps.voice.browserEnv(), {
        send: send,
        onStatus: function (state) { note(ui.onStatus, state); if (state === "off" && session === s) session = null; },
        onError: function (message) { note(ui.onError, message); }
      });
      session = s;
      try { await s.start(); }
      catch (err) { session = null; throw err; }
    }

    function stop() { if (session) { var s = session; session = null; s.stop(); } }

    return { start: start, stop: stop, get active() { return !!session; }, send: send };
  }

  /** Browser helper: a Blob (mp3) as base64 text, the form voice-chat.js plays. */
  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).replace(/^data:[^,]*,/, "")); };
      r.onerror = function () { reject(r.error || new Error("read failed")); };
      r.readAsDataURL(blob);
    });
  }

  return { createHandsFree: createHandsFree, cleanSpoken: cleanSpoken, isNoise: isNoise, spokenReply: spokenReply, blobToBase64: blobToBase64 };
});
