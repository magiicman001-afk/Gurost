// "What <AI name> remembers": shows the notes saved about this user, lets them
// forget one or all, and switch memory off. Everything from the server is put
// on the page with textContent, never as HTML.
(function () {
  var root = document.getElementById('memoryPanel');
  if (!root || !window.GurostAPI) return;
  var name = window.GurostAI ? GurostAI.NAME : 'Your assistant';
  var items = [], paused = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var TYPE = { fact: 'Fact', preference: 'Preference', pattern: 'Habit' };
  function botLabel(id) { return id === 'hr' ? 'HR' : id ? id.charAt(0).toUpperCase() + id.slice(1) : ''; }

  var title = el('h2', 'font-display font-bold text-lg mb-1', 'What ' + name + ' remembers');
  var intro = el('p', 'text-sm text-[var(--muted)] mb-4', 'Lasting things you tell your department bots are saved here and shared between them, so you do not repeat yourself. You can forget any of it, or switch memory off.');
  var switchRow = el('label', 'flex items-center gap-2 text-sm font-semibold mb-3');
  var toggle = el('input'); toggle.type = 'checkbox'; toggle.id = 'memoryOn';
  var toggleText = el('span', null, 'Memory is on');
  switchRow.appendChild(toggle); switchRow.appendChild(toggleText);
  var status = el('p', 'text-sm mb-2'); status.setAttribute('role', 'status'); status.id = 'memoryMsg';
  var list = el('div', 'grid gap-2 mb-3'); list.id = 'memoryList';
  var forgetAll = el('button', 'text-sm font-semibold px-4 py-2 rounded-full border border-[var(--line)]', 'Forget everything'); forgetAll.type = 'button'; forgetAll.id = 'memoryForgetAll';
  [title, intro, switchRow, status, list, forgetAll].forEach(function (n) { root.appendChild(n); });

  function say(text, isErr) { status.textContent = text || ''; status.style.color = isErr ? '#b91c1c' : ''; }

  function render() {
    toggle.checked = !paused;
    toggleText.textContent = paused ? 'Memory is off. Your bots are not reading or saving anything.' : 'Memory is on';
    list.textContent = '';
    if (!items.length) list.appendChild(el('p', 'text-sm text-[var(--muted)]', 'Nothing saved yet. Notes appear here as you chat with your bots.'));
    items.forEach(function (it) {
      var row = el('div', 'flex items-start justify-between gap-3 border border-[var(--line)] rounded-xl p-3');
      var text = el('div', 'text-sm');
      text.appendChild(el('div', 'font-semibold', it.key.replace(/_/g, ' ')));
      text.appendChild(el('div', null, it.value));
      text.appendChild(el('div', 'text-xs text-[var(--muted)] mt-1', (TYPE[it.memory_type] || it.memory_type) + (it.source_bot ? ' · learned by the ' + botLabel(it.source_bot) + ' bot' : '')));
      var btn = el('button', 'text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--line)] shrink-0', 'Forget'); btn.type = 'button';
      btn.setAttribute('aria-label', 'Forget ' + it.key.replace(/_/g, ' '));
      btn.addEventListener('click', function () { forget(it.key); });
      row.appendChild(text); row.appendChild(btn); list.appendChild(row);
    });
    forgetAll.hidden = !items.length;
  }

  async function load() {
    try { var r = await GurostAPI.call('/api/memory'); items = r.items || []; paused = !!r.paused; render(); say(''); }
    catch (err) { say("Couldn't load what is remembered: " + err.message, true); }
  }
  async function forget(key) {
    try { await GurostAPI.call('/api/memory/' + encodeURIComponent(key), { method: 'DELETE' }); items = items.filter(function (i) { return i.key !== key; }); render(); say('Forgotten.'); }
    catch (err) { say(err.message, true); }
  }
  toggle.addEventListener('change', async function () {
    var wantPaused = !toggle.checked;
    try { var r = await GurostAPI.call('/api/memory/settings', { method: 'PUT', body: { paused: wantPaused } }); paused = r.paused; render(); say(paused ? 'Memory switched off.' : 'Memory switched on.'); }
    catch (err) { toggle.checked = !wantPaused; say(err.message, true); }
  });
  forgetAll.addEventListener('click', async function () {
    if (!window.confirm('Forget everything? This deletes every saved note and every saved conversation with your bots. It cannot be undone.')) return;
    try { await GurostAPI.call('/api/memory', { method: 'DELETE' }); items = []; render(); say('Everything has been forgotten.'); }
    catch (err) { say(err.message, true); }
  });

  load();
})();
