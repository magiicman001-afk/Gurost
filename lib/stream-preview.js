/**
 * Live preview while a design streams in (Website Builder).
 *
 * The model's HTML arrives token by token. Rendering every token would
 * show half-written tags and re-run the page constantly, so the preview
 * advances one finished section at a time: a checkpoint is the text up
 * to the end of the last completed top-level block (</header>, </nav>,
 * </section>, </footer>, </main>, </aside>) that isn't inside a script,
 * style or comment. Browsers close any still-open elements at the end
 * of a document, so a checkpoint always renders as a valid page.
 *
 * Checkpoints only exist once </head> has arrived (the page's Tailwind
 * and fonts load from there). Image placeholders render as shimmering
 * boxes until the real images replace the whole page at the end.
 */

const BLOCK_CLOSE_RE = /<\/(header|nav|section|footer|main|aside)\s*>/gi;
const SHIMMER_GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const PREVIEW_HEAD = `<style data-gurost-preview>
img[data-gurost-pending]{background:linear-gradient(90deg,rgba(0,0,0,.06),rgba(0,0,0,.12),rgba(0,0,0,.06));background-size:200% 100%;animation:gurost-shimmer 1.2s linear infinite;min-height:140px;object-fit:cover}
@keyframes gurost-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
</style>`;
// Runs once Tailwind has styled the partial page (the builder fades the
// frame in after this):
// 1. Reveal-on-scroll content starts at opacity 0 and is faded in by a
//    script near the END of the page - which hasn't streamed yet - so
//    anything still invisible is shown (partials only; the finished page
//    keeps its own animations).
// 2. Bring the newest section's top into view (the page bottom can be a
//    tall section's empty padding).
const PREVIEW_TAIL = "<script data-gurost-preview>setTimeout(function(){try{document.querySelectorAll('body *').forEach(function(e){if(getComputedStyle(e).opacity==='0'){e.style.setProperty('opacity','1','important');e.style.setProperty('transform','none','important')}});var b=document.querySelectorAll('header,nav,section,footer,aside');if(b.length)b[b.length-1].scrollIntoView({block:'start'})}catch(e){}},300)</script>";

// [start, end) ranges of <script>, <style> and comments; an unclosed one
// runs to the end of the text (it is still streaming).
function opaqueRanges(text, from) {
  const ranges = [];
  const re = /<(script|style)\b[^>]*>|<!--/gi;
  re.lastIndex = from;
  const lower = text.toLowerCase();
  let m;
  while ((m = re.exec(text))) {
    const closer = m[0] === "<!--" ? "-->" : `</${m[1].toLowerCase()}`;
    const closeAt = lower.indexOf(closer, m.index + m[0].length);
    const end = closeAt === -1 ? text.length : closeAt + closer.length;
    ranges.push([m.index, end]);
    re.lastIndex = end;
  }
  return ranges;
}

const inRanges = (ranges, i) => ranges.some(([s, e]) => i >= s && i < e);

function stripTags(s) {
  return s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

// Human label for a finished block: its first heading, else its id, else
// a tag word, else the start of its text.
function blockLabel(segment, tag) {
  const h = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/i.exec(segment);
  const heading = h ? stripTags(h[1]) : "";
  if (heading) return clip(heading, 60);
  const id = new RegExp(`<${tag}\\b[^>]*\\bid=["']([^"']+)["']`, "i").exec(segment);
  if (id) return `#${id[1]}`;
  const word = { header: "header", nav: "navigation", footer: "footer", main: "main content", aside: "sidebar" }[tag];
  if (word) return word;
  // Icon-font glyphs are words ("verified", "star") - not part of the label.
  const text = stripTags(segment
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(span|i)\b[^>]*class=["'][^"']*\b(material-[\w-]+|icon[\w-]*)\b[^"']*["'][^>]*>[^<]*<\/\1\s*>/gi, " "));
  return text ? clip(text, 40) : "a section";
}

/**
 * The renderable page for the text streamed so far, or null if nothing
 * is renderable yet. `blocks` lists every completed top-level block in
 * order as { tag, label }.
 */
function buildPartialPage(rawText) {
  const text = String(rawText || "").replace(/\r\n?/g, "\n");
  let start = text.search(/<!doctype\s+html/i);
  if (start === -1) {
    const m = /(^|\n)[ \t]*(<html[\s>])/i.exec(text);
    if (m) start = m.index + m[0].length - m[2].length;
  }
  if (start === -1) return null;

  const ranges = opaqueRanges(text, start);
  const headClose = /<\/head\s*>/gi;
  headClose.lastIndex = start;
  let headEnd = -1;
  let hm;
  while ((hm = headClose.exec(text))) if (!inRanges(ranges, hm.index)) { headEnd = hm.index; break; }
  if (headEnd === -1) return null;

  const blocks = [];
  let cut = -1;
  let segmentStart = headEnd;
  BLOCK_CLOSE_RE.lastIndex = headEnd;
  let bm;
  while ((bm = BLOCK_CLOSE_RE.exec(text))) {
    if (inRanges(ranges, bm.index)) continue;
    cut = bm.index + bm[0].length;
    const tag = bm[1].toLowerCase();
    blocks.push({ tag, label: blockLabel(text.slice(segmentStart, cut), tag) });
    segmentStart = cut;
  }
  if (cut === -1) return null;

  let html = text.slice(start, cut);
  html = html.replace(/<\/head\s*>/i, `${PREVIEW_HEAD}</head>`);
  html = html.replace(/\bsrc=(["'])IMG_\d+\1/g, `src="${SHIMMER_GIF}" data-gurost-pending`);
  // Video clips arrive with the finished page. A placeholder src would
  // be fetched as "<builder url>/VID_1" (a console error per checkpoint),
  // so it is dropped: the empty <video> shows its container's colour.
  html = html.replace(/\s(src|poster)=(["'])VID_\d+\2/g, "");
  // Any placeholder left elsewhere (srcset, a stray attribute) - same.
  html = html.replace(/\b(IMG|VID)_\d+\b/g, SHIMMER_GIF);
  return { html: html + PREVIEW_TAIL, blocks };
}

/**
 * Feeds streamed text in and calls onCheckpoint({ html, blocks, newBlocks })
 * each time more blocks have completed - at most once per minIntervalMs,
 * so a burst of tiny sections doesn't make the preview flicker. Blocks
 * finished inside the interval are reported with the next checkpoint.
 */
function createStreamPreview({ onCheckpoint, minIntervalMs = 1200, now = Date.now }) {
  let text = "";
  let scannedTo = 0;
  let reported = 0;
  let lastEmit = -Infinity;
  let pending = false; // a block may have finished during the throttle window
  return {
    append(chunk) {
      if (!chunk) return;
      text += chunk;
      // Only rebuild when a block-closing tag may have just completed, or
      // one finished while throttled - otherwise it would wait for the
      // NEXT block to close, which can be a long section away.
      const fresh = text.slice(Math.max(0, scannedTo - 12));
      scannedTo = text.length;
      if (/<\/(header|nav|section|footer|main|aside)\s*>/i.test(fresh)) pending = true;
      if (!pending || now() - lastEmit < minIntervalMs) return;
      pending = false;
      const page = buildPartialPage(text);
      if (!page || page.blocks.length <= reported) return;
      const newBlocks = page.blocks.slice(reported);
      reported = page.blocks.length;
      lastEmit = now();
      onCheckpoint({ html: page.html, blocks: page.blocks, newBlocks, text });
    },
    text: () => text,
  };
}

module.exports = { buildPartialPage, createStreamPreview };
