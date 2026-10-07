-- Audit trail for the Business Assistant: one row per tool call, approval
-- decision, model choice, error and memory change. Never holds passwords, card
-- numbers or other secrets, and never a full email/message body (see lib/audit.js).
-- Written and read only by the server (service role); RLS on, no policies.
create table if not exists public.business_assistant_audit (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  bot_type text,
  event text not null check (event in ('chat','tool_call','approval','memory','error')),
  tool_used text,
  ok boolean,
  input text,
  output text,
  model_requested text,
  model_used text,
  approved_by_user boolean,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  ip_address text
);
create index if not exists business_assistant_audit_created on public.business_assistant_audit (created_at desc);
create index if not exists business_assistant_audit_user on public.business_assistant_audit (user_id, created_at desc);
alter table public.business_assistant_audit enable row level security;
