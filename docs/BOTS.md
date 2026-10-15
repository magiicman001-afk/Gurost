# The eight Website Builder bots

Track 1 (2026-10-14). Before this, "Planner, Industry, Designer, Builder, Pulse, Research, Review, Launch" were only labels; the work sat in three functions in `bots/library-bot.js`. Now each is a small module with one job, and `library-bot.js` only calls them in order. Same input, same output (checked byte for byte on six sample builds).

| # | Bot | File | One job |
|---|---|---|---|
| 1 | planner | `bots/planner-bot.js` | Which designs, premium or plain, which sections get words |
| 2 | industry | `bots/industry-bot.js` | Industry, palette and page recipe from the request |
| 3 | designer | `bots/designer-bot.js` | The four directions, the premium look a slot starts with, the Design Memory pick |
| 4 | research | `bots/site-research-bot.js` | The words (the one copywriter model call) and the photo lookups |
| 5 | builder | `bots/builder-bot.js` | Words + owner facts + look = a page, through the quality gate |
| 6 | pulse | `bots/pulse-bot.js` | Live preview, swap messages, what the gate saw (errors, contrast, layout) |
| 7 | review | `bots/site-review-bot.js` | Scores a finished page |
| 8 | launch | `bots/launch-bot.js` | Turns a finished page into the design the person picks. Does not publish |

`site-research-bot` and `site-review-bot` have those names because `bots/research-bot.js` and `bots/review-bot.js` already belong to the Business Assistant and the App Builder.

Order: planner > industry > designer > research > builder > pulse > review > launch. Research runs before builder (not after) because a page cannot be assembled without its words and photos. In premium mode build and review are one loop, so builder > pulse > review > launch is logged once per finished design.

## Handoff log
Every pass is a row in `bot_handoffs` (`lib/bot-handoff.js`): `from_bot, to_bot, project_id, payload, created_at`. Payloads hold counts, ids and short labels only: never page HTML, never phone, email or address. A failed insert only warns once per build. Create the table with `docs/migrations/2026-10-14_bot_handoffs.sql` (run it in Supabase; RLS on, no policies). Read a project's trail: `GET /api/bots/trail/:projectId`.

## Cost
No new model calls: still one copywriter call per build, and none for "Show 2 more". No GPU. Tests: `test/eight-bots.test.js`.

## The 8 faces in the widget (Business Assistant 2.0, phases 1-2)
`public/shared/bot-widgets.js` shows the same 8 bots as a strip on the right edge. Each has a personality in `lib/bot-personalities.js` (tone, opinions, boundaries, hardcoded catchphrases, its own Deepgram voice and playback rate). Chat: `POST /api/bots/:bot/chat` (`lib/bot-chat.js`; advice and drafts only, no tools; 40 chats per account per hour). Speech: `POST /api/bots/:bot/speak` (the voice is chosen by the server from the personality; 60 per hour). Animation states: idle, working, speaking, alert; other scripts can call `GurostBotWidgets.alert(botId, text)` (phase 4 uses this).
Personality is used for conversation only. It is never added to the calls that write a website's copy or return JSON. Voice names are Deepgram Aura-2 names chosen from their list and not yet heard live: confirm each one on the first real listen.

## Proactive nudges (Business Assistant 2.0, phase 4)
`lib/proactive-engine.js`: plain rules, no model and no cost. Pulse flags a build step that failed in the last day (from `build_logs`), Review flags a design that scored low (from the variant's quality score), Launch lists what is missing before going live (contact details, not yet published), Planner gives one next step. Each line is written with the bot's own hardcoded catchphrase and carries a "Because:" evidence line. Limits: normal = 3 a day, quiet = 1, off = none; one per bot a day; never repeated; dismissed ("Got it") stays quiet for 7 days for that project; expires after 3 days; fails closed if the table is missing. The widget asks `GET /api/bots/nudges` about once a minute while a page is open (Pulse flashes, the others show a quiet dot); the person picks Normal/Quiet/Off in the bot panel. Admin: "Proactive Log" tab. Table: `docs/migrations/2026-10-15_bot_nudges.sql`.

## Memory for the 8 faces (Business Assistant 2.0, phase 5)
`lib/bot-memory.js` (the face section) on table `bot_memory` (`docs/migrations/2026-10-15_bot_memory.sql`). A row belongs to one bot or to `shared` (the whole team), and to one project or to the whole account (`project_id` empty). Kept: the last 12 exchanges with each bot (30 days), what a bot flagged unasked (`said:<kind>`, 30 days), and lasting facts picked out of chats by one cheap free-model check using the same safety filter as the department bots (1 year). A fact is stored for a project only when the person clearly spoke about it ("this website..."). Before every chat the bot reads its own earlier turns, the team's notes, this project's notes and what the department bots already learned. One pause switch (the existing `user_memory_settings`) stops all reading and saving. Controls in the bot panel, "What I remember": forget one note, forget one bot's notes, forget everything the team knows, pause. `DELETE /api/memory` (the existing forget-everything) also clears this table. Audit trail: each chat records how many notes it used, each save and forget is an event; counts only, never the text. A missing table means the bots chat as before without remembering. Cap: 300 notes per person.

## Gmail (Business Assistant 2.0, phase 6)
- Code: `lib/gmail.js` (OAuth, drafts, send, inbox list), `lib/tools/gmail.js` (3 tools the department bots can use), routes `/api/gmail/*` in `server.js`, Settings section (`public/shared/gmail-settings.js`), admin tab Connected Tools (`lib/connected-tools.js`).
- Draft only: `gmail_save_draft` puts a draft in the person's Gmail. `gmail_send_email` is `needsApproval`: it is parked in `assistant_pending_actions` and sends only when the person presses Approve (30-minute window, `lib/approvals.js`). Daily cap of 30 sends per person as a second guard.
- Inbox reading is a separate opt-in (extra Google permission `gmail.readonly`, asked only when the person ticks it). Returns sender, subject, date and a 200-character preview, max 10, never bodies. Marked as untrusted data for the model.
- Cannot delete, archive, label or change mail: there is no such tool, and the Google permissions that allow it are never requested (a test checks the code for them).
- Tokens: refresh token sealed with `SECRETS_KEY` in `gmail_connections` (RLS on, no policies). Disconnect (and account deletion) revoke at Google and delete the row.
- Honest limits: Google treats these as restricted permissions. Until the app passes Google's verification (and, for inbox reading, a security assessment), only test users added in the Google console can connect. Not verified live. The privacy policy and `docs/AI_DATA_FLOW.md` were updated first.

## Calendar (Business Assistant 2.0, phase 7)
- Code: `lib/calendar.js`, `lib/tools/calendar-google.js` (2 tools), routes `/api/calendar/*` in `server.js`, Settings section (`public/shared/calendar-settings.js`), admin Connected Tools tab. Built on the same pattern as Gmail (sealed token in `calendar_connections`, signed state tagged `cal` so a Gmail state cannot be replayed).
- The person chooses at connect time: SEE upcoming events (title, time, place only; 25 events max, 1-14 days; untrusted data) and/or ADD events. Viewing is off until chosen.
- `calendar_create_event` is `needsApproval` (parked in `assistant_pending_actions`, 30 minutes). It adds ONE event, never with guests (`sendUpdates=none`), 20 a day max. The older `calendar_event` tool (card + .ics) stays as the draft.
- No change or delete: no tool, no PUT/PATCH/DELETE call (a test scans). Honest limit: Google has no add-only permission, so the create scope technically also covers change and delete; the guarantee is our code.
- Not verified live. Needs the Google OAuth client, the second redirect, the migration and (for customers) Google verification.

## Company Scout (the research step behind "What to improve")
- Code: `lib/company-scout.js`, routes `/api/scout/*` in `server.js`, screen `public/shared/company-scout.js` (Business Assistant page), admin tab Scout Runs. Confirmed results are stored in `company_profiles.research_data`, which the findings screens (`lib/fix-it.js`) and the assistants (`lib/tools/company-profile.js`) already read.
- Reads: the owner's OWN public website (home page plus up to 4 linked pages such as About or Contact; robots.txt obeyed; every redirect hop checked by `assertSafeUrl`; HTML only; 400 KB cap) and up to 4 Brave searches (name reviews, similar businesses, name plus domain, one social handle via a `site:` search). It does NOT log in anywhere and does NOT read social networks: for a handle it sees only public search snippets.
- Nothing invented: the AI must give a source id and a word-for-word quote (25-200 chars) for each statement; the server deletes any statement whose quote is not in that source and tells the owner how many were removed. The fix list comes from `lib/industry-checklists.js` (plain rules, no AI) with the evidence found or "not found in the pages I read".
- Every statement and fix shows its source link and the date it was read, under the label "Public information - can be wrong". Nothing is used until the owner presses Confirm (and each item can be removed first).
- Cost caps: 5 runs per person per month (`SCOUT_RUNS_PER_MONTH`), a run counts only once a search or the AI was used, one run at a time, a global daily cap (`SCOUT_GLOBAL_PER_DAY`). A stuck run is closed after 10 minutes.
- Try the page reader on a real site (internet needed, no cost): `node scripts/scout-try.js https://example.com bakery_cafe`.
- Not verified live (the sandbox has no outside network). Needs the migration, `BRAVE_SEARCH_API_KEY` and OpenRouter credit.

## Weekly plan (the safe version of "thinking for itself")
- Code: `lib/weekly-plan.js`, routes `/api/weekly-plan/*` in `server.js`, screen `public/shared/weekly-plan.js` ("My week" on the Business Assistant page), admin tab Weekly Plans (counts only), migration `docs/migrations/2026-10-16_weekly_plan.sql`. This is NOT the older `week-ahead-briefing.js` (platform usage and social drafts); both exist.
- One assistant, the Planner, proposes up to 5 things for the week from three inputs the person already gave us: confirmed Scout fixes (`company_profiles.research_data`), calendar events for 7 days (ONLY if Calendar is connected and viewing is on) and open reminders (`lib/reminders.js`; there is no separate tasks store yet, so reminders are the task source).
- Every Monday 7am server time (`WEEKLY_PLAN_CRON`) for people who switched it on (OFF by default) and are on Max/Custom; once per week; a notice is sent. "Plan my week" runs it on demand.
- Nothing invented: each proposal must name one input id (F fix, E event, R reminder). The server drops any that name nothing real and writes the evidence line itself. Event and reminder text is untrusted and is told to the model as data. If the AI cannot answer, a plain rule-based plan from the top fixes and overdue reminders is shown and labelled.
- The Planner cannot act: no tool registry, no Gmail, no calendar write, no network. The person presses "Draft this" (that press is the approval) or "Skip". A draft is text on the page with a Copy button; nothing is sent or saved anywhere. A test fails if the module starts touching tools, Gmail or the calendar.
- Caps: 3 plans a week, 8 a month, a global daily cap, 10 drafts per plan. Stored 90 days; in the export and deletion list.
- Not built: saving a draft straight to Gmail or adding an event from the plan (both would go through the existing approval cards); per-person time zones for Monday.
- Not verified live: needs the migration and OpenRouter credit.
