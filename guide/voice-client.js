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
  // en-GB: British English (the default is American). smart_format also adds punctuation and capital letters.
  const startedAt = Date.now();
  const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en-GB&smart_format=true&punctuate=true", {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType
    },
    body: audioBuffer
  });
  if (!response.ok) throw new Error(`Deepgram transcription failed: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const best = data.results?.channels?.[0]?.alternatives?.[0];
  const transcript = best?.transcript || "";
  // Numbers only, never the words: what size came in, how long it took, how sure the service was.
  console.log(`[voice] transcribed type=${mimeType} bytes=${audioBuffer.length} chars=${transcript.length} confidence=${typeof best?.confidence === "number" ? best.confidence.toFixed(2) : "n/a"} secs=${((Date.now() - startedAt) / 1000).toFixed(1)}`);
  return transcript;
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
