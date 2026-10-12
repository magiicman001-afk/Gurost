// Gurost admin: the "?" help panel, the Guide tab (search, glossary) and the first-login tour.
// docs/ADMIN_GUIDE_SPEC.md. Content comes from GET /api/admin/guide, already filtered for the signed-in role.
// Everything is put on the page with textContent (never as HTML), so the content can never become markup.
(function () {
  let data = null;
  let call = null;
  let who = 'admin';
  let gotoTab = () => {};
  let helpOverlay = null;
  let tourOverlay = null;

  function el(tag, props, children) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }

  const BTN = 'font-size:13px;font-weight:600;padding:7px 14px;border:1px solid #E9E9EF;border-radius:999px;background:#fff;cursor:pointer';
  const PRIMARY = 'font-size:13px;font-weight:700;padding:8px 16px;border:0;border-radius:999px;background:#FF8C00;color:#fff;cursor:pointer';

  async function load() {
    if (!data) data = await call('/api/admin/guide');
    return data;
  }

  // ---- shared drawing of one block ------------------------------------------------------------------------------
  function drawBlock(b) {
    if (b.h) return el('h4', { text: b.h, style: 'font-weight:700;margin:14px 0 4px;font-size:14px' });
    if (b.p) return el('p', { text: b.p, style: 'margin:6px 0;line-height:1.55;font-size:14px' });
    if (b.warn) return el('p', { text: b.warn, style: 'margin:10px 0;padding:10px 12px;background:#FFF7ED;border-left:4px solid #FF8C00;border-radius:6px;font-size:13px;line-height:1.5' });
    const list = el(b.ol ? 'ol' : 'ul', { style: `margin:6px 0 6px 20px;padding:0;list-style:${b.ol ? 'decimal' : 'disc'};font-size:14px;line-height:1.55` });
    (b.ol || b.ul || []).forEach((t) => list.appendChild(el('li', { text: t, style: 'margin:4px 0' })));
    return list;
  }

  function section(title, items) {
    const wrap = el('div', { style: 'margin:14px 0' }, [el('h4', { text: title, style: 'font-weight:700;margin:0 0 4px;font-size:14px' })]);
    const ul = el('ul', { style: 'margin:0 0 0 20px;padding:0;list-style:disc;font-size:14px;line-height:1.55' });
    items.forEach((t) => ul.appendChild(el('li', { text: t, style: 'margin:4px 0' })));
    wrap.appendChild(ul);
    return wrap;
  }

  // ---- the ? help panel -----------------------------------------------------------------------------------------
  function closeHelp() {
    if (helpOverlay) helpOverlay.style.display = 'none';
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') { closeHelp(); closeTour(false); } }

  async function openHelp(tabId, label) {
    let g;
    try { g = await load(); } catch (err) { alert(err.message); return; }
    const h = g.tabs[tabId];
    if (!helpOverlay) {
      helpOverlay = el('div', { id: 'adminHelpOverlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Help', style: 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.45);display:none;justify-content:flex-end' });
      helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) closeHelp(); });
      document.body.appendChild(helpOverlay);
    }
    helpOverlay.textContent = '';
    const sheet = el('div', { style: 'background:#fff;width:min(560px,100%);height:100%;overflow:auto;padding:16px 18px 32px;box-shadow:-4px 0 24px rgba(0,0,0,.15)' });
    const head = el('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:6px' }, [
      el('h3', { text: h ? `Help: ${h.title}` : `Help: ${label || tabId}`, style: 'font-weight:800;font-size:18px;flex:1;margin:0' }),
      el('button', { type: 'button', text: 'Close', style: BTN, onclick: closeHelp, 'aria-label': 'Close help' }),
    ]);
    sheet.appendChild(head);
    if (!h) {
      sheet.appendChild(el('p', { text: 'There is no help text for this tab.', style: 'font-size:14px' }));
    } else {
      h.shows.forEach((t) => sheet.appendChild(el('p', { text: t, style: 'margin:8px 0;line-height:1.55;font-size:14px' })));
      const nums = el('div', { style: 'margin:14px 0' }, [el('h4', { text: 'What the numbers mean', style: 'font-weight:700;margin:0 0 6px;font-size:14px' })]);
      h.numbers.forEach(([k, v]) => nums.appendChild(el('p', { style: 'margin:6px 0;font-size:14px;line-height:1.5' }, [el('strong', { text: k + ': ' }), document.createTextNode(v)])));
      sheet.appendChild(nums);
      sheet.appendChild(section('If something looks wrong', h.wrong));
      const dont = section('What NOT to click or do', h.dont);
      dont.style.cssText += ';background:#FEF2F2;border-left:4px solid #B91C1C;padding:8px 12px;border-radius:6px';
      sheet.appendChild(dont);
    }
    sheet.appendChild(el('p', { style: 'margin-top:18px' }, [el('button', { type: 'button', text: 'Open the full Guide', style: PRIMARY, onclick: () => { closeHelp(); gotoTab('guide'); } })]));
    helpOverlay.appendChild(sheet);
    helpOverlay.style.display = 'flex';
    document.addEventListener('keydown', onKey);
    sheet.querySelector('button').focus();
  }

  // ---- the Guide tab --------------------------------------------------------------------------------------------
  const textOf = (blocks) => blocks.map((b) => b.h || b.p || b.warn || (b.ol || b.ul || []).join(' ')).join(' ');

  async function renderGuide(host) {
    const g = await load();
    host.textContent = '';
    const search = el('input', { type: 'search', placeholder: 'Search the guide (try: deploy, key, build log)', class: 'field-input', 'aria-label': 'Search the guide', style: 'max-width:520px' });
    const top = el('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px' }, [
      search,
      el('button', { type: 'button', text: 'Take the tour', style: BTN, onclick: () => startTour() }),
    ]);
    const intro = el('p', { text: `This guide is for your role (${g.role.replace('_', ' ')}). It shows only what you can use. Every tab also has a ? button in its corner.`, style: 'font-size:13px;color:#6B7280;margin-bottom:12px' });
    const list = el('div');
    host.append(top, intro, list);

    const items = [];
    g.sections.forEach((s) => {
      const body = el('div', { style: 'padding:4px 4px 8px' }, s.blocks.map(drawBlock));
      const d = el('details', { style: 'border:1px solid #E9E9EF;border-radius:10px;background:#fff;margin:0 0 8px;padding:10px 14px' }, [
        el('summary', { text: `${s.letter.toUpperCase()}. ${s.title}`, style: 'font-weight:700;cursor:pointer;font-size:15px' }), body,
      ]);
      items.push({ node: d, text: `${s.title} ${textOf(s.blocks)}`.toLowerCase(), open: false });
    });
    // tab help index
    const tabEntries = Object.entries(g.tabs);
    if (tabEntries.length) {
      const body = el('div', { style: 'padding:4px 4px 8px' });
      tabEntries.forEach(([id, h]) => {
        const row = el('p', { style: 'margin:6px 0;font-size:14px' }, [el('button', { type: 'button', text: h.title, style: 'font-weight:700;text-decoration:underline;background:none;border:0;cursor:pointer;padding:0;font-size:14px', onclick: () => openHelp(id, h.title) }), document.createTextNode(' - ' + h.shows[0].slice(0, 110) + (h.shows[0].length > 110 ? '...' : ''))]);
        body.appendChild(row);
      });
      const d = el('details', { style: 'border:1px solid #E9E9EF;border-radius:10px;background:#fff;margin:0 0 8px;padding:10px 14px' }, [
        el('summary', { text: 'Help for each tab', style: 'font-weight:700;cursor:pointer;font-size:15px' }), body,
      ]);
      items.push({ node: d, text: tabEntries.map(([, h]) => [h.title, ...h.shows, ...h.numbers.flat(), ...h.wrong, ...h.dont].join(' ')).join(' ').toLowerCase(), open: false });
    }
    // glossary (section M)
    const gl = el('div', { style: 'padding:4px 4px 8px' });
    const glRows = g.glossary.map((t) => {
      const row = el('p', { style: 'margin:6px 0;font-size:14px;line-height:1.5' }, [el('strong', { text: t.term + ': ' }), document.createTextNode(t.meaning)]);
      gl.appendChild(row);
      return { row, text: (t.term + ' ' + t.meaning).toLowerCase() };
    });
    const gd = el('details', { style: 'border:1px solid #E9E9EF;border-radius:10px;background:#fff;margin:0 0 8px;padding:10px 14px' }, [
      el('summary', { text: 'M. Glossary (plain-English terms)', style: 'font-weight:700;cursor:pointer;font-size:15px' }), gl,
    ]);
    items.push({ node: gd, text: glRows.map((r) => r.text).join(' '), open: false, glossary: glRows });
    const none = el('p', { text: 'Nothing matches. Try a shorter word.', style: 'display:none;font-size:14px;color:#6B7280' });
    items.forEach((i) => list.appendChild(i.node));
    list.appendChild(none);

    function apply() {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      items.forEach((i) => {
        const hit = !q || i.text.includes(q);
        i.node.style.display = hit ? '' : 'none';
        if (hit) shown++;
        if (q && hit) i.node.open = true; else if (!q) i.node.open = false;
        if (i.glossary) i.glossary.forEach((r) => { r.row.style.display = !q || r.text.includes(q) || !i.glossary.some((x) => x.text.includes(q)) ? '' : 'none'; });
      });
      none.style.display = shown ? 'none' : 'block';
    }
    search.addEventListener('input', apply);
  }

  // ---- first-login tour -----------------------------------------------------------------------------------------
  function closeTour(mark) {
    if (tourOverlay) tourOverlay.style.display = 'none';
    if (mark) try { localStorage.setItem(seenKey(), '1'); } catch { /* the tour just shows again next time */ }
  }
  const seenKey = () => `gurost_admin_tour_seen_${who}`;

  async function startTour() {
    let g;
    try { g = await load(); } catch { return; }
    const steps = g.tour || [];
    if (!steps.length) return;
    let i = 0;
    if (!tourOverlay) {
      tourOverlay = el('div', { id: 'adminTourOverlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Admin tour', style: 'position:fixed;inset:0;z-index:2147483001;background:rgba(15,23,42,.5);display:none;align-items:center;justify-content:center;padding:16px' });
      document.body.appendChild(tourOverlay);
    }
    function draw() {
      tourOverlay.textContent = '';
      const s = steps[i];
      const last = i === steps.length - 1;
      const dots = el('div', { style: 'display:flex;gap:6px;margin-bottom:10px' }, steps.map((_, n) => el('span', { style: `width:8px;height:8px;border-radius:50%;background:${n === i ? '#FF8C00' : '#E5E7EB'}` })));
      const card = el('div', { style: 'background:#fff;border-radius:16px;padding:20px;max-width:440px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)' }, [
        dots,
        el('p', { text: `Step ${i + 1} of ${steps.length}`, style: 'font-size:12px;color:#6B7280;margin:0 0 4px' }),
        el('h3', { text: s.title, style: 'font-weight:800;font-size:18px;margin:0 0 8px' }),
        el('p', { text: s.body, style: 'font-size:14px;line-height:1.55;margin:0 0 16px' }),
        el('div', { style: 'display:flex;gap:8px;align-items:center' }, [
          el('button', { type: 'button', text: 'Skip', style: BTN, onclick: () => closeTour(true) }),
          el('span', { style: 'flex:1' }),
          i > 0 ? el('button', { type: 'button', text: 'Back', style: BTN, onclick: () => { i--; draw(); } }) : null,
          el('button', { type: 'button', text: last ? 'Done' : 'Next', style: PRIMARY, onclick: () => { if (last) closeTour(true); else { i++; draw(); } } }),
        ]),
      ]);
      tourOverlay.appendChild(card);
      card.querySelector('button:last-child').focus();
    }
    tourOverlay.style.display = 'flex';
    document.addEventListener('keydown', onKey);
    draw();
  }

  /** Called once after sign-in. Opens the tour the first time this person signs in on this browser. */
  async function init(opts) {
    call = opts.call;
    who = String(opts.name || 'admin').replace(/[^\w-]/g, '_') + '_' + String(opts.role || '');
    gotoTab = opts.gotoTab || gotoTab;
    let seen = false;
    try { seen = localStorage.getItem(seenKey()) === '1'; } catch { /* treat as not seen */ }
    if (!seen) startTour();
  }

  window.AdminGuide = { init, openHelp, renderGuide, startTour, _reset: () => { data = null; } };
})();
