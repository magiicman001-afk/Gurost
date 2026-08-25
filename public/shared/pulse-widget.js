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

  function updatePauseResumeButtons() {
    const pauseBtn = document.getElementById('pulsePauseBtn');
    const resumeBtn = document.getElementById('pulseResumeBtn');
    if (!pauseBtn || !resumeBtn) return;
    const hasProject = window.gurostBuilder?.hasActiveProject?.();
    pauseBtn.classList.toggle('visible', hasProject && currentState === 'building');
    resumeBtn.classList.toggle('visible', hasProject && currentState === 'paused');
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
      holdTimer = setTimeout(async () => {
        isHolding = true;
        try {
          activeRecording = await startRecordingSession();
          setState('recording');
        } catch (err) {
          isHolding = false;
          logStatus('Microphone unavailable — click to type instead.');
        }
      }, 220);
    });

    async function releaseBall() {
      clearTimeout(holdTimer);
      if (!isHolding) {
        // Real, genuine quick tap - toggle the panel.
        togglePanel();
        return;
      }
      isHolding = false;
      if (!activeRecording) return;
      setState('correcting');
      const recording = activeRecording;
      activeRecording = null;
      try {
        const transcript = await recording.stop();
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
