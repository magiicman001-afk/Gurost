// Company Scout panel (Business Assistant page): "Scout my business" reads the owner's public website and searches the web, then
// SHOWS what it found. Every statement has its source link and the date it was read, and the whole result is labelled as public
// information that can be wrong. Nothing is used until the owner presses Confirm, and each statement can be removed first.
// Everything from the server or the AI goes in with textContent, never as HTML.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GurostCompanyScout = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** "read 16 Oct 2026" from an ISO string; "" when it is not a date. */
  function readDate(iso) {
    var t = Date.parse(iso); if (!isFinite(t)) return '';
    var d = new Date(t), m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    return 'read ' + d.getUTCDate() + ' ' + m + ' ' + d.getUTCFullYear();
  }
  function safeHref(u) { return /^https?:\/\/[^\s<>"']+$/i.test(String(u || '')) ? String(u) : ''; }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u || '').slice(0, 60); } }

  /** One line under a statement: where it came from and when. Pure, so it can be tested. */
  function sourceLine(item) {
    var src = item && item.source; var d = readDate(item && item.readAt);
    if (!src || !src.url) return d;
    return 'Source: ' + host(src.url) + (d ? ' · ' + d : '');
  }

  function statusText(s) {
    if (!s) return '';
    if (!s.usage || s.usage.available === false) return 'Scout is not ready on this server yet.';
    return s.usage.remaining + ' of ' + s.usage.limit + ' scouts left this month.';
  }

  function mount(box, api) {
    if (!box || !api) return;
    var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    var intro = el('p', 'text-sm text-[var(--muted)] mb-3', 'I read your public website and search the web, then show you what I found. Nothing is used until you confirm it. Public information - can be wrong.');
    var left = el('p', 'text-xs text-[var(--muted)] mb-3');
    var msg = el('p', 'text-sm mb-3'); msg.setAttribute('role', 'status');
    var go = el('button', 'gold-gradient text-white text-sm font-semibold px-4 py-2 rounded-full', 'Scout my business'); go.type = 'button';
    var out = el('div', 'mt-4 grid gap-3');
    box.append(intro, left, go, msg, out);
    var timer = null, removed = {};

    function claimRow(c, kind) {
      var row = el('div', 'rounded-xl border border-[var(--line)] p-3 flex gap-3 items-start');
      var body = el('div', 'flex-1 min-w-0');
      body.style.wordBreak = 'break-word';
      if (c.name) body.appendChild(el('p', 'text-sm font-semibold', c.name));
      body.appendChild(el('p', 'text-sm', c.text));
      var line = el('p', 'text-xs text-[var(--muted)] mt-1');
      var href = c.source && safeHref(c.source.url);
      if (href) { var a = el('a', 'underline', 'Source: ' + host(href)); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; line.appendChild(a); var d = readDate(c.readAt); if (d) line.appendChild(document.createTextNode(' · ' + d)); }
      else line.textContent = sourceLine(c);
      body.appendChild(line);
      if (c.quote) body.appendChild(el('p', 'text-xs text-[var(--muted)] mt-1 italic', '"' + c.quote + '"'));
      row.appendChild(body);
      var rm = el('button', 'text-xs font-semibold px-3 py-1 rounded-full border border-[var(--line)]', 'Remove'); rm.type = 'button';
      rm.addEventListener('click', function () { removed[c.id] = !removed[c.id]; rm.textContent = removed[c.id] ? 'Put back' : 'Remove'; row.style.opacity = removed[c.id] ? '0.45' : ''; });
      row.appendChild(rm);
      return row;
    }

    function section(title, items, kind) {
      if (!items || !items.length) return null;
      var s = el('div'); s.appendChild(el('h3', 'font-semibold text-sm mb-2', title));
      var g = el('div', 'grid gap-2'); items.forEach(function (c) { g.appendChild(claimRow(c, kind)); }); s.appendChild(g); return s;
    }

    function showResult(run) {
      out.textContent = ''; removed = {};
      var r = run.result || {};
      out.appendChild(el('p', 'text-sm font-semibold', (r.label || 'Public information - can be wrong') + '. Check it, remove anything wrong, then confirm.'));
      var parts = [section('What your business does', r.summary, 'summary'), section('How you compare', r.competitors, 'competitor')];
      parts.forEach(function (p) { if (p) out.appendChild(p); });
      var fails = (r.findings || []).filter(function (f) { return f.status === 'fail'; });
      if (fails.length) {
        var s = el('div'); s.appendChild(el('h3', 'font-semibold text-sm mb-2', 'Things to fix (' + fails.length + ')'));
        var g = el('div', 'grid gap-2');
        fails.forEach(function (f) { var row = claimRow({ id: f.id, text: f.title + ' - ' + f.fix, source: f.source, readAt: f.readAt, quote: '' }, 'finding'); if (f.evidence) row.firstChild.appendChild(el('p', 'text-xs text-[var(--muted)] mt-1', f.evidence)); g.appendChild(row); });
        s.appendChild(g); out.appendChild(s);
      }
      if (r.droppedUnverified) out.appendChild(el('p', 'text-xs text-[var(--muted)]', r.droppedUnverified + ' statement(s) were left out because they could not be matched to a source.'));
      (r.notes || []).forEach(function (n) { out.appendChild(el('p', 'text-xs text-[var(--muted)]', n)); });
      var row = el('div', 'flex flex-wrap gap-2');
      var yes = el('button', 'gold-gradient text-white text-sm font-semibold px-4 py-2 rounded-full', 'Confirm and use this'); yes.type = 'button';
      var no = el('button', 'text-sm font-semibold px-4 py-2 rounded-full border border-[var(--line)]', 'Discard'); no.type = 'button';
      yes.addEventListener('click', async function () {
        yes.disabled = true;
        try {
          await api.call('/api/scout/runs/' + encodeURIComponent(run.id) + '/confirm', { method: 'POST', body: { drop: Object.keys(removed).filter(function (k) { return removed[k]; }) } });
          out.textContent = ''; msg.textContent = 'Saved. Your assistants and the "What to improve" list now use it.';
          window.dispatchEvent(new Event('gurost:company-saved')); refresh();
        } catch (e) { msg.textContent = (e && e.message) || 'Could not save that.'; yes.disabled = false; }
      });
      no.addEventListener('click', async function () { try { await api.call('/api/scout/runs/' + encodeURIComponent(run.id) + '/discard', { method: 'POST', body: {} }); out.textContent = ''; msg.textContent = 'Discarded. Nothing was saved.'; refresh(); } catch (e) { msg.textContent = (e && e.message) || 'Could not discard.'; } });
      row.append(yes, no); out.appendChild(row);
    }

    function poll(id) {
      clearTimeout(timer);
      timer = setTimeout(async function () {
        try {
          var run = await api.call('/api/scout/runs/' + encodeURIComponent(id));
          if (run.status === 'running') { msg.textContent = 'Reading your website and the web… about a minute.'; return poll(id); }
          go.disabled = false;
          if (run.status === 'ready') { msg.textContent = ''; showResult(run); }
          else if (run.status === 'failed') msg.textContent = 'The scout could not finish: ' + (run.error || 'nothing could be read') + ' This one does not count against your month.';
          refresh(true);
        } catch (e) { msg.textContent = (e && e.message) || 'Could not check the scout.'; go.disabled = false; }
      }, 3000);
    }

    async function refresh(keepMsg) {
      try {
        var s = await api.call('/api/scout/status'); left.textContent = statusText(s);
        if (!keepMsg && s.run && s.run.status === 'running') { go.disabled = true; msg.textContent = 'Reading your website and the web… about a minute.'; poll(s.run.id); }
        else if (!keepMsg && s.run && s.run.status === 'ready' && !out.firstChild) showResult(s.run);
        if (s.usage && s.usage.remaining <= 0) go.disabled = true;
      } catch (e) { left.textContent = ''; }
    }

    go.addEventListener('click', async function () {
      go.disabled = true; msg.textContent = 'Starting…'; out.textContent = '';
      try { var r = await api.call('/api/scout/run', { method: 'POST', body: {} }); poll(r.runId); }
      catch (e) { msg.textContent = (e && e.message) || 'Could not start.'; go.disabled = false; }
    });
    refresh();
  }

  return { readDate: readDate, sourceLine: sourceLine, statusText: statusText, safeHref: safeHref, mount: mount };
}));
