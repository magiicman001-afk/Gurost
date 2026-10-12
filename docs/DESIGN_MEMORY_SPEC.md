# Design Memory ("the shelf")

Status 2026-10-12 (docs sweep): **BUILT** behind `DESIGN_MEMORY=1` (off by default): `lib/design-memory.js`, table `build_memory` (`docs/migrations/2026-10-12_build_memory.sql`, must be run in Supabase), wired in `bots/library-bot.js`, admin Memory tab. Not yet verified with real builds. Original status: spec written 2026-10-12, no code yet.
Depends on: `docs/PREMIUM_PIPELINE_SPEC.md` (the 0-100 premium score). Without that score there is nothing honest to learn from.

## 1. What it does, in one paragraph

Every library build writes one row to a table, `build_memory`: the industry, which sections and variants were used, the
palette, the premium score, and later what the owner did with the site (kept, edited, deleted). After enough builds the
system knows which combinations score and survive best per industry, and a new build starts from the best known one
instead of a fixed default. Admins can see the top combinations per industry.

## 2. Table

```sql
create table build_memory (
  id            uuid primary key default gen_random_uuid(),
  industry      text not null,            -- industry key from lib/industry-design.js (e.g. "cafe")
  sections      jsonb not null,           -- [{"id":"hero","variant":"B"}, {"id":"gallery","variant":"C"}, ...]
  palette       text not null,            -- palette id from lib/sections/palettes.json
  premium_score int  not null check (premium_score between 0 and 100),
  user_action   text check (user_action in ('kept','edited','deleted')),   -- null until known
  created_at    timestamptz default now()
);
create index build_memory_industry_idx on build_memory (industry, premium_score desc);
```

Two additions beyond Irfan's schema, both needed to make the table work (say if you do not want them):
- `project_id text` - so a later "kept / edited / deleted" updates the SAME row instead of adding a second one.
  It is a project id, not a person: no user id, email or business name is stored (see section 7).
- `user_action_at timestamptz` - when the action was recorded, to tell a quick delete from a late one.

Row level security on, no public policies: only the server (service key) reads or writes it.

## 3. What gets logged, and when

| Moment | Write |
|---|---|
| A design is built and passes the gate (Premium Pipeline) | insert row: industry, sections, palette, score, `user_action` null |
| The owner picks the design and carries on | `kept` |
| The owner changes it with Pulse | `edited` (the first edit only; later edits do not change it) |
| The owner deletes the project | `deleted` |

Rule for "kept": the owner is still using the design 24 hours after picking it with no delete. Anything earlier stays null.
A design that was built but never picked is stored with `user_action` null and is NOT counted as a loss: the owner
chose a different one of the four, which says little about its quality.
Logging is fire-and-forget: if the table is missing or Supabase is down the build carries on. It must never slow a build.

## 4. How it learns (deliberately simple)

Per industry, for each combination (the section/variant list plus the palette) with at least N samples:

    combo_value = mean(premium_score) + 8 * kept_rate - 12 * deleted_rate        (edited counts as neutral)

- N = 5 builds before a combination is trusted, 50 builds in the industry before the system overrides the default at all
  (Irfan's "after 50+ builds"). Below that, the Premium Pipeline's fixed looks are used unchanged.
- Exploration: 1 build in 5 still uses a fixed premium look, so a new good combination can be found and the system does
  not lock onto its first lucky winner.
- It only chooses among combinations that are already allowed by the recipes and pass the premium gate. It can never pick
  something the gate would reject, so it cannot make quality worse than the fixed looks.
- Example of the output: "Cafe + Hero B + Gallery C + warm = 92/100".

The weights (8 and 12) are a starting guess. They are tuned after the first real data, the same way the pass mark of 70 is.

## 5. How a new build uses it

In `bots/library-bot.js`, before the directions are chosen: ask `lib/design-memory.js` for the best combination for the
industry. If it returns one (enough data, not an exploration build), use it as direction 1 of the 4; directions 2-4 stay
the fixed looks so the owner still gets variety. Behind a flag, `DESIGN_MEMORY=1`, off by default.

## 6. Admin view

A read-only table for the Admin Area: top 5 combinations per industry (score, builds, kept rate). The Admin Area is Phase 3
and is not started; until it exists the same numbers are one SQL query, saved in `docs/` for Irfan to run in Supabase.

## 7. Privacy and honesty

- No names, emails, prompts, copy or images are stored. Only structure: industry, section ids, palette, score, action.
- It is not personal data, but it is behavioural data about how people use the product. The privacy policy needs one line
  ("we record which design layouts are kept or changed, without your content, to improve defaults"). Add it before launch.
- The GDPR erasure route needs no change (no user id), but deleting a project still writes `deleted`.
- A score is Gurost's own measure of quality, not a measure of what customers like. `kept` and `deleted` are the only signals
  from real people, which is why they are weighted in. Early numbers (under 50 builds) mean little and are never shown as proof.

## 8. Build plan (when approved)

1. Migration for `build_memory` plus `lib/design-memory.js` (`record`, `markAction`, `best`) with tests on a fake client.
2. Logging calls in the build, pick, edit and delete routes (fire-and-forget).
3. `best()` used by the library bot behind `DESIGN_MEMORY=1`; test that it never returns a combination the gate rejects.
4. The saved SQL query for the admin view.

Files touched in step 2-3: `server.js`, `bots/library-bot.js`, `lib/design-memory.js` (new). That is over the 3-file rule
together with the migration, so it needs Irfan's go-ahead per step.

## 9. Decisions for Irfan

1. OK to add `project_id` and `user_action_at` to the table?
2. 50 builds before it overrides the defaults, and 1 in 5 builds still exploring - agreed?
3. "Kept" means still used after 24 hours - agreed?
4. Build order: after the Premium Pipeline (it needs the score). Agreed?
