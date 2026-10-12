/**
 * Honest "add a video" edits.
 *
 * Asking Pulse for a motion video used to make the model rewrite the hero layout and report success while no video
 * played (there was no clip to play). Now: find a real stock clip first; if there is none, say so and change nothing; if
 * there is one, give the model the exact <video> to use and check that the finished page really contains that clip.
 */
const STOP = new Set(["a", "an", "the", "and", "for", "with", "that", "this", "website", "site", "page", "build", "make", "want", "need", "please", "company", "business", "called", "named", "based", "near", "from", "about", "have", "good", "best", "nice", "new"]);

const NOT_AVAILABLE = "I couldn't add a video: no stock video clip is available for this right now, so your page is unchanged. I did not change the layout. Try again later, or upload your own clip.";
const NOT_APPLIED = "I tried to add the video but it did not end up on the page, so nothing was changed. Please try again.";

/** True when the instruction asks to ADD video or a moving background (not to remove one). */
function wantsVideo(instruction) {
  const t = String(instruction || "").toLowerCase();
  if (!/\b(video|footage|motion video|moving background|motion background|animated background|background loop)\b/.test(t)) return false;
  if (/\b(remove|delete|without|take out|get rid of|turn off|stop|no)\b[^.!?]{0,30}\b(video|footage)\b/.test(t)) return false;
  return true;
}

/** Search words for the clip: what the person said it should show, else the business's own words. */
function videoQuery(project, instruction) {
  const t = String(instruction || "").toLowerCase();
  const subject = /\b(?:of|showing|shows|featuring|about)\s+([a-z ]{3,40}?)(?:\s+(?:in|on|at|for|behind|as)\b|[.,!?]|$)/.exec(t);
  const fromText = (s) => String(s || "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w) && !/^(video|footage|motion|moving|background|hero|loop|looping|animated|clip)$/.test(w));
  const words = subject ? fromText(subject[1]) : [];
  const own = words.length ? words : fromText((project && project.prompt) || "");
  return own.slice(0, 3).join(" ");
}

async function findClip(project, instruction, search) {
  const q = videoQuery(project, instruction);
  if (!q) return null;
  const find = search || ((query) => require("../image-bot").searchVideo(query));
  const clip = await find(q);
  return clip && /^https:\/\//.test(clip.url || "") ? { ...clip, query: q } : null;
}

function buildInstruction(instruction, clip) {
  const poster = clip.poster && /^https:\/\//.test(clip.poster) ? ` poster="${clip.poster}"` : "";
  return `${instruction}\n\nUse exactly this clip, do not invent another address: <video autoplay muted loop playsinline preload="metadata"${poster}><source src="${clip.url}" type="video/mp4"></video> Place it as the full-bleed background of the hero (object-fit: cover, behind the text, with a dark overlay so the words stay readable). Keep every other part of the page as it is.`;
}

/** The edit only counts if the clip is really in the page, inside a <video>. */
function hasClip(html, clip) {
  const h = String(html || "");
  const at = h.indexOf(clip.url);
  if (at === -1) return false;
  const open = h.toLowerCase().lastIndexOf("<video", at);
  return open !== -1 && h.toLowerCase().indexOf("</video", open) > at;
}

module.exports = { wantsVideo, videoQuery, findClip, buildInstruction, hasClip, NOT_AVAILABLE, NOT_APPLIED };
