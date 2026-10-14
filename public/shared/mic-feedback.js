// Gurost mic feedback: so a person can tell, without looking, that the microphone is really listening.
//   press()   the finger went down: one short buzz, and the button turns red straight away.
//   ready()   the microphone is REALLY recording now (it can take a moment to start on a phone): a short
//             rising beep. This is the "speak now" cue; words said before it are not recorded.
//   release() the finger came up: one shorter buzz.
//   micOff()  the microphone has really stopped: a short falling beep (played after it stops, so it is not recorded).
// Haptics use navigator.vibrate (Android; iPhone Safari has no vibration, so it gets the sounds only).
// Sounds are two tiny Web Audio tones: no audio files, no network. Everything is best effort and never throws.
// Used with holdToTalk() from shared/pulse-voice.js; see dashboard.html.
(function () {
  var ctx = null;

  function audio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported: fine */ }
  }

  // One soft tone that glides from `from` to `to` Hz over `ms`.
  function tone(from, to, ms) {
    var c = audio();
    if (!c) return;
    try {
      var t0 = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(from, t0);
      osc.frequency.linearRampToValueAtTime(to, t0 + ms / 1000);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
    } catch (e) { /* best effort */ }
  }

  window.GurostMicFeedback = {
    press: function () { audio(); buzz(50); }, // audio() here, inside the press, unlocks sound on phones
    ready: function () { tone(660, 990, 90); },
    release: function () { buzz(30); },
    micOff: function () { tone(880, 520, 110); }
  };
})();
