/**
 * Plain English toggle — real DOM annotation, not destructive text
 * replacement. An earlier version of this file did a direct swap
 * (term -> full explanation, inline), and testing it against real
 * sentences immediately showed why that's wrong: "Your API endpoint
 * connects to Stripe" became "Your how your app talks to another
 * service, like Stripe connects to Stripe" — grammatically broken,
 * because a glossary explanation is a full clause, not a drop-in
 * noun phrase. This version keeps the real sentence completely
 * intact and wraps just the matched term in a tooltip instead.
 *
 * Self-injecting, like shared/widget.js — one script include is
 * enough per page. Fetches the real glossary once (GET
 * /api/plain-english/glossary) and caches it for the page's lifetime.
 */

(function () {
  const STORAGE_KEY = 'gurost_plain_english_enabled';
  let glossary = null;

  async function loadGlossary() {
    if (glossary) return glossary;
    try {
      const res = await fetch('/api/plain-english/glossary');
      glossary = await res.json();
    } catch {
      glossary = {}; // real failure mode: toggle becomes a no-op rather than breaking the page
    }
    return glossary;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function walkTextNodes(root, callback) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest('.gw-plain-english-term')) return NodeFilter.FILTER_REJECT; // don't re-annotate an already-annotated term
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(callback); // collect first, then process — mutating mid-walk breaks the walker
  }

  function buildPattern(glossaryMap) {
    const terms = Object.keys(glossaryMap).sort((a, b) => b.length - a.length);
    if (!terms.length) return null;
    return { terms, regex: new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi') };
  }

  function annotateNode(textNode, glossaryMap, patternInfo) {
    const text = textNode.textContent;
    const { terms, regex } = patternInfo;
    const re = new RegExp(regex.source, 'gi');
    const matches = [...text.matchAll(re)];
    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    matches.forEach((match) => {
      if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const key = terms.find((t) => t.toLowerCase() === match[0].toLowerCase());
      const span = document.createElement('span');
      span.className = 'gw-plain-english-term';
      span.textContent = match[0];
      span.title = glossaryMap[key];
      span.style.cssText = 'border-bottom: 1px dotted #FF8C00; cursor: help;';
      fragment.appendChild(span);
      lastIndex = match.index + match[0].length;
    });
    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));

    textNode.parentNode.replaceChild(fragment, textNode);
  }

  function enable() {
    loadGlossary().then((g) => {
      const patternInfo = buildPattern(g);
      if (!patternInfo) return;
      walkTextNodes(document.body, (node) => annotateNode(node, g, patternInfo));
      localStorage.setItem(STORAGE_KEY, 'true');
    });
  }

  function disable() {
    // Real revert: unwrap every annotated span back to plain text,
    // then normalize so adjacent text nodes merge back into one —
    // matches how the page looked before enabling, not an approximation.
    document.querySelectorAll('.gw-plain-english-term').forEach((span) => {
      const text = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(text, span);
    });
    document.body.normalize();
    localStorage.setItem(STORAGE_KEY, 'false');
  }

  function buildToggle() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed; bottom:24px; left:24px; z-index:2147483000; font-family:-apple-system,sans-serif;';
    wrap.innerHTML = `
      <label style="display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e5e7eb; border-radius:999px; padding:8px 14px; box-shadow:0 4px 12px rgba(0,0,0,0.08); cursor:pointer; font-size:13px; color:#1a1a1a;">
        <input type="checkbox" id="gwPlainEnglishToggle" style="cursor:pointer;">
        Explain like I'm new to this
      </label>
    `;
    document.body.appendChild(wrap);

    const checkbox = wrap.querySelector('#gwPlainEnglishToggle');
    const wasEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
    checkbox.checked = wasEnabled;
    if (wasEnabled) enable();

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) enable();
      else disable();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToggle);
  } else {
    buildToggle();
  }
})();
