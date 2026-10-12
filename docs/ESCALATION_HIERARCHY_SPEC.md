# Escalation hierarchy and full build logging

Written 2026-10-12 by Web Claude from Irfan's brief. Applies to **library builds** (the Website Builder section library). It rides on the Premium Pipeline: while `PREMIUM_PIPELINE` is off there is no quality score, so there is nothing to escalate; the logging still works (builder, copywriter, photographer, reviewer entries).

## 1. The chain (each level gets ONE attempt per design slot)

| Level | Bot | Gets | Does | Escalates when |
|---|---|---|---|---|
| 1 | **builder** | the brief | builds the slot's look from the section library and scores it (Premium score, pass mark 70) | score < 70, or the look cannot be built |
| 2 | **fixer** | the failed score reasons (codes) | a *targeted* repair of the same look: retry the photo search with the palette's own words, swap the A/B/C variant of the sections the reason points at, add or drop one section | the repaired page still scores < 70 |
| 3 | **manager** | every earlier attempt | **replans**: a different look (different section mix and variants); if the palette's own looks are used up, a look from a neutral palette (tech or law), never a clashing one | still < 70 |
| 4 | **senior** | the full build context | deep dive (section 5); one last rebuild if a specific fix exists; otherwise a human-readable report, flagged in the admin | always final |

All four are **code, no model call** (like the existing Premium loop): fast, free, repeatable. The best attempt of any level is what ships, with the one-line quality note, exactly as the Premium Pipeline does today. Nothing is ever shown silently failing and nothing is ever shown empty.

## 2. Every action logs
One entry per action: `bot, task, decision, reason, time_ms, result (success|fail|escalate), next_bot, details`, stored in `build_logs` (plus `project_id, build_id, user_id, created_at`). Support bots log too: **copywriter** (the model call that writes the words), **photographer** (stock-photo search), **reviewer** (each score). Logging is fire-and-forget: a database problem never slows or breaks a build. `details` holds numbers and short strings only, never page HTML and never secrets.

## 3. User-visible log
Builder page: a "Show build log" button opens a full-screen timeline: every entry, colour-coded (green success, orange fail, blue escalate), filter by bot and by result, **Export JSON**, **Share** (the phone's share sheet, else copy). New entries arrive live over the existing socket. Read route: `GET /api/project/:id/build-log` (owner only).

## 4. Admin view
Tab **Build Logs**: all builds, all bots; filter by project, user, bot, result; each build's chain shown in order; export JSON. Senior reports that could not fix a build are flagged. Needs the `builds` section (Owner, Admin, Team Lead, Engineer).

## 5. Senior engineer, in detail
Reads every earlier entry of the slot, inspects the best attempt's HTML and runs: **HTML** (doctype, lang, title, one h1, balanced tags), **CSS** (style blocks balanced, no empty rules), **images** (no unfilled `IMG_n`, no empty `src`), **links** (no `href="#"`, in-page anchors exist), **contrast** and **mobile** (from the score), **schema** (every section's required slots are filled, against `manifest.json`), **security** (no inline `javascript:` or event handlers, no scripts from unknown hosts, `target=_blank` has `rel=noopener`). It then ranks the 24 looks by closeness to the page and scores the closest. Outcome: *salvageable* (a specific change, tried once; kept only if the score improves) or *not salvageable* (a plain-language report for Irfan, written to `build_logs` with `details.flagged=true`).

## 6. Flags
`ESCALATION_HIERARCHY` (default on; `0` returns to the plain Premium loop), `SENIOR_BOT_ENABLED` (default on), `BUILD_LOGS_VISIBLE` (default on; `0` hides the user's button and route), `BUILD_LOGS_ADMIN` (always on).

## 7. Honest limits
- The chain is deterministic code. It repairs what the score can name (photos, section count, rhythm, variants); it cannot rewrite weak words. That would be a model call and is a later option.
- It only runs when `PREMIUM_PIPELINE=1`.
- Each extra level is one more build (a few seconds in the browser); worst case a slot builds four times.
