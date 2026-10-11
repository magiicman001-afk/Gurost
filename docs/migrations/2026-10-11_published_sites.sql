-- Website Builder V2, commit 4: the live (published) copy of a site.
-- One project = one live site. `published_html` holds the FROZEN pages (every page's HTML plus the 404 page),
-- so editing the draft never changes the live site until the owner launches again.
-- Apply with the Supabase SQL editor or `apply_migration`. Safe to run twice.
create table if not exists public.published_sites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project_id text not null unique,
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  domain text unique,
  published_html jsonb not null,
  version int not null default 1,
  status text not null default 'live' check (status in ('live', 'unpublished', 'taken_down')),
  takedown_reason text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists published_sites_user_idx on public.published_sites (user_id);

-- Only the server (service role) reads or writes this table: RLS on, no public policy.
alter table public.published_sites enable row level security;
