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
