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

  // Keep the preview on the generated page. A srcdoc frame resolves
  // relative URLs - even "#menu" - against the PARENT page's URL, so an
  // unhandled in-page link or form submit loaded the builder itself
  // inside the preview. These run last (window, bubble phase) and only
  // act when the site's own handler didn't already, so its smooth
  // scrolling and form success messages are left alone.
  window.addEventListener('click', function(e) {
    if (e.defaultPrevented) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^(mailto|tel):/i.test(href)) return;
    e.preventDefault();
    if (href.charAt(0) !== '#') return; // leaves the page: works on the published site, not in the preview
    var id = decodeURIComponent(href.slice(1));
    var target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('submit', function(e) {
    if (!e.defaultPrevented) e.preventDefault();
  });

  // Edits re-render the preview; report where the visitor is so the
  // next render can open at the same place instead of jumping to the top.
  var scrollTimer = null;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      window.parent.postMessage({ type: 'gurost-preview-scroll', y: window.scrollY }, '*');
    }, 120);
  }, { passive: true });
  var restoreY = window.__gurostRestoreY;
  if (restoreY > 0) {
    var restore = function() { window.scrollTo({ top: restoreY, behavior: 'instant' }); };
    restore();
    window.addEventListener('load', restore); // again once images and fonts have moved the layout
  }
})();
</script>
`;

// Relative URLs in a srcdoc frame resolve against the PARENT page's URL,
// so "#booking" - from a link the click guard never sees (a handler that
// stops propagation) or from a script (location.href = '#booking') -
// loaded the whole builder inside the preview: a second header, preview
// and Bot conversation panel squeezed into the left panel. With this
// base, "#booking" is "about:srcdoc#booking": a jump within the page.
const PREVIEW_BASE_TAG = '<base href="about:srcdoc">';
// ^ A plain </script>: this file is loaded via <script src>, so the tag
// can't close an outer script. The old "<\\/script>" reached the page
// as "<\/script>", which isn't a closing tag - the script ran on into
// </body></html>, failed to parse, and none of it ever executed.

/**
 * Injects the reporting script right before </body> — website mode's
 * HTML always has one; app mode's rendered document (built in
 * app-builder.html's buildPreviewDocument) does too, since it's a
 * real HTML document with a #root mount point, not raw JSX.
 */
function injectCodeBoxScript(htmlDocument, { scrollY = 0 } = {}) {
  // The page's own <base> (rare) would undo the fix above.
  let doc = String(htmlDocument).replace(/<base\b[^>]*>/gi, '');
  const head = PREVIEW_BASE_TAG + (scrollY > 0 ? `<script>window.__gurostRestoreY = ${Math.round(scrollY)};</script>` : '');
  doc = /<head\b[^>]*>/i.test(doc) ? doc.replace(/<head\b[^>]*>/i, (m) => m + head) : head + doc;
  // Before the LAST </body>: an earlier one can sit inside a script string.
  const at = doc.toLowerCase().lastIndexOf('</body>');
  if (at !== -1) return doc.slice(0, at) + CODE_BOX_INJECTION_SCRIPT + doc.slice(at);
  return doc + CODE_BOX_INJECTION_SCRIPT; // honest fallback if a document genuinely has no </body>, rather than silently doing nothing
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
