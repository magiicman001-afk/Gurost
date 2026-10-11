/* "Open full site" panel: the draft address (sandbox) and the live address, both copyable, plus Launch / Unpublish.
 * Used by the Pulse widget (public/shared/pulse-widget.js). Plain DOM, text only: nothing from the server is ever
 * inserted as HTML. */
(function (root) {
  'use strict';

  var CSS =
    '#pulseSitePanel{display:none;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #E9E9EF;background:#FAFAF9;font-size:12px;color:#1c1917}' +
    '#pulseSitePanel.visible{display:block}' +
    '#pulseSitePanel h4{margin:0 0 4px;font-size:12px;font-weight:700}' +
    '#pulseSitePanel p{margin:0 0 6px;color:#57534e;line-height:1.4}' +
    '#pulseSitePanel .gsp-block{margin-bottom:12px}' +
    '#pulseSitePanel .gsp-row{display:flex;gap:6px;margin-bottom:6px}' +
    '#pulseSitePanel input{flex:1;min-width:0;font-size:16px;padding:8px;border:1px solid #E9E9EF;border-radius:8px;background:#fff}' +
    '#pulseSitePanel button{font-size:12px;padding:8px 10px;min-height:40px;border-radius:8px;border:1px solid #E9E9EF;background:#fff;cursor:pointer}' +
    '#pulseSitePanel button.gsp-primary{background:#1c1917;color:#fff;border-color:#1c1917}' +
    '#pulseSitePanel .gsp-msg{min-height:1em}' +
    '#pulseSitePanel .gsp-bad{color:#b91c1c}#pulseSitePanel .gsp-ok{color:#15803d}';

  function el(tag, props, children) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') n.textContent = props[k];
      else if (k === 'class') n.className = props[k];
      else n.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function copy(text, msgEl) {
    var done = function () { msgEl.className = 'gsp-msg gsp-ok'; msgEl.textContent = 'Copied.'; };
    var fail = function () { msgEl.className = 'gsp-msg gsp-bad'; msgEl.textContent = 'Could not copy. Press and hold the address to copy it.'; };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    } catch (e) { fail(); }
  }

  // One address: a read-only box, Copy and Open.
  function addressRow(label, url, note, msg) {
    var input = el('input', { type: 'text', readonly: 'readonly', value: url, 'aria-label': label });
    input.addEventListener('focus', function () { try { input.select(); } catch (e) {} });
    var copyBtn = el('button', { type: 'button', text: 'Copy' });
    copyBtn.addEventListener('click', function () { copy(url, msg); });
    var open = el('button', { type: 'button', text: 'Open' });
    open.addEventListener('click', function () { window.open(url, '_blank', 'noopener'); });
    return el('div', { class: 'gsp-block' }, [el('h4', { text: label }), note ? el('p', { text: note }) : null, el('div', { class: 'gsp-row' }, [input, copyBtn, open])]);
  }

  function render(panel, projectId) {
    var call = root.GurostAPI && root.GurostAPI.call;
    if (!call) { panel.textContent = 'Not available on this page.'; return; }
    if (!document.getElementById('gspStyle')) {
      var st = el('style', { id: 'gspStyle' });
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    panel.textContent = 'Loading…';
    call('/api/project/' + encodeURIComponent(projectId) + '/site-links').then(function (d) {
      panel.textContent = '';
      var msg = el('p', { class: 'gsp-msg', role: 'status' });
      if (!d.built) { panel.appendChild(el('p', { text: 'Pick a design first, then you can open your full site here.' })); return; }

      // 1. the draft
      panel.appendChild(addressRow('Draft (you can keep editing)', root.location.origin + d.sandbox.url,
        'Your site on real pages. Only people with this link can see it, and it works for ' + d.sandbox.expiresInHours + ' hours. Nobody can find it on Google.', msg));

      // 2. the live site
      var live = d.published;
      if (live && live.status === 'live') {
        panel.appendChild(addressRow('Live site (frozen until you launch again)', live.pathUrl,
          'Version ' + live.version + '. Changes you make to the draft do not show here until you press Launch again.', msg));
        if (live.hostReady) panel.appendChild(addressRow('Your own address', live.hostUrl, null, msg));
        else panel.appendChild(el('p', { text: 'Your ' + live.slug + '.gurost.com address switches on when your domain is connected.' }));
      }
      if (live && live.status !== 'live') panel.appendChild(el('p', { text: 'Your site is switched off (' + live.status.replace('_', ' ') + ').' }));

      // 3. launch
      if (!d.publishingReady) {
        panel.appendChild(el('p', { text: 'Launching is not switched on yet.' }));
      } else {
        var name = el('input', { type: 'text', value: (live && live.slug) || d.suggestedSlug || '', placeholder: 'your-business-name', autocapitalize: 'none', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Site name' });
        var go = el('button', { type: 'button', class: 'gsp-primary', text: live ? 'Launch again' : 'Launch' });
        go.addEventListener('click', function () {
          msg.className = 'gsp-msg'; msg.textContent = 'Checking your site…'; go.disabled = true;
          call('/api/project/' + encodeURIComponent(projectId) + '/publish', { method: 'POST', body: { slug: name.value.trim().toLowerCase() } }).then(function (r) {
            var n = (r.placeholders || []).length;
            render(panel, projectId);
            setTimeout(function () {
              var m = panel.querySelector('.gsp-msg');
              if (m) { m.className = 'gsp-msg gsp-ok'; m.textContent = 'Launched.' + (n ? ' ' + n + ' placeholder' + (n === 1 ? '' : 's') + ' still to fill in: ' + r.placeholders.slice(0, 3).join(', ') + '.' : ''); }
            }, 600);
          }).catch(function (e) { msg.className = 'gsp-msg gsp-bad'; msg.textContent = e.message; go.disabled = false; });
        });
        panel.appendChild(el('div', { class: 'gsp-block' }, [
          el('h4', { text: live ? 'Launch your latest draft' : 'Launch your site' }),
          el('p', { text: 'Choose a site name (letters, numbers and hyphens). It becomes your-name.gurost.com.' }),
          el('div', { class: 'gsp-row' }, [name, go]),
        ]));
        if (live && live.status === 'live') {
          var off = el('button', { type: 'button', text: 'Switch the live site off' });
          off.addEventListener('click', function () {
            off.disabled = true;
            call('/api/project/' + encodeURIComponent(projectId) + '/unpublish', { method: 'POST' }).then(function () { render(panel, projectId); }).catch(function (e) { msg.className = 'gsp-msg gsp-bad'; msg.textContent = e.message; off.disabled = false; });
          });
          panel.appendChild(off);
        }
      }
      panel.appendChild(msg);
    }).catch(function (e) { panel.textContent = 'Could not load: ' + e.message; });
  }

  root.GurostSitePanel = { render: render };
})(typeof window !== 'undefined' ? window : this);
