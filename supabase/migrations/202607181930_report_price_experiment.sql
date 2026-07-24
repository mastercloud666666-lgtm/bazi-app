create table if not exists public.report_price_experiment_events (
  id uuid primary key default gen_random_uuid(),
  experiment_key text not null default 'report_pricing_v1',
  visitor_id text not null,
  variant_id text not null,
  ai_price numeric(10,2) not null,
  manual_price numeric(10,2) not null,
  event_type text not null check (event_type in ('exposure','checkout','order_created','paid')),
  product text not null check (product in ('ai_report','personal_reading')),
  trade_no text,
  revenue numeric(10,2) not null default 0,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_price_events_created_idx on public.report_price_experiment_events (created_at desc);
create index if not exists report_price_events_variant_idx on public.report_price_experiment_events (variant_id, product, event_type);
create unique index if not exists report_price_events_exposure_once_idx
  on public.report_price_experiment_events (experiment_key, visitor_id, product, event_type)
  where event_type = 'exposure';
create unique index if not exists report_price_events_paid_once_idx
  on public.report_price_experiment_events (trade_no, event_type)
  where event_type = 'paid' and trade_no is not null;
create unique index if not exists report_price_events_order_once_idx
  on public.report_price_experiment_events (trade_no, event_type)
  where event_type = 'order_created' and trade_no is not null;

alter table public.report_price_experiment_events enable row level security;
revoke all on public.report_price_experiment_events from anon, authenticated;
