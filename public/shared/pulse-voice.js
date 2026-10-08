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
    socket = new WebSocket(`${protocol}//${window.location.host}/ws/guide?projectId=${projectId}&userId=${getUserId()}`);

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

    socket.addEventListener("close", () => { socket = null; });
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
      recorder.addEventListener("dataavailable", (e) => { if (e.data.size > 0) chunks.push(e.data); });
      recorder.start();

      resolveStart({
        stop: () =>
          new Promise((resolveStop, rejectStop) => {
            recorder.addEventListener(
              "stop",
              async () => {
                stream.getTracks().forEach((t) => t.stop());
                try {
                  if (!chunks.length) { resolveStop(""); return; } // nothing was recorded (released at once)
                  const blob = new Blob(chunks, { type: mimeType });
                  const response = await fetch("/api/voice/transcribe", {
                    method: "POST",
                    headers: { "Content-Type": mimeType, ...(window.GurostAPI?.authHeaders ? window.GurostAPI.authHeaders() : {}) },
                    body: blob
                  });
                  if (!response.ok) {
                    const msg = (await response.json().catch(() => ({}))).error || "Transcription failed.";
                    throw new Error(/not configured/i.test(msg) ? VOICE_NOT_SET_UP : msg);
                  }
                  const { transcript } = await response.json();
                  resolveStop(transcript);
                } catch (err) {
                  rejectStop(err);
                }
              },
              { once: true }
            );
            if (recorder.state === "inactive") { stream.getTracks().forEach((t) => t.stop()); resolveStop(""); return; }
            recorder.stop();
          })
      });
    } catch (err) {
      rejectStart(err);
    }
  });
}

/**
 * Hold-to-talk on a button, for a finger, a pen or a mouse.
 * - Pointer events carry all three; the mouse events a phone sends after a touch are ignored
 *   (a phone sends them AFTER the finger lifts, so the old mousedown/mouseup wiring released before
 *   the microphone had started and left it recording forever).
 * - A release while the microphone is still starting is remembered and stops it the moment it is ready.
 * - Mouse events dispatched by scripts still work.
 * handlers: onPress() immediately on press; onStart(session) once recording; onRelease() when it stops;
 * onResult(transcript); onError(message); onUnavailable(message) when voice is not set up.
 */
function holdToTalk(button, handlers = {}) {
  if (!button) return null;
  let session = null;
  let starting = false;
  let releaseWanted = false;
  let lastTouchAt = 0;
  const fromTouch = () => Date.now() - lastTouchAt < 1000;
  prefetchVoiceStatus();

  button.style.touchAction = "none";
  button.style.webkitUserSelect = "none";
  button.style.userSelect = "none";
  button.style.webkitTouchCallout = "none";
  button.addEventListener("contextmenu", (e) => e.preventDefault()); // a long press must not open the phone's menu

  function finish(s) {
    session = null;
    handlers.onRelease?.();
    s.stop().then((t) => handlers.onResult?.(t || "")).catch((err) => handlers.onError?.(err && err.message ? err.message : "Couldn't transcribe. You can type instead."));
  }

  function press() {
    if (session || starting) return;
    if (voiceStatus === false) { handlers.onUnavailable?.(VOICE_NOT_SET_UP); return; }
    starting = true;
    releaseWanted = false;
    handlers.onPress?.();
    startRecordingSession()
      .then((s) => {
        starting = false;
        session = s;
        if (releaseWanted) { finish(s); return; }
        handlers.onStart?.(s);
      })
      .catch((err) => { starting = false; releaseWanted = false; handlers.onRelease?.(); handlers.onError?.(micErrorText(err)); });
  }

  function release() {
    if (starting) { releaseWanted = true; return; }
    if (session) finish(session);
  }

  button.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") lastTouchAt = Date.now();
    try { button.setPointerCapture(e.pointerId); } catch {} // so the release is seen even if the finger slides off
    press();
  });
  // The emulated mouse events come right after the finger LIFTS, so the guard window restarts there too
  // (after a long hold they would otherwise arrive more than a second after pointerdown and start a second recording).
  const lifted = (e) => { if (e.pointerType !== "mouse") lastTouchAt = Date.now(); release(); };
  button.addEventListener("pointerup", lifted);
  button.addEventListener("pointercancel", lifted);
  button.addEventListener("mousedown", () => { if (!fromTouch()) press(); });
  button.addEventListener("mouseup", () => { if (!fromTouch()) release(); });
  return { press, release };
}

async function speakTextViaRest(text) {
  const response = await fetch("/api/voice/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(window.GurostAPI?.authHeaders ? window.GurostAPI.authHeaders() : {}) },
    body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error("Text-to-speech failed.");
  const audioBlob = await response.blob();
  const url = URL.createObjectURL(audioBlob);
  const audio = new Audio(url);
  audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  await audio.play().catch((err) => console.warn("[pulse-voice] Playback blocked:", err.message));
}
