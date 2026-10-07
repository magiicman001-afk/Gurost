/**
 * Pulse thinking while the site builds.
 *
 *   start()        every 30s the in-browser inspector (shared/pulse-inspector.js)
 *                  measures the page built so far; /api/pulse/analyze in
 *                  "build" mode turns the facts into issues with the measured
 *                  rules only (no AI, no cost). Each new issue is said once in
 *                  the conversation. Once enough of the page exists, Pulse may
 *                  ask a question (testimonials) - a "yes" is queued.
 *   buildFinished() stops the checks and sums up what was noticed.
 *   reviewPicked() after "Use this design": applies the queued requests,
 *                  analyses the picked page properly (AI, measured rules as
 *                  the fallback) and offers [Review] [Fix all] [Skip];
 *                  Review lists every issue with [Apply] [Skip].
 *
 * Needs: GurostInspector, GurostAPI, logBot (shared/bot-conversation.js).
 * Everything shown is set with textContent.
 */
window.PulseBuildBrain = (function () {
  const CHECK_EVERY_MS = 30000;
  let timer = null;
  let state = null;
  const skipped = new Set(); // issue titles skipped this session - not raised again

  const shorten = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  const textOf = (html) => String(html || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const sectionCount = (html) => (String(html || '').match(/<section\b/gi) || []).length;

  // A row of buttons under the latest conversation message.
  function logActions(actions) {
    const list = document.getElementById('botLogList');
    const li = document.createElement('li');
    li.className = 'flex items-start gap-2.5';
    const pad = document.createElement('span');
    pad.className = 'w-6 flex-shrink-0';
    const row = document.createElement('div');
    row.className = 'min-w-0 flex-1 flex flex-wrap gap-2';
    for (const a of actions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.title = a.title || a.label;
      b.className = a.primary
        ? 'px-3 py-1.5 rounded-md text-[12px] font-semibold bg-[var(--gurost-primary)] text-white disabled:opacity-50'
        : 'px-3 py-1.5 rounded-md text-[12px] font-semibold border border-white/20 text-white/80 hover:text-white disabled:opacity-50';
      b.addEventListener('click', () => a.onClick(b, row));
      row.appendChild(b);
    }
    li.append(pad, row);
    list.appendChild(li);
    document.getElementById('botLog').scrollTop = document.getElementById('botLog').scrollHeight;
    return row;
  }

  const disableRow = (row) => row.querySelectorAll('button').forEach((x) => { x.disabled = true; });

  async function analyze(projectId, facts, mode) {
    return GurostAPI.call('/api/pulse/analyze', { method: 'POST', body: mode ? { projectId, facts, mode } : { projectId, facts } });
  }

  async function check() {
    if (!state || state.busy) return;
    const frame = state.getFrame();
    const html = state.getHtml();
    if (!frame || !html) return;
    state.busy = true;
    try {
      const facts = await GurostInspector.inspectPage(frame, html);
      const result = await analyze(state.projectId, facts, 'build');
      if (!state) return;
      for (const issue of result.issues || []) {
        if (state.seen.has(issue.issue) || skipped.has(issue.issue)) continue;
        state.seen.add(issue.issue);
        state.found.push(issue);
        logBot('Pulse', `Noticed: ${issue.issue}${issue.evidence ? ` — ${shorten(issue.evidence, 110)}` : ''}. I'll offer a fix when the build finishes.`, 'info');
      }
      maybeAsk(html);
    } catch (err) {
      console.warn('[pulse-build-brain] check skipped:', err.message); // a half-built page can't always be measured
    } finally {
      if (state) state.busy = false;
    }
  }

  // Questions Pulse asks while there is still time to act on the answer.
  function maybeAsk(html) {
    if (state.asked.has('testimonials') || sectionCount(html) < 4) return;
    if (/testimonial|review|what (our )?(customers|clients|guests) say|kind words/i.test(textOf(html))) return;
    state.asked.add('testimonials');
    logBot('Pulse', 'Do you want me to add testimonials? They build trust.', 'info');
    const queue = state.queued;
    logActions([
      { label: 'Yes, add them', primary: true, onClick: (b, row) => {
        disableRow(row);
        queue.push({ label: 'testimonials', text: 'Add a testimonials section ready for three real customer quotes, placed before the contact section and styled to match the page: each card holds clearly marked placeholders - "[Customer quote]", "[Customer name]" - and an initials avatar in a coloured circle (no photos). Never invent a review, a name or a rating.' });
        logBot('You', 'Yes, add testimonials.');
        logBot('Pulse', "Noted — once you pick a design I'll add a testimonials section ready for your real customers' words.", 'ok');
      } },
      { label: 'No thanks', onClick: (b, row) => { disableRow(row); logBot('You', 'No testimonials.'); } }
    ]);
  }

  function start({ projectId, getFrame, getHtml }) {
    stop();
    state = { projectId, getFrame, getHtml, seen: new Set(), found: [], asked: new Set(), queued: [], busy: false };
    timer = setInterval(check, CHECK_EVERY_MS);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function buildFinished() {
    stop();
    if (!state || state.summarised) return;
    state.summarised = true;
    const n = state.found.length;
    if (n) logBot('Pulse', `While it built I noticed ${n} thing${n === 1 ? '' : 's'} worth fixing. Pick a design and I'll check that one properly.`, 'info');
  }

  // Fixes run one after another, never at once - each is an edit of the
  // same page, and the server takes one correction at a time.
  let fixChain = Promise.resolve();
  const oneAtATime = (fn) => {
    const run = fixChain.then(fn, fn);
    fixChain = run.catch(() => {});
    return run;
  };

  async function applyAll(issues, applyFix, row) {
    const todo = issues.filter((i) => !i.done);
    let k = 0;
    for (const issue of todo) {
      k++;
      const step = todo.length > 1 ? `Fix ${k} of ${todo.length}` : null;
      if (step) logBot('Pulse', `${step}: ${issue.issue}…`, 'work');
      try {
        await oneAtATime(() => applyFix(issue.fix_prompt));
        issue.done = true;
        if (step) logBot('Pulse', `${step}: done.`, 'ok');
        issue.button?.replaceWith(Object.assign(document.createElement('span'), { className: 'text-[12px] text-green-400', textContent: 'Fixed' }));
      } catch (err) {
        logBot('Pulse', `Couldn't fix "${issue.issue}": ${err.message}`, 'fail');
        // Its buttons come back, so it can be tried again.
        issue.row?.querySelectorAll('button').forEach((x) => { x.disabled = false; });
      }
    }
    if (row) disableRow(row);
  }

  function showReview(issues, applyFix) {
    for (const issue of issues) {
      logBot('Pulse', `${issue.severity === 'high' ? 'Important: ' : ''}${issue.issue}${issue.impact ? ` — ${shorten(issue.impact, 120)}` : ''}`, 'info');
      const row = logActions([
        { label: 'Apply', primary: true, title: shorten(issue.fix_prompt, 200), onClick: async (b, r) => {
          disableRow(r);
          issue.button = b;
          await applyAll([issue], applyFix);
        } },
        { label: 'Skip', onClick: (b, r) => { disableRow(r); skipped.add(issue.issue); issue.done = true; } }
      ]);
      issue.button = row.querySelector('button');
      issue.row = row;
    }
  }

  /**
   * After "Use this design": queued requests first, then a full analysis of
   * the picked page. applyFix(instruction) is the builder's Pulse edit.
   */
  async function reviewPicked({ projectId, frame, html, applyFix }) {
    const queued = state ? state.queued.splice(0) : [];
    for (const q of queued) {
      logBot('Pulse', `Adding ${q.label}, as you asked…`, 'work');
      try { await oneAtATime(() => applyFix(q.text)); } catch (err) { logBot('Pulse', `Couldn't add ${q.label}: ${err.message}`, 'fail'); }
    }
    logBot('Pulse', 'Checking the design you picked…', 'work');
    let result;
    try {
      const facts = await GurostInspector.inspectPage(frame, typeof html === 'function' ? html() : html);
      result = await analyze(projectId, facts);
    } catch (err) {
      logBot('Pulse', `I couldn't check the page this time: ${err.message}`, 'fail');
      return;
    }
    const issues = (result.issues || []).filter((i) => !skipped.has(i.issue));
    if (!issues.length) {
      logBot('Pulse', result.summary || 'I checked it properly — nothing needs fixing.', 'ok');
      return;
    }
    logBot('Pulse', `${issues.length} issue${issues.length === 1 ? '' : 's'} found. ${shorten(result.summary, 200)}`, 'info');
    const row = logActions([
      { label: 'Review', primary: true, title: 'See each issue with Apply / Skip', onClick: (b, r) => { disableRow(r); showReview(issues, applyFix); } },
      { label: 'Fix all', title: 'Apply every fix, one after another', onClick: (b, r) => { disableRow(r); logBot('Pulse', `Fixing all ${issues.length}…`, 'work'); applyAll(issues, applyFix).then(() => logBot('Pulse', 'Done — every fix I could make is applied.', 'ok')); } },
      { label: 'Skip', title: "Don't fix these now", onClick: (b, r) => { disableRow(r); issues.forEach((i) => skipped.add(i.issue)); logBot('Pulse', "Skipped — I won't bring these up again this session.", 'info'); } }
    ]);
    return row;
  }

  return { start, stop, buildFinished, reviewPicked, _internal: { sectionCount, textOf } };
})();
