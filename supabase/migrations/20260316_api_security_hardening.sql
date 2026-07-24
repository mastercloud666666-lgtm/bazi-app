-- API security hardening: rate limiting + abuse logs

create table if not exists public.api_rate_limits (
  scope text not null,
  identifier text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, identifier, window_start)
);

create index if not exists idx_api_rate_limits_updated_at
  on public.api_rate_limits(updated_at desc);

create table if not exists public.api_abuse_logs (
  id bigserial primary key,
  scope text not null,
  identifier text not null,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_abuse_logs_created_at
  on public.api_abuse_logs(created_at desc);
create index if not exists idx_api_abuse_logs_scope_created_at
  on public.api_abuse_logs(scope, created_at desc);

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_identifier text,
  p_window_seconds integer,
  p_limit integer
)
returns table(
  allowed boolean,
  current_count integer,
  retry_after_seconds integer,
  window_start timestamptz,
  window_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_count integer;
begin
  if p_scope is null or length(trim(p_scope)) = 0 then
    raise exception 'p_scope is required';
  end if;

  if p_identifier is null or length(trim(p_identifier)) = 0 then
    raise exception 'p_identifier is required';
  end if;

  if p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'p_window_seconds must be >= 1';
  end if;

  if p_limit is null or p_limit < 1 then
    raise exception 'p_limit must be >= 1';
  end if;

  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  v_window_end := v_window_start + make_interval(secs => p_window_seconds);

  insert into public.api_rate_limits(scope, identifier, window_start, request_count, created_at, updated_at)
  values (trim(p_scope), trim(p_identifier), v_window_start, 1, v_now, v_now)
  on conflict (scope, identifier, window_start)
  do update set
    request_count = public.api_rate_limits.request_count + 1,
    updated_at = v_now
  returning request_count into v_count;

  allowed := v_count <= p_limit;
  current_count := v_count;
  retry_after_seconds := greatest(0, ceil(extract(epoch from (v_window_end - v_now)))::integer);
  window_start := v_window_start;
  window_end := v_window_end;

  return next;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer) from public;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.cleanup_api_rate_limits(
  p_keep_hours integer default 24
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if p_keep_hours is null or p_keep_hours < 1 then
    p_keep_hours := 24;
  end if;

  delete from public.api_rate_limits
  where updated_at < (now() - make_interval(hours => p_keep_hours));

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_api_rate_limits(integer) from public;
grant execute on function public.cleanup_api_rate_limits(integer) to service_role;
