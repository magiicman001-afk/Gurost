// Gurost mic feedback: so a person can tell, without looking, that the microphone is really listening.
//   press()   the finger went down: one buzz, and the button turns red straight away.
//   ready()   the microphone is REALLY recording now (it can take a moment to start on a phone): a short
//             rising beep. This is the "speak now" cue; words said before it are not recorded.
//   release() the finger came up: a double buzz.
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

  function debug(text) { try { if (window.__micDebug) window.__micDebug(text); } catch (e) { /* debug only */ } }

  // A 30 to 50 ms buzz is too faint to feel on many phones, so these are firmer. What the browser answered is shown in the mic debug panel.
  function buzz(pattern, label) {
    try {
      if (!navigator.vibrate) { debug(label + ': this browser has no vibration (iPhone?)'); return; }
      var ok = navigator.vibrate(pattern);
      var ua = navigator.userActivation;
      debug(label + ': vibrate(' + JSON.stringify(pattern) + ') answered ' + ok + (ua ? '; tapped on this page before: ' + ua.hasBeenActive : ''));
    } catch (e) { debug(label + ': vibrate threw ' + e.message); }
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
    press: function () { audio(); buzz(80, 'press'); }, // audio() here, inside the press, unlocks sound on phones
    ready: function () { tone(660, 990, 90); },
    release: function () { buzz([60, 50, 60], 'release'); },
    micOff: function () { tone(880, 520, 110); }
  };
})();
