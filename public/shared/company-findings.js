// "What to improve" on the Business Assistant page: one card per finding, each
// with the button the server chose for it. Website fixes open Amend Website with
// the fix handed over; social findings write a post right here. Everything from
// the server or the AI is put on the page with textContent, never as HTML.
(function () {
  var root = document.getElementById('companyFindings');
  if (!root || !window.GurostAPI) return;
  var amendKey = 'gurost_pending_amend';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function chip(text) { return el('span', 'text-[11px] font-semibold px-2 py-0.5 rounded-full border border-[var(--line)] bg-[#FAFAF9]', text); }
  var AREA = { website: 'Website', content: 'Content', social: 'Social' };

  function copyText(text, btn) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy post'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'Copy failed - select the text'; }
      ta.remove();
    }
  }

  function card(f) {
    var c = el('div', 'rounded-xl border border-[var(--line)] p-4');
    c.appendChild(el('h3', 'font-semibold text-sm mb-1', f.title));
    if (f.why) c.appendChild(el('p', 'text-sm text-[var(--muted)] mb-2', f.why));
    if (f.evidence) c.appendChild(el('p', 'text-xs text-[var(--muted)] mb-2', f.evidence));
    if (f.source && f.source.url) { var sl = el('p', 'text-xs text-[var(--muted)] mb-2', 'Source: ' + f.source.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80) + (f.readAt ? ' · read ' + String(f.readAt).slice(0, 10) : '') + ' · Public information - can be wrong'); c.appendChild(sl); }
    var tags = el('div', 'flex flex-wrap gap-2 mb-3');
    tags.appendChild(chip(f.quickWin ? 'Quick win' : 'Bigger project'));
    tags.appendChild(chip(AREA[f.area] || f.area));
    tags.appendChild(chip('Impact ' + f.impact + '/5'));
    c.appendChild(tags);
    var out = el('div');
    var status = el('p', 'text-sm mt-2'); status.setAttribute('role', 'status');
    if (f.action && f.action.kind !== 'none') {
      var btn = el('button', 'gold-gradient text-white text-sm font-semibold px-4 py-2 rounded-full', f.action.label);
      btn.type = 'button';
      btn.addEventListener('click', function () { run(f, btn, out, status); });
      c.appendChild(btn);
    }
    c.appendChild(status); c.appendChild(out);
    return c;
  }

  async function run(f, btn, out, status) {
    status.style.color = ''; status.textContent = '';
    if (f.action.kind === 'amend' || f.action.kind === 'amend_now') {
      if (!f.handoff) { status.style.color = '#b91c1c'; status.textContent = 'Add your website to the company profile first.'; return; }
      try { localStorage.setItem(amendKey, JSON.stringify(f.handoff)); } catch (e) { status.style.color = '#b91c1c'; status.textContent = "Your browser blocked the handoff. Open Amend Website and paste your address there."; return; }
      location.href = 'amend_website.html';
      return;
    }
    if (f.action.kind === 'social_draft') {
      btn.disabled = true; status.textContent = (window.GurostAI ? GurostAI.STATUS.thinking : 'Writing…'); out.textContent = '';
      try {
        var r = await GurostAPI.call('/api/company-profile/findings/' + encodeURIComponent(f.id) + '/social-draft', { method: 'POST', body: {} });
        status.textContent = r.note || '';
        var box = el('pre', 'dept-draft', r.draft);
        var copy = el('button', 'dept-copy', 'Copy post'); copy.type = 'button';
        copy.addEventListener('click', function () { copyText(r.draft, copy); });
        out.appendChild(box); out.appendChild(copy);
      } catch (err) { status.style.color = '#b91c1c'; status.textContent = window.GurostAI ? GurostAI.publicText(err.message) : err.message; }
      btn.disabled = false;
    }
  }

  function renderScout(box, s) {
    box.appendChild(el('p', 'text-xs font-semibold text-[var(--muted)] mb-2', s.label + (s.ranAt ? ' · scouted ' + String(s.ranAt).slice(0, 10) : '')));
    [['What your business does', s.summary], ['How you compare', s.competitors]].forEach(function (part) {
      if (!part[1] || !part[1].length) return;
      box.appendChild(el('h3', 'font-semibold text-sm mb-1', part[0]));
      part[1].forEach(function (c) {
        var row = el('div', 'text-sm mb-2');
        row.appendChild(el('p', null, (c.name ? c.name + ': ' : '') + c.text));
        row.appendChild(el('p', 'text-xs text-[var(--muted)]', (c.source && c.source.url ? 'Source: ' + c.source.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80) : '') + (c.readAt ? ' · read ' + String(c.readAt).slice(0, 10) : '')));
        box.appendChild(row);
      });
    });
  }

  async function load() {
    try {
      var data = await GurostAPI.call('/api/company-profile/findings');
      if (!data.hasProfile) return; // nothing to improve until the profile is saved
      if (data.amendKey) amendKey = data.amendKey;
      root.hidden = false;
      var list = document.getElementById('cfList'); list.textContent = '';
      var sc = document.getElementById('cfScout'); if (sc) { sc.textContent = ''; if (data.scout) renderScout(sc, data.scout); }
      if (!data.researched) {
        document.getElementById('cfIntro').textContent = 'No research has been confirmed yet. Press "Scout my business" above; once you confirm it, what to improve shows up here.';
        return;
      }
      if (!data.findings.length) {
        document.getElementById('cfIntro').textContent = 'Nothing to fix from the checks so far. ' + data.passed + ' passed.';
        return;
      }
      document.getElementById('cfIntro').textContent = data.findings.length + ' to improve, biggest first. ' + data.passed + ' checks passed.';
      data.findings.forEach(function (f) { list.appendChild(card(f)); });
    } catch (err) { /* the findings are optional; the profile form still works without them */ }
  }
  window.addEventListener('gurost:company-saved', load);
  load();
})();
