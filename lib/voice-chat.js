/**
 * Helpers for talking to a department bot by voice: what gets spoken back,
 * which audio is accepted, and whether voice is set up at all.
 */
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_SPOKEN_CHARS = 600;
const AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/x-m4a", "audio/aac"];

const voiceAvailable = (env = process.env) => !!env.DEEPGRAM_API_KEY;
const acceptedAudioType = (mime) => AUDIO_TYPES.includes(String(mime || "").split(";")[0].trim().toLowerCase());

/** Drop formatting a voice would read out loud as symbols. */
function plainSpeech(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "the link")
    .replace(/^[ \t]*[#>*\-•]+[ \t]+/gm, "")
    .replace(/[*_~#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * What the bot says out loud. A long draft is NOT read aloud: the bot says
 * it is on the screen. The spoken part is cut at a sentence end.
 */
function spokenText({ reply, draft }) {
  let say = plainSpeech(reply);
  if (say.length > MAX_SPOKEN_CHARS) {
    const cut = say.slice(0, MAX_SPOKEN_CHARS);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    say = (end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "")) + (end > 80 ? "" : "...");
  }
  if (draft) say = say ? `${say} The draft is on your screen.` : "I have written that for you. The draft is on your screen.";
  return say;
}

module.exports = { MAX_AUDIO_BYTES, MAX_SPOKEN_CHARS, AUDIO_TYPES, voiceAvailable, acceptedAudioType, plainSpeech, spokenText };
