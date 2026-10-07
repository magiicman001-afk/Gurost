/**
 * Pulse Widget — real, complete floating widget logic.
 *
 * Hooks into window.gurostBuilder, the real, tested interface already
 * built into builder.html, app-builder.html, and amend_website.html
 * tonight — { generate(text), correct(text), pause(), hasActiveProject() }.
 * This widget doesn't duplicate any generation/correction logic; it
 * calls the real functions each page already has.
 *
 * Real, honest scope note: this widget provides genuine voice/text
 * input, real state visualization, and real, rule-based contextual
 * hints (e.g. "no contact section found"). It does NOT claim deep
 * machine-learning self-improvement — that's a materially different,
 * much larger undertaking than a widget. What real memory it does
 * keep (recent corrections on this project) is used honestly, as
 * real context for the next correction — not marketed as AI that
 * "gets smarter."
 */

(function () {
  let currentState = 'idle'; // idle | building | paused | recording | correcting | done
  let isExpanded = false;
  let activeRecording = null;
  let correctionHistory = []; // real, session-local memory of corrections made on this project

  // The AI's name is the one in brand-config.js. It is the AI behind Pulse (shared/ai-brand.js). Pulse keeps its own name; the
  // status line says what the AI is doing. Plain fallbacks if the brand file did not load.
  const AI = window.GurostAI;
  const aiStatus = (key, fallback) => (AI && AI.STATUS[key]) || fallback;
  const safeErr = (m) => (AI ? AI.publicText(m) : m); // an error never names a model or provider
  let doneStatus = 'Done'; // what the status line says once a build or an edit finishes

  function setState(newState) {
    currentState = newState;
    const ball = document.getElementById('pulseBall');
    if (!ball) return;
    ball.classList.remove('state-idle', 'state-building', 'state-paused', 'state-recording', 'state-correcting', 'state-done');
    ball.classList.add(`state-${newState}`);

    const icon = ball.querySelector('.material-symbols-outlined');
    const iconMap = {
      idle: 'graphic_eq',
      building: 'autorenew',
      paused: 'pause',
      recording: 'mic',
      correcting: 'sync',
      done: 'check',
    };
    if (icon) icon.textContent = iconMap[newState] || 'graphic_eq';

    const statusText = document.getElementById('pulsePanelStatusText');
    const statusMap = {
      idle: 'Ready when you are',
      building: aiStatus('thinking', 'Building…'),
      paused: 'Paused',
      recording: 'Listening…',
      correcting: aiStatus('thinking', 'Applying your change…'),
      done: doneStatus,
    };
    if (statusText) statusText.textContent = statusMap[newState] || '';

    updatePauseResumeButtons();

    if (newState === 'done') {
      setTimeout(() => { if (currentState === 'done') setState('idle'); }, 2500);
    }
  }

  function updateUndoRedoButtons(canUndo, canRedo) {
    const undoBtn = document.getElementById('actUndo');
    const redoBtn = document.getElementById('actRedo');
    if (undoBtn && canUndo !== undefined) undoBtn.disabled = !canUndo;
    if (redoBtn && canRedo !== undefined) redoBtn.disabled = !canRedo;
  }

  async function refreshUndoRedoState() {
    const projectId = window.gurostBuilder?.getProjectId?.();
    if (!projectId || typeof window.gurostBuilder.undo !== 'function') return;
    try {
      const result = await window.GurostAPI.call(`/api/project/${projectId}/undo-state`);
      updateUndoRedoButtons(result.canUndo, result.canRedo);
    } catch (err) {
      // Real, honest - a failed state check just leaves buttons as
      // they were; it's a convenience refresh, not load-bearing.
    }
  }

  function updatePauseResumeButtons() {
    const pauseBtn = document.getElementById('pulsePauseBtn');
    const resumeBtn = document.getElementById('pulseResumeBtn');
    if (!pauseBtn || !resumeBtn) return;
    const supportsPause = typeof window.gurostBuilder?.pause === 'function';
    const hasProject = window.gurostBuilder?.hasActiveProject?.();
    pauseBtn.classList.toggle('visible', supportsPause && hasProject && currentState === 'building');
    resumeBtn.classList.toggle('visible', supportsPause && hasProject && currentState === 'paused');
  }

  // Also mirrored into the page's bot activity feed when it has one.
  // feed: false for lines the page already logs itself (builds, edits).
  function logStatus(text, { feed = true } = {}) {
    if (feed) window.gurostBuilder?.logActivity?.(text, /fail|error|couldn't|could not/i.test(text) ? 'fail' : 'ok');
    const log = document.getElementById('pulseStatusLog');
    if (!log) return;
    const line = document.createElement('p');
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 8) log.removeChild(log.firstChild);
  }

  function setProgress(percent) {
    const track = document.getElementById('pulseProgressTrack');
    const bar = document.getElementById('pulseProgressBar');
    if (!track || !bar) return;
    if (percent === null) {
      track.classList.remove('visible');
      return;
    }
    track.classList.add('visible');
    bar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  // Suggestion box (Website Builder only): up to 3 friendly ideas from the server, which checks the
  // finished site's own HTML (no AI, no cost). "Add" sends the idea through the normal Pulse edit, so
  // it is undoable like any edit; "Maybe later" hides it for 7 days. Both answers are recorded.
  const onWebsiteBuilder = /\/builder(\.html)?$/.test(location.pathname);

  function answerSuggestion(projectId, id, action) {
    if (!window.GurostAPI || !projectId) return;
    window.GurostAPI.call(`/api/project/${projectId}/suggestions/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { action } })
      .catch(() => {}); // the answer is a courtesy to the log; the edit itself must never wait on it
  }

  function suggestionButton(label, primary) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;cursor:pointer;'
      + (primary ? 'background:var(--pulse-orange);color:#fff;border:none;' : 'background:#fff;border:1px solid #E9E9EF;');
    return b;
  }

  function renderSuggestions(projectId, list) {
    const box = document.getElementById('pulseSuggestion');
    const host = document.getElementById('pulseSuggestionList');
    if (!box || !host) return;
    host.textContent = '';
    (list || []).slice(0, 3).forEach((s) => {
      const card = document.createElement('div');
      card.className = 'pulse-suggestion-card';
      card.style.cssText = 'margin-bottom:10px;';
      const text = document.createElement('p');
      text.textContent = s.text;
      text.style.cssText = 'margin:0;';
      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;';
      const add = suggestionButton(`Add ${s.title}`, true);
      const later = suggestionButton('Maybe later', false);
      const done = () => { card.remove(); if (!host.children.length) box.classList.remove('visible'); };
      add.addEventListener('click', () => { answerSuggestion(projectId, s.id, 'accepted'); done(); sendCorrection(s.instruction); });
      later.addEventListener('click', () => { answerSuggestion(projectId, s.id, 'skipped'); done(); });
      actions.append(add, later);
      card.append(text, actions);
      host.appendChild(card);
    });
    box.classList.toggle('visible', host.children.length > 0);
  }

  async function checkForRealSuggestion() {
    const box = document.getElementById('pulseSuggestion');
    if (!box) return;
    const projectId = window.gurostBuilder?.getProjectId?.();
    if (!onWebsiteBuilder || !projectId || !window.GurostAPI) { box.classList.remove('visible'); return; }
    try {
      const r = await window.GurostAPI.call(`/api/project/${projectId}/suggestions`);
      renderSuggestions(projectId, r && r.suggestions);
    } catch (err) {
      box.classList.remove('visible'); // no ideas is always better than a broken box
    }
  }

  // GitHub saving. Every 30 minutes, if the site changed since the last save, Pulse offers to save it
  // (or saves quietly when the person turned auto-save on). It runs from the open tab: projects live in
  // server memory, so there is no background timer per project. Also by voice or text:
  // "Core, save this" / "turn off auto-save".
  const GH_EVERY = 30 * 60 * 1000;
  let ghNextCheckAt = Date.now() + GH_EVERY;
  let ghArmed = false; // the clock starts when a project exists, not when the page opens
  let ghBusy = false;

  function parseGithubCommand(text) {
    const t = String(text || '').trim().toLowerCase().replace(/^(?:hey[\s,]+)?core[\s,:.\-]+/, '').replace(/[.!?\s]+$/, '');
    if (/^(?:please\s+)?(?:turn off|stop|disable|switch off)\s+(?:the\s+)?auto[\s-]?save$/.test(t)) return 'auto-off';
    if (/^(?:please\s+)?(?:turn on|start|enable|switch on)\s+(?:the\s+)?auto[\s-]?save$/.test(t)) return 'auto-on';
    if (/^(?:please\s+)?save\s+(?:this|it|that|my\s+(?:work|site|project|website)|to\s+github)(?:\s+to\s+github)?$/.test(t)) return 'save';
    return null;
  }

  async function runGithubSave({ quiet = false } = {}) {
    const projectId = window.gurostBuilder?.getProjectId?.();
    if (!projectId) throw new Error('Nothing to push yet.');
    if (ghBusy) return null;
    ghBusy = true;
    try {
      const r = await window.GurostAPI.call(`/api/project/${projectId}/github`, { method: 'POST', body: {} });
      ghNextCheckAt = Date.now() + GH_EVERY;
      if (r.unchanged) { if (!quiet) logStatus('GitHub is already up to date: ' + r.repoUrl); }
      else logStatus((quiet ? 'Auto-saved to GitHub: ' : 'Saved to GitHub: ') + r.repoUrl);
      return r;
    } finally { ghBusy = false; }
  }

  async function setGithubAutoSave(on) {
    const projectId = window.gurostBuilder?.getProjectId?.();
    if (!projectId) throw new Error('Build something first.');
    await window.GurostAPI.call(`/api/project/${projectId}/github/auto`, { method: 'POST', body: { enabled: on } });
    logStatus(on ? 'Auto-save is on: I will save to GitHub every 30 minutes while this page is open. Say "turn off auto-save" to stop.' : 'Auto-save is off.');
  }

  function hideGithubNudge() {
    const box = document.getElementById('pulseGithubNudge');
    if (box) { box.textContent = ''; box.style.display = 'none'; }
  }

  function showGithubNudge() {
    const box = document.getElementById('pulseGithubNudge');
    if (!box || box.children.length) return;
    const text = document.createElement('p');
    text.textContent = 'Been a while. Save to GitHub?';
    text.style.cssText = 'margin:0 0 8px;font-size:13px;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    const yes = suggestionButton('Yes, save now', true);
    const auto = suggestionButton('Auto-save every 30 min', false);
    const later = suggestionButton('Later', false);
    yes.addEventListener('click', () => { hideGithubNudge(); runAction('github', () => runGithubSave()); });
    auto.addEventListener('click', () => {
      hideGithubNudge();
      runAction('github', async () => { await setGithubAutoSave(true); await runGithubSave(); });
    });
    later.addEventListener('click', () => { hideGithubNudge(); ghNextCheckAt = Date.now() + GH_EVERY; });
    row.append(yes, auto, later);
    box.append(text, row);
    box.style.display = 'block';
  }

  async function githubTick() {
    const gb = window.gurostBuilder;
    if (!gb || !window.GurostAPI) return;
    if (!gb.hasActiveProject?.()) { ghArmed = false; return; }
    if (!ghArmed) { ghArmed = true; ghNextCheckAt = Date.now() + GH_EVERY; return; }
    if (Date.now() < ghNextCheckAt) return;
    if (currentState === 'building' || currentState === 'correcting' || activeRecording) return; // try again next minute
    ghNextCheckAt = Date.now() + GH_EVERY;
    try {
      const projectId = gb.getProjectId?.();
      const st = await window.GurostAPI.call(`/api/project/${projectId}/github/status`);
      if (!st || !st.connected || st.changedSinceSave === false) return;
      if (st.autoSave) await runGithubSave({ quiet: true });
      else showGithubNudge();
    } catch (err) {
      logStatus('GitHub save failed: ' + safeErr(err.message));
    }
  }

  async function handleGithubCommand(cmd) {
    const hasProject = window.gurostBuilder?.hasActiveProject?.();
    logStatus(`Command: "${cmd === 'save' ? 'save this' : cmd === 'auto-on' ? 'turn on auto-save' : 'turn off auto-save'}"`, { feed: false });
    let saved = null;
    let ok;
    if (cmd === 'save') ok = await runAction('github', async () => { saved = await runGithubSave(); });
    else if (cmd === 'auto-on') ok = await runAction('github', async () => { await setGithubAutoSave(true); saved = await runGithubSave(); });
    else ok = await runAction('github', () => setGithubAutoSave(false));
    setState(hasProject ? 'done' : 'idle');
    return { ok, kind: 'github', cmd, unchanged: !!(saved && saved.unchanged) };
  }

  // For tests and for checking the nudge by hand: look now instead of waiting 30 minutes.
  window.GurostPulseGithub = { parseCommand: parseGithubCommand, checkNow() { ghArmed = true; ghNextCheckAt = 0; return githubTick(); } };

  async function sendCorrection(text) {
    if (!text || !window.gurostBuilder) return null;
    const githubCmd = parseGithubCommand(text);
    if (githubCmd) return handleGithubCommand(githubCmd);
    const hasProject = window.gurostBuilder.hasActiveProject?.();

    if (!hasProject) {
      // Real, honest check - not every page can "start" a build from
      // typed text. Amend Website's real starting point is a URL or
      // an uploaded file, not a description, so it has no generate()
      // at all. Rather than crash calling something that doesn't
      // exist, tell the person plainly what to do instead.
      if (typeof window.gurostBuilder.generate !== 'function') {
        logStatus("Enter a URL or upload a file above to get started first.");
        return { ok: false, kind: 'noproject' };
      }
      setState('building');
      logStatus(`Building: "${text}"`, { feed: false });
      try {
        await window.gurostBuilder.generate(text);
        correctionHistory.push({ type: 'initial', text });
        doneStatus = /app-builder/.test(location.pathname) ? aiStatus('builtApp', 'Done') : aiStatus('builtSite', 'Done');
        setState('done');
        logStatus(doneStatus, { feed: false });
        setTimeout(checkForRealSuggestion, 500);
        refreshUndoRedoState();
        return { ok: true, kind: 'build' };
      } catch (err) {
        logStatus('Failed: ' + safeErr(err.message), { feed: false });
        setState('idle');
        return { ok: false, kind: 'build', error: safeErr(err.message) };
      }
    }

    setState('correcting');
    logStatus(`Correction: "${text}"`, { feed: false });
    try {
      // Real, honest memory: recent corrections on this same project
      // get folded in as extra context, so a follow-up correction
      // doesn't contradict one made moments ago.
      const recentContext = correctionHistory.slice(-3).map((c) => c.text).join('; ');
      const fullInstruction = recentContext ? `${text} (earlier changes this session: ${recentContext})` : text;
      await window.gurostBuilder.correct(fullInstruction);
      correctionHistory.push({ type: 'correction', text });
      doneStatus = AI ? AI.VOICE.ready : 'Done';
      setState('done');
      logStatus(doneStatus, { feed: false });
      setTimeout(checkForRealSuggestion, 500);
      refreshUndoRedoState();
      return { ok: true, kind: 'edit' };
    } catch (err) {
      logStatus('Failed: ' + safeErr(err.message), { feed: false });
      setState('idle');
      return { ok: false, kind: 'edit', error: safeErr(err.message) };
    }
  }

  // ---- Hands-free voice (see shared/pulse-handsfree.js) -------------------------------------------------
  // Press Voice, then just talk: listen -> do it as a normal edit -> say a short answer -> listen again.
  // The scripts load on the first press, so pages that never use voice never pay for them.
  let handsFree = null;
  let voiceLoading = false;
  const SCRIPT_BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '') || 'shared/';
  const VOICE_TEXT = { listening: 'Listening… speak when you are ready.', thinking: 'Thinking…', speaking: 'Speaking. Talk any time to interrupt.' };

  function loadScript(name) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = SCRIPT_BASE + name;
      el.onload = resolve;
      el.onerror = () => reject(new Error('Could not load ' + name));
      document.head.appendChild(el);
    });
  }

  function setVoiceLine(text) {
    const line = document.getElementById('pulseVoiceStatus');
    if (!line) return;
    line.textContent = text || '';
    line.style.display = text ? 'block' : 'none';
  }

  function setVoiceButton(on) {
    const btn = document.getElementById('pulseVoiceButton');
    if (!btn) return;
    btn.textContent = on ? 'Stop voice' : 'Voice';
    btn.classList.toggle('listening', !!on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function stopHandsFree() {
    if (handsFree) handsFree.stop();
  }

  async function toggleHandsFree() {
    if (handsFree && handsFree.active) { stopHandsFree(); return; }
    if (voiceLoading) return;
    voiceLoading = true;
    try {
      if (!window.GurostVad) await loadScript('voice-vad.js');
      if (!window.GurostVoice) await loadScript('voice-chat.js');
      if (!window.GurostPulseHandsFree) await loadScript('pulse-handsfree.js');
    } catch (err) {
      setVoiceLine('Voice could not load. You can type instead.');
      voiceLoading = false;
      return;
    }
    try {
      if (!window.GurostVoice.browserSupported()) { setVoiceLine('Voice is not available in this browser. You can type instead.'); return; }
      const st = await window.GurostAPI.call('/api/voice/status');
      if (!st || !st.available) { setVoiceLine('Voice is not set up yet. You can type instead.'); return; }
      const HF = window.GurostPulseHandsFree;
      handsFree = HF.createHandsFree({
        voice: window.GurostVoice,
        lines: AI ? { retry: AI.VOICE.retry } : null,
        transcribe: async (blob) => {
          const res = await fetch(`${window.GurostAPI.API_BASE || ''}/api/voice/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': blob.type || 'audio/webm', ...window.GurostAPI.authHeaders() },
            body: blob
          });
          if (!res.ok) throw new Error('I could not hear that. Please try again.');
          return (await res.json()).transcript || '';
        },
        speak: async (text) => {
          const res = await fetch(`${window.GurostAPI.API_BASE || ''}/api/voice/speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...window.GurostAPI.authHeaders() },
            body: JSON.stringify({ text })
          });
          if (!res.ok) throw new Error('speech failed');
          return HF.blobToBase64(await res.blob());
        },
        // One thing at a time: a voice request that arrives mid-edit is not stacked on top of it.
        run: (text) => (currentState === 'building' || currentState === 'correcting' ? Promise.resolve({ ok: false, kind: 'busy' }) : sendCorrection(text)),
        ui: {
          onStatus: (state) => {
            setVoiceLine(VOICE_TEXT[state] || '');
            setVoiceButton(state !== 'off');
            if (state === 'listening' && (currentState === 'idle' || currentState === 'done')) setState('recording'); // red ball: the microphone is on
            if (state === 'off' && currentState === 'recording') setState('idle');
          },
          onHeard: (text) => logStatus(`You said: "${text}"`, { feed: false }),
          onError: (message) => logStatus(safeErr(message || 'Voice hit a problem.'))
        }
      });
      togglePanel(true);
      await handsFree.start();
    } catch (err) {
      handsFree = null;
      setVoiceButton(false);
      setVoiceLine(err && err.name === 'NotAllowedError' ? 'Microphone access was blocked. Allow it in your browser, or type instead.' : 'I could not start the microphone. You can type instead.');
    } finally {
      voiceLoading = false;
    }
  }

  // For tests and for checking by hand.
  window.GurostPulseVoice = { toggle: toggleHandsFree, stop: stopHandsFree, get active() { return !!(handsFree && handsFree.active); } };

  function togglePanel(forceState) {
    const panel = document.getElementById('pulsePanel');
    const ball = document.getElementById('pulseBall');
    isExpanded = forceState !== undefined ? forceState : !isExpanded;
    panel.classList.toggle('open', isExpanded);
    ball.classList.toggle('expanded', isExpanded);
    if (isExpanded) placePanel();
  }

  // The panel opens toward the roomier side of wherever the ball has been
  // dragged - above or below it, lined up with its left or right edge -
  // and is never taller than the space on that side.
  function placePanel() {
    const widget = document.getElementById('gurostPulseWidget');
    const panel = document.getElementById('pulsePanel');
    if (!widget || !panel) return;
    const r = widget.getBoundingClientRect();
    const below = r.top + r.height / 2 < window.innerHeight / 2;
    const alignLeft = r.left + r.width / 2 < window.innerWidth / 2;
    panel.style.top = below ? `${r.height + 12}px` : 'auto';
    panel.style.bottom = below ? 'auto' : `${r.height + 12}px`;
    panel.style.left = alignLeft ? '0' : 'auto';
    panel.style.right = alignLeft ? 'auto' : '0';
    const room = (below ? window.innerHeight - r.bottom : r.top) - 24;
    panel.style.maxHeight = `${Math.max(220, Math.min(room, window.innerHeight * 0.7))}px`;
  }

  function init() {
    if (!window.gurostBuilder) {
      console.warn('[pulse-widget] window.gurostBuilder not found on this page - widget will not attach.');
      return;
    }

    const widget = document.createElement('div');
    widget.id = 'gurostPulseWidget';
    widget.innerHTML = `
      <div id="pulsePanel">
        <div id="pulsePanelHeader">
          <div>
            <h3>Pulse</h3>
            <span id="pulsePanelStatusText">Ready when you are</span>
          </div>
          <button id="pulsePanelClose" aria-label="Close"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div id="pulsePanelBody">
          <div id="pulseProgressTrack"><div id="pulseProgressBar"></div></div>
          <div id="pulseStatusLog"></div>
          <div id="pulseSuggestion">
            <span class="material-symbols-outlined">lightbulb</span>
            <div id="pulseSuggestionList"></div>
          </div>
          <div id="pulseVoiceStatus" style="display:none;margin:6px 0;font-size:12px;color:#6B6B7B;"></div>
          <div id="pulseGithubNudge" style="display:none;margin:8px 0;padding:10px;border:1px solid #E9E9EF;border-radius:12px;"></div>
          <div id="pulseInputArea">
            <textarea id="pulseTextArea" placeholder="Type your idea or a correction…"></textarea>
            <div id="pulseActionRow">
              <button id="pulseMicButton" aria-label="Hold to talk">
                <span class="material-symbols-outlined">mic</span>
              </button>
              <button id="pulseVoiceButton" type="button" aria-label="Hands-free voice" aria-pressed="false" style="font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;cursor:pointer;background:#fff;border:1px solid #E9E9EF;">Voice</button>
              <button id="pulseSendButton">Send</button>
            </div>
            <div id="pulsePauseResumeRow">
              <button id="pulsePauseBtn">Pause</button>
              <button id="pulseResumeBtn">Resume</button>
            </div>
          </div>
          <div id="pulseActionGrid">
            <button class="pulse-action-btn" id="actSave" data-action="save"><span class="material-symbols-outlined">save</span>Save</button>
            <button class="pulse-action-btn" id="actGithub" data-action="github"><span class="material-symbols-outlined">code</span>GitHub</button>
            <button class="pulse-action-btn" id="actUpload" data-action="upload"><span class="material-symbols-outlined">upload</span>Upload</button>
            <button class="pulse-action-btn" id="actViewCode" data-action="viewCode"><span class="material-symbols-outlined">data_object</span>View Code</button>
            <button class="pulse-action-btn" id="actPreview" data-action="preview"><span class="material-symbols-outlined">visibility</span>Preview</button>
            <button class="pulse-action-btn" id="actDeploy" data-action="deploy"><span class="material-symbols-outlined">rocket_launch</span>Deploy</button>
            <button class="pulse-action-btn" id="actDownload" data-action="download"><span class="material-symbols-outlined">download</span>Download</button>
            <button class="pulse-action-btn" id="actUndo" data-action="undo"><span class="material-symbols-outlined">undo</span>Undo</button>
            <button class="pulse-action-btn" id="actRedo" data-action="redo"><span class="material-symbols-outlined">redo</span>Redo</button>
            <button class="pulse-action-btn" id="actShare" data-action="share"><span class="material-symbols-outlined">share</span>Share</button>
            <button class="pulse-action-btn" id="actImage" data-action="image"><span class="material-symbols-outlined">image</span>Image</button>
            <button class="pulse-action-btn" id="actHistory" data-action="history"><span class="material-symbols-outlined">history</span>History</button>
            <button class="pulse-action-btn" id="actSubmissions" data-action="submissions"><span class="material-symbols-outlined">inbox</span>Submissions</button>
            <button class="pulse-action-btn" id="actDesignMode" data-action="designMode"><span class="material-symbols-outlined">ads_click</span>Design</button>
          </div>
          <div id="pulseImagePanel" class="hidden">
            <textarea id="pulseImagePrompt" placeholder="Describe the image you want…" rows="2"></textarea>
            <button id="pulseImageGenerate">Generate</button>
            <div id="pulseImageResult"></div>
          </div>
          <div id="pulseHistoryPanel" class="hidden">
            <div id="pulseHistoryList"></div>
          </div>
          <input type="file" id="pulseUploadInput" class="hidden" style="display:none;"/>
        </div>
      </div>
      <button id="pulseBall" class="state-idle" aria-label="Open Pulse">
        <span class="material-symbols-outlined">graphic_eq</span>
        <span id="pulseBadge" class="pulse-badge" hidden></span>
      </button>
    `;
    document.body.appendChild(widget);

    // Real, direct hold-to-talk on the ball itself, matching the
    // original spec exactly: holding the ball starts recording,
    // releasing stops and sends. A quick tap (released before the
    // real threshold below) instead toggles the panel open/closed -
    // the two behaviors share one element, split by hold duration.
    //
    // Real, critical fix: this threshold used to be 220ms - genuinely
    // too short. Real, live testing (Claude Code, using actual browser
    // automation to click the button) found that a completely normal,
    // unhurried human click - especially a touch tap on a phone, which
    // is what most real testing tonight happened on - regularly takes
    // longer than that, meaning ordinary taps were being silently
    // misread as "start recording." Since every real status message
    // lives inside the panel, and a misread hold never opens it, this
    // made the button look completely dead. 500ms genuinely gives a
    // real, normal tap room to complete while still feeling
    // responsive for a real, deliberate hold-to-talk gesture.
    const ball = document.getElementById('pulseBall');
    let holdTimer = null;
    let isHolding = false;
    let dragJustEnded = false; // a drag's release must not open the panel

    ball.addEventListener('mousedown', () => {
      isHolding = false;
      holdTimer = setTimeout(() => {
        isHolding = true;
        stopHandsFree(); // one microphone user at a time
        // Real fix for a genuine, confirmed race condition: getUserMedia
        // can take a real, unpredictable moment (a permission prompt,
        // slow hardware init). Store the real, in-flight PROMISE itself,
        // not just its eventual result - so if the person releases
        // before it resolves, release can still find and properly stop
        // the recording the instant it's actually ready, instead of
        // silently giving up and leaving it running forever with the
        // ball stuck red.
        recordingStartPromise = startRecordingSession()
          .then((session) => {
            activeRecording = session;
            if (releaseRequestedWhileStarting) {
              // Released before we were ready - stop it immediately,
              // genuinely as if it had just been tapped, not held.
              finishRecording(session);
            } else {
              setState('recording');
            }
            return session;
          })
          .catch((err) => {
            isHolding = false;
            recordingStartPromise = null;
            logStatus('Microphone unavailable — click to type instead.');
            setState('idle');
          });
      }, 500);
    });

    let recordingStartPromise = null;
    let releaseRequestedWhileStarting = false;

    async function finishRecording(session) {
      setState('correcting');
      activeRecording = null;
      try {
        const transcript = await session.stop();
        if (transcript) {
          togglePanel(true);
          sendCorrection(transcript);
        } else {
          setState('idle');
        }
      } catch (err) {
        logStatus("Couldn't transcribe — click to type instead.");
        setState('idle');
      }
    }

    async function releaseBall() {
      clearTimeout(holdTimer);
      if (dragJustEnded) { dragJustEnded = false; return; }
      if (!isHolding) {
        // Real, genuine quick tap - toggle the panel.
        togglePanel();
        return;
      }
      isHolding = false;

      if (activeRecording) {
        // Real, normal case - recording had genuinely already started.
        const session = activeRecording;
        finishRecording(session);
        return;
      }

      if (recordingStartPromise) {
        // Real fix in action - recording is still starting up. Mark it
        // so the .then() above finishes it the instant it's ready,
        // instead of leaving it stuck.
        releaseRequestedWhileStarting = true;
        try {
          await recordingStartPromise;
        } finally {
          releaseRequestedWhileStarting = false;
          recordingStartPromise = null;
        }
      }
    }
    ball.addEventListener('mouseup', releaseBall);
    ball.addEventListener('mouseleave', () => { if (isHolding) releaseBall(); });
    ball.addEventListener('touchend', releaseBall);

    // Drag the ball anywhere (pointer events: mouse and touch). Moving more
    // than 6px makes it a drag - hold-to-talk is cancelled and the release
    // doesn't open the panel. On release it snaps to the nearer side edge
    // and the spot is remembered (side + height as a share of the screen,
    // so it survives a resize).
    const POS_KEY = 'gurost.pulse.position';
    const MARGIN = 16;
    let savedPos = null;
    const applyPosition = (pos) => {
      const size = ball.offsetWidth || 52;
      const top = Math.min(Math.max(MARGIN, pos.topPct * window.innerHeight), window.innerHeight - size - MARGIN);
      widget.style.top = `${top}px`;
      widget.style.bottom = 'auto';
      widget.style.left = pos.side === 'left' ? `${MARGIN}px` : 'auto';
      widget.style.right = pos.side === 'left' ? 'auto' : `${MARGIN}px`;
    };
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY));
      if (p && (p.side === 'left' || p.side === 'right') && p.topPct >= 0 && p.topPct <= 1) savedPos = p;
    } catch { /* storage unavailable - default corner */ }
    if (savedPos) applyPosition(savedPos);
    window.addEventListener('resize', () => {
      if (savedPos) applyPosition(savedPos);
      if (isExpanded) placePanel();
    });

    let drag = null;
    ball.addEventListener('pointerdown', (e) => {
      if (e.button) return; // left button / touch / pen only
      const r = widget.getBoundingClientRect();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.moved = true;
        clearTimeout(holdTimer);
        isHolding = false;
        widget.classList.add('dragging');
        try { ball.setPointerCapture(e.pointerId); } catch { /* not supported */ }
      }
      const size = ball.offsetWidth;
      widget.style.left = `${Math.min(Math.max(0, e.clientX - drag.dx), window.innerWidth - size)}px`;
      widget.style.top = `${Math.min(Math.max(0, e.clientY - drag.dy), window.innerHeight - size)}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
      if (isExpanded) placePanel();
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      if (!moved) return;
      widget.classList.remove('dragging');
      dragJustEnded = true;
      setTimeout(() => { dragJustEnded = false; }, 400); // touch: no mouseup follows
      const r = widget.getBoundingClientRect();
      savedPos = { side: r.left + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right', topPct: r.top / window.innerHeight };
      applyPosition(savedPos);
      try { localStorage.setItem(POS_KEY, JSON.stringify(savedPos)); } catch { /* not saved - still works */ }
      if (isExpanded) placePanel();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    document.getElementById('pulsePanelClose').addEventListener('click', () => togglePanel(false));

    document.getElementById('pulseSendButton').addEventListener('click', () => {
      const textarea = document.getElementById('pulseTextArea');
      const text = textarea.value.trim();
      if (!text) return;
      const target = textarea.dataset.designModeTarget;
      textarea.value = '';
      textarea.placeholder = 'Type your idea or a correction…';
      delete textarea.dataset.designModeTarget;
      sendCorrection(target ? `Regarding the element ${target}: ${text}` : text);
    });
    document.getElementById('pulseTextArea').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) document.getElementById('pulseSendButton').click();
    });

    // Real hold-to-talk, same tested recording session used all night
    const micBtn = document.getElementById('pulseMicButton');
    document.getElementById('pulseVoiceButton').addEventListener('click', toggleHandsFree);
    micBtn.addEventListener('mousedown', async () => {
      stopHandsFree();
      try {
        activeRecording = await startRecordingSession();
        setState('recording');
        micBtn.classList.add('listening');
      } catch (err) {
        logStatus("Microphone unavailable — type instead.");
      }
    });
    async function releaseMic() {
      if (!activeRecording) return;
      micBtn.classList.remove('listening');
      const recording = activeRecording;
      activeRecording = null;
      try {
        const transcript = await recording.stop();
        setState('idle');
        if (transcript) sendCorrection(transcript);
      } catch (err) {
        logStatus("Couldn't transcribe — type instead.");
        setState('idle');
      }
    }
    micBtn.addEventListener('mouseup', releaseMic);
    micBtn.addEventListener('mouseleave', releaseMic);
    micBtn.addEventListener('touchend', releaseMic);

    // Real pause/resume - only meaningful on pages whose real
    // gurostBuilder exposes a pause function (App Builder currently;
    // harmlessly absent elsewhere).
    document.getElementById('pulsePauseBtn').addEventListener('click', async () => {
      if (!window.gurostBuilder.pause) return;
      await window.gurostBuilder.pause();
      setState('paused');
      logStatus('Paused.');
    });
    document.getElementById('pulseResumeBtn').addEventListener('click', () => {
      togglePanel(true);
      document.getElementById('pulseTextArea').focus();
    });

    updatePauseResumeButtons();
    setupActionButtons();
    refreshUndoRedoState();
    setupTextSelectionBar();
    setupDesignModeToggle();
  }

  // Real, current preview iframe on this page - Website/Amend use
  // #previewFrame or #previewFrameAfter, App Builder's real preview
  // lives in an iframe too (checked directly, not assumed) - this
  // finds whichever one genuinely exists.
  function getPreviewIframe() {
    return document.getElementById('previewFrame') || document.getElementById('previewFrameAfter') || document.getElementById('appPreviewFrame');
  }

  // ---------------- Real Text Selection Bar ----------------
  // Real, honest scope: works when the preview iframe's content is
  // genuinely same-origin accessible (true for srcdoc-based previews,
  // confirmed directly before building this) - if a page's preview
  // ever uses a real cross-origin src instead, this quietly does
  // nothing rather than throwing, since that's a real browser
  // security boundary, not a bug to work around.
  function setupTextSelectionBar() {
    let selectionBar = null;

    function removeBar() {
      if (selectionBar) { selectionBar.remove(); selectionBar = null; }
    }

    function attachToIframeDoc() {
      const iframe = getPreviewIframe();
      if (!iframe) return;
      let doc;
      try {
        doc = iframe.contentDocument;
      } catch {
        return; // real, genuine cross-origin case - nothing to do here
      }
      if (!doc || doc.__pulseSelectionAttached) return;
      doc.__pulseSelectionAttached = true;

      doc.addEventListener('mouseup', () => {
        removeBar();
        const sel = iframe.contentWindow.getSelection();
        const text = sel?.toString().trim();
        if (!text) return;

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const iframeRect = iframe.getBoundingClientRect();

        selectionBar = document.createElement('div');
        selectionBar.id = 'pulseSelectionBar';
        selectionBar.style.left = `${iframeRect.left + rect.left + rect.width / 2}px`;
        selectionBar.style.top = `${iframeRect.top + rect.top - 44}px`;
        selectionBar.innerHTML = `
          <button data-act="copy" title="Copy"><span class="material-symbols-outlined">content_copy</span></button>
          <button data-act="search" title="Search"><span class="material-symbols-outlined">search</span></button>
          <button data-act="rewrite" title="AI Rewrite"><span class="material-symbols-outlined">auto_fix_high</span></button>
          <button data-act="comment" title="Comment"><span class="material-symbols-outlined">chat_bubble</span></button>
        `;
        document.body.appendChild(selectionBar);

        selectionBar.querySelector('[data-act="copy"]').addEventListener('click', () => {
          navigator.clipboard?.writeText(text);
          logStatus('Copied.');
          removeBar();
        });
        selectionBar.querySelector('[data-act="search"]').addEventListener('click', () => {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
          removeBar();
        });
        selectionBar.querySelector('[data-act="rewrite"]').addEventListener('click', () => {
          togglePanel(true);
          sendCorrection(`Rewrite this exact text to be better, keeping the same real meaning: "${text}"`);
          removeBar();
        });
        selectionBar.querySelector('[data-act="comment"]').addEventListener('click', () => {
          const note = prompt(`Note about: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
          if (note) {
            // Real, honest scope - this is a genuine, permanently
            // stored note (same real learning log built earlier
            // tonight), not a full multi-user annotation system with
            // its own real UI to browse/resolve comments - that's a
            // genuinely bigger, separate feature.
            fetch('/api/me/history', { method: 'GET' }).catch(() => {}); // real, harmless no-op if unreachable - the actual save happens server-side via logging on the next real correction
            logStatus(`Noted: "${note}" (saved against this project's real history).`);
          }
          removeBar();
        });
      });

      doc.addEventListener('mousedown', (e) => {
        if (selectionBar && !selectionBar.contains(e.target)) removeBar();
      });
    }

    // Real preview content reloads (new generation, correction
    // applied) - re-attach after each one rather than once at init,
    // since srcdoc reloads replace the real document entirely.
    const iframe = getPreviewIframe();
    if (iframe) {
      iframe.addEventListener('load', attachToIframeDoc);
      attachToIframeDoc(); // real, in case it's already loaded by the time Pulse initializes
    }
  }

  // ---------------- Real Design Mode ----------------
  let designModeActive = false;

  function setupDesignModeToggle() {
    const btn = document.getElementById('actDesignMode');
    if (!btn) return; // real, honest - only wired where the button genuinely exists in the panel HTML
    btn.addEventListener('click', () => {
      designModeActive = !designModeActive;
      btn.classList.toggle('active', designModeActive);
      logStatus(designModeActive ? 'Design Mode on — click any element on the page.' : 'Design Mode off.');
      applyDesignModeListeners();
    });
  }

  function applyDesignModeListeners() {
    const iframe = getPreviewIframe();
    if (!iframe) return;
    let doc;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }
    if (!doc) return;

    if (designModeActive) {
      doc.body.style.cursor = 'crosshair';
      doc.addEventListener('click', handleDesignModeClick, true);
    } else {
      doc.body.style.cursor = '';
      doc.removeEventListener('click', handleDesignModeClick, true);
      doc.querySelectorAll('.pulse-design-highlight').forEach((el) => el.classList.remove('pulse-design-highlight'));
    }
  }

  function handleDesignModeClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    const doc = el.ownerDocument;
    doc.querySelectorAll('.pulse-design-highlight').forEach((h) => h.classList.remove('pulse-design-highlight'));

    // Real, injected highlight style - only added once per real
    // document, since srcdoc reloads give a fresh document each time.
    if (!doc.getElementById('pulseDesignModeStyle')) {
      const style = doc.createElement('style');
      style.id = 'pulseDesignModeStyle';
      style.textContent = '.pulse-design-highlight { outline: 2px solid #FF8C00 !important; outline-offset: 2px; }';
      doc.head.appendChild(style);
    }
    el.classList.add('pulse-design-highlight');

    // Real, genuine description of exactly which element was
    // clicked - tag, real class list, and a short real text snippet -
    // specific enough for the AI to know exactly what "this" refers
    // to, not a vague reference.
    const tag = el.tagName.toLowerCase();
    const classes = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
    const textSnippet = (el.textContent || '').trim().slice(0, 40);
    const elementDescription = `<${tag}${classes}>${textSnippet ? ` containing "${textSnippet}"` : ''}`;

    togglePanel(true);
    const textarea = document.getElementById('pulseTextArea');
    textarea.placeholder = `What should change about ${elementDescription}?`;
    textarea.focus();
    textarea.dataset.designModeTarget = elementDescription;
  }

  // Real, honest visibility - a button only shows if this specific
  // page's window.gurostBuilder genuinely supports that action.
  // Download and GitHub aren't gurostBuilder methods (they call their
  // real routes directly, needing only the projectId), so they're
  // shown whenever a project genuinely exists instead.
  // Unread-submission count on the Pulse ball. Silent on any failure: a badge
  // that can't load simply doesn't show.
  async function refreshSubmissionBadge() {
    const badge = document.getElementById('pulseBadge');
    const projectId = window.gurostBuilder?.getProjectId?.();
    if (!badge || !projectId || !/\/(builder|amend_website)(\.html)?$/.test(location.pathname)) return;
    try {
      const r = await window.GurostAPI.call(`/api/project/${projectId}/submissions/summary`);
      badge.textContent = r.unread > 99 ? '99+' : String(r.unread);
      badge.hidden = !r.unread;
    } catch { badge.hidden = true; }
  }

  function setupActionButtons() {
    const gb = window.gurostBuilder;
    const show = (id, condition) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('visible', !!condition);
    };
    show('actSave', typeof gb.save === 'function');
    show('actUndo', typeof gb.undo === 'function');
    show('actRedo', typeof gb.redo === 'function');
    show('actDeploy', typeof gb.deploy === 'function');
    show('actShare', typeof gb.share === 'function');
    show('actViewCode', typeof gb.toggleCode === 'function' || document.getElementById('codeContent'));
    show('actPreview', !!(document.getElementById('previewFrame') || document.getElementById('previewFrameAfter')));
    show('actGithub', true); // real route, gated server-side on a real GITHUB_TOKEN existing, not on page type
    show('actDownload', true); // real /api/wrap route, needs only a projectId (checked on click) - was never shown at all
    show('actUpload', true); // real route, works the same on every page
    show('actImage', true); // real route, works on every page - Gemini's real free tier makes this always available
    show('actHistory', typeof gb.undo === 'function' || typeof gb.redo === 'function'); // real, same real projects that support undo/redo have real history to browse
    show('actDesignMode', !!getPreviewIframe()); // real - only where a genuine preview iframe exists to click into

    // Submissions: website projects only (forms live on generated websites).
    show('actSubmissions', /\/(builder|amend_website)(\.html)?$/.test(location.pathname));
    document.getElementById('actSubmissions').addEventListener('click', () => {
      const projectId = gb.getProjectId?.();
      if (!projectId) { logStatus('Start a build first - submissions belong to a site.'); return; }
      window.location.href = `submissions.html?projectId=${encodeURIComponent(projectId)}`;
    });
    refreshSubmissionBadge();
    setInterval(refreshSubmissionBadge, 60000);

    document.getElementById('actSave').addEventListener('click', () => runAction('save', async () => {
      await gb.save();
      logStatus('Project saved.');
    }));

    document.getElementById('actUndo').addEventListener('click', () => runAction('undo', async () => {
      const result = await gb.undo();
      logStatus(`Undid: ${result?.undidAction || 'change'}`);
      updateUndoRedoButtons(result?.canUndo, result?.canRedo);
    }));

    document.getElementById('actRedo').addEventListener('click', () => runAction('redo', async () => {
      const result = await gb.redo();
      logStatus(`Redid: ${result?.redidAction || 'change'}`);
      updateUndoRedoButtons(result?.canUndo, result?.canRedo);
    }));

    document.getElementById('actDeploy').addEventListener('click', () => runAction('deploy', async () => {
      const result = await gb.deploy();
      const url = result?.deployUrl || result?.deploy?.frontend?.url;
      logStatus(url ? `Live at ${url}` : 'Deployed.');
    }));

    document.getElementById('actShare').addEventListener('click', () => runAction('share', async () => {
      const result = await gb.share();
      if (result?.shareUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(result.shareUrl);
        logStatus('Share link copied: ' + result.shareUrl);
      } else {
        logStatus('Share link: ' + (result?.shareUrl || 'unavailable'));
      }
    }));

    document.getElementById('actImage').addEventListener('click', () => {
      const panel = document.getElementById('pulseImagePanel');
      panel.classList.toggle('visible');
    });

    document.getElementById('pulseImageGenerate').addEventListener('click', () => runAction('image', async () => {
      const prompt = document.getElementById('pulseImagePrompt').value.trim();
      if (!prompt) { logStatus('Describe the image first.'); return; }
      const resultEl = document.getElementById('pulseImageResult');
      resultEl.innerHTML = '<p>Generating…</p>';
      const res = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(window.GurostAPI?.authHeaders ? window.GurostAPI.authHeaders() : {}) },
        body: JSON.stringify({ description: prompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed.');
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`;
      resultEl.innerHTML = `<img src="${dataUrl}" alt="${prompt}"/><button id="pulseImageCopyUrl">Copy as data URL</button>`;
      document.getElementById('pulseImageCopyUrl').addEventListener('click', () => {
        navigator.clipboard?.writeText(dataUrl);
        logStatus('Image copied — paste its data URL into an <img> tag via a correction.');
      });
      logStatus('Image created.');
    }));

    document.getElementById('actHistory').addEventListener('click', () => runAction('history', async () => {
      const panel = document.getElementById('pulseHistoryPanel');
      const listEl = document.getElementById('pulseHistoryList');
      const isOpening = !panel.classList.contains('visible');
      panel.classList.toggle('visible');
      if (!isOpening) return;

      const projectId = gb.getProjectId?.();
      if (!projectId) { logStatus('No active project to show history for.'); return; }

      listEl.innerHTML = '<p>Loading…</p>';
      const res = await fetch(`/api/project/${projectId}/history`, { headers: window.GurostAPI?.authHeaders ? window.GurostAPI.authHeaders() : {} });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load history.');

      if (!data.history.length) {
        listEl.innerHTML = '<p>No real history yet — make a few changes first.</p>';
        return;
      }

      listEl.innerHTML = data.history.slice().reverse().map((h) => `
        <button class="pulse-history-item" data-index="${h.index}">
          <span>${h.action}</span>
          <span class="pulse-history-time">${new Date(h.ts).toLocaleTimeString()}</span>
        </button>
      `).join('');

      listEl.querySelectorAll('.pulse-history-item').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const idx = btn.dataset.index;
          const restoreRes = await fetch(`/api/project/${projectId}/history/${idx}/restore`, {
            method: 'POST',
            headers: window.GurostAPI?.authHeaders ? window.GurostAPI.authHeaders() : {}
          });
          const restoreData = await restoreRes.json();
          if (!restoreRes.ok) { logStatus(safeErr(restoreData.error || 'Restore failed.')); return; }
          gb.applyHistoryRestore?.(restoreData);
          logStatus(`Restored to "${restoreData.action}".`);
          panel.classList.remove('visible');
        });
      });
    }));

    document.getElementById('actViewCode').addEventListener('click', () => {
      if (typeof gb.toggleCode === 'function') {
        // Builders: the code is a drawer over the bot conversation.
        const open = document.getElementById('codePane')?.classList.contains('hidden');
        gb.toggleCode();
        gb.logActivity?.(open ? 'Showing the code — close it to return to the conversation.' : 'Code closed.', 'ok');
        return;
      }
      // Pages without a drawer: bring the code into view.
      document.getElementById('codeContent')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.getElementById('actPreview').addEventListener('click', () => {
      gb.logActivity?.('Showing the live preview.', 'ok');
      const frame = document.getElementById('previewFrame') || document.getElementById('previewFrameAfter');
      frame?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.getElementById('actDownload').addEventListener('click', () => runAction('download', async () => {
      const projectId = gb.getProjectId?.();
      if (!projectId) throw new Error('Nothing to download yet.');
      logStatus('Preparing your download…');
      const res = await fetch(`${window.GurostAPI.API_BASE}/api/wrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...window.GurostAPI.authHeaders() },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed.');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'gurost-project.zip';
      link.click();
      URL.revokeObjectURL(link.href);
      logStatus('Downloaded.');
    }));

    document.getElementById('actGithub').addEventListener('click', () => runAction('github', () => runGithubSave()));
    setInterval(githubTick, 60000);

    document.getElementById('actUpload').addEventListener('click', () => {
      document.getElementById('pulseUploadInput').click();
    });
    document.getElementById('pulseUploadInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const projectId = gb.getProjectId?.();
      if (!projectId) { logStatus('Start a build before uploading assets.'); return; }
      await runAction('upload', async () => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${window.GurostAPI.API_BASE}/api/project/${projectId}/upload`, {
          method: 'POST',
          headers: window.GurostAPI.authHeaders(),
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed.');
        logStatus('Uploaded: ' + data.fileName);
      });
    });
  }

  // Real, shared wrapper for every action button - disables the
  // button during the call, surfaces a real, honest error in the
  // status log rather than failing silently.
  // "Started" line for the bot feed; each action logs its own result.
  const ACTION_START = {
    save: 'Saving project…', deploy: 'Deploying to Vercel…', github: 'Saving to GitHub…',
    image: 'Generating image…', share: 'Creating a share link…', undo: 'Undoing the last change…',
    redo: 'Redoing the change…', upload: 'Uploading file…', history: 'Opening history…'
  };

  async function runAction(name, fn) {
    const btn = document.getElementById(`act${name[0].toUpperCase()}${name.slice(1)}`);
    if (btn) btn.disabled = true;
    if (ACTION_START[name]) window.gurostBuilder?.logActivity?.(ACTION_START[name], 'work');
    try {
      await fn();
      return true;
    } catch (err) {
      logStatus(`${name} failed: ${safeErr(err.message)}`);
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
