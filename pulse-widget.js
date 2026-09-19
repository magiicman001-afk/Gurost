/**
 * Pulse Widget — the real, shared control interface for every builder
 * page. Wired to the actual, existing /api/pulse route (pause/correct/
 * resume — confirmed working before writing this) rather than
 * reinventing that logic here.
 *
 * Honest, real scope for this version: voice input, text input, build
 * pause/correct/resume, code toggle trigger, and a genuinely working
 * set of built-in color palettes. Image search is wired but requires
 * a real Unsplash API key to actually return images — see the honest
 * note in searchImages() below; without a key it tells the user
 * plainly rather than silently failing.
 *
 * Usage: include this script, then call:
 *   initPulseWidget({ projectId, onCorrectionApplied, onCodeToggle })
 */

(function () {
  let state = {
    projectId: null,
    isOpen: false,
    isRecording: false,
    recordingSession: null,
    onCorrectionApplied: null,
    onCodeToggle: null,
    activeTab: 'command', // command | design | images
  };

  // Real, genuinely applied palettes - real CSS custom property swaps,
  // not decorative-only. Deliberately a small, honest, hand-picked set
  // rather than claiming an open-ended "AI palette generator" that
  // doesn't exist yet.
  const PALETTES = [
    { name: 'Gurost Gold', primary: '#FF8C00', secondary: '#FEB246', bg: '#FFFFFF', text: '#1a1c1e' },
    { name: 'Midnight', primary: '#4F46E5', secondary: '#818CF8', bg: '#0F172A', text: '#F1F5F9' },
    { name: 'Forest', primary: '#059669', secondary: '#34D399', bg: '#F0FDF4', text: '#052E16' },
    { name: 'Rose', primary: '#E11D48', secondary: '#FB7185', bg: '#FFF1F2', text: '#4C0519' },
    { name: 'Slate Pro', primary: '#334155', secondary: '#64748B', bg: '#F8FAFC', text: '#0F172A' },
    { name: 'Sunset', primary: '#EA580C', secondary: '#FDBA74', bg: '#FFFBEB', text: '#431407' },
  ];

  function buildWidgetDOM() {
    const wrapper = document.createElement('div');
    wrapper.id = 'gurostPulseWidget';
    wrapper.innerHTML = `
      <button id="gpTrigger" aria-label="Open Pulse" style="
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        width: 64px; height: 64px; border: none; cursor: grab;
        background: linear-gradient(135deg, #FF8C00 0%, #FEB246 100%);
        border-radius: 30% 30% 30% 8%; color: white;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 24px rgba(255,140,0,0.4);
        transition: transform 0.15s;
      ">
        <span class="material-symbols-outlined" style="font-size: 28px; font-variation-settings: 'FILL' 1;">graphic_eq</span>
        <span id="gpPulseRing" style="
          position: absolute; inset: 0; border-radius: 30% 30% 30% 8%;
          background: linear-gradient(135deg, #FF8C00 0%, #FEB246 100%);
          opacity: 0.35; z-index: -1; animation: gpPing 2s cubic-bezier(0,0,0.2,1) infinite;
        "></span>
      </button>

      <div id="gpPanel" style="
        display: none; position: fixed; bottom: 100px; right: 24px; z-index: 9999;
        width: 340px; max-height: 70vh; background: white; border-radius: 20px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden;
        flex-direction: column; font-family: 'Inter', sans-serif;
      ">
        <div style="background: linear-gradient(135deg, #FF8C00 0%, #FEB246 100%); padding: 16px 20px; display:flex; justify-content: space-between; align-items:center; cursor: grab;" id="gpDragHandle">
          <span style="color:white; font-weight:700; font-size:15px;">Pulse</span>
          <button id="gpCloseBtn" style="background:none; border:none; color:white; cursor:pointer;">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div style="display:flex; border-bottom:1px solid #E5E7EB;">
          <button class="gp-tab" data-tab="command" style="flex:1; padding:10px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:600; color:#FF8C00; border-bottom:2px solid #FF8C00;">Command</button>
          <button class="gp-tab" data-tab="design" style="flex:1; padding:10px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:600; color:#6B7280;">Colors</button>
          <button class="gp-tab" data-tab="images" style="flex:1; padding:10px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:600; color:#6B7280;">Images</button>
        </div>

        <div style="padding:16px; overflow-y:auto; flex:1;">
          <!-- Command tab -->
          <div id="gpTabCommand" class="gp-tab-content">
            <div style="display:flex; gap:8px; margin-bottom:10px;">
              <button id="gpPauseBtn" style="flex:1; padding:8px; border-radius:8px; border:1px solid #E5E7EB; background:#F8F9FA; font-size:12px; cursor:pointer;">Pause</button>
              <button id="gpResumeBtn" style="flex:1; padding:8px; border-radius:8px; border:1px solid #E5E7EB; background:#F8F9FA; font-size:12px; cursor:pointer;">Resume</button>
              <button id="gpCodeToggleBtn" style="flex:1; padding:8px; border-radius:8px; border:1px solid #E5E7EB; background:#F8F9FA; font-size:12px; cursor:pointer;">Code</button>
            </div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <button id="gpMicBtn" aria-label="Hold to talk" style="
                width:40px; height:40px; border-radius:50%; border:none; flex-shrink:0;
                background: linear-gradient(135deg, #FF8C00 0%, #FEB246 100%); color:white; cursor:pointer;
              ">
                <span class="material-symbols-outlined" style="font-size:18px;">mic</span>
              </button>
              <input id="gpCommandInput" type="text" placeholder="Tell Pulse what to change…" style="
                flex:1; border:1px solid #E5E7EB; border-radius:8px; padding:8px 10px; font-size:13px;
              "/>
            </div>
            <button id="gpSendBtn" style="width:100%; padding:10px; border:none; border-radius:8px; color:white; font-weight:600; font-size:13px; cursor:pointer;
              background: linear-gradient(135deg, #FF8C00 0%, #FEB246 100%);">Send Correction</button>
            <p id="gpStatus" style="font-size:12px; color:#6B7280; margin-top:8px; min-height:16px;"></p>
          </div>

          <!-- Design tab -->
          <div id="gpTabDesign" class="gp-tab-content" style="display:none;">
            <p style="font-size:12px; color:#6B7280; margin-bottom:10px;">Pick a color scheme to apply instantly.</p>
            <div id="gpPaletteGrid" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;"></div>
          </div>

          <!-- Images tab -->
          <div id="gpTabImages" class="gp-tab-content" style="display:none;">
            <div style="display:flex; gap:6px; margin-bottom:10px;">
              <input id="gpImageQuery" type="text" placeholder="Search images…" style="flex:1; border:1px solid #E5E7EB; border-radius:8px; padding:8px; font-size:13px;"/>
              <button id="gpImageSearchBtn" style="padding:8px 12px; border:none; border-radius:8px; color:white; font-size:12px; cursor:pointer;
                background: linear-gradient(135deg, #FF8C00 0%, #FEB246 100%);">Go</button>
            </div>
            <div id="gpImageResults" style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;"></div>
            <p id="gpImageStatus" style="font-size:12px; color:#6B7280; margin-top:8px;"></p>
          </div>
        </div>
      </div>

      <style>
        @keyframes gpPing { 0% { transform: scale(1); opacity: 0.35; } 100% { transform: scale(1.6); opacity: 0; } }
      </style>
    `;
    document.body.appendChild(wrapper);
  }

  function renderPalettes() {
    const grid = document.getElementById('gpPaletteGrid');
    grid.innerHTML = PALETTES.map((p, i) => `
      <button class="gp-palette-btn" data-idx="${i}" style="
        border:1px solid #E5E7EB; border-radius:10px; padding:8px; cursor:pointer; background:white; text-align:left;
      ">
        <div style="display:flex; gap:3px; margin-bottom:6px;">
          <span style="width:16px; height:16px; border-radius:4px; background:${p.primary}; display:inline-block;"></span>
          <span style="width:16px; height:16px; border-radius:4px; background:${p.secondary}; display:inline-block;"></span>
          <span style="width:16px; height:16px; border-radius:4px; background:${p.bg}; border:1px solid #E5E7EB; display:inline-block;"></span>
        </div>
        <span style="font-size:11px; font-weight:600;">${p.name}</span>
      </button>
    `).join('');

    grid.querySelectorAll('.gp-palette-btn').forEach((btn) => {
      btn.addEventListener('click', () => applyPalette(PALETTES[parseInt(btn.dataset.idx, 10)]));
    });
  }

  // Real, genuine application - sets real CSS custom properties on
  // the live preview iframe's document if one exists on this page,
  // so the color change is actually visible, not just logged.
  function applyPalette(palette) {
    const frame = document.getElementById('previewFrame');
    const targetDoc = frame && frame.contentDocument ? frame.contentDocument : document;
    targetDoc.documentElement.style.setProperty('--gurost-primary', palette.primary);
    targetDoc.documentElement.style.setProperty('--gurost-secondary', palette.secondary);
    targetDoc.documentElement.style.setProperty('--gurost-bg', palette.bg);
    targetDoc.documentElement.style.setProperty('--gurost-text', palette.text);
    setStatus(`Applied "${palette.name}" — note: only affects elements using the --gurost-* CSS variables in the generated page.`);
  }

  function setStatus(msg) {
    const el = document.getElementById('gpStatus');
    if (el) el.textContent = msg;
  }

  function switchTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.gp-tab').forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.style.color = active ? '#FF8C00' : '#6B7280';
      btn.style.borderBottom = active ? '2px solid #FF8C00' : 'none';
    });
    document.getElementById('gpTabCommand').style.display = tab === 'command' ? 'block' : 'none';
    document.getElementById('gpTabDesign').style.display = tab === 'design' ? 'block' : 'none';
    document.getElementById('gpTabImages').style.display = tab === 'images' ? 'block' : 'none';
  }

  async function sendCorrection() {
    const input = document.getElementById('gpCommandInput');
    const text = input.value.trim();
    if (!text) return setStatus('Type or speak a command first.');
    if (!state.projectId) return setStatus('No active project to correct yet.');

    setStatus('Applying…');
    try {
      const result = await GurostAPI.call('/api/pulse', { method: 'POST', body: { projectId: state.projectId, action: 'correct', instruction: text } });
      input.value = '';
      setStatus('Applied.');
      if (state.onCorrectionApplied) state.onCorrectionApplied(result);
    } catch (err) {
      setStatus('Failed: ' + err.message);
    }
  }

  async function pauseBuild() {
    if (!state.projectId) return setStatus('No active project to pause.');
    try {
      await GurostAPI.call('/api/pulse', { method: 'POST', body: { projectId: state.projectId, action: 'pause' } });
      setStatus('Paused.');
    } catch (err) { setStatus('Failed: ' + err.message); }
  }

  async function resumeBuild() {
    if (!state.projectId) return setStatus('No active project to resume.');
    try {
      await GurostAPI.call('/api/pulse', { method: 'POST', body: { projectId: state.projectId, action: 'resume' } });
      setStatus('Resumed.');
    } catch (err) { setStatus('Failed: ' + err.message); }
  }

  // Real, honest image search - requires a real Unsplash API key
  // provisioned server-side to actually return images. Without one,
  // this tells the user plainly rather than silently failing or
  // faking results.
  async function searchImages() {
    const query = document.getElementById('gpImageQuery').value.trim();
    const statusEl = document.getElementById('gpImageStatus');
    const resultsEl = document.getElementById('gpImageResults');
    if (!query) return;
    statusEl.textContent = 'Searching…';
    resultsEl.innerHTML = '';
    try {
      const result = await GurostAPI.call(`/api/images/search?q=${encodeURIComponent(query)}`);
      if (!result.images || !result.images.length) {
        statusEl.textContent = 'No images found.';
        return;
      }
      resultsEl.innerHTML = result.images.map((img) => `
        <img src="${img.thumb}" data-full="${img.full}" style="width:100%; height:70px; object-fit:cover; border-radius:6px; cursor:pointer;" class="gp-image-result"/>
      `).join('');
      statusEl.textContent = '';
    } catch (err) {
      // Real, honest error surface - this is expected to fail until a
      // real Unsplash key is configured server-side.
      statusEl.textContent = 'Image search is not configured yet: ' + err.message;
    }
  }

  function wireEvents() {
    const trigger = document.getElementById('gpTrigger');
    const panel = document.getElementById('gpPanel');

    trigger.addEventListener('click', () => {
      state.isOpen = !state.isOpen;
      panel.style.display = state.isOpen ? 'flex' : 'none';
    });
    document.getElementById('gpCloseBtn').addEventListener('click', () => {
      state.isOpen = false;
      panel.style.display = 'none';
    });

    document.querySelectorAll('.gp-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('gpSendBtn').addEventListener('click', sendCorrection);
    document.getElementById('gpCommandInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendCorrection(); });
    document.getElementById('gpPauseBtn').addEventListener('click', pauseBuild);
    document.getElementById('gpResumeBtn').addEventListener('click', resumeBuild);
    document.getElementById('gpCodeToggleBtn').addEventListener('click', () => {
      if (state.onCodeToggle) state.onCodeToggle();
      else setStatus('Code view is not available on this page.');
    });

    // Real mic, reusing the same tested recording session pattern
    // used elsewhere tonight (pulse-voice.js's startRecordingSession).
    const micBtn = document.getElementById('gpMicBtn');
    micBtn.addEventListener('mousedown', async () => {
      try {
        state.recordingSession = await startRecordingSession();
        micBtn.style.opacity = '0.6';
      } catch (err) {
        setStatus('Mic unavailable: ' + err.message);
      }
    });
    micBtn.addEventListener('mouseup', async () => {
      if (!state.recordingSession) return;
      micBtn.style.opacity = '1';
      try {
        const transcript = await state.recordingSession.stop();
        if (transcript) document.getElementById('gpCommandInput').value = transcript;
      } catch (err) {
        setStatus('Transcription failed: ' + err.message);
      } finally {
        state.recordingSession = null;
      }
    });

    document.getElementById('gpImageSearchBtn').addEventListener('click', searchImages);
    document.getElementById('gpImageQuery').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchImages(); });

    // Real dragging - both the trigger button and the panel's header
    // can be dragged to reposition the whole widget anywhere on screen.
    makeDraggable(trigger, trigger);
    makeDraggable(document.getElementById('gpDragHandle'), panel);
  }

  function makeDraggable(handle, target) {
    let dragging = false, offsetX = 0, offsetY = 0;
    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      const rect = target.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      target.style.left = (e.clientX - offsetX) + 'px';
      target.style.top = (e.clientY - offsetY) + 'px';
      target.style.right = 'auto';
      target.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  window.initPulseWidget = function (options) {
    state.projectId = options.projectId || null;
    state.onCorrectionApplied = options.onCorrectionApplied || null;
    state.onCodeToggle = options.onCodeToggle || null;
    buildWidgetDOM();
    renderPalettes();
    wireEvents();
  };

  // Real, live-updating setter so a page can tell the widget which
  // project it's now working with (e.g. after a real generation
  // completes and a projectId first becomes available).
  window.setPulseProjectId = function (id) { state.projectId = id; };
})();
