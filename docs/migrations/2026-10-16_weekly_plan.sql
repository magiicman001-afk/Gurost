-- Weekly plan: one row per plan the Planner made, plus each person's on/off switch.
-- Run once in the Supabase SQL editor. Safe to run twice.
-- RLS on with NO policies and no grants for anon/authenticated: only the server (service role) can read it.
create table if not exists public.weekly_plans (
  id uuid primary key,
  user_id uuid not null,
  week_start date not null,                    -- the Monday (UTC) of the week the plan is for
  status text not null default 'ready',        -- ready | failed
  source text not null default 'ai',           -- ai | rules (rules = the plain fallback when the AI could not answer)
  trigger text not null default 'manual',      -- monday | manual
  items jsonb not null default '[]'::jsonb,    -- proposals: title, why, kind, evidence, source, status (proposed|approved|skipped|drafted), draft
  inputs jsonb,                                -- counts only: which inputs were used
  notes jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists weekly_plans_user_created_idx on public.weekly_plans (user_id, created_at desc);
alter table public.weekly_plans enable row level security;
revoke all on public.weekly_plans from anon, authenticated;

create table if not exists public.weekly_plan_settings (
  user_id uuid primary key,
  enabled boolean not null default false,      -- the Monday plan is OFF until the person switches it on
  updated_at timestamptz not null default now()
);
alter table public.weekly_plan_settings enable row level security;
revoke all on public.weekly_plan_settings from anon, authenticated;
