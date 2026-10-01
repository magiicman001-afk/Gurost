/**
 * Parses a Website Builder model reply into { html, summary, imageRequests }.
 *
 * Primary format: the reply IS the HTML document. Metadata lives inside it:
 *   <meta name="gurost:summary" content="one sentence">
 *   <img src="IMG_1" data-gurost-image="what the image should show">
 *   <video src="VID_1" data-gurost-video="stock footage search terms">
 * so there is no second grammar (JSON, markers, base64) for the model to
 * get wrong across 20-50KB of output. The document is located by its own
 * boundaries (<!DOCTYPE html> / <html ...> ... last </html>), which makes
 * commentary, markdown fences and CRLF line endings irrelevant.
 *
 * Fallbacks, for models that ignore the instruction: the legacy JSON
 * shape {"html": ...} (with repair for the images list), ===HTML===
 * marker sections, and fenced ```html blocks.
 *
 * Anything unusable throws VariantParseError with a specific reason and
 * the full raw reply attached - never a silent partial result.
 */

class VariantParseError extends Error {
  constructor(reason, raw) {
    super(reason);
    this.name = "VariantParseError";
    this.reason = reason;
    this.raw = raw;
  }
}

const PLACEHOLDER_RE = /^IMG_\d+$/;
// Image importance, used to route generation: hero/featured get Gemini,
// the rest stock photos. Missing or unknown roles count as secondary.
const IMAGE_ROLES = new Set(["hero", "featured", "secondary", "decorative"]);
const VIDEO_PLACEHOLDER_RE = /^VID_\d+$/;

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// Quote-aware scan of one start tag beginning at html[i] === "<".
// Returns { name, attrs: [{ name, value, start, end }], end } where
// start/end are offsets into html; attribute values may contain ">".
function parseTagAt(html, i) {
  const nameMatch = /^<([a-zA-Z][\w:-]*)/.exec(html.slice(i, i + 64));
  if (!nameMatch) return null;
  let p = i + nameMatch[0].length;
  const attrs = [];
  while (p < html.length) {
    while (p < html.length && /\s/.test(html[p])) p++;
    if (html[p] === ">") return { name: nameMatch[1].toLowerCase(), attrs, end: p + 1 };
    if (html.startsWith("/>", p)) return { name: nameMatch[1].toLowerCase(), attrs, end: p + 2 };
    const attrStart = p;
    const an = /^[^\s=>/"']+/.exec(html.slice(p, p + 256));
    if (!an) { p++; continue; } // stray character - skip it rather than loop
    p += an[0].length;
    let value = "";
    let q = p;
    while (q < html.length && /\s/.test(html[q])) q++;
    if (html[q] === "=") {
      q++;
      while (q < html.length && /\s/.test(html[q])) q++;
      const quote = html[q];
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, q + 1);
        if (close === -1) return null; // unterminated attribute - treat tag as broken
        value = html.slice(q + 1, close);
        p = close + 1;
      } else {
        const uv = /^[^\s>]+/.exec(html.slice(q));
        value = uv ? uv[0] : "";
        p = q + value.length;
      }
    }
    attrs.push({ name: an[0].toLowerCase(), value, start: attrStart, end: p });
  }
  return null; // ran off the end: truncated tag
}

// Every start tag of the given names, in document order.
function findTags(html, names) {
  const re = new RegExp(`<(?:${names.join("|")})\\b`, "gi");
  const tags = [];
  let m;
  while ((m = re.exec(html))) {
    const tag = parseTagAt(html, m.index);
    if (tag) { tags.push({ ...tag, start: m.index }); re.lastIndex = tag.end; }
  }
  return tags;
}

// The HTML document inside the reply, located by its own boundaries.
// Returns null when no document start exists at all.
function extractDocument(text) {
  let start = text.search(/<!doctype\s+html/i);
  if (start === -1) {
    const m = /(^|\n)[ \t]*(<html[\s>])/i.exec(text);
    if (m) start = m.index + m[0].length - m[2].length; // position of "<html"
  }
  if (start === -1) return null;
  // The document ends at the first </html> that isn't inside a <script>,
  // <style> or comment: a script may contain the string "</html>", and
  // trailing commentary may mention it too, so neither first-overall
  // nor last-overall is right. An unclosed script (truncated reply)
  // swallows the rest of the text, so no end is found -> truncated.
  const skip = [];
  const blockRe = /<(script|style)\b[^>]*>|<!--/gi;
  let b;
  blockRe.lastIndex = start;
  while ((b = blockRe.exec(text))) {
    const closer = b[0] === "<!--" ? "-->" : `</${b[1].toLowerCase()}`;
    const closeAt = text.toLowerCase().indexOf(closer, b.index + b[0].length);
    const blockEnd = closeAt === -1 ? text.length : closeAt + closer.length;
    skip.push([b.index, blockEnd]);
    blockRe.lastIndex = blockEnd;
  }
  let end = -1;
  const closeRe = /<\/html\s*>/gi;
  closeRe.lastIndex = start;
  let m;
  while ((m = closeRe.exec(text))) {
    if (!skip.some(([s, e]) => m.index >= s && m.index < e)) { end = m.index + m[0].length; break; }
  }
  if (end === -1) {
    throw new VariantParseError(`HTML is truncated: no closing </html> after the document start (reply ends with: ${JSON.stringify(text.slice(-80))})`, text);
  }
  return text.slice(start, end);
}

// Lenient parse for a small JSON array of {placeholder, description}:
// fences, smart quotes, trailing commas and single quotes are repaired;
// failing that, pairs are pulled out with a regex.
function repairImagesJson(text) {
  if (!text) return [];
  let t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const attempts = [
    t,
    t.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/,\s*([\]}])/g, "$1"),
  ];
  attempts.push(attempts[1].replace(/'([^'\\]*)'/g, '"$1"').replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":'));
  for (const a of attempts) {
    try {
      const v = JSON.parse(a);
      if (Array.isArray(v)) return v;
    } catch { /* try the next repair */ }
  }
  const out = [];
  const pairRe = /placeholder["']?\s*:\s*["'](IMG_\d+)["'][\s\S]*?description["']?\s*:\s*["']([^"']*)["']/g;
  let m;
  while ((m = pairRe.exec(t))) out.push({ placeholder: m[1], description: m[2] });
  return out;
}

// Non-primary shapes: legacy JSON, ===HTML=== markers, ```html fences.
// Returns { html, summary, imageRequests, format } or null.
function parseFallbackFormats(text) {
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (unfenced.startsWith("{") && /"html"\s*:/.test(unfenced)) {
    let obj = null;
    try { obj = JSON.parse(unfenced); } catch { /* fall through to error below */ }
    if (!obj || typeof obj.html !== "string") {
      throw new VariantParseError("Reply used the legacy JSON format but it is not valid JSON (the HTML inside it was mis-escaped).", text);
    }
    return { html: obj.html, summary: obj.summary || "", imageRequests: repairImagesJson(JSON.stringify(obj.imageRequests || [])), format: "legacy-json" };
  }
  const markerAt = text.indexOf("===HTML===");
  if (markerAt !== -1) {
    const head = text.slice(0, markerAt);
    const summary = (/===SUMMARY===\s*([\s\S]*?)(?:===IMAGES===|$)/.exec(head) || [])[1]?.trim() || "";
    const images = (/===IMAGES===\s*([\s\S]*)$/.exec(head) || [])[1] || "";
    return { html: text.slice(markerAt + 10), summary, imageRequests: repairImagesJson(images), format: "markers" };
  }
  const fence = /```html\s*\n([\s\S]*?)\n```/i.exec(text);
  if (fence) return { html: fence[1], summary: "", imageRequests: [], format: "fenced" };
  return null;
}

function parseVariantResponse(rawText) {
  if (typeof rawText !== "string" || !rawText.trim()) throw new VariantParseError("Empty reply from the model.", rawText);
  const text = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  let html;
  let summary = "";
  let imageRequests = [];
  let format = "html";

  // JSON-shaped replies are checked first: their escaped HTML also
  // contains "<!DOCTYPE html", which must not be sliced out as a page.
  const looksJson = /^\s*(```(?:json)?\s*)?\{/.test(text) && /"html"\s*:/.test(text.slice(0, 200));
  // Marker format: a ===HTML=== line BEFORE the document starts. Marker
  // text inside the page itself (after the start) is just content.
  const markerLine = /^===HTML===[ \t]*$/m.exec(text);
  const docStart = text.search(/<!doctype\s+html|(^|\n)[ \t]*<html[\s>]/i);
  const usesMarkers = markerLine && (docStart === -1 || markerLine.index < docStart);
  const fallback = looksJson || usesMarkers ? parseFallbackFormats(text) : null;
  if (fallback) {
    ({ summary, imageRequests, format } = fallback);
    html = extractDocument(fallback.html.replace(/\r\n?/g, "\n")) ?? fallback.html;
  } else {
    const doc = extractDocument(text);
    if (doc) {
      html = doc;
    } else {
      const other = parseFallbackFormats(text);
      if (!other) throw new VariantParseError(`Reply contains no HTML document (no <!DOCTYPE html> or <html> start). Reply starts with: ${JSON.stringify(text.slice(0, 120))}`, rawText);
      ({ summary, imageRequests, format } = other);
      html = extractDocument(other.html) ?? other.html;
    }
  }

  // Structural checks - a clear error beats shipping a broken page.
  if (!/<html[\s>]/i.test(html) || !/<\/html\s*>/i.test(html)) throw new VariantParseError("HTML is missing its <html> or </html> tag.", rawText);
  if (!/<body[\s>]/i.test(html)) throw new VariantParseError("HTML has no <body> - the reply is not a complete page.", rawText);
  if ((html.match(/\\"/g) || []).length > 20 && /class=\\"/.test(html)) {
    throw new VariantParseError('HTML is still JSON-escaped (contains class=\\" sequences) - it would render as broken text.', rawText);
  }

  // Embedded metadata (primary format), then strip it from the page.
  const removals = [];
  for (const tag of findTags(html, ["meta"])) {
    const nameAttr = tag.attrs.find((a) => a.name === "name");
    if (nameAttr && nameAttr.value.toLowerCase() === "gurost:summary") {
      if (!summary) summary = decodeEntities(tag.attrs.find((a) => a.name === "content")?.value || "").trim();
      removals.push({ start: tag.start, end: tag.end });
    }
  }
  const seen = new Set(imageRequests.map((r) => r && r.placeholder));
  for (const tag of findTags(html, ["img"])) {
    const desc = tag.attrs.find((a) => a.name === "data-gurost-image");
    if (!desc) continue;
    const src = tag.attrs.find((a) => a.name === "src")?.value.trim();
    const roleAttr = tag.attrs.find((a) => a.name === "data-gurost-image-role");
    if (src && PLACEHOLDER_RE.test(src) && !seen.has(src)) {
      seen.add(src);
      const role = (roleAttr?.value || "").trim().toLowerCase();
      imageRequests.push({
        placeholder: src,
        description: decodeEntities(desc.value).trim(),
        role: IMAGE_ROLES.has(role) ? role : "secondary",
        alt: decodeEntities(tag.attrs.find((a) => a.name === "alt")?.value || "").trim()
      });
    }
    // Strip Gurost's working attributes (preceding space included).
    for (const a of [desc, roleAttr]) if (a) removals.push({ start: a.start - 1, end: a.end });
  }
  // Videos: <video src="VID_n" data-gurost-video="search terms">. The
  // placeholder may instead sit on a <source> inside the video, and the
  // search terms on either one. Filled with stock footage.
  const videoRequests = [];
  for (const tag of findTags(html, ["video", "source"])) {
    const query = tag.attrs.find((a) => a.name === "data-gurost-video");
    if (!query) continue;
    let src = tag.attrs.find((a) => a.name === "src")?.value.trim();
    if (!src && tag.name === "video") {
      const inner = html.slice(tag.end, html.toLowerCase().indexOf("</video", tag.end));
      src = (/<source\b[^>]*\bsrc=["'](VID_\d+)["']/i.exec(inner) || [])[1];
    }
    if (src && VIDEO_PLACEHOLDER_RE.test(src) && !videoRequests.some((r) => r.placeholder === src)) {
      const q = decodeEntities(query.value).trim();
      if (q) videoRequests.push({ placeholder: src, query: q });
    }
    removals.push({ start: query.start - 1, end: query.end });
  }
  removals.sort((a, b) => b.start - a.start);
  for (const r of removals) html = html.slice(0, r.start) + html.slice(r.end);

  if (!summary) summary = decodeEntities((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || "").trim();

  imageRequests = imageRequests.filter((r) => r && PLACEHOLDER_RE.test(String(r.placeholder)) && typeof r.description === "string" && r.description.trim());
  return { html, summary, imageRequests, videoRequests, format };
}

module.exports = { parseVariantResponse, VariantParseError, repairImagesJson, parseTagAt };
