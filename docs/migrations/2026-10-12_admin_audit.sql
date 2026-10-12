-- Admin Area Phase 2: every admin write (team changes, ops actions) is recorded here. Additive only.
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  admin_id text,
  admin_name text,
  role text,
  action text not null,
  target text,
  reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit (created_at desc);
alter table public.admin_audit enable row level security;  -- the app server (service role) is the only reader
-- ROLLBACK: drop table public.admin_audit;
