-- Business Assistant persistent memory. Written only by the server (service
-- role); RLS on, no policies, same as user_bot_preferences. user_id is text.

-- Layer 1 + 4: every message, so a reload or a new device resumes the chat.
create table if not exists public.user_bot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  bot_type text not null,
  role text not null check (role in ('user','assistant','tool')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists user_bot_conversations_lookup
  on public.user_bot_conversations (user_id, bot_type, created_at desc);
alter table public.user_bot_conversations enable row level security;

-- Layers 2 + 3: facts, preferences, patterns. Shared by every bot of a user.
create table if not exists public.user_bot_memory (
  user_id text not null,
  memory_type text not null check (memory_type in ('fact','preference','pattern')),
  key text not null,
  value text not null,
  importance int not null default 3 check (importance between 1 and 5),
  source_bot text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (user_id, key)
);
alter table public.user_bot_memory enable row level security;

-- Company research results, per user (and per project when there is one).
create table if not exists public.company_research (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project_id text,
  research_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index if not exists company_research_owner
  on public.company_research (user_id, coalesce(project_id, ''));
alter table public.company_research enable row level security;

-- The user's memory switch. paused = bots neither read nor write memory.
create table if not exists public.user_memory_settings (
  user_id text primary key,
  paused boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.user_memory_settings enable row level security;
