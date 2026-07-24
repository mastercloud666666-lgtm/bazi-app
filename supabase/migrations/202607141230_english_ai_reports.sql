-- English AI report lifecycle for the Tengyunzi storefront.
create table if not exists public.english_ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  trade_no text unique,
  access_type text not null check (access_type in ('free', 'paid')),
  status text not null default 'generating'
    check (status in ('awaiting_payment', 'generating', 'ready', 'failed')),
  birth_input jsonb not null default '{}'::jsonb,
  chart_data jsonb not null default '{}'::jsonb,
  result_text text,
  error_message text,
  amount numeric(10, 2) not null default 0,
  currency text not null default 'USD',
  paypal_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists english_ai_reports_user_created_idx
  on public.english_ai_reports(user_id, created_at desc);
create index if not exists english_ai_reports_status_created_idx
  on public.english_ai_reports(status, created_at desc);

alter table public.english_ai_reports enable row level security;

drop policy if exists "users read own english reports" on public.english_ai_reports;
create policy "users read own english reports" on public.english_ai_reports
  for select using (auth.uid() = user_id);

drop policy if exists "users delete own english reports" on public.english_ai_reports;
create policy "users delete own english reports" on public.english_ai_reports
  for delete using (auth.uid() = user_id);

create or replace function public.set_english_ai_report_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists english_ai_reports_updated_at on public.english_ai_reports;
create trigger english_ai_reports_updated_at
before update on public.english_ai_reports
for each row execute function public.set_english_ai_report_updated_at();

