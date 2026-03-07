create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  trade_no text unique not null,       -- 虎皮椒订单号
  birth_input text not null,           -- 用户输入的生辰（JSON）
  paid boolean default false,
  analysis text,                        -- Claude 分析结果（付费后写入）
  created_at timestamptz default now()
);

-- 允许前端匿名查询自己的订单（按 trade_no）
alter table orders enable row level security;
create policy "anyone can read own order" on orders
  for select using (true);
create policy "edge functions can insert" on orders
  for insert with check (true);
create policy "edge functions can update" on orders
  for update using (true);
