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
