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
    stopVoice();
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
    stopVoice(); checkVoice();
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

  // A small line under the answer when a tool did part of the work.
  var TOOL_NAMES = { calculator: 'calculator', time_date: 'date and time', currency_converter: 'exchange rates', company_profile: 'your company profile', web_search: 'web search', email_draft: 'email draft', calendar_event: 'calendar' };
  function showTools(used) {
    if (!used || !used.length) return;
    var names = used.map(function (t) { return TOOL_NAMES[t] || t.replace(/_/g, ' '); });
    var last = $('deptLog').lastElementChild;
    if (last) last.appendChild(el('div', 'text-xs text-gray-500 mt-1', 'Checked with: ' + names.join(', ')));
  }

  // Drafts the bot prepared (an email, a calendar event) as cards. Nothing is
  // sent or added for the user: they copy, open in their own app, or download.
  var EMAIL_RE = /^[^\s@<>(),;:\\"]+@[^\s@<>(),;:\\"]+\.[^\s@<>(),;:\\"]{2,}$/;
  function actionBtn(label, onClick) { var b = el('button', 'dept-copy', label); b.type = 'button'; b.addEventListener('click', onClick); return b; }
  function card(title) { var c = el('div', 'dept-bubble dept-bot'); c.appendChild(el('div', 'text-xs font-semibold text-gray-500 mb-1', title)); return c; }

  function emailCard(p) {
    var c = card('Email draft - not sent');
    if (p.to && p.to.length) c.appendChild(el('div', 'text-sm', 'To: ' + p.to.join(', ')));
    c.appendChild(el('div', 'text-sm font-semibold', 'Subject: ' + p.subject));
    c.appendChild(el('pre', 'dept-draft', p.body));
    var copy = actionBtn('Copy email', function () { copyText((p.to && p.to.length ? 'To: ' + p.to.join(', ') + '\n' : '') + 'Subject: ' + p.subject + '\n\n' + p.body, copy); });
    copy.className = 'dept-copy'; c.appendChild(copy);
    var addrs = (p.to || []).filter(function (a) { return EMAIL_RE.test(a); });
    var open = el('a', 'dept-copy', 'Open in email app'); open.style.marginLeft = '8px'; open.style.textDecoration = 'none'; open.style.display = 'inline-block';
    open.href = 'mailto:' + addrs.map(function (a) { return encodeURIComponent(a).replace(/%40/g, '@'); }).join(',') + '?subject=' + encodeURIComponent(p.subject) + '&body=' + encodeURIComponent(String(p.body).slice(0, 1800));
    c.appendChild(open);
    return c;
  }

  function eventCard(p) {
    var c = card('Calendar event - not added yet');
    c.appendChild(el('div', 'text-sm font-semibold', p.title));
    c.appendChild(el('div', 'text-sm', p.start.replace('T', ' ') + ' (' + p.timezone + '), ' + p.durationMinutes + ' min'));
    if (p.location) c.appendChild(el('div', 'text-sm', 'Where: ' + p.location));
    if (p.description) c.appendChild(el('div', 'text-sm', p.description));
    var dl = actionBtn('Download calendar file', function () {
      var url = URL.createObjectURL(new Blob([p.ics], { type: 'text/calendar' }));
      var a = document.createElement('a'); a.href = url; a.download = (p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event') + '.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    c.appendChild(dl);
    return c;
  }

  function showProposals(list) {
    (list || []).forEach(function (p) {
      var c = p && p.type === 'email' ? emailCard(p) : p && p.type === 'event' ? eventCard(p) : null;
      if (c) { $('deptLog').appendChild(c); c.scrollIntoView({ block: 'nearest' }); }
    });
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


  // ---- Talk: hands-free voice conversation (see shared/voice-chat.js) ----------
  var voice = null, voiceReady = false;
  var VOICE_TEXT = { listening: 'Listening... speak when you are ready.', thinking: 'Thinking...', speaking: 'Speaking. Talk any time to interrupt.', off: '' };

  function setVoiceStatus(text) { var s = $('deptVoiceStatus'); if (s) s.textContent = text || ''; }

  async function checkVoice() {
    var btn = $('deptVoice'); if (!btn) return;
    voiceReady = false; btn.disabled = true; btn.textContent = 'Talk';
    if (!window.GurostVoice || !window.GurostVad || !GurostVoice.browserSupported()) { setVoiceStatus('Voice is not available in this browser. You can type instead.'); return; }
    try {
      var st = await GurostAPI.call('/api/voice/status');
      if (!st.available) { setVoiceStatus('Voice is not set up yet. You can type instead.'); return; }
    } catch (e) { setVoiceStatus(''); return; }
    voiceReady = true; btn.disabled = false; setVoiceStatus('');
  }

  function stopVoice() {
    if (voice) { voice.stop(); voice = null; }
    var btn = $('deptVoice'); if (btn) btn.textContent = 'Talk';
    if (voiceReady) setVoiceStatus('');
  }

  async function startVoice() {
    if (!current || !voiceReady || voice) return;
    var botId = current.id;
    voice = GurostVoice.createVoiceSession(GurostVoice.browserEnv(), {
      send: function (blob) {
        var form = new FormData();
        form.append('audio', blob, 'speech.' + (/mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm'));
        return GurostAPI.call('/api/department-bots/' + botId + '/voice', { method: 'POST', body: form });
      },
      onStatus: function (s) { setVoiceStatus(VOICE_TEXT[s] || ''); $('deptVoice').textContent = s === 'off' ? 'Talk' : 'Stop'; if (s === 'off') voice = null; },
      onUser: function (text) { bubble('you', text); },
      onResult: function (r) {
        bubble('bot', r.reply, r.draft); showTools(r.toolsUsed); showProposals(r.proposals);
        history.push({ role: 'user', content: r.transcript }, { role: 'assistant', content: (r.reply ? r.reply + '\n\n' : '') + (r.draft ? '--- DRAFT ---\n' + r.draft + '\n--- END DRAFT ---' : '') });
      },
      onError: function (msg) { bubble('bot', "I couldn't answer that: " + (window.GurostAI ? GurostAI.publicText(msg) : msg)); }
    });
    try { await voice.start(); }
    catch (err) {
      voice = null; $('deptVoice').textContent = 'Talk';
      setVoiceStatus(err && err.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser, or type instead.' : 'I could not start the microphone. You can type instead.');
    }
  }

  $('deptVoice').addEventListener('click', function () { if (voice) stopVoice(); else startVoice(); });

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
      showTools(r.toolsUsed);
      showProposals(r.proposals);
    } catch (err) { thinking.remove(); bubble('bot', "I couldn't answer that: " + (window.GurostAI ? GurostAI.publicText(err.message) : err.message)); }
    busy = false; $('deptSend').disabled = false;
  }
  $('deptSend').addEventListener('click', send);
  $('deptInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } });

  load();
})();
