// Department bots on the Business Assistant page: pick a bot, calibrate it once,
// paste an email or question, copy the draft. Everything the model or the visitor
// wrote is put on the page with textContent, never as HTML.
(function () {
  var root = document.getElementById('deptBots');
  if (!root || !window.GurostAPI) return;
  var $ = function (id) { return document.getElementById(id); };
  var bots = [], tones = [], current = null, history = [], busy = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function msg(text, isErr) { $('deptMsg').textContent = text || ''; $('deptMsg').style.color = isErr ? '#b91c1c' : ''; }
  function botById(id) { return bots.find(function (b) { return b.id === id; }); }

  async function load() {
    try {
      var data = await GurostAPI.call('/api/department-bots');
      bots = data.bots; tones = data.tones;
      var sel = $('deptSelect');
      bots.forEach(function (b) { var o = el('option', null, b.icon + ' ' + b.label); o.value = b.id; sel.appendChild(o); });
      var t = $('deptTone');
      tones.forEach(function (x) { var o = el('option', null, x.charAt(0).toUpperCase() + x.slice(1)); o.value = x; t.appendChild(o); });
    } catch (err) { msg("Couldn't load the department bots: " + err.message, true); }
  }

  function showCalibration(bot) {
    var c = bot.calibration || {};
    $('deptCalTitle').textContent = 'Set up your ' + bot.label + ' bot';
    $('deptBotName').value = c.botName || '';
    $('deptUserName').value = c.userName || '';
    $('deptTone').value = c.tone || bot.defaultTone;
    $('deptSignature').value = c.signature || '';
    $('deptPrefs').value = c.preferences || '';
    $('deptFocus').value = c.focus || '';
    $('deptFocusWrap').hidden = bot.id !== 'custom';
    $('deptCal').hidden = false; $('deptChat').hidden = true;
  }

  function showChat(bot) {
    $('deptCal').hidden = true; $('deptChat').hidden = false;
    $('deptChatTitle').textContent = ((bot.calibration && bot.calibration.botName) || bot.label + ' · ' + (window.GurostAI ? GurostAI.NAME : 'Assistant'));
    history = []; $('deptLog').textContent = '';
    bubble('bot', bot.summary + ' Paste an email or ask a question and I will draft the reply.');
    restore(bot);
  }

  // Put back the saved conversation (same account, any device). The server
  // keeps the history itself, so this only shows it.
  async function restore(bot) {
    try {
      var r = await GurostAPI.call('/api/department-bots/' + bot.id + '/history');
      if (current !== bot || !r.messages || !r.messages.length) return;
      var note = el('p', 'text-xs text-gray-500 mb-2', 'Earlier conversation restored.'); $('deptLog').appendChild(note);
      r.messages.forEach(function (m) { if (m.role === 'user') bubble('you', m.text); else bubble('bot', m.text, m.draft); });
    } catch (e) { /* no saved chat to show; start fresh */ }
  }

  function bubble(who, text, draft) {
    var b = el('div', 'dept-bubble dept-' + who);
    if (who === 'bot' && window.GurostAI) { var av = el('span', 'dept-avatar'); av.innerHTML = GurostAI.avatar(20); av.title = GurostAI.NAME; b.appendChild(av); } // static markup, no user text
    if (text) b.appendChild(el('p', null, text));
    if (draft) {
      var box = el('pre', 'dept-draft', draft);
      var copy = el('button', 'dept-copy', 'Copy draft');
      copy.type = 'button';
      copy.addEventListener('click', function () { copyText(draft, copy); });
      b.appendChild(box); b.appendChild(copy);
    }
    $('deptLog').appendChild(b);
    b.scrollIntoView({ block: 'nearest' });
  }

  function copyText(text, btn) {
    var done = function () { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy draft'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); } else fallback();
    function fallback() {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'Copy failed - select the text'; }
      ta.remove();
    }
  }

  $('deptSelect').addEventListener('change', function () {
    msg('');
    current = botById(this.value);
    if (!current) { $('deptCal').hidden = true; $('deptChat').hidden = true; return; }
    if (current.calibration) showChat(current); else showCalibration(current);
  });

  $('deptEdit').addEventListener('click', function () { if (current) showCalibration(current); });
  $('deptCalCancel').addEventListener('click', function () { if (!current) return; if (current.calibration) showChat(current); else { $('deptCal').hidden = true; $('deptSelect').value = ''; current = null; } });

  $('deptCalSave').addEventListener('click', async function () {
    if (!current) return;
    var body = { botName: $('deptBotName').value, userName: $('deptUserName').value, tone: $('deptTone').value, signature: $('deptSignature').value, preferences: $('deptPrefs').value, focus: current.id === 'custom' ? $('deptFocus').value : '' };
    try {
      var r = await GurostAPI.call('/api/department-bots/' + current.id + '/calibration', { method: 'PUT', body: body });
      current.calibration = r.calibration; msg(''); showChat(current);
    } catch (err) { msg(err.message, true); }
  });

  async function send() {
    if (!current || busy) return;
    var input = $('deptInput'), text = input.value.trim();
    if (!text) return;
    busy = true; $('deptSend').disabled = true; input.value = '';
    bubble('you', text);
    var thinking = el('div', 'dept-bubble dept-bot', (window.GurostAI ? GurostAI.STATUS.thinking : 'Thinking…')); $('deptLog').appendChild(thinking);
    try {
      var r = await GurostAPI.call('/api/department-bots/' + current.id + '/chat', { method: 'POST', body: { message: text, history: history } });
      thinking.remove();
      history.push({ role: 'user', content: text }, { role: 'assistant', content: (r.reply ? r.reply + '\n\n' : '') + (r.draft ? '--- DRAFT ---\n' + r.draft + '\n--- END DRAFT ---' : '') });
      bubble('bot', r.reply, r.draft);
    } catch (err) { thinking.remove(); bubble('bot', "I couldn't answer that: " + (window.GurostAI ? GurostAI.publicText(err.message) : err.message)); }
    busy = false; $('deptSend').disabled = false;
  }
  $('deptSend').addEventListener('click', send);
  $('deptInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });

  load();
})();
