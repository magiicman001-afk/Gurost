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
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
    mediaRecorder = new MediaRecorder(stream, { mimeType });
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

/**
 * The actually-usable shape: returns start/stop handles a real UI can
 * wire to mousedown/mouseup, rather than an unstoppable auto-recording
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
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
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
                  const blob = new Blob(chunks, { type: mimeType });
                  const response = await fetch("/api/voice/transcribe", {
                    method: "POST",
                    headers: { "Content-Type": mimeType, ...(window.GurostAPI?.authHeaders ? window.GurostAPI.authHeaders() : {}) },
                    body: blob
                  });
                  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Transcription failed.");
                  const { transcript } = await response.json();
                  resolveStop(transcript);
                } catch (err) {
                  rejectStop(err);
                }
              },
              { once: true }
            );
            recorder.stop();
          })
      });
    } catch (err) {
      rejectStart(err);
    }
  });
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
