-- Proactive intelligence (Business Assistant 2.0, phase 4): the things a bot says without being asked, and each person's
-- setting for how often. A nudge holds a short sentence the rules wrote (no model, no cost) and the evidence line it came from.
-- Until this is run nobody is nudged (the engine fails closed); everything else keeps working.
create table if not exists public.bot_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project_id text,
  bot_id text not null,
  kind text not null,
  text text not null,
  why text,
  severity text not null default 'note',          -- 'alert' (flashes) or 'note' (quiet dot)
  dedupe_key text not null,
  status text not null default 'new',             -- new | seen | dismissed
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  expires_at timestamptz not null
);
create unique index if not exists bot_nudges_dedupe_idx on public.bot_nudges (user_id, dedupe_key);
create index if not exists bot_nudges_user_created_idx on public.bot_nudges (user_id, created_at desc);
alter table public.bot_nudges enable row level security;  -- no policies: only the app server (service role) reads or writes

create table if not exists public.bot_nudge_settings (
  user_id text primary key,
  mode text not null default 'normal',            -- normal (up to 3 a day) | quiet (1 a day) | off
  updated_at timestamptz not null default now()
);
alter table public.bot_nudge_settings enable row level security;
-- ROLLBACK: drop table public.bot_nudges; drop table public.bot_nudge_settings;
