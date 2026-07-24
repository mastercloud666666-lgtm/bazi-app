alter table public.daily_almanac_deliveries
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz;

alter table public.daily_almanac_deliveries
  drop constraint if exists daily_almanac_deliveries_attempt_count_check;

alter table public.daily_almanac_deliveries
  add constraint daily_almanac_deliveries_attempt_count_check
  check (attempt_count between 0 and 10);

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'tengyunzi-daily-almanac-hourly'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'tengyunzi-daily-almanac-hourly',
  '5,20,35,50 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_project_url') || '/functions/v1/daily-almanac-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_almanac_publishable_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
