-- Design Memory (docs/DESIGN_MEMORY_SPEC.md): one row per scored design, so the builder can learn which combinations score and survive.
-- No names, emails, prompts, copy or images are stored: structure only. Safe to run twice.
-- Beyond the spec's columns: project_id + variant_id (so a later pick / edit / delete updates the SAME row), picked_at (when the
-- owner picked this design; "kept" is settled 24 hours later) and user_action_at.
create table if not exists public.build_memory (
  id uuid primary key default gen_random_uuid(),
  industry text not null,                       -- palette id from lib/sections/palettes.json (cafe, law, salon, trades, health, tech)
  sections jsonb not null,                      -- [{"id":"hero","variant":"b"}, ...]
  palette text not null,
  premium_score int not null check (premium_score between 0 and 100),
  user_action text check (user_action in ('kept', 'edited', 'deleted')),
  project_id text,
  variant_id text,
  picked_at timestamptz,
  user_action_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, variant_id)
);

create index if not exists build_memory_industry_idx on public.build_memory (industry, premium_score desc);

-- Only the server (service role) reads or writes this table: RLS on, no public policy.
alter table public.build_memory enable row level security;
