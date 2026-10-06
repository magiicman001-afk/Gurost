-- Department bots (Business Assistant): one saved calibration per user per bot.
-- Written only by the server (service role); RLS on, no policies.
create table if not exists public.user_bot_preferences (
  user_id text not null,
  bot_type text not null check (bot_type in ('sales','hr','finance','payroll','support','custom')),
  tone text,
  phrases jsonb not null default '[]'::jsonb,
  signature text,
  profile jsonb not null default '{}'::jsonb,
  last_updated timestamptz not null default now(),
  primary key (user_id, bot_type)
);
alter table public.user_bot_preferences enable row level security;
