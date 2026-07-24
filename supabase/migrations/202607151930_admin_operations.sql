create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_normalized text not null unique,
  display_name text,
  password_salt text not null,
  password_hash text not null,
  password_iterations integer not null default 600000 check (password_iterations between 100000 and 1500000),
  permissions text[] not null default '{}'::text[],
  active boolean not null default true,
  must_change_password boolean not null default false,
  session_version integer not null default 1,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  last_login_ip text,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (username_normalized = lower(trim(username))),
  check (username_normalized ~ '^[a-z0-9._-]{3,64}$')
);

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid references public.admin_users(id) on delete set null,
  username text not null,
  action text not null,
  target_type text,
  target_id text,
  ip_address text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preheader text,
  body_text text not null,
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'failed', 'cancelled')),
  audience_filter jsonb not null default '{"status":"subscribed"}'::jsonb,
  recipients_total integer not null default 0,
  recipients_sent integer not null default 0,
  recipients_failed integer not null default 0,
  provider text,
  error_message text,
  created_by uuid references public.admin_users(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_deliveries (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, email)
);

alter table public.english_ai_reports
  add column if not exists is_test boolean not null default false;

alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_deliveries enable row level security;

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs(created_at desc);
create index if not exists newsletter_campaigns_created_idx
  on public.newsletter_campaigns(created_at desc);
create index if not exists newsletter_deliveries_campaign_status_idx
  on public.newsletter_deliveries(campaign_id, status, created_at);
create index if not exists english_ai_reports_test_idx
  on public.english_ai_reports(is_test, created_at desc);

comment on table public.admin_users is
  'Password-hashed operations accounts for the Tengyunzi administration dashboard.';
comment on table public.admin_audit_logs is
  'Security and operations audit trail for privileged dashboard actions.';
comment on table public.newsletter_campaigns is
  'Newsletter drafts and send progress created from the Tengyunzi administration dashboard.';
