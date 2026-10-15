-- Memory for the 8 assistant faces (Business Assistant 2.0, phase 5).
-- One row = one thing remembered: a turn of conversation with one bot, something a bot told you unasked, or a lasting fact.
--   bot_id     = the bot that owns it, or 'shared' (the whole team can use it)
--   project_id = the project it belongs to, or '' for the whole account
--   memory_key = 'chat:<ms>:u|a' (a conversation turn, kept 30 days), 'said:<kind>' (what a bot flagged, 30 days) or a fact name (1 year)
-- The person can pause memory (the same switch as the department bots), forget one row, one bot's rows, or everything.
-- Until this is run the chat works exactly as before, only without remembering (it never errors because of this table).
create table if not exists public.bot_memory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project_id text not null default '',
  bot_id text not null,
  memory_key text not null,
  memory_value text not null,
  source text not null default 'said',          -- said | noticed
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz not null
);
create unique index if not exists bot_memory_unique_idx on public.bot_memory (user_id, project_id, bot_id, memory_key);
create index if not exists bot_memory_user_bot_idx on public.bot_memory (user_id, bot_id, created_at desc);
create index if not exists bot_memory_expires_idx on public.bot_memory (expires_at);
alter table public.bot_memory enable row level security;  -- no policies: only the app server (service role) reads or writes
-- ROLLBACK: drop table public.bot_memory;
