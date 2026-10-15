-- Company Scout: one row per run, plus the research_data column the findings screens read.
-- Run once in the Supabase SQL editor. Safe to run twice.
-- RLS on with NO policies and no grants for anon/authenticated: only the server (service role) can read it.
create table if not exists public.scout_runs (
  id uuid primary key,
  user_id uuid not null,
  status text not null default 'running',     -- running | ready | confirmed | discarded | failed
  counted boolean not null default false,     -- true once something that costs money was used (counts toward the monthly limit)
  searches integer not null default 0,
  pages integer not null default 0,
  secs integer,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  confirmed_at timestamptz
);
create index if not exists scout_runs_user_created_idx on public.scout_runs (user_id, created_at desc);
alter table public.scout_runs enable row level security;
revoke all on public.scout_runs from anon, authenticated;

-- Where a CONFIRMED scout is stored (the Fix-it screens and the assistants read it). Harmless if it already exists.
alter table public.company_profiles add column if not exists research_data jsonb;
