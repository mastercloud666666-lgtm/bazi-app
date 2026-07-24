alter table public.newsletter_deliveries
  drop constraint if exists newsletter_deliveries_status_check;

alter table public.newsletter_deliveries
  add constraint newsletter_deliveries_status_check
  check (status in (
    'queued',
    'sent',
    'delivered',
    'delivery_delayed',
    'failed',
    'bounced',
    'complained',
    'suppressed',
    'skipped'
  ));

alter table public.newsletter_deliveries
  add column if not exists last_event_at timestamptz,
  add column if not exists delivered_at timestamptz;

create table if not exists public.resend_webhook_events (
  id text primary key,
  event_type text not null,
  email_id text,
  recipient text,
  event_created_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.resend_webhook_events enable row level security;

create index if not exists resend_webhook_events_email_idx
  on public.resend_webhook_events(email_id, event_created_at desc);

comment on table public.resend_webhook_events is
  'Verified Resend email events retained for deduplication and delivery diagnostics.';
