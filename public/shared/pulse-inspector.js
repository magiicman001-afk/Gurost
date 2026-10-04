/**
 * Pulse inspector - measures the REAL rendered preview, in the user's
 * browser, the way Lighthouse / WAVE do: computed colours, rendered vs
 * natural image sizes, the live DOM. No server browser needed.
 *
 * Two halves:
 *   - inFrameInspector() runs INSIDE the sandboxed preview frame. It is
 *     injected with the page (injectCodeBoxScript adds it) and answers a
 *     {type: "gurost-inspect", requestId} message with measured facts.
 *   - window.GurostInspector, in the builder page, asks the visible
 *     preview for desktop facts and renders a hidden 375px copy of the
 *     same page for mobile facts.
 *
 * Facts are numbers and short samples (selector + text), capped in size,
 * so they can go to the AI as evidence - see bots/pulse-brain.js.
 */

// ----- Runs inside the preview frame (stringified and injected). -----
function inFrameInspector() {
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, SVG: 1, PATH: 1, BR: 1 };

  function short(el) {
    if (!el || el.nodeType !== 1) return '';
    var s = el.tagName.toLowerCase();
    if (el.id) return s + '#' + el.id;
    var cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return cls ? s + '.' + cls : s;
  }
  function textOf(el) {
    var t = '';
    for (var i = 0; i < el.childNodes.length; i++) if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].nodeValue;
    return t.replace(/\s+/g, ' ').trim();
  }
  function visible(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  }
  function parseColor(s) {
    var m = /rgba?\(([^)]+)\)/.exec(s || '');
    if (!m) return null;
    var p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function lum(c) {
    function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function ratio(a, b) {
    var l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  // Effective background: the first opaque background colour up the tree.
  // Text over a background image or over a positioned image can't be
  // measured from colours alone - flagged instead of guessed.
  function backgroundOf(el) {
    var overImage = false;
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) overImage = true;
      var c = parseColor(cs.backgroundColor);
      if (c && c.a > 0.6) return { color: c, overImage: overImage };
    }
    return { color: { r: 255, g: 255, b: 255, a: 1 }, overImage: overImage };
  }
  function hex(c) { return '#' + [c.r, c.g, c.b].map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }

  function contrast() {
    var fails = [], checked = 0, overImage = 0;
    var els = document.body.querySelectorAll('*');
    for (var i = 0; i < els.length && checked < 1500; i++) {
      var el = els[i];
      if (SKIP[el.tagName.toUpperCase()] || !textOf(el) || !visible(el)) continue;
      checked++;
      var cs = getComputedStyle(el);
      var fg = parseColor(cs.color);
      if (!fg || fg.a < 0.3) continue;
      var bg = backgroundOf(el);
      if (bg.overImage) { overImage++; continue; }
      var size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
      var large = size >= 24 || (size >= 18.66 && bold);
      var need = large ? 3 : 4.5;
      var r = ratio(fg, bg.color);
      if (r < need) fails.push({ el: short(el), text: textOf(el).slice(0, 60), ratio: Math.round(r * 100) / 100, needs: need, fg: hex(fg), bg: hex(bg.color), fontPx: Math.round(size) });
    }
    fails.sort(function (a, b) { return a.ratio - b.ratio; });
    return { checked: checked, failing: fails.length, worst: fails.slice(0, 8), textOverImages: overImage };
  }

  function headSize(url) {
    if (/^data:/.test(url)) return Promise.resolve(Math.round(url.length * 0.75));
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 3000);
    return fetch(url, { method: 'HEAD', signal: ctrl && ctrl.signal }).then(function (r) {
      clearTimeout(t);
      var n = Number(r.headers.get('content-length'));
      return n > 0 ? n : null;
    }).catch(function () { clearTimeout(t); return null; });
  }

  function images() {
    var imgs = Array.prototype.slice.call(document.images);
    var dpr = window.devicePixelRatio || 1;
    var missingAlt = [], list = [];
    imgs.forEach(function (img) {
      if (!img.hasAttribute('alt')) missingAlt.push(short(img));
      var r = img.getBoundingClientRect();
      if (!img.currentSrc || r.width < 2) return;
      list.push({ el: short(img), src: img.currentSrc, natural: img.naturalWidth + 'x' + img.naturalHeight, shown: Math.round(r.width) + 'x' + Math.round(r.height),
        oversize: Math.round(((img.naturalWidth * img.naturalHeight) / Math.max(1, r.width * dpr * r.height * dpr)) * 10) / 10,
        upscaled: img.naturalWidth > 0 && img.naturalWidth < r.width * dpr * 0.8 });
    });
    var unique = [];
    list.forEach(function (i) { if (unique.indexOf(i.src) === -1 && unique.length < 10) unique.push(i.src); });
    return Promise.all(unique.map(headSize)).then(function (sizes) {
      var bytes = {};
      unique.forEach(function (u, k) { bytes[u] = sizes[k]; });
      var total = 0;
      list.forEach(function (i) { i.bytes = bytes[i.src] == null ? null : bytes[i.src]; if (i.bytes) total += i.bytes; i.src = i.src.slice(0, 120); });
      var heavy = list.filter(function (i) { return (i.bytes && i.bytes > 400000) || i.oversize > 4; }).slice(0, 6);
      return { count: imgs.length, missingAlt: missingAlt.length, missingAltSamples: missingAlt.slice(0, 5), knownBytes: total, heavy: heavy, upscaled: list.filter(function (i) { return i.upscaled; }).slice(0, 4).map(function (i) { return { el: i.el, natural: i.natural, shown: i.shown }; }) };
    });
  }

  function meta() {
    var q = function (s) { var e = document.querySelector(s); return e ? (e.getAttribute('content') || '').slice(0, 160) : null; };
    return { title: (document.title || '').slice(0, 120), description: q('meta[name="description"]'), viewport: q('meta[name="viewport"]'), ogTitle: q('meta[property="og:title"]'), lang: document.documentElement.getAttribute('lang'), jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length };
  }

  // Heading text as displayed (innerText keeps a <br> as a break, where
  // textContent glued "baked<br>the" into "bakedthe"); cut ones end in "…"
  // so a long heading isn't mistaken for a truncated one.
  function headingText(h, max) {
    var t = (h.innerText || h.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
  }
  function headings() {
    var hs = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible);
    var skips = [], prev = 0;
    hs.forEach(function (h) { var l = +h.tagName[1]; if (prev && l > prev + 1) skips.push('h' + prev + ' -> h' + l + ' ("' + headingText(h, 60) + '")'); prev = l; });
    return { h1: hs.filter(function (h) { return h.tagName === 'H1'; }).length, outline: hs.slice(0, 25).map(function (h) { return h.tagName.toLowerCase() + ': ' + headingText(h, 100); }), skips: skips.slice(0, 5) };
  }

  function forms() {
    return Array.prototype.slice.call(document.forms).slice(0, 5).map(function (f) {
      var fields = Array.prototype.slice.call(f.querySelectorAll('input,select,textarea')).filter(function (i) { return !/hidden|submit|button/.test(i.type); });
      var unlabeled = fields.filter(function (i) {
        return !(i.id && document.querySelector('label[for="' + i.id + '"]')) && !i.closest('label') && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby');
      }).map(function (i) { return (i.name || i.type || i.tagName.toLowerCase()) + (i.placeholder ? ' ("' + i.placeholder.slice(0, 30) + '")' : ''); });
      var email = f.querySelector('input[type="email"]');
      var badEmailAccepted = null;
      if (email) { var old = email.value; email.value = 'not-an-email'; badEmailAccepted = email.checkValidity(); email.value = old; }
      return { el: short(f), fields: fields.length, required: fields.filter(function (i) { return i.required; }).length, emptySubmitAccepted: fields.length ? f.checkValidity() : null, emailField: !!email, badEmailAccepted: badEmailAccepted, novalidate: f.noValidate, unlabeled: unlabeled.slice(0, 6) };
    });
  }

  function links() {
    var as = Array.prototype.slice.call(document.querySelectorAll('a'));
    var dead = 0, broken = [], external = 0, externalNoNewTab = 0;
    as.forEach(function (a) {
      var h = (a.getAttribute('href') || '').trim();
      if (!h || h === '#') { dead++; return; }
      if (h.charAt(0) === '#') { if (!document.getElementById(decodeURIComponent(h.slice(1)))) broken.push(h); return; }
      if (/^https?:/i.test(h)) { external++; if (a.target !== '_blank') externalNoNewTab++; }
    });
    return { total: as.length, deadOrHash: dead, brokenAnchors: broken.slice(0, 6), external: external, externalSameTab: externalNoNewTab };
  }

  function layout() {
    var w = document.documentElement.clientWidth;
    var over = [];
    var els = document.body.querySelectorAll('*');
    // Only when the page really scrolls sideways: wide content inside a
    // clipped container (a ticker, a carousel) is fine.
    var overflowing = document.documentElement.scrollWidth - w > 1;
    for (var i = 0; overflowing && i < els.length && over.length < 5; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.right > w + 2 && r.width > 0 && getComputedStyle(els[i]).position !== 'fixed' && visible(els[i])) over.push({ el: short(els[i]), right: Math.round(r.right) });
    }
    return { width: w, scrollWidth: document.documentElement.scrollWidth, horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - w), overflowing: over, pageHeight: document.documentElement.scrollHeight };
  }

  function mobileOnly() {
    var small = 0, smallSamples = [], tiny = 0, tinySamples = [];
    Array.prototype.slice.call(document.body.querySelectorAll('*')).forEach(function (el) {
      if (SKIP[el.tagName.toUpperCase()] || !textOf(el) || !visible(el)) return;
      var px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 12) { small++; if (smallSamples.length < 4) smallSamples.push(short(el) + ' ' + Math.round(px) + 'px'); }
    });
    Array.prototype.slice.call(document.querySelectorAll('a,button,input,select')).forEach(function (el) {
      if (!visible(el)) return;
      var r = el.getBoundingClientRect();
      if (r.height < 32 || r.width < 32) { tiny++; if (tinySamples.length < 4) tinySamples.push(short(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    });
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('nav a, header a')).filter(visible).length;
    var menuButton = !!Array.prototype.slice.call(document.querySelectorAll('button, [role="button"]')).filter(visible).find(function (b) { return /menu|navigation/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent); });
    var h1 = document.querySelector('h1');
    return { smallText: small, smallTextSamples: smallSamples, smallTapTargets: tiny, smallTapSamples: tinySamples, visibleNavLinks: navLinks, menuButton: menuButton, h1FontPx: h1 ? Math.round(parseFloat(getComputedStyle(h1).fontSize)) : null };
  }

  function inspect(mode) {
    var facts = { mode: mode, viewport: innerWidth + 'x' + innerHeight, contrast: contrast(), meta: meta(), headings: headings(), forms: forms(), links: links(), layout: layout(),
      videos: Array.prototype.slice.call(document.querySelectorAll('video')).map(function (v) { return { el: short(v), poster: !!v.getAttribute('poster'), autoplay: v.autoplay, muted: v.muted }; }).slice(0, 4) };
    if (mode === 'mobile') facts.mobile = mobileOnly();
    return images().then(function (img) { facts.images = img; return facts; });
  }

  // Answers only the parent, and only at the origin that asked (e.origin
  // is the builder's origin) - the measurements never go anywhere else.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'gurost-inspect' || e.source !== window.parent) return;
    var replyTo = e.origin && e.origin !== 'null' ? e.origin : '*';
    inspect(e.data.mode || 'desktop').then(function (facts) {
      window.parent.postMessage({ type: 'gurost-inspect-result', requestId: e.data.requestId, facts: facts }, replyTo);
    }, function (err) {
      window.parent.postMessage({ type: 'gurost-inspect-result', requestId: e.data.requestId, error: String(err && err.message || err) }, replyTo);
    });
  });
}

// Injected into every preview by injectCodeBoxScript (shared/code-boxes.js).
// A plain </script>: this file is loaded via <script src>, not inline.
const PULSE_INSPECTOR_SCRIPT = '<script data-gurost-inspector>(' + inFrameInspector.toString() + ')()</script>';

// ----- Builder page side. -----
window.GurostInspector = (function () {
  let nextId = 1;

  // Ask a preview frame for its facts.
  function ask(frame, mode, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const requestId = `i${nextId++}`;
      const timer = setTimeout(() => { window.removeEventListener('message', onMsg); reject(new Error('The preview did not answer the inspector.')); }, timeoutMs);
      function onMsg(e) {
        if (e.source !== frame.contentWindow || !e.data || e.data.type !== 'gurost-inspect-result' || e.data.requestId !== requestId) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data.facts);
      }
      window.addEventListener('message', onMsg);
      frame.contentWindow.postMessage({ type: 'gurost-inspect', requestId, mode }, '*');
    });
  }

  // A hidden 375x812 copy of the page, measured as a phone would see it.
  // The page is generated content with its own scripts - untrusted - so it
  // gets the same lock-down as the visible preview: sandbox="allow-scripts"
  // only (opaque origin: no access to this page, its storage or cookies).
  function mobile(html) {
    return new Promise((resolve, reject) => {
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts');
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:375px;height:812px;border:0;visibility:hidden;pointer-events:none';
      f.onload = () => setTimeout(() => {
        ask(f, 'mobile').then(resolve, reject).finally(() => f.remove());
      }, 1500); // let Tailwind and fonts settle
      f.srcdoc = injectCodeBoxScript(html);
      document.body.appendChild(f);
    });
  }

  // Desktop facts from the visible preview + mobile facts from a copy.
  async function inspectPage(frame, html) {
    const [desktop, phone] = await Promise.all([ask(frame, 'desktop'), mobile(html)]);
    return { desktop, mobile: phone };
  }

  return { ask, mobile, inspectPage };
})();
