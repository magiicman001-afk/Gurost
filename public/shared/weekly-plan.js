// Weekly plan panel (Business Assistant page): the Planner proposes up to five things for the week, each with its evidence.
// The owner presses "Draft this" on the ones they want (that press IS the approval) or "Skip". A draft is text on the page with a
// Copy button; nothing is sent, saved to Gmail or added to a calendar. Everything from the server goes in with textContent, never HTML.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GurostWeeklyPlan = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KIND_LABEL = { website: 'Website change', post: 'Post', email: 'Email', prep: 'Get ready', task: 'To do' };
  function kindLabel(k) { return KIND_LABEL[k] || 'To do'; }
  function safeHref(u) { return /^https?:\/\/[^\s<>"']+$/i.test(String(u || '')) ? String(u) : ''; }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return String(u || '').slice(0, 60); } }

  /** "2 of 3 plans used this week" - pure, so it can be tested. */
  function usageText(u) {
    if (!u || u.available === false) return 'The Weekly plan is not ready on this server yet.';
    return u.week.used + ' of ' + u.week.limit + ' plans used this week, ' + u.month.used + ' of ' + u.month.limit + ' this month.';
  }
  /** Which buttons an item gets, by status. */
  function actionsFor(status) {
    if (status === 'proposed') return ['draft', 'skip'];
    if (status === 'approved') return ['draft'];
    if (status === 'skipped') return ['restore'];
    return [];
  }
  function weekText(iso) {
    var t = Date.parse(iso); if (!isFinite(t)) return '';
    var d = new Date(t), m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
    return 'Week of ' + d.getUTCDate() + ' ' + m + ' ' + d.getUTCFullYear();
  }

  function mount(box, api) {
    if (!box || !api) return;
    var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    box.appendChild(el('p', 'text-sm text-[var(--muted)] mb-3', 'Once a week I suggest what to do next, using the fixes you confirmed in Scout, your calendar (only if you switched viewing on) and your reminders. I only suggest and draft: nothing is sent or changed unless you do it yourself.'));
    var toggleRow = el('label', 'flex items-center gap-2 text-sm mb-3');
    var toggle = el('input'); toggle.type = 'checkbox'; toggle.className = 'w-5 h-5';
    toggleRow.append(toggle, el('span', null, 'Make my plan every Monday morning'));
    var left = el('p', 'text-xs text-[var(--muted)] mb-3');
    var go = el('button', 'gold-gradient text-white text-sm font-semibold px-4 py-2 rounded-full', 'Plan my week'); go.type = 'button';
    var msg = el('p', 'text-sm mt-3'); msg.setAttribute('role', 'status');
    var out = el('div', 'mt-4 grid gap-3');
    box.append(toggleRow, left, go, msg, out);

    function say(t) { msg.textContent = t || ''; }

    function itemCard(plan, item) {
      var card = el('div', 'rounded-xl border border-[var(--line)] p-3');
      card.style.wordBreak = 'break-word';
      var top = el('div', 'flex flex-wrap items-center gap-2 mb-1');
      top.appendChild(el('span', 'text-xs font-semibold px-2 py-0.5 rounded-full border border-[var(--line)]', kindLabel(item.kind)));
      top.appendChild(el('span', 'text-sm font-semibold', item.title));
      card.appendChild(top);
      if (item.why) card.appendChild(el('p', 'text-sm', item.why));
      var ev = el('p', 'text-xs text-[var(--muted)] mt-1', 'Because: ' + (item.evidence || '').replace(/ - source: https?:\/\/\S+$/, ''));
      var href = item.source && safeHref(item.source.url);
      if (href) { ev.appendChild(document.createTextNode(' ')); var a = el('a', 'underline', '(' + host(href) + ')'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; ev.appendChild(a); }
      card.appendChild(ev);
      if (item.draft && item.draft.text) {
        var pre = el('pre', 'mt-2 text-sm rounded-lg p-3 border border-[var(--line)]', item.draft.text);
        pre.style.whiteSpace = 'pre-wrap'; pre.style.wordBreak = 'break-word'; pre.style.fontFamily = 'inherit';
        card.appendChild(pre);
        var row = el('div', 'flex flex-wrap items-center gap-2 mt-2');
        var copy = el('button', 'text-xs font-semibold px-3 py-1 rounded-full border border-[var(--line)]', 'Copy'); copy.type = 'button';
        copy.addEventListener('click', function () {
          var done = function () { copy.textContent = 'Copied'; };
          try { navigator.clipboard.writeText(item.draft.text).then(done, function () { selectText(pre); copy.textContent = 'Select and copy'; }); }
          catch (e) { selectText(pre); copy.textContent = 'Select and copy'; }
        });
        row.append(copy, el('span', 'text-xs text-[var(--muted)]', 'A draft for you to edit. Nothing was sent or saved anywhere.'));
        card.appendChild(row);
      }
      var acts = actionsFor(item.status), btns = el('div', 'flex flex-wrap gap-2 mt-2');
      acts.forEach(function (a) {
        var b = el('button', a === 'draft' ? 'gold-gradient text-white text-xs font-semibold px-3 py-1.5 rounded-full' : 'text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--line)]',
          a === 'draft' ? (item.status === 'approved' ? 'Try drafting again' : 'Draft this') : a === 'skip' ? 'Skip' : 'Put back');
        b.type = 'button';
        b.addEventListener('click', function () { act(plan, item, a, b); });
        btns.appendChild(b);
      });
      if (item.status === 'skipped') card.style.opacity = '0.6';
      if (btns.firstChild) card.appendChild(btns);
      return card;
    }
    function selectText(node) { try { var r = document.createRange(); r.selectNodeContents(node); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* the person can still select by hand */ } }

    async function act(plan, item, a, btn) {
      btn.disabled = true; say('');
      var base = '/api/weekly-plan/' + encodeURIComponent(plan.id) + '/items/' + encodeURIComponent(item.id);
      try {
        if (a === 'draft') {
          if (item.status === 'proposed') await api.call(base + '/decision', { method: 'POST', body: { action: 'approve' } });
          say('Writing the draft…');
          await api.call(base + '/draft', { method: 'POST', body: {} });
          say('');
        } else {
          await api.call(base + '/decision', { method: 'POST', body: { action: a === 'skip' ? 'skip' : 'restore' } });
        }
      } catch (e) { say((e && e.message) || 'Could not do that.'); }
      refresh(true);
    }

    function show(plan) {
      out.textContent = '';
      if (!plan) return;
      out.appendChild(el('p', 'text-xs text-[var(--muted)]', weekText(plan.weekStart) + (plan.source === 'rules' ? ' - a plain list (the AI could not write it this time)' : '') + '. ' + (plan.label || '')));
      (plan.items || []).forEach(function (it) { out.appendChild(itemCard(plan, it)); });
      (plan.notes || []).forEach(function (n) { out.appendChild(el('p', 'text-xs text-[var(--muted)]', n)); });
    }

    async function refresh(keepMsg) {
      try {
        var s = await api.call('/api/weekly-plan');
        toggle.checked = !!s.enabled; toggle.disabled = s.available === false;
        left.textContent = usageText(s.usage);
        go.disabled = s.available === false || (s.usage && (s.usage.week.used >= s.usage.week.limit || s.usage.month.used >= s.usage.month.limit));
        show(s.plan);
        if (!keepMsg) say('');
      } catch (e) { left.textContent = ''; if (!keepMsg) say((e && e.message) || ''); }
    }

    toggle.addEventListener('change', async function () {
      var want = toggle.checked; toggle.disabled = true;
      try { await api.call('/api/weekly-plan/setting', { method: 'POST', body: { enabled: want } }); say(want ? 'On. I will make your plan on Monday mornings (server time).' : 'Off. No automatic plan.'); }
      catch (e) { toggle.checked = !want; say((e && e.message) || 'Could not save that.'); }
      toggle.disabled = false;
    });
    go.addEventListener('click', async function () {
      go.disabled = true; say('Planning your week… about 20 seconds.');
      try { var r = await api.call('/api/weekly-plan/run', { method: 'POST', body: {} }); say(''); show(r.plan); }
      catch (e) { say((e && e.message) || 'Could not make the plan.'); }
      refresh(true);
    });
    refresh();
  }

  return { kindLabel: kindLabel, usageText: usageText, actionsFor: actionsFor, weekText: weekText, safeHref: safeHref, mount: mount };
}));
