/**
 * Deepgram for both directions of the Pulse button: transcribing what
 * the user says while holding it (STT) and speaking confirmations back
 * (TTS). The spec only asked for TTS, but "hold to speak" implies the
 * server needs to turn that audio into text too, so STT is included.
 *
 * Endpoint shapes below match Deepgram's documented REST API as of this
 * writing — verify against https://developers.deepgram.com before
 * relying on it in production, API versions do shift.
 */

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

async function transcribe(audioBuffer, mimeType = "audio/webm") {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY not configured.");
  const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType
    },
    body: audioBuffer
  });
  if (!response.ok) throw new Error(`Deepgram transcription failed: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
}

async function speak(text, voice = "aura-2-thalia-en") {
  if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY not configured.");
  const response = await fetch(`https://api.deepgram.com/v1/speak?model=${voice}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error(`Deepgram TTS failed: ${(await response.text()).slice(0, 300)}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer); // mp3 bytes — send to client for playback
}

module.exports = { transcribe, speak };
