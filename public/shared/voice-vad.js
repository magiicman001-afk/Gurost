// Voice activity detection for hands-free talking: works out from a stream of
// volume readings when the user starts speaking, when they have finished, and
// when they talk over the bot (barge-in). Pure logic with no browser calls, so
// it is tested with made-up readings; voice-chat.js feeds it from the microphone.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.GurostVad = factory();
})(typeof self !== "undefined" ? self : this, function () {
  var DEFAULTS = {
    speechThreshold: 0.02,   // volume that counts as speech in a quiet room (0..1 RMS)
    bargeThreshold: 0.06,    // louder bar while the bot is talking, so its own sound does not trigger it
    minSpeechMs: 250,        // speech must last this long to count (a cough or a click does not)
    bargeMinMs: 300,         // talking over the bot must last this long to cut it off
    silenceMs: 1200,         // this much quiet after speech ends the turn
    maxUtteranceMs: 30000,   // never record longer than this
    calibrateMs: 500,        // listen to the room first to learn its background noise
    noiseFactor: 2.5,        // speech must be this many times louder than the background
    maxNoiseFloor: 0.05     // so someone who starts talking at once does not set the bar too high
  };

  /** Volume of one block of audio samples (values -1..1). */
  function rmsOf(samples) {
    if (!samples || !samples.length) return 0;
    var sum = 0;
    for (var i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
  }

  function createVad(options) {
    var o = Object.assign({}, DEFAULTS, options || {});
    var state, botSpeaking, calStart, calSum, calCount, floor, loudSince, lastLoud, speechStart, bargeFired;

    function reset() {
      state = "idle"; botSpeaking = false;
      calStart = null; calSum = 0; calCount = 0; floor = 0;
      loudSince = null; lastLoud = null; speechStart = null; bargeFired = false;
    }
    reset();

    function threshold() {
      var t = Math.max(o.speechThreshold, floor * o.noiseFactor);
      return botSpeaking ? Math.max(t, o.bargeThreshold) : t;
    }

    /**
     * Feed one volume reading with its time in ms. Returns a list of events:
     *   { type: "barge_in" }                         the user spoke over the bot
     *   { type: "speech_start", at }                 the user started a turn
     *   { type: "speech_end", durationMs, reason }   the turn is over ("silence" or "max")
     */
    function push(level, now) {
      var events = [];
      if (calStart === null) calStart = now;
      if (now - calStart < o.calibrateMs) { calSum += level; calCount++; floor = Math.min(o.maxNoiseFloor, calSum / calCount); return events; }

      var loud = level >= threshold();
      if (state === "idle") {
        if (!loud) { loudSince = null; return events; }
        if (loudSince === null) loudSince = now;
        var need = botSpeaking ? o.bargeMinMs : o.minSpeechMs;
        if (now - loudSince >= need) {
          if (botSpeaking && !bargeFired) { bargeFired = true; events.push({ type: "barge_in" }); }
          state = "speaking"; speechStart = loudSince; lastLoud = now;
          events.push({ type: "speech_start", at: speechStart });
        }
        return events;
      }
      // speaking
      if (loud) lastLoud = now;
      if (now - speechStart >= o.maxUtteranceMs) { events.push({ type: "speech_end", durationMs: now - speechStart, reason: "max" }); toIdle(); }
      else if (now - lastLoud >= o.silenceMs) { events.push({ type: "speech_end", durationMs: lastLoud - speechStart, reason: "silence" }); toIdle(); }
      return events;
    }

    function toIdle() { state = "idle"; loudSince = null; lastLoud = null; speechStart = null; bargeFired = false; }

    return {
      push: push,
      reset: reset,
      /** Tell it the bot started or stopped talking. */
      setBotSpeaking: function (on) { botSpeaking = !!on; loudSince = null; bargeFired = false; },
      /** After a turn is handled, start listening for the next one (room noise is kept). */
      listenAgain: function () { toIdle(); },
      get state() { return state; },
      /** true while a possible start of speech is being measured (do not restart the recorder now) */
      get pending() { return loudSince !== null; },
      get noiseFloor() { return floor; }
    };
  }

  return { createVad: createVad, rmsOf: rmsOf, DEFAULTS: DEFAULTS };
});
