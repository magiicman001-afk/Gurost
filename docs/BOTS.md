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
