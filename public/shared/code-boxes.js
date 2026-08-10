/**
 * Clickable Code Boxes — real section detection, not a fixed grid
 * guess. A small script gets injected into the SAME iframe document
 * already rendering the live preview (website mode: the generated
 * HTML directly; app mode: after the real Babel/React render already
 * built in app-builder.html) — it finds real top-level sections,
 * reports their real bounding rects via postMessage, and the parent
 * page draws matching overlay boxes at those exact positions.
 *
 * Two honestly different section-detection strategies, not one
 * generic guess forced onto both:
 *   WEBSITE MODE: real semantic tags first (header/nav/section/footer/
 *   main), falling back to direct <body> children with real visible
 *   height if no semantic tags exist.
 *   APP MODE: real data-gurost-file attributes, added by app-bot.js's
 *   own generation prompt specifically for this feature — an exact
 *   section-to-source-file mapping, not a best-effort guess.
 *
 * Security note, not an afterthought: the parent side verifies
 * `event.source === iframe.contentWindow` before trusting a message —
 * the iframe is sandboxed (`sandbox="allow-scripts"`, no
 * allow-same-origin), so `event.origin` is unreliable here (it's
 * "null" for a sandboxed frame) and isn't the right check to rely on.
 */

const CODE_BOX_INJECTION_SCRIPT = `
<script>
(function() {
  function collectSections() {
    var withDataAttr = Array.prototype.slice.call(document.querySelectorAll('[data-gurost-file]'));
    if (withDataAttr.length > 0) return withDataAttr; // app mode: exact, real mapping

    var semantic = Array.prototype.slice.call(document.querySelectorAll('body > header, body > nav, body > section, body > footer, body > main'));
    if (semantic.length > 0) return semantic;

    // Website mode fallback: direct body children with real visible height
    return Array.prototype.slice.call(document.body.children).filter(function(el) {
      return el.getBoundingClientRect().height > 20;
    });
  }

  function reportSections() {
    var sections = collectSections();
    var rects = sections.map(function(el, i) {
      var rect = el.getBoundingClientRect();
      var tagPath = [];
      var cur = el;
      var depth = 0;
      while (cur && cur !== document.body && depth < 5) {
        var idx = Array.prototype.indexOf.call(cur.parentNode ? cur.parentNode.children : [], cur);
        tagPath.unshift(cur.tagName.toLowerCase() + '[' + idx + ']');
        cur = cur.parentNode;
        depth++;
      }
      return {
        index: i,
        tag: el.tagName.toLowerCase(),
        sourceFile: el.getAttribute('data-gurost-file') || null,
        domPath: tagPath.join('>'),
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
      };
    });
    window.parent.postMessage({ type: 'gurost-code-box-sections', sections: rects }, '*');
  }

  if (document.readyState === 'complete') reportSections();
  else window.addEventListener('load', reportSections);
  window.addEventListener('resize', reportSections);
})();
<\\/script>
`;

/**
 * Injects the reporting script right before </body> — website mode's
 * HTML always has one; app mode's rendered document (built in
 * app-builder.html's buildPreviewDocument) does too, since it's a
 * real HTML document with a #root mount point, not raw JSX.
 */
function injectCodeBoxScript(htmlDocument) {
  if (htmlDocument.includes('</body>')) {
    return htmlDocument.replace('</body>', CODE_BOX_INJECTION_SCRIPT + '</body>');
  }
  return htmlDocument + CODE_BOX_INJECTION_SCRIPT; // honest fallback if a document genuinely has no </body>, rather than silently doing nothing
}

/**
 * Parent-side: listens for real section reports, draws real overlay
 * boxes positioned to match, wires click-to-toggle-code behavior.
 * `getSourceForSection(section)` is passed in per-page, since website
 * mode extracts a DOM snippet from the full HTML string while app mode
 * looks up a file by the real sourceFile attribute — genuinely
 * different lookups, not something this shared function should assume.
 */
function attachCodeBoxOverlay(iframeEl, overlayContainerEl, getSourceForSection) {
  let currentSections = [];
  let openBoxIndex = null;

  function render() {
    overlayContainerEl.innerHTML = '';
    const iframeRect = iframeEl.getBoundingClientRect();

    currentSections.forEach((section) => {
      const box = document.createElement('div');
      box.className = 'gurost-code-box-hotspot';
      box.style.cssText = `
        position: absolute;
        top: ${iframeRect.top + section.rect.top + window.scrollY}px;
        left: ${iframeRect.left + section.rect.left + window.scrollX}px;
        width: ${section.rect.width}px;
        height: ${section.rect.height}px;
        border: 2px dashed rgba(255,140,0,0.5);
        background: rgba(255,140,0,0.04);
        cursor: pointer;
        z-index: 999;
        box-sizing: border-box;
        transition: background 0.15s ease;
      `;
      box.addEventListener('mouseenter', () => { box.style.background = 'rgba(255,140,0,0.12)'; });
      box.addEventListener('mouseleave', () => { box.style.background = 'rgba(255,140,0,0.04)'; });
      box.addEventListener('click', () => toggleBox(section));
      overlayContainerEl.appendChild(box);
    });
  }

  function toggleBox(section) {
    const event = new CustomEvent('gurost-code-box-toggle', { detail: { section, isOpen: openBoxIndex !== section.index } });
    if (openBoxIndex === section.index) {
      openBoxIndex = null;
    } else {
      openBoxIndex = section.index;
      getSourceForSection(section); // caller renders the actual code panel; this module only handles the toggle/positioning
    }
    overlayContainerEl.dispatchEvent(event);
  }

  window.addEventListener('message', (event) => {
    if (event.source !== iframeEl.contentWindow) return; // real check, not origin (unreliable for a sandboxed iframe)
    if (event.data?.type !== 'gurost-code-box-sections') return;
    currentSections = event.data.sections;
    render();
  });

  window.addEventListener('resize', render);
  window.addEventListener('scroll', render, true);

  return {
    closeAll: () => { openBoxIndex = null; },
    refresh: render
  };
}
