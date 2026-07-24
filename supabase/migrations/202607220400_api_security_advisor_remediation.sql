-- Persist the Security Advisor remediations for server-only API security data.

begin;

alter table public.api_rate_limits enable row level security;
alter table public.api_abuse_logs enable row level security;

-- These tables are internal to Edge Functions and must not be available through
-- the public PostgREST roles. No RLS policies are intentionally created.
revoke all privileges
  on table public.api_rate_limits, public.api_abuse_logs
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.api_rate_limits, public.api_abuse_logs
  to service_role;

revoke all privileges
  on sequence public.api_abuse_logs_id_seq
  from public, anon, authenticated;

grant usage, select
  on sequence public.api_abuse_logs_id_seq
  to service_role;

-- SECURITY DEFINER functions execute with their owner's privileges, so only
-- the trusted server role may invoke them.
revoke execute
  on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;

grant execute
  on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;

revoke execute
  on function public.cleanup_api_rate_limits(integer)
  from public, anon, authenticated;

grant execute
  on function public.cleanup_api_rate_limits(integer)
  to service_role;

commit;
