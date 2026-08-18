/**
 * Gurost Floating Widget — real frontend logic.
 *
 * Self-injecting: including this one script tag on a page is enough —
 * it builds its own DOM and appends it to document.body. This is the
 * deliberate choice for "appears on every page" on a static multi-page
 * site with no shared templating system: rather than hand-copy the
 * same markup into 5 different HTML files (a real risk of the 5
 * copies drifting out of sync), every page gets the identical widget
 * from one shared file.
 *
 * "Persistent across page navigation" — honestly scoped: this is a
 * static multi-page site, not a single-page app, so the widget's DOM
 * and JS genuinely do get torn down and rebuilt on every real page
 * load (there's no client-side router keeping anything alive across
 * navigation). What IS real: open/closed state and recent conversation
 * are saved to localStorage, so the widget visually resumes where you
 * left it after navigating — the practical experience of persistence,
 * achieved honestly rather than claiming something a static site
 * architecture can't actually do.
 *
 * Requires shared/api-client.js and shared/pulse-voice.js loaded
 * first (for auth headers and real microphone capture — this file
 * does not reimplement either).
 */

(function () {
  const STORAGE_KEY = 'gurost_widget_state';
  const MAX_STORED_MESSAGES = 20;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { open: false, messages: [] };
    } catch {
      return { open: false, messages: [] };
    }
  }
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        open: state.open,
        messages: state.messages.slice(-MAX_STORED_MESSAGES)
      }));
    } catch {
      // localStorage can genuinely fail (private browsing, quota) —
      // the widget still works within this page load, it just won't
      // remember across navigation. Not fatal.
    }
  }

  const ICONS = {
    bot: '<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="2"/><circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none"/><path d="M12 8V4M8 4h8"/></svg>',
    minimize: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z" fill="currentColor" stroke="none"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>'
  };

  function buildDOM() {
    const root = document.createElement('div');
    root.className = 'gw-root';
    root.innerHTML = `
      <button class="gw-circle" id="gwCircle" aria-label="Open Gurost assistant">${ICONS.bot}</button>
      <div class="gw-panel" id="gwPanel">
        <div class="gw-header">
          <span>Gurost Assistant</span>
          <button class="gw-minimize-btn" id="gwMinimize" aria-label="Minimize">${ICONS.minimize}</button>
        </div>
        <div class="gw-status-row">
          <span class="gw-status-dot" id="gwStatusDot"></span>
          <span id="gwStatusLabel">Idle</span>
        </div>
        <div class="gw-body" id="gwBody">
          <div class="gw-empty-state" id="gwEmptyState">Hold the mic or type a command to get started.</div>
        </div>
        <div class="gw-input-row">
          <button class="gw-mic-btn" id="gwMicBtn" aria-label="Hold to speak">${ICONS.mic}</button>
          <input class="gw-text-input" id="gwTextInput" type="text" placeholder="Type a command..." />
          <button class="gw-send-btn" id="gwSendBtn" aria-label="Send">${ICONS.send}</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function setStatus(dotEl, labelEl, status) {
    const stateClass = { idle: '', listening: ' gw-listening', processing: ' gw-processing', done: ' gw-done' }[status] || '';
    dotEl.className = 'gw-status-dot' + stateClass;
    const labels = { idle: 'Idle', listening: 'Listening…', processing: 'Thinking…', done: 'Done' };
    labelEl.textContent = labels[status] || 'Idle';
  }

  function appendMessage(bodyEl, emptyStateEl, role, content, extra) {
    emptyStateEl.style.display = 'none';
    const el = document.createElement('div');
    el.className = `gw-message gw-message-${role}` + (extra?.notConnected ? ' gw-not-connected' : '');
    el.textContent = content;
    bodyEl.appendChild(el);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return el;
  }

  function appendThinking(bodyEl) {
    const el = document.createElement('div');
    el.className = 'gw-thinking';
    el.innerHTML = '<span></span><span></span><span></span>';
    bodyEl.appendChild(el);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return el;
  }

  /**
   * Real diagram rendering — loads Mermaid from CDN on first use
   * (not loaded unconditionally on every page, since most commands
   * won't be diagrams and there's no reason to pay that load cost
   * upfront) and renders the actual generated syntax.
   */
  let mermaidLoadPromise = null;
  function ensureMermaid() {
    if (window.mermaid) return Promise.resolve();
    if (mermaidLoadPromise) return mermaidLoadPromise;
    mermaidLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.onload = () => { window.mermaid.initialize({ startOnLoad: false }); resolve(); };
      script.onerror = () => reject(new Error('Failed to load diagram renderer.'));
      document.head.appendChild(script);
    });
    return mermaidLoadPromise;
  }

  async function renderDiagram(bodyEl, emptyStateEl, diagram) {
    emptyStateEl.style.display = 'none';
    const wrap = document.createElement('div');
    wrap.className = 'gw-diagram-wrap';
    wrap.innerHTML = `<div class="gw-diagram-title">${diagram.title || 'Diagram'}</div><div id="gwDiagramTarget-${Date.now()}"></div>`;
    bodyEl.appendChild(wrap);
    const targetEl = wrap.querySelector('[id^="gwDiagramTarget"]');

    try {
      await ensureMermaid();
      const id = 'gw-mermaid-' + Math.random().toString(36).slice(2);
      const { svg } = await window.mermaid.render(id, diagram.mermaidCode);
      targetEl.innerHTML = svg;
    } catch (err) {
      // Real generated Mermaid syntax can still fail to render (a
      // genuinely malformed diagram, or the CDN being unreachable) —
      // shown honestly rather than a silent blank box.
      targetEl.innerHTML = `<p style="color:#b91c1c;font-size:12px;">Couldn't render this diagram (${err.message}). Raw syntax:</p><pre style="font-size:11px;overflow-x:auto;">${diagram.mermaidCode}</pre>`;
    }
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function appendActions(bodyEl, { onApprove, onEdit, onReject }) {
    const row = document.createElement('div');
    row.className = 'gw-actions';
    row.innerHTML = `
      <button class="gw-action-btn gw-action-approve">Approve</button>
      <button class="gw-action-btn gw-action-edit">Edit</button>
      <button class="gw-action-btn gw-action-reject">Reject</button>
    `;
    row.children[0].addEventListener('click', onApprove);
    row.children[1].addEventListener('click', onEdit);
    row.children[2].addEventListener('click', onReject);
    bodyEl.appendChild(row);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return row;
  }

  function init() {
    const root = buildDOM();
    const circle = root.querySelector('#gwCircle');
    const panel = root.querySelector('#gwPanel');
    const minimizeBtn = root.querySelector('#gwMinimize');
    const bodyEl = root.querySelector('#gwBody');
    const emptyStateEl = root.querySelector('#gwEmptyState');
    const statusDot = root.querySelector('#gwStatusDot');
    const statusLabel = root.querySelector('#gwStatusLabel');
    const micBtn = root.querySelector('#gwMicBtn');
    const textInput = root.querySelector('#gwTextInput');
    const sendBtn = root.querySelector('#gwSendBtn');

    let state = loadState();
    let lastCommandText = null; // needed for /api/widget/feedback, which records against the command that produced the response being judged

    function open() {
      panel.classList.add('gw-open');
      circle.classList.add('gw-hidden');
      state.open = true;
      saveState(state);
    }
    function minimize() {
      panel.classList.remove('gw-open');
      circle.classList.remove('gw-hidden');
      state.open = false;
      saveState(state);
    }

    circle.addEventListener('click', open);
    minimizeBtn.addEventListener('click', minimize);

    // Real state restoration on load — re-renders whatever was saved,
    // this page load's fresh DOM standing in for genuine persistence.
    if (state.open) open();
    state.messages.forEach((m) => {
      if (m.role === 'diagram') renderDiagram(bodyEl, emptyStateEl, m.diagram);
      else appendMessage(bodyEl, emptyStateEl, m.role, m.content, m.extra);
    });

    async function submitCommand(commandText) {
      if (!commandText || !commandText.trim()) return;
      lastCommandText = commandText;
      appendMessage(bodyEl, emptyStateEl, 'user', commandText);
      state.messages.push({ role: 'user', content: commandText });
      saveState(state);

      setStatus(statusDot, statusLabel, 'processing');
      const thinkingEl = appendThinking(bodyEl);

      try {
        const result = await GurostAPI.call('/api/widget/command', { method: 'POST', body: { command: commandText } });
        thinkingEl.remove();
        renderResult(result, commandText);
        setStatus(statusDot, statusLabel, 'done');

        try {
          await speakTextViaRest(resultToSpokenSummary(result));
        } catch {
          // Voice feedback is a nice-to-have on top of the already-shown result.
        }
      } catch (err) {
        thinkingEl.remove();
        appendMessage(bodyEl, emptyStateEl, 'bot', `Something went wrong: ${err.message}`);
        setStatus(statusDot, statusLabel, 'idle');
      }
    }

    function resultToSpokenSummary(result) {
      if (result.type === 'diagram') return `Here's your ${result.diagramType || 'diagram'}.`;
      if (result.type === 'reminder_created') return `Reminder set: ${result.text}.`;
      if (result.type === 'not_connected') return result.content;
      return typeof result.content === 'string' ? result.content.slice(0, 200) : 'Done.';
    }

    function renderResult(result, commandText) {
      state.messages.push({ role: result.type === 'diagram' ? 'diagram' : 'bot', content: result.content, diagram: result, extra: { notConnected: result.type === 'not_connected' } });
      saveState(state);

      if (result.type === 'diagram') {
        renderDiagram(bodyEl, emptyStateEl, result);
        return;
      }

      if (result.type === 'reminder_created') {
        appendMessage(bodyEl, emptyStateEl, 'bot', `Reminder set: "${result.text}" — due ${new Date(result.dueAt).toLocaleString()}.`);
        return;
      }

      if (result.type === 'meeting_summary') {
        const lines = [
          result.decisions?.length ? `Decisions: ${result.decisions.join('; ')}` : null,
          result.action_items?.length ? `Action items: ${result.action_items.join('; ')}` : null,
          result.efficiency_analysis || null
        ].filter(Boolean).join('\n\n');
        appendMessage(bodyEl, emptyStateEl, 'bot', lines || 'Meeting summary retrieved.');
        return;
      }

      if (result.type === 'not_connected') {
        appendMessage(bodyEl, emptyStateEl, 'bot', result.content, { notConnected: true });
        return;
      }

      if (result.type === 'offer_alternative') {
        appendMessage(bodyEl, emptyStateEl, 'bot', result.content);
        if (result.offeredAction === 'create_video_room') {
          const row = document.createElement('div');
          row.className = 'gw-actions';
          row.innerHTML = '<button class="gw-action-btn gw-action-alt">Create video room</button>';
          row.children[0].addEventListener('click', async () => {
            row.remove();
            try {
              const room = await GurostAPI.call('/api/widget/create-video-room', { method: 'POST', body: { expectedParticipants: [] } });
              appendMessage(bodyEl, emptyStateEl, 'bot', `Video room created — session ${room.sessionId}.`);
            } catch (err) {
              appendMessage(bodyEl, emptyStateEl, 'bot', `Couldn't create the room: ${err.message}`);
            }
          });
          bodyEl.appendChild(row);
        }
        return;
      }

      // Default: plain text (draft content, unclear-intent fallback, etc.)
      // — gets real approve/edit/reject controls, since this is the
      // category of response a user is actually meant to judge.
      const msgEl = appendMessage(bodyEl, emptyStateEl, 'bot', result.content);
      appendActions(bodyEl, {
        onApprove: () => sendFeedback('accepted', msgEl),
        onEdit: () => {
          textInput.value = result.content;
          textInput.focus();
          sendFeedback('edited', msgEl);
        },
        onReject: () => sendFeedback('rejected', msgEl)
      });
    }

    async function sendFeedback(decision, msgEl) {
      try {
        await GurostAPI.call('/api/widget/feedback', { method: 'POST', body: { command: lastCommandText, decision, note: null } });
        const note = document.createElement('div');
        note.style.cssText = 'font-size:11px;color:#9ca3af;margin-top:4px;';
        note.textContent = decision === 'accepted' ? '✓ Approved' : decision === 'rejected' ? '✗ Rejected' : '✎ Sent to edit';
        msgEl.after(note);
      } catch {
        // Feedback recording is real but non-critical to the immediate
        // interaction — a failure here shouldn't block the user from
        // continuing to use the widget.
      }
    }

    sendBtn.addEventListener('click', () => {
      const text = textInput.value;
      textInput.value = '';
      submitCommand(text);
    });
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = textInput.value;
        textInput.value = '';
        submitCommand(text);
      }
    });

    // Real microphone capture, reusing pulse-voice.js's already-tested
    // startRecordingSession() — not reimplemented here.
    let activeRecording = null;
    micBtn.addEventListener('mousedown', async () => {
      try {
        activeRecording = await startRecordingSession();
        micBtn.classList.add('gw-listening');
        setStatus(statusDot, statusLabel, 'listening');
      } catch (err) {
        appendMessage(bodyEl, emptyStateEl, 'bot', 'Microphone unavailable — type your command instead.');
      }
    });
    async function releaseMic() {
      if (!activeRecording) return;
      micBtn.classList.remove('gw-listening');
      setStatus(statusDot, statusLabel, 'processing');
      try {
        const transcript = await activeRecording.stop();
        submitCommand(transcript);
      } catch (err) {
        appendMessage(bodyEl, emptyStateEl, 'bot', 'Could not transcribe — please type your command instead.');
        setStatus(statusDot, statusLabel, 'idle');
      } finally {
        activeRecording = null;
      }
    }
    micBtn.addEventListener('mouseup', releaseMic);
    micBtn.addEventListener('mouseleave', releaseMic);
    micBtn.addEventListener('touchend', releaseMic);
  }

  // Real, deliberate change from this file's original design — it was
  // built to appear on every page that includes it (see header
  // comment), but the real, repeated decision now is that this widget
  // belongs on assistant.html only. Checking here, in one place,
  // rather than removing the <script> tag from every one of the 13
  // pages currently including it — fewer files touched, fewer chances
  // to miss one or introduce a mistake editing markup by hand.
  const ASSISTANT_PAGE_NAMES = ['assistant.html', 'assistant'];
  const currentPage = window.location.pathname.split('/').pop() || '';
  if (!ASSISTANT_PAGE_NAMES.includes(currentPage)) {
    return; // not the Business Assistant page — don't build or show the widget at all
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
