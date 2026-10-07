-- Proactive suggestions (Business Assistant): at most 2 per user per day, enforced
-- by the unique (user_id, day_key, slot) key with slot limited to 1 or 2.
-- Written and read only by the server (service role); RLS on, no policies.
create table if not exists public.proactive_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  suggestion_type text not null,
  content text not null,
  payload jsonb not null default '{}'::jsonb,
  day_key text not null,
  slot int not null check (slot between 1 and 2),
  action text not null default 'pending' check (action in ('pending','accepted','declined','snoozed','ignored')),
  shown_at timestamptz not null default now(),
  decided_at timestamptz,
  snooze_until timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, day_key, slot)
);
create index if not exists proactive_suggestions_user on public.proactive_suggestions (user_id, created_at desc);
alter table public.proactive_suggestions enable row level security;
