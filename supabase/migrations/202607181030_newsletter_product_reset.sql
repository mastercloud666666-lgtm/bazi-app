alter table public.newsletter_subscribers
  add column if not exists free_daily_enabled boolean not null default false,
  add column if not exists timezone text not null default 'Asia/Taipei',
  add column if not exists delivery_hour smallint not null default 7,
  add column if not exists last_free_daily_date date;

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_delivery_hour_check;

alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_delivery_hour_check
  check (delivery_hour between 0 and 23);

create index if not exists newsletter_subscribers_free_daily_idx
  on public.newsletter_subscribers(free_daily_enabled, status, delivery_hour)
  where free_daily_enabled = true;

alter table public.daily_almanac_profiles
  add column if not exists last_sent_solar_month text;

comment on table public.daily_almanac_profiles is
  'Authenticated birth profile and delivery preferences for the paid Personal Monthly BaZi Forecast.';

create table if not exists public.free_daily_almanac_deliveries (
  id bigint generated always as identity primary key,
  subscriber_id uuid not null references public.newsletter_subscribers(id) on delete cascade,
  email text not null,
  local_date date not null,
  timezone text not null,
  language text not null default 'en',
  status text not null default 'queued'
    check (status in (
      'queued',
      'sending',
      'sent',
      'delivered',
      'delivery_delayed',
      'failed',
      'bounced',
      'complained',
      'suppressed',
      'skipped'
    )),
  subject text,
  provider_message_id text,
  almanac_data jsonb not null default '{}'::jsonb,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  last_attempt_at timestamptz,
  last_event_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscriber_id, local_date)
);

create table if not exists public.monthly_bazi_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  solar_month_key text not null,
  timezone text not null,
  language text not null default 'en',
  status text not null default 'queued'
    check (status in (
      'queued',
      'sending',
      'sent',
      'delivered',
      'delivery_delayed',
      'failed',
      'bounced',
      'complained',
      'suppressed',
      'skipped'
    )),
  subject text,
  provider_message_id text,
  forecast_data jsonb not null default '{}'::jsonb,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  last_attempt_at timestamptz,
  last_event_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, solar_month_key)
);

alter table public.free_daily_almanac_deliveries enable row level security;
alter table public.monthly_bazi_deliveries enable row level security;

drop policy if exists "users read own monthly bazi deliveries" on public.monthly_bazi_deliveries;
create policy "users read own monthly bazi deliveries" on public.monthly_bazi_deliveries
  for select to authenticated using (auth.uid() = user_id);

create index if not exists free_daily_almanac_deliveries_status_idx
  on public.free_daily_almanac_deliveries(status, local_date, created_at);

create index if not exists free_daily_almanac_deliveries_provider_idx
  on public.free_daily_almanac_deliveries(provider_message_id)
  where provider_message_id is not null;

create index if not exists monthly_bazi_deliveries_status_idx
  on public.monthly_bazi_deliveries(status, solar_month_key, created_at);

create index if not exists monthly_bazi_deliveries_provider_idx
  on public.monthly_bazi_deliveries(provider_message_id)
  where provider_message_id is not null;

comment on table public.free_daily_almanac_deliveries is
  'Idempotent delivery history for the free general Daily Almanac email.';

comment on table public.monthly_bazi_deliveries is
  'Idempotent per-member delivery history for the paid Personal Monthly BaZi Forecast.';

do $$
declare
  job record;
begin
  for job in
    select jobid from cron.job
    where jobname in (
      'tengyunzi-daily-almanac-hourly',
      'tengyunzi-free-daily-almanac',
      'tengyunzi-monthly-bazi-forecast'
    )
  loop
    perform cron.unschedule(job.jobid);
  end loop;
end
$$;

select cron.schedule(
  'tengyunzi-free-daily-almanac',
  '5,20,35,50 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_project_url') || '/functions/v1/daily-almanac-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key')
    ),
    body := '{"source":"supabase-cron","product":"free-daily-almanac"}'::jsonb
  );
  $$
);

select cron.schedule(
  'tengyunzi-monthly-bazi-forecast',
  '8,23,38,53 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_project_url') || '/functions/v1/monthly-bazi-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key')
    ),
    body := '{"source":"supabase-cron","product":"personal-monthly-bazi"}'::jsonb
  );
  $$
);
