-- S3b: one row per signed-in browser (cookie login). Additive only.
-- The refresh cookie is "<id>.<random>"; only sha256(random) is stored here, never the cookie itself.
-- Each refresh issues a new random and bumps token_version. An old one coming back means the cookie was
-- copied: the whole session is revoked (theft detection). Logout revokes one row; "sign out everywhere"
-- and a password change revoke all of a user's rows.
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  refresh_token text not null,              -- sha256 hex of the cookie's random part, never the raw value
  token_version integer not null default 1, -- bumped on every refresh
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,          -- 30 days after sign-in; a refresh does not extend it
  last_used_at timestamptz not null default now(),
  revoked boolean not null default false
);
create index if not exists user_sessions_user_idx on public.user_sessions (user_id) where not revoked;
create index if not exists user_sessions_expires_idx on public.user_sessions (expires_at);

-- Server only: RLS on with no policies, so the browser's anon / authenticated keys see nothing.
-- The app server uses the service role, which bypasses RLS.
alter table public.user_sessions enable row level security;
revoke all on public.user_sessions from anon, authenticated;

-- ROLLBACK: drop table public.user_sessions;
