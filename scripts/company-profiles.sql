-- Company profile (Business Assistant): one saved profile per user.
-- Written only by the server (service role); RLS on, no policies.
-- research_data is filled by the research step (a later commit).
create table if not exists public.company_profiles (
  user_id text primary key,
  name text not null,
  website text not null,
  industry text not null,
  socials jsonb not null default '{}'::jsonb,
  type text not null check (type in ('b2b','b2c','both')),
  target text not null default '',
  research_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.company_profiles enable row level security;
