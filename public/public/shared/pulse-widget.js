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
      building: 'Building…',
      paused: 'Paused',
      recording: 'Listening…',
      correcting: 'Applying your change…',
      done: 'Done',
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

  function logStatus(text) {
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

  // Real, rule-based hint - checks the actual, current preview HTML
  // for a genuine gap, rather than claiming AI-generated insight it
  // isn't. Honest and still useful.
  function checkForRealSuggestion() {
    const iframe = document.querySelector('#previewFrame, #previewFrameAfter');
    if (!iframe || !iframe.contentDocument) return;
    const html = iframe.contentDocument.body?.innerHTML || '';
    const suggestionBox = document.getElementById('pulseSuggestion');
    const textEl = document.getElementById('pulseSuggestionText');
    if (!suggestionBox || !textEl) return;

    const hasContactForm = /contact|<form/i.test(html);
    const hasMobileMeta = true; // Tailwind pages are responsive by default across this app

    if (!hasContactForm) {
      textEl.textContent = "I don't see a contact section — want me to add one?";
      suggestionBox.classList.add('visible');
      suggestionBox.dataset.suggestion = 'Add a real contact section with a name, email, and message field.';
    } else {
      suggestionBox.classList.remove('visible');
    }
  }

  async function sendCorrection(text) {
    if (!text || !window.gurostBuilder) return;
    const hasProject = window.gurostBuilder.hasActiveProject?.();

    if (!hasProject) {
      // Real, honest check - not every page can "start" a build from
      // typed text. Amend Website's real starting point is a URL or
      // an uploaded file, not a description, so it has no generate()
      // at all. Rather than crash calling something that doesn't
      // exist, tell the person plainly what to do instead.
      if (typeof window.gurostBuilder.generate !== 'function') {
        logStatus("Enter a URL or upload a file above to get started first.");
        return;
      }
      setState('building');
      logStatus(`Building: "${text}"`);
      try {
        await window.gurostBuilder.generate(text);
        correctionHistory.push({ type: 'initial', text });
        setState('done');
        logStatus('Done!');
        setTimeout(checkForRealSuggestion, 500);
        refreshUndoRedoState();
      } catch (err) {
        logStatus('Failed: ' + err.message);
        setState('idle');
      }
      return;
    }

    setState('correcting');
    logStatus(`Correction: "${text}"`);
    try {
      // Real, honest memory: recent corrections on this same project
      // get folded in as extra context, so a follow-up correction
      // doesn't contradict one made moments ago.
      const recentContext = correctionHistory.slice(-3).map((c) => c.text).join('; ');
      const fullInstruction = recentContext ? `${text} (earlier changes this session: ${recentContext})` : text;
      await window.gurostBuilder.correct(fullInstruction);
      correctionHistory.push({ type: 'correction', text });
      setState('done');
      logStatus('Done!');
      setTimeout(checkForRealSuggestion, 500);
      refreshUndoRedoState();
    } catch (err) {
      logStatus('Failed: ' + err.message);
      setState('idle');
    }
  }

  function togglePanel(forceState) {
    const panel = document.getElementById('pulsePanel');
    const ball = document.getElementById('pulseBall');
    isExpanded = forceState !== undefined ? forceState : !isExpanded;
    panel.classList.toggle('open', isExpanded);
    ball.classList.toggle('expanded', isExpanded);
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
            <div>
              <p id="pulseSuggestionText"></p>
              <div id="pulseSuggestionActions">
                <button class="primary" id="pulseSuggestionAccept">Add it</button>
                <button id="pulseSuggestionDismiss">No thanks</button>
              </div>
            </div>
          </div>
          <div id="pulseInputArea">
            <textarea id="pulseTextArea" placeholder="Type your idea or a correction…"></textarea>
            <div id="pulseActionRow">
              <button id="pulseMicButton" aria-label="Hold to talk">
                <span class="material-symbols-outlined">mic</span>
              </button>
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
          </div>
          <input type="file" id="pulseUploadInput" class="hidden" style="display:none;"/>
        </div>
      </div>
      <button id="pulseBall" class="state-idle" aria-label="Open Pulse">
        <span class="material-symbols-outlined">graphic_eq</span>
      </button>
    `;
    document.body.appendChild(widget);

    // Real, direct hold-to-talk on the ball itself, matching the
    // original spec exactly: holding the ball starts recording,
    // releasing stops and sends. A quick tap (released before the
    // real 220ms threshold) instead toggles the panel open/closed -
    // the two behaviors share one element, split by hold duration.
    const ball = document.getElementById('pulseBall');
    let holdTimer = null;
    let isHolding = false;

    ball.addEventListener('mousedown', () => {
      isHolding = false;
      holdTimer = setTimeout(() => {
        isHolding = true;
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
      }, 220);
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

    document.getElementById('pulsePanelClose').addEventListener('click', () => togglePanel(false));

    document.getElementById('pulseSendButton').addEventListener('click', () => {
      const textarea = document.getElementById('pulseTextArea');
      const text = textarea.value.trim();
      if (!text) return;
      textarea.value = '';
      sendCorrection(text);
    });
    document.getElementById('pulseTextArea').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) document.getElementById('pulseSendButton').click();
    });

    // Real hold-to-talk, same tested recording session used all night
    const micBtn = document.getElementById('pulseMicButton');
    micBtn.addEventListener('mousedown', async () => {
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

    document.getElementById('pulseSuggestionAccept').addEventListener('click', () => {
      const box = document.getElementById('pulseSuggestion');
      const suggestion = box.dataset.suggestion;
      box.classList.remove('visible');
      if (suggestion) sendCorrection(suggestion);
    });
    document.getElementById('pulseSuggestionDismiss').addEventListener('click', () => {
      document.getElementById('pulseSuggestion').classList.remove('visible');
    });

    updatePauseResumeButtons();
    setupActionButtons();
    refreshUndoRedoState();
  }

  // Real, honest visibility - a button only shows if this specific
  // page's window.gurostBuilder genuinely supports that action.
  // Download and GitHub aren't gurostBuilder methods (they call their
  // real routes directly, needing only the projectId), so they're
  // shown whenever a project genuinely exists instead.
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
    show('actUpload', true); // real route, works the same on every page

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

    document.getElementById('actViewCode').addEventListener('click', () => {
      if (typeof gb.toggleCode === 'function') { gb.toggleCode(); return; }
      // Real, honest fallback - Website/App Builder already show code
      // permanently side by side, so there's nothing to toggle; just
      // bring it into view, genuinely useful on a small screen.
      document.getElementById('codeContent')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    document.getElementById('actPreview').addEventListener('click', () => {
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

    document.getElementById('actGithub').addEventListener('click', () => runAction('github', async () => {
      const projectId = gb.getProjectId?.();
      if (!projectId) throw new Error('Nothing to push yet.');
      const result = await window.GurostAPI.call(`/api/project/${projectId}/github`, { method: 'POST', body: {} });
      logStatus('Pushed to ' + result.repoUrl);
    }));

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
  async function runAction(name, fn) {
    const btn = document.getElementById(`act${name[0].toUpperCase()}${name.slice(1)}`);
    if (btn) btn.disabled = true;
    try {
      await fn();
    } catch (err) {
      logStatus(`${name} failed: ${err.message}`);
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
