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
  Gemini: { emoji: '✨', color: '#a78bfa' },
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
const BOT_TONES = {
  work: { icon: 'autorenew', color: 'text-[var(--gurost-primary)]' },
  ok: { icon: 'check_circle', color: 'text-green-400' },
  fail: { icon: 'error', color: 'text-red-400' }
};
let lastLogged = { bot: null, at: 0 };

function escapeLogText(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function logBot(bot, text, tone = 'info', at = Date.now()) {
  const wrap = document.getElementById('botLog');
  const list = document.getElementById('botLogList');
  const avatar = BOT_AVATARS[bot] || { emoji: '🤖', color: '#cbd5e1' };
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
      : `<span class="w-6 h-6 rounded-full flex items-center justify-center text-[13px] flex-shrink-0" style="background:${avatar.color}26; box-shadow: inset 0 0 0 1px ${avatar.color}55" aria-hidden="true">${avatar.emoji}</span>`}
    <div class="min-w-0 flex-1">
      ${sameTurn ? '' : `<div class="flex items-center gap-2 leading-5"><span class="font-semibold text-[12px]" style="color:${avatar.color}">${escapeLogText(bot)}</span><span class="text-[10px] text-white/30">${time}</span></div>`}
      <p class="${textClass} text-[12.5px] leading-snug [overflow-wrap:anywhere] flex items-start gap-1.5">${status}<span>${escapeLogText(text)}</span></p>
    </div>`;
  list.appendChild(li);
  document.getElementById('botLogEmpty')?.remove();
  wrap.scrollTop = wrap.scrollHeight;
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

// Before a build: should the site use the user's real business details?
// Asked inside the conversation. Resolves with the details entered, or
// null for "Skip, use placeholders" (the site then shows obvious
// placeholders, not invented details). The last details entered are
// offered again next time - this browser only.
const BUSINESS_INFO_KEY = 'gurost.businessInfo';
const BUSINESS_FIELDS = [
  ['name', 'Business name', 'text', 'Crumb & Co.'],
  ['phone', 'Phone', 'tel', '0117 496 0000'],
  ['email', 'Email', 'email', 'hello@yourbusiness.com'],
  ['address', 'Address', 'text', '42 Stokes Croft, Bristol BS1'],
  ['website', 'Website', 'url', 'yourbusiness.com'],
  ['instagram', 'Instagram', 'url', 'instagram.com/yourbusiness'],
  ['facebook', 'Facebook', 'url', 'facebook.com/yourbusiness']
];

function askBusinessInfo() {
  return new Promise((resolve) => {
    logBot('Planner', 'Should I include your business info? (name, phone, email, address, social links)', 'info');
    const list = document.getElementById('botLogList');
    const wrap = document.getElementById('botLog');
    const li = document.createElement('li');
    li.className = 'flex items-start gap-2.5';
    li.innerHTML = `<span class="w-6 flex-shrink-0"></span>
      <div class="min-w-0 flex-1 flex flex-wrap gap-2" data-ask>
        <button type="button" data-yes class="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--gurost-primary)] text-white">Yes, let me add</button>
        <button type="button" data-skip class="px-3 py-1.5 rounded-md text-[12px] font-semibold border border-white/20 text-white/80 hover:text-white">Skip, use placeholders</button>
      </div>`;
    list.appendChild(li);
    document.getElementById('botLogEmpty')?.remove();
    wrap.scrollTop = wrap.scrollHeight;

    const finish = (info, said) => {
      li.remove();
      logBot('You', said);
      resolve(info);
    };
    li.querySelector('[data-skip]').addEventListener('click', () => finish(null, 'Skip - use placeholders for now.'));
    li.querySelector('[data-yes]').addEventListener('click', () => {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(BUSINESS_INFO_KEY)) || {}; } catch { /* nothing saved */ }
      const inputCls = 'w-full rounded-md bg-white/5 border border-white/15 px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--gurost-primary)]';
      li.querySelector('[data-ask]').outerHTML = `<form class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2" data-form novalidate>
        ${BUSINESS_FIELDS.map(([k, label, type, ph]) => `<label class="flex flex-col gap-1 text-[11px] text-white/60${k === 'address' ? ' sm:col-span-2' : ''}">${label}
          <input name="${k}" type="${type === 'url' ? 'text' : type}" placeholder="${ph}" class="${inputCls}" maxlength="200" value="${escapeLogText(saved[k] || '')}"></label>`).join('')}
        <div class="sm:col-span-2 flex gap-2 pt-1">
          <button type="submit" class="px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--gurost-primary)] text-white">Use these details</button>
          <button type="button" data-skip2 class="px-3 py-1.5 rounded-md text-[12px] font-semibold border border-white/20 text-white/80 hover:text-white">Skip</button>
        </div>
        <p class="sm:col-span-2 text-[11px] text-red-300 hidden" data-error></p>
      </form>`;
      const form = li.querySelector('[data-form]');
      form.querySelector('input').focus();
      wrap.scrollTop = wrap.scrollHeight;
      form.querySelector('[data-skip2]').addEventListener('click', () => finish(null, 'Skip - use placeholders for now.'));
      form.addEventListener('input', () => form.querySelector('[data-error]').classList.add('hidden'));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const info = {};
        for (const [k] of BUSINESS_FIELDS) { const v = form.elements[k].value.trim(); if (v) info[k] = v; }
        const err = form.querySelector('[data-error]');
        if (info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(info.email)) {
          err.textContent = 'That email doesn\'t look right.';
          err.classList.remove('hidden');
          return;
        }
        if (!Object.keys(info).length) return finish(null, 'Skip - use placeholders for now.');
        try { localStorage.setItem(BUSINESS_INFO_KEY, JSON.stringify(info)); } catch { /* not remembered - still used */ }
        finish(info, `Use my details: ${[info.name, info.phone, info.email].filter(Boolean).join(' · ') || 'added'}.`);
      });
    });
  });
}
