create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  name text,
  status text not null default 'subscribed'
    check (status in ('subscribed', 'unsubscribed', 'bounced', 'complained')),
  source text not null default 'website',
  language text,
  page_path text,
  landing_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  tags text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  consent_at timestamptz,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers(status, subscribed_at desc);

create index if not exists newsletter_subscribers_source_idx
  on public.newsletter_subscribers(source, subscribed_at desc);

create index if not exists newsletter_subscribers_utm_source_idx
  on public.newsletter_subscribers(utm_source, subscribed_at desc);

comment on table public.newsletter_subscribers is
  'Email subscribers captured from tengyunzi.com newsletter forms.';
