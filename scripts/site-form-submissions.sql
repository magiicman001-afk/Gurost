-- Contact and order form submissions from generated sites.
-- Written only by the server (service role); RLS on, no policies, so nothing else can read or write.
create table if not exists public.site_form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  user_id text,
  kind text not null check (kind in ('contact', 'order')),
  fields jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists site_form_submissions_project_idx on public.site_form_submissions (project_id, created_at desc);
alter table public.site_form_submissions enable row level security;

-- Added with the submissions page: read/unread, and a lookup by owner.
alter table public.site_form_submissions add column if not exists read_at timestamptz;
create index if not exists site_form_submissions_user_idx on public.site_form_submissions (user_id, read_at);
