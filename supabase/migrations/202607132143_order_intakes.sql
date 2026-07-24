create table if not exists public.order_intakes (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  email text not null,
  email_normalized text not null,
  name text,
  birth_year integer,
  birth_month integer,
  birth_day integer,
  birth_hour text,
  birth_place text,
  gender text,
  calendar_type text not null default 'solar'
    check (calendar_type in ('solar', 'lunar', 'unknown')),
  focus_area text,
  question text,
  event_one text,
  event_two text,
  payment_status text not null default 'intake_started'
    check (payment_status in ('intake_started', 'checkout_started', 'paid', 'refunded', 'cancelled')),
  checkout_provider text,
  checkout_session_id text,
  order_reference text,
  source text not null default 'paid-offer',
  language text not null default 'en',
  page_path text,
  landing_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'needs_payment', 'paid_ready', 'in_progress', 'delivered', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_intakes enable row level security;

create index if not exists order_intakes_status_idx
  on public.order_intakes(status, created_at desc);

create index if not exists order_intakes_product_idx
  on public.order_intakes(product, created_at desc);

create index if not exists order_intakes_email_idx
  on public.order_intakes(email_normalized, created_at desc);

create index if not exists order_intakes_checkout_session_idx
  on public.order_intakes(checkout_provider, checkout_session_id);

create unique index if not exists order_intakes_order_reference_unique_idx
  on public.order_intakes(order_reference)
  where order_reference is not null;

comment on table public.order_intakes is
  'Paid reading, forecast, and bundle intake records submitted from tengyunzi.com offer pages.';
