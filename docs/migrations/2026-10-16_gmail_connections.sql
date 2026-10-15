-- Business Assistant 2.0, phase 6: one Gmail connection per person.
-- Run once in the Supabase SQL editor. Safe to run twice.
-- refresh_token_sealed is encrypted by the server (AES-256-GCM, SECRETS_KEY); the database never holds a usable token.
-- RLS on with NO policies and no grants for anon/authenticated: only the server (service role) can read it.
create table if not exists public.gmail_connections (
  user_id uuid primary key,
  email text,
  scopes text not null default '',
  read_inbox boolean not null default false,
  refresh_token_sealed text not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gmail_connections enable row level security;
revoke all on public.gmail_connections from anon, authenticated;
