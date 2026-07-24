alter table public.orders
  add column if not exists paid_at timestamptz;

update public.orders
set paid_at = coalesce(paid_at, created_at)
where paid is true
  and paid_at is null;

create or replace function public.set_orders_paid_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.paid is true and new.paid_at is null then
    if tg_op = 'INSERT' then
      new.paid_at := now();
    elsif coalesce(old.paid, false) is false then
      new.paid_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_paid_at on public.orders;
create trigger orders_set_paid_at
before insert or update of paid on public.orders
for each row
execute function public.set_orders_paid_at();

create index if not exists orders_paid_at_idx
  on public.orders(paid_at desc)
  where paid is true;

comment on column public.orders.paid_at is
  'Server timestamp set when an order first transitions to paid; used for revenue reporting and alerts.';
