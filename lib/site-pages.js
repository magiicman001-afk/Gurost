/**
 * Turns the one-file design (project.currentHtml, the master) into a real
 * multi-page site. No AI, no cost, nothing invented: every page is made only
 * of what the design already contains.
 *
 *   index.html, about.html, <offering>.html, contact.html, order.html,
 *   styles.css, script.js
 *
 * The offering page is named after the design's own nav label (menu, services,
 * products, features...). The shared header and footer are repeated on every
 * page. Links that pointed at a section ("#order") point at the page that now
 * holds it ("order.html"). Pages are derived each time from the master, so
 * Pulse edits, undo and image changes keep working with no extra bookkeeping.
 *
 * buildSite() never throws and never makes things worse: when the design cannot
 * be split sensibly it returns { multi:false } with the original page as
 * index.html.
 */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW = new Set(["script", "style", "textarea", "title"]);

const textOf = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function attr(openTag, name) {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(openTag);
  return m ? (m[2] ?? m[3]) : null;
}

/**
 * Splits markup into its top-level pieces: elements (with open tag, inner and
 * close tag) and anything between them. Tolerant of unclosed <p>/<li> and stray
 * closing tags, which generated HTML often has.
 */
function topLevel(html) {
  const lower = html.toLowerCase(); // once, not per script tag (pages with inline images are megabytes)
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const out = [];
  const stack = [];
  let cursor = 0, start = null, startTag = null, openEnd = 0, m;
  const flushText = (to) => { if (to > cursor) out.push({ kind: "text", html: html.slice(cursor, to) }); };
  while ((m = re.exec(html))) {
    if (m[0].startsWith("<!--")) continue;
    const closing = m[1] === "/", tag = m[2].toLowerCase(), selfClose = /\/\s*$/.test(m[3]);
    if (!closing) {
      if (RAW.has(tag) && !selfClose) {
        const end = lower.indexOf(`</${tag}`, re.lastIndex);
        const close = end === -1 ? -1 : html.indexOf(">", end);
        if (close === -1) { re.lastIndex = html.length; }
        else {
          if (!stack.length) { flushText(m.index); out.push({ kind: "el", tag, open: m[0], inner: html.slice(re.lastIndex, end), close: html.slice(end, close + 1), outer: html.slice(m.index, close + 1) }); cursor = close + 1; }
          re.lastIndex = close + 1;
        }
        continue;
      }
      if (VOID.has(tag) || selfClose) {
        if (!stack.length) { flushText(m.index); out.push({ kind: "el", tag, open: m[0], inner: "", close: "", outer: m[0] }); cursor = m.index + m[0].length; }
        continue;
      }
      if (!stack.length) { flushText(m.index); start = m.index; startTag = m[0]; openEnd = m.index + m[0].length; }
      stack.push(tag);
    } else {
      const at = stack.lastIndexOf(tag);
      if (at === -1) continue; // a stray closing tag
      stack.length = at; // implicitly closes anything left open inside it
      if (!stack.length && start !== null) {
        out.push({ kind: "el", tag, open: startTag, inner: html.slice(openEnd, m.index), close: m[0], outer: html.slice(start, m.index + m[0].length) });
        cursor = m.index + m[0].length; start = null;
      }
    }
  }
  if (start !== null) out.push({ kind: "text", html: html.slice(start) }); // never closed: keep it as it was
  else flushText(html.length);
  return out;
}

const significant = (blocks) => blocks.filter((b) => b.kind === "el" && !["script", "style", "link", "meta"].includes(b.tag));
const WRAPPERS = new Set(["div", "main", "article"]);
const STRUCTURAL = new Set(["header", "nav", "section", "footer", "main", "article", "aside"]);

/** Finds the header, the page content blocks and the footer, remembering any wrapper tags around them. */
function layout(bodyInner) {
  let wrapOpen = "", wrapClose = "";
  let blocks = topLevel(bodyInner);
  // One element holding the whole page (a root or app wrapper): look inside it.
  for (let i = 0; i < 3; i++) {
    const sig = significant(blocks);
    if (sig.length !== 1 || !WRAPPERS.has(sig[0].tag)) break;
    const inner = topLevel(sig[0].inner);
    if (!significant(inner).some((b) => STRUCTURAL.has(b.tag) || WRAPPERS.has(b.tag))) break;
    wrapOpen += blocks.slice(0, blocks.indexOf(sig[0])).map((b) => b.html || b.outer).join("") + sig[0].open;
    wrapClose = sig[0].close + blocks.slice(blocks.indexOf(sig[0]) + 1).map((b) => b.html || b.outer).join("") + wrapClose;
    blocks = inner;
  }
  const sig = significant(blocks);
  const firstContent = sig.findIndex((b) => !["header", "nav"].includes(b.tag));
  const footerAt = sig.map((b) => b.tag).lastIndexOf("footer");
  const header = sig.slice(0, firstContent === -1 ? sig.length : firstContent);
  const footer = footerAt > -1 && footerAt >= (firstContent === -1 ? 0 : firstContent) ? [sig[footerAt]] : [];
  let content = sig.filter((b) => !header.includes(b) && !footer.includes(b));
  const shared = []; // floating pieces (cookie banner, back-to-top button): on every page
  content = content.filter((b) => { if (/\bfixed\b/.test(attr(b.open, "class") || "") || /position\s*:\s*fixed/i.test(attr(b.open, "style") || "")) { shared.push(b); return false; } return true; });
  // A <main> (or div) around the sections: its own tags become each page's content wrapper. Sections added
  // next to it (the order or contact form the builder adds before the footer) join the content too.
  let mainOpen = "<main>", mainClose = "</main>";
  const at = content.findIndex((b) => WRAPPERS.has(b.tag) && significant(topLevel(b.inner)).length >= 2);
  if (at !== -1) {
    mainOpen = content[at].open; mainClose = content[at].close;
    content = [...content.slice(0, at), ...significant(topLevel(content[at].inner)), ...content.slice(at + 1)];
  }
  return { wrapOpen, wrapClose, header, footer, shared, content, mainOpen, mainClose };
}

// ---- which page does a section belong on ----
const PAGE_WORDS = { home: "home", index: "home", about: "about", offering: "offering", menu: "offering", services: "offering", products: "offering", features: "offering", pricing: "offering", shop: "offering", contact: "contact", order: "order", book: "order", booking: "order" };
const RULES = [
  ["order", /(^|[^a-z])(order|book|booking|reserve|reservation|checkout)([^a-z]|$)/],
  ["contact", /contact|get[- ]in[- ]touch|find[- ]us|visit|location|hours|map|enquir|inquir|faq|directions|where/],
  ["offering", /menu|product|service|feature|pricing|price|offer|shop|collection|work|portfolio|treatment|class|course|room|practice|solution|catalog|packages|plans/],
  ["about", /about|story|team|who[- ]we|mission|values|founder|philosoph|craft|our[- ]people|meet/],
  ["home", /hero|testimonial|review|proof|trust|cta|newsletter|stat|gallery|highlight/]
];
function classify(block) {
  const dp = (attr(block.open, "data-page") || "").toLowerCase();
  if (PAGE_WORDS[dp]) return PAGE_WORDS[dp];
  const id = (attr(block.open, "id") || "").toLowerCase();
  const heading = textOf((/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(block.inner) || [])[1]).toLowerCase();
  for (const key of [id, heading]) {
    if (!key) continue;
    for (const [page, re] of RULES) if (re.test(key)) return page;
  }
  return "home";
}

const OFFERING_NAMES = ["menu", "services", "products", "features", "pricing", "shop", "work", "portfolio", "treatments", "classes", "courses", "rooms", "solutions", "packages", "plans", "collection"];
/** The offering page's name: the design's own nav label for that section. */
function offeringName(offeringBlocks, navLinks) {
  const ids = offeringBlocks.map((b) => attr(b.open, "id")).filter(Boolean);
  const candidates = [];
  for (const l of navLinks) if (ids.includes(l.href.replace(/^#/, ""))) candidates.push(l.label);
  for (const id of ids) candidates.push(id);
  for (const b of offeringBlocks) candidates.push(textOf((/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(b.inner) || [])[1]));
  for (const c of candidates) {
    const s = String(c).toLowerCase();
    const word = OFFERING_NAMES.find((n) => new RegExp(`\\b${n}`).test(s)) || (/\bservice/.test(s) ? "services" : null);
    if (word) return word;
  }
  return "services";
}

function navLinksOf(headerBlocks) {
  const links = [];
  for (const h of headerBlocks) for (const m of h.outer.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(`<a ${m[1]}>`, "href");
    if (href && href.startsWith("#") && href.length > 1) links.push({ href, label: textOf(m[2]) });
  }
  return links;
}

const idsIn = (html) => [...String(html).matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);

/** Points anchors at the page that now holds the section. */
function rewriteLinks(html, { current, currentKey, homeFile, pageOfId, primaryOf, fileOf, markActive }) {
  return html.replace(/<a\b[^>]*>/gi, (open) => {
    const href = attr(open, "href");
    if (href === null) return open;
    let to = href;
    if (href === "#" || href === "#top" || href === "#home") to = current === homeFile ? href : homeFile;
    else if (href.startsWith("#") && href.length > 1) {
      const id = href.slice(1), page = pageOfId[id];
      if (!page) to = homeFile; // points at nothing that exists: the home page is the safe place
      else if (page === "*" || (page === currentKey && !primaryOf[id])) to = href;
      else to = primaryOf[id] ? fileOf[page] : `${fileOf[page]}${href}`;
    }
    let tag = to === href ? open : open.replace(/(\shref\s*=\s*)("[^"]*"|'[^']*')/i, (_, pre) => `${pre}"${escAttr(to)}"`);
    if (markActive && !to.startsWith("#") && to.split("#")[0] === current && !/aria-current/i.test(tag)) tag = tag.replace(/^<a\b/i, '<a aria-current="page"');
    return tag;
  });
}

function buildSite(html, { businessInfo = null } = {}) {
  const original = String(html || "");
  const single = (reason) => ({ multi: false, pages: [{ file: "index.html", label: "Home" }], files: [{ path: "index.html", content: original }], report: { reason } });
  try {
    const bodyAt = original.search(/<body\b/i);
    if (bodyAt === -1) return single("no <body>");
    const bodyOpenEnd = original.indexOf(">", bodyAt) + 1;
    const bodyCloseAt = original.toLowerCase().lastIndexOf("</body");
    const bodyOpen = original.slice(bodyAt, bodyOpenEnd);
    const bodyInnerRaw = original.slice(bodyOpenEnd, bodyCloseAt === -1 ? undefined : bodyCloseAt);
    const headInner = (/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(original) || [])[1] || "";
    const htmlOpen = (/<html\b[^>]*>/i.exec(original) || ["<html lang=\"en\">"])[0];
    const doctype = (/^\s*<!doctype[^>]*>/i.exec(original) || ["<!DOCTYPE html>"])[0].trim();

    // Scripts: ordinary inline ones are gathered into script.js (each in its own try so one that is not
    // needed on a page cannot stop the others); other body scripts (external, modules, JSON) stay on every page.
    const inlineScripts = [], tail = [];
    let bodyInner = bodyInnerRaw.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi, (whole, a, code) => {
      const type = (attr(`<script ${a}>`, "type") || "").toLowerCase();
      const isJs = !type || /javascript|ecmascript/.test(type);
      if (isJs && !/\ssrc\s*=/i.test(a) && !/type\s*=\s*["']module/i.test(a)) { inlineScripts.push(code); return ""; }
      tail.push(whole); return "";
    });
    // Styles: plain <style> blocks move to styles.css; Tailwind's own (type text/tailwindcss) must stay inline.
    const css = [], keptHead = [];
    const takeStyles = (s, intoHead) => s.replace(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi, (whole, a, code) => {
      if (/tailwind/i.test(a)) { if (intoHead) keptHead.push(whole); return intoHead ? "" : whole; }
      css.push(code); return "";
    });
    bodyInner = takeStyles(bodyInner, true);
    const head = takeStyles(headInner, false);

    const lay = layout(bodyInner);
    if (!lay.content.length) return single("no sections found");

    const navLinks = navLinksOf(lay.header);
    const groups = { home: [], about: [], offering: [], contact: [], order: [] };
    // The opening section (the one with the main heading) is the home page's; so is anything unrecognised.
    lay.content.forEach((b, i) => { const p = i === 0 && /<h1\b/i.test(b.inner) ? "home" : classify(b); groups[p].push(b); });
    if (!groups.home.length) { // a page must open with something: take the first section in reading order
      const first = lay.content[0];
      for (const k of Object.keys(groups)) groups[k] = groups[k].filter((b) => b !== first);
      groups.home.push(first);
    }
    const made = Object.keys(groups).filter((k) => groups[k].length);
    if (made.length < 2) return single("everything belongs on one page");

    const offering = offeringName(groups.offering, navLinks);
    const fileOf = { home: "index.html", about: "about.html", contact: "contact.html", order: "order.html", offering: `${offering}.html` };
    if (new Set(Object.values(fileOf)).size < 5) fileOf.offering = "services.html";
    const labelOf = { home: "Home", about: "About", contact: "Contact", order: "Order", offering: offering.charAt(0).toUpperCase() + offering.slice(1) };

    // Which page holds each id; header and footer are on every page.
    const pageOfId = {}, primaryOf = {};
    for (const key of made) groups[key].forEach((b, i) => { const own = attr(b.open, "id"); if (own) primaryOf[own] = i === 0 && key !== "home"; idsIn(b.outer).forEach((id) => { pageOfId[id] = key; }); });
    [...lay.header, ...lay.footer, ...lay.shared].forEach((b) => idsIn(b.outer).forEach((id) => { pageOfId[id] = "*"; }));
    pageOfId.top = "*";

    const origTitle = textOf((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head) || [])[1]) || (businessInfo && businessInfo.name) || "My site";
    const siteName = origTitle.split(/\s[|\-–—:]\s/)[0].trim() || origTitle;
    const homeDescription = textOf((/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(head) || [])[1]);
    const stripHead = head
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
      .replace(/<meta\s+property=["']og:(title|description)["'][^>]*>/gi, "");
    const fixedHeader = lay.header.some((b) => /\bfixed\b/.test(attr(b.open, "class") || "") || /position\s*:\s*fixed/i.test(attr(b.open, "style") || ""));

    const homeFile = fileOf.home;
    const pages = [], files = [];
    for (const key of made) {
      const file = fileOf[key];
      const own = groups[key];
      const title = key === "home" ? origTitle : `${labelOf[key]} | ${siteName}`;
      const firstPara = textOf((/<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(own.map((b) => b.outer).join("")) || [])[1]);
      const description = key === "home" ? (homeDescription || clip(firstPara, 160)) : clip(firstPara.length >= 40 ? firstPara : `${labelOf[key]} - ${siteName}`, 160);
      const ctx = { current: file, currentKey: key, homeFile, pageOfId, primaryOf, fileOf };
      const part = (blocks, active) => rewriteLinks(blocks.map((b) => b.outer).join("\n"), { ...ctx, markActive: active });
      const pad = key !== "home" && fixedHeader ? ' style="padding-top:5rem"' : "";
      const main = lay.mainOpen.replace(/>$/, `${pad}>`);
      const pageHtml = [
        doctype, htmlOpen, "<head>", stripHead.trim(),
        keptHead.join("\n"),
        `<title>${escAttr(title)}</title>`,
        description ? `<meta name="description" content="${escAttr(description)}">` : "",
        `<meta property="og:title" content="${escAttr(title)}">`,
        description ? `<meta property="og:description" content="${escAttr(description)}">` : "",
        '<link rel="stylesheet" href="styles.css">', "</head>",
        bodyOpen, lay.wrapOpen,
        part(lay.header, true), main, part(own, false), lay.mainClose,
        part(lay.footer, false), part(lay.shared, false), lay.wrapClose,
        tail.join("\n"), '<script src="script.js" defer></script>', "</body>", "</html>"
      ].filter(Boolean).join("\n");
      pages.push({ file, label: labelOf[key], title, description });
      files.push({ path: file, content: pageHtml });
    }

    const imports = [];
    const cssBody = css.join("\n").replace(/@import[^;]+;/gi, (m) => { imports.push(m); return ""; });
    const pageMap = {}; if (made.includes("order")) pageMap.order = fileOf.order; if (made.includes("contact")) pageMap.contact = fileOf.contact;
    const js = [`/* Shared by every page. */`, `window.GUROST_PAGES = ${JSON.stringify(pageMap)};`,
      ...inlineScripts.map((code) => `try {\n${code.trim()}\n} catch (e) { /* not needed on this page */ }`)].join("\n\n");
    files.push({ path: "styles.css", content: `${imports.join("\n")}\n${cssBody.trim()}\n`.trimStart() });
    files.push({ path: "script.js", content: `${js}\n` });

    return { multi: true, pages, files, report: { offeringFile: fileOf.offering, pageCount: pages.length } };
  } catch (err) {
    return single(`could not split: ${err.message}`);
  }
}

/**
 * The preview frame can't fetch styles.css / script.js (it is a srcdoc
 * page), so each page is handed to it with both files written inline.
 * Returns { "index.html": "<html>...", ... }. Pure string work, never throws.
 */
function previewDocs(files) {
  const out = {};
  try {
    const list = Array.isArray(files) ? files : [];
    const get = (p) => (list.find((f) => f && f.path === p) || {}).content;
    const css = get("styles.css");
    const js = get("script.js");
    for (const f of list) {
      if (!f || !/\.html$/i.test(f.path)) continue;
      let doc = String(f.content);
      // Function replacers: a "$&" inside the CSS or JS must stay literal text.
      if (typeof css === "string") {
        doc = doc.replace(/<link\b[^>]*href=["']styles\.css["'][^>]*>/i, () => `<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`);
      }
      if (typeof js === "string") {
        doc = doc.replace(/<script\b[^>]*src=["']script\.js["'][^>]*><\/script>/i, () => `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`);
      }
      out[f.path] = doc;
    }
  } catch (e) { /* an empty map makes the caller fall back to the single page */ }
  return out;
}

module.exports = { buildSite, topLevel, classify, offeringName, rewriteLinks, previewDocs };
