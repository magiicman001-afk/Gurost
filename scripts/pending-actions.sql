-- Approval gates (Business Assistant): an action a bot wants to take (send an
-- email, create an event...) waits here until the user approves, edits or
-- cancels it. Written only by the server (service role); RLS on, no policies.
create table if not exists public.assistant_pending_actions (
  id uuid primary key,
  user_id text not null,
  bot_type text not null,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  summary text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','done','failed','cancelled','expired')),
  result jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz not null
);
create index if not exists assistant_pending_actions_user
  on public.assistant_pending_actions (user_id, status, created_at desc);
alter table public.assistant_pending_actions enable row level security;
