-- Admin Area Phase 1 (docs/ADMIN_AREA_SPEC.md). Additive only; nothing is dropped or rewritten.
-- 1) Roles. Every EXISTING admin account becomes OWNER so Irfan is never locked out; new rows default to the
--    least powerful role (viewer), never owner.
alter table public.admin_accounts add column if not exists role text;
update public.admin_accounts set role = 'owner' where role is null;
alter table public.admin_accounts alter column role set default 'viewer';
alter table public.admin_accounts alter column role set not null;
alter table public.admin_accounts drop constraint if exists admin_accounts_role_check;
alter table public.admin_accounts add constraint admin_accounts_role_check
  check (role in ('owner','admin','team_lead','engineer','viewer'));
-- 2) Builds log: one row per Website Builder build attempt (build_events is the plan-limit counter; left alone).
create table if not exists public.build_log (
  id bigint generated always as identity primary key,
  project_id text,
  user_id text,
  kind text not null default 'website',
  status text not null check (status in ('ok','failed')),
  error text,
  designs int,
  best_score int,
  seconds numeric,
  created_at timestamptz not null default now()
);
create index if not exists build_log_created_idx on public.build_log (created_at desc);
alter table public.build_log enable row level security;
-- ROLLBACK: alter table public.admin_accounts drop constraint admin_accounts_role_check;
--   alter table public.admin_accounts drop column role;  drop table public.build_log;
