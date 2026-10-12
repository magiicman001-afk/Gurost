/**
 * Honest "add a photo" edits (Bug II).
 *
 * Asking Pulse for a photo went straight to the correction model, which has no image source: it wrote an <img> with
 * an address it made up, the edit reported success (green tick) and the page showed only the alt text. Now, as for
 * videos (lib/video-request.js): find a real stock photo first (Pixabay, then Openverse - stored in Gurost's own
 * storage, never hotlinked); if there is none, say so and change nothing; if there is one, give the model the exact
 * <img> to use and check that the finished page really shows that photo.
 */
const STOP = new Set(["a", "an", "the", "and", "for", "with", "that", "this", "website", "site", "page", "build", "make", "want", "need", "please", "company", "business", "called", "named", "based", "near", "from", "about", "have", "good", "best", "nice", "new", "some", "more", "real", "section", "add", "put", "show", "here", "there", "into", "onto"]);
const PHOTO_WORDS = /^(image|images|photo|photos|picture|pictures|pic|pics|photograph|photographs|hero|banner|background|stock)$/;

const NOT_AVAILABLE = "I couldn't add a photo: no matching stock photo is available for this right now, so your page is unchanged. Try describing the photo differently, or upload your own.";
const NOT_APPLIED = "I found a photo but it did not end up on the page, so nothing was changed. Please try again.";

/** True when the instruction asks to ADD a photo (not to remove, resize or restyle one already there). */
function wantsImage(instruction) {
  const t = String(instruction || "").toLowerCase();
  if (!/\b(images?|photos?|pictures?|pics?|photographs?)\b/.test(t)) return false;
  if (/\b(remove|delete|without|take out|get rid of|hide|no)\b[^.!?]{0,30}\b(images?|photos?|pictures?|pics?)\b/.test(t)) return false;
  return /\b(add|put|insert|include|show|use|place|give|need|want|with|more|some)\b/.test(t);
}

/** Search words for the photo: what the person said it should show, else the business's own words. */
function imageQuery(project, instruction) {
  const t = String(instruction || "").toLowerCase();
  const subject = /\b(?:of|showing|shows|featuring|with)\s+([a-z ]{3,50}?)(?:\s+(?:in|on|at|for|behind|as|to|under|above|below|next)\b|[.,!?]|$)/.exec(t);
  const fromText = (s) => String(s || "").toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !PHOTO_WORDS.test(w));
  const words = subject ? fromText(subject[1]) : [];
  const own = words.length ? words : fromText((project && project.prompt) || "");
  return own.slice(0, 4).join(" ");
}

async function findImage(project, instruction, search) {
  const q = imageQuery(project, instruction);
  if (!q) return null;
  const find = search || ((query) => require("../image-bot").searchImage(query));
  const photo = await find(q);
  return photo && /^https:\/\//.test(photo.url || "") ? { ...photo, query: q } : null;
}

function buildInstruction(instruction, photo) {
  const alt = photo.query.replace(/"/g, "");
  return `${instruction}\n\nUse exactly this photo, do not invent another address: <img src="${photo.url}" alt="${alt}" loading="lazy" style="width:100%;height:auto;object-fit:cover"> Put it where the instruction says (if it doesn't say, in the most fitting section), sized to suit that spot. Keep every other part of the page as it is.`;
}

/** The edit only counts if the photo is really in the page, as an <img> src. */
function hasImage(html, photo) {
  const h = String(html || "");
  const at = h.indexOf(photo.url);
  if (at === -1) return false;
  const open = h.lastIndexOf("<", at);
  return /^<img\b[^>]*\bsrc=["']?$/i.test(h.slice(open, at));
}

module.exports = { wantsImage, imageQuery, findImage, buildInstruction, hasImage, NOT_AVAILABLE, NOT_APPLIED };
