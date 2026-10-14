/**
 * Pulse Voice — real microphone capture (MediaRecorder), sent over the
 * existing /ws/guide WebSocket as base64 audio, with real playback of
 * the bot's spoken response (Deepgram TTS, already generated
 * server-side by guide/voice-client.js — this module is what actually
 * PLAYS that audio, which nothing did before this round).
 *
 * Scoped deliberately to three pages only (builder.html, app-builder.html,
 * amend_website.html) — not site-wide — per explicit instruction: the
 * Pulse button belongs on the "live building" pages, not on Dashboard
 * or every page generically. A separate, simpler always-present chat
 * widget (not voice-capture) covers the rest of the site.
 *
 * Real, honest degradation: if the browser denies microphone access,
 * or MediaRecorder isn't supported, this falls back to text-only
 * input rather than silently failing or blocking the page — checked
 * explicitly, not assumed to always work.
 */

function createPulseVoice({ projectId, getUserId, onCorrectionApplied, onError, onListeningChange }) {
  let socket = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let micAvailable = null; // null = not checked yet, true/false once known

  // String.fromCharCode(...bytes) with spread breaks on longer audio —
  // most JS engines cap spread/apply arguments around 65k-130k
  // elements, and a several-second recording can exceed that. This
  // processes the buffer in fixed-size chunks so it stays correct
  // regardless of how long a correction someone speaks.
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const CHUNK_SIZE = 8192;
    let binary = "";
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, i + CHUNK_SIZE);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  function connect() {
    if (socket) return socket;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${window.location.host}/ws/guide?projectId=${projectId}`);
    // The socket's first message is the login - never the URL (logs). The server
    // sends nothing and accepts nothing until it has checked it. With a cookie
    // login the message is empty and the server reads the cookie.
    const socketForLogin = socket;
    socketForLogin.addEventListener("open", () => {
      socketForLogin.send(window.GurostAPI?.socketAuthMessage ? window.GurostAPI.socketAuthMessage() : JSON.stringify({ type: "auth" }));
    });

    socket.addEventListener("message", (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "applied") {
        onCorrectionApplied?.(msg.html, msg.summary);
      } else if (msg.type === "voice_response" && msg.audioBase64) {
        playAudioResponse(msg.audioBase64);
      } else if (msg.type === "error") {
        onError?.(msg.error);
      }
      // 'suggestion'/'presence'/'collab_update'/'acknowledged' are real
      // messages this socket can also receive (see websocket-server.js)
      // but aren't relevant to the pause/talk-or-text/restart flow
      // these three pages need — intentionally not handled here.
    });

    socket.addEventListener("close", (event) => {
      socket = null;
      // 4401: the login is missing or has expired. The API client refreshes it once (the next send
      // reconnects with it) or sends the person to log in.
      if (event.code === 4401) window.GurostAPI?.socketLoginExpired?.();
    });
    return socket;
  }

  function playAudioResponse(base64Audio) {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.play().catch((err) => {
        // Autoplay can be blocked by the browser until the user has
        // interacted with the page — real, common, not a bug in this
        // code. Surface it rather than fail silently.
        console.warn("[pulse-voice] Playback blocked, likely needs a user interaction first:", err.message);
      });
    } catch (err) {
      console.warn("[pulse-voice] Could not play TTS response:", err.message);
    }
  }

  async function checkMicAvailable() {
    if (micAvailable !== null) return micAvailable;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      micAvailable = false;
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop()); // just checking permission, not recording yet
      micAvailable = true;
    } catch {
      micAvailable = false; // permission denied, or no device — real, expected outcome, not an error state
    }
    return micAvailable;
  }

  async function startListening() {
    const available = await checkMicAvailable();
    if (!available) {
      onListeningChange?.(false, "no-mic");
      return false;
    }

    connect();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickRecorderMime();
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", (e) => { if (e.data.size > 0) audioChunks.push(e.data); });
    mediaRecorder.start();
    onListeningChange?.(true, "listening");
    return true;
  }

  function stopListeningAndSend() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    mediaRecorder.addEventListener(
      "stop",
      async () => {
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
        const buffer = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        const ws = connect();
        const send = () => ws.send(JSON.stringify({ type: "pulse_audio", audioBase64: base64, mimeType: mediaRecorder.mimeType }));
        if (ws.readyState === WebSocket.OPEN) send();
        else ws.addEventListener("open", send, { once: true });

        onListeningChange?.(false, "processing");
      },
      { once: true }
    );
    mediaRecorder.stop();
  }

  function sendText(text) {
    const ws = connect();
    const send = () => ws.send(JSON.stringify({ type: "pulse_text", text }));
    if (ws.readyState === WebSocket.OPEN) send();
    else ws.addEventListener("open", send, { once: true });
  }

  return { startListening, stopListeningAndSend, sendText, checkMicAvailable };
}

/**
 * Real, but a genuinely different path from createPulseVoice() above.
 * That one goes through /ws/guide, whose server-side handler calls
 * bots/correction-bot.js's applyCorrection() automatically on the
 * transcribed text — real, but hardcoded to find/replace-patch a
 * SINGLE HTML STRING (see its own source: `applyCorrection(currentCode,
 * instruction)`). App Builder's multi-file appFiles and Amend Website's
 * audit/rebuild flow don't have a single string to patch that way, so
 * routing their voice input through that pipeline would misbehave, not
 * just be architecturally sloppy.
 *
 * These two functions use the plain REST voice endpoints instead
 * (POST /api/voice/transcribe, POST /api/voice/speak — both already
 * real, wrapping the same guide/voice-client.js Deepgram calls, just
 * without the auto-apply side effect). The caller decides what to DO
 * with the transcript — regenerate an app, append a revamp fix — using
 * whatever real mechanism actually fits that page.
 */

// Mic debug (Dashboard ?micdebug=1): the page may define window.__micDebug(text); every call is best effort and does nothing otherwise.
function micDebug(text) { try { if (window.__micDebug) window.__micDebug(text); } catch (e) { /* debug only */ } }

const VOICE_NOT_SET_UP = "Voice is not set up yet. You can type instead.";

// The first format this browser can really record. Chrome and Firefox give webm or ogg; iPhone Safari
// gives only mp4. A hard-coded "webm else ogg" made the recorder fail to start on every iPhone.
function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
}

// Asked once per page, ahead of any press: the press itself must go straight to getUserMedia, because
// iOS only allows the microphone from inside a real tap and an await before it would lose that.
// Resolves true / false, or null when the answer is not known (offline, not logged in) - then a press goes ahead.
let voiceStatusPromise = null;
let voiceStatus = null;
function prefetchVoiceStatus() {
  if (!voiceStatusPromise) {
    voiceStatusPromise = Promise.resolve()
      .then(() => (window.GurostAPI && window.GurostAPI.call ? window.GurostAPI.call("/api/voice/status") : null))
      .then((st) => { voiceStatus = st && typeof st.available === "boolean" ? st.available : null; return voiceStatus; })
      .catch(() => null);
  }
  return voiceStatusPromise;
}

const MIN_RECORDING_MS = 600; // a shorter recording is only a header with nothing in it, so stop() keeps listening until this is reached
const TAIL_MS = 300; // keep recording this long after the finger lifts: phones cut the last word off otherwise
const LONG_PRESS_MS = 700; // with handlers.onLongPress (Pulse): a press this long switches to hands-free when let go
const TAP_MS = 450; // a press shorter than this is a TAP: recording carries on until the next tap (a longer press is a HOLD: let go to send)

// iPhone Safari records fragmented mp4, which the speech service sometimes refuses as "corrupt". Plain
// 16-bit mono WAV (16 kHz) is understood everywhere, so an mp4 recording is decoded here and re-sent as WAV.
// Any failure returns null and the original recording is sent as before.
async function blobToWav(blob) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    try {
      const raw = await blob.arrayBuffer();
      const decoded = await new Promise((ok, no) => { const p = ctx.decodeAudioData(raw, ok, no); if (p && p.then) p.then(ok, no); });
      const RATE = 16000;
      const frames = Math.max(1, Math.ceil(decoded.duration * RATE));
      const off = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, frames, RATE);
      const src = off.createBufferSource();
      src.buffer = decoded;
      src.connect(off.destination);
      src.start(0);
      const pcm = (await new Promise((ok, no) => { const p = off.startRendering(); if (p && p.then) p.then(ok, no); else off.oncomplete = (e) => ok(e.renderedBuffer); })).getChannelData(0);
      const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
      const str = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
      str(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
      out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
      out.setUint32(24, RATE, true); out.setUint32(28, RATE * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
      str(36, "data"); out.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
      return new Blob([out.buffer], { type: "audio/wav" });
    } finally { try { ctx.close(); } catch {} }
  } catch { return null; }
}

function micErrorText(err) {
  const name = err && err.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "The microphone is blocked. Allow it in your browser settings, or type instead.";
  if (name === "NotFoundError") return "No microphone found. You can type instead.";
  return "Microphone unavailable. You can type instead.";
}

/**
 * The actually-usable shape: returns start/stop handles a real UI can
 * wire to a press and release, rather than an unstoppable auto-recording
 * promise.
 */
function startRecordingSession() {
  return new Promise(async (resolveStart, rejectStart) => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      rejectStart(new Error("Microphone not available in this browser."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const picked = pickRecorderMime();
      const recorder = picked ? new MediaRecorder(stream, { mimeType: picked }) : new MediaRecorder(stream);
      // What the recorder really writes (it may differ from the request); the base type only.
      const mimeType = (recorder.mimeType || picked || "audio/mp4").split(";")[0];
      const chunks = [];
      recorder.addEventListener("dataavailable", (e) => { if (e.data.size > 0) chunks.push(e.data); micDebug(`chunk ${e.data.size} bytes`); });
      recorder.start();
      const startedAt = Date.now();
      let stopLevels = () => {};
      if (window.__micDebug) { // only when debugging: what the phone really gives us, and whether it goes quiet or stops mid-recording
        try {
          const track = stream.getAudioTracks()[0];
          const st = track && track.getSettings ? track.getSettings() : {};
          micDebug(`mic ready: ${recorder.mimeType} rate=${st.sampleRate} echo=${st.echoCancellation} noise=${st.noiseSuppression} agc=${st.autoGainControl} muted=${track && track.muted}`);
          if (track) { track.addEventListener("mute", () => micDebug("!! the phone MUTED the microphone track")); track.addEventListener("unmute", () => micDebug("microphone track unmuted")); track.addEventListener("ended", () => micDebug("!! microphone track ENDED")); }
          recorder.addEventListener("error", (e) => micDebug(`!! recorder error: ${e.error && e.error.name}`));
          recorder.addEventListener("pause", () => micDebug("!! recorder paused"));
          const AC = window.AudioContext || window.webkitAudioContext;
          if (AC) {
            const ac = new AC(); const an = ac.createAnalyser(); an.fftSize = 512;
            ac.createMediaStreamSource(stream).connect(an);
            const buf = new Uint8Array(an.fftSize);
            const timer = setInterval(() => { an.getByteTimeDomainData(buf); let peak = 0; for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128)); micDebug(`level ${Math.round((Date.now() - startedAt) / 100) / 10}s: ${"#".repeat(Math.round(peak / 6))} ${peak}`); }, 500);
            stopLevels = () => { clearInterval(timer); try { ac.close(); } catch (e) { /* debug only */ } };
          }
        } catch (e) { micDebug("debug setup failed: " + e.message); }
      }

      resolveStart({
        // Microphone off now and the recording thrown away, never sent (the page went to the background).
        cancel: () => {
          chunks.length = 0;
          try { if (recorder.state !== "inactive") recorder.stop(); } catch {}
          stream.getTracks().forEach((t) => t.stop());
        },
        // onMicOff (optional) runs the moment the microphone has really stopped, before the transcription starts.
        stop: (onMicOff) =>
          new Promise((resolveStop, rejectStop) => {
            recorder.addEventListener(
              "stop",
              async () => {
                stopLevels();
                micDebug(`recorder stopped after ${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${chunks.length} chunk(s)`);
                stream.getTracks().forEach((t) => t.stop());
                try { if (onMicOff) onMicOff(); } catch {}
                try {
                  if (!chunks.length) { resolveStop(""); return; } // nothing was recorded (released at once)
                  let blob = new Blob(chunks, { type: mimeType });
                  let sendType = mimeType;
                  if (mimeType === "audio/mp4") { // iPhone Safari
                    const wav = await blobToWav(blob);
                    if (wav) { blob = wav; sendType = "audio/wav"; }
                  }
                  const response = await (window.GurostAPI?.fetch || fetch)("/api/voice/transcribe", {
                    method: "POST",
                    headers: { "Content-Type": sendType },
                    body: blob
                  });
                  if (!response.ok) {
                    const msg = (await response.json().catch(() => ({}))).error || "Transcription failed.";
                    throw new Error(/not configured/i.test(msg) ? VOICE_NOT_SET_UP : msg);
                  }
                  const { transcript } = await response.json();
                  micDebug(`sent ${blob.size} bytes (${sendType}); got ${String(transcript || "").length} characters back`);
                  resolveStop(transcript);
                } catch (err) {
                  rejectStop(err);
                }
              },
              { once: true }
            );
            if (recorder.state === "inactive") { stream.getTracks().forEach((t) => t.stop()); resolveStop(""); return; }
            // A recording shorter than MIN_RECORDING_MS is a header with nothing in it. Instead of failing (the old "too short"
            // message, seen on a phone when the microphone was slow to start), keep listening until the minimum is reached.
            const wait = Math.max(0, MIN_RECORDING_MS - (Date.now() - startedAt));
            setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, wait + TAIL_MS);
          })
      });
    } catch (err) {
      rejectStart(err);
    }
  });
}

/**
 * Hold-to-talk on a button, for a finger, a pen or a mouse.
 * - Pointer events carry all three; the mouse events that follow them (a phone sends them AFTER the finger lifts) are ignored
 *   (a phone sends them AFTER the finger lifts, so the old mousedown/mouseup wiring released before
 *   the microphone had started and left it recording forever).
 * - HOLD or TAP, both work: hold longer than TAP_MS and let go to send; or tap quickly, keep talking, and tap again to send.
 *   (A quick tap used to be rejected as "too short", and a release while the microphone was still starting gave an empty recording.)
 * - A release while the microphone is still starting is remembered and applied the moment it is ready.
 * - Mouse events dispatched by scripts still work.
 * handlers: onPress() immediately on press; onStart(session) once recording; onTapMode() when a quick tap keeps it recording; onRelease() when it stops;
 * onResult(transcript); onError(message); onUnavailable(message) when voice is not set up.
 */
function holdToTalk(button, handlers = {}) {
  if (!button) return null;
  let session = null;
  let starting = false;
  let releaseWanted = false;
  let tapMode = false; // recording carries on after a quick tap; the NEXT press stops and sends it
  let pressAt = 0;
  let ignoreRelease = false;
  let heldMs = 0; // how long the press lasted, measured at the moment of release
  let lastPointerAt = 0;
  let longTimer = null;
  let cancelWanted = false; // a long press let go while the microphone was still starting: drop that recording when it arrives
  let cancelToTap = false; // the browser took the touch away while the microphone was still starting: carry on listening as a tap
  let tapTimer = null; // a recording left running in tap mode is sent after this long, so the microphone never stays on
  const longPress = typeof handlers.onLongPress === "function";
  const fromPointer = () => Date.now() - lastPointerAt < 1000; // a mouse or finger sends pointer events AND mouse events: only one set counts
  prefetchVoiceStatus();

  button.style.touchAction = "none";
  button.style.webkitUserSelect = "none";
  button.style.userSelect = "none";
  button.style.webkitTouchCallout = "none";
  button.addEventListener("contextmenu", (e) => e.preventDefault()); // a long press must not open the phone's menu

  function finish(s) {
    session = null;
    tapMode = false;
    clearTimeout(tapTimer);
    handlers.onRelease?.();
    s.stop(handlers.onMicOff).then((t) => handlers.onResult?.(t || "")).catch((err) => handlers.onError?.(err && err.message ? err.message : "Couldn't transcribe. You can type instead."));
  }

  function press() {
    // The page can take the press over (Pulse: a tap while hands-free is on just stops it, nothing is recorded).
    if (handlers.interceptPress && handlers.interceptPress()) { ignoreRelease = true; return; }
    if (starting) return;
    if (session) { // a recording is already running from a quick tap: this press is the "stop" tap
      if (tapMode) { ignoreRelease = true; finish(session); }
      return;
    }
    if (voiceStatus === false) { handlers.onUnavailable?.(VOICE_NOT_SET_UP); return; }
    starting = true;
    releaseWanted = false;
    cancelWanted = false;
    pressAt = Date.now();
    handlers.onPress?.();
    if (longPress) { clearTimeout(longTimer); longTimer = setTimeout(() => handlers.onLongPressReady?.(), LONG_PRESS_MS); }
    startRecordingSession()
      .then((s) => {
        starting = false;
        if (cancelWanted) { cancelWanted = false; s.cancel?.(); handlers.onRelease?.(); return; } // it became a long press
        session = s;
        handlers.onStart?.(s);
        if (cancelToTap) { cancelToTap = false; keepListening(); return; }
        if (releaseWanted) settle(); // let go while the microphone was still starting (heldMs was measured at the release)
      })
      .catch((err) => { starting = false; releaseWanted = false; handlers.onRelease?.(); handlers.onError?.(micErrorText(err)); });
  }

  // Carry on recording as a tap (the next tap sends). Used when the touch was taken away by the browser: a lost touch is NOT
  // a let-go, and sending then would cut the sentence off in the middle. A recording left like this is sent after a minute.
  function keepListening() {
    tapMode = true;
    clearTimeout(longTimer);
    handlers.onTapMode?.();
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { if (session && tapMode) finish(session); }, 60000);
  }

  // Called on release. A quick press (a tap) keeps recording until the next tap; a held press stops and sends now.
  function settle() {
    if (!session) return;
    if (heldMs < TAP_MS) { keepListening(); return; }
    finish(session);
  }

  function release() {
    if (ignoreRelease) { ignoreRelease = false; return; }
    heldMs = Date.now() - pressAt;
    clearTimeout(longTimer);
    // A long press (Pulse only): the short recording it started is thrown away, never sent, and hands-free starts.
    // It starts here, on the release, so it is still inside the touch (iPhones need that for the microphone).
    if (longPress && heldMs >= LONG_PRESS_MS && !tapMode) {
      if (starting) { cancelWanted = true; releaseWanted = false; }
      else if (session) { const s = session; session = null; s.cancel?.(); handlers.onRelease?.(); }
      handlers.onLongPress();
      return;
    }
    if (starting) { releaseWanted = true; return; }
    if (session && !tapMode) settle();
  }

  button.addEventListener("pointerdown", (e) => {
    micDebug(`finger down (${e.pointerType})`);
    lastPointerAt = Date.now();
    try { button.setPointerCapture(e.pointerId); } catch {} // so the release is seen even if the finger slides off
    press();
  });
  // The mouse events that follow a pointer event are ignored, and the guard window restarts when the finger or button
  // LIFTS (after a long hold they would otherwise arrive more than a second after pointerdown and start a second recording).
  const lifted = () => { lastPointerAt = Date.now(); micDebug(`finger up after ${Date.now() - pressAt} ms`); release(); };
  button.addEventListener("pointerup", lifted);
  // pointercancel: the browser took the touch away (it did NOT lift). Never send what was said so far; keep listening.
  button.addEventListener("pointercancel", () => {
    lastPointerAt = Date.now();
    micDebug(`!! touch taken away by the browser after ${Date.now() - pressAt} ms (pointercancel): still listening`);
    if (ignoreRelease) { ignoreRelease = false; return; }
    if (session && !tapMode) keepListening();
    else if (starting) cancelToTap = true;
  });
  button.addEventListener("mousedown", () => { if (!fromPointer()) press(); });
  button.addEventListener("mouseup", () => { if (!fromPointer()) release(); });
  return { press, release };
}

/**
 * Tap-to-talk: one tap starts listening, the next tap stops and sends. Same recording session, voice-status check,
 * short-recording rule and error texts as holdToTalk. Uses "click" only (a finger and a mouse both produce it once),
 * and starts the recording straight from the tap with nothing awaited first, which iOS needs for the microphone prompt.
 */
function tapToTalk(button, handlers = {}) {
  if (!button) return null;
  let session = null;
  let starting = false;
  prefetchVoiceStatus();
  button.style.touchAction = "manipulation";

  function finish(s) {
    session = null;
    handlers.onRelease?.();
    s.stop(handlers.onMicOff).then((t) => handlers.onResult?.(t || "")).catch((err) => handlers.onError?.(err && err.message ? err.message : "Couldn't transcribe. You can type instead."));
  }

  function tap() {
    if (starting) return;
    if (session) { finish(session); return; }
    if (voiceStatus === false) { handlers.onUnavailable?.(VOICE_NOT_SET_UP); return; }
    starting = true;
    handlers.onPress?.();
    startRecordingSession()
      .then((s) => { starting = false; session = s; handlers.onStart?.(s); })
      .catch((err) => { starting = false; handlers.onRelease?.(); handlers.onError?.(micErrorText(err)); });
  }

  button.addEventListener("click", tap);
  return { tap };
}

async function speakTextViaRest(text) {
  const response = await (window.GurostAPI?.fetch || fetch)("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error("Text-to-speech failed.");
  const audioBlob = await response.blob();
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  await audio.play().catch((err) => console.warn("[pulse-voice] Playback blocked:", err.message));
}
