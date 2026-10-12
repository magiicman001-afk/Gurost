// Gurost — "Show build log": a full-screen timeline of every bot action in a build
// (docs/ESCALATION_HIERARCHY_SPEC.md section 3). Colour-coded (green success, orange fail, blue escalate), filter by
// bot and by result, Export JSON, Share. All text goes in with textContent, never innerHTML.
(function () {
  const BOT_NAMES = { builder: 'Builder', fixer: 'Fixer', manager: 'Manager', senior: 'Senior engineer', copywriter: 'Copywriter', photographer: 'Photographer', reviewer: 'Reviewer' };
  const COLOURS = { success: ['#15803d', '#dcfce7'], fail: ['#c2410c', '#ffedd5'], escalate: ['#1d4ed8', '#dbeafe'] };
  const LABELS = { success: 'Success', fail: 'Failed', escalate: 'Escalated' };

  let entries = [];
  const seen = new Set();
  let overlay = null;
  let getProjectId = () => null;
  let call = null;
  const filter = { bot: '', result: '' };

  const keyOf = (e) => [e.created_at, e.bot, e.task, e.decision, e.result].join('|');
  function add(list) {
    for (const e of list) {
      const k = keyOf(e);
      if (seen.has(k)) continue;
      seen.add(k);
      entries.push(e);
    }
    entries.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (k === 'style') n.style.cssText = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  function visible() {
    return entries.filter((e) => (!filter.bot || e.bot === filter.bot) && (!filter.result || e.result === filter.result));
  }

  function card(e) {
    const [fg, bg] = COLOURS[e.result] || COLOURS.fail;
    const time = e.created_at ? new Date(e.created_at).toLocaleTimeString() : '';
    const head = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:4px' }, [
      el('strong', { text: BOT_NAMES[e.bot] || e.bot }),
      e.details && e.details.slot ? el('span', { text: `design: ${e.details.slot}`, style: 'font-size:11px;color:#475569;background:#f1f5f9;padding:2px 6px;border-radius:4px' }) : null,
      el('span', { text: LABELS[e.result] || e.result, style: `background:${bg};color:${fg};font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px` }),
      e.next_bot ? el('span', { text: `then: ${BOT_NAMES[e.next_bot] || e.next_bot}`, style: 'font-size:11px;color:#475569' }) : null,
      el('span', { text: `${time}${e.time_ms != null ? ` \u00b7 ${e.time_ms} ms` : ''}`, style: 'margin-left:auto;font-size:11px;color:#64748b' }),
    ]);
    const body = el('div', { style: 'font-size:13px;line-height:1.45' }, [
      e.task ? el('div', { text: e.task }) : null,
      e.decision ? el('div', { text: `Decision: ${e.decision}`, style: 'font-weight:600' }) : null,
      e.reason ? el('div', { text: `Why: ${e.reason}`, style: 'color:#475569' }) : null,
    ]);
    const detailsText = e.details && Object.keys(e.details).length ? JSON.stringify(e.details, null, 2) : '';
    const details = detailsText ? el('details', { style: 'margin-top:4px' }, [
      el('summary', { text: 'Details', style: 'font-size:12px;color:#475569;cursor:pointer' }),
      el('pre', { text: detailsText, style: 'font-size:11px;white-space:pre-wrap;word-break:break-word;background:#f8fafc;padding:8px;border-radius:6px;max-height:240px;overflow:auto' }),
    ]) : null;
    return el('div', { 'data-bot': e.bot, 'data-result': e.result, style: `border-left:4px solid ${fg};background:#fff;border-radius:8px;padding:10px 12px;margin:0 0 8px;box-shadow:0 1px 2px rgba(0,0,0,.06)` }, [head, body, details]);
  }

  function render() {
    if (!overlay) return;
    const list = overlay.querySelector('[data-role="list"]');
    list.textContent = '';
    const shown = visible();
    if (!shown.length) list.appendChild(el('p', { text: entries.length ? 'Nothing matches this filter.' : 'No build log yet. It fills in as the build runs.', style: 'color:#64748b;font-size:13px' }));
    shown.forEach((e) => list.appendChild(card(e)));
    overlay.querySelector('[data-role="count"]').textContent = `${shown.length} of ${entries.length} actions`;
    const bots = [...new Set(entries.map((e) => e.bot))];
    const sel = overlay.querySelector('[data-role="bot"]');
    const keep = sel.value;
    sel.textContent = '';
    sel.appendChild(el('option', { value: '', text: 'All bots' }));
    bots.forEach((b) => sel.appendChild(el('option', { value: b, text: BOT_NAMES[b] || b })));
    sel.value = bots.includes(keep) ? keep : '';
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ projectId: getProjectId(), exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `gurost-build-log-${(getProjectId() || 'build').slice(0, 8)}.json` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  async function share() {
    const text = JSON.stringify({ projectId: getProjectId(), entries }, null, 2);
    const note = overlay.querySelector('[data-role="note"]');
    try {
      if (navigator.share) {
        const file = typeof File === 'function' ? new File([text], 'gurost-build-log.json', { type: 'application/json' }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ title: 'Gurost build log', files: [file] });
        else await navigator.share({ title: 'Gurost build log', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      note.textContent = 'Log copied. Paste it into a message to support.';
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      note.textContent = 'Could not share from this browser. Use Export JSON instead.';
    }
  }

  async function load() {
    const note = overlay.querySelector('[data-role="note"]');
    const id = getProjectId();
    if (!id || !call) { render(); return; }
    try {
      const r = await call(`/api/project/${id}/build-log`);
      add(r.entries || []);
      note.textContent = '';
    } catch (err) {
      note.textContent = /switched off/i.test(err.message) ? 'The build log is switched off.' : 'Could not load the saved log. Showing what arrived live.';
    }
    render();
  }

  function open() {
    if (!overlay) {
      const select = (role, options, key) => {
        const s = el('select', { 'data-role': role, style: 'font-size:13px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff' }, options.map(([v, t]) => el('option', { value: v, text: t })));
        s.addEventListener('change', () => { filter[key] = s.value; render(); });
        return s;
      };
      const btn = (text, fn) => el('button', { type: 'button', text, onclick: fn, style: 'font-size:13px;font-weight:600;padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer' });
      overlay = el('div', { id: 'buildLogOverlay', role: 'dialog', 'aria-label': 'Build log', style: 'position:fixed;inset:0;z-index:2147483000;background:#f1f5f9;display:flex;flex-direction:column;font-family:system-ui,sans-serif' }, [
        el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 12px;background:#fff;border-bottom:1px solid #e2e8f0' }, [
          el('strong', { text: 'Build log', style: 'font-size:16px' }),
          el('span', { 'data-role': 'count', style: 'font-size:12px;color:#64748b' }),
          el('span', { style: 'flex:1' }),
          btn('Close', () => { overlay.style.display = 'none'; }),
        ]),
        el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px' }, [
          select('bot', [['', 'All bots']], 'bot'),
          select('result', [['', 'All results'], ['success', 'Success'], ['fail', 'Failed'], ['escalate', 'Escalated']], 'result'),
          btn('Export JSON', exportJson),
          btn('Share', share),
          el('span', { 'data-role': 'note', style: 'font-size:12px;color:#475569' }),
        ]),
        el('div', { 'data-role': 'list', style: 'flex:1;overflow:auto;padding:4px 12px 24px' }),
      ]);
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    render();
    load();
  }

  /** Adds the "Show build log" button to `host` (an element) and remembers how to find the project and call the API. */
  function mount(opts) {
    getProjectId = opts.getProjectId;
    call = opts.call;
    const b = el('button', { type: 'button', id: 'showBuildLogBtn', text: 'Show build log', onclick: open, style: 'flex-shrink:0;font-size:12px;font-weight:600;padding:6px 12px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;margin-right:8px' });
    opts.host.insertBefore(b, opts.host.lastElementChild || null);
    return b;
  }

  /** A live entry from the build's socket. */
  function push(entry) {
    if (!entry) return;
    add([entry]);
    if (overlay && overlay.style.display !== 'none') render();
  }

  window.BuildLogUI = { mount, push, open, _state: () => ({ entries, filter }), _reset: () => { entries = []; seen.clear(); } };
})();
