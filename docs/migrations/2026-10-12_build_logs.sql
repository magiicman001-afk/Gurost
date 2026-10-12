-- Escalation hierarchy + full logging (docs/ESCALATION_HIERARCHY_SPEC.md). Additive only.
-- build_logs = one row per bot action. (build_log, singular, is the Admin Phase 1 per-build summary; both stay.)
create table if not exists public.build_logs (
  id bigint generated always as identity primary key,
  project_id text,
  build_id text,
  user_id text,            -- beyond the spec: lets the admin filter by user and lets a user read only their own log
  bot text not null,       -- builder | fixer | manager | senior (the chain) and copywriter | photographer | reviewer (support bots)
  task text,
  decision text,
  reason text,
  time_ms integer,
  result text not null check (result in ('success','fail','escalate')),
  next_bot text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists build_logs_project_idx on public.build_logs (project_id, created_at);
create index if not exists build_logs_build_idx on public.build_logs (build_id);
create index if not exists build_logs_created_idx on public.build_logs (created_at desc);
alter table public.build_logs enable row level security;  -- the app server (service role) is the only reader
-- ROLLBACK: drop table public.build_logs;
