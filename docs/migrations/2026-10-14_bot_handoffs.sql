-- Bot handoffs: one row each time one of the eight website-builder bots passes its work to the next.
-- planner -> industry -> designer -> research -> builder -> pulse -> review -> launch (see docs/BOTS.md).
-- Additive only. The payload holds counts, ids and short labels, never page HTML and never the owner's contact details.
-- Until this is run the builder still works: a failed insert only prints a warning.
create table if not exists public.bot_handoffs (
  id bigint generated always as identity primary key,
  from_bot text not null,
  to_bot text not null,
  project_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bot_handoffs_project_idx on public.bot_handoffs (project_id, created_at);
create index if not exists bot_handoffs_created_idx on public.bot_handoffs (created_at desc);
alter table public.bot_handoffs enable row level security;  -- no policies: only the app server (service role) reads or writes
-- ROLLBACK: drop table public.bot_handoffs;
