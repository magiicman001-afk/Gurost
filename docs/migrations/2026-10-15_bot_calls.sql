-- Bot video calls (Business Assistant 2.0, phase 3). One row per call: who, which bot, how long, and whether the
-- person agreed to a recording (the recording itself is saved on the person's own device, never on our servers).
-- The monthly minutes cap reads this table. Until it is created, calls stay switched off (the app refuses to start
-- an unmetered call). No transcript, no audio, no video is stored here.
create table if not exists public.bot_calls (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  bot_id text not null,
  room text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  seconds integer,
  recording_consent boolean not null default false
);
create index if not exists bot_calls_user_started_idx on public.bot_calls (user_id, started_at desc);
alter table public.bot_calls enable row level security;  -- no policies: only the app server (service role) reads or writes
-- ROLLBACK: drop table public.bot_calls;
