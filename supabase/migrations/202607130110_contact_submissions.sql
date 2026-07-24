create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  email_normalized text not null,
  topic text not null default 'general',
  message text not null,
  source text not null default 'contact-page',
  language text,
  page_path text,
  landing_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'replied', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

create index if not exists contact_submissions_status_idx
  on public.contact_submissions(status, created_at desc);

create index if not exists contact_submissions_email_idx
  on public.contact_submissions(email_normalized, created_at desc);

create index if not exists contact_submissions_source_idx
  on public.contact_submissions(source, created_at desc);

comment on table public.contact_submissions is
  'Contact form messages captured from tengyunzi.com pages.';
