/**
 * Bot conversation - the right-hand panel of both builders (Website and
 * App). Every bot message, with its avatar and time, plus every Pulse
 * action, is appended to #botLogList inside #botLog. Generated code is a
 * drawer (#codePane) over this panel, opened only by Pulse's View Code.
 *
 * Page markup needed: #botLog > #botLogEmpty + ol#botLogList, and
 * #codePane with a #codePaneClose button. Load before the page script.
 */

// Bot conversation (right panel). Append-only: messages are never
// rewritten or hidden, so the whole conversation stays readable.
// Each bot has an avatar so you can see who's talking at a glance.
const BOT_AVATARS = {
  Planner: { emoji: '📋', color: '#60a5fa' },
  Industry: { emoji: '🏷️', color: '#22d3ee' },
  Designer: { emoji: '🎨', color: '#f472b6' },
  Builder: { emoji: '🔨', color: '#fb923c' },
  Images: { emoji: '✨', color: '#a78bfa' },
  'Stock photos': { emoji: '📷', color: '#94a3b8' },
  'Stock video': { emoji: '🎬', color: '#f472b6' },
  'Guide Bot': { emoji: '🧭', color: '#34d399' },
  Pulse: { emoji: '⚡', color: '#facc15' },
  // App Builder stages
  Schema: { emoji: '🗄️', color: '#38bdf8' },
  Backend: { emoji: '⚙️', color: '#fb923c' },
  Frontend: { emoji: '🖥️', color: '#f472b6' },
  Reviewer: { emoji: '🔍', color: '#a78bfa' },
  Verifier: { emoji: '🧪', color: '#34d399' },
  You: { emoji: '🙂', color: '#e5e7eb' }
};
// Every AI helper speaks under the AI's one name (shared/ai-brand.js, set in brand-config.js); the helper's job is
// a small tag beside the name. Pulse and You keep their own names.
const AI_ROLES = {
  Planner: 'Planner', Industry: 'Industry', Designer: 'Designer', Builder: 'Builder', Images: 'Images',
  'Stock photos': 'Photos', 'Stock video': 'Video', 'Guide Bot': 'Guide',
  Schema: 'Schema', Backend: 'Backend', Frontend: 'Frontend', Reviewer: 'Reviewer', Verifier: 'Verifier'
};
const AI_COLOR = '#FEB246';
const BOT_TONES = {
  work: { icon: 'autorenew', color: 'text-[var(--gurost-primary)]' },
  ok: { icon: 'check_circle', color: 'text-green-400' },
  fail: { icon: 'error', color: 'text-red-400' }
};
let lastLogged = { bot: null, at: 0 };

function escapeLogText(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Empty text, or only "line 0 / line 1 / ..." filler, is not a message. Skipped (and noted in the
// console, so a real occurrence can be traced), never drawn as an empty row.
function isFillerText(text) {
  const lines = String(text == null ? '' : text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return !lines.length || lines.every((l) => /^(line\s*\d+\s*:?|\.{3}|…)$/i.test(l));
}

function logBot(bot, text, tone = 'info', at = Date.now()) {
  if (isFillerText(text)) { console.warn('[bot-conversation] Skipped an empty or placeholder message from ' + bot + '.'); return; }
  const wrap = document.getElementById('botLog');
  const list = document.getElementById('botLogList');
  const avatar = BOT_AVATARS[bot] || { emoji: '🤖', color: '#cbd5e1' };
  const aiRole = window.GurostAI ? AI_ROLES[bot] : null;
  // Error lines never name a model or provider (see GurostAI.publicText). Other lines are
  // written without them, and may echo what the person typed, which must stay as typed.
  if (tone === 'fail' && window.GurostAI && (aiRole || bot === 'Pulse')) text = GurostAI.publicText(text);
  const speaker = aiRole ? GurostAI.NAME : bot;
  const speakerColor = aiRole ? AI_COLOR : avatar.color;
  const status = BOT_TONES[tone] ? `<span class="material-symbols-outlined text-[13px] ${BOT_TONES[tone].color}">${BOT_TONES[tone].icon}</span>` : '';
  const time = new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const textClass = tone === 'fail' ? 'text-red-300' : 'text-white/85';
  // Consecutive messages from the same bot read as one turn: no repeated avatar.
  const sameTurn = lastLogged.bot === bot && at - lastLogged.at < 60000;
  lastLogged = { bot, at };
  const li = document.createElement('li');
  li.className = `flex items-start gap-2.5 ${sameTurn ? '-mt-1' : 'mt-1'}`;
  li.innerHTML = `${sameTurn
      ? '<span class="w-6 flex-shrink-0"></span>'
      : aiRole
        ? `<span class="w-6 h-6 flex items-center justify-center flex-shrink-0">${GurostAI.avatar(24)}</span>`
        : `<span class="w-6 h-6 rounded-full flex items-center justify-center text-[13px] flex-shrink-0" style="background:${avatar.color}26; box-shadow: inset 0 0 0 1px ${avatar.color}55" aria-hidden="true">${avatar.emoji}</span>`}
    <div class="min-w-0 flex-1">
      ${sameTurn ? '' : `<div class="flex items-center gap-2 leading-5"><span class="font-semibold text-[12px]" style="color:${speakerColor}">${escapeLogText(speaker)}</span>${aiRole ? `<span class="text-[10px] text-white/45">${escapeLogText(aiRole)}</span>` : ''}<span class="text-[10px] text-white/30">${time}</span></div>`}
      <p class="${textClass} text-[12.5px] leading-snug [overflow-wrap:anywhere] flex items-start gap-1.5">${status}<span>${escapeLogText(text)}</span></p>
    </div>`;
  const follow = isLogAtBottom();
  list.appendChild(li);
  document.getElementById('botLogEmpty')?.remove();
  if (follow) wrap.scrollTop = wrap.scrollHeight;
}

// The conversation follows new messages only when you're already at the
// bottom. Scrolled up to read or click, it stays put - jumping under the
// cursor made clicks land on a different button (Fix all, Apply).
function isLogAtBottom() {
  const wrap = document.getElementById('botLog');
  return !wrap || wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 80;
}

function clearBotLog() {
  document.getElementById('botLogList').innerHTML = '';
  lastLogged = { bot: null, at: 0 };
}

// Pulse button actions report into the same conversation.
function logActivity(text, tone) {
  logBot('Pulse', text, tone);
}

// Code drawer over the conversation panel - only Pulse's View Code opens it.
function toggleCode(force) {
  const pane = document.getElementById('codePane');
  const open = force !== undefined ? force : pane.classList.contains('hidden');
  pane.classList.toggle('hidden', !open);
  pane.classList.toggle('flex', open);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('codePaneClose')?.addEventListener('click', () => toggleCode(false));
});

// Before a build: a modal asking for the user's company details, so the
// site is built with them in the right places (header, contact section,
// footer, social icons, schema) instead of placeholders. Resolves with
// the details entered, or null for Skip (the site then shows obvious
// placeholders, never invented details). The last details entered are
// offered again next time - this browser only; the server keeps the
// project's own copy.
const BUSINESS_INFO_KEY = 'gurost.businessInfo';
const BUSINESS_FIELDS = [
  ['name', 'Business name', 'text', 'Crumb & Co'],
  ['tagline', 'Tagline (1 line)', 'text', 'Slow bread, baked daily'],
  ['phone', 'Phone', 'tel', '0117 496 0000'],
  ['email', 'Email', 'email', 'hello@yourbusiness.com'],
  ['address', 'Address', 'text', '42 Stokes Croft, Bristol BS1', 'wide'],
  ['instagram', 'Instagram', 'text', '@yourbusiness'],
  ['tiktok', 'TikTok', 'text', '@yourbusiness'],
  ['youtube', 'YouTube', 'text', 'youtube.com/@yourchannel'],
  ['x', 'X (Twitter)', 'text', '@yourbusiness'],
  ['facebook', 'Facebook', 'text', 'facebook.com/yourbusiness']
];

// Plain CSS (not Tailwind) so the modal holds even if the CDN is slow.
// Above the Pulse widget (z 9999/10000) - the build waits on this answer.
const BUSINESS_MODAL_CSS = `
.gcd-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;}
.gcd-card{background:#fff;color:#1A1A2E;width:100%;max-width:580px;max-height:calc(100vh - 32px);overflow:auto;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.3);padding:22px 22px 18px;font-family:Inter,system-ui,sans-serif;}
.gcd-card h2{font-family:Montserrat,Inter,sans-serif;font-weight:700;font-size:19px;margin:0 0 4px;}
.gcd-sub{font-size:13px;color:#6B7280;margin:0 0 4px;}
.gcd-for{font-size:12px;color:#6B7280;margin:0 0 14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gcd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;}
.gcd-grid label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#374151;}
.gcd-grid .gcd-wide{grid-column:1/-1;}
.gcd-grid input{border:1px solid #E5E7EB;border-radius:8px;padding:8px 10px;font:inherit;font-size:13.5px;font-weight:400;color:#1A1A2E;background:#fff;}
.gcd-grid input:focus{outline:none;border-color:#FF8C00;box-shadow:0 0 0 3px rgba(255,140,0,.15);}
.gcd-section{grid-column:1/-1;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#9CA3AF;margin-top:6px;}
.gcd-error{color:#B91C1C;font-size:12px;margin:10px 0 0;}
.gcd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;}
.gcd-actions button{font:inherit;font-size:14px;font-weight:600;border-radius:999px;padding:9px 18px;cursor:pointer;}
.gcd-skip{background:#fff;border:1px solid #E5E7EB;color:#374151;}
.gcd-save{background:linear-gradient(135deg,#FEB246,#FF8C00);border:0;color:#fff;}
@media (max-width:560px){.gcd-grid{grid-template-columns:1fr;}}`;

function askBusinessInfo(prompt = '') {
  return new Promise((resolve) => {
    if (!document.getElementById('gcdStyle')) {
      const style = document.createElement('style');
      style.id = 'gcdStyle';
      style.textContent = BUSINESS_MODAL_CSS;
      document.head.appendChild(style);
    }
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(BUSINESS_INFO_KEY)) || {}; } catch { /* nothing saved */ }
    const field = ([k, label, type, ph, wide]) => `<label class="${wide ? 'gcd-wide' : ''}">${label}
      <input name="${k}" type="${type}" placeholder="${ph}" maxlength="200" autocomplete="off" value="${escapeLogText(saved[k] || '')}"></label>`;
    const backdrop = document.createElement('div');
    backdrop.className = 'gcd-backdrop';
    backdrop.id = 'companyDetailsModal';
    backdrop.innerHTML = `<form class="gcd-card" role="dialog" aria-modal="true" aria-labelledby="gcdTitle" novalidate>
      <h2 id="gcdTitle">Let's get your details right first</h2>
      <p class="gcd-sub">Optional - skip if you want placeholders. These go in your header, contact section, footer, social icons and Google listing.</p>
      <p class="gcd-for">${prompt ? `For: ${escapeLogText(prompt)}` : ''}</p>
      <div class="gcd-grid">
        ${BUSINESS_FIELDS.slice(0, 5).map(field).join('')}
        <div class="gcd-section">Social profiles - @handle or link</div>
        ${BUSINESS_FIELDS.slice(5).map(field).join('')}
      </div>
      <p class="gcd-error" hidden></p>
      <div class="gcd-actions">
        <button type="button" class="gcd-skip">Skip</button>
        <button type="submit" class="gcd-save">Save &amp; Build</button>
      </div>
    </form>`;
    document.body.appendChild(backdrop);
    const form = backdrop.querySelector('form');
    const error = form.querySelector('.gcd-error');
    form.elements.name.focus();

    const finish = (info) => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      resolve(info);
    };
    const onKey = (e) => { if (e.key === 'Escape') finish(null); };
    document.addEventListener('keydown', onKey);
    form.querySelector('.gcd-skip').addEventListener('click', () => finish(null));
    form.addEventListener('input', () => { error.hidden = true; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const info = {};
      for (const [k] of BUSINESS_FIELDS) { const v = form.elements[k].value.trim(); if (v) info[k] = v; }
      if (info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(info.email)) {
        error.textContent = "That email doesn't look right.";
        error.hidden = false;
        form.elements.email.focus();
        return;
      }
      if (!Object.keys(info).length) return finish(null);
      try { localStorage.setItem(BUSINESS_INFO_KEY, JSON.stringify(info)); } catch { /* not remembered - still used */ }
      finish(info);
    });
  });
}
