alter table public.newsletter_subscribers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists newsletter_subscribers_user_idx
  on public.newsletter_subscribers(user_id)
  where user_id is not null;

create table if not exists public.daily_almanac_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  birth_year integer not null check (birth_year between 1900 and 2100),
  birth_month smallint not null check (birth_month between 1 and 12),
  birth_day smallint not null check (birth_day between 1 and 31),
  birth_hour smallint not null default -1 check (birth_hour between -1 and 23),
  gender text not null default 'unspecified'
    check (gender in ('female', 'male', 'unspecified')),
  timezone text not null default 'Asia/Taipei',
  language text not null default 'en'
    check (language in ('en', 'zh-Hans', 'zh-Hant')),
  delivery_hour smallint not null default 7 check (delivery_hour between 0 and 23),
  enabled boolean not null default true,
  consent_at timestamptz not null default now(),
  last_sent_local_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_almanac_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  local_date date not null,
  timezone text not null,
  language text not null,
  status text not null default 'queued'
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
    )),
  subject text,
  provider_message_id text,
  almanac_data jsonb not null default '{}'::jsonb,
  personalization_data jsonb not null default '{}'::jsonb,
  error_message text,
  last_event_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_date)
);

alter table public.daily_almanac_profiles enable row level security;
alter table public.daily_almanac_deliveries enable row level security;

drop policy if exists "users read own daily almanac profile" on public.daily_almanac_profiles;
create policy "users read own daily almanac profile" on public.daily_almanac_profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "users create own daily almanac profile" on public.daily_almanac_profiles;
create policy "users create own daily almanac profile" on public.daily_almanac_profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "users update own daily almanac profile" on public.daily_almanac_profiles;
create policy "users update own daily almanac profile" on public.daily_almanac_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users read own daily almanac deliveries" on public.daily_almanac_deliveries;
create policy "users read own daily almanac deliveries" on public.daily_almanac_deliveries
  for select to authenticated using (auth.uid() = user_id);

create index if not exists daily_almanac_profiles_enabled_idx
  on public.daily_almanac_profiles(enabled, delivery_hour, updated_at);

create index if not exists daily_almanac_deliveries_status_idx
  on public.daily_almanac_deliveries(status, local_date, created_at);

create index if not exists daily_almanac_deliveries_provider_idx
  on public.daily_almanac_deliveries(provider_message_id)
  where provider_message_id is not null;

comment on table public.daily_almanac_profiles is
  'Authenticated preferences for the paid Tengyunzi Daily Almanac email.';

comment on table public.daily_almanac_deliveries is
  'Idempotent per-member delivery history for daily almanac emails.';

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'daily_almanac_project_url') then
    perform vault.create_secret(
      'https://rcyssrsnalefzhzsvswm.supabase.co',
      'daily_almanac_project_url',
      'Supabase project URL used by the Daily Almanac cron job'
    );
  end if;

  if not exists (select 1 from vault.decrypted_secrets where name = 'daily_almanac_publishable_key') then
    perform vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU',
      'daily_almanac_publishable_key',
      'Public API key used only to invoke the idempotent Daily Almanac sender'
    );
  end if;

  perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'tengyunzi-daily-almanac-hourly';

  perform cron.schedule(
    'tengyunzi-daily-almanac-hourly',
    '5 * * * *',
    $cron$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_project_url' limit 1)
          || '/functions/v1/daily-almanac-send',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key' limit 1),
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key' limit 1)
        ),
        body := '{"source":"supabase-cron"}'::jsonb
      ) as request_id;
    $cron$
  );
end
$$;
